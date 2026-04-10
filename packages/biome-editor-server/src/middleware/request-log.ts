import type { Request, Response, NextFunction } from "express";

/**
 * One-line request logging.
 * - GET /api/world-map omitted by default (React Query refetch); EDITOR_API_LOG_WORLD_MAP_GET=true to log.
 * - OPTIONS omitted (CORS preflight noise).
 */
export function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const url = req.originalUrl ?? req.url;

  const skipLog =
    req.method === "OPTIONS" ||
    (req.method === "GET" &&
      (url === "/api/world-map" || url.startsWith("/api/world-map?")) &&
      process.env.EDITOR_API_LOG_WORLD_MAP_GET !== "true");

  if (!skipLog) {
    res.on("finish", () => {
      const ms = Date.now() - start;
      console.log(`[biome-editor-api] ${req.method} ${url} → ${res.statusCode} (${ms}ms)`);
    });
  }

  next();
}
