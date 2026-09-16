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

  if (filter.type === "ability" || filter.type === "terrain" || filter.type === "gender") {
    const fieldName =
      filter.type === "ability"
        ? "Ability"
        : filter.type === "terrain"
        ? "Terrain"
        : "Gender";

    filteredProducts = getProductsByMultiValueField(
      categoryProducts,
      fieldName,
      filter.value
    );

    heading = filter.value;
    eyebrow =
      `${category.name} · ` +
      `${filter.type === "ability" ? "Shop by Ability" : filter.type === "terrain" ? "Shop by Terrain" : "Shop by Gender"}`;

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

  const baseProducts = [...filteredProducts];

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
        <span data-product-count>${baseProducts.length}</span>
        <span data-product-count-label>${baseProducts.length === 1 ? "product" : "products"}</span>
      </p>
    </section>

    <section class="product-list-tools" aria-label="Product list controls">
      <label class="product-list-search">
        <span class="sr-only">Search products</span>
        <input type="search" placeholder="Search brand or model" data-product-list-search>
      </label>
      <label class="product-list-sort">
        <span>Sort</span>
        <select data-product-list-sort>
          <option value="name">Name A-Z</option>
          <option value="brand">Brand A-Z</option>
          <option value="price-low">Price Low-High</option>
          <option value="price-high">Price High-Low</option>
        </select>
      </label>
    </section>

    <section id="product-list" class="product-list" aria-label="Products"></section>
  `;

  const list = container.querySelector("#product-list");
  const searchInput = container.querySelector("[data-product-list-search]");
  const sortSelect = container.querySelector("[data-product-list-sort]");
  const count = container.querySelector("[data-product-count]");
  const countLabel = container.querySelector("[data-product-count-label]");

  const renderProducts = () => {
    const query = normalizeSearch(searchInput?.value || "");
    const visibleProducts = sortProducts(
      baseProducts.filter((product) => {
        if (!query) return true;
        const brand = getBrandById(brands, product.BrandID);
        const searchable = normalizeSearch([
          brand?.Name,
          product.BrandID,
          product.Model,
          product.Season,
          product.Gender,
          product.Ability,
          product.Terrain
        ].filter(Boolean).join(" "));
        return searchable.includes(query);
      }),
      sortSelect?.value || "name",
      brands
    );

    if (count) count.textContent = String(visibleProducts.length);
    if (countLabel) {
      countLabel.textContent = visibleProducts.length === 1 ? "product" : "products";
    }
    list.innerHTML = "";

    if (visibleProducts.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <h2>No products found</h2>
          <p>Try a different search or sort option.</p>
        </div>
      `;
      return;
    }

    visibleProducts.forEach((product) => {
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
  };

  if (baseProducts.length === 0) {
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

  searchInput?.addEventListener("input", renderProducts);
  sortSelect?.addEventListener("change", renderProducts);
  renderProducts();
}

function sortProducts(products, sortValue, brands) {
  return [...products].sort((a, b) => {
    if (sortValue === "brand") {
      return getBrandLabel(a, brands).localeCompare(getBrandLabel(b, brands)) ||
        getProductName(a).localeCompare(getProductName(b));
    }
    if (sortValue === "price-low" || sortValue === "price-high") {
      const direction = sortValue === "price-low" ? 1 : -1;
      const aPrice = Number(a.MSRP);
      const bPrice = Number(b.MSRP);
      const aValid = Number.isFinite(aPrice);
      const bValid = Number.isFinite(bPrice);
      if (aValid && bValid && aPrice !== bPrice) return (aPrice - bPrice) * direction;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return getProductName(a).localeCompare(getProductName(b));
    }
    return getProductName(a).localeCompare(getProductName(b));
  });
}

function getProductName(product) {
  return String(product.Model || "");
}

function getBrandLabel(product, brands) {
  const brand = getBrandById(brands, product.BrandID);
  return String(brand?.Name || product.BrandID || "");
}

function normalizeSearch(value) {
  return String(value || "").trim().toLowerCase();
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
