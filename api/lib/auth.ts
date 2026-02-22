import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuth } from "./firebase-admin.js";

const BEARER_PREFIX = "Bearer ";

export async function verifyAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return null;
  }

  try {
    const idToken = authHeader.slice(BEARER_PREFIX.length);
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}
