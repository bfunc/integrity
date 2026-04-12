<script>
  import { onMount } from 'svelte';

  let sites = [];
  let leaders = [];
  let loading = true;
  let error = null;

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  async function fetchData() {
    try {
      const res = await fetch('/api/sources');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      sites = data.sites;
      leaders = data.leaders;
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
  <h2>Источники</h2>
</div>

{#if loading}
  <div class="empty">Загрузка...</div>
{:else if error}
  <div class="empty error">{error}</div>
{:else}
  <section>
    <div class="section-label">RSS Sites</div>
    <div class="sites-grid">
      {#each sites as site (site.id)}
        <div class="site-card">
          <div class="site-name">{site.name}</div>
          <a class="site-url" href={site.url} target="_blank" rel="noopener">{site.url}</a>
          <div class="site-meta">
            <span>{site.article_count} статей</span>
            <span>·</span>
            <span>{formatDate(site.last_crawled)}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  {#if leaders.length > 0}
    <section>
      <div class="section-label">Лидеры</div>
      <div class="sites-grid">
        {#each leaders as leader (leader.id)}
          <div class="site-card">
            <div class="site-name">{leader.name}</div>
            <div class="site-meta">
              <span>{leader.role}</span>
              <span>·</span>
              <span>{leader.country}</span>
              <span>·</span>
              <span>{leader.speeches.length} речей</span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
{/if}

<style>
  .page-header { margin-bottom: 16px; }
  h2 {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
  }

  section { margin-bottom: 28px; }

  .section-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
    margin-bottom: 10px;
  }

  .sites-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 10px;
  }

  .site-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    animation: fadeIn 0.3s ease;
  }

  .site-name {
    font-size: 0.9rem;
    font-weight: 650;
    color: var(--text);
  }

  .site-url {
    font-size: 0.72rem;
    color: var(--blue);
    word-break: break-all;
    line-height: 1.4;
  }
  .site-url:hover { text-decoration: underline; }

  .site-meta {
    font-size: 0.68rem;
    color: var(--text3);
    display: flex;
    gap: 5px;
    margin-top: 2px;
  }

  .empty {
    text-align: center;
    padding: 64px 16px;
    color: var(--text3);
    font-size: 0.95rem;
  }
  .empty.error { color: #f87171; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
