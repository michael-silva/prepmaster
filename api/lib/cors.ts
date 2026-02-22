import type { VercelRequest, VercelResponse } from "@vercel/node";

const CORS_MAX_AGE_SECONDS = 86400;

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

export function setCorsHeaders(
  req: VercelRequest,
  res: VercelResponse,
  methods = "GET, POST, OPTIONS"
): void {
  const origin = getCorsOrigin(req);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", String(CORS_MAX_AGE_SECONDS));
}

export function handleCorsPreflightOrMethod(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethod: string
): boolean {
  setCorsHeaders(req, res, `${allowedMethod}, OPTIONS`);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  if (req.method !== allowedMethod) {
    res.status(405).json({ error: "Method not allowed" });
    return true;
  }

  return false;
}
