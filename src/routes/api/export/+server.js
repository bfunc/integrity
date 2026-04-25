import { json } from "@sveltejs/kit";
import { config } from "../../../lib/config.js";
import { exportData } from "../../../db/database.js";

export async function GET({ url }) {
  const password = url.searchParams.get("password");
  if (password !== config.manualRunPassword) {
    return json({ error: "Invalid password" }, { status: 401 });
  }

  const data = await exportData();
  const body = JSON.stringify(data, null, 2);

  return new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="aigregator-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
