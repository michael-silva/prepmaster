import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@upstash/qstash";
import { getFirestore } from "./lib/firebase-admin.js";
import { createLogger } from "./lib/logger.js";
import { handleCorsPreflightOrMethod } from "./lib/cors.js";
import { verifyAuth } from "./lib/auth.js";
import type { Logger } from "./lib/logger.js";
import type { firestore } from "firebase-admin";

const URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|[\w-]+\.\w+(\/[\w.-]*)*)/i;
const QSTASH_RETRY_COUNT = 3;
const QSTASH_DELAY = "10s";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function parseAndValidateUrl(body: unknown): string | null {
  const parsed = typeof body === "string" ? JSON.parse(body) : body;
  const url = (parsed as Record<string, unknown>)?.url;
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!isValidUrl(trimmed) || !URL_REGEX.test(trimmed)) return null;
  return trimmed;
}

async function findExistingJob(
  db: firestore.Firestore,
  url: string
): Promise<string | null> {
  const existing = await db
    .collection("jobs")
    .where("url", "==", url)
    .where("status", "in", ["pending", "processing"])
    .limit(1)
    .get();

  return existing.empty ? null : existing.docs[0].id;
}

async function forkExistingRecipe(
  db: firestore.Firestore,
  url: string,
  userId: string
): Promise<string | null> {
  const snapshot = await db
    .collection("recipes")
    .where("source_url", "==", url)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const source = snapshot.docs[0];
  const srcData = source.data();
  const {
    user_id: _srcUid,
    forked_from: _srcFork,
    created_at: _srcCreated,
    updated_at: _srcUpdated,
    ...recipeFields
  } = srcData;

  const forkRef = db.collection("recipes").doc();
  await forkRef.set({
    ...recipeFields,
    user_id: userId,
    forked_from: source.id,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return forkRef.id;
}

async function createJobAndEnqueue(
  db: firestore.Firestore,
  url: string,
  userId: string,
  log: Logger
): Promise<string> {
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
  const token = process.env.QSTASH_TOKEN;
  if (!webhookUrl) throw new Error("QSTASH_WEBHOOK_URL is not configured");
  if (!token) throw new Error("QSTASH_TOKEN is not configured");

  const client = new Client({ token });
  await client.publishJSON({
    url: webhookUrl,
    body: { jobId, url, userId },
    retries: QSTASH_RETRY_COUNT,
    delay: QSTASH_DELAY,
  });

  log.info("queued", { jobId, webhookUrl });
  return jobId;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCorsPreflightOrMethod(req, res, "POST")) return;

  const log = createLogger({ fn: "import-recipe" });

  const userId = await verifyAuth(req, res);
  if (!userId) return;
  log.info("auth ok", { userId });

  try {
    const url = parseAndValidateUrl(req.body);
    if (!url) {
      res.status(400).json({ error: "Invalid URL format. Use a YouTube or blog link." });
      return;
    }

    const db = getFirestore();

    const existingJobId = await findExistingJob(db, url);
    if (existingJobId) {
      log.info("duplicate url — returning existing job", { jobId: existingJobId, userId, url });
      res.status(200).json({ success: true, jobId: existingJobId, deduplicated: true });
      return;
    }

    const forkId = await forkExistingRecipe(db, url, userId);
    if (forkId) {
      log.info("forked existing recipe", { forkId, userId, url });
      res.status(200).json({ success: true, recipeId: forkId, forked: true });
      return;
    }

    const jobId = await createJobAndEnqueue(db, url, userId, log);
    res.status(202).json({ success: true, jobId });
  } catch (err) {
    log.error("handler failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
