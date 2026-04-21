<script>
  import { onMount } from 'svelte';
  import sitesData from '../../../data-sources/sites.json';

  let data = null;
  let loading = true;
  let error = null;

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

  const SITE_NAMES = Object.fromEntries(sitesData.map(s => [s.id, s.name]));

  const ROLE_LABEL = {
    originator: 'МАНИПУЛЯТОР',
    amplifier:  'УСИЛИТЕЛЬ',
  };

  async function fetchData() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
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

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  $: heatmapMax = data
    ? Math.max(...(data.heatmap || []).flatMap(r => Object.values(r.srcs || {})), 1)
    : 1;
</script>

{#if loading}
  <div class="empty">Загрузка аналитики...</div>
{:else if error}
  <div class="empty err">{error}</div>
{:else if !data}
  <div class="empty">Нет данных</div>
{:else}

<!-- ── BLOCK 1: KPI ── -->
<section class="kpi-row">
  <div class="kpi-card">
    <span class="kpi-n">{data.kpi.total}</span>
    <span class="kpi-lbl">Всего угроз<br><small>severity ≥ 3</small></span>
  </div>
  <div class="kpi-card critical">
    <span class="kpi-n">{data.kpi.critical}</span>
    <span class="kpi-lbl">Критических<br><small>severity 5</small></span>
  </div>
  <div class="kpi-card kpi-speakers">
    <div class="kpi-speakers-title">Топ манипуляторов <span class="block-sub">· речи</span></div>
    {#if data.top_manipulators.length === 0}
      <p class="no-data">Нет данных по речам</p>
    {:else}
      {#each data.top_manipulators.slice(0, 5) as row, i}
        <div class="spk-row">
          <span class="spk-num">{i + 1}</span>
          <span class="spk-name">{row.attributed_to}</span>
          <span class="spk-count">{row.count}</span>
          <span class="rank-sev sev-{row.max_severity}">{row.max_severity}/5</span>
        </div>
      {/each}
    {/if}
  </div>
</section>

<!-- ── BLOCK 3: Top sources ── -->
<section class="block two-col">
  <div class="col">
    <h3 class="block-title red">Манипулируют сами <span class="block-sub">· СМИ-оригинаторы</span></h3>
    {#if data.top_sources.originators.length === 0}
      <p class="no-data">Нет данных</p>
    {:else}
      {#each data.top_sources.originators as row, i}
        {@const maxC = data.top_sources.originators[0].count}
        <div class="rank-row compact">
          <span class="rank-num">{i + 1}</span>
          <div class="rank-info">
            <div class="rank-name">{row.attributed_to}</div>
            <div class="rank-bar-wrap">
              <div class="rank-bar" style="width:{Math.round((row.count / maxC) * 100)}%;background:#ef4444"></div>
            </div>
          </div>
          <div class="rank-meta">
            <span class="rank-count">{row.count}</span>
            <span class="rank-sev sev-{row.max_severity}">{row.max_severity}/5</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>
  <div class="col">
    <h3 class="block-title orange">Усиливают чужое <span class="block-sub">· СМИ-амплифайеры</span></h3>
    {#if data.top_sources.amplifiers.length === 0}
      <p class="no-data">Нет данных</p>
    {:else}
      {#each data.top_sources.amplifiers as row, i}
        {@const maxC = data.top_sources.amplifiers[0].count}
        <div class="rank-row compact">
          <span class="rank-num">{i + 1}</span>
          <div class="rank-info">
            <div class="rank-name">{row.attributed_to}</div>
            <div class="rank-bar-wrap">
              <div class="rank-bar" style="width:{Math.round((row.count / maxC) * 100)}%;background:#f97316"></div>
            </div>
          </div>
          <div class="rank-meta">
            <span class="rank-count">{row.count}</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</section>

<!-- ── BLOCK 3: Dangerous articles ── -->
<section class="block">
  <h3 class="block-title red">Самые опасные материалы <span class="block-sub">· severity 5</span></h3>
  {#if !data.dangerous || data.dangerous.length === 0}
    <p class="no-data">Нет материалов с максимальной угрозой</p>
  {:else}
    <div class="danger-table-wrap">
      <table class="danger-table">
        <thead>
          <tr>
            <th>Заголовок</th>
            <th>Источник</th>
            <th>Attribution</th>
            <th>Паттерн</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {#each data.dangerous as row}
            <tr>
              <td class="td-title">{row.title || '—'}</td>
              <td class="td-src">{row.source || '—'}</td>
              <td>
                {#if row.attribution_role && row.attribution_role !== 'reporter'}
                  <span class="attr-badge {row.attribution_role}">
                    {ROLE_LABEL[row.attribution_role]}
                  </span>
                {:else}
                  <span class="attr-none">{row.attributed_to || '—'}</span>
                {/if}
              </td>
              <td class="td-pat">{PATTERN_NAMES[row.pattern_type] ?? row.pattern_type ?? '—'}</td>
              <td class="td-date">{formatDate(row.published_at)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<!-- ── BLOCK 4: Heatmap ── -->
<section class="block">
  <h3 class="block-title">Тепловая карта <span class="block-sub">· паттерн × источник</span></h3>
  {#if !data.heatmap || data.heatmap.length === 0}
    <p class="no-data">Недостаточно данных</p>
  {:else}
    {@const srcKeys = data.source_keys?.length
      ? data.source_keys
      : [...new Set(data.heatmap.flatMap(r => Object.keys(r.srcs || {})))]}
    <div class="hm-grid" style="grid-template-columns: 140px repeat({srcKeys.length}, 1fr)">
      <!-- header row -->
      <div class="hm-corner"></div>
      {#each srcKeys as src}
        {@const label = (SITE_NAMES[src] ?? src)}
        <div class="hm-col-head" title={label}>
          {label.length > 10 ? label.slice(0, 9) + '…' : label}
        </div>
      {/each}
      <!-- data rows -->
      {#each data.heatmap as row}
        <div class="hm-row-label">{PATTERN_NAMES[row.pattern] ?? row.pattern}</div>
        {#each srcKeys as src}
          {@const v = row.srcs[src] || 0}
          {@const alpha = v > 0 ? (v / heatmapMax).toFixed(2) : '0'}
          <div
            class="hm-cell"
            style="background: rgba(220,50,50,{alpha})"
            title="{PATTERN_NAMES[row.pattern] ?? row.pattern} · {SITE_NAMES[src] ?? src}: {v}"
          >{#if v > 0}{v}{/if}</div>
        {/each}
      {/each}
    </div>
  {/if}
</section>

{/if}

<style>
  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--text3);
    font-size: 0.9rem;
  }
  .empty.err { color: #f87171; }

  /* ── KPI ── */
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .kpi-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .kpi-card.critical { border-color: #3d1010; }
  .kpi-card.kpi-speakers {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 14px 16px;
  }
  .kpi-speakers-title {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text3);
    margin-bottom: 10px;
  }
  .spk-row {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 0;
    border-bottom: 1px solid var(--border2);
  }
  .spk-row:last-child { border-bottom: none; }
  .spk-num {
    font-size: 0.65rem;
    color: var(--text3);
    width: 14px;
    text-align: right;
    flex-shrink: 0;
  }
  .spk-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .spk-count {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text2);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .kpi-n {
    font-size: 2.2rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--text);
    line-height: 1;
  }
  .kpi-card.critical .kpi-n { color: #ef4444; }
  .kpi-lbl {
    font-size: 0.78rem;
    color: var(--text3);
    line-height: 1.5;
  }
  .kpi-lbl small { font-size: 0.68rem; color: var(--text3); }

  /* ── BLOCKS ── */
  .block {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    margin-bottom: 16px;
  }
  .block-title {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text3);
    margin-bottom: 14px;
  }
  .block-title.red    { color: #ef4444; }
  .block-title.orange { color: #f97316; }
  .block-sub { font-weight: 400; text-transform: none; letter-spacing: 0; }
  .no-data {
    color: var(--text3);
    font-size: 0.82rem;
    padding: 12px 0;
  }

  /* ── RANK ROWS ── */
  .rank-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid var(--border2);
  }
  .rank-row:last-child { border-bottom: none; }
  .rank-row.compact { padding: 5px 0; }
  .rank-num {
    font-size: 0.7rem;
    color: var(--text3);
    width: 18px;
    text-align: right;
    flex-shrink: 0;
  }
  .rank-info {
    flex: 1;
    min-width: 0;
  }
  .rank-name {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }
  .rank-bar-wrap {
    height: 4px;
    background: var(--bg3);
    border-radius: 2px;
    overflow: hidden;
  }
  .rank-bar {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s ease;
  }
  .rank-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .rank-count {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text2);
    font-variant-numeric: tabular-nums;
  }
  .rank-sev {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--bg3);
  }
  .rank-sev.sev-5 { color: #ef4444; }
  .rank-sev.sev-4 { color: #fca5a5; }
  .rank-sev.sev-3 { color: #fb923c; }
  .rank-date {
    font-size: 0.7rem;
    color: var(--text3);
    font-variant-numeric: tabular-nums;
  }

  /* ── TWO-COL ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .col { min-width: 0; }

  /* ── HEATMAP ── */
  .hm-grid {
    display: grid;
    gap: 2px;
    overflow-x: auto;
  }
  .hm-col-head {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text3);
    padding: 4px 6px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .hm-row-label {
    background: var(--bg3);
    color: var(--text2);
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0 8px;
    display: flex;
    align-items: center;
    height: 40px;
    border-radius: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hm-cell {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
    color: rgba(255,255,255,0.9);
    border-radius: 3px;
    min-width: 0;
  }

  /* ── DANGER TABLE ── */
  .danger-table-wrap {
    overflow-x: auto;
  }
  .danger-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
  }
  .danger-table th {
    text-align: left;
    color: var(--text3);
    font-weight: 600;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .danger-table td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border2);
    color: var(--text2);
    vertical-align: middle;
  }
  .danger-table tr:last-child td { border-bottom: none; }
  .td-title {
    color: var(--text);
    max-width: 280px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .td-src, .td-pat, .td-date {
    white-space: nowrap;
    font-size: 0.72rem;
  }
  .attr-badge {
    font-size: 0.62rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    letter-spacing: 0.04em;
  }
  .attr-badge.originator { background: #3d1010; color: #ef4444; }
  .attr-badge.amplifier  { background: #431407; color: #f97316; }
  .attr-none { color: var(--text3); font-size: 0.72rem; }

  /* ── RESPONSIVE ── */
  @media (max-width: 700px) {
    .kpi-row   { grid-template-columns: 1fr 1fr; }
    .two-col   { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .kpi-row { grid-template-columns: 1fr; }
  }
</style>
