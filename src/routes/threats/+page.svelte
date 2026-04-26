<script>
  import { onMount } from "svelte";
  import { siteMap, sites } from "$lib/siteData.js";
  import leadersData from "../../data-sources/leaders.json";

  let allItems = [];
  let loading = true;
  let error = null;

  let selLeader = null;
  let selOutlet = null;

  const PATTERN_NAMES = {
    call_to_violence: "Призыв к насилию",
    dehumanization: "Дегуманизация",
    demonization: "Демонизация",
    existential_threat_accusation: "Экзистенциальная угроза",
    scapegoating: "Козёл отпущения",
    us_vs_them: "Мы против них",
    appeal_to_fear: "Апелляция к страху",
    conspiracy_targeting: "Конспирология",
    false_dilemma: "Ложная дилемма",
    whataboutism: "Вотэбаутизм",
    emotional_manipulation: "Эмоциональная манипуляция",
    group_discrediting: "Дискредитация группы",
  };

  const INCITEMENT = new Set([
    "call_to_violence",
    "existential_threat_accusation",
    "appeal_to_fear",
  ]);
  const DELEGIT = new Set([
    "dehumanization",
    "demonization",
    "group_discrediting",
    "scapegoating",
  ]);
  const POLAR = new Set([
    "us_vs_them",
    "false_dilemma",
    "whataboutism",
    "emotional_manipulation",
    "conspiracy_targeting",
  ]);

  async function fetchData() {
    try {
      const res = await fetch("/api/feed?tab=news");
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

  // ── Domain helpers ──────────────────────────────────────────
  function extractDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  // domain → site id  (e.g. "timesofisrael.com" → "timesofisrael")
  const domainToSiteId = Object.fromEntries(
    sites.flatMap((s) => {
      const d = extractDomain(s.url);
      return d ? [[d, s.id]] : [];
    }),
  );

  // Extra outlets from speech URLs whose domain isn't already a known site
  const extraOutlets = (() => {
    const seen = new Set(sites.map((s) => s.id));
    const result = [];
    for (const l of leadersData) {
      for (const sp of l.speeches || []) {
        const domain = extractDomain(sp.url);
        if (!domain) continue;
        const id = domainToSiteId[domain] || domain;
        if (!seen.has(id)) {
          seen.add(id);
          result.push({ id, name: domain });
        }
      }
    }
    return result;
  })();

  // Full ordered outlet list: all RSS sites first, then extra speech domains
  const allOutlets = [
    ...sites.map((s) => s.id),
    ...extraOutlets.map((o) => o.id),
  ];

  // Extended label map includes extra speech-domain outlets
  const extSiteMap = {
    ...siteMap,
    ...Object.fromEntries(extraOutlets.map((o) => [o.id, o.name])),
  };

  // For speeches item.source = leader_id — derive real outlet from item.url instead
  function itemSource(item) {
    if (item.source_type !== "speech") return item.source;
    const domain = extractDomain(item.url);
    return domain ? domainToSiteId[domain] || domain : "unknown";
  }

  // ── Reactive ─────────────────────────────────────────────────
  // Include both articles (with attribution) and speeches
  $: attrItems = allItems.filter(
    (i) => i.attributed_to && i.attribution_role !== "reporter",
  );

  const leaders = leadersData.map((l) => l.name);

  // Per-leader stats for cards
  $: leaderStats = (() => {
    const map = {};
    for (const item of allItems) {
      if (!item.attributed_to) continue;
      if (!map[item.attributed_to])
        map[item.attributed_to] = { maxSev: 0, count: 0, topItem: null };
      const s = map[item.attributed_to];
      s.count++;
      if (item.severity > s.maxSev) {
        s.maxSev = item.severity;
        s.topItem = item;
      }
    }
    return map;
  })();

  // Pattern matrix for analysis table
  $: patternMatrix = (() => {
    const m = Object.fromEntries(
      leaders.map((l) => [l, { inc: 0, del: 0, pol: 0 }]),
    );
    for (const item of allItems) {
      const row = m[item.attributed_to];
      if (!row) continue;
      for (const p of item.patterns || []) {
        if (INCITEMENT.has(p.name)) row.inc++;
        else if (DELEGIT.has(p.name)) row.del++;
        else if (POLAR.has(p.name)) row.pol++;
      }
    }
    return m;
  })();

  // Always show all configured outlets (never depend on live data)
  $: outlets = allOutlets;

  $: matrix = (() => {
    const m = {};
    for (const outlet of outlets) {
      m[outlet] = {};
      for (const leader of leaders) {
        const matching = attrItems.filter(
          (i) => itemSource(i) === outlet && i.attributed_to === leader,
        );
        if (!matching.length) {
          m[outlet][leader] = null;
          continue;
        }
        const avg =
          matching.reduce((s, i) => s + i.severity, 0) / matching.length;
        m[outlet][leader] = {
          score: Math.round(avg * 2 * 10) / 10,
          count: matching.length,
        };
      }
    }
    return m;
  })();

  $: totalPatterns = allItems.reduce(
    (s, i) => s + (i.patterns?.length || 0),
    0,
  );
  $: maxSeverity = allItems.reduce((mx, i) => Math.max(mx, i.severity || 0), 0);

  $: filteredThreats = allItems
    .filter((i) => {
      if (selLeader && i.attributed_to !== selLeader) return false;
      if (selOutlet && itemSource(i) !== selOutlet) return false;
      return true;
    })
    .sort((a, b) => b.severity - a.severity);

  function toggleLeader(l) {
    selLeader = selLeader === l ? null : l;
  }
  function toggleOutlet(o) {
    selOutlet = selOutlet === o ? null : o;
  }
  function toggleCell(leader, outlet) {
    if (selLeader === leader && selOutlet === outlet) {
      selLeader = null;
      selOutlet = null;
    } else {
      selLeader = leader;
      selOutlet = outlet;
    }
  }
  function reset() {
    selLeader = null;
    selOutlet = null;
  }

  // White-theme score colors
  function scoreBg(s) {
    if (s >= 8) return "#fee2e2";
    if (s >= 6) return "#fef3c7";
    if (s >= 3) return "#fefce8";
    return "#f0fdf4";
  }
  function scoreFg(s) {
    if (s >= 8) return "#b91c1c";
    if (s >= 6) return "#b45309";
    if (s >= 3) return "#92400e";
    return "#166534";
  }
  function sevColor(s) {
    if (s >= 5) return "#dc2626";
    if (s >= 4) return "#ea580c";
    if (s >= 3) return "#d97706";
    return "#6b7280";
  }
  function dotLevel(n) {
    if (n >= 3) return "high";
    if (n >= 1) return "med";
    return "none";
  }
  function outletLabel(id) {
    return extSiteMap[id] || id;
  }
  function shortName(name) {
    if (!name) return "";
    const p = name.trim().split(/\s+/);
    return p.length > 1 ? p[p.length - 1] : p[0];
  }
  function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
  }
</script>

{#if loading}
  <div class="rw-page"><div class="rw-empty">Загрузка...</div></div>
{:else if error}
  <div class="rw-page"><div class="rw-empty err">{error}</div></div>
{:else}
  <div class="rw-page">
    <!-- ══ HEADER ══ -->
    <div class="rw-header">
      <h1 class="rw-title">Rhetoric Watch</h1>
      <div class="rw-stats">
        <span class="rw-stat"><b>{totalPatterns}</b> Паттернов</span>
        <span class="rw-sep">|</span>
        <span class="rw-stat"><b>{allItems.length}</b> Материалов</span>
        <span class="rw-sep">|</span>
        <span class="rw-stat" class:rw-warn={maxSeverity >= 4}>
          Max Severity: <b>{maxSeverity || "—"}</b>
          {#if maxSeverity >= 4}<span class="warn-tri">▲</span>{/if}
        </span>
      </div>
    </div>

    <!-- ══ BODY: main + sidebar ══ -->
    <div class="rw-body">
      <!-- ── MAIN ── -->
      <div class="rw-main">
        <!-- Matrix -->
        {#if leaders.length > 0 && outlets.length > 0}
          <div class="matrix-card">
            <div class="matrix-scroll">
              <table class="matrix">
                <thead>
                  <tr>
                    <th class="corner">Издание \ Лидер</th>
                    {#each leaders as leader}
                      <th
                        class="leader-th"
                        class:sel={selLeader === leader}
                        on:click={() => toggleLeader(leader)}
                        title={leader}>{shortName(leader)}</th
                      >
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
                        ><span class="outlet-label">{outletLabel(outlet)}</span
                        ></td
                      >
                      {#each leaders as leader}
                        {@const cell = matrix[outlet]?.[leader]}
                        <td
                          class="score-cell"
                          class:clickable={!!cell}
                          class:selected={selLeader === leader &&
                            selOutlet === outlet}
                          class:col-hi={selLeader === leader}
                          class:row-hi={selOutlet === outlet}
                          style={cell
                            ? `background:${scoreBg(cell.score)}`
                            : ""}
                          on:click={() => cell && toggleCell(leader, outlet)}
                          title={cell
                            ? `${leader} × ${outletLabel(outlet)}: ${cell.score} (${cell.count} шт.)`
                            : undefined}
                        >
                          {#if cell}
                            <span
                              class="score-val"
                              style="color:{scoreFg(cell.score)}"
                              >{cell.score}</span
                            >
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
          </div>
        {/if}

        <!-- Context bar -->
        <div class="context-bar">
          <div class="ctx-left">
            {#if selLeader || selOutlet}
              <span class="ctx-label">Фильтр:</span>
              {#if selLeader}<span class="ctx-chip">{selLeader}</span>{/if}
              {#if selOutlet}<span class="ctx-chip outlet"
                  >{outletLabel(selOutlet)}</span
                >{/if}
              <button class="reset-btn" on:click={reset}>× сброс</button>
            {:else}
              <span class="ctx-hint"
                >Кликните ячейку матрицы для фильтрации</span
              >
            {/if}
          </div>
          <span class="ctx-count">{filteredThreats.length} угроз</span>
        </div>

        <!-- Threats list — directly under matrix -->
        <div class="threats-list">
          {#if filteredThreats.length === 0}
            <div class="rw-empty">Нет угроз по выбранным фильтрам</div>
          {:else}
            {#each filteredThreats as item (item.id)}
              <div class="threat-row">
                <div
                  class="sev-badge"
                  style="background:{sevColor(item.severity)}18;color:{sevColor(
                    item.severity,
                  )};border:1px solid {sevColor(item.severity)}40"
                >
                  {item.severity}
                </div>
                <div class="threat-body">
                  <div class="threat-title">{item.title || "—"}</div>
                  <div class="threat-meta">
                    {#if item.source}<span class="m-src"
                        >{outletLabel(itemSource(item))}</span
                      >{/if}
                    {#if item.attributed_to}<span class="m-sep">·</span><span
                        class="m-who">{item.attributed_to}</span
                      >{/if}
                    {#if item.patterns?.[0]}<span class="m-sep">·</span><span
                        class="m-pat"
                        >{PATTERN_NAMES[item.patterns[0].name] ??
                          item.patterns[0].name}</span
                      >{/if}
                  </div>
                </div>
                {#if item.analyzed_at}
                  <span class="m-date-right"
                    >{formatDate(item.analyzed_at)}</span
                  >
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>
      <!-- /rw-main -->

      <!-- ── SIDEBAR ── -->
      <div class="rw-sidebar">
        <!-- Compact leader list -->
        <div class="sb-card">
          <div class="sb-label">Лидеры</div>
          {#each leadersData as leader}
            {@const st = leaderStats[leader.name]}
            <button
              class="lc-row"
              class:sel={selLeader === leader.name}
              on:click={() => toggleLeader(leader.name)}
            >
              <span
                class="lc-dot"
                style="background:{st ? sevColor(st.maxSev) : '#cbd5e1'}"
              ></span>
              <span class="lc-name">{leader.name}</span>
              {#if st?.maxSev >= 3}
                <span class="lc-sev" style="color:{sevColor(st.maxSev)}"
                  >{st.maxSev}/5</span
                >
              {/if}
              {#if st?.count}
                <span class="lc-cnt">{st.count}</span>
              {:else}
                <span class="lc-nodata">—</span>
              {/if}
            </button>
          {/each}
        </div>

        <!-- Patterns analysis -->
        <div class="sb-card">
          <div class="sb-label">Анализ паттернов</div>
          <table class="pat-table">
            <thead>
              <tr>
                <th>Субъект</th>
                <th title="Подстрекательство">Подст.</th>
                <th title="Делегитимизация">Делег.</th>
                <th title="Поляризация">Поляр.</th>
              </tr>
            </thead>
            <tbody>
              {#each leadersData as leader}
                {@const m = patternMatrix[leader.name]}
                {#if m}
                  <tr>
                    <td class="pat-name">{shortName(leader.name)}</td>
                    <td><span class="dot {dotLevel(m.inc)}"></span></td>
                    <td><span class="dot {dotLevel(m.del)}"></span></td>
                    <td><span class="dot {dotLevel(m.pol)}"></span></td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Violations -->
        <div class="sb-card">
          <div class="sb-label">Потенциальные нарушения</div>
          <div class="viol-item">
            <span class="viol-chk">✓</span> МПГПП (ICCPR)
          </div>
          <div class="viol-item">
            <span class="viol-chk">✓</span> Рабатский план действий
          </div>
          {#if maxSeverity >= 4}
            <div class="viol-item">
              <span class="viol-chk">✓</span> Законы о разжигании ненависти
            </div>
            <div class="viol-item">
              <span class="viol-chk warn">⚠</span> Требует правовой оценки
            </div>
          {/if}
        </div>
      </div>
      <!-- /rw-sidebar -->
    </div>
    <!-- /rw-body -->
  </div>
{/if}

<style>
  /* ── PAGE ── */
  .rw-page {
    margin: -20px -24px -28px;
    padding: 20px 24px 36px;
    background: #f0f4f8;
    color: #1a202c;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    min-height: calc(100% + 48px);
  }
  .rw-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    color: #94a3b8;
    font-size: 0.9rem;
  }
  .rw-empty.err {
    color: #dc2626;
  }

  /* ── HEADER ── */
  .rw-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 20px;
    margin-bottom: 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  .rw-title {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #0f172a;
  }
  .rw-stats {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.82rem;
    color: #64748b;
  }
  .rw-stat {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .rw-stat b {
    font-weight: 800;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
  }
  .rw-stat.rw-warn b {
    color: #dc2626;
  }
  .warn-tri {
    color: #dc2626;
    font-size: 0.7rem;
  }
  .rw-sep {
    color: #cbd5e1;
  }

  /* ── 2-COLUMN BODY ── */
  .rw-body {
    display: grid;
    grid-template-columns: 1fr 40rem;
    gap: 14px;
    align-items: start;
  }

  /* ── SIDEBAR ── */
  .rw-sidebar {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: sticky;
    top: 144px;
  }
  .sb-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .sb-label {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #94a3b8;
    margin-bottom: 10px;
  }

  /* Compact leader rows */
  .lc-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    border: none;
    background: none;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s;
  }
  .lc-row:hover {
    background: #f1f5f9;
  }
  .lc-row.sel {
    background: #eff6ff;
  }
  .lc-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .lc-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #1e293b;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .lc-sev {
    font-size: 0.68rem;
    font-weight: 800;
    flex-shrink: 0;
  }
  .lc-cnt {
    font-size: 0.65rem;
    font-weight: 700;
    color: #64748b;
    background: #f1f5f9;
    border-radius: 4px;
    padding: 1px 5px;
    flex-shrink: 0;
  }
  .lc-nodata {
    font-size: 0.65rem;
    color: #cbd5e1;
    flex-shrink: 0;
  }

  /* Patterns table */
  .pat-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
  }
  .pat-table th {
    text-align: left;
    color: #94a3b8;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 8px 8px;
  }
  .pat-table th:first-child {
    padding-left: 0;
  }
  .pat-table td {
    padding: 5px 8px;
    border-bottom: 1px solid #f1f5f9;
  }
  .pat-table tr:last-child td {
    border-bottom: none;
  }
  .pat-table td:first-child {
    padding-left: 0;
  }
  .pat-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: #1e293b;
    white-space: nowrap;
  }
  .dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    vertical-align: middle;
  }
  .dot.high {
    background: #dc2626;
    box-shadow: 0 0 4px #dc262650;
  }
  .dot.med {
    background: #f59e0b;
  }
  .dot.none {
    background: #e2e8f0;
  }

  /* Violations */
  .viol-item {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 0.78rem;
    color: #334155;
    padding: 5px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .viol-item:last-child {
    border-bottom: none;
  }
  .viol-chk {
    font-size: 0.7rem;
    font-weight: 800;
    color: #16a34a;
    flex-shrink: 0;
  }
  .viol-chk.warn {
    color: #d97706;
  }

  /* ── MATRIX ── */
  .matrix-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  .matrix-scroll {
    overflow-x: auto;
  }
  .matrix {
    border-collapse: collapse;
    width: max-content;
    min-width: 100%;
    font-size: 0.76rem;
  }
  .corner {
    width: 130px;
    min-width: 130px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
    padding: 9px 12px;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }
  .leader-th {
    padding: 9px 6px;
    text-align: center;
    font-size: 0.7rem;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
    border-bottom: 2px solid #e2e8f0;
    border-right: 1px solid #f1f5f9;
    white-space: nowrap;
    transition:
      background 0.12s,
      color 0.12s;
    user-select: none;
    min-width: 62px;
  }
  .leader-th:hover {
    background: #f8fafc;
    color: #0f172a;
  }
  .leader-th.sel {
    color: #2563eb;
    background: #eff6ff;
    border-bottom-color: #3b82f6;
  }
  .outlet-td {
    padding: 6px 12px;
    font-size: 0.7rem;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    border-right: 1px solid #e2e8f0;
    border-bottom: 1px solid #f1f5f9;
    background: #f8fafc;
    transition:
      background 0.12s,
      color 0.12s;
    user-select: none;
  }
  .outlet-td:hover {
    background: #f1f5f9;
    color: #1e293b;
  }
  .outlet-td.sel {
    color: #2563eb;
    background: #eff6ff;
  }
  .outlet-label {
    max-width: 120px;
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }
  .score-cell {
    text-align: center;
    padding: 5px 3px;
    border-right: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
    width: 60px;
    min-width: 60px;
    transition: outline 0.1s;
    position: relative;
  }
  .score-cell.clickable {
    cursor: pointer;
  }
  .score-cell.clickable:hover {
    outline: 1px solid #94a3b8;
    outline-offset: -1px;
  }
  .score-cell.col-hi {
    background: #f0f9ff !important;
  }
  .score-cell.row-hi {
    background: #f0f9ff !important;
  }
  .score-cell.selected {
    outline: 2px solid #3b82f6 !important;
    outline-offset: -2px;
    z-index: 1;
  }
  .score-val {
    font-size: 0.78rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .no-val {
    color: #cbd5e1;
    font-size: 0.72rem;
  }

  /* ── CONTEXT BAR ── */
  .context-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 0;
    margin-bottom: 8px;
    font-size: 0.76rem;
  }
  .ctx-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .ctx-label {
    color: #94a3b8;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ctx-hint {
    color: #94a3b8;
    font-style: italic;
    font-size: 0.74rem;
  }
  .ctx-chip {
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }
  .ctx-chip.outlet {
    background: #f5f3ff;
    color: #7c3aed;
    border-color: #ddd6fe;
  }
  .reset-btn {
    background: none;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    color: #94a3b8;
    font-size: 0.66rem;
    font-family: inherit;
    padding: 2px 9px;
    cursor: pointer;
    transition:
      border-color 0.12s,
      color 0.12s;
  }
  .reset-btn:hover {
    border-color: #ef4444;
    color: #ef4444;
  }
  .ctx-count {
    color: #94a3b8;
    font-size: 0.7rem;
    flex-shrink: 0;
  }

  /* ── THREATS LIST ── */
  .threats-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .threat-row {
    display: grid;
    grid-template-columns: 30px 1fr auto;
    align-items: start;
    gap: 10px;
    padding: 10px 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    transition:
      border-color 0.12s,
      box-shadow 0.12s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .threat-row:hover {
    border-color: #94a3b8;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  .sev-badge {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    margin-top: 1px;
  }
  .threat-body {
    min-width: 0;
  }
  .threat-title {
    font-size: 0.83rem;
    font-weight: 600;
    color: #1e293b;
    line-height: 1.4;
    margin-bottom: 3px;
  }
  .threat-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    font-size: 0.67rem;
  }
  .m-src {
    color: #94a3b8;
  }
  .m-sep {
    color: #cbd5e1;
  }
  .m-who {
    color: #2563eb;
    font-weight: 600;
  }
  .m-pat {
    color: #64748b;
  }
  .m-date-right {
    font-size: 0.66rem;
    color: #94a3b8;
    white-space: nowrap;
    padding-top: 3px;
    flex-shrink: 0;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 1100px) {
    .rw-body {
      grid-template-columns: 1fr;
    }
    .rw-sidebar {
      position: static;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
  }
  @media (max-width: 700px) {
    .rw-page {
      padding: 12px 14px 28px;
    }
    .rw-sidebar {
      grid-template-columns: 1fr;
    }
    .corner {
      width: 90px;
      min-width: 90px;
    }
    .outlet-label {
      max-width: 84px;
    }
    .rw-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
