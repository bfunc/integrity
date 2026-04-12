<script>
  export let item;

  // severity → color tokens matching demo palette
  const SEV_COLOR = {
    3: { bg: '#1c0f00', border: '#4a2500', text: '#fb923c' },
    4: { bg: '#1a0808', border: '#3d1010', text: '#fca5a5' },
    5: { bg: '#1a0808', border: '#5a0e0e', text: '#ef4444' },
  };

  function sevStyle(s) {
    const c = SEV_COLOR[s] || { bg: '#0f172a', border: '#1e293b', text: '#818cf8' };
    return `background:${c.bg};border-color:${c.border};color:${c.text}`;
  }

  function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  $: topPattern = Array.isArray(item.patterns) ? item.patterns[0] : null;
  $: label = item.severity_label || '';
</script>

<div
  class="threat-card"
  style="border-color: {SEV_COLOR[item.severity]?.border ?? 'var(--border)'}"
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
    <div class="threat-pattern">{topPattern.name}</div>
  {/if}

  {#if item.summary_md}
    <p class="threat-status">{item.summary_md}</p>
  {/if}

  <div class="threat-meta">
    {formatDate(item.published_at || item.analyzed_at)}
    {#if item.source_type === 'speech'} · речь{/if}
  </div>
</div>

<style>
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
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
