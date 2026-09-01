import { showToast } from "../components/toast.js";

export function renderLearningPathsPage(container, sport, category, products) {
  const categoryProducts = products.filter(
    (product) =>
      String(product.SportID || "").toUpperCase() ===
        String(sport.sourceId || sport.id || "").toUpperCase() &&
      String(product.CategoryID || "").toUpperCase() ===
        String(category.sourceId || category.id || "").toUpperCase()
  );

  const productLabel = category.name || "Products";
  const heroClass =
    sport.id === "ski" ? "path-hero--skiing" : "path-hero--snowboarding";

  container.innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="#/">Home</a>
      <span aria-hidden="true">›</span>
      <a href="#/sport/${sport.id}">${escapeHtml(sport.name)}</a>
      <span aria-hidden="true">›</span>
      <span>${escapeHtml(productLabel)}</span>
    </nav>

    <section class="path-hero ${heroClass}">
      <div class="path-hero__content">
        <p class="eyebrow">${escapeHtml(sport.name)} · ${escapeHtml(productLabel)}</p>
        <h1>How would you like to learn?</h1>
        <p>Choose the path that best matches the customer conversation.</p>
      </div>

      <div class="path-hero__count">
        <strong>${categoryProducts.length}</strong>
        <span>${categoryProducts.length === 1 ? "Product" : "Products"}</span>
      </div>
    </section>

    <section class="learning-path-grid" aria-label="${escapeHtml(productLabel)} learning paths">
      ${createPathCard("brand", "Shop by Brand", "Browse products by manufacturer.", "tag", "orange")}
      ${createPathCard("ability", "Shop by Ability", "Match products to experience level.", "person", "blue")}
      ${createPathCard("terrain", "Shop by Terrain", "Browse by where and how it is used.", "mountain", "green")}
      ${createPathCard("favorites", "Store Favorites", "Start with the products your team recommends most.", "star", "yellow")}
      ${createPathCard("new", "New This Season", "Review the newest products in the lineup.", "sparkles", "purple")}
      ${createPathCard("all", `View All ${escapeHtml(productLabel)}`, `${categoryProducts.length} currently available.`, "grid", "purple")}
    </section>
  `;

  container.querySelectorAll("[data-path]").forEach((button) => {
    button.addEventListener("click", () => {
      const path = button.dataset.path;

      if (path === "brand") {
        window.location.hash =
          `#/sport/${sport.id}/category/${category.id}/brands`;
        return;
      }

      if (path === "ability" || path === "terrain") {
        window.location.hash =
          `#/sport/${sport.id}/category/${category.id}/${path}`;
        return;
      }

      if (path === "favorites" || path === "new") {
        window.location.hash =
          `#/sport/${sport.id}/category/${category.id}/${path}`;
        return;
      }

      if (path === "all") {
        window.location.hash =
          `#/sport/${sport.id}/category/${category.id}/products`;
        return;
      }

      showToast(`${button.dataset.label} comes in a future release.`);
    });
  });
}

function createPathCard(path, title, description, iconName, accent) {
  return `
    <button
      class="learning-path-card learning-path-card--${accent}"
      type="button"
      data-path="${escapeHtml(path)}"
      data-label="${escapeHtml(title)}"
    >
      <span class="learning-path-card__icon" aria-hidden="true">
        ${getIcon(iconName)}
      </span>

      <span class="learning-path-card__content">
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(description)}</small>
      </span>

      <span class="circle-arrow" aria-hidden="true">→</span>
    </button>
  `;
}

function getIcon(name) {
  const icons = {
    tag: `<svg viewBox="0 0 24 24"><path d="M20 13 11 22l-9-9V4h9z"></path><circle cx="7.5" cy="8.5" r="1.5"></circle></svg>`,
    person: `<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"></circle><path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6"></path></svg>`,
    mountain: `<svg viewBox="0 0 24 24"><path d="m3 20 6-11 4 7 2-4 6 8"></path></svg>`,
    star: `<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"></path></svg>`,
    sparkles: `<svg viewBox="0 0 24 24"><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"></path><path d="m18 15 .8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"></path></svg>`,
    grid: `<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>`
  };
  return icons[name] || icons.grid;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
