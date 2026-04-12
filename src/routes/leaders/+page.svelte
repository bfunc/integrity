<script>
  import { onMount } from 'svelte';

  let leaders = [];
  let loading = true;
  let error = null;
  let expanded = {};

  const SEV_STYLE = {
    3: 'background:#1c0f00;border:1px solid #4a2500;color:#fb923c',
    4: 'background:#1a0808;border:1px solid #3d1010;color:#fca5a5',
    5: 'background:#1a0808;border:1px solid #5a0e0e;color:#ef4444',
  };

  function sevStyle(s) {
    return SEV_STYLE[s] || 'background:#0f172a;border:1px solid #1e293b;color:#818cf8';
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  async function fetchData() {
    try {
      const res = await fetch('/api/leaders');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      leaders = data.leaders;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function toggle(id) {
    expanded = { ...expanded, [id]: !expanded[id] };
  }

  onMount(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="page-header">
  <h2>Лидеры</h2>
</div>

{#if loading}
  <div class="empty">Загрузка...</div>
{:else if error}
  <div class="empty error">{error}</div>
{:else if leaders.length === 0}
  <div class="empty">Лидеры не добавлены.</div>
{:else}
  <div class="list">
    {#each leaders as leader (leader.id)}
      <div class="card">
        <button class="card-head" on:click={() => toggle(leader.id)}>
          <div class="leader-info">
            <span class="leader-name">{leader.name}</span>
            <span class="leader-role">{leader.role} · {leader.country}</span>
          </div>
          <div class="leader-right">
            {#if leader.violation_count > 0}
              <span class="sev-tag" style={sevStyle(leader.max_severity)}>
                {leader.max_severity}/5
              </span>
              <span class="v-count">{leader.violation_count} нарушений</span>
              <span class="v-date">{formatDate(leader.last_violation_date)}</span>
            {:else}
              <span class="clean">чисто</span>
            {/if}
            <span class="speech-progress">{leader.speeches_analyzed}/{leader.speeches_total} речей</span>
            <span class="chevron">{expanded[leader.id] ? '▲' : '▼'}</span>
          </div>
        </button>

        {#if expanded[leader.id] && leader.violations?.length > 0}
          <div class="violations">
            {#each leader.violations as v (v.id)}
              <div class="violation">
                <span class="v-d">{formatDate(v.date)}</span>
                <span class="v-t">{v.title}</span>
                <span class="v-p">{v.pattern}</span>
                <p class="v-s">{v.summary_md}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
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

  .list { display: flex; flex-direction: column; gap: 8px; }

  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    animation: fadeIn 0.4s ease;
  }

  .card-head {
    width: 100%;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    text-align: left;
    transition: background 0.15s;
  }
  .card-head:hover { background: var(--bg3); }

  .leader-info { display: flex; flex-direction: column; gap: 3px; }
  .leader-name { font-size: 0.95rem; font-weight: 650; color: var(--text); }
  .leader-role { font-size: 0.72rem; color: var(--text3); }

  .leader-right { display: flex; align-items: center; gap: 10px; }

  .sev-tag {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .v-count { font-size: 0.75rem; color: var(--text2); }
  .v-date  { font-size: 0.72rem; color: var(--text3); }
  .clean            { font-size: 0.75rem; color: var(--green); }
  .speech-progress  { font-size: 0.68rem; color: var(--text3); }
  .chevron          { font-size: 0.65rem; color: var(--text3); }

  .violations {
    border-top: 1px solid var(--border2);
    padding: 12px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .violation {
    display: grid;
    grid-template-columns: 54px 1fr;
    grid-template-rows: auto auto auto;
    gap: 2px 10px;
  }
  .v-d { font-size: 0.68rem; color: var(--text3); }
  .v-t { font-size: 0.86rem; color: var(--text); font-weight: 600; }
  .v-p { grid-column: 2; font-size: 0.7rem; color: var(--orange); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .v-s { grid-column: 1 / -1; font-size: 0.78rem; color: var(--text2); line-height: 1.45; margin-top: 2px; }

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
