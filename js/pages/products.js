import { createProductCard } from "../components/product-card.js";
import {
  getBrandById,
  getProductsByBrand,
  getProductsByFlag,
  getProductsByMultiValueField,
  getProductsForCategory
} from "../services/product-filter.js";

export function renderProductListPage(
  container,
  sport,
  category,
  products,
  brands,
  filter
) {
  const categoryProducts = getProductsForCategory(
    products,
    sport,
    category
  );

  let filteredProducts = categoryProducts;
  let heading = `All ${category.name}`;
  let eyebrow = `${sport.name} · ${category.name}`;
  let showBrand = true;
  let backHref = `#/sport/${sport.id}/category/${category.id}`;

  if (filter.type === "brand") {
    const brand = getBrandById(brands, filter.value);

    if (!brand) {
      renderMissing(container, "Brand not found");
      return;
    }

    filteredProducts = getProductsByBrand(
      categoryProducts,
      brand.BrandID
    );

    heading = brand.Name;
    eyebrow = `${category.name} · Shop by Brand`;
    showBrand = false;
    backHref =
      `#/sport/${sport.id}/category/${category.id}/brands`;
  }

  if (filter.type === "ability" || filter.type === "terrain") {
    const fieldName =
      filter.type === "ability" ? "Ability" : "Terrain";

    filteredProducts = getProductsByMultiValueField(
      categoryProducts,
      fieldName,
      filter.value
    );

    heading = filter.value;
    eyebrow =
      `${category.name} · ` +
      `${filter.type === "ability" ? "Shop by Ability" : "Shop by Terrain"}`;

    backHref =
      `#/sport/${sport.id}/category/${category.id}/${filter.type}`;
  }

  if (filter.type === "favorites") {
    filteredProducts = getProductsByFlag(
      categoryProducts,
      "StoreFavorite"
    );

    heading = "Store Favorites";
    eyebrow = `${category.name} · Team Recommendations`;
  }

  if (filter.type === "new") {
    filteredProducts = getProductsByFlag(
      categoryProducts,
      "NewThisSeason"
    );

    heading = "New This Season";
    eyebrow = `${category.name} · New Products`;
  }

  filteredProducts.sort((a, b) =>
    String(a.Model || "").localeCompare(String(b.Model || ""))
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
      <span>${escapeHtml(heading)}</span>
    </nav>

    <a class="back-button" href="${backHref}">
      <span aria-hidden="true">←</span>
      <span>Back</span>
    </a>

    <section class="section-heading">
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h1 class="page-title">${escapeHtml(heading)}</h1>
      <p class="page-description">
        ${filteredProducts.length}
        ${filteredProducts.length === 1 ? "product" : "products"}
      </p>
    </section>

    <section id="product-list" class="product-list" aria-label="Products"></section>
  `;

  const list = container.querySelector("#product-list");

  if (filteredProducts.length === 0) {
    const fieldName =
      filter.type === "favorites"
        ? "StoreFavorite"
        : filter.type === "new"
        ? "NewThisSeason"
        : "";

    list.innerHTML = `
      <div class="empty-state">
        <h2>No products found</h2>
        <p>
          ${
            fieldName
              ? `Add a ${escapeHtml(fieldName)} column to the Products sheet and mark products TRUE.`
              : "Check the matching fields and Active status in Google Sheets."
          }
        </p>
      </div>
    `;
    return;
  }

  filteredProducts.forEach((product) => {
    const brand = getBrandById(brands, product.BrandID);

    list.append(
      createProductCard(
        product,
        brand,
        `#/product/${String(product.ProductID).toLowerCase()}`,
        { showBrand }
      )
    );
  });
}

function renderMissing(container, message) {
  container.innerHTML = `
    <section class="section-heading">
      <p class="eyebrow">Not found</p>
      <h1 class="page-title">${escapeHtml(message)}</h1>
      <p class="page-description">
        Return to the previous screen and try again.
      </p>
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
