<script>
  import { filterState } from "./filterStore.js";
  import { siteMap, regionMap } from "./siteData.js";

  export let items = [];

  const SEV_LABELS = {
    mild: "MILD",
    moderate: "MODERATE",
    high: "HIGH",
    critical: "CRITICAL",
  };

  const SEV_ORDER = ["mild", "moderate", "high", "critical"];

  const REGION_ORDER = ["USA", "Europe", "Russia", "Asia", "Middle East"];

  $: sourceStats = computeSourceStats(items);
  $: availableSeverities = computeAvailableSeverities(items);
  $: availableRegions = computeAvailableRegions(items);

  function computeSourceStats(items) {
    const map = {};
    for (const item of items) {
      if (item.source_type !== "article") continue;
      const src = item.source;
      if (!map[src]) map[src] = { id: src, count: 0, totalSev: 0 };
      map[src].count++;
      map[src].totalSev += item.severity;
    }
    return Object.values(map)
      .map((s) => ({ ...s, avgSev: s.totalSev / s.count }))
      .sort((a, b) => b.avgSev - a.avgSev || b.count - a.count);
  }

  function computeAvailableSeverities(items) {
    const set = new Set(items.map((i) => i.severity_label).filter(Boolean));
    return SEV_ORDER.filter((s) => set.has(s));
  }

  function computeAvailableRegions(items) {
    const set = new Set();
    for (const item of items) {
      if (item.source_type !== "article") continue;
      const region = regionMap[item.source];
      if (region) set.add(region);
    }
    return REGION_ORDER.filter((r) => set.has(r));
  }

  function heatmapColor(avgSev) {
    if (avgSev >= 4) return "#E5383B";
    if (avgSev >= 3) return "#E8621A";
    if (avgSev >= 2) return "#F5A623";
    return "#6B7280";
  }

  function sourceName(id) {
    return siteMap[id] || id;
  }

  function toggleSource(id) {
    filterState.update((s) => ({ ...s, source: s.source === id ? null : id }));
  }

  function toggleSeverity(label) {
    filterState.update((s) => {
      const severities = s.severities.includes(label)
        ? s.severities.filter((x) => x !== label)
        : [...s.severities, label];
      return { ...s, severities };
    });
  }

  function toggleRegion(region) {
    filterState.update((s) => {
      const regions = s.regions.includes(region)
        ? s.regions.filter((x) => x !== region)
        : [...s.regions, region];
      return { ...s, regions };
    });
  }
</script>

{#if sourceStats.length > 0}
  <div class="heatmap-bar">
    <button
      class="pill src-pill"
      class:active={$filterState.source === null}
      on:click={() => filterState.update((s) => ({ ...s, source: null }))}
      >כל המקורות</button
    >
    {#each sourceStats as s}
      {@const color = heatmapColor(s.avgSev)}
      <button
        class="pill src-pill"
        class:active={$filterState.source === s.id}
        style="--src-color: {color}"
        on:click={() => toggleSource(s.id)}
      >
        <span class="src-dot" style="background:{color}"></span>
        {sourceName(s.id)}
        <span class="src-count">{s.count}</span>
      </button>
    {/each}
  </div>
{/if}

<div class="filter-bar">
  <div class="filter-group">
    <span class="group-label">חומרה:</span>
    <button
      class="pill f-pill"
      class:active={$filterState.severities.length === 0}
      on:click={() => filterState.update((s) => ({ ...s, severities: [] }))}
      >הכל</button
    >
    {#each availableSeverities as sev}
      <button
        class="pill f-pill sev-{sev}"
        class:active={$filterState.severities.includes(sev)}
        on:click={() => toggleSeverity(sev)}>{SEV_LABELS[sev]}</button
      >
    {/each}
  </div>

  {#if availableRegions.length > 0}
    <div class="filter-sep"></div>
    <div class="filter-group">
      <span class="group-label">אזור:</span>
      <button
        class="pill f-pill"
        class:active={$filterState.regions.length === 0}
        on:click={() => filterState.update((s) => ({ ...s, regions: [] }))}
        >הכל</button
      >
      {#each availableRegions as region}
        <button
          class="pill f-pill"
          class:active={$filterState.regions.includes(region)}
          on:click={() => toggleRegion(region)}>{region}</button
        >
      {/each}
    </div>
  {/if}
</div>

<style>
  .heatmap-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 10px;
  }

  .filter-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .group-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-right: 2px;
  }

  .filter-sep {
    width: 1px;
    height: 18px;
    background: var(--border);
    flex-shrink: 0;
    margin: 0 6px;
    align-self: center;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text2);
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      border-color 0.12s,
      color 0.12s,
      background 0.12s;
    white-space: nowrap;
    font-family: inherit;
    line-height: 1.4;
  }

  .pill:hover {
    border-color: var(--text3);
    color: var(--text);
  }

  .src-pill.active {
    border-color: var(--text);
    color: var(--text);
  }

  .src-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .src-count {
    background: rgba(0, 0, 0, 0.07);
    border-radius: 6px;
    padding: 0 5px;
    font-size: 0.62rem;
  }

  .f-pill.active {
    background: #e8eef8;
    border-color: var(--blue);
    color: var(--blue);
  }

  .f-pill.sev-mild.active {
    background: #eff1ff;
    border-color: #4f46e5;
    color: #4f46e5;
  }
  .f-pill.sev-moderate.active {
    background: #fffbeb;
    border-color: #d97706;
    color: #d97706;
  }
  .f-pill.sev-high.active {
    background: #fff7ed;
    border-color: #ea580c;
    color: #ea580c;
  }
  .f-pill.sev-critical.active {
    background: #fff1f2;
    border-color: #dc2626;
    color: #dc2626;
  }
</style>
