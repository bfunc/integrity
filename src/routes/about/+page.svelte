<svelte:head>
  <title>Integrity — О проекте</title>
  <meta
    name="description"
    content="Project Integrity — инфраструктура общественной устойчивости: обнаружение риторических манипуляций и маршрутизация публичной подотчетности."
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta property="og:type" content="website" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="site">
  <header class="site-header">
    <a href="/" class="wordmark">Integrity</a>
  </header>

  <article class="content" lang="ru">
    <section class="hero">
      <h1>Project Integrity — инфраструктура общественной устойчивости.</h1>
      <p class="subheadline">
        Это система автоматического обнаружения риторических манипуляций и
        маршрутизации публичной подотчётности.
      </p>
    </section>

    <div class="divider" aria-hidden="true"></div>

    <section aria-labelledby="context-heading">
      <h2 id="context-heading">Контекст</h2>
      <p>
        Современные авторитарные практики опираются не на силу, а на
        систематическую эксплуатацию когнитивных искажений: identity-protective
        cognition, backfire effect, tribal epistemics.
      </p>
      <p>
        Общество не имеет надёжной защиты от такой эксплуатации — и именно этот
        пробел закрывает Integrity.
      </p>
    </section>

    <div class="divider" aria-hidden="true"></div>

    <section aria-labelledby="taxonomy-heading">
      <h2 id="taxonomy-heading">Таксономия и калибровка</h2>
      <p>
        Система использует таксономию ЛИНЗА v0.2.0, которая фиксирует три класса
        риторических паттернов — от манипулятивных приёмов до токсикации и
        подстрекательства.
      </p>
      <p>
        Калибровка основана на академических работах (Maynard &amp; Benesch,
        Mendelsohn, Nielsen, Vidgen et al.).
      </p>
    </section>

    <div class="divider" aria-hidden="true"></div>

    <section aria-labelledby="unique-heading">
      <h2 id="unique-heading">Что делает Integrity уникальным</h2>

      <ul class="feature-list">
        <li>
          LLM-агенты публично дебатируют и объясняют выводы в реальном времени.
        </li>
        <li>
          Споры разрешаются через краудсорсинговый эпистемический арбитраж.
        </li>
        <li>
          Таксономия охватывает риторику шире, чем классические модели hate
          speech.
        </li>
      </ul>
      <br />
      <br />
      <i style="color: gray;">
        Integrity — это новый системный класс: коллективная эпистемическая
        инфраструктура безопасности, у которой нет прямых аналогов.</i
      >
    </section>
  </article>

  <footer class="site-footer">
    <span>integrity.how</span>
    <span class="footer-sep">—</span>
    <span>2026</span>
  </footer>
</div>

<style>
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(html) {
    font-size: 18px;
    -webkit-text-size-adjust: 100%;
  }

  .site {
    background: #f7f6f2;
    color: #1a1a1a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue",
      Arial, sans-serif;
    line-height: 1.7;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
  }

  .wordmark {
    font-family: "Playfair Display", Georgia, serif;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #1b3a6b;
    text-decoration: none;
    text-transform: uppercase;
  }

  .content {
    flex: 1;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px 80px;
    width: 100%;
  }

  .hero {
    padding-bottom: 56px;
  }

  h1 {
    font-family: "Playfair Display", Georgia, serif;
    font-size: clamp(2rem, 5vw, 2.25rem);
    font-weight: 700;
    line-height: 1.2;
    color: #1a1a1a;
    letter-spacing: -0.01em;
    margin-bottom: 2rem;
  }

  .subheadline {
    font-size: 1.15rem;
    line-height: 1.65;
    color: #444;
    font-style: italic;
    max-width: 640px;
    margin-bottom: 14px;
  }

  .slogan {
    font-family: "Playfair Display", Georgia, serif;
    font-size: 1.08rem;
    color: #1b3a6b;
  }

  section {
    padding-bottom: 56px;
  }

  h2 {
    font-family: "Playfair Display", Georgia, serif;
    font-size: 1.45rem;
    font-weight: 700;
    color: #1b3a6b;
    margin-bottom: 24px;
    letter-spacing: -0.01em;
  }

  p {
    margin-bottom: 20px;
    font-size: 1rem;
    line-height: 1.75;
    color: #222;
  }

  p:last-child {
    margin-bottom: 0;
  }

  .feature-list {
    list-style: none;
    display: grid;
    gap: 12px;
  }

  .feature-list li {
    position: relative;
    padding-left: 20px;
    color: #222;
    line-height: 1.7;
  }

  .feature-list li::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #1b3a6b;
    position: absolute;
    left: 0;
    top: 0.8em;
  }

  .divider {
    border: none;
    border-top: 1px solid #ddd8cf;
    margin-bottom: 56px;
  }

  .closing {
    padding-bottom: 0;
  }

  .working {
    font-family: "Playfair Display", Georgia, serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: #1b3a6b;
    margin-bottom: 48px;
  }

  .site-footer {
    padding: 24px;
    text-align: center;
    font-size: 0.8rem;
    color: #aaa;
    letter-spacing: 0.04em;
    border-top: 1px solid #e8e4de;
  }

  .footer-sep {
    margin: 0 8px;
  }

  @media (max-width: 600px) {
    .site-header {
      padding: 16px 20px;
    }

    .content {
      padding: 32px 20px 64px;
    }

    h1 {
      font-size: 1.5rem;
    }
  }
</style>
