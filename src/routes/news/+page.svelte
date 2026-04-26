<script>
  import { onMount } from "svelte";
  import Card from "$lib/Card.svelte";
  import FilterPanel from "$lib/FilterPanel.svelte";
  import { filterState, resetFilters } from "$lib/filterStore.js";
  import { regionMap } from "$lib/siteData.js";

  let items = [];
  let loading = true;
  let error = null;
  let sortByDate = false;

  async function fetchData() {
    try {
      const res = await fetch("/api/feed?tab=news");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = data.items;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  });

  $: filteredItems = applyFilters(items, $filterState, sortByDate);

  $: hasFilters =
    $filterState.source !== null ||
    $filterState.severities.length > 0 ||
    $filterState.types.length > 0 ||
    $filterState.sourceTypes.length > 0 ||
    $filterState.regions.length > 0;

  function applyFilters(items, f, byDate) {
    const filtered = items.filter((item) => {
      if (f.source && item.source !== f.source) return false;
      if (
        f.severities.length > 0 &&
        !f.severities.includes(item.severity_label)
      )
        return false;
      if (
        f.types.length > 0 &&
        !item.patterns?.some((p) => f.types.includes(p.name))
      )
        return false;
      if (f.sourceTypes.length > 0 && !f.sourceTypes.includes(item.source_type))
        return false;
      if (f.regions.length > 0 && !f.regions.includes(regionMap[item.source]))
        return false;
      return true;
    });
    if (byDate) {
      return filtered.sort(
        (a, b) => new Date(b.analyzed_at) - new Date(a.analyzed_at),
      );
    }
    return filtered.sort((a, b) => b.severity - a.severity);
  }
</script>

<FilterPanel {items} />

<div class="page-header">
  <h2>חדשות</h2>
  {#if items.length > 0}
    <span class="count">
      {#if hasFilters}
        מוצגים {filteredItems.length} מתוך {items.length}
      {:else}
        {items.length}
      {/if}
    </span>
  {/if}
  <button
    class="sort-btn"
    class:active={sortByDate}
    on:click={() => (sortByDate = !sortByDate)}>אחרונים</button
  >
</div>

{#if loading}
  <div class="empty">טוען...</div>
{:else if error}
  <div class="empty error">{error}</div>
{:else if items.length === 0}
  <div class="empty">אין כתבות. ה-pipeline עדיין לא הופעל.</div>
{:else if filteredItems.length === 0}
  <div class="empty">
    <span>אין כתבות עבור הסינון שנבחר</span>
    <button class="reset-btn" on:click={resetFilters}>איפוס מסננים</button>
  </div>
{:else}
  <div class="fluid-grid news-grid">
    {#each filteredItems as item (item.id)}
      <Card {item} />
    {/each}
  </div>
{/if}

<style>
  .page-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  h2 {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
  }
  .count {
    background: #e8eef8;
    color: var(--blue);
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 8px;
    border-radius: 8px;
    white-space: nowrap;
  }
  .fluid-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 16px;
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
    padding: 64px 16px;
    color: var(--text3);
    font-size: 0.95rem;
  }
  .empty.error {
    color: #f87171;
  }
  .reset-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--blue);
    font-size: 0.78rem;
    font-family: inherit;
    padding: 5px 14px;
    border-radius: 20px;
    cursor: pointer;
    transition: background 0.12s;
  }
  .reset-btn:hover {
    background: #e8eef8;
  }

  .sort-btn {
    margin-inline-start: auto;
    background: none;
    border: 1px solid var(--border);
    color: var(--text3);
    font-size: 0.72rem;
    font-weight: 600;
    font-family: inherit;
    padding: 3px 12px;
    border-radius: 20px;
    cursor: pointer;
    transition:
      background 0.12s,
      color 0.12s,
      border-color 0.12s;
  }
  .sort-btn:hover {
    color: var(--text2);
    border-color: var(--text3);
  }
  .sort-btn.active {
    background: #e8eef8;
    border-color: var(--blue);
    color: var(--blue);
  }

  .news-grid :global(.threat-card) {
    border-width: 3px;
    border-radius: 9px;
  }
</style>
