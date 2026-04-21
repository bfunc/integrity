<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { BUILD } from "$lib/build.js";

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

  const PATTERN_NAMES_RU = {
    call_to_violence:              'Призыв к насилию',
    dehumanization:                'Дегуманизация',
    demonization:                  'Демонизация',
    existential_threat_accusation: 'Экзистенциальная угроза',
    scapegoating:                  'Козёл отпущения',
    us_vs_them:                    'Мы против них',
    appeal_to_fear:                'Апелляция к страху',
    conspiracy_targeting:          'Конспирология',
    false_dilemma:                 'Ложная дилемма',
    whataboutism:                  'Вотэбаутизм',
    emotional_manipulation:        'Эмоциональная манипуляция',
    group_discrediting:            'Дискредитация группы',
  };

  async function fetchStats() {
    try {
      const res = await fetch("/api/log");
      if (res.ok) {
        const data = await res.json();
        stats = data.stats;
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
    console.log(`Build #${BUILD}`);
    fetchStats();
    const interval = setInterval(fetchStats, pipelineRunning ? 4000 : 30000);
    return () => clearInterval(interval);
  });

  function formatTime(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return isToday ? `сегодня ${timeStr}` : timeStr;
  }

  $: systemActive = headerData.last_run
    ? (Date.now() - new Date(headerData.last_run).getTime()) < 24 * 60 * 60 * 1000
    : false;

  const tabs = [
    { path: "/lab/threats", label: "Угрозы" },
    { path: "/lab/news", label: "Новости" },
    { path: "/lab/leaders", label: "Лидеры" },
    { path: "/lab/sources", label: "Источники" },
    { path: "/lab/log", label: "Лог" },
  ];
</script>

<svelte:head>
  <title>Integrity — Анализ манипуляций</title>
</svelte:head>

<div class="layout">
  <div id="topbar">
    <!-- HEADER -->
    <div id="header">
      <div id="conn-dot" class="wait"></div>
      <a href="/" id="logo">Integrity</a>
      <span id="header-sub">
        {#if pipelineRunning && lastEvent}
          {lastEvent}
        {:else}
          Анализ манипуляций
        {/if}
      </span>
      <span id="build-badge">#{BUILD}</span>
    </div>

    <!-- PIPELINE COUNTS BAR -->
    <div id="pipeline-bar">
      <div class="cnt">
        <span class="agg-label">Просканировано:</span>
        <b>{stats.sitesCount} сайтов</b>
      </div>
      <div class="cnt">
        <b>{stats.articlesCount} статей</b>
      </div>
      <div class="cnt">
        <span class="agg-label">Угроз:</span>
        <b>{stats.threatsCount}</b>
      </div>

      <div class="bar-sep"></div>

      <!-- Severity bar -->
      {#if headerData.severity_high > 0 || headerData.severity_moderate > 0}
        <div class="cnt sev-bar">
          <span class="sev-dot high"></span><span class="sev-lbl">HIGH</span>
          <b class="sev-n">{headerData.severity_high}</b>
          <span class="sev-dot mod"></span><span class="sev-lbl">MOD</span>
          <b class="sev-n">{headerData.severity_moderate}</b>
        </div>
      {/if}

      <!-- Top pattern today -->
      {#if headerData.top_pattern_today}
        <div class="cnt top-pat">
          <span class="tri">▲</span>
          <span>{PATTERN_NAMES_RU[headerData.top_pattern_today.name] ?? headerData.top_pattern_today.name}</span>
          <b>·&nbsp;{headerData.top_pattern_today.count}</b>
        </div>
      {/if}

      <!-- Last run -->
      <div class="cnt agg-fresh">
        {#if headerData.last_run}
          Последний запуск: {formatTime(headerData.last_run)}
        {:else if formatTime(stats.lastRun)}
          обновлено: {formatTime(stats.lastRun)}
        {:else}
          pipeline ожидает запуск
        {/if}
      </div>

      <!-- System status -->
      <div class="cnt status-dot-wrap">
        <span class="status-dot {systemActive ? 'active' : 'waiting'}"></span>
        <span class="status-lbl">{systemActive ? 'Система активна' : 'Ожидание'}</span>
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
    --bg: #0c0e14;
    --bg2: #131720;
    --bg3: #1a1f2e;
    --border: #252d3e;
    --border2: #1e2840;
    --text: #dde4f0;
    --text2: #8899b4;
    --text3: #4d5e7a;
    --red: #ef4444;
    --red-bg: #1a0808;
    --red-b: #3d1010;
    --green: #22c55e;
    --blue: #60a5fa;
    --purple: #a78bfa;
    --orange: #f97316;
    --amber: #f59e0b;
    --radius: 10px;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
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

  /* HEADER */
  #header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
  }

  #logo {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f0f4ff;
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
    color: var(--text3);
  }

  #build-badge {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--text3);
    font-variant-numeric: tabular-nums;
  }

  /* PIPELINE BAR */
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
  .sev-dot.high { background: #ef4444; }
  .sev-dot.mod  { background: #f97316; margin-left: 6px; }
  .sev-lbl { color: var(--text3); }
  .sev-n   { color: var(--text2); }
  .top-pat {
    gap: 4px;
    color: var(--text3);
  }
  .top-pat .tri { color: #f97316; font-size: 0.65rem; }
  .top-pat b    { color: var(--text2); }
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
  .status-dot.active  { background: var(--green); box-shadow: 0 0 5px var(--green); animation: pulse 2s infinite; }
  .status-dot.waiting { background: var(--amber); }
  .status-lbl { color: var(--text3); font-size: 0.7rem; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @media (max-width: 640px) {
    #pipeline-bar { flex-wrap: wrap; row-gap: 6px; }
    .bar-sep { display: none; }
    .status-dot-wrap { margin-left: 0; }
  }

  /* TABS */
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

  /* MAIN */
  main {
    flex: 1;
    padding: 20px 24px 28px;
    width: 100%;
  }
</style>
