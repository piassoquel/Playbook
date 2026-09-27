import { createProductCard } from "../components/product-card.js";
import {
  getBrandById,
  getProductsByBrand,
  getProductsByFlag,
  getFilterValues,
  getProductsByMultiValueField,
  getProductsForCategory
} from "../services/product-filter.js";

// Filter pills shown when browsing a whole category.
const LIST_FILTERS = [
  { key: "terrain", fieldName: "Terrain", label: "Terrain" },
  { key: "ability", fieldName: "Ability", label: "Ability" },
  { key: "gender", fieldName: "Gender", label: "Gender" }
];

const ABILITY_ORDER = ["beginner", "intermediate", "advanced", "expert"];

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

  // Browsing a whole category: filters are pills on the list itself. Old
  // /ability/<value>-style links land here with that pill preselected.
  const isBrowse = ["all", "ability", "terrain", "gender"].includes(filter.type);
  const presetFilters = {};

  if (isBrowse) {
    heading = category.name;
    eyebrow = sport.name;
    backHref = `#/sport/${sport.id}`;
    if (filter.type !== "all" && filter.value) {
      presetFilters[filter.type] = filter.value;
    }
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
  const isSkiBootList = String(sport.sourceId || sport.id).toUpperCase() === "SKI" &&
    ["SKIBOOT", "SKIBOOTS"].includes(String(category.sourceId || category.id).toUpperCase());
  const listStateKey = `playbook-product-list:${window.location.hash}`;
  const savedState = readListState(listStateKey, presetFilters);
  const filterOptions = isBrowse
    ? LIST_FILTERS.map((config) => ({
        ...config,
        values: sortFilterValues(config.key, getFilterValues(baseProducts, config.fieldName))
      })).filter((config) => config.values.length > 1)
    : [];

  container.innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="#/">Home</a>
      <span aria-hidden="true">›</span>
      <a href="#/sport/${sport.id}">${escapeHtml(sport.name)}</a>
      <span aria-hidden="true">›</span>
      ${
        isBrowse
          ? `<span>${escapeHtml(category.name)}</span>`
          : `<a href="#/sport/${sport.id}/category/${category.id}">
               ${escapeHtml(category.name)}
             </a>
             <span aria-hidden="true">›</span>
             <span>${escapeHtml(heading)}</span>`
      }
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
      <div class="product-list-pills">
        ${filterOptions.map((config) => `
          <label class="product-list-pill">
            <span class="sr-only">${escapeHtml(config.label)}</span>
            <select data-product-list-filter="${config.key}">
              <option value="">${escapeHtml(config.label)}: All</option>
              ${config.values.map((value) => `
                <option value="${escapeHtml(value)}">${escapeHtml(value)} (${
                  getProductsByMultiValueField(baseProducts, config.fieldName, value).length
                })</option>
              `).join("")}
            </select>
          </label>
        `).join("")}
        <label class="product-list-pill product-list-pill--sort">
        <span class="sr-only">Sort</span>
        <select data-product-list-sort>
          <option value="name">Sort: Name A-Z</option>
          <option value="brand">Sort: Brand A-Z</option>
          <option value="price-low">Sort: Price Low-High</option>
          <option value="price-high">Sort: Price High-Low</option>
          ${isSkiBootList ? '<option value="last-narrow">Sort: Last Narrow-Wide</option><option value="last-wide">Sort: Last Wide-Narrow</option>' : ""}
        </select>
        </label>
        ${filterOptions.length ? `<button class="product-list-clear" type="button" data-product-list-clear hidden>Clear</button>` : ""}
      </div>
    </section>

    <section id="product-list" class="product-list" aria-label="Products"></section>
  `;

  const list = container.querySelector("#product-list");
  const searchInput = container.querySelector("[data-product-list-search]");
  const sortSelect = container.querySelector("[data-product-list-sort]");
  const count = container.querySelector("[data-product-count]");
  const countLabel = container.querySelector("[data-product-count-label]");
  const filterSelects = [...container.querySelectorAll("[data-product-list-filter]")];
  const clearButton = container.querySelector("[data-product-list-clear]");

  searchInput.value = savedState.search;
  filterSelects.forEach((select) => {
    const saved = normalizeSearch(savedState.filters[select.dataset.productListFilter]);
    const match = [...select.options].find((option) => normalizeSearch(option.value) === saved);
    select.value = match ? match.value : "";
  });
  if ([...sortSelect.options].some((option) => option.value === savedState.sort)) {
    sortSelect.value = savedState.sort;
  }

  const saveListState = () => {
    try {
      window.sessionStorage.setItem(listStateKey, JSON.stringify({
        search: searchInput.value,
        sort: sortSelect.value,
        filters: Object.fromEntries(
          filterSelects.map((select) => [select.dataset.productListFilter, select.value])
        )
      }));
    } catch (error) {
      // List controls still work when browser storage is unavailable.
    }
  };

  const renderProducts = () => {
    const query = normalizeSearch(searchInput?.value || "");
    const activeFilters = filterSelects.filter((select) => select.value);
    filterSelects.forEach((select) => {
      select.closest(".product-list-pill").classList.toggle("product-list-pill--active", Boolean(select.value));
    });
    if (clearButton) clearButton.hidden = activeFilters.length === 0;

    const filtered = activeFilters.reduce((items, select) => {
      const config = LIST_FILTERS.find((item) => item.key === select.dataset.productListFilter);
      return getProductsByMultiValueField(items, config.fieldName, select.value);
    }, baseProducts);

    const visibleProducts = sortProducts(
      filtered.filter((product) => {
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
          <p>Try a different search or clear a filter.</p>
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

  searchInput.addEventListener("input", () => {
    saveListState();
    renderProducts();
  });
  sortSelect.addEventListener("change", () => {
    saveListState();
    renderProducts();
  });
  filterSelects.forEach((select) => {
    select.addEventListener("change", () => {
      saveListState();
      renderProducts();
    });
  });
  clearButton?.addEventListener("click", () => {
    filterSelects.forEach((select) => {
      select.value = "";
    });
    saveListState();
    renderProducts();
  });
  renderProducts();
}

function sortProducts(products, sortValue, brands) {
  return [...products].sort((a, b) => {
    if (sortValue === "last-narrow" || sortValue === "last-wide") {
      const direction = sortValue === "last-narrow" ? 1 : -1;
      const aLast = parseWidth(a.LastWidth);
      const bLast = parseWidth(b.LastWidth);
      if (aLast !== null && bLast !== null && aLast !== bLast) return (aLast - bLast) * direction;
      if ((aLast !== null) !== (bLast !== null)) return aLast !== null ? -1 : 1;
      return getProductName(a).localeCompare(getProductName(b));
    }
    if (sortValue === "brand") {
      return getBrandLabel(a, brands).localeCompare(getBrandLabel(b, brands)) ||
        getProductName(a).localeCompare(getProductName(b));
    }
    if (sortValue === "price-low" || sortValue === "price-high") {
      const direction = sortValue === "price-low" ? 1 : -1;
      const aPrice = Number(a.MSRP);
      const bPrice = Number(b.MSRP);
      const aValid = a.MSRP !== "" && a.MSRP !== null && a.MSRP !== undefined && Number.isFinite(aPrice);
      const bValid = b.MSRP !== "" && b.MSRP !== null && b.MSRP !== undefined && Number.isFinite(bPrice);
      if (aValid && bValid && aPrice !== bPrice) return (aPrice - bPrice) * direction;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return getProductName(a).localeCompare(getProductName(b));
    }
    return getProductName(a).localeCompare(getProductName(b));
  });
}

function parseWidth(value) {
  if (value === "" || value === null || value === undefined) return null;
  const width = Number(String(value).trim().replace(/\s*mm\s*$/i, ""));
  return Number.isFinite(width) ? width : null;
}

function readListState(key, presetFilters = {}) {
  try {
    const state = JSON.parse(window.sessionStorage.getItem(key) || "null");
    return {
      search: typeof state?.search === "string" ? state.search : "",
      sort: typeof state?.sort === "string" ? state.sort : "name",
      filters: state?.filters && typeof state.filters === "object" ? state.filters : presetFilters
    };
  } catch (error) {
    return { search: "", sort: "name", filters: presetFilters };
  }
}

function sortFilterValues(key, values) {
  if (key !== "ability") return values;
  const rank = (value) => {
    const index = ABILITY_ORDER.indexOf(normalizeSearch(value));
    return index === -1 ? ABILITY_ORDER.length : index;
  };
  return [...values].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
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
