const pageContent = {
  products: {
    title: "Products",
    description: "Manage the products available in Playbook.",
  },
  import: {
    title: "Import",
    description: "Bring product information into Playbook.",
  },
  brands: {
    title: "Brands",
    description: "Organize and maintain the brands in your catalog.",
  },
  categories: {
    title: "Categories",
    description: "Structure products into clear, useful categories.",
  },
  settings: {
    title: "Settings",
    description: "Configure your Playbook Admin workspace.",
  },
};

const statCards = [
  { label: "Products", icon: "box" },
  { label: "Needs Review", icon: "review" },
  { label: "Published", icon: "check" },
  { label: "Archived", icon: "archive" },
];

const icons = {
  box: '<path d="m4 7 8-4 8 4-8 4z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4z"/>',
  review: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/>',
  archive: '<path d="M4 7h16v13H4zM3 3h18v4H3zM9 11h6"/>',
};

const main = document.querySelector("#main-content");
const navItems = [...document.querySelectorAll("[data-page]")];
const menuButton = document.querySelector(".menu-button");
const backdrop = document.querySelector(".sidebar-backdrop");

function getPageFromHash() {
  const page = window.location.hash.replace(/^#\//, "").split("/")[0];
  return page === "dashboard" || pageContent[page] ? page : "dashboard";
}

function renderHeading(title, description) {
  return `
    <header class="page-heading">
      <div>
        <p class="eyebrow">Overview</p>
        <h2>${title}</h2>
        <p>${description}</p>
      </div>
    </header>
  `;
}

function renderDashboard() {
  const cards = statCards.map(({ label, icon }) => `
    <article class="stat-card">
      <div class="stat-card__header">
        <p class="stat-card__label">${label}</p>
        <span class="stat-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">${icons[icon]}</svg>
        </span>
      </div>
      <p class="stat-card__value">—</p>
      <p class="stat-card__note">Data will appear here</p>
    </article>
  `).join("");

  main.innerHTML = `
    ${renderHeading("Dashboard", "A quick view of your Playbook catalog.")}
    <section class="stat-grid" aria-label="Catalog summary">${cards}</section>
  `;
}

function renderPlaceholder(page) {
  const { title, description } = pageContent[page];
  main.innerHTML = `
    ${renderHeading(title, description)}
    <section class="empty-state">
      <div>
        <span class="empty-state__icon" aria-hidden="true">${title.charAt(0)}</span>
        <h3>${title} workspace</h3>
        <p>This area is ready for the next phase of Playbook Admin development.</p>
      </div>
    </section>
  `;
}

function closeNavigation() {
  document.body.classList.remove("nav-open");
  menuButton.setAttribute("aria-expanded", "false");
}

function renderPage() {
  const page = getPageFromHash();

  navItems.forEach((item) => {
    if (item.dataset.page === page) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });

  if (page === "dashboard") {
    renderDashboard();
  } else {
    renderPlaceholder(page);
  }

  closeNavigation();
  main.focus({ preventScroll: true });
  document.title = `${page === "dashboard" ? "Dashboard" : pageContent[page].title} | Playbook Admin`;
}

menuButton.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("nav-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

backdrop.addEventListener("click", closeNavigation);
window.addEventListener("hashchange", renderPage);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavigation();
});

if (!window.location.hash) {
  window.location.replace("#/dashboard");
} else {
  renderPage();
}
