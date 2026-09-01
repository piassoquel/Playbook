import { createBrandCard } from "../components/brand-card.js";
import {
  getBrandsWithProducts,
  getProductsForCategory,
  getProductsByBrand
} from "../services/product-filter.js";

export function renderBrandsPage(
  container,
  sport,
  category,
  products,
  brands
) {
  const categoryProducts = getProductsForCategory(
    products,
    sport,
    category
  );

  const availableBrands = getBrandsWithProducts(
    brands,
    categoryProducts
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
      <span>Brands</span>
    </nav>

    <button class="back-button" type="button" data-back-learning-paths>
      <span aria-hidden="true">←</span>
      <span>Back to Browse Options</span>
    </button>

    <section class="section-heading">
      <p class="eyebrow">${escapeHtml(category.name)} · Shop by Brand</p>
      <h1 class="page-title">Choose a brand</h1>
      <p class="page-description">
        Only brands with products in this category are shown.
      </p>
    </section>

    <section id="brand-grid" class="brand-grid" aria-label="Available brands"></section>
  `;

  container
    .querySelector("[data-back-learning-paths]")
    .addEventListener("click", () => {
      window.location.hash =
        `#/sport/${sport.id}/category/${category.id}`;
    });

  const grid = container.querySelector("#brand-grid");

  if (availableBrands.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h2>No brands found</h2>
        <p>
          Add an active product in Google Sheets for this sport and category.
        </p>
      </div>
    `;
    return;
  }

  availableBrands.forEach((brand) => {
    const brandProducts = getProductsByBrand(
      categoryProducts,
      brand.BrandID
    );

    grid.append(
      createBrandCard(
        brand,
        brandProducts.length,
        `#/sport/${sport.id}/category/${category.id}/brand/${String(
          brand.BrandID
        ).toLowerCase()}`
      )
    );
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
