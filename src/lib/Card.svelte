<script>
  export let item;

  const SEV_COLOR = {
    1: { bg: "#eff1ff", border: "#c7d2fe", text: "#4f46e5" },
    2: { bg: "#eff1ff", border: "#c7d2fe", text: "#4f46e5" },
    3: { bg: "#fff7ed", border: "#fed7aa", text: "#ea580c" },
    4: { bg: "#fff1f2", border: "#fecdd3", text: "#dc2626" },
    5: { bg: "#fff1f2", border: "#fca5a5", text: "#b91c1c" },
  };

  const PATTERN_NAMES = {
    call_to_violence: "Призыв к насилию",
    dehumanization: "Дегуманизация",
    demonization: "Демонизация",
    existential_threat_accusation: "Обвинение в экзистенциальной угрозе",
    scapegoating: "Поиск козла отпущения",
    us_vs_them: "Мы против них",
    appeal_to_fear: "Апелляция к страху",
    conspiracy_targeting: "Конспирологическое обвинение",
    false_dilemma: "Ложная дилемма",
    whataboutism: "Вотэбаутизм",
    emotional_manipulation: "Эмоциональная манипуляция",
    group_discrediting: "Дискредитация группы",
  };

  const LEVEL_LABELS = {
    incitement: "Подстрекательство",
    toxification: "Токсификация",
    rhetorical_manipulation: "Риторическая манипуляция",
  };

  const CONF_COLOR = {
    high: "#ef4444",
    medium: "#facc15",
    low: "#4ade80",
  };

  const CONF_ORDER = { high: 0, medium: 1, low: 2 };
  const LEVEL_ORDER = {
    incitement: 0,
    toxification: 1,
    rhetorical_manipulation: 2,
  };

  // Left border color per violation confidence
  const VIOL_BORDER = {
    high: "#E5383B",
    medium: "#F5A623",
  };

  function sevStyle(s) {
    const c = SEV_COLOR[s] || {
      bg: "#eff1ff",
      border: "#c7d2fe",
      text: "#4f46e5",
    };
    return `background:${c.bg};border-color:${c.border};color:${c.text}`;
  }

  function cleanStyle() {
    return "background:#f0fdf4;border-color:#86efac;color:#15803d";
  }

  function violBorderStyle(p) {
    const color = VIOL_BORDER[p.confidence] || "var(--border2)";
    return `border-left: 3px solid ${color}`;
  }

  function formatDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  let open = false;
  let disputeOpen = false;
  let summaryExpanded = false;

  function openModal(e) {
    if (e.target.closest("a")) return;
    open = true;
  }

  function closeModal() {
    open = false;
    disputeOpen = false;
  }

  function handleKey(e) {
    if (e.key === "Escape") {
      if (disputeOpen) {
        disputeOpen = false;
      } else {
        closeModal();
      }
    }
  }

  $: topPattern = Array.isArray(item.patterns) ? item.patterns[0] : null;
  $: label = item.severity_label || "";
  $: patterns = Array.isArray(item.patterns) ? item.patterns : [];
  $: hasSeverity = Number.isFinite(Number(item.severity));
  $: hasViolations = hasSeverity && patterns.length > 0;
  $: showCleanBadge = !hasViolations;
  $: sortedPatterns = patterns.slice().sort((a, b) => {
    const ca = CONF_ORDER[a.confidence] ?? 3;
    const cb = CONF_ORDER[b.confidence] ?? 3;
    if (ca !== cb) return ca - cb;
    return (LEVEL_ORDER[a.level] ?? 3) - (LEVEL_ORDER[b.level] ?? 3);
  });

  // Attribution line
  $: attributionSource = item.leader_name || item.source || null;
  $: attributionRole = item.leader_role || null;

  $: attrBadgeRole =
    item.attribution_role && item.attribution_role !== "reporter"
      ? item.attribution_role
      : null;

  // Lock body scroll while modal is open
  $: if (typeof document !== "undefined") {
    document.body.style.overflow = open ? "hidden" : "";
  }
</script>

<svelte:window on:keydown={handleKey} />

<div
  class="threat-card"
  style="border-color: {SEV_COLOR[item.severity]?.border ?? 'var(--border)'}"
  on:click={openModal}
  role="button"
  tabindex="0"
  on:keypress={(e) => e.key === "Enter" && openModal(e)}
  aria-label="Открыть детали"
>
  <div class="threat-top">
    <span class="src-badge">{item.source}</span>
    {#if attrBadgeRole}
      <span class="attr-badge attr-{attrBadgeRole}">
        {attrBadgeRole === "originator" ? "МАНИПУЛЯТОР" : "УСИЛИТЕЛЬ"}
      </span>
    {/if}
    {#if hasViolations}
      <span class="threat-tag" style={sevStyle(item.severity)}
        >{label} {item.severity}/5</span
      >
    {:else if showCleanBadge}
      <span class="threat-tag" style={cleanStyle()}>CLEAN</span>
    {/if}
  </div>

  <a class="threat-title" href={item.url || "#"} target="_blank" rel="noopener">
    {item.title}{#if topPattern}<span class="title-pattern-tag"
        >{PATTERN_NAMES[topPattern.name] ?? topPattern.name}</span
      >{/if}
  </a>

  {#if item.subtext || item.summary_md}
    <div
      class="summary-wrap"
      class:expanded={summaryExpanded}
      on:click|stopPropagation={() => (summaryExpanded = !summaryExpanded)}
      role="button"
      tabindex="0"
      on:keypress={(e) =>
        e.key === "Enter" && (summaryExpanded = !summaryExpanded)}
    >
      {#if item.subtext}
        <span class="subtext-label">Что скрыто между строк</span>
        <p class="threat-status">{item.subtext}</p>
      {:else}
        <p class="threat-status">{item.summary_md}</p>
      {/if}
      <span class="summary-chevron">{summaryExpanded ? "▴" : "▾"}</span>
    </div>
  {/if}

  <div class="threat-meta">
    {formatDate(item.published_at || item.analyzed_at)}
    {#if item.source_type === "speech"}
      · речь{/if}
    {#if patterns.length > 1}
      <span class="meta-violations"> · {patterns.length} нарушения</span>
    {/if}
    <span class="expand-hint">↗ подробнее</span>
  </div>
</div>

<!-- ── FULLSCREEN MODAL ── -->
{#if open}
  <div class="modal-overlay" on:click={closeModal} role="presentation">
    <div
      class="modal"
      on:click|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <!-- Header -->
      <div class="modal-head">
        <div class="modal-badges">
          <span class="src-badge">{item.source}</span>
          {#if hasViolations}
            <span class="threat-tag" style={sevStyle(item.severity)}
              >{label} {item.severity}/5</span
            >
          {:else if showCleanBadge}
            <span class="threat-tag" style={cleanStyle()}>CLEAN</span>
          {/if}
          {#if item.source_type === "speech"}
            <span class="type-badge">речь</span>
          {/if}
        </div>
        <button class="modal-close" on:click={closeModal} aria-label="Закрыть"
          >✕</button
        >
      </div>

      <!-- Title -->
      <h2 class="modal-title">{item.title}</h2>

      <!-- Attribution tuple -->
      {#if attributionSource}
        <p class="modal-attribution">
          Источник: {attributionSource}{#if attributionRole}
            · Роль: {attributionRole}{/if}
        </p>
      {/if}

      <!-- Summary -->
      {#if item.summary_md}
        <p class="modal-summary">{item.summary_md}</p>
      {/if}

      <!-- Subtext -->
      {#if item.subtext}
        <div class="modal-subtext-section">
          <span class="modal-subtext-label">Что скрыто между строк</span>
          <p class="modal-subtext-body">{item.subtext}</p>
        </div>
      {/if}

      <!-- Violations list -->
      <div class="violations-wrap">
        <div class="violations-header">
          Выявленные нарушения
          <span class="violations-count">{patterns.length}</span>
        </div>

        {#if patterns.length === 0}
          <p class="no-violations">Нарушения не выявлены</p>
        {:else}
          {#each sortedPatterns as p, i}
            <div class="violation" style={violBorderStyle(p)}>
              <div class="violation-top">
                <span class="viol-num">{i + 1}</span>
                <span class="viol-name">{PATTERN_NAMES[p.name] ?? p.name}</span>
                {#if p.level}
                  <span class="viol-level"
                    >{LEVEL_LABELS[p.level] ?? p.level}</span
                  >
                {/if}
                {#if p.confidence}
                  <span
                    class="viol-conf"
                    style="color:{CONF_COLOR[p.confidence] ?? 'var(--text3)'}"
                  >
                    {p.confidence}
                  </span>
                {/if}
              </div>
              {#if p.quote}
                <blockquote class="viol-quote">«{p.quote}»</blockquote>
              {/if}
              {#if p.explanation}
                <p class="viol-expl">{p.explanation}</p>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="dispute-btn" on:click={() => (disputeOpen = true)}>
          Оспорить
        </button>
        <span class="modal-date"
          >{formatDate(item.published_at || item.analyzed_at)}</span
        >
        {#if item.url}
          <a class="modal-link" href={item.url} target="_blank" rel="noopener">
            Открыть источник →
          </a>
        {/if}
      </div>
    </div>
  </div>

  <!-- Dispute notice -->
  {#if disputeOpen}
    <div
      class="dispute-overlay"
      on:click={() => (disputeOpen = false)}
      role="presentation"
    >
      <div
        class="dispute-modal"
        on:click|stopPropagation
        role="dialog"
        aria-modal="true"
      >
        <p class="dispute-msg">
          Функция голосования появится в следующей версии
        </p>
        <button class="dispute-close" on:click={() => (disputeOpen = false)}
          >Закрыть</button
        >
      </div>
    </div>
  {/if}
{/if}

<style>
  /* ── CARD ── */
  .threat-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 14px 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    animation: fadeIn 0.4s ease;
    transition:
      transform 0.16s ease,
      border-color 0.16s ease,
      box-shadow 0.16s ease;
  }

  .threat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  .threat-top {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 10px;
  }

  .src-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 5px;
    background: var(--bg3);
    color: var(--text2);
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .attr-badge {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }
  .attr-originator {
    background: #fff1f2;
    color: #dc2626;
  }
  .attr-amplifier {
    background: #fff7ed;
    color: #ea580c;
  }

  .threat-tag {
    margin-left: auto;
    font-size: 0.68rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
    border: 1px solid transparent;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .threat-title {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.96rem;
    font-weight: 650;
    line-height: 1.4;
    color: var(--text);
    margin-bottom: 10px;
  }

  .threat-title:hover {
    text-decoration: underline;
  }

  .title-pattern-tag {
    display: inline;
    margin-left: 6px;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--orange);
    background: rgba(251, 146, 60, 0.1);
    border: 1px solid rgba(251, 146, 60, 0.25);
    border-radius: 4px;
    padding: 1px 6px;
    vertical-align: middle;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .summary-wrap {
    cursor: pointer;
    position: relative;
    margin-bottom: 6px;
  }

  .summary-wrap:not(.expanded) .threat-status {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .summary-wrap.expanded .threat-status {
    display: block;
    overflow: visible;
  }

  .summary-chevron {
    display: block;
    font-size: 0.6rem;
    color: var(--text3);
    margin-top: 2px;
    opacity: 0.7;
  }

  .subtext-section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border2);
  }

  .subtext-label {
    display: block;
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text3);
    margin-bottom: 4px;
  }

  .subtext-body {
    font-size: 0.78rem;
    line-height: 1.55;
    color: var(--text2);
  }

  /* Feature 5: 2-line clamp on grid card summary */
  .threat-status {
    font-size: 0.79rem;
    line-height: 1.4;
    color: var(--text2);
    margin-bottom: 0;
  }

  .threat-meta {
    font-size: 0.69rem;
    color: var(--text3);
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .meta-violations {
    color: var(--text3);
  }

  .expand-hint {
    margin-left: auto;
    font-size: 0.66rem;
    color: var(--text3);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .threat-card:hover .expand-hint {
    opacity: 1;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ── MODAL OVERLAY ── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 500;
    background: rgba(5, 7, 12, 0.82);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 40px 16px 40px;
    overflow-y: auto;
    animation: overlayIn 0.18s ease;
  }

  @keyframes overlayIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* ── MODAL PANEL ── */
  .modal {
    width: 100%;
    max-width: 720px;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 24px 28px 28px;
    animation: modalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    flex-shrink: 0;
  }

  @keyframes modalIn {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
  }

  .modal-badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .type-badge {
    font-size: 0.66rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 5px;
    background: #f3f0ff;
    color: var(--purple);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .modal-close {
    margin-left: auto;
    background: none;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text3);
    font-size: 0.9rem;
    width: 30px;
    height: 30px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      color 0.15s,
      border-color 0.15s,
      background 0.15s;
    flex-shrink: 0;
  }
  .modal-close:hover {
    color: var(--text);
    border-color: var(--text3);
    background: var(--bg3);
  }

  .modal-title {
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.4;
    color: var(--text);
    margin-bottom: 6px;
  }

  /* Feature 2: attribution tuple */
  .modal-attribution {
    font-size: 0.74rem;
    color: var(--text3);
    margin-bottom: 14px;
    line-height: 1.4;
  }

  .modal-summary {
    font-size: 0.88rem;
    line-height: 1.6;
    color: var(--text2);
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border2);
  }

  .modal-subtext-section {
    margin-bottom: 24px;
    padding: 14px 16px;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  .modal-subtext-label {
    display: block;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text3);
    margin-bottom: 8px;
  }

  .modal-subtext-body {
    font-size: 0.86rem;
    line-height: 1.6;
    color: var(--text2);
  }

  /* ── VIOLATIONS ── */
  .violations-wrap {
    margin-bottom: 20px;
  }

  .violations-header {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .violations-count {
    background: #e8eef8;
    color: var(--blue);
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 8px;
  }

  .no-violations {
    font-size: 0.84rem;
    color: var(--text3);
    font-style: italic;
  }

  /* Feature 4: left border on violation cards */
  .violation {
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 10px;
    border-left-width: 3px;
  }
  .violation:last-child {
    margin-bottom: 0;
  }

  .violation-top {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .viol-num {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text3);
    background: var(--bg);
    border-radius: 4px;
    padding: 1px 6px;
    flex-shrink: 0;
  }

  .viol-name {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--orange);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .viol-level {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text3);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 7px;
  }

  .viol-conf {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-left: auto;
  }

  .viol-quote {
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--text2);
    border-left: 3px solid var(--border);
    padding-left: 12px;
    margin: 8px 0;
    font-style: italic;
  }

  .viol-expl {
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--text2);
    margin-top: 6px;
  }

  /* ── FOOTER ── */
  .modal-footer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 18px;
    border-top: 1px solid var(--border2);
  }

  /* Feature 1: dispute button */
  .dispute-btn {
    background: none;
    border: 1px solid var(--orange, #f5a623);
    border-radius: 6px;
    color: var(--orange, #f5a623);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 5px 14px;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
    flex-shrink: 0;
  }
  .dispute-btn:hover {
    background: rgba(245, 166, 35, 0.1);
  }

  .modal-date {
    font-size: 0.72rem;
    color: var(--text3);
    margin-left: auto;
  }

  .modal-link {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--blue);
    text-decoration: none;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .modal-link:hover {
    opacity: 0.75;
    text-decoration: underline;
  }

  /* ── DISPUTE NOTICE ── */
  .dispute-overlay {
    position: fixed;
    inset: 0;
    z-index: 600;
    background: rgba(5, 7, 12, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    animation: overlayIn 0.15s ease;
  }

  .dispute-modal {
    background: #1a1f2e;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px 32px;
    max-width: 380px;
    width: 100%;
    text-align: center;
    animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .dispute-msg {
    font-size: 0.95rem;
    color: var(--text2);
    line-height: 1.55;
    margin-bottom: 20px;
  }

  .dispute-close {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text2);
    font-size: 0.8rem;
    font-weight: 600;
    padding: 7px 20px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s;
  }
  .dispute-close:hover {
    border-color: var(--text3);
    color: var(--text);
  }
</style>
