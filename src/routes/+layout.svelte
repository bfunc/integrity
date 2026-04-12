<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let stats = { sitesCount: 0, articlesCount: 0, threatsCount: 0, lastRun: null };
  let lastEvent = null;
  let pipelineRunning = false;

  async function fetchStats() {
    try {
      const res = await fetch('/api/log');
      if (res.ok) {
        const data = await res.json();
        stats = data.stats;
        const latest = data.events?.[0];
        if (latest) {
          lastEvent = latest.message;
          pipelineRunning = !latest.message.startsWith('Pipeline completed') &&
            data.events.some((e) => e.message === 'Pipeline started' &&
              (!data.events.find((e2) => e2.message.startsWith('Pipeline completed') &&
                e2.created_at > e.created_at)));
        }
      }
    } catch {}
  }

  onMount(() => {
    fetchStats();
    const interval = setInterval(fetchStats, pipelineRunning ? 4000 : 30000);
    return () => clearInterval(interval);
  });

  function formatTime(ts) {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  const tabs = [
    { path: '/threats', label: 'Угрозы' },
    { path: '/news',    label: 'Новости' },
    { path: '/leaders', label: 'Лидеры' },
    { path: '/sources', label: 'Источники' },
    { path: '/log',     label: 'Лог' },
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
      <h1>Integrity</h1>
      <span id="header-sub">
        {#if pipelineRunning && lastEvent}
          {lastEvent}
        {:else}
          Анализ манипуляций
        {/if}
      </span>
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
      <div class="cnt agg-fresh">
        {#if formatTime(stats.lastRun)}
          обновлено: {formatTime(stats.lastRun)}
        {:else}
          pipeline ожидает запуск
        {/if}
      </div>
    </div>

    <!-- TABS -->
    <div id="tabs">
      {#each tabs as tab}
        <a
          href={tab.path}
          class="tab-btn"
          class:active={$page.url.pathname === tab.path}
        >{tab.label}</a>
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
    --bg:        #0c0e14;
    --bg2:       #131720;
    --bg3:       #1a1f2e;
    --border:    #252d3e;
    --border2:   #1e2840;
    --text:      #dde4f0;
    --text2:     #8899b4;
    --text3:     #4d5e7a;
    --red:       #ef4444;
    --red-bg:    #1a0808;
    --red-b:     #3d1010;
    --green:     #22c55e;
    --blue:      #60a5fa;
    --purple:    #a78bfa;
    --orange:    #f97316;
    --amber:     #f59e0b;
    --radius:    10px;
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

  #header h1 {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #f0f4ff;
  }

  #conn-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text3);
    flex-shrink: 0;
  }
  :global(#conn-dot.on)   { background: var(--green); box-shadow: 0 0 6px var(--green); }
  :global(#conn-dot.off)  { background: var(--red); }
  :global(#conn-dot.wait) { background: var(--amber); animation: blink 1s infinite; }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }

  #header-sub {
    font-size: 0.78rem;
    color: var(--text3);
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

  #pipeline-bar .cnt b { color: var(--text2); }
  .agg-label            { color: var(--text3); }
  .agg-fresh            { margin-left: auto; color: var(--text2); }

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
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn:hover  { color: var(--text2); }
  .tab-btn.active { color: var(--blue); border-bottom-color: var(--blue); }

  /* MAIN */
  main {
    flex: 1;
    padding: 20px 24px 28px;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }
</style>
