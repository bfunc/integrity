import "dotenv/config";
import { createServer } from "http";
import os from "os";
import { handler } from "./build/handler.js";
import { initDb, closeDb } from "./src/db/database.js";
import { initUsageDb } from "./src/db/usage-db.js";
import { scheduleCron } from "./src/agents/crawler.js";

function cpuPercent() {
  return new Promise((resolve) => {
    const sample = () => {
      let idle = 0,
        total = 0;
      for (const cpu of os.cpus()) {
        for (const v of Object.values(cpu.times)) total += v;
        idle += cpu.times.idle;
      }
      return { idle, total };
    };
    const a = sample();
    setTimeout(() => {
      const b = sample();
      const used = b.total - a.total - (b.idle - a.idle);
      resolve(Math.round((used / (b.total - a.total)) * 100));
    }, 200);
  });
}

function memPercent() {
  return Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
}

async function logResources() {
  const cpu = await cpuPercent();
  const mem = memPercent();
  console.log(`[resources] CPU: ${cpu}%  MEM: ${mem}%`);
}

setInterval(logResources, 2 * 60 * 1000);

if (!process.env.PORT) {
  console.error("PORT environment variable is not set");
  process.exit(1);
}

const PORT = process.env.PORT;

async function main() {
  const dbState = await initDb();
  await initUsageDb();
  console.log("Usage DB ready");
  console.log(
    dbState?.existingFile
      ? "Database ready (existing file reused; no re-initialization)"
      : "Database ready (new file created)",
  );

  scheduleCron();
  console.log("Cron scheduled");

  createServer(handler).listen(PORT, () => {
    console.log(`aigregator running on http://localhost:${PORT}`);
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
