import "dotenv/config";
import mysql from "mysql2/promise";
import { createApp } from "./app.js";

const requiredEnv = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "PORT",
];

const disableDb = process.env.DISABLE_DB === "true";

for (const key of requiredEnv) {
  if ((key !== "PORT" && disableDb) || process.env[key]) continue;
  throw new Error(`Missing required environment variable: ${key}`);
}

const pool = disableDb ? null : mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
});

async function waitForDatabase({ attempts = 30, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

if (!disableDb) await waitForDatabase();

const app = createApp({ pool });
const port = Number(process.env.PORT);
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    if (pool) await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
