<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  let stats = {
    sitesCount: 0,
    articlesCount: 0,
    threatsCount: 0,
    lastRun: null,
  };
  let headerData = {
    severity_high: 0,
    severity_moderate: 0,
    last_run: null,
    top_pattern_today: null,
  };
  let lastEvent = null;
  let pipelineRunning = false;
  let progress = null;

  const PATTERN_NAMES_HE = {
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

  async function fetchStats() {
    try {
      const res = await fetch("/api/log");
      if (res.ok) {
        const data = await res.json();
        stats = data.stats;
        progress = data.progress ?? null;
        const latest = data.events?.[0];
        if (latest) {
          lastEvent = latest.message;
          pipelineRunning =
            !latest.message.startsWith("Pipeline completed") &&
            data.events.some(
              (e) =>
                e.message === "Pipeline started" &&
                !data.events.find(
                  (e2) =>
                    e2.message.startsWith("Pipeline completed") &&
                    e2.created_at > e.created_at,
                ),
            );
        }
      }
    } catch {}
    try {
      const res2 = await fetch("/api/stats");
      if (res2.ok) {
        const d = await res2.json();
        headerData = d.header || headerData;
      }
    } catch {}
  }

  onMount(() => {
    let timer;

    async function tick() {
      await fetchStats();
      timer = setTimeout(tick, pipelineRunning ? 4000 : 30000);
    }

    tick();
    return () => clearTimeout(timer);
  });

  function formatTime(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return isToday ? `היום ${timeStr}` : timeStr;
  }

  $: systemActive = headerData.last_run
    ? Date.now() - new Date(headerData.last_run).getTime() < 24 * 60 * 60 * 1000
    : false;

  const tabs = [
    { path: "/threats", label: "איומים" },
    { path: "/news", label: "חדשות" },
    { path: "/leaders", label: "מנהיגים" },
    { path: "/sources", label: "מקורות" },
    { path: "/admin", label: "ניהול" },
  ];
</script>

<svelte:head>
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <title>aigregator — ניתוח מניפולציות</title>
</svelte:head>

<div class="layout">
  <div id="topbar">
    <!-- HEADER -->
    <div id="header">
      <div id="conn-dot" class="wait"></div>
      <a href="/" id="logo">aigregator</a>
      <span id="header-sub">
        {#if pipelineRunning && progress}
          ▶ {progress.currentSource}
          {#if progress.total > 0}
            · {progress.current} / {progress.total} כתבות ({progress.percent}%)
          {:else}
            · טוען פיד...
          {/if}
        {:else if pipelineRunning && lastEvent}
          {lastEvent}
        {:else}
          ניתוח מניפולציות
        {/if}
      </span>
      {#if pipelineRunning && progress?.percent > 0}
        <div class="progress-line" style="width:{progress.percent}%"></div>
      {/if}
    </div>

    <!-- PIPELINE COUNTS BAR -->
    <div id="pipeline-bar">
      <div class="cnt">
        <span class="agg-label">נסרק:</span>
        <b>{stats.sitesCount} אתרים</b>
      </div>
      <div class="cnt">
        <b>{stats.articlesCount} כתבות</b>
      </div>
      <div class="cnt">
        <span class="agg-label">איומים:</span>
        <b>{stats.threatsCount}</b>
      </div>

      <div class="bar-sep"></div>

      {#if headerData.severity_high > 0 || headerData.severity_moderate > 0}
        <div class="cnt sev-bar">
          <span class="sev-dot high"></span><span class="sev-lbl">HIGH</span>
          <b class="sev-n">{headerData.severity_high}</b>
          <span class="sev-dot mod"></span><span class="sev-lbl">MOD</span>
          <b class="sev-n">{headerData.severity_moderate}</b>
        </div>
      {/if}

      {#if headerData.top_pattern_today}
        <div class="cnt top-pat">
          <span class="tri">▲</span>
          <span
            >{PATTERN_NAMES_HE[headerData.top_pattern_today.name] ??
              headerData.top_pattern_today.name}</span
          >
          <b>·&nbsp;{headerData.top_pattern_today.count}</b>
        </div>
      {/if}

      <div class="cnt agg-fresh">
        {#if headerData.last_run}
          ריצה אחרונה: {formatTime(headerData.last_run)}
        {:else if formatTime(stats.lastRun)}
          עודכן: {formatTime(stats.lastRun)}
        {:else}
          המערכת ממתינה להפעלה
        {/if}
      </div>

      <div class="cnt status-dot-wrap">
        <span class="status-dot {systemActive ? 'active' : 'waiting'}"></span>
        <span class="status-lbl"
          >{systemActive ? "המערכת פעילה" : "בהמתנה"}</span
        >
      </div>
    </div>

    <!-- TABS -->
    <div id="tabs">
      {#each tabs as tab}
        <a
          href={tab.path}
          class="tab-btn"
          class:active={$page.url.pathname === tab.path}>{tab.label}</a
        >
      {/each}
    </div>
  </div>

  <main>
    <slot />
  </main>
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    --bg: #f4f6fb;
    --bg2: #ffffff;
    --bg3: #eaecf3;
    --border: #d4d9e8;
    --border2: #dde1ea;
    --text: #1a1f2e;
    --text2: #3d4f6e;
    --text3: #7a8faa;
    --red: #dc2626;
    --red-bg: #fff0f0;
    --red-b: #fecaca;
    --green: #16a34a;
    --blue: #2563eb;
    --purple: #7c3aed;
    --orange: #ea6c00;
    --amber: #d97706;
    --radius: 10px;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    direction: rtl;
  }

  :global(a) {
    color: inherit;
    text-decoration: none;
  }

  .layout {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  #topbar {
    position: sticky;
    top: 0;
    z-index: 120;
    background: var(--bg2);
  }

  #header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    background: #0038b8;
    border-bottom: 1px solid #002a8a;
    position: relative;
    overflow: hidden;
  }

  .progress-line {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: #60a5fa;
    transition: width 1.2s ease;
    pointer-events: none;
  }

  #logo {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #ffffff;
    text-decoration: none;
  }

  #conn-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text3);
    flex-shrink: 0;
  }
  :global(#conn-dot.on) {
    background: var(--green);
    box-shadow: 0 0 6px var(--green);
  }
  :global(#conn-dot.off) {
    background: var(--red);
  }
  :global(#conn-dot.wait) {
    background: var(--amber);
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  #header-sub {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.7);
  }

  #pipeline-bar {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 8px 24px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border2);
    font-size: 0.75rem;
    color: var(--text3);
    flex-wrap: wrap;
  }

  #pipeline-bar .cnt {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  #pipeline-bar .cnt b {
    color: var(--text2);
  }
  .agg-label {
    color: var(--text3);
  }
  .agg-fresh {
    color: var(--text2);
  }
  .bar-sep {
    width: 1px;
    height: 14px;
    background: var(--border);
    margin: 0 4px;
  }
  .sev-bar {
    gap: 4px;
  }
  .sev-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .sev-dot.high {
    background: #ef4444;
  }
  .sev-dot.mod {
    background: #f97316;
    margin-left: 6px;
  }
  .sev-lbl {
    color: var(--text3);
  }
  .sev-n {
    color: var(--text2);
  }
  .top-pat {
    gap: 4px;
    color: var(--text3);
  }
  .top-pat .tri {
    color: #f97316;
    font-size: 0.65rem;
  }
  .top-pat b {
    color: var(--text2);
  }
  .status-dot-wrap {
    margin-left: auto;
    gap: 5px;
  }
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-dot.active {
    background: var(--green);
    box-shadow: 0 0 5px var(--green);
    animation: pulse 2s infinite;
  }
  .status-dot.waiting {
    background: var(--amber);
  }
  .status-lbl {
    color: var(--text3);
    font-size: 0.7rem;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  @media (max-width: 640px) {
    #pipeline-bar {
      flex-wrap: wrap;
      row-gap: 6px;
    }
    .bar-sep {
      display: none;
    }
    .status-dot-wrap {
      margin-left: 0;
    }
  }

  #tabs {
    display: flex;
    gap: 0;
    padding: 0 24px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
  }

  .tab-btn {
    padding: 10px 18px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text3);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .tab-btn:hover {
    color: var(--text2);
  }
  .tab-btn.active {
    color: var(--blue);
    border-bottom-color: var(--blue);
  }

  main {
    flex: 1;
    padding: 20px 24px 28px;
    width: 100%;
    overflow-x: clip;
  }
</style>
