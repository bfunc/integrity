<script>
  let lang = "ru";
  console.log("version 2026-04-21.2");
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
          Мы — самый кооперативный вид на Земле, и в то же время не можем
          договориться ни о чём по-настоящему важном.
        </h1>
        <p class="subheadline">
          Провал координации — это не политическая драма и не чья-то моральная
          слабость. Это системный сбой, который делает нас слепыми ко всем
          остальным угрозам сразу.
        </p>
      </section>

      <div class="divider" aria-hidden="true"></div>

      <section aria-labelledby="problem-heading">
        <h2 id="problem-heading">Структура проблемы</h2>

        <p>
          Климатический кризис изучен вдоль и поперёк. Сотни стран подписали
          соглашения, технологии дешевеют, решения известны — а выбросы всё
          равно растут. COVID-19 показал, что ни одна страна не может защититься
          в одиночку. Но именно в момент, когда сотрудничество было жизненно
          важно, государства закрылись и начали конкурировать за вакцины.
          Ядерное оружие существует восемьдесят лет. Все понимают, чем
          закончится его применение — и всё же оно остаётся с нами.
        </p>

        <p>Это не цепочка случайностей. Это повторяющийся паттерн.</p>

        <p>
          Привычное объяснение — «глупые лидеры», «жадные корпорации», «злой
          умысел». Но оно не работает. Большинство участников действуют
          рационально в рамках своих интересов. Проблема — в самой структуре
          взаимодействия. Это классическая дилемма заключённого: когда выгоднее
          отказаться от сотрудничества, даже если всем от этого станет хуже.
        </p>

        <p class="sources">
          Schelling, T. (1960). The Strategy of Conflict. Harvard University
          Press. · Axelrod, R. (1984). The Evolution of Cooperation. Basic
          Books.
        </p>

        <p>
          Мы не «рациональные агенты, которым мешают эмоции». Мы — продукт
          эволюции, оптимизированной для малых групп, стабильной среды и
          медленного изменения мира. Доверие тем, кто разделяет наши убеждения.
          Настороженность к чужакам. Воспринимать угрозу идентичности как личную
          атаку — даже если речь идёт о фактах. Это не сбой и не слабость
          характера. Это архитектура, которая работала сотни тысяч лет — и
          перестала работать именно сейчас, когда среда изменилась быстрее чем
          успевает эволюция. Задача не в том чтобы «преодолеть» себя — а в том
          чтобы скорректировать среду и институты под то, чем мы на самом деле
          являемся.
        </p>

        <p class="sources">
          Kahneman, D. (2011). Thinking, Fast and Slow. Farrar, Straus and
          Giroux. · Kahan, D. et al. (2012). The polarizing impact of science
          literacy on perceived climate change risks. Nature Climate Change. ·
          Mercier, H. &amp; Sperber, D. (2011). Why do humans reason? Behavioral
          and Brain Sciences.
        </p>
      </section>

      <div class="divider" aria-hidden="true"></div>

      <section aria-labelledby="internet-heading">
        <h2 id="internet-heading">Как интернет сделал всё хуже</h2>

        <p>
          Социальные сети не придумали когнитивные искажения — они построили для
          них инфраструктуру. Алгоритмы, заточенные под удержание внимания,
          продвигают контент, который вызывает сильные эмоции: страх, злость,
          чувство «своих» и «чужих». Не потому что кто-то хотел манипулировать
          обществом, а потому что это просто работает.
        </p>

        <p class="sources">
          Brady, W. et al. (2017). Emotion shapes the diffusion of moralized
          content in social networks. PNAS. · Bail, C. et al. (2018). Exposure
          to opposing views on social media can increase political polarization.
          PNAS.
        </p>

        <p>
          Подтверждающее мышление перестало быть личной склонностью — оно стало
          средой обитания. Поиск, ленты, рекомендации — всё персонализировано
          так, чтобы укреплять уже существующие убеждения. Так рождаются
          параллельные реальности, каждая со своей «очевидной» картиной мира.
        </p>

        <p class="sources">
          Pariser, E. (2011). The Filter Bubble. Penguin Press. · Sunstein, C.
          (2017). #Republic: Divided Democracy in the Age of Social Media.
          Princeton University Press.
        </p>

        <p>
          В итоге люди расходятся не только в ценностях — они живут в разных
          версиях реальности. А без общего понимания проблемы невозможно
          договориться о её решении. Координация становится структурно
          недостижимой, даже если все хотят лучшего.
        </p>
      </section>

      <div class="divider" aria-hidden="true"></div>

      <section aria-labelledby="ai-heading">
        <h2 id="ai-heading">ИИ как ускоритель</h2>

        <p>
          Искусственный интеллект не создал эти проблемы, но резко увеличил их
          масштаб. Создание убедительных фейков — текста, изображений, видео,
          голоса — стало почти бесплатным. Персонализированная манипуляция,
          которая раньше требовала огромных ресурсов, теперь доступна каждому.
        </p>

        <p class="sources">
          Goldstein, J. et al. (2023). Generative Language Models and Automated
          Influence Operations. arXiv. · Vaccari, C. &amp; Chadwick, A. (2020).
          Deepfakes and Disinformation. Social Media + Society.
        </p>

        <p>Цена лжи падает до нуля. Цена её опровержения остаётся прежней.</p>

        <p class="sources">
          Vosoughi, S., Roy, D. &amp; Aral, S. (2018). The spread of true and
          false news online. Science, 359(6380).
        </p>

        <p>
          ИИ не «злой» сам по себе. Он усиливает то, что уже есть. Проблема не в
          намерениях. Проблема в усилении уже сломанной среды.
        </p>
      </section>

      <div class="divider" aria-hidden="true"></div>

      <section aria-labelledby="propaganda-heading">
        <h2 id="propaganda-heading">Пропаганда как военный ресурс</h2>

        <p>
          Если лишить пропаганду эффективности, мотивировать общество на войну
          станет значительно дороже. Это гипотеза — но она опирается на
          измеримые механизмы.
        </p>

        <p>
          Дегуманизирующая риторика — «нелюди», «нацисты», «террористы» — не
          просто сопровождает войну. Она создаёт её психологические предпосылки:
          ослабляет моральные табу против насилия и делает преследование чужой
          группы приемлемым. Когда политики используют дегуманизирующие образы
          врага, они создают устойчивый барьер против любого будущего
          сотрудничества — даже когда национальные интересы его требуют.
        </p>

        <p class="sources">
          Maynard, J. &amp; Benesch, S. (2016). Dangerous Speech and Dangerous
          Ideology. Genocide Studies and Prevention. · Ghosn, F. &amp; Bayram,
          A.B. (2025). The cost of dehumanization. Journal of Conflict
          Resolution. · Broockman, D. &amp; Kalla, J. (2023). Reducing support
          for retributive war crimes. Journal of Experimental Social Psychology.
        </p>

        <p>
          Это не означает, что уничтожение пропаганды уничтожит войны — у войн
          много причин. Но пропаганда снижает порог перехода к насилию и
          повышает его цену: из войны труднее выйти, труднее договориться.
          Сделать этот инструмент менее эффективным — значит сделать войну
          стратегически менее привлекательной.
        </p>
      </section>

      <div class="divider" aria-hidden="true"></div>

      <section aria-labelledby="civilization-heading">
        <h2 id="civilization-heading">Почему это цивилизационный риск</h2>

        <p>
          Провал координации — не одна из проблем. Это мета-риск: сбой, который
          делает невозможным решение всех остальных задач. Климат требует
          координации. Предотвращение ядерного конфликта требует координации.
          Регулирование технологий требует координации. Ответ на пандемии
          требует координации.
        </p>

        <p>
          Если механизм коллективного решения повреждён, перестают работать все
          защитные механизмы. И самое опасное: эпистемическую инфраструктуру
          можно разрушить за несколько лет, а восстанавливать её приходится
          десятилетиями.
        </p>
      </section>

      <div class="divider" aria-hidden="true"></div>

      <section aria-labelledby="formal-heading">
        <h2 id="formal-heading">Формальная структура проблемы</h2>

        <p>
          Перечисленные явления — не независимые кризисы. Они образуют единую
          систему с положительной обратной связью.
        </p>

        <p>
          На входе — эволюционно обусловленные когнитивные уязвимости:
          подтверждающее мышление, защита идентичности, трибальная эпистемика.
          Это не патология — это адаптации, оптимальные для малых групп и
          стабильной среды. В условиях глобальной взаимозависимости и
          информационного изобилия они становятся системными уязвимостями.
        </p>

        <p class="sources">
          Haidt, J. (2012). The Righteous Mind. Pantheon. · Henrich, J. (2015).
          The Secret of Our Success. Princeton University Press.
        </p>

        <p>
          На этих уязвимостях работает второй слой — структурные стимулы:
          алгоритмы платформ, максимизирующие вовлечённость через эмоциональную
          активацию; экономика внимания, где возмущение монетизируется лучше
          понимания; акторы — государственные и коммерческие — заинтересованные
          в фрагментации как инструменте влияния.
        </p>

        <p class="sources">
          Wu, T. (2016). The Attention Merchants. Knopf. · Zuboff, S. (2019).
          The Age of Surveillance Capitalism. PublicAffairs.
        </p>

        <p>
          Результат — эпистемическая фрагментация: распад общего информационного
          пространства, в котором возможно коллективное решение проблем. Это не
          метафора. Это операциональный барьер: координация требует общей модели
          реальности; без неё переговоры о решениях невозможны структурно,
          независимо от доброй воли участников.
        </p>

        <p class="sources">
          Habermas, J. (1984). The Theory of Communicative Action. Beacon Press.
          · Sunstein, C. (2009). Going to Extremes. Oxford University Press.
        </p>

        <p>
          Технологическое ускорение — третий слой — снижает стоимость
          производства дезинформации до нуля при сохранении высокой стоимости её
          опровержения. Это асимметрия, структурно выгодная тем, кто
          заинтересован в разрушении общего эпистемического пространства.
        </p>

        <p class="sources">
          Vosoughi, S., Roy, D. &amp; Aral, S. (2018). Science, 359(6380).
        </p>

        <p>
          Система устойчива к локальным вмешательствам: факт-чекинг работает
          медленнее чем распространение лжи; медиаграмотность не меняет
          поведение в условиях высокой когнитивной нагрузки; регуляция платформ
          отстаёт от технологии на годы. Эффективное вмешательство требует
          работы на уровне самой системы — её стимулов, архитектуры и механизмов
          обратной связи.
        </p>
      </section>

      <section class="closing">
        <p class="honest">
          У нас пока нет готового ответа. Мы изучаем, как измерить разрыв между
          тем, какими нас сделала эволюция, и тем, чего требует мир который мы
          построили — и что можно с этим сделать.
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
