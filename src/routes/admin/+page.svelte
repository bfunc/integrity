<script>
  import { onMount } from "svelte";

  // ── Audit state ───────────────────────────────────────────────────────────
  let auditStats = null;
  let recentCalls = [];
  let auditLoading = true;
  let filterAgent = "all";
  let dateFilter = "today";

  // ── Log / pipeline state ──────────────────────────────────────────────────
  let stats = { lastRun: null, nextRun: null, queueSize: 0, sitesCount: 0, articlesCount: 0, threatsCount: 0 };
  let events = [];
  let articles = [];
  let loading = true;
  let error = null;

  let password = "";
  let runStatus = null;
  let runLoading = false;
  let stopLoading = false;
  let resetLoading = false;
  let importLoading = false;
  let fileInput;
  let pipelineRunning = false;

  // ── Formatters ────────────────────────────────────────────────────────────

  function fmtDateTime(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("ru-RU");
  }

  function fmtCost(n) {
    if (n == null) return "$0.000";
    return "$" + Number(n).toFixed(n < 0.01 ? 4 : 3);
  }

  function fmtNum(n) {
    n = Number(n ?? 0);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
    return String(n);
  }

  function fmtTokens(n) {
    n = Number(n ?? 0);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + "k";
    return String(n);
  }

  function fmtDuration(ms) {
    if (ms == null) return "—";
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  }

  function truncate(s, n = 45) {
    if (!s) return "—";
    return s.length > n ? s.slice(0, n) + "…" : s;
  }

  function eventColor(type) {
    if (type === "error")   return "#f87171";
    if (type === "warning") return "#fbbf24";
    return "var(--text3)";
  }

  // ── Article status helpers ────────────────────────────────────────────────

  function analyzedBadge(article) {
    if (article.analyzed_count > 0)         return { label: "analyzed",  cls: "badge-green"  };
    if (article.status === "analyzing")      return { label: "analyzing", cls: "badge-yellow" };
    if (article.status === "error")          return { label: "error",     cls: "badge-red"    };
    if (article.status === "queued"
     || article.status === "new")            return { label: "pending",   cls: "badge-amber"  };
    return { label: "—", cls: "badge-gray" };
  }

  // ── Data fetchers ─────────────────────────────────────────────────────────

  async function fetchAudit() {
    try {
      const res = await fetch(`/api/audit?filter=${dateFilter}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      auditStats = data.stats;
      recentCalls = data.recent_calls ?? [];
    } catch (e) {
      console.error("audit fetch:", e.message);
    } finally {
      auditLoading = false;
    }
  }

  async function setDateFilter(f) {
    dateFilter = f;
    auditLoading = true;
    await fetchAudit();
  }

  async function fetchLog() {
    try {
      const res = await fetch("/api/log");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      stats    = data.stats;
      events   = data.events   ?? [];
      articles = data.articles ?? [];
      const latest = data.events?.[0];
      pipelineRunning =
        !!latest &&
        !latest.message.startsWith("Pipeline completed") &&
        !latest.message.startsWith("Pipeline stopped") &&
        data.events.some((e) => e.message === "Pipeline started");
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  // ── Pipeline controls ─────────────────────────────────────────────────────

  async function triggerRun() {
    runLoading = true; runStatus = null;
    try {
      const res  = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (!res.ok) { runStatus = { ok: false, message: data.error || "Ошибка" }; }
      else         { runStatus = { ok: true,  message: data.message }; password = ""; setTimeout(fetchLog, 2000); }
    } catch (e) { runStatus = { ok: false, message: e.message }; }
    finally { runLoading = false; }
  }

  async function triggerStop() {
    stopLoading = true; runStatus = null;
    try {
      const res  = await fetch("/api/stop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      runStatus = { ok: res.ok, message: data.message || data.error || "Ошибка" };
      if (res.ok) setTimeout(fetchLog, 1500);
    } catch (e) { runStatus = { ok: false, message: e.message }; }
    finally { stopLoading = false; }
  }

  async function triggerReset() {
    if (!confirm("Очистить всю базу данных?")) return;
    resetLoading = true; runStatus = null;
    try {
      const res  = await fetch("/api/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      runStatus = { ok: res.ok, message: data.message || data.error || "Ошибка" };
      if (res.ok) { password = ""; setTimeout(fetchLog, 500); }
    } catch (e) { runStatus = { ok: false, message: e.message }; }
    finally { resetLoading = false; }
  }

  async function downloadAll() {
    if (!password) return;
    try {
      const res = await fetch(`/api/export?password=${encodeURIComponent(password)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `aigregator-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
    } catch (e) { console.error("downloadAll:", e); }
  }

  async function uploadAll() {
    if (!password || !fileInput?.files?.length) return;
    importLoading = true; runStatus = null;
    try {
      const form = new FormData();
      form.append("password", password);
      form.append("file", fileInput.files[0]);
      const res  = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      runStatus = { ok: res.ok, message: data.message || data.error || "Ошибка" };
      if (res.ok) { fileInput.value = ""; setTimeout(fetchLog, 500); }
    } catch (e) { runStatus = { ok: false, message: e.message }; }
    finally { importLoading = false; }
  }

  // ── Reactive ──────────────────────────────────────────────────────────────

  $: errorCount = events.filter((e) => e.type === "error").length;
  $: filteredCalls = filterAgent === "all"
    ? recentCalls
    : recentCalls.filter((c) => c.agent === filterAgent);

  // ── Mount ─────────────────────────────────────────────────────────────────

  onMount(() => {
    fetchAudit();
    fetchLog();
    const auditTimer = setInterval(fetchAudit, 30_000);
    const logTimer   = setInterval(fetchLog,   30_000);
    return () => { clearInterval(auditTimer); clearInterval(logTimer); };
  });
</script>

<div class="container">
  <div class="page-header">
    <h2>Admin</h2>
  </div>

  <!-- ══ AUDIT STATS BAR ══ -->
  <section class="audit-section">
    <div class="section-label">Audit — Claude API</div>

    {#if auditLoading}
      <div class="audit-loading">Загрузка...</div>
    {:else if auditStats}
      <div class="audit-bar">
        <div class="audit-col audit-col-label"></div>
        <div class="audit-col audit-col-head">Today</div>
        <div class="audit-col audit-col-head">This week</div>
        <div class="audit-col audit-col-head">Total</div>
        <div class="audit-col audit-col-head">Avg / call</div>

        <div class="audit-col audit-row-label">Cost</div>
        <div class="audit-col audit-val cost">{fmtCost(auditStats.today.cost_usd)}</div>
        <div class="audit-col audit-val cost">{fmtCost(auditStats.this_week.cost_usd)}</div>
        <div class="audit-col audit-val cost">{fmtCost(auditStats.total.cost_usd)}</div>
        <div class="audit-col audit-val cost">{fmtCost(auditStats.avg_cost_per_call)}</div>

        <div class="audit-col audit-row-label">Calls</div>
        <div class="audit-col audit-val">{fmtNum(auditStats.today.calls)}</div>
        <div class="audit-col audit-val">{fmtNum(auditStats.this_week.calls)}</div>
        <div class="audit-col audit-val">{fmtNum(auditStats.total.calls)}</div>
        <div class="audit-col audit-val muted">—</div>

        <div class="audit-col audit-row-label">Tokens</div>
        <div class="audit-col audit-val">{fmtTokens(auditStats.today.input_tokens + auditStats.today.output_tokens)}</div>
        <div class="audit-col audit-val">{fmtTokens(auditStats.this_week.input_tokens + auditStats.this_week.output_tokens)}</div>
        <div class="audit-col audit-val">{fmtTokens(auditStats.total.input_tokens + auditStats.total.output_tokens)}</div>
        <div class="audit-col audit-val muted">—</div>
      </div>
    {/if}

    <!-- Recent calls table -->
    <div class="filter-row">
      <span class="filter-label">Period:</span>
      <button class="filter-btn" class:active={dateFilter === "today"} on:click={() => setDateFilter("today")}>сегодня</button>
      <button class="filter-btn" class:active={dateFilter === "all"}   on:click={() => setDateFilter("all")}>всё</button>
      <span class="filter-sep"></span>
      <span class="filter-label">Agent:</span>
      {#each ["all", "analyst", "advocate", "arbiter"] as ag}
        <button
          class="filter-btn"
          class:active={filterAgent === ag}
          on:click={() => (filterAgent = ag)}
        >{ag}</button>
      {/each}
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Agent</th>
            <th>Article</th>
            <th class="num">In</th>
            <th class="num">Out</th>
            <th class="num">Cost</th>
            <th class="num">Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredCalls as c (c.id)}
            <tr>
              <td class="ts">{fmtDateTime(c.called_at)}</td>
              <td><span class="agent-badge">{c.agent ?? "—"}</span></td>
              <td class="article-cell" title={c.article_title ?? c.article_id ?? ""}>
                {truncate(c.article_title ?? c.article_id)}
              </td>
              <td class="num">{fmtTokens(c.input_tokens)}</td>
              <td class="num">{fmtTokens(c.output_tokens)}</td>
              <td class="num cost">{fmtCost(c.cost_usd)}</td>
              <td class="num">{fmtDuration(c.duration_ms)}</td>
              <td>
                {#if c.error}
                  <span class="badge badge-red" title={c.error}>error</span>
                {:else}
                  <span class="badge badge-green">ok</span>
                {/if}
              </td>
            </tr>
          {/each}
          {#if filteredCalls.length === 0}
            <tr><td colspan="8" class="empty-row">No calls logged yet</td></tr>
          {/if}
        </tbody>
      </table>
    </div>
  </section>

  <!-- ══ PIPELINE ══ -->
  {#if loading}
    <div class="empty">Загрузка...</div>
  {:else if error}
    <div class="empty error-msg">{error}</div>
  {:else}

    <div class="dashboard">
      <div class="stat-card">
        <div class="stat-label">Последний запуск</div>
        <div class="stat-value">{fmtDateTime(stats.lastRun)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Следующий запуск</div>
        <div class="stat-value">{fmtDateTime(stats.nextRun)}</div>
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
          on:keydown={(e) => e.key === "Enter" && triggerRun()}
        />
        <button class="btn-run"  on:click={triggerRun}   disabled={runLoading   || !password}>{runLoading   ? "Запуск..."   : "▶ Запустить"}</button>
        <button class="btn-stop" on:click={triggerStop}  disabled={stopLoading  || !password || !pipelineRunning}>{stopLoading  ? "Остановка..." : "⏹ Стоп"}</button>
        <button class="btn-reset" on:click={triggerReset} disabled={resetLoading || !password}>{resetLoading ? "Очистка..."  : "✕ Очистить базу"}</button>
        <button class="btn-export" on:click={downloadAll} disabled={!password}>↓ Скачать всё</button>
        <label class="btn-export" class:disabled={!password || importLoading}>
          {importLoading ? "Загрузка..." : "↑ Загрузить всё"}
          <input bind:this={fileInput} type="file" accept=".json" style="display:none"
            on:change={uploadAll} disabled={!password || importLoading} />
        </label>
        <a href="/admin/usage.csv" class="btn-export" download>📊 Usage CSV</a>
      </div>
      {#if runStatus}
        <div class="run-status" class:ok={runStatus.ok} class:fail={!runStatus.ok}>{runStatus.message}</div>
      {/if}
    </section>

    <!-- ── Articles with crawl/analysis status ── -->
    <section>
      <div class="section-label">Статьи — статус обработки</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Заголовок</th>
              <th>Источник</th>
              <th>Дата</th>
              <th>Crawled</th>
              <th>Analyzed</th>
            </tr>
          </thead>
          <tbody>
            {#each articles as a (a.id)}
              {@const ab = analyzedBadge(a)}
              <tr>
                <td class="article-title">
                  <a href={a.url} target="_blank" rel="noopener" title={a.title}>
                    {truncate(a.title, 60)}
                  </a>
                </td>
                <td class="source-cell">{a.source ?? "—"}</td>
                <td class="ts">{fmtDateTime(a.published_at)}</td>
                <td><span class="badge badge-green">crawled</span></td>
                <td><span class="badge {ab.cls}">{ab.label}</span></td>
              </tr>
            {/each}
            {#if articles.length === 0}
              <tr><td colspan="5" class="empty-row">Нет статей</td></tr>
            {/if}
          </tbody>
        </table>
      </div>
    </section>

    <!-- ── Events log ── -->
    <section>
      <div class="section-label">События</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Время</th><th>Тип</th><th>Сообщение</th></tr>
          </thead>
          <tbody>
            {#each events as ev (ev.id)}
              <tr>
                <td class="ts">{fmtDateTime(ev.created_at)}</td>
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
</div>

<style>
  .container { max-width: 1200px; margin: 0 auto; }

  .page-header { margin-bottom: 16px; }
  h2 {
    font-size: 0.85rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--text3);
  }

  .section-label {
    font-size: 0.72rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--text3); margin-bottom: 10px;
  }

  /* ── Audit bar ── */
  .audit-section { margin-bottom: 28px; }

  .audit-loading {
    font-size: 0.8rem; color: var(--text3); padding: 12px 0;
  }

  .audit-bar {
    display: grid;
    grid-template-columns: 80px repeat(4, 1fr);
    gap: 0;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 16px;
  }
  .audit-col {
    padding: 10px 14px;
    font-size: 0.78rem;
    border-bottom: 1px solid var(--border2);
    border-right: 1px solid var(--border2);
  }
  .audit-col:nth-child(5n) { border-right: none; }
  .audit-col:nth-last-child(-n+5) { border-bottom: none; }

  .audit-col-head {
    background: var(--bg3); font-size: 0.66rem;
    font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text3);
  }
  .audit-col-label { background: var(--bg3); }
  .audit-row-label {
    font-size: 0.66rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--text3); background: var(--bg3);
  }
  .audit-val { font-weight: 700; color: var(--text2); font-family: "JetBrains Mono", monospace; }
  .audit-val.cost { color: #16a34a; }
  .audit-val.muted { color: var(--text3); font-weight: 400; }

  /* ── Filter row ── */
  .filter-row {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 8px;
  }
  .filter-label { font-size: 0.68rem; color: var(--text3); }
  .filter-btn {
    padding: 3px 10px; font-size: 0.72rem;
    background: transparent; border: 1px solid var(--border);
    border-radius: 4px; color: var(--text3);
    cursor: pointer; transition: border-color 0.12s, color 0.12s;
  }
  .filter-btn:hover { color: var(--text2); border-color: var(--text3); }
  .filter-btn.active { border-color: var(--blue); color: var(--blue); }

  /* ── Tables ── */
  .table-wrap {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  th {
    text-align: left; padding: 9px 14px;
    font-size: 0.67rem; text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text3);
    border-bottom: 1px solid var(--border);
    background: var(--bg3);
  }
  th.num { text-align: right; }
  td {
    padding: 7px 14px; border-bottom: 1px solid var(--border2);
    vertical-align: top;
  }
  td.num { text-align: right; font-family: "JetBrains Mono", monospace; color: var(--text2); }
  td.cost { color: #16a34a; }
  tr:last-child td { border-bottom: none; }

  .ts { color: var(--text3); white-space: nowrap; font-size: 0.72rem; }
  .type { font-weight: 700; text-transform: uppercase; font-size: 0.68rem; white-space: nowrap; }
  .msg { color: var(--text2); }
  .article-cell { color: var(--text2); font-size: 0.78rem; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .article-title a { color: var(--text2); }
  .article-title a:hover { color: var(--blue); }
  .source-cell { color: var(--text3); font-size: 0.75rem; }
  .empty-row { color: var(--text3); text-align: center; padding: 24px; }

  /* ── Badges ── */
  .badge {
    display: inline-block; font-size: 0.62rem; font-weight: 700;
    padding: 2px 7px; border-radius: 3px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .badge-green  { background: rgba(22,163,74,0.12);   color: #15803d; }
  .badge-yellow { background: rgba(234,179,8,0.15);  color: #854d0e; }
  .badge-amber  { background: rgba(217,119,6,0.12);  color: #b45309; }
  .badge-red    { background: rgba(239,68,68,0.12);  color: #b91c1c; }
  .badge-gray   { background: rgba(107,114,128,0.1); color: var(--text3); }

  .filter-sep { width: 1px; height: 14px; background: var(--border); margin: 0 2px; }

  .agent-badge {
    display: inline-block; font-size: 0.62rem; font-weight: 700;
    padding: 2px 7px; border-radius: 3px;
    background: rgba(37,99,235,0.1); color: #1d4ed8;
    text-transform: uppercase; letter-spacing: 0.04em;
  }

  /* ── Pipeline section ── */
  .dashboard {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 10px; margin-bottom: 24px;
  }
  .stat-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px;
  }
  .stat-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text3); margin-bottom: 6px; }
  .stat-value { font-size: 1.05rem; font-weight: 700; color: var(--text); }
  .stat-value.red { color: #f87171; }

  .run-section { margin-bottom: 24px; }
  .run-form { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }

  .inp {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 5px; padding: 6px 12px;
    color: var(--text); font-size: 0.82rem; width: 200px;
    outline: none; transition: border-color 0.15s;
  }
  .inp:focus { border-color: var(--text3); }

  .btn-run, .btn-stop, .btn-reset, .btn-export {
    padding: 6px 14px; font-size: 0.78rem;
    background: transparent; border: 1px solid var(--border);
    border-radius: 5px; color: var(--text3);
    cursor: pointer; transition: border-color 0.15s, color 0.15s;
    display: inline-flex; align-items: center; user-select: none;
    text-decoration: none;
  }
  .btn-run:hover:not(:disabled)   { border-color: #5ab45a; color: #5ab45a; }
  .btn-stop:hover:not(:disabled)  { border-color: #f97316; color: #f97316; }
  .btn-reset:hover:not(:disabled) { border-color: #f87171; color: #f87171; }
  .btn-export:hover:not(.disabled){ border-color: #60a5fa; color: #60a5fa; }
  .btn-run:disabled, .btn-stop:disabled, .btn-reset:disabled, .btn-export:disabled { opacity: 0.4; cursor: default; }
  .btn-export.disabled { opacity: 0.4; cursor: default; }

  .run-status { font-size: 0.8rem; padding: 4px 0; }
  .run-status.ok   { color: var(--green); }
  .run-status.fail { color: #f87171; }

  section { margin-bottom: 28px; }

  .empty { text-align: center; padding: 64px 16px; color: var(--text3); font-size: 0.95rem; }
  .error-msg { text-align: center; padding: 64px 16px; color: #f87171; font-size: 0.95rem; }
</style>
