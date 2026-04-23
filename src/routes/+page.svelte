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
    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap"
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
          Маленьких детей учат делиться, не обижать слабых и не обманывать, а
          потом что-то меняется?
        </h1>
        <p class="subheadline">
          В школе об этом говорят всё реже, а во взрослой жизни правила и вовсе
          другие: конкурируй и побеждай.
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
          То самое, что защищает Project Integrity.
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
  :global(:root) {
    --bg: #f3f0e8;
    --ink: #1f2328;
    --ink-soft: #3b4047;
    --line: #d9d1bf;
    --brand: #1f4b7f;
    --brand-soft: #335f95;
  }

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

  :global(body) {
    margin: 0;
    background: radial-gradient(circle at 12% 0%, #fff8df 0%, transparent 42%),
      radial-gradient(circle at 88% 8%, #dde7f3 0%, transparent 35%), var(--bg);
    color: var(--ink);
    font-family: "Manrope", "Segoe UI", sans-serif;
  }

  .site {
    background: transparent;
    color: var(--ink);
    font-family: "Manrope", "Segoe UI", sans-serif;
    line-height: 1.72;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* HEADER */
  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
    border-bottom: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
  }

  .wordmark {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: 0.11em;
    color: var(--brand);
    text-decoration: none;
    text-transform: uppercase;
  }

  .lang-nav {
    display: flex;
    gap: 4px;
  }

  .lang-nav button {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 999px;
    color: #6c727a;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    padding: 5px 10px;
    transition:
      color 0.15s,
      border-color 0.15s,
      background-color 0.15s;
  }

  .lang-nav button:hover {
    color: var(--brand);
    border-color: #b7c5d7;
    background-color: #eff3f8;
  }

  .lang-nav button.active {
    color: var(--brand);
    border-color: var(--brand-soft);
    background-color: #ecf1f8;
  }

  /* CONTENT */
  .content {
    flex: 1;
    max-width: 760px;
    margin: 0 auto;
    padding: 44px 24px 84px;
    width: 100%;
  }

  /* HERO */
  .hero {
    padding-bottom: 48px;
  }

  h1 {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: clamp(2rem, 4.2vw, 2.75rem);
    font-weight: 600;
    line-height: 1.16;
    color: #20242b;
    letter-spacing: -0.006em;
    margin-bottom: 1.5rem;
    max-width: 13ch;
    text-wrap: balance;
  }

  .subheadline {
    font-size: clamp(1.04rem, 2.1vw, 1.18rem);
    line-height: 1.7;
    color: var(--ink-soft);
    font-style: italic;
    max-width: 58ch;
  }

  /* SECTIONS */
  section {
    padding-bottom: 52px;
  }

  h2 {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: clamp(1.55rem, 2.2vw, 1.95rem);
    font-weight: 600;
    color: var(--brand);
    margin-bottom: 18px;
    letter-spacing: 0;
    line-height: 1.2;
    max-width: 32ch;
    text-wrap: balance;
  }

  p {
    margin-bottom: 18px;
    font-size: 1.03rem;
    line-height: 1.78;
    color: #232730;
  }

  p:last-child {
    margin-bottom: 0;
  }

  /* DIVIDER */
  .divider {
    border: none;
    border-top: 1px solid var(--line);
    margin-bottom: 52px;
    opacity: 0.95;
  }

  /* CLOSING */
  .closing {
    padding-bottom: 0;
  }

  .honest {
    color: #5f6570;
    font-style: italic;
    margin-bottom: 16px;
  }

  .working {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--brand);
    margin-bottom: 48px;
  }

  /* UNDER CONSTRUCTION */
  .under-construction h1 {
    font-size: 2rem;
    color: #7b7f85;
    max-width: none;
  }

  .under-construction .subheadline {
    color: #8a8f97;
  }

  /* FOOTER */
  .site-footer {
    padding: 24px;
    text-align: center;
    font-size: 0.8rem;
    color: #8e959f;
    letter-spacing: 0.04em;
    border-top: 1px solid #e1d9ca;
  }

  .footer-sep {
    margin: 0 8px;
  }

  .hero h1,
  .hero .subheadline,
  section h2,
  section p,
  .divider {
    animation: reveal-up 420ms ease both;
  }

  .hero .subheadline {
    animation-delay: 90ms;
  }

  section h2 {
    animation-delay: 130ms;
  }

  @keyframes reveal-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
      font-size: 1.8rem;
      max-width: 100%;
      line-height: 1.18;
    }

    h2 {
      font-size: 1.45rem;
      max-width: 100%;
    }

    p {
      font-size: 0.99rem;
    }
  }
</style>
