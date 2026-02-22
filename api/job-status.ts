import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getFirestore } from "./lib/firebase-admin.js";
import { createLogger } from "./lib/logger.js";
import { handleCorsPreflightOrMethod } from "./lib/cors.js";
import { verifyAuth } from "./lib/auth.js";

interface JobStatusResponse {
  jobId: string;
  status: string;
  url: string;
  created_at: unknown;
  error?: string;
  permanent?: boolean;
  recipe?: Record<string, unknown>;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCorsPreflightOrMethod(req, res, "GET")) return;

  const log = createLogger({ fn: "job-status" });

  const userId = await verifyAuth(req, res);
  if (!userId) return;

  try {
    const jobId = req.query.jobId;
    if (!jobId || typeof jobId !== "string") {
      res.status(400).json({ error: "Missing or invalid jobId query parameter" });
      return;
    }

    const db = getFirestore();
    const jobSnap = await db.collection("jobs").doc(jobId).get();

    if (!jobSnap.exists) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const job = jobSnap.data();
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    if (job.user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const response: JobStatusResponse = {
      jobId,
      status: job.status,
      url: job.url,
      created_at: job.created_at,
    };

    if (job.status === "failed") {
      response.error = job.error ?? "Unknown error";
      response.permanent = job.permanent ?? false;
    }

    if (job.status === "completed" && job.recipe_id) {
      const recipeSnap = await db.collection("recipes").doc(job.recipe_id).get();
      if (recipeSnap.exists) {
        response.recipe = recipeSnap.data() as Record<string, unknown>;
      }
    }

    res.status(200).json(response);
  } catch (err) {
    log.error("handler failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
