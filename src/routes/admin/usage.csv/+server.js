import { readFileSync } from "fs";
import { exportCSV } from "../../../db/usage-db.js";

export async function GET() {
  try {
    const csvPath = await exportCSV();
    const content = readFileSync(csvPath, "utf8");
    return new Response(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="usage.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
