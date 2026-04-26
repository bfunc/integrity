import { json } from '@sveltejs/kit';
import { getRhetoricMatrix, getAnalysesMeta } from '../../../db/database.js';

function scoreToRole(score) {
  if (score >= 7.0) return 'amplifier';
  if (score >= 3.5) return 'reporter';
  return 'neutral';
}

function formatWeekLabel(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export async function GET() {
  try {
    const [rows, metaRow] = await Promise.all([getRhetoricMatrix(), getAnalysesMeta()]);

    const meta = {
      total_analyses: Number(metaRow.total),
      with_leader_id: Number(metaRow.with_leader),
      null_leader_id: Number(metaRow.null_leader),
    };

    if (rows.length === 0) {
      console.log(`rhetoric-matrix: ${meta.total_analyses} analyses, ${meta.with_leader_id} with leader_id, 0 weeks, 0 sources`);
      return json({ weeks: [], matrix: {}, meta, generated_at: new Date().toISOString() });
    }

    // Collect and sort unique week_starts (ISO date strings sort correctly)
    const weekKeyOf = (row) => new Date(row.week_start).toISOString().slice(0, 10);
    const sortedWeekKeys = [...new Set(rows.map(weekKeyOf))].sort();
    const weekIndexOf = Object.fromEntries(sortedWeekKeys.map((k, i) => [k, i]));
    const weeks = sortedWeekKeys.map(k => formatWeekLabel(k + 'T00:00:00Z'));

    // Build matrix — indexed arrays so frontend can access by week index
    const matrix = {};
    for (const row of rows) {
      const { source_id, leader_id, avg_severity } = row;
      if (!source_id || !leader_id) continue;

      const weekIdx = weekIndexOf[weekKeyOf(row)];
      const score = Math.round(Number(avg_severity) * 10) / 10;
      const role = scoreToRole(score);

      if (!matrix[source_id]) matrix[source_id] = {};
      if (!matrix[source_id][leader_id]) matrix[source_id][leader_id] = [];
      matrix[source_id][leader_id][weekIdx] = { week: weekIdx, score, role };
    }

    const sourceCount = Object.keys(matrix).length;
    console.log(`rhetoric-matrix: ${meta.total_analyses} analyses, ${meta.with_leader_id} with leader_id, ${weeks.length} weeks, ${sourceCount} sources`);

    return json({ weeks, matrix, meta, generated_at: new Date().toISOString() });

  } catch (err) {
    console.error('rhetoric-matrix error:', err);
    return json(
      { error: 'Failed to build rhetoric matrix', detail: err.message },
      { status: 500 },
    );
  }
}
