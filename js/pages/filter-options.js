import {
  getFilterValues,
  getProductsForCategory,
  getProductsByMultiValueField
} from "../services/product-filter.js";

export function renderFilterOptionsPage(
  container,
  sport,
  category,
  products,
  filterType
) {
  const categoryProducts = getProductsForCategory(
    products,
    sport,
    category
  );

  const config = getFilterConfig(filterType);

  if (!config) {
    renderMissing(container);
    return;
  }

  const values = getFilterValues(
    categoryProducts,
    config.fieldName
  );

  container.innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="#/">Home</a>
      <span aria-hidden="true">›</span>
      <a href="#/sport/${sport.id}">${escapeHtml(sport.name)}</a>
      <span aria-hidden="true">›</span>
      <a href="#/sport/${sport.id}/category/${category.id}">
        ${escapeHtml(category.name)}
      </a>
      <span aria-hidden="true">›</span>
      <span>${escapeHtml(config.title)}</span>
    </nav>

    <a
      class="back-button"
      href="#/sport/${sport.id}/category/${category.id}"
    >
      <span aria-hidden="true">←</span>
      <span>Back to Browse Options</span>
    </a>

    <section class="section-heading">
      <p class="eyebrow">${escapeHtml(category.name)} · ${escapeHtml(config.title)}</p>
      <h1 class="page-title">${escapeHtml(config.heading)}</h1>
      <p class="page-description">${escapeHtml(config.description)}</p>
    </section>

    <section id="filter-option-grid" class="filter-option-grid"></section>
  `;

  const grid = container.querySelector("#filter-option-grid");

  if (values.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h2>No options found</h2>
        <p>
          Add values to the ${escapeHtml(config.fieldName)} column in Google Sheets.
        </p>
      </div>
    `;
    return;
  }

  values.forEach((value) => {
    const count = getProductsByMultiValueField(
      categoryProducts,
      config.fieldName,
      value
    ).length;

    const link = document.createElement("a");
    link.className = "filter-option-card";
    link.href =
      `#/sport/${sport.id}/category/${category.id}/` +
      `${filterType}/${encodeURIComponent(value)}`;

    link.innerHTML = `
      <div>
        <h2>${escapeHtml(value)}</h2>
        <p>${count} ${count === 1 ? "product" : "products"}</p>
      </div>
      <span class="circle-arrow" aria-hidden="true">→</span>
    `;

    grid.append(link);
  });
}

function getFilterConfig(filterType) {
  const configs = {
    ability: {
      fieldName: "Ability",
      title: "Shop by Ability",
      heading: "Choose an ability level",
      description: "See products that match the customer's experience level."
    },
    terrain: {
      fieldName: "Terrain",
      title: "Shop by Terrain",
      heading: "Choose a terrain type",
      description: "Browse products by where and how they are designed to be used."
    }
  };

  return configs[filterType];
}

function renderMissing(container) {
  container.innerHTML = `
    <section class="section-heading">
      <p class="eyebrow">Not found</p>
      <h1 class="page-title">That filter is unavailable.</h1>
    </section>
    <a class="back-button" href="#/">Back to Home</a>
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
