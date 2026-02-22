import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Receiver } from "@upstash/qstash";
import { GoogleGenAI } from "@google/genai";
import { getFirestore } from "../lib/firebase-admin.js";
import {
  RECIPE_EXTRACTION_PROMPT,
  type ExtractedRecipe,
} from "../lib/recipe-schema.js";
import { createLogger, type Logger } from "../lib/logger.js";
import { PermanentError, RateLimitError } from "../lib/errors.js";
import type { firestore } from "firebase-admin";

const MAX_CONTENT_CHARS = 15000;
const FETCH_TIMEOUT_MS = 15000;
const MIN_EXTRACTABLE_CONTENT_LENGTH = 100;
const GEMINI_RPD_LIMIT = 18;
const YOUTUBE_PATTERN = /youtube\.com|youtu\.be/i;
const JSON_LD_PATTERN = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

interface WebhookBody {
  jobId: string;
  url: string;
  userId: string;
}

// --- Signature verification ---

function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function verifyQStashSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentKey || !nextKey) {
    throw new PermanentError("Missing QStash signing keys");
  }

  const receiver = new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey,
  });

  return receiver.verify({
    body: rawBody,
    signature,
    url: process.env.QSTASH_WEBHOOK_URL ?? "",
  });
}

function parseWebhookBody(rawBody: string): WebhookBody {
  const body: unknown = JSON.parse(rawBody);
  const parsed = body as Record<string, unknown>;

  if (
    typeof parsed?.jobId !== "string" ||
    typeof parsed?.url !== "string" ||
    typeof parsed?.userId !== "string"
  ) {
    throw new PermanentError("Missing jobId, url, or userId");
  }

  return { jobId: parsed.jobId, url: parsed.url, userId: parsed.userId };
}

// --- Content extraction ---

function extractJsonLd(html: string): string | null {
  const matches = html.match(JSON_LD_PATTERN);
  if (!matches) return null;

  for (const block of matches) {
    const json = block
      .replace(/<script[^>]*>/i, "")
      .replace(/<\/script>/i, "")
      .trim();
    try {
      const parsed: unknown = JSON.parse(json);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const recipe = items.find((i: Record<string, unknown>) => {
        const type = i["@type"];
        return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
      });
      if (recipe) return JSON.stringify(recipe);
    } catch {
      /* malformed JSON-LD — skip block */
    }
  }
  return null;
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, "")
    .replace(/<header\b[\s\S]*?<\/header>/gi, "")
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractArticleText(html: string): string {
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return stripHtmlTags(articleMatch[1]);

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return stripHtmlTags(mainMatch[1]);

  return stripHtmlTags(html);
}

async function fetchPageContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PrepMaster/1.0; +https://prepmaster.app)",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const jsonLd = extractJsonLd(html);
    if (jsonLd) return jsonLd.slice(0, MAX_CONTENT_CHARS);

    return extractArticleText(html).slice(0, MAX_CONTENT_CHARS);
  } finally {
    clearTimeout(timeout);
  }
}

// --- Gemini AI ---

interface GeminiContentParts {
  youtubePart?: { fileData: { fileUri: string; mimeType: string } };
  textContent?: string;
}

function buildContentParts(url: string, pageText: string | null): GeminiContentParts {
  if (YOUTUBE_PATTERN.test(url)) {
    return { youtubePart: { fileData: { fileUri: url, mimeType: "video/mp4" } } };
  }
  return { textContent: pageText ?? "" };
}

async function checkAndIncrementQuota(
  db: firestore.Firestore,
  log: Logger
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const quotaRef = db.collection("_system").doc("gemini_quota");
  const quotaSnap = await quotaRef.get();
  const quotaData = quotaSnap.data();
  const currentCount = quotaData?.date === today ? (quotaData.count as number) : 0;

  if (currentCount >= GEMINI_RPD_LIMIT) {
    log.warn("daily gemini quota exhausted", { count: currentCount, limit: GEMINI_RPD_LIMIT });
    throw new RateLimitError(`Daily Gemini quota exhausted (${currentCount}/${GEMINI_RPD_LIMIT})`);
  }

  await quotaRef.set({ date: today, count: currentCount + 1 }, { merge: true });
  log.info("quota incremented", { dailyUsage: currentCount + 1 });
}

async function callGemini(parts: GeminiContentParts): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new PermanentError("GEMINI_API_KEY is not configured");

  const ai = new GoogleGenAI({ apiKey });

  const contents = parts.youtubePart
    ? [parts.youtubePart, RECIPE_EXTRACTION_PROMPT]
    : [`${RECIPE_EXTRACTION_PROMPT}\n\nContent(${parts.textContent})`];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { responseMimeType: "application/json" },
    });

    const text = response.text ?? "";
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("quota")) {
      throw new RateLimitError(`Gemini rate limit exceeded: ${msg}`);
    }
    throw err;
  }
}

function parseRecipeJson(text: string): ExtractedRecipe {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as ExtractedRecipe;
}

function validateExtractedRecipe(recipe: ExtractedRecipe): void {
  if (recipe.title === "Error" && recipe.ingredients?.length === 0) {
    throw new PermanentError("Video may be private, unavailable, or has no recipe content");
  }
}

// --- Firestore persistence ---

async function saveRecipe(
  db: firestore.Firestore,
  recipe: ExtractedRecipe,
  userId: string,
  jobId: string,
  url: string
): Promise<string> {
  const recipeRef = db.collection("recipes").doc();
  await recipeRef.set({
    user_id: userId,
    job_id: jobId,
    source_url: url,
    title: recipe.title,
    servings: recipe.servings ?? null,
    prep_time_minutes: recipe.prep_time_minutes ?? null,
    cook_time_minutes: recipe.cook_time_minutes ?? null,
    ingredients: recipe.ingredients ?? [],
    steps: recipe.steps ?? [],
    mise_en_place: recipe.mise_en_place ?? [],
    created_at: new Date(),
  });
  return recipeRef.id;
}

async function markJobCompleted(
  jobRef: firestore.DocumentReference,
  recipeId: string,
  recipeTitle: string
): Promise<void> {
  await jobRef.update({
    status: "completed",
    completed_at: new Date(),
    recipe_id: recipeId,
    recipe_title: recipeTitle,
    notified_at: null,
  });
}

async function markJobFailed(
  jobRef: firestore.DocumentReference,
  errorMessage: string,
  isPermanent: boolean,
  log: Logger
): Promise<void> {
  try {
    await jobRef.update({
      status: "failed",
      completed_at: isPermanent ? new Date() : null,
      error: errorMessage,
      permanent: isPermanent,
      notified_at: null,
    });
  } catch (updateErr) {
    log.error("failed to update job status", updateErr);
  }
}

// --- Main handler ---

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const log = createLogger({ fn: "extract-recipe" });
  const rawBody = await getRawBody(req);
  const signature = (req.headers["upstash-signature"] ?? req.headers["Upstash-Signature"]) as string | undefined;

  try {
    const isValid = await verifyQStashSignature(rawBody, signature ?? "");
    if (!isValid) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  } catch (err) {
    if (err instanceof PermanentError) {
      log.error("missing signing keys");
      res.status(500).json({ error: "Server misconfiguration" });
      return;
    }
    log.error("signature verification failed", err);
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let body: WebhookBody;
  try {
    body = parseWebhookBody(rawBody);
  } catch {
    res.status(400).json({ error: "Invalid or incomplete body" });
    return;
  }

  const { jobId, url, userId } = body;
  const jlog = log.child({ jobId, userId, url });
  jlog.info("processing started");

  const db = getFirestore();
  const jobRef = db.collection("jobs").doc(jobId);

  const jobSnap = await jobRef.get();
  const jobData = jobSnap.data();
  if (jobData?.status === "completed") {
    jlog.info("skipped — job already completed", { recipeId: jobData.recipe_id });
    res.status(200).json({ success: true, skipped: true, reason: "already completed" });
    return;
  }

  const retryCount = parseInt((req.headers["upstash-retried"] as string) ?? "0", 10);
  jlog.info("attempt info", { retryCount, previousStatus: jobData?.status });
  await jobRef.update({ status: "processing", retry_count: retryCount });

  try {
    const isYouTube = YOUTUBE_PATTERN.test(url);
    let pageText: string | null = null;

    if (!isYouTube) {
      pageText = await fetchPageContent(url);
      jlog.info("page fetched", { contentLength: pageText.length });
      if (pageText.length < MIN_EXTRACTABLE_CONTENT_LENGTH) {
        throw new PermanentError("Could not fetch or extract meaningful content from URL");
      }
    } else {
      jlog.info("youtube url detected");
    }

    await checkAndIncrementQuota(db, jlog);

    const parts = buildContentParts(url, pageText);
    const geminiText = await callGemini(parts);
    jlog.info("gemini response received", { responseLength: geminiText.length });

    const recipe = parseRecipeJson(geminiText);
    validateExtractedRecipe(recipe);

    recipe.source_url = url;
    const recipeId = await saveRecipe(db, recipe, userId, jobId, url);
    await markJobCompleted(jobRef, recipeId, recipe.title);

    jlog.info("completed", { recipeId, title: recipe.title });
    res.status(200).json({ success: true, recipeId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Extraction failed";
    const isPermanent = err instanceof PermanentError;
    const isRateLimit = err instanceof RateLimitError;
    jlog.error("extraction failed", { errorMessage, permanent: isPermanent, rateLimit: isRateLimit, retryCount });

    await markJobFailed(jobRef, errorMessage, isPermanent, jlog);

    if (isPermanent) {
      res.status(200).json({ error: errorMessage, permanent: true });
      return;
    }
    res.status(500).json({ error: errorMessage });
  }
}
