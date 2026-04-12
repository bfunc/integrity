<script>
  export let item;

  const SEV_COLOR = {
    3: { bg: '#1c0f00', border: '#4a2500', text: '#fb923c' },
    4: { bg: '#1a0808', border: '#3d1010', text: '#fca5a5' },
    5: { bg: '#1a0808', border: '#5a0e0e', text: '#ef4444' },
  };

  const PATTERN_NAMES = {
    call_to_violence:              'Призыв к насилию',
    dehumanization:                'Дегуманизация',
    demonization:                  'Демонизация',
    existential_threat_accusation: 'Обвинение в экзистенциальной угрозе',
    scapegoating:                  'Поиск козла отпущения',
    us_vs_them:                    'Мы против них',
    appeal_to_fear:                'Апелляция к страху',
    conspiracy_targeting:          'Конспирологическое обвинение',
    false_dilemma:                 'Ложная дилемма',
    whataboutism:                  'Вотэбаутизм',
    emotional_manipulation:        'Эмоциональная манипуляция',
    group_discrediting:            'Дискредитация группы',
  };

  const LEVEL_LABELS = {
    incitement:              'Подстрекательство',
    toxification:            'Токсификация',
    rhetorical_manipulation: 'Риторическая манипуляция',
  };

  const CONF_COLOR = {
    high:   '#ef4444',
    medium: '#facc15',
    low:    '#4ade80',
  };

  function sevStyle(s) {
    const c = SEV_COLOR[s] || { bg: '#0f172a', border: '#1e293b', text: '#818cf8' };
    return `background:${c.bg};border-color:${c.border};color:${c.text}`;
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  let open = false;

  function openModal(e) {
    if (e.target.closest('a')) return;
    open = true;
  }

  function closeModal() {
    open = false;
  }

  function handleKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  $: topPattern = Array.isArray(item.patterns) ? item.patterns[0] : null;
  $: label = item.severity_label || '';
  $: patterns = Array.isArray(item.patterns) ? item.patterns : [];

  // Lock body scroll while modal is open
  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : '';
  }
</script>

<svelte:window on:keydown={handleKey} />

<div
  class="threat-card"
  style="border-color: {SEV_COLOR[item.severity]?.border ?? 'var(--border)'}"
  on:click={openModal}
  role="button"
  tabindex="0"
  on:keypress={(e) => e.key === 'Enter' && openModal(e)}
  aria-label="Открыть детали"
>
  <div class="threat-top">
    <span class="src-badge">{item.source}</span>
    <span
      class="threat-tag"
      style={sevStyle(item.severity)}
    >{label} {item.severity}/5</span>
  </div>

  <a class="threat-title" href={item.url || '#'} target="_blank" rel="noopener">
    {item.title}
  </a>

  {#if topPattern}
    <div class="threat-pattern">{PATTERN_NAMES[topPattern.name] ?? topPattern.name}</div>
  {/if}

  {#if item.summary_md}
    <p class="threat-status">{item.summary_md}</p>
  {/if}

  <div class="threat-meta">
    {formatDate(item.published_at || item.analyzed_at)}
    {#if item.source_type === 'speech'} · речь{/if}
    {#if patterns.length > 1}
      <span class="meta-violations"> · {patterns.length} нарушения</span>
    {/if}
    <span class="expand-hint">↗ подробнее</span>
  </div>
</div>

<!-- ── FULLSCREEN MODAL ── -->
{#if open}
<div
  class="modal-overlay"
  on:click={closeModal}
  role="presentation"
>
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
        <span class="threat-tag" style={sevStyle(item.severity)}>{label} {item.severity}/5</span>
        {#if item.source_type === 'speech'}
          <span class="type-badge">речь</span>
        {/if}
      </div>
      <button class="modal-close" on:click={closeModal} aria-label="Закрыть">✕</button>
    </div>

    <!-- Title -->
    <h2 class="modal-title">{item.title}</h2>

    <!-- Summary -->
    {#if item.summary_md}
      <p class="modal-summary">{item.summary_md}</p>
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
        {#each patterns as p, i}
          <div class="violation">
            <div class="violation-top">
              <span class="viol-num">{i + 1}</span>
              <span class="viol-name">{PATTERN_NAMES[p.name] ?? p.name}</span>
              {#if p.level}
                <span class="viol-level">{LEVEL_LABELS[p.level] ?? p.level}</span>
              {/if}
              {#if p.confidence}
                <span class="viol-conf" style="color:{CONF_COLOR[p.confidence] ?? 'var(--text3)'}">
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
      <span class="modal-date">{formatDate(item.published_at || item.analyzed_at)}</span>
      {#if item.url}
        <a class="modal-link" href={item.url} target="_blank" rel="noopener">
          Открыть источник →
        </a>
      {/if}
    </div>
  </div>
</div>
{/if}

<style>
  /* ── CARD ── */
  .threat-card {
    background: linear-gradient(180deg, rgba(22,27,38,.96) 0%, rgba(18,22,31,.96) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 14px 12px;
    cursor: pointer;
    animation: fadeIn 0.4s ease;
    transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .threat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(0,0,0,.28);
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
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.96rem;
    font-weight: 650;
    line-height: 1.4;
    color: #eef2fb;
    min-height: 4.1em;
    margin-bottom: 10px;
  }

  .threat-title:hover { text-decoration: underline; }

  .threat-pattern {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--orange);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }

  .threat-status {
    font-size: 0.79rem;
    line-height: 1.4;
    color: var(--text2);
    margin-bottom: 6px;
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

  .meta-violations { color: var(--text3); }

  .expand-hint {
    margin-left: auto;
    font-size: 0.66rem;
    color: var(--text3);
    opacity: 0;
    transition: opacity 0.15s;
  }
  .threat-card:hover .expand-hint { opacity: 1; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
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
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── MODAL PANEL ── */
  .modal {
    width: 100%;
    max-width: 720px;
    background: linear-gradient(160deg, #151a28 0%, #0f1320 100%);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 24px 28px 28px;
    animation: modalIn 0.22s cubic-bezier(.16,1,.3,1);
    flex-shrink: 0;
  }

  @keyframes modalIn {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
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
    background: #1a1f2e;
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
    transition: color 0.15s, border-color 0.15s, background 0.15s;
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
    color: #eef2fb;
    margin-bottom: 14px;
  }

  .modal-summary {
    font-size: 0.88rem;
    line-height: 1.6;
    color: var(--text2);
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border2);
  }

  /* ── VIOLATIONS ── */
  .violations-wrap {
    margin-bottom: 24px;
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
    background: #1e2d4a;
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

  .violation {
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 10px;
  }
  .violation:last-child { margin-bottom: 0; }

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
    justify-content: space-between;
    padding-top: 18px;
    border-top: 1px solid var(--border2);
    gap: 12px;
  }

  .modal-date {
    font-size: 0.72rem;
    color: var(--text3);
  }

  .modal-link {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--blue);
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .modal-link:hover { opacity: 0.75; text-decoration: underline; }
</style>
