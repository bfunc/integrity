<script>
  import { onMount } from 'svelte';
  import Card from '$lib/Card.svelte';

  let items = [];
  let loading = true;
  let error = null;

  async function fetchData() {
    try {
      const res = await fetch('/api/feed?tab=threats');
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
</script>

<div class="page-header">
  <h2>Угрозы</h2>
  {#if items.length > 0}
    <span class="count">{items.length}</span>
  {/if}
</div>

{#if loading}
  <div class="empty">Загрузка...</div>
{:else if error}
  <div class="empty error">{error}</div>
{:else if items.length === 0}
  <div class="empty">Угрозы не найдены. Pipeline ещё не запускался.</div>
{:else}
  <div class="fluid-grid">
    {#each items as item (item.id)}
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
    background: #1e2d4a;
    color: var(--blue);
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 8px;
  }
  .fluid-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 12px;
    align-items: start;
  }
  .empty {
    text-align: center;
    padding: 64px 16px;
    color: var(--text3);
    font-size: 0.95rem;
  }
  .empty.error { color: #f87171; }
</style>
