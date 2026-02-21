import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@upstash/qstash";
import { getAuth, getFirestore } from "./lib/firebase-admin.js";

const URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|[\w-]+\.\w+(\/[\w.-]*)*)/i;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

function getCorsOrigin(req: VercelRequest): string | undefined {
  const origin = req.headers.origin;
  if (!origin) return undefined;
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;
  if (baseUrl && origin.startsWith(baseUrl)) return origin;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return undefined;
}

function setCorsHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = getCorsOrigin(req);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

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
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const idToken = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(idToken);
    const userId = decoded.uid;

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
    const jobRef = db.collection("jobs").doc();
    const jobId = jobRef.id;

    await jobRef.set({
      user_id: userId,
      url,
      status: "pending",
      created_at: new Date(),
    });

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
    });

    res.status(202).json({ jobId });
  } catch (err) {
    console.error("import-recipe error:", err);
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
