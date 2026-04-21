import { json } from "@sveltejs/kit";
import { getSources } from "../../../db/database.js";
import sitesData from "../../../data-sources/sites.json" with { type: "json" };
import leadersData from "../../../data-sources/leaders.json" with { type: "json" };

export async function GET() {
  let crawlStatus = [];
  let warning = null;

  try {
    crawlStatus = await getSources();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    warning = `sources_db_unavailable: ${message}`;
  }

  const statusMap = Object.fromEntries(crawlStatus.map((s) => [s.source, s]));

  const sitesWithStatus = sitesData.map((site) => ({
    ...site,
    last_crawled: statusMap[site.id]?.last_crawled || null,
    article_count: statusMap[site.id]?.article_count || 0,
  }));

  return json({ sites: sitesWithStatus, leaders: leadersData, warning });
}
