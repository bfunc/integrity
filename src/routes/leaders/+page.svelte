<script>
  import { onMount } from "svelte";

  let leaders = [];
  let loading = true;
  let error = null;
  let expanded = {};
  let summaryExpanded = {};

  const SEV_STYLE = {
    3: "background:#fff7ed;border:1px solid #fed7aa;color:#ea580c",
    4: "background:#fff1f2;border:1px solid #fecdd3;color:#dc2626",
    5: "background:#fff1f2;border:1px solid #fca5a5;color:#b91c1c",
  };

  const PATTERN_NAMES = {
    call_to_violence: "קריאה לאלימות",
    dehumanization: "דה-הומניזציה",
    demonization: "דמוניזציה",
    existential_threat_accusation: "האשמת איום קיומי",
    scapegoating: "שעיר לעזאזל",
    us_vs_them: "אנחנו נגד הם",
    appeal_to_fear: "פנייה לפחד",
    conspiracy_targeting: "האשמה קונספירטיבית",
    false_dilemma: "דילמה כוזבת",
    whataboutism: "ווטאבאוטיזם",
    emotional_manipulation: "מניפולציה רגשית",
    group_discrediting: "השחרת קבוצה",
  };

  const LEVEL_LABELS = {
    incitement: "הסתה",
    toxification: "טוקסיפיקציה",
    rhetorical_manipulation: "מניפולציה רטורית",
  };

  const CONF_COLOR = {
    high: "#ef4444",
    medium: "#facc15",
    low: "#4ade80",
  };

  function sevStyle(s) {
    return (
      SEV_STYLE[s] ||
      "background:#eff1ff;border:1px solid #c7d2fe;color:#4f46e5"
    );
  }

  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  function formatCaseCount(count) {
    return `${count} מקרים`;
  }

  function formatPatternCount(count) {
    return `${count} דפוסים`;
  }

  function sourceTypeLabel(sourceType) {
    return sourceType === "speech" ? "נאום" : "כתבה";
  }

  async function fetchData() {
    try {
      const res = await fetch("/api/leaders");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      leaders = data.leaders;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function toggle(id) {
    expanded = { ...expanded, [id]: !expanded[id] };
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const targetLeader = params.get('leader');
    fetchData().then(() => {
      if (targetLeader) {
        expanded = { ...expanded, [targetLeader]: true };
        setTimeout(() => {
          const el = document.getElementById(`leader-${targetLeader}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    });
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="container">
  <div class="page-header">
    <h2>מנהיגים</h2>
  </div>

  {#if loading}
    <div class="empty">טוען...</div>
  {:else if error}
    <div class="empty error">{error}</div>
  {:else if leaders.length === 0}
    <div class="empty">לא נוספו מנהיגים.</div>
  {:else}
    <div class="list">
      {#each leaders as leader (leader.id)}
        <div class="card" id="leader-{leader.id}">
          <button
            class="card-head"
            class:no-expand={leader.violation_count === 0}
            on:click={() => leader.violation_count > 0 && toggle(leader.id)}
          >
            <div class="leader-info">
              <span class="leader-name">{leader.name}</span>
              <span class="leader-role">{leader.role} · {leader.country}</span>
            </div>
            <div class="leader-right">
              {#if leader.violation_count > 0}
                <span class="sev-tag" style={sevStyle(leader.max_severity)}>
                  {leader.max_severity}/5
                </span>
                <span class="v-count">
                  {formatCaseCount(leader.violation_count)}
                  <span class="v-count-sep">·</span>
                  {formatPatternCount(leader.pattern_count ?? 0)}
                </span>
                <span class="v-date"
                  >{formatDate(leader.last_violation_date)}</span
                >
              {:else if leader.speeches_analyzed > 0}
                <span class="clean">לא נמצאו מניפולציות</span>
              {/if}
              <span class="speech-progress"
                >{leader.speeches_analyzed}/{leader.speeches_total} נאומים נותחו</span
              >
              {#if leader.violation_count > 0}
                <span class="chevron">{expanded[leader.id] ? "▲" : "▼"}</span>
              {/if}
            </div>
          </button>

          {#if expanded[leader.id] && leader.violations?.length > 0}
            <div class="violations">
              {#each leader.violations as v (v.id)}
                <div class="violation">
                  <div class="v-head">
                    <span class="v-d">{formatDate(v.date)}</span>
                    <span class="v-t">{v.title}</span>
                    <span class="v-src">{sourceTypeLabel(v.source_type)} · {v.source_name}</span>
                    {#if v.severity}
                      <span class="sev-tag" style={sevStyle(v.severity)}
                        >{v.severity_label ?? v.severity + "/5"}</span
                      >
                    {/if}
                  </div>
                  {#if v.summary_md}
                    <div
                      class="v-summary-wrap"
                      class:expanded={summaryExpanded[v.id]}
                      on:click|stopPropagation={() =>
                        (summaryExpanded = {
                          ...summaryExpanded,
                          [v.id]: !summaryExpanded[v.id],
                        })}
                      role="button"
                      tabindex="0"
                      on:keypress={(e) =>
                        e.key === "Enter" &&
                        (summaryExpanded = {
                          ...summaryExpanded,
                          [v.id]: !summaryExpanded[v.id],
                        })}
                    >
                      <p class="v-s">{v.summary_md}</p>
                      {#if summaryExpanded[v.id] && v.subtext}
                        <div class="v-subtext-section">
                          <span class="v-subtext-label"
                            >מה מסתתר בין השורות</span
                          >
                          <p class="v-subtext-body">{v.subtext}</p>
                        </div>
                      {/if}
                      <span class="v-summary-chevron"
                        >{summaryExpanded[v.id] ? "▴" : "▾"}</span
                      >
                    </div>
                  {/if}
                  {#if v.patterns?.length > 0}
                    <div class="v-patterns">
                      {#each v.patterns as p, i}
                        <div class="v-pattern">
                          <div class="vp-top">
                            <span class="vp-num">{i + 1}</span>
                            <span class="vp-name"
                              >{PATTERN_NAMES[p.name] ?? p.name}</span
                            >
                            {#if p.level}
                              <span class="vp-level"
                                >{LEVEL_LABELS[p.level] ?? p.level}</span
                              >
                            {/if}
                            {#if p.confidence}
                              <span
                                class="vp-conf"
                                style="color:{CONF_COLOR[p.confidence] ??
                                  'var(--text3)'}"
                              >
                                {p.confidence}
                              </span>
                            {/if}
                          </div>
                          {#if p.quote}
                            <blockquote class="vp-quote">
                              «{p.quote}»
                            </blockquote>
                          {/if}
                          {#if p.explanation}
                            <p class="vp-expl">{p.explanation}</p>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1100px;
    margin: 0 auto;
  }
  .page-header {
    margin-bottom: 16px;
  }
  h2 {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    animation: fadeIn 0.4s ease;
  }

  .card-head {
    width: 100%;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    text-align: left;
    transition: background 0.15s;
  }
  .card-head.no-expand {
    cursor: default;
  }
  .card-head:hover {
    background: var(--bg3);
  }

  .leader-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .leader-name {
    font-size: 0.95rem;
    font-weight: 650;
    color: var(--text);
  }
  .leader-role {
    font-size: 0.72rem;
    color: var(--text3);
  }

  .leader-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .sev-tag {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .v-count {
    font-size: 0.75rem;
    color: var(--text2);
  }
  .v-count-sep {
    margin: 0 6px;
    color: var(--text3);
  }
  .v-date {
    font-size: 0.72rem;
    color: var(--text3);
  }
  .clean {
    font-size: 0.75rem;
    color: var(--green);
  }
  .speech-progress {
    font-size: 0.68rem;
    color: var(--text3);
  }
  .chevron {
    font-size: 0.65rem;
    color: var(--text3);
  }

  .violations {
    border-top: 1px solid var(--border2);
    padding: 12px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .violation {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border2);
  }
  .violation:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .v-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .v-d {
    font-size: 0.68rem;
    color: var(--text3);
    flex-shrink: 0;
  }
  .v-t {
    font-size: 0.88rem;
    color: var(--text);
    font-weight: 600;
    flex: 1;
    min-width: 0;
  }
  .v-src {
    font-size: 0.7rem;
    color: var(--text3);
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: 999px;
    padding: 2px 8px;
  }
  .v-summary-wrap {
    cursor: pointer;
  }

  .v-summary-wrap:not(.expanded) .v-s {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .v-summary-wrap.expanded .v-s {
    display: block;
    overflow: visible;
  }

  .v-summary-chevron {
    display: block;
    font-size: 0.58rem;
    color: var(--text3);
    margin-top: 3px;
    opacity: 0.7;
  }

  .v-subtext-section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border2);
  }

  .v-subtext-label {
    display: block;
    font-size: 0.63rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #5b7fa6;
    margin-bottom: 5px;
  }

  .v-subtext-body {
    font-size: 0.76rem;
    line-height: 1.55;
    color: #8a96a8;
  }

  .v-s {
    font-size: 0.78rem;
    color: var(--text2);
    line-height: 1.5;
  }

  .v-patterns {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 2px;
  }

  .v-pattern {
    background: var(--bg);
    border: 1px solid var(--border2);
    border-radius: 7px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .vp-top {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  .vp-num {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--text3);
    background: var(--bg2);
    border-radius: 4px;
    padding: 1px 5px;
    flex-shrink: 0;
  }

  .vp-name {
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--orange);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .vp-level {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text3);
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 6px;
  }
  .vp-conf {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-left: auto;
  }
  .vp-quote {
    font-size: 0.78rem;
    line-height: 1.45;
    color: var(--text2);
    border-left: 3px solid var(--border);
    padding-left: 10px;
    font-style: italic;
  }
  .vp-expl {
    font-size: 0.76rem;
    line-height: 1.45;
    color: var(--text2);
  }

  .empty {
    text-align: center;
    padding: 64px 16px;
    color: var(--text3);
    font-size: 0.95rem;
  }
  .empty.error {
    color: #f87171;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
