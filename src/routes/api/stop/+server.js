import { json } from "@sveltejs/kit";
import { config } from "../../../lib/config.js";
import { isPipelineRunning, requestPipelineStop } from "../../../agents/crawler.js";

export async function POST({ request }) {
  const body = await request.json();

  if (body.password !== config.manualRunPassword) {
    return json({ error: "Invalid password" }, { status: 401 });
  }

  if (!isPipelineRunning()) {
    return json({ error: "Pipeline is not running" }, { status: 409 });
  }

  requestPipelineStop();
  return json({ ok: true, message: "Stop requested" });
}
