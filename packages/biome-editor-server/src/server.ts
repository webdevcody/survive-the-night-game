import express from "express";
import biomeRoutes from "./api/biome-routes.js";
import worldMapRoutes from "./api/world-map-routes.js";

const app = express();
const PORT = process.env.PORT || 3002;

/** World map JSON can be many MB; default express.json limit is 100kb. */
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT ?? "50mb";

// Add middleware
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Register API routes
app.use("/api", biomeRoutes);
app.use("/api", worldMapRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "biome-editor-server" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Biome editor server listening on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

