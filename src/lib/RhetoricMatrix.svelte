<script>
  /**
   * RhetoricMatrix — Phase 2
   * Weekly time-series, custom slider, leader/source focus modes,
   * escalation indicators. All Phase 1 features preserved.
   */

  import leadersRaw from "../data-sources/leaders.json";
  import sourcesRaw from "../data-sources/sources.json";

  // ── Constants ─────────────────────────────────────────────────────────────

  let WEEKS = $derived(weekLabels.length || 1);

  // Phase 1 color palette — preserved unchanged
  const PALETTE = {
    amplifier: [
      { bg: "rgba(245,158,11,0.06)", fg: "#92400e", dot: "#92400e" },
      { bg: "rgba(245,158,11,0.14)", fg: "#b45309", dot: "#b45309" },
      { bg: "rgba(245,158,11,0.26)", fg: "#92400e", dot: "#d97706" },
    ],
    reporter: [
      { bg: "rgba(37,99,235,0.05)", fg: "#1e40af", dot: "#1e40af" },
      { bg: "rgba(37,99,235,0.12)", fg: "#1d4ed8", dot: "#2563eb" },
      { bg: "rgba(37,99,235,0.22)", fg: "#1e40af", dot: "#2563eb" },
    ],
    neutral: [
      { bg: "transparent", fg: "#6b7280", dot: "#9ca3af" },
      { bg: "rgba(107,114,128,0.07)", fg: "#4b5563", dot: "#6b7280" },
      { bg: "rgba(107,114,128,0.14)", fg: "#374151", dot: "#4b5563" },
    ],
  };

  const BIAS_META = {
    center: { bg: "rgba(107,114,128,0.12)", fg: "#4b5563", label: "center" },
    "center-right": {
      bg: "rgba(245,158,11,0.14)",
      fg: "#92400e",
      label: "c-right",
    },
    right: { bg: "rgba(239,68,68,0.14)", fg: "#b91c1c", label: "right" },
    "center-left": {
      bg: "rgba(37,99,235,0.12)",
      fg: "#1d4ed8",
      label: "c-left",
    },
    left: { bg: "rgba(124,58,237,0.12)", fg: "#6d28d9", label: "left" },
  };

  const LANG_META = {
    en: { bg: "rgba(16,185,129,0.12)", fg: "#065f46", label: "EN" },
    he: { bg: "rgba(124,58,237,0.12)", fg: "#5b21b6", label: "HE" },
  };

  // ── State ──────────────────────────────────────────────────────────────────

  // Static data — never changes after load, plain const avoids Svelte 5 proxy issues
  // with string key lookups in weeklyScores inside $derived
  const leaders = leadersRaw;
  const SPEECHES_SOURCE = { id: 'speeches', name: 'Speeches', bias: null, language: null, region: null };
  const sources = [SPEECHES_SOURCE, ...sourcesRaw];
  const speeches = Object.fromEntries(
    leadersRaw.map((l) => [l.id, l.speeches ?? []]),
  );

  // Minimum n to display a score; below threshold → show "?"
  function getThreshold(srcId) {
    return srcId === 'speeches' ? 1 : 3;
  }
  let weeklyScores = $state({});
  let weekLabels = $state([]);
  let violations = $state({});
  let loading = $state(true);

  let selectedWeek = $state(0);
  let comparedLeaders = $state([]); // string[] max 2 — comparison mode
  let focusedSource = $state(null); // source.id | null — dim other rows
  let isDragging = $state(false);
  let anomalyDismissed = $state(false);
  let mountDate = $state("");
  let matrixEl = $state(null); // ref for scrollIntoView

  // ── API fetch ──────────────────────────────────────────────────────────────

  $effect(() => {
    fetch('/api/rhetoric-matrix')
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          console.error('rhetoric-matrix API error:', data.error);
          loading = false;
          return;
        }
        weeklyScores = data.matrix;
        weekLabels = data.weeks;
        violations = data.violations ?? {};
        selectedWeek = Math.max(0, data.weeks.length - 1);
        console.log('[RhetoricMatrix] loaded real data:', data.meta);
        loading = false;
      })
      .catch(err => {
        console.error('rhetoric-matrix fetch error:', err);
        loading = false;
      });
  });

  // ── Init log ───────────────────────────────────────────────────────────────

  $effect(() => {
    mountDate = new Date().toLocaleDateString();
    const speechTotal = Object.values(speeches).reduce((n, s) => n + s.length, 0);
    console.log(
      `[RhetoricMatrix] Loaded ${leaders.length} leaders, ${sources.length} sources. Speeches: ${speechTotal}.`,
    );
  });

  // Log when comparison mode is entered (both slots filled)
  $effect(() => {
    if (comparedLeaders.length === 2) {
      const [a, b] = comparedLeaders.map(
        (id) => leaders.find((l) => l.id === id)?.name ?? id,
      );
      console.log(`Comparison: ${a} vs ${b}, week ${selectedWeek + 1}`);
    }
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  // Flat scores for the currently selected week
  let currentScores = $derived.by(() => {
    if (!sources.length) return {};
    return Object.fromEntries(
      sources.map((s) => [
        s.id,
        Object.fromEntries(
          leaders.map((l) => {
            const cell = weeklyScores[s.id]?.[l.id]?.[selectedWeek];
            return [
              l.id,
              cell
                ? { score: cell.score, role: cell.role, n: cell.n ?? 0 }
                : { score: 0, role: "neutral", n: 0 },
            ];
          }),
        ),
      ]),
    );
  });

  // Column averages for selected week
  let colAverages = $derived.by(() => {
    if (!leaders.length || !sources.length) return {};
    return Object.fromEntries(
      leaders.map((l) => {
        const vals = sources.map(
          (s) => currentScores[s.id]?.[l.id]?.score ?? 0,
        );
        return [
          l.id,
          +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
        ];
      }),
    );
  });

  // Week 0 baselines for escalation delta
  let baseAverages = $derived.by(() => {
    if (!leaders.length) return {};
    return Object.fromEntries(
      leaders.map((l) => {
        const vals = sources.map(
          (s) => weeklyScores[s.id]?.[l.id]?.[0]?.score ?? 0,
        );
        return [
          l.id,
          +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
        ];
      }),
    );
  });

  let overallAvg = $derived.by(() => {
    if (!leaders.length || !Object.keys(colAverages).length) return 0;
    return +(
      leaders.reduce((s, l) => s + (colAverages[l.id] ?? 0), 0) / leaders.length
    ).toFixed(1);
  });

  // Slider handle position (0–100%)
  let sliderPct = $derived(WEEKS <= 1 ? 0 : (selectedWeek / (WEEKS - 1)) * 100);

  let inComparisonMode = $derived(comparedLeaders.length === 2);

  // Auto-detect anomaly: highest amplifier score in week 7 with delta > 0.8 vs week 0.
  // Fallback (no cell clears delta threshold): use highest amplifier score regardless.
  // Pure derived logic — no hardcoded source/leader pair.
  let anomaly = $derived.by(() => {
    if (!sources.length) return null;
    let best = null; // meets delta threshold
    let bestFallback = null; // any amplifier, for fallback
    for (const src of sources) {
      for (const ldr of leaders) {
        const w7 = weeklyScores[src.id]?.[ldr.id]?.[WEEKS - 1];
        const w0 = weeklyScores[src.id]?.[ldr.id]?.[0];
        if (!w7 || !w0 || w7.role !== "amplifier") continue;
        const delta = +(w7.score - w0.score).toFixed(1);
        const candidate = {
          srcId: src.id,
          ldrId: ldr.id,
          srcName: src.name,
          ldrName: ldr.name,
          score: w7.score,
          delta,
        };
        if (!bestFallback || w7.score > bestFallback.score)
          bestFallback = candidate;
        if (delta > 0.8 && (!best || w7.score > best.score)) best = candidate;
      }
    }
    return best ?? bestFallback; // relax threshold if nothing qualifies
  });

  // ── Week-change log ────────────────────────────────────────────────────────

  $effect(() => {
    const w = selectedWeek; // tracked — effect reruns on week change
    const avg = overallAvg; // tracked
    if (!leaders.length) return;
    console.log(`Week selected: ${w + 1}, avg severity: ${avg}`);
  });

  // ── Slider event handlers (pointer capture — handles mouse + touch) ────────

  function weekFromPointer(el, clientX) {
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * (WEEKS - 1));
  }

  function startDrag(e) {
    isDragging = true;
    selectedWeek = weekFromPointer(e.currentTarget, e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onDrag(e) {
    if (!isDragging) return;
    selectedWeek = weekFromPointer(e.currentTarget, e.clientX);
  }
  function endDrag() {
    isDragging = false;
  }

  // ── Interaction handlers ───────────────────────────────────────────────────

  // Comparison click logic (max 2 leaders):
  // 0 → [id]  |  1+same → []  |  1+diff → [first, id]
  // 2+one of two → remove it  |  2+third → [second, id]  (replace oldest)
  function clickLeader(id) {
    const prev = comparedLeaders;
    if (prev.length === 0) {
      comparedLeaders = [id];
    } else if (prev.length === 1) {
      comparedLeaders = prev[0] === id ? [] : [prev[0], id];
    } else {
      comparedLeaders = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [prev[1], id];
    }
  }

  function toggleSource(id) {
    focusedSource = focusedSource === id ? null : id;
  }

  // "Explore →" in anomaly card: jump to week 7, focus the anomalous pair
  function exploreAnomaly() {
    if (!anomaly) return;
    selectedWeek = WEEKS - 1;
    comparedLeaders = [anomaly.ldrId];
    focusedSource = anomaly.srcId;
    matrixEl?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Helper functions ───────────────────────────────────────────────────────

  function pal(score, role) {
    const tier = score >= 7 ? 2 : score >= 4 ? 1 : 0;
    return (PALETTE[role] ?? PALETTE.neutral)[tier];
  }

  // Source row background in single-leader mode (not comparison)
  function srcFocusBg(srcId) {
    if (comparedLeaders.length !== 1 || !Object.keys(currentScores).length)
      return null;
    const role = currentScores[srcId]?.[comparedLeaders[0]]?.role;
    if (role === "amplifier") return "rgba(245,158,11,0.15)";
    if (role === "reporter") return "rgba(59,130,246,0.14)";
    return null;
  }

  // Score cell opacity when a source row is focused
  function cellOpacity(srcId) {
    return !focusedSource || focusedSource === srcId ? 1 : 0.18;
  }

  // Dot color for comparison mode per slot (0=A/indigo, 1=B/pink)
  function cmpDotColor(role, slot) {
    if (slot === 0) {
      if (role === "amplifier") return "#6366f1";
      if (role === "reporter") return "#3b82f6";
      return "transparent";
    }
    if (role === "amplifier") return "#ec4899";
    if (role === "reporter") return "#8b5cf6";
    return "transparent";
  }

  // Escalation: current avg vs week-0 baseline
  function getEscalation(ldrId) {
    const curr = colAverages[ldrId] ?? 0;
    const base = baseAverages[ldrId] ?? 0;
    const delta = +(curr - base).toFixed(1);
    const arrow = delta > 0.3 ? "↑" : delta < -0.3 ? "↓" : "→";
    const color =
      Math.abs(delta) > 1.5
        ? "#dc2626"
        : Math.abs(delta) > 0.5
          ? "#d97706"
          : "#6b7280";
    return { arrow, delta, color };
  }

  function shortName(name) {
    const p = name.trim().split(/\s+/);
    return p.length > 1 ? p.slice(-1)[0] : p[0];
  }
</script>

<div class="rm-page">
  <!-- ══ PAGE HEADER ══ -->
  <div class="rm-header">
    <div>
      <div class="rm-eyebrow">Rhetoric Audit Matrix</div>
      <div class="rm-title">Israel — Media Coverage × Political Leaders</div>
      <div class="rm-sub">
        Phase 3 · Weekly time series · {sourcesRaw.length} sources + speeches · {leaders.length} leaders
      </div>
    </div>
    <div class="rm-legend">
      <span class="leg-label">Role</span>
      <span class="leg-item"
        ><span class="leg-dot" style="background:#f59e0b"></span>amplifier</span
      >
      <span class="leg-item"
        ><span class="leg-dot" style="background:#3b82f6"></span>reporter</span
      >
      <span class="leg-item"
        ><span class="leg-dot" style="background:#4b5563"></span>neutral</span
      >
      <span class="leg-sep">|</span>
      <span class="leg-muted">0–3 light · 4–6 medium · 7–10 bold</span>
    </div>
  </div>

  <!-- ══ ANOMALY CARD ══ -->
  {#if anomaly && !anomalyDismissed}
    <div class="anomaly-card">
      <div class="an-hdr">
        <span class="an-icon">⚡</span>
        <span class="an-label">Anomaly of the Week</span>
        <button
          class="an-close"
          onclick={() => (anomalyDismissed = true)}
          aria-label="Dismiss">×</button
        >
      </div>
      <div class="an-body">
        <div class="an-headline">
          <span class="an-src">{anomaly.srcName}</span>
          <span class="an-verb"> amplifies </span>
          <span class="an-ldr">{anomaly.ldrName}</span>
          <span class="an-verb"> more than any other media outlet</span>
        </div>
        <div class="an-stats">
          <span class="an-score">{anomaly.score.toFixed(1)}</span>
          <span class="an-delta">↑ +{anomaly.delta} since week 1</span>
          <span class="an-role">· amplifier</span>
        </div>
      </div>
      <div class="an-foot">
        <button class="an-explore" onclick={exploreAnomaly}>Explore →</button>
      </div>
    </div>
  {/if}

  <!-- ══ MATRIX ══ -->
  {#if loading}
    <div class="loading-overlay">Loading real data…</div>
  {:else if Object.keys(weeklyScores).length === 0}
    <div class="empty-state">No data yet — run the crawler pipeline first</div>
  {/if}
  <div class="matrix-wrap" bind:this={matrixEl}>
    <table class="rm-table">
      <colgroup>
        <col class="col-src" />
        {#each leaders as _}<col class="col-ldr" />{/each}
      </colgroup>

      <!-- Header row: leader columns -->
      <thead>
        <tr>
          <th class="corner-th">Source \ Leader</th>
          {#each leaders as l}
            {@const cmpIdx = comparedLeaders.indexOf(l.id)}
            {@const cmpColor =
              cmpIdx === 0 ? "#6366f1" : cmpIdx === 1 ? "#ec4899" : null}
            {@const cmpBg =
              cmpIdx === 0
                ? "rgba(99,102,241,0.08)"
                : cmpIdx === 1
                  ? "rgba(236,72,153,0.08)"
                  : ""}
            <th
              class="ldr-th"
              class:ldr-active={cmpIdx >= 0}
              class:ldr-dim={comparedLeaders.length > 0 && cmpIdx < 0}
              style={cmpColor
                ? `border-top-color:${cmpColor};border-bottom-color:${cmpColor};background:${cmpBg}`
                : ""}
              onclick={() => clickLeader(l.id)}
              title={l.name}
            >
              <span class="ldr-name" style={cmpColor ? `color:${cmpColor}` : ""}
                >{shortName(l.name)}</span
              >
              <span class="ldr-role">{l.role}</span>
              {#if (violations[l.id] ?? 0) > 0}
                <span class="ldr-badge ldr-badge-violation">{violations[l.id]} violations</span>
              {:else}
                <span class="ldr-badge ldr-badge-clean">no violations</span>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>

      <!-- Body rows: one per source -->
      <tbody>
        {#each sources as src}
          {@const rowBg = srcFocusBg(src.id)}
          {@const isSpeechRow = src.id === 'speeches'}
          <tr class:speeches-row={isSpeechRow}>
            <!-- Source label — click to focus row -->
            <td
              class="src-td"
              class:src-sel={focusedSource === src.id}
              class:src-td-speeches={isSpeechRow}
              style={rowBg ? `background:${rowBg}` : ""}
              onclick={() => toggleSource(src.id)}
            >
              <div class="src-top">
                <span class="src-name">{src.name}</span>
                {#if inComparisonMode}
                  {@const roleA =
                    currentScores[src.id]?.[comparedLeaders[0]]?.role ??
                    "neutral"}
                  {@const roleB =
                    currentScores[src.id]?.[comparedLeaders[1]]?.role ??
                    "neutral"}
                  <span class="cmp-dots">
                    <span
                      class="cmp-dot"
                      style="background:{cmpDotColor(roleA, 0)}"
                    ></span>
                    <span
                      class="cmp-dot"
                      style="background:{cmpDotColor(roleB, 1)}"
                    ></span>
                  </span>
                {/if}
              </div>
              {#if inComparisonMode}
                {@const sA =
                  currentScores[src.id]?.[comparedLeaders[0]]?.score ?? 0}
                {@const sB =
                  currentScores[src.id]?.[comparedLeaders[1]]?.score ?? 0}
                <div class="cmp-bars">
                  <div
                    class="cmp-bar bar-a"
                    style="height:{Math.max(2, Math.round((sA / 10) * 20))}px"
                    title={sA.toFixed(1)}
                  ></div>
                  <div
                    class="cmp-bar bar-b"
                    style="height:{Math.max(2, Math.round((sB / 10) * 20))}px"
                    title={sB.toFixed(1)}
                  ></div>
                </div>
              {/if}
              <div class="src-tags">
                {#if BIAS_META[src.bias]}
                  <span
                    class="tag"
                    style="background:{BIAS_META[src.bias].bg};color:{BIAS_META[
                      src.bias
                    ].fg}"
                  >
                    {BIAS_META[src.bias].label}
                  </span>
                {/if}
                {#if LANG_META[src.language]}
                  <span
                    class="tag"
                    style="background:{LANG_META[src.language]
                      .bg};color:{LANG_META[src.language].fg}"
                  >
                    {LANG_META[src.language].label}
                  </span>
                {/if}
                {#if src.region}
                  <span class="tag tag-region">{src.region}</span>
                {/if}
              </div>
            </td>

            <!-- Score cells -->
            {#each leaders as l}
              {@const cell = currentScores[src.id]?.[l.id] ?? { score: 0, role: "neutral", n: 0 }}
              {@const p = pal(cell.score, cell.role)}
              {@const ci = comparedLeaders.indexOf(l.id)}
              {@const outline =
                ci === 0
                  ? "1px solid rgba(99,102,241,0.5)"
                  : ci === 1
                    ? "1px solid rgba(236,72,153,0.5)"
                    : "none"}
              {@const insufficient = cell.score >= 1.0 && cell.n < getThreshold(src.id)}
              <td
                class="score-td"
                style="background:{p.bg}; opacity:{cellOpacity(src.id)}; outline:{outline}; outline-offset:-1px"
              >
                {#if cell.score < 1.0}
                  <span class="score-num" style="color:{p.fg}">—</span>
                {:else if insufficient}
                  <span class="score-num score-insufficient" title="Недостаточно данных (n={cell.n})">?</span>
                {:else}
                  <span
                    class="score-num"
                    style="font-weight:{cell.score >= 7 ? 800 : 500}; color:{p.fg}"
                    title="n={cell.n}"
                  >{cell.score.toFixed(1)}</span>
                {/if}
                <span class="role-dot" style="background:{insufficient ? 'transparent' : p.dot}"></span>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>

      <!-- Footer: column averages + escalation indicators -->
      <tfoot>
        <tr>
          <td class="foot-lbl">
            {#if inComparisonMode && comparedLeaders.length === 2}
              {@const nameA =
                leaders.find((l) => l.id === comparedLeaders[0])?.name ?? ""}
              {@const nameB =
                leaders.find((l) => l.id === comparedLeaders[1])?.name ?? ""}
              {@const avgA = colAverages[comparedLeaders[0]] ?? 0}
              {@const avgB = colAverages[comparedLeaders[1]] ?? 0}
              {@const delta = +(avgA - avgB).toFixed(1)}
              {@const deltaColor = Math.abs(delta) > 1 ? "#dc2626" : "#16a34a"}
              <span class="foot-cmp" style="color:#6366f1"
                >{shortName(nameA)} {avgA.toFixed(1)}</span
              >
              <span class="foot-cmp-sep">vs</span>
              <span class="foot-cmp" style="color:#ec4899"
                >{shortName(nameB)} {avgB.toFixed(1)}</span
              >
              <span class="foot-cmp-delta" style="color:{deltaColor}"
                >{delta > 0 ? "+" : ""}{delta}</span
              >
            {:else}
              <span>Avg</span>
              <span class="foot-vs">vs Week 1</span>
            {/if}
          </td>
          {#each leaders as l}
            {@const avg = colAverages[l.id] ?? 0}
            {@const esc = getEscalation(l.id)}
            {@const ci = comparedLeaders.indexOf(l.id)}
            {@const cmpClr = ci === 0 ? "#6366f1" : ci === 1 ? "#ec4899" : null}
            <td class="foot-cell">
              <span class="foot-score" style={cmpClr ? `color:${cmpClr}` : ""}
                >{avg.toFixed(1)}</span
              >
              <span class="foot-esc" style="color:{esc.color}">
                {esc.arrow}{esc.delta > 0 ? "+" : ""}{esc.delta}
              </span>
            </td>
          {/each}
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- ══ TIME SLIDER ══ -->
  <div class="slider-section">
    <div class="slider-hdr">
      <span class="sl-eyebrow">Timeline</span>
      <span class="sl-current">Week of {weekLabels[selectedWeek] ?? '—'}</span>
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="slider-wrap"
      role="slider"
      tabindex="0"
      aria-valuemin="0"
      aria-valuemax={WEEKS - 1}
      aria-valuenow={selectedWeek}
      onpointerdown={startDrag}
      onpointermove={onDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
    >
      <!-- Track + fill + handle -->
      <div class="sl-track">
        <div class="sl-fill" style="width:{sliderPct}%"></div>
        <div
          class="sl-handle"
          class:dragging={isDragging}
          style="left:calc({sliderPct}% - 7px)"
        ></div>
      </div>

      <!-- Tick marks + labels -->
      <div class="sl-ticks">
        {#each weekLabels as lbl, i}
          <div class="sl-tick" class:active={i === selectedWeek}>
            <div class="sl-bar"></div>
            <div class="sl-lbl">{lbl}</div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Footer note -->
  <div class="rm-note">Last fetched: {mountDate}</div>
</div>

<style>
  /* ── Page ── */
  .rm-page {
    background: var(--bg, #f4f6fb);
    color: var(--text, #1a1f2e);
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 28px 32px 56px;
  }

  /* ── Header ── */
  .rm-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 22px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border, #d4d9e8);
  }
  .rm-eyebrow {
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text3, #7a8faa);
    margin-bottom: 4px;
  }
  .rm-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text, #1a1f2e);
    margin-bottom: 2px;
  }
  .rm-sub {
    font-size: 0.7rem;
    color: var(--text3, #7a8faa);
  }

  .rm-legend {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.64rem;
    color: var(--text3, #7a8faa);
  }
  .leg-label {
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 0.58rem;
  }
  .leg-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .leg-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .leg-sep {
    color: var(--border, #d4d9e8);
  }
  .leg-muted {
    color: var(--text3, #7a8faa);
    font-size: 0.58rem;
  }

  /* ── Slider ── */
  .slider-section {
    margin-bottom: 18px;
    background: var(--bg2, #ffffff);
    border: 1px solid var(--border, #d4d9e8);
    padding: 14px 18px 14px;
  }
  .slider-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .sl-eyebrow {
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text3, #7a8faa);
  }
  .sl-current {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text, #1a1f2e);
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  /* Drag area — pointer capture handles mouse + touch */
  .slider-wrap {
    position: relative;
    cursor: pointer;
    user-select: none;
    touch-action: none; /* prevents scroll interference on mobile */
  }

  /* Track */
  .sl-track {
    position: relative;
    height: 1px;
    background: var(--border, #d4d9e8);
    margin-bottom: 8px;
  }
  .sl-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: var(--text3, #7a8faa);
    pointer-events: none;
  }
  /* Square handle — no border-radius, sharp aesthetic */
  .sl-handle {
    position: absolute;
    top: -7px;
    width: 14px;
    height: 14px;
    background: var(--text2, #3d4f6e);
    pointer-events: none;
    z-index: 2;
    transition: background 0.1s;
  }
  .sl-handle.dragging {
    background: var(--text, #1a1f2e);
  }

  /* Ticks */
  .sl-ticks {
    display: flex;
    justify-content: space-between;
    pointer-events: none;
  }
  .sl-tick {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .sl-bar {
    width: 1px;
    height: 5px;
    background: var(--border, #d4d9e8);
  }
  .sl-tick.active .sl-bar {
    height: 8px;
    background: var(--text2, #3d4f6e);
  }
  .sl-lbl {
    font-size: 0.5rem;
    color: var(--text3, #7a8faa);
    letter-spacing: 0.02em;
    white-space: nowrap;
  }
  .sl-tick.active .sl-lbl {
    color: var(--text, #1a1f2e);
    font-weight: 700;
  }

  /* ── Matrix ── */
  .matrix-wrap {
    overflow-x: auto;
    border: 1px solid var(--border, #d4d9e8);
  }
  .rm-table {
    border-collapse: collapse;
    table-layout: fixed;
    font-family: inherit;
  }
  .col-src {
    width: 168px;
    min-width: 168px;
  }
  .col-ldr {
    width: 90px;
    min-width: 90px;
  }

  /* Corner */
  .corner-th {
    padding: 12px 14px;
    background: var(--bg3, #eaecf3);
    border-bottom: 2px solid var(--border, #d4d9e8);
    border-right: 1px solid var(--border, #d4d9e8);
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text3, #7a8faa);
    text-align: left;
    vertical-align: bottom;
  }

  /* Leader column headers — clickable, highlight mode */
  .ldr-th {
    padding: 10px 6px;
    background: var(--bg3, #eaecf3);
    border-bottom: 2px solid var(--border, #d4d9e8);
    border-right: 1px solid var(--border2, #dde1ea);
    border-top: 3px solid transparent; /* placeholder for focus border */
    text-align: center;
    vertical-align: bottom;
    cursor: pointer;
    transition: background 0.12s;
    user-select: none;
  }
  .ldr-th:hover {
    background: var(--border, #d4d9e8);
  }
  .ldr-th.ldr-dim {
    opacity: 0.45;
  }
  .ldr-name {
    display: block;
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--text, #1a1f2e);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ldr-role {
    display: block;
    font-size: 0.54rem;
    color: var(--text3, #7a8faa);
    line-height: 1.3;
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ldr-badge {
    display: inline-block;
    font-size: 0.54rem;
    font-weight: 700;
    padding: 1px 5px;
    letter-spacing: 0.03em;
    /* no border-radius */
  }
  .ldr-badge-violation {
    background: rgba(220, 38, 38, 0.1);
    color: #b91c1c;
  }
  .ldr-badge-clean {
    background: rgba(107, 114, 128, 0.1);
    color: var(--text3, #7a8faa);
  }

  /* Source label cells */
  .src-td {
    padding: 8px 12px;
    background: var(--bg2, #ffffff);
    border-bottom: 1px solid var(--border2, #dde1ea);
    border-right: 1px solid var(--border, #d4d9e8);
    vertical-align: middle;
    cursor: pointer;
    transition: background 0.12s;
    user-select: none;
  }
  .src-td:hover {
    background: var(--bg3, #eaecf3);
  }
  .src-td.src-sel {
    outline: 1px solid #2563eb;
    outline-offset: -1px;
  }
  .src-name {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text, #1a1f2e);
    margin-bottom: 5px;
  }
  .src-tags {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
  }
  .tag {
    font-size: 0.54rem;
    font-weight: 800;
    padding: 1px 5px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    /* no border-radius — sharp editorial aesthetic */
  }
  .tag-region {
    background: rgba(107, 114, 128, 0.12);
    color: var(--text2, #3d4f6e);
  }

  /* Score cells */
  .score-td {
    text-align: center;
    vertical-align: middle;
    padding: 8px 4px;
    border-bottom: 1px solid var(--border2, #dde1ea);
    border-right: 1px solid var(--border2, #dde1ea);
    transition: opacity 0.15s;
  }
  /* col-hi removed — outline now applied inline per comparison slot */
  .score-num {
    display: block;
    font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace;
    font-size: 0.9rem;
    line-height: 1;
    margin-bottom: 3px;
  }
  .role-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  /* Footer */
  .foot-lbl {
    padding: 8px 12px;
    background: var(--bg3, #eaecf3);
    border-top: 2px solid var(--border, #d4d9e8);
    border-right: 1px solid var(--border, #d4d9e8);
    vertical-align: middle;
  }
  .foot-lbl span {
    display: block;
  }
  .foot-lbl span:first-child {
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text3, #7a8faa);
  }
  .foot-vs {
    font-size: 0.52rem;
    color: var(--border, #d4d9e8);
    letter-spacing: 0.04em;
  }
  .foot-cell {
    text-align: center;
    padding: 7px 4px;
    background: var(--bg3, #eaecf3);
    border-top: 2px solid var(--border, #d4d9e8);
    border-right: 1px solid var(--border2, #dde1ea);
  }
  .foot-score {
    display: block;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text2, #3d4f6e);
    line-height: 1;
    margin-bottom: 2px;
  }
  .foot-esc {
    font-size: 0.6rem;
    font-weight: 800;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    letter-spacing: 0.02em;
  }

  /* Footer note */
  .rm-note {
    margin-top: 10px;
    font-size: 0.56rem;
    color: var(--border, #d4d9e8);
    font-family: "JetBrains Mono", "Fira Code", monospace;
    letter-spacing: 0.05em;
  }

  /* ── Anomaly card ── */
  .anomaly-card {
    margin-bottom: 16px;
    background: rgba(251, 191, 36, 0.08);
    border: 1px solid #d97706;
    padding: 14px 16px;
  }
  .an-hdr {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .an-icon {
    font-size: 0.9rem;
  }
  .an-label {
    flex: 1;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #b45309;
  }
  .an-close {
    background: none;
    border: none;
    color: #92400e;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    font-weight: 800;
    padding: 0;
    transition: color 0.1s;
  }
  .an-close:hover {
    color: #b45309;
  }
  .an-body {
    margin-bottom: 12px;
  }
  .an-headline {
    font-size: 0.86rem;
    line-height: 1.45;
    margin-bottom: 8px;
    color: var(--text, #1a1f2e);
  }
  .an-src {
    font-weight: 700;
    color: #b45309;
  }
  .an-verb {
    color: #92400e;
  }
  .an-ldr {
    font-weight: 700;
    color: #92400e;
  }
  .an-stats {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .an-score {
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 1.5rem;
    font-weight: 800;
    color: #b45309;
    line-height: 1;
  }
  .an-delta {
    font-size: 0.72rem;
    font-weight: 700;
    color: #d97706;
  }
  .an-role {
    font-size: 0.64rem;
    color: #92400e;
  }
  .an-foot {
    border-top: 1px solid rgba(180, 83, 9, 0.25);
    padding-top: 10px;
  }
  .an-explore {
    background: none;
    border: 1px solid #d97706;
    color: #b45309;
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    padding: 4px 12px;
    cursor: pointer;
    transition:
      background 0.12s,
      color 0.12s;
  }
  .an-explore:hover {
    background: rgba(217, 119, 6, 0.1);
    color: #92400e;
  }

  /* ── Comparison: source row elements ── */
  .src-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 5px;
  }
  .src-top .src-name {
    margin-bottom: 0;
  }
  .cmp-dots {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-shrink: 0;
  }
  .cmp-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }
  .cmp-bars {
    display: flex;
    gap: 3px;
    align-items: flex-end;
    height: 20px;
    margin-bottom: 5px;
  }
  .cmp-bar {
    width: 16px;
    min-height: 2px;
  } /* no border-radius */
  .bar-a {
    background: #6366f1;
  }
  .bar-b {
    background: #ec4899;
  }

  /* ── Comparison footer ── */
  .foot-cmp {
    display: block;
    font-size: 0.62rem;
    font-weight: 800;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    line-height: 1.4;
  }
  .foot-cmp-sep {
    display: block;
    font-size: 0.52rem;
    color: var(--text3, #7a8faa);
  }
  .foot-cmp-delta {
    display: block;
    font-size: 0.65rem;
    font-weight: 800;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    margin-top: 2px;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .rm-page {
      padding: 16px 16px 40px;
    }
    .rm-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .rm-legend {
      flex-wrap: wrap;
    }
  }

  .loading-overlay,
  .empty-state {
    padding: 24px 0;
    font-size: 0.76rem;
    color: var(--text3, #7a8faa);
    font-family: "JetBrains Mono", "Fira Code", monospace;
    letter-spacing: 0.04em;
  }

  /* ── Speeches virtual row ── */
  .src-td-speeches {
    background: rgba(124, 58, 237, 0.07);
  }
  .src-td-speeches:hover {
    background: rgba(124, 58, 237, 0.13);
  }
  .src-td.src-sel.src-td-speeches {
    outline-color: #7c3aed;
  }
  /* Separator line below speeches row */
  .speeches-row td {
    border-bottom: 2px solid var(--border, #d4d9e8);
  }

  /* ── Insufficient data indicator ── */
  .score-insufficient {
    color: var(--text3, #7a8faa);
    cursor: help;
  }
</style>
