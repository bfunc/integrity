import { json } from "@sveltejs/kit";
import {
  getRhetoricMatrix,
  getRhetoricMatrixItems,
  getAnalysesMeta,
  getLeaderViolationCounts,
} from "../../../db/database.js";

function mapMatrixItem(row) {
  return {
    id: row.id,
    source_type: row.source_type,
    source_id: row.source_id,
    title: row.article_title || row.speech_title || "",
    source: row.source || "Speeches",
    leader_name: row.leader_name || null,
    leader_role: row.leader_role || null,
    url: row.article_url || row.speech_url || "",
    published_at: row.published_at || row.speech_date || null,
    analyzed_at: row.analyzed_at,
    severity: row.severity,
    severity_label: row.severity_label,
    patterns:
      typeof row.patterns === "string"
        ? JSON.parse(row.patterns)
        : row.patterns || [],
    summary_md: row.summary_md,
    subtext: row.subtext || null,
    advocate_status: row.advocate_status || null,
    attribution_role: row.attribution_role || null,
    attributed_to: row.attributed_to || null,
  };
}

function scoreToRole(score) {
  if (score >= 4) return "amplifier";
  if (score >= 2) return "reporter";
  return "neutral";
}

function formatWeekLabel(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function GET({ url }) {
  try {
    const leaderId = url.searchParams.get("leaderId");
    const sourceId = url.searchParams.get("sourceId");
    const weekStart = url.searchParams.get("weekStart");

    if (leaderId && sourceId && weekStart) {
      const items = await getRhetoricMatrixItems({
        leaderId,
        sourceId,
        weekStart,
      });
      return json({ items: items.map(mapMatrixItem) });
    }

    const [rows, metaRow, violations] = await Promise.all([
      getRhetoricMatrix(),
      getAnalysesMeta(),
      getLeaderViolationCounts(),
    ]);

    const meta = {
      total_analyses: Number(metaRow.total),
      with_leader_id: Number(metaRow.with_leader),
      null_leader_id: Number(metaRow.null_leader),
    };

    if (rows.length === 0) {
      console.log(
        `rhetoric-matrix: ${meta.total_analyses} analyses, ${meta.with_leader_id} with leader_id, 0 weeks, 0 sources`,
      );
      return json({
        weeks: [],
        matrix: {},
        meta,
        violations,
        generated_at: new Date().toISOString(),
      });
    }

    // Collect and sort unique week_starts (ISO date strings sort correctly)
    const weekKeyOf = (row) =>
      new Date(row.week_start).toISOString().slice(0, 10);
    const sortedWeekKeys = [...new Set(rows.map(weekKeyOf))].sort();
    const weekIndexOf = Object.fromEntries(
      sortedWeekKeys.map((k, i) => [k, i]),
    );
    const weeks = sortedWeekKeys.map((k) => formatWeekLabel(k + "T00:00:00Z"));

    // Build matrix — indexed arrays so frontend can access by week index
    const matrix = {};
    for (const row of rows) {
      const { source_id, leader_id, max_severity } = row;
      if (!source_id || !leader_id) continue;

      const weekIdx = weekIndexOf[weekKeyOf(row)];
      const score = Math.round(Number(max_severity));
      const role = scoreToRole(score);

      if (!matrix[source_id]) matrix[source_id] = {};
      if (!matrix[source_id][leader_id]) matrix[source_id][leader_id] = [];
      matrix[source_id][leader_id][weekIdx] = {
        week: weekIdx,
        score,
        role,
        n: Number(row.article_count),
      };
    }

    const sourceCount = Object.keys(matrix).length;
    console.log(
      `rhetoric-matrix: ${meta.total_analyses} analyses, ${meta.with_leader_id} with leader_id, ${weeks.length} weeks, ${sourceCount} sources`,
    );

    return json({
      weeks,
      weekKeys: sortedWeekKeys,
      matrix,
      meta,
      violations,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("rhetoric-matrix error:", err);
    return json(
      { error: "Failed to build rhetoric matrix", detail: err.message },
      { status: 500 },
    );
  }
}
