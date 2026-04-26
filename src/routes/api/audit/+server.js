import { json } from '@sveltejs/kit';
import { getAuditStats, getRecentCalls } from '../../../lib/audit.js';
import { getArticleTitlesByIds } from '../../../db/database.js';

export async function GET() {
  try {
    const [stats, recentCalls] = await Promise.all([
      getAuditStats(),
      getRecentCalls(50),
    ]);

    // Enrich calls with article titles from aigregator.db
    const articleIds = [...new Set(
      recentCalls.map((c) => c.article_id).filter(Boolean),
    )];
    const titleMap = await getArticleTitlesByIds(articleIds);

    const enriched = recentCalls.map((c) => ({
      ...c,
      article_title: c.article_id ? (titleMap[c.article_id] ?? null) : null,
    }));

    return json({
      stats,
      recent_calls: enriched,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('audit endpoint error:', err);
    return json({ error: err.message }, { status: 500 });
  }
}
