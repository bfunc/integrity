<script>
  let lang = "ru";
  console.log("version 2026-04-21.5");
</script>

<svelte:head>
  {#if lang === "ru"}
    <title>Integrity — Почему человечество не может договориться</title>
    <meta
      name="description"
      content="О провале координации — системной причине, по которой человечество не справляется с климатом, пандемиями и другими общими угрозами. И о том, как интернет и ИИ сделали это хуже."
    />
  {:else if lang === "en"}
    <title>Integrity — Why Humanity Fails to Coordinate</title>
    <meta
      name="description"
      content="On coordination failure — the structural reason humanity struggles with climate, pandemics, and shared threats. And how the internet and AI made it worse."
    />
  {:else}
    <title
      >Integrity — Warum die Menschheit scheitert sich zu koordinieren</title
    >
    <meta
      name="description"
      content="Über das Koordinationsversagen — den strukturellen Grund, warum die Menschheit beim Klimawandel, Pandemien und anderen gemeinsamen Bedrohungen scheitert."
    />
  {/if}
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
  <!-- HEADER -->
  <header class="site-header">
    <a href="/" class="wordmark">Integrity</a>
    <nav class="lang-nav" aria-label="Language">
      <button class:active={lang === "ru"} on:click={() => (lang = "ru")}
        >RU</button
      >
      <button class:active={lang === "en"} on:click={() => (lang = "en")}
        >EN</button
      >
      <button class:active={lang === "de"} on:click={() => (lang = "de")}
        >DE</button
      >
    </nav>
  </header>

  <!-- RUSSIAN -->
  {#if lang === "ru"}
    <article class="content" lang="ru">
      <section class="hero">
        <h1>
          Вам никогда не казалось странным, что в детском саду детей учат
          делиться, не обижать слабых и не обманывать — а потом что-то меняется?
        </h1>
        <p class="subheadline">
          В школе об этом говорят всё реже. Зато появляются «правильные» версии
          истории. А во взрослой жизни правила и вовсе другие: конкурируй и
          побеждай.
        </p>
      </section>

      <div class="divider" aria-hidden="true"></div>

      <section aria-labelledby="pattern-heading">
        <h2 id="pattern-heading">
          Это реальный и хорошо задокументированный паттерн
        </h2>

        <p>
          У него даже есть название в социологии — скрытая учебная программа
          (hidden curriculum). Формально школа учит математике и истории.
          Неформально — учит подчинению, конкуренции, лояльности к нарративу
          государства.
        </p>

        <p>Механизм примерно такой:</p>

        <p>
          <strong>Детский сад</strong> — кооперация, потому что маленький ребёнок
          без неё буквально не выживает в группе. Это функционально необходимо.
        </p>

        <p>
          <strong>Начальная школа</strong> — постепенный переход. Оценки начинают
          создавать иерархию. Но риторика ещё про "дружбу".
        </p>

        <p>
          <strong>Средняя и старшая школа</strong> — конкуренция становится явной
          (рейтинги, ЕГЭ/экзамены, поступление). История переписывается под государственный
          нарратив. Это не случайность — учебники утверждает министерство.
        </p>

        <p>
          <strong>Взрослая жизнь</strong> — рынок труда, карьера, "выживает сильнейший".
          Кооперативные ценности теперь называют наивностью.
        </p>
      </section>

      <div class="divider" aria-hidden="true"></div>

      <section aria-labelledby="systemic-heading">
        <h2 id="systemic-heading">Это не заговор и не план</h2>

        <p>
          Это системный дрейф. Каждый уровень оптимизирован под свою задачу —
          государство хочет управляемых граждан, рынок хочет конкурентоспособных
          работников. Детсадовские ценности просто перестают быть функционально
          нужными системе.
        </p>

        <p>
          Парадокс в том, что именно кооперативные ценности — доверие,
          взаимопомощь, честность — это то, на чём держатся здоровые институты.
          То самое, что ты защищает Project Integrity.
        </p>

        <p>
          То есть система буквально вытренировывает из людей иммунитет к
          манипуляции — и заменяет его уязвимостью к ней.
        </p>
      </section>

      <section class="closing">
        <p class="honest">
          Это основной механизм, который мы должны понять и изменить.
        </p>
        <p class="working">Мы работаем над этим.</p>
      </section>
    </article>

    <!-- ENGLISH (under construction) -->
  {:else if lang === "en"}
    <article class="content under-construction" lang="en">
      <section class="hero">
        <h1>English version</h1>
        <p class="subheadline">
          This version is under construction. Please check back soon.
        </p>
      </section>
    </article>

    <!-- GERMAN (under construction) -->
  {:else}
    <article class="content under-construction" lang="de">
      <section class="hero">
        <h1>Deutsche Version</h1>
        <p class="subheadline">
          Diese Version ist in Bearbeitung. Bitte schauen Sie bald wieder
          vorbei.
        </p>
      </section>
    </article>
  {/if}

  <footer class="site-footer">
    <span>integrity.how</span>
    <span class="footer-sep">—</span>
    <span>2025</span>
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

  /* HEADER */
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

  .lang-nav {
    display: flex;
    gap: 4px;
  }

  .lang-nav button {
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #888;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    padding: 4px 8px;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .lang-nav button:hover {
    color: #1a1a1a;
    border-color: #ccc;
  }

  .lang-nav button.active {
    color: #1b3a6b;
    border-color: #1b3a6b;
  }

  /* CONTENT */
  .content {
    flex: 1;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px 80px;
    width: 100%;
  }

  /* HERO */
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
    max-width: 600px;
  }

  /* SECTIONS */
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

  .sources {
    color: #999;
    font-size: 0.8rem;
    line-height: 1.55;
    padding-left: 1rem;
    border-left: 2px solid #e0dbd2;
    margin-top: -10px;
    margin-bottom: 24px;
  }

  /* DIVIDER */
  .divider {
    border: none;
    border-top: 1px solid #ddd8cf;
    margin-bottom: 56px;
  }

  /* CLOSING */
  .closing {
    padding-bottom: 0;
  }

  .honest {
    color: #555;
    font-style: italic;
    margin-bottom: 16px;
  }

  .working {
    font-family: "Playfair Display", Georgia, serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: #1b3a6b;
    margin-bottom: 48px;
  }

  /* UNDER CONSTRUCTION */
  .under-construction h1 {
    font-size: 2rem;
    color: #888;
  }

  .under-construction .subheadline {
    color: #999;
  }

  /* FOOTER */
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

  /* MOBILE */
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
