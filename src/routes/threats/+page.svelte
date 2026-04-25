<script>
  import { onMount } from 'svelte';
  import { siteMap } from '$lib/siteData.js';
  import leadersData from '../../data-sources/leaders.json';

  let allItems = [];
  let loading = true;
  let error = null;

  let selLeader = null;
  let selOutlet = null;

  const MAX_OUTLETS = 14;

  const PATTERN_NAMES = {
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

  async function fetchData() {
    try {
      const res = await fetch('/api/feed?tab=news');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allItems = data.items ?? [];
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchData();
    const iv = setInterval(fetchData, 60000);
    return () => clearInterval(iv);
  });

  // Articles with a non-reporter attributed leader — used to build matrix
  $: attrItems = allItems.filter(
    i => i.source_type === 'article' && i.attributed_to && i.attribution_role !== 'reporter'
  );

  // Leaders axis (X columns) — from leaders.json
  const leaders = leadersData.map(l => l.name);

  // Outlets axis (Y rows) — top N by cumulative severity
  $: outlets = (() => {
    const map = {};
    for (const i of attrItems) {
      if (!map[i.source]) map[i.source] = 0;
      map[i.source] += i.severity;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_OUTLETS)
      .map(([id]) => id);
  })();

  // Matrix: outlet → leader → { score, count }
  $: matrix = (() => {
    const m = {};
    for (const outlet of outlets) {
      m[outlet] = {};
      for (const leader of leaders) {
        const matching = attrItems.filter(i => i.source === outlet && i.attributed_to === leader);
        if (!matching.length) { m[outlet][leader] = null; continue; }
        const avg = matching.reduce((s, i) => s + i.severity, 0) / matching.length;
        m[outlet][leader] = { score: Math.round(avg * 2 * 10) / 10, count: matching.length };
      }
    }
    return m;
  })();

  // Filtered threats list
  $: filteredThreats = allItems
    .filter(i => {
      if (selLeader && i.attributed_to !== selLeader) return false;
      if (selOutlet && i.source !== selOutlet) return false;
      return true;
    })
    .sort((a, b) => b.severity - a.severity);

  function toggleLeader(l) { selLeader = selLeader === l ? null : l; }
  function toggleOutlet(o) { selOutlet = selOutlet === o ? null : o; }
  function toggleCell(leader, outlet) {
    if (selLeader === leader && selOutlet === outlet) { selLeader = null; selOutlet = null; }
    else { selLeader = leader; selOutlet = outlet; }
  }
  function reset() { selLeader = null; selOutlet = null; }

  function scoreBg(s) {
    if (s >= 8) return 'rgba(120,20,20,0.75)';
    if (s >= 6) return 'rgba(239,68,68,0.28)';
    if (s >= 3) return 'rgba(245,158,11,0.22)';
    return 'rgba(34,197,94,0.18)';
  }
  function scoreFg(s) {
    if (s >= 8) return '#fca5a5';
    if (s >= 6) return '#f87171';
    if (s >= 3) return '#fbbf24';
    return '#4ade80';
  }

  function outletLabel(id) { return siteMap[id] || id; }

  function shortName(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  }

  function formatDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  }
</script>

{#if loading}
  <div class="empty">Загрузка...</div>
{:else if error}
  <div class="empty err">{error}</div>
{:else}

<!-- ══ MATRIX ══ -->
{#if leaders.length > 0 && outlets.length > 0}
<section class="matrix-section">
  <div class="matrix-scroll">
    <table class="matrix">
      <thead>
        <tr>
          <th class="corner"></th>
          {#each leaders as leader}
            <th
              class="leader-th"
              class:sel={selLeader === leader}
              on:click={() => toggleLeader(leader)}
              title={leader}
            >{shortName(leader)}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each outlets as outlet}
          <tr>
            <td
              class="outlet-td"
              class:sel={selOutlet === outlet}
              on:click={() => toggleOutlet(outlet)}
              title={outletLabel(outlet)}
            ><span class="outlet-label">{outletLabel(outlet)}</span></td>
            {#each leaders as leader}
              {@const cell = matrix[outlet]?.[leader]}
              <td
                class="score-cell"
                class:clickable={!!cell}
                class:selected={selLeader === leader && selOutlet === outlet}
                class:col-hi={selLeader === leader}
                class:row-hi={selOutlet === outlet}
                style={cell ? `background:${scoreBg(cell.score)}` : ''}
                on:click={() => cell && toggleCell(leader, outlet)}
                title={cell ? `${leader} × ${outletLabel(outlet)}: ${cell.score} (${cell.count} шт.)` : undefined}
              >
                {#if cell}
                  <span class="score-val" style="color:{scoreFg(cell.score)}">{cell.score}</span>
                {:else}
                  <span class="no-val">–</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
{/if}

<!-- ══ CONTEXT BAR ══ -->
<div class="context-bar">
  <div class="ctx-left">
    {#if selLeader || selOutlet}
      <span class="ctx-label">Фильтр:</span>
      {#if selLeader}<span class="ctx-chip leader-chip">{selLeader}</span>{/if}
      {#if selOutlet}<span class="ctx-chip outlet-chip">{outletLabel(selOutlet)}</span>{/if}
      <button class="reset-btn" on:click={reset}>× сброс</button>
    {:else}
      <span class="ctx-hint">Кликни на лидера, издание или ячейку</span>
    {/if}
  </div>
  <span class="ctx-count">{filteredThreats.length} угроз</span>
</div>

<!-- ══ THREATS LIST ══ -->
<section class="threats-section">
  {#if filteredThreats.length === 0}
    <div class="empty">Нет угроз по выбранным фильтрам</div>
  {:else}
    {#each filteredThreats as item (item.id)}
      <div class="threat-row">
        <div class="sev-badge s{Math.min(item.severity, 5)}">{item.severity}</div>
        <div class="threat-body">
          <div class="threat-title">{item.title || '—'}</div>
          <div class="threat-meta">
            {#if item.source}<span class="m-src">{item.source}</span>{/if}
            {#if item.attributed_to}
              <span class="m-sep">·</span>
              <span class="m-who">{item.attributed_to}</span>
            {/if}
            {#if item.patterns?.[0]}
              <span class="m-sep">·</span>
              <span class="m-pat">{PATTERN_NAMES[item.patterns[0].name] ?? item.patterns[0].name}</span>
            {/if}
            {#if item.analyzed_at}
              <span class="m-sep">·</span>
              <span class="m-date">{formatDate(item.analyzed_at)}</span>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  {/if}
</section>

{/if}

<style>
  .empty { display:flex; align-items:center; justify-content:center; height:180px; color:var(--text3); font-size:0.9rem; }
  .empty.err { color:#f87171; }

  /* ── MATRIX ── */
  .matrix-section {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 12px;
    overflow: hidden;
  }
  .matrix-scroll { overflow-x: auto; }
  .matrix {
    border-collapse: collapse;
    width: max-content;
    min-width: 100%;
    font-size: 0.78rem;
  }

  .corner {
    width: 140px;
    min-width: 140px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border);
  }

  .leader-th {
    padding: 10px 6px;
    text-align: center;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text3);
    cursor: pointer;
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border2);
    white-space: nowrap;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.12s, background 0.12s;
    user-select: none;
  }
  .leader-th:hover { color: var(--text); background: var(--bg3); }
  .leader-th.sel {
    color: var(--blue);
    background: #0f1f35;
    border-bottom-color: var(--blue);
  }

  .outlet-td {
    padding: 7px 12px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text3);
    cursor: pointer;
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border2);
    white-space: nowrap;
    background: var(--bg2);
    transition: color 0.12s, background 0.12s;
    user-select: none;
  }
  .outlet-td:hover { color: var(--text); background: var(--bg3); }
  .outlet-td.sel { color: var(--blue); background: #0f1f35; }
  .outlet-label { max-width: 130px; display:inline-block; overflow:hidden; text-overflow:ellipsis; vertical-align:middle; }

  .score-cell {
    text-align: center;
    padding: 6px 4px;
    border-right: 1px solid var(--border2);
    border-bottom: 1px solid var(--border2);
    width: 54px;
    min-width: 54px;
    transition: outline 0.1s;
    position: relative;
  }
  .score-cell.clickable { cursor: pointer; }
  .score-cell.clickable:hover { outline: 1px solid var(--text3); outline-offset: -1px; }
  .score-cell.col-hi { background: #0a1828 !important; }
  .score-cell.row-hi { background: #0a1828 !important; }
  .score-cell.selected { outline: 2px solid var(--blue) !important; outline-offset: -2px; z-index: 1; }

  .score-val {
    font-size: 0.8rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .no-val { color: var(--border); font-size: 0.75rem; }

  /* ── CONTEXT BAR ── */
  .context-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 4px;
    margin-bottom: 10px;
    font-size: 0.78rem;
  }
  .ctx-left { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .ctx-label { color:var(--text3); font-size:0.68rem; text-transform:uppercase; letter-spacing:0.05em; }
  .ctx-hint { color:var(--text3); font-style:italic; }
  .ctx-chip {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
  }
  .leader-chip { background:#0f1f35; color:var(--blue); border:1px solid #1e3a5f; }
  .outlet-chip  { background:#0f1f35; color:#a5b4fc; border:1px solid #1e3a5f; }
  .reset-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text3);
    font-size: 0.68rem;
    font-family: inherit;
    padding: 2px 10px;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s;
  }
  .reset-btn:hover { border-color: #f87171; color: #f87171; }
  .ctx-count { color:var(--text3); font-size:0.72rem; flex-shrink:0; }

  /* ── THREATS LIST ── */
  .threats-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .threat-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 10px 14px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 7px;
    transition: border-color 0.12s;
  }
  .threat-row:hover { border-color: var(--border2); }

  .sev-badge {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.82rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    margin-top: 1px;
  }
  .sev-badge.s5 { background:#3d1010; color:#ef4444; }
  .sev-badge.s4 { background:#3d2010; color:#f97316; }
  .sev-badge.s3 { background:#332a00; color:#f59e0b; }
  .sev-badge.s2 { background:#0f2a18; color:#4ade80; }
  .sev-badge.s1 { background:#1a1f2e; color:#6b7280; }

  .threat-body { flex: 1; min-width: 0; }
  .threat-title {
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text);
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  .threat-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    font-size: 0.68rem;
  }
  .m-src  { color:var(--text3); }
  .m-sep  { color:var(--border); }
  .m-who  { color:var(--blue); font-weight:600; }
  .m-pat  { color:var(--text3); }
  .m-date { color:var(--text3); }

  /* ── RESPONSIVE ── */
  @media (max-width: 640px) {
    .corner { width: 90px; min-width: 90px; }
    .outlet-label { max-width: 84px; }
    .score-cell { width: 40px; min-width: 40px; }
    .threat-title { white-space: normal; }
  }
</style>
