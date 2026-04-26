import { json } from "@sveltejs/kit";
import { config } from "../../../lib/config.js";
import { importData } from "../../../db/database.js";

export async function POST({ request }) {
  const form = await request.formData();
  const password = form.get("password");

  if (password !== config.manualRunPassword) {
    return json({ error: "Invalid password" }, { status: 401 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return json({ error: "File required" }, { status: 400 });
  }

  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await importData(data);
  return json({
    ok: true,
    message: `יובאו: ${result.articles} כתבות, ${result.analyses} ניתוחים`,
  });
}
