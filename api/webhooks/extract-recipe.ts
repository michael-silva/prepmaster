import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Receiver } from "@upstash/qstash";
import { GoogleGenAI } from "@google/genai";
import { getFirestore } from "../lib/firebase-admin.js";
import {
  RECIPE_EXTRACTION_PROMPT,
  type ExtractedRecipe,
} from "../lib/recipe-schema.js";
import { createLogger } from "../lib/logger.js";

class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function fetchPageContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PrepMaster/1.0; +https://prepmaster.app)",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text.slice(0, 50000);
  } finally {
    clearTimeout(timeout);
  }
}

function parseRecipeJson(text: string): ExtractedRecipe {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as ExtractedRecipe;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawBody = await getRawBody(req);
  const signature = (req.headers["upstash-signature"] ?? req.headers["Upstash-Signature"]) as string | undefined;

  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  const log = createLogger({ fn: "extract-recipe" });

  if (!currentKey || !nextKey) {
    log.error("missing signing keys");
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }

  const receiver = new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey,
  });

  try {
    const isValid = await receiver.verify({
      body: rawBody,
      signature: signature ?? "",
      url: process.env.QSTASH_WEBHOOK_URL ?? "",
    });

    if (!isValid) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  } catch (err) {
    log.error("signature verification failed", err);
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let body: { jobId: string; url: string; userId: string };
  try {
    body = JSON.parse(rawBody) as { jobId: string; url: string; userId: string };
  } catch {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const { jobId, url, userId } = body;
  if (!jobId || !url || !userId) {
    res.status(400).json({ error: "Missing jobId, url, or userId" });
    return;
  }

  const jlog = log.child({ jobId, userId, url });
  jlog.info("processing started");

  const db = getFirestore();
  const jobRef = db.collection("jobs").doc(jobId);

  const jobSnap = await jobRef.get();
  const jobData = jobSnap.data();
  if (jobData?.status === "completed") {
    jlog.info("skipped — job already completed", { recipeId: jobData.recipe_id });
    res.status(200).json({ skipped: true, reason: "already completed" });
    return;
  }

  const retryCount = parseInt(
    (req.headers["upstash-retried"] as string) ?? "0",
    10
  );
  jlog.info("attempt info", { retryCount, previousStatus: jobData?.status });

  await jobRef.update({ status: "processing", retry_count: retryCount });

  try {
    const isYouTube =
      /youtube\.com|youtu\.be/i.test(url);

    let pageContent: string;
    if (isYouTube) {
      jlog.info("youtube url detected");
      pageContent = `[YouTube video URL: ${url}]\n\nExtract recipe information from this YouTube cooking video. Use the URL as source_url. If the video is private, unavailable, or has no recipe content, return a JSON with title "Error" and ingredients/steps as empty arrays.`;
    } else {
      pageContent = await fetchPageContent(url);
      jlog.info("page fetched", { contentLength: pageContent.length });
      if (!pageContent || pageContent.length < 100) {
        throw new PermanentError("Could not fetch or extract meaningful content from URL");
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new PermanentError("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `${RECIPE_EXTRACTION_PROMPT}\n\n---\n\nURL: ${url}\n\nContent:\n${pageContent}`,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    jlog.info("gemini response received", { responseLength: text.length });
    const recipe = parseRecipeJson(text);

    if (recipe.title === "Error" && recipe.ingredients?.length === 0) {
      throw new PermanentError("Video may be private, unavailable, or has no recipe content");
    }

    recipe.source_url = url;
    recipe.ingredients = recipe.ingredients ?? [];
    recipe.steps = recipe.steps ?? [];

    const recipeRef = db.collection("recipes").doc();
    await recipeRef.set({
      user_id: userId,
      job_id: jobId,
      source_url: url,
      title: recipe.title,
      servings: recipe.servings ?? null,
      prep_time_minutes: recipe.prep_time_minutes ?? null,
      cook_time_minutes: recipe.cook_time_minutes ?? null,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      mise_en_place: recipe.mise_en_place ?? [],
      created_at: new Date(),
    });

    await jobRef.update({
      status: "completed",
      completed_at: new Date(),
      recipe_id: recipeRef.id,
    });

    jlog.info("completed", { recipeId: recipeRef.id, title: recipe.title });
    res.status(200).json({ success: true, recipeId: recipeRef.id });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Extraction failed";
    const isPermanent = err instanceof PermanentError;
    jlog.error("extraction failed", { errorMessage, permanent: isPermanent, retryCount });

    try {
      await jobRef.update({
        status: "failed",
        completed_at: new Date(),
        error: errorMessage,
        permanent: isPermanent,
      });
    } catch (updateErr) {
      jlog.error("failed to update job status", updateErr);
    }

    if (isPermanent) {
      res.status(200).json({ error: errorMessage, permanent: true });
      return;
    }
    res.status(500).json({ error: errorMessage });
  }
}
