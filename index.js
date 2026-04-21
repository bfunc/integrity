import "dotenv/config";
import { createServer } from "http";
import { handler } from "./build/handler.js";
import { initDb, closeDb } from "./src/db/database.js";
import { scheduleCron } from "./src/agents/crawler.js";

if (!process.env.PORT) {
  console.error("PORT environment variable is not set");
  process.exit(1);
}

const PORT = process.env.PORT;

async function main() {
  const dbState = await initDb();
  console.log(
    dbState?.existingFile
      ? "Database ready (existing file reused; no re-initialization)"
      : "Database ready (new file created)",
  );

  scheduleCron();
  console.log("Cron scheduled");

  createServer(handler).listen(PORT, () => {
    console.log(`Integrity running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});

async function shutdown() {
  await closeDb();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
