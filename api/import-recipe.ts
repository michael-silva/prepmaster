import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@upstash/qstash";
import { getAuth, getFirestore } from "./lib/firebase-admin.js";
import { createLogger } from "./lib/logger.js";
import { handleCorsPreflightOrMethod } from "./lib/cors.js";

const URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|[\w-]+\.\w+(\/[\w.-]*)*)/i;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCorsPreflightOrMethod(req, res, "POST")) return;

  const log = createLogger({ fn: "import-recipe" });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const idToken = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(idToken);
    const userId = decoded.uid;
    log.info("auth ok", { userId });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const url = body?.url?.trim();

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing or invalid url" });
      return;
    }

    if (!isValidUrl(url) || !URL_REGEX.test(url)) {
      res.status(400).json({ error: "Invalid URL format. Use a YouTube or blog link." });
      return;
    }

    const db = getFirestore();

    const existing = await db
      .collection("jobs")
      .where("user_id", "==", userId)
      .where("url", "==", url)
      .where("status", "in", ["pending", "processing"])
      .limit(1)
      .get();

    if (!existing.empty) {
      const existingJobId = existing.docs[0].id;
      log.info("duplicate url — returning existing job", { jobId: existingJobId, userId, url });
      res.status(200).json({ jobId: existingJobId, deduplicated: true });
      return;
    }

    const jobRef = db.collection("jobs").doc();
    const jobId = jobRef.id;

    await jobRef.set({
      user_id: userId,
      url,
      status: "pending",
      created_at: new Date(),
    });
    log.info("job created", { jobId, userId, url });

    const webhookUrl = process.env.QSTASH_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error("QSTASH_WEBHOOK_URL is not configured");
    }

    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error("QSTASH_TOKEN is not configured");
    }

    const client = new Client({ token });
    await client.publishJSON({
      url: webhookUrl,
      body: { jobId, url, userId },
      retries: 3,
      delay: "10s",
    });

    log.info("queued", { jobId, webhookUrl });
    res.status(202).json({ jobId });
  } catch (err) {
    log.error("handler failed", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("auth") || msg.includes("token") || msg.includes("id-token")) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    if (msg.includes("QSTASH") || msg.includes("WEBHOOK")) {
      res.status(500).json({ error: "Failed to queue extraction" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
}
