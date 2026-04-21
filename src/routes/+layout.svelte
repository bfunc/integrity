<svelte:head>
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
</svelte:head>

<slot />

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    --bg:        #0c0e14;
    --bg2:       #131720;
    --bg3:       #1a1f2e;
    --border:    #252d3e;
    --border2:   #1e2840;
    --text:      #dde4f0;
    --text2:     #8899b4;
    --text3:     #4d5e7a;
    --red:       #ef4444;
    --red-bg:    #1a0808;
    --red-b:     #3d1010;
    --green:     #22c55e;
    --blue:      #60a5fa;
    --purple:    #a78bfa;
    --orange:    #f97316;
    --amber:     #f59e0b;
    --radius:    10px;
  }

  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  :global(a) {
    color: inherit;
    text-decoration: none;
  }
</style>
