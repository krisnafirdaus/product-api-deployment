import express from "express";

export function createApp({ pool }) {
  const app = express();

  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/products", async (_req, res, next) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, name, price, created_at FROM products ORDER BY id ASC",
      );
      res.status(200).json(rows);
    } catch (error) {
      next(error);
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
