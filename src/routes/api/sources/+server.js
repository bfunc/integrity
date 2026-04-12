import { json } from '@sveltejs/kit';
import { getSources } from '../../../db/database.js';
import sitesData from '../../../../external/sites.json' with { type: 'json' };
import leadersData from '../../../../external/leaders.json' with { type: 'json' };

export async function GET() {
  const crawlStatus = await getSources();
  const statusMap = Object.fromEntries(crawlStatus.map((s) => [s.source, s]));

  const sitesWithStatus = sitesData.map((site) => ({
    ...site,
    last_crawled: statusMap[site.id]?.last_crawled || null,
    article_count: statusMap[site.id]?.article_count || 0,
  }));

  return json({ sites: sitesWithStatus, leaders: leadersData });
}
