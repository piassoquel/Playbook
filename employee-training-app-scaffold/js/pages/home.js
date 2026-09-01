export function renderHomePage(container, data) {
  container.innerHTML = `
    <section class="showcase-home">
      <div class="showcase-home__logo-wrap">
        <img
          class="showcase-home__logo"
          src="assets/branding/playbook-logo.svg"
          alt="Playbook — Learn it. Know it. Sell it."
        >
      </div>

      <section class="showcase-sports" aria-label="Departments">
        <a
          class="showcase-sport-card showcase-sport-card--skiing"
          href="#/sport/ski"
          aria-label="Open Skiing"
        >
          <div class="showcase-sport-card__content">
            <span class="showcase-sport-card__badge showcase-sport-card__badge--orange" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m3 20 6-11 4 7 2-4 6 8"></path>
              </svg>
            </span>

            <h1>Skiing</h1>
            <p>Explore skis, boots, bindings, helmets, outerwear, and more.</p>
          </div>

          <span class="showcase-sport-card__arrow showcase-sport-card__arrow--orange" aria-hidden="true">→</span>
        </a>

        <a
          class="showcase-sport-card showcase-sport-card--snowboarding"
          href="#/sport/snb"
          aria-label="Open Snowboarding"
        >
          <div class="showcase-sport-card__content">
            <span class="showcase-sport-card__badge showcase-sport-card__badge--blue" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m3 20 6-11 4 7 2-4 6 8"></path>
              </svg>
            </span>

            <h1>Snowboarding</h1>
            <p>Explore boards, boots, bindings, helmets, outerwear, and more.</p>
          </div>

          <span class="showcase-sport-card__arrow showcase-sport-card__arrow--blue" aria-hidden="true">→</span>
        </a>
      </section>

      <section id="showcase-daily-focus" class="showcase-daily-focus" aria-label="Daily Focus"></section>
    </section>
  `;

  renderDailyFocus(container, data);
}

function renderDailyFocus(container, data) {
  const region = container.querySelector("#showcase-daily-focus");
  const focus = data.dailyFocus;

  if (!focus?.enabled || !focus.productId) {
    region.hidden = true;
    return;
  }

  region.innerHTML = `
    <a
      class="showcase-focus-card"
      href="#/product/${String(focus.productId).toLowerCase()}"
      aria-label="Open Daily Focus: ${escapeHtml(focus.name)}"
    >
      <div class="showcase-focus-card__content">
        <p class="showcase-focus-card__label">Daily Focus</p>
        <small>Today's featured product</small>
        <h2>${escapeHtml(focus.brand)} ${escapeHtml(focus.name)}</h2>
        <p>${escapeHtml(focus.summary || "Open today's featured lesson.")}</p>

        <span class="showcase-focus-card__button">
          Learn More
          <span aria-hidden="true">→</span>
        </span>
      </div>

      <div class="showcase-focus-card__art" aria-hidden="true">
        <span>${escapeHtml(focus.name)}</span>
      </div>
    </a>
  `;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
