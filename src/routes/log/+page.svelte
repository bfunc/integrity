<script>
  import { onMount } from 'svelte';

  let stats = { lastRun: null, nextRun: null, queueSize: 0, sitesCount: 0, articlesCount: 0, threatsCount: 0 };
  let events = [];
  let loading = true;
  let error = null;

  let password = '';
  let runStatus = null;
  let runLoading = false;
  let resetLoading = false;

  function formatDateTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('ru-RU');
  }

  function eventColor(type) {
    if (type === 'error')   return '#f87171';
    if (type === 'warning') return '#fbbf24';
    return 'var(--text3)';
  }

  async function fetchData() {
    try {
      const res = await fetch('/api/log');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      stats = data.stats;
      events = data.events;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function triggerRun() {
    runLoading = true;
    runStatus = null;
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        runStatus = { ok: false, message: data.error || 'Ошибка' };
      } else {
        runStatus = { ok: true, message: data.message };
        password = '';
        setTimeout(fetchData, 2000);
      }
    } catch (e) {
      runStatus = { ok: false, message: e.message };
    } finally {
      runLoading = false;
    }
  }

  async function triggerReset() {
    if (!confirm('Очистить всю базу данных?')) return;
    resetLoading = true;
    runStatus = null;
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      runStatus = { ok: res.ok, message: data.message || data.error || 'Ошибка' };
      if (res.ok) { password = ''; setTimeout(fetchData, 500); }
    } catch (e) {
      runStatus = { ok: false, message: e.message };
    } finally {
      resetLoading = false;
    }
  }

  $: errorCount = events.filter(e => e.type === 'error').length;

  onMount(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  });
</script>

<div class="page-header">
  <h2>Лог</h2>
</div>

{#if loading}
  <div class="empty">Загрузка...</div>
{:else if error}
  <div class="empty error">{error}</div>
{:else}
  <div class="dashboard">
    <div class="stat-card">
      <div class="stat-label">Последний запуск</div>
      <div class="stat-value">{formatDateTime(stats.lastRun)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Следующий запуск</div>
      <div class="stat-value">{formatDateTime(stats.nextRun)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">В очереди</div>
      <div class="stat-value">{stats.queueSize}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Ошибок</div>
      <div class="stat-value" class:red={errorCount > 0}>{errorCount}</div>
    </div>
  </div>

  <section class="run-section">
    <div class="section-label">Ручной запуск</div>
    <div class="run-form">
      <input
        type="password"
        bind:value={password}
        placeholder="Пароль"
        class="inp"
        on:keydown={(e) => e.key === 'Enter' && triggerRun()}
      />
      <button class="btn-run" on:click={triggerRun} disabled={runLoading || !password}>
        {runLoading ? 'Запуск...' : '▶ Запустить'}
      </button>
      <button class="btn-reset" on:click={triggerReset} disabled={resetLoading || !password}>
        {resetLoading ? 'Очистка...' : '✕ Очистить базу'}
      </button>
    </div>
    {#if runStatus}
      <div class="run-status" class:ok={runStatus.ok} class:fail={!runStatus.ok}>
        {runStatus.message}
      </div>
    {/if}
  </section>

  <section>
    <div class="section-label">События</div>
    <div class="log-table-wrap">
      <table>
        <thead>
          <tr><th>Время</th><th>Тип</th><th>Сообщение</th></tr>
        </thead>
        <tbody>
          {#each events as ev (ev.id)}
            <tr>
              <td class="ts">{formatDateTime(ev.created_at)}</td>
              <td class="type" style="color:{eventColor(ev.type)}">{ev.type}</td>
              <td class="msg">{ev.message}</td>
            </tr>
          {/each}
          {#if events.length === 0}
            <tr><td colspan="3" class="empty-row">Нет событий</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>
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

  .dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 10px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
  }

  .stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text3);
    margin-bottom: 6px;
  }

  .stat-value {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text);
  }
  .stat-value.red { color: #f87171; }

  .section-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
    margin-bottom: 10px;
  }

  .run-section { margin-bottom: 24px; }

  .run-form { display: flex; gap: 8px; margin-bottom: 8px; }

  .inp {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 6px 12px;
    color: var(--text);
    font-size: 0.82rem;
    width: 200px;
    outline: none;
    transition: border-color 0.15s;
  }
  .inp:focus { border-color: var(--text3); }

  .btn-run {
    padding: 6px 14px;
    font-size: 0.78rem;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text3);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-run:hover:not(:disabled) { border-color: #5ab45a; color: #5ab45a; }
  .btn-run:disabled { opacity: 0.4; cursor: default; }

  .btn-reset {
    padding: 6px 14px;
    font-size: 0.78rem;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--text3);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-reset:hover:not(:disabled) { border-color: #f87171; color: #f87171; }
  .btn-reset:disabled { opacity: 0.4; cursor: default; }

  .run-status { font-size: 0.8rem; padding: 4px 0; }
  .run-status.ok   { color: var(--green); }
  .run-status.fail { color: #f87171; }

  section { margin-bottom: 28px; }

  .log-table-wrap {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }

  th {
    text-align: left;
    padding: 9px 14px;
    font-size: 0.67rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text3);
    border-bottom: 1px solid var(--border);
    background: var(--bg3);
  }

  td { padding: 7px 14px; border-bottom: 1px solid var(--border2); vertical-align: top; }
  tr:last-child td { border-bottom: none; }

  .ts  { color: var(--text3); white-space: nowrap; font-size: 0.72rem; }
  .type { font-weight: 700; text-transform: uppercase; font-size: 0.68rem; white-space: nowrap; }
  .msg { color: var(--text2); }
  .empty-row { color: var(--text3); text-align: center; padding: 24px; }

  .empty {
    text-align: center;
    padding: 64px 16px;
    color: var(--text3);
    font-size: 0.95rem;
  }
  .empty.error { color: #f87171; }
</style>
