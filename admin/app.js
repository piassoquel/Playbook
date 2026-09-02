import { loadAppData } from "../js/services/api.js";

const pageContent = {
  import: ["Import", "Bring product information into Playbook."],
  brands: ["Brands", "Organize and maintain the brands in your catalog."],
  categories: ["Categories", "Structure products into clear, useful categories."],
  settings: ["Settings", "Configure your Playbook Admin workspace."],
};

const productTaxonomy = {
  snowboarding: {
    name: "Snowboarding",
    cmsSportIds: ["SNB", "SNOWBOARDING"],
    image: "../assets/sports/snowboarding-home.webp",
    types: {
      boards: ["Boards", ["SNBBOARD", "BOARDS"]],
      bindings: ["Bindings", ["SNBBIND", "SNBBINDINGS", "BINDINGS"]],
      boots: ["Boots", ["SNBBOOT", "SNBBOOTS", "BOOTS"]],
    },
  },
  skiing: {
    name: "Skiing",
    cmsSportIds: ["SKI", "SKIING"],
    image: "../assets/sports/skiing-home.webp",
    types: {
      skis: ["Skis", ["SKIS"]],
      bindings: ["Bindings", ["SKIBIND", "SKIBINDINGS", "BINDINGS"]],
      boots: ["Boots", ["SKIBOOT", "SKIBOOTS", "BOOTS"]],
    },
  },
};

const statCards = [
  ["Products", "box"],
  ["Needs Review", "review"],
  ["Published", "check"],
  ["Archived", "archive"],
];

const icons = {
  box: '<path d="m4 7 8-4 8 4-8 4z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4z"/>',
  review: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/>',
  archive: '<path d="M4 7h16v13H4zM3 3h18v4H3zM9 11h6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
};

const main = document.querySelector("#main-content");
const navItems = [...document.querySelectorAll("[data-page]")];
const menuButton = document.querySelector(".menu-button");
const backdrop = document.querySelector(".sidebar-backdrop");

let appData = null;
let dataError = null;

function getRouteParts() {
  return window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
}

function renderHeading(title, description, eyebrow = "Overview") {
  return `<header class="page-heading"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></header>`;
}

function renderDashboard() {
  const products = appData?.products || [];
  const values = {
    Products: products.length || "—",
    "Needs Review": countByStatus(products, "review") || "—",
    Published: countByStatus(products, "published") || "—",
    Archived: countByStatus(products, "archived") || "—",
  };
  const cards = statCards.map(([label, icon]) => `
    <article class="stat-card">
      <div class="stat-card__header"><p class="stat-card__label">${label}</p><span class="stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[icon]}</svg></span></div>
      <p class="stat-card__value">${values[label]}</p>
      <p class="stat-card__note">${appData ? "Live catalog" : "Data will appear here"}</p>
    </article>`).join("");
  main.innerHTML = `${renderHeading("Dashboard", "A quick view of your Playbook catalog.")}<section class="stat-grid" aria-label="Catalog summary">${cards}</section>`;
}

function renderProductsHome() {
  if (!renderDataBoundary()) return;
  const choices = Object.entries(productTaxonomy).map(([slug, sport]) => {
    const count = getProductsForSport(slug).length;
    return `<a class="choice-card choice-card--sport" href="#/products/${slug}">
      <div class="choice-card__media"><img src="${sport.image}" alt="" loading="lazy"></div>
      <div class="choice-card__body"><div><p class="choice-card__meta">${count} ${count === 1 ? "product" : "products"}</p><h3>${sport.name}</h3></div>${chevronIcon()}</div>
    </a>`;
  }).join("");
  main.innerHTML = `${renderHeading("Products", "Choose a sport to browse its product catalog.", "Catalog")}<section class="choice-grid choice-grid--sports" aria-label="Choose a sport">${choices}</section>`;
}

function renderProductTypes(sportSlug) {
  const sport = productTaxonomy[sportSlug];
  if (!sport) return renderNotFound("Sport not found", "#/products");
  if (!renderDataBoundary()) return;
  const choices = Object.entries(sport.types).map(([typeSlug, [name]]) => {
    const count = getProductsForType(sportSlug, typeSlug).length;
    return `<a class="choice-card choice-card--type" href="#/products/${sportSlug}/${typeSlug}">
      <span class="type-icon" aria-hidden="true">${name.charAt(0)}</span>
      <div class="choice-card__body"><div><p class="choice-card__meta">${count} ${count === 1 ? "product" : "products"}</p><h3>${name}</h3></div>${chevronIcon()}</div>
    </a>`;
  }).join("");
  main.innerHTML = `${renderBreadcrumbs([["Products", "#/products"], [sport.name]])}${renderHeading(sport.name, "Choose a product type to continue.", "Products")}<section class="choice-grid choice-grid--types" aria-label="Choose a product type">${choices}</section>`;
}

function renderProductList(sportSlug, typeSlug) {
  const sport = productTaxonomy[sportSlug];
  const type = sport?.types[typeSlug];
  if (!sport || !type) return renderNotFound("Product type not found", "#/products");
  if (!renderDataBoundary()) return;
  const [typeName] = type;
  const products = getProductsForType(sportSlug, typeSlug).sort((a, b) => getBrandName(a).localeCompare(getBrandName(b)) || String(a.Model || "").localeCompare(String(b.Model || "")));

  main.innerHTML = `
    ${renderBreadcrumbs([["Products", "#/products"], [sport.name, `#/products/${sportSlug}`], [typeName]])}
    <div class="list-heading">
      ${renderHeading(typeName, `${sport.name} catalog`, "Products")}
      <label class="search-field"><span class="search-field__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons.search}</svg></span><span class="sr-only">Search products</span><input type="search" placeholder="Search by brand or model" autocomplete="off" data-product-search></label>
    </div>
    <div class="result-summary" aria-live="polite" data-result-summary></div>
    <section class="product-list" aria-label="Products" data-product-list></section>`;

  const input = main.querySelector("[data-product-search]");
  const updateList = () => renderProductRows(products, sportSlug, typeSlug, input.value);
  input.addEventListener("input", updateList);
  updateList();
}

function renderProductRows(products, sportSlug, typeSlug, query = "") {
  const filtered = products.filter((product) => normalize([getBrandName(product), product.Model, product.Season, getStatus(product)].join(" ")).includes(normalize(query)));
  const list = main.querySelector("[data-product-list]");
  main.querySelector("[data-result-summary]").textContent = `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`;
  if (!filtered.length) {
    list.innerHTML = `<div class="catalog-empty"><span class="empty-state__icon" aria-hidden="true">0</span><h3>No products found</h3><p>${products.length ? "Try a different brand or model." : "No products in this category are available from the CMS yet."}</p></div>`;
    return;
  }
  list.innerHTML = filtered.map((product) => createProductRow(product, sportSlug, typeSlug)).join("");
  bindImageFallbacks();
}

function createProductRow(product, sportSlug, typeSlug) {
  const brand = getBrandName(product);
  const model = product.Model || "Unnamed product";
  const image = getProductImage(product);
  const status = getStatus(product);
  const productId = encodeURIComponent(String(product.ProductID || ""));
  return `<a class="admin-product" href="#/products/${sportSlug}/${typeSlug}/product/${productId}" aria-label="Open ${escapeHtml(`${brand} ${model}`)}">
    <div class="admin-product__image">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" data-product-image>` : productPlaceholder(brand, model)}</div>
    <div class="admin-product__identity"><p>${escapeHtml(brand)}</p><h3>${escapeHtml(model)}</h3></div>
    <dl class="admin-product__facts"><div><dt>Season</dt><dd>${escapeHtml(product.Season || "—")}</dd></div><div><dt>Status</dt><dd><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span></dd></div></dl>
    ${chevronIcon()}
  </a>`;
}

function renderProductDetail(sportSlug, typeSlug, productId) {
  const sport = productTaxonomy[sportSlug];
  const type = sport?.types[typeSlug];
  if (!sport || !type) return renderNotFound("Product path not found", "#/products");
  if (!renderDataBoundary()) return;
  const product = (appData.products || []).find((item) => normalize(item.ProductID) === normalize(productId));
  if (!product) return renderNotFound("Product not found", `#/products/${sportSlug}/${typeSlug}`);
  const [typeName] = type;
  const brand = getBrandName(product);
  const model = product.Model || "Unnamed product";
  const image = getProductImage(product);
  const status = getStatus(product);

  main.innerHTML = `
    ${renderBreadcrumbs([["Products", "#/products"], [sport.name, `#/products/${sportSlug}`], [typeName, `#/products/${sportSlug}/${typeSlug}`], [model]])}
    <article class="product-view">
      <div class="product-view__media">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(`${brand} ${model}`)}" data-product-image>` : productPlaceholder(brand, model)}</div>
      <div class="product-view__content"><p class="eyebrow">${escapeHtml(brand)}</p><h2>${escapeHtml(model)}</h2><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>
        <dl class="detail-facts"><div><dt>Sport</dt><dd>${sport.name}</dd></div><div><dt>Product type</dt><dd>${typeName}</dd></div><div><dt>Season</dt><dd>${escapeHtml(product.Season || "—")}</dd></div><div><dt>Product ID</dt><dd>${escapeHtml(product.ProductID || "—")}</dd></div></dl>
        <div class="read-only-note"><strong>View only</strong><p>Product editing will be added in a future phase.</p></div>
      </div>
    </article>`;
  bindImageFallbacks();
}

function renderPlaceholder(page) {
  const [title, description] = pageContent[page];
  main.innerHTML = `${renderHeading(title, description)}<section class="empty-state"><div><span class="empty-state__icon" aria-hidden="true">${title.charAt(0)}</span><h3>${title} workspace</h3><p>This area is ready for the next phase of Playbook Admin development.</p></div></section>`;
}

function renderDataBoundary() {
  if (appData) return true;
  if (dataError) {
    main.innerHTML = `${renderHeading("Products unavailable", "The Playbook CMS could not be reached.", "Connection error")}<section class="catalog-empty"><span class="empty-state__icon" aria-hidden="true">!</span><h3>Could not load the catalog</h3><p>Check your connection and refresh the page to try again.</p></section>`;
  } else {
    main.innerHTML = `${renderHeading("Products", "Loading the latest catalog from Playbook CMS.", "Catalog")}<div class="loading-state" role="status"><span class="spinner" aria-hidden="true"></span>Loading products…</div>`;
  }
  return false;
}

function renderNotFound(message, backHref) {
  main.innerHTML = `${renderHeading(message, "The requested catalog location does not exist.", "Not found")}<a class="text-link" href="${backHref}">Return to products</a>`;
}

function renderBreadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${items.map(([label, href], index) => `${index ? '<span aria-hidden="true">/</span>' : ""}${href ? `<a href="${href}">${escapeHtml(label)}</a>` : `<span aria-current="page">${escapeHtml(label)}</span>`}`).join("")}</nav>`;
}

function getProductsForSport(sportSlug) {
  const sport = productTaxonomy[sportSlug];
  return (appData?.products || []).filter((product) => sport.cmsSportIds.includes(normalize(product.SportID)));
}

function getProductsForType(sportSlug, typeSlug) {
  const sport = productTaxonomy[sportSlug];
  const categoryIds = sport?.types[typeSlug]?.[1];
  if (!sport || !categoryIds) return [];
  return getProductsForSport(sportSlug).filter((product) => categoryIds.includes(normalize(product.CategoryID)));
}

function getBrandName(product) {
  const brand = (appData?.brands || []).find((item) => normalize(item.BrandID || item.id) === normalize(product.BrandID));
  return String(brand?.Name || brand?.name || product.BrandID || "Unknown brand");
}

function getProductImage(product) {
  return String(product.ThumbnailImage || product.HeroImage || product.ImageURL || "").trim();
}

function getStatus(product) {
  if (product.RowStatus || product.Status) return String(product.RowStatus || product.Status);
  return isTruthy(product.Active) ? "Active" : "Archived";
}

function countByStatus(products, type) {
  return products.filter((product) => {
    const status = normalize(getStatus(product));
    if (type === "review") return status.includes("REVIEW") || status === "DRAFT";
    if (type === "published") return ["PUBLISHED", "READY", "ACTIVE"].includes(status);
    return ["ARCHIVED", "INACTIVE"].includes(status);
  }).length;
}

function statusClass(status) {
  const normalized = normalize(status);
  if (["READY", "PUBLISHED", "ACTIVE"].includes(normalized)) return "status-pill--positive";
  if (normalized.includes("REVIEW") || normalized === "DRAFT") return "status-pill--warning";
  if (["ARCHIVED", "INACTIVE"].includes(normalized)) return "status-pill--muted";
  return "";
}

function productPlaceholder(brand, model) {
  return `<div class="product-placeholder"><span>${escapeHtml(brand)}</span><strong>${escapeHtml(model)}</strong></div>`;
}

function bindImageFallbacks() {
  main.querySelectorAll("[data-product-image]").forEach((image) => image.addEventListener("error", () => {
    const product = image.closest(".admin-product, .product-view");
    const brand = product?.querySelector(".admin-product__identity p, .eyebrow")?.textContent || "Playbook";
    const model = product?.querySelector("h2, h3")?.textContent || "Product";
    image.parentElement.innerHTML = productPlaceholder(brand, model);
  }, { once: true }));
}

function chevronIcon() {
  return `<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">${icons.chevron}</svg>`;
}

function isTruthy(value) {
  return value === true || ["TRUE", "YES", "1"].includes(normalize(value));
}

function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function closeNavigation() {
  document.body.classList.remove("nav-open");
  menuButton.setAttribute("aria-expanded", "false");
}

function updateNavigation(activePage) {
  navItems.forEach((item) => item.dataset.page === activePage ? item.setAttribute("aria-current", "page") : item.removeAttribute("aria-current"));
}

function renderRoute() {
  const parts = getRouteParts();
  const root = parts[0] || "dashboard";
  updateNavigation(root);
  if (root === "dashboard" && parts.length === 1) renderDashboard();
  else if (root === "products" && parts.length === 1) renderProductsHome();
  else if (root === "products" && parts.length === 2) renderProductTypes(parts[1]);
  else if (root === "products" && parts.length === 3) renderProductList(parts[1], parts[2]);
  else if (root === "products" && parts[3] === "product" && parts.length === 5) renderProductDetail(parts[1], parts[2], parts[4]);
  else if (pageContent[root] && parts.length === 1) renderPlaceholder(root);
  else renderNotFound("Page not found", "#/products");
  closeNavigation();
  window.scrollTo({ top: 0, behavior: "instant" });
  main.focus({ preventScroll: true });
  document.title = `${root.charAt(0).toUpperCase() + root.slice(1)} | Playbook Admin`;
}

menuButton.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("nav-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});
backdrop.addEventListener("click", closeNavigation);
window.addEventListener("hashchange", renderRoute);
window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeNavigation(); });

async function startApp() {
  if (!window.location.hash) window.location.replace("#/dashboard");
  renderRoute();
  try {
    appData = await loadAppData();
  } catch (error) {
    console.error("Admin catalog load failed.", error);
    dataError = error;
  }
  renderRoute();
}

startApp();
