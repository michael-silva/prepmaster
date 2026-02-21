import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth, getFirestore } from "./lib/firebase-admin.js";
import { createLogger } from "./lib/logger.js";
import { handleCorsPreflightOrMethod } from "./lib/cors.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCorsPreflightOrMethod(req, res, "GET")) return;

  const log = createLogger({ fn: "job-status" });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const idToken = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(idToken);
    const userId = decoded.uid;

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

    const job = jobSnap.data()!;

    if (job.user_id !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const response: Record<string, unknown> = {
      jobId,
      status: job.status,
      url: job.url,
      created_at: job.created_at,
    };

    if (job.status === "failed") {
      response.error = job.error ?? "Unknown error";
      response.permanent = job.permanent ?? false;
      res.status(200).json(response);
      return;
    }

    if (job.status === "completed" && job.recipe_id) {
      const recipeSnap = await db.collection("recipes").doc(job.recipe_id).get();
      if (recipeSnap.exists) {
        response.recipe = recipeSnap.data();
      }
    }

    res.status(200).json(response);
  } catch (err) {
    log.error("handler failed", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("auth") || msg.includes("token") || msg.includes("id-token")) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
}
