<svelte:head>
  <title>aigregator — אודות הפרויקט</title>
  <meta
    name="description"
    content="Project aigregator — תשתית לחוסן ציבורי: זיהוי מניפולציות רטוריות וניתוב אחריותיות ציבורית."
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
    <a href="/" class="wordmark">aigregator</a>
  </header>

  <article class="content" lang="he">
    <section class="hero">
      <h1>Project aigregator — תשתית לחוסן ציבורי.</h1>
      <p class="subheadline">
        זוהי מערכת לזיהוי אוטומטי של מניפולציות רטוריות ולניתוב אחריותיות
        ציבורית.
      </p>
    </section>

    <div class="divider" aria-hidden="true"></div>

    <section aria-labelledby="context-heading">
      <h2 id="context-heading">הקשר</h2>
      <p>
        פרקטיקות סמכותניות מודרניות נשענות לא על כוח בלבד, אלא על ניצול
        שיטתי של הטיות קוגניטיביות: identity-protective cognition,
        backfire effect, tribal epistemics.
      </p>
      <p>
        לחברה אין כיום הגנה יציבה מפני ניצול כזה, ואת הפער הזה בדיוק
        aigregator ממלא.
      </p>
    </section>

    <div class="divider" aria-hidden="true"></div>

    <section aria-labelledby="taxonomy-heading">
      <h2 id="taxonomy-heading">טקסונומיה וכיול</h2>
      <p>
        המערכת משתמשת בטקסונומיית LINZA v0.2.0, המגדירה שלוש מחלקות של
        דפוסים רטוריים: מטכניקות מניפולטיביות ועד טוקסיפיקציה והסתה.
      </p>
      <p>
        הכיול נשען על מחקר אקדמי (Maynard &amp; Benesch, Mendelsohn, Nielsen,
        Vidgen et al.).
      </p>
    </section>

    <div class="divider" aria-hidden="true"></div>

    <section aria-labelledby="unique-heading">
      <h2 id="unique-heading">מה מייחד את aigregator</h2>

      <p>
        aigregator היא מערכת שמזהה אוטומטית מניפולציות מידע ומסבירה כיצד הן
        פועלות.
      </p>

      <p>
        סוכנים סורקים אתרים ומנתחים תכנים כדי לאתר טכניקות מניפולטיביות,
        עיוותים, מהלכים רטוריים סמויים והפרות פוטנציאליות של כללי שיח ציבורי.
      </p>

      <p>
        כל זיהוי מלווה בהסבר: מה בדיוק עוות, באיזו טכניקה, והיכן נשברה הלוגיקה
        או ההקשר.
      </p>

      <p>
        לפני עידן ה-AI, ניתוח כזה לא היה אפשרי בקנה מידה רחב ודורש צוותי
        אנליסטים ובדיקה ידנית.
      </p>

      <p>
        aigregator עושה זאת אוטומטית ובשקיפות, על בסיס סימנים ניתנים לשחזור,
        ולא על בסיס דעות.
      </p>

      <p>
        מקרים שנויים במחלוקת עוברים בוררות אפיסטמית קולקטיבית, שבה משתתפים
        מעריכים את החומר לפי טקסונומיה משותפת.
      </p>

      <p>
        הטקסונומיה רחבה ממודלים קלאסיים: היא כוללת מסגור, החלפת הקשר,
        טריגרים רגשיים, סיבתיות שגויה, מלכודות רטוריות וצורות נוספות של
        עיוות משמעות.
      </p>

      <p>
        לסיכום: aigregator איננה מסנן ואיננה מודרטור, אלא תשתית לשיקום שלמות
        המידע.
      </p>
    </section>
  </article>

  <footer class="site-footer">
    <span>aigregator.how</span>
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

  .divider {
    border: none;
    border-top: 1px solid #ddd8cf;
    margin-bottom: 56px;
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
