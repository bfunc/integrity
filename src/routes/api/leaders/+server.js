import { json } from '@sveltejs/kit';
import { getLeaderStats, getAllLeaderViolations, getSpeechesAnalyzedByLeader } from '../../../db/database.js';
import leadersData from '../../../data-sources/leaders.json' with { type: 'json' };
const speechTotals = Object.fromEntries(leadersData.map((l) => [l.id, l.speeches.length]));

export async function GET() {
  const [leaders, analyzedMap, allViolations] = await Promise.all([
    getLeaderStats(),
    getSpeechesAnalyzedByLeader(),
    getAllLeaderViolations(),
  ]);

  const violationsByLeader = {};
  for (const v of allViolations) {
    if (!violationsByLeader[v.leader_id]) violationsByLeader[v.leader_id] = [];
    violationsByLeader[v.leader_id].push(v);
  }

  const result = leaders.map((leader) => ({
    ...leader,
    speeches_total: speechTotals[leader.id] ?? 0,
    speeches_analyzed: analyzedMap[leader.id] ?? 0,
    violations: (violationsByLeader[leader.id] || []).map((v) => ({
      id: v.id,
      date: v.analyzed_at,
      title: v.speech_title || v.source_id,
      patterns: typeof v.patterns === 'string' ? JSON.parse(v.patterns) : v.patterns || [],
      summary_md: v.summary_md,
      subtext: v.subtext || null,
      severity: v.severity,
      severity_label: v.severity_label,
    })),
  }));

  return json({ leaders: result });
}
