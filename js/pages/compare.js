import {
  getBrandById,
  getProductById
} from "../services/product-filter.js";

export function renderComparePage(
  container,
  primaryId,
  secondaryId,
  products,
  brands
) {
  const primary = getProductById(products, primaryId);

  if (!primary) {
    renderMissing(container, "Primary product not found");
    return;
  }

  if (!secondaryId) {
    renderComparePicker(container, primary, products, brands);
    return;
  }

  const secondary = getProductById(products, secondaryId);

  if (!secondary) {
    renderMissing(container, "Comparison product not found");
    return;
  }

  const primaryBrand = getBrandById(brands, primary.BrandID);
  const secondaryBrand = getBrandById(brands, secondary.BrandID);

  container.innerHTML = `
    <a
      class="back-button"
      href="#/product/${String(primary.ProductID).toLowerCase()}"
    >
      ← Back to Product
    </a>

    <section class="comparison-hero">
      <p class="eyebrow">Product Comparison</p>
      <h1>${escapeHtml(primary.Model)} vs ${escapeHtml(secondary.Model)}</h1>
      <p>Use this view to explain the practical differences to a customer.</p>
    </section>

    <section class="comparison-grid" aria-label="Compared products">
      ${createProductColumn(primary, primaryBrand)}
      ${createProductColumn(secondary, secondaryBrand)}
    </section>

    <section class="comparison-table">
      ${createComparisonRow("Ability", primary.Ability, secondary.Ability)}
      ${createComparisonRow("Terrain", primary.Terrain, secondary.Terrain)}
      ${createComparisonRow("Flex", primary.Flex, secondary.Flex)}
      ${createComparisonRow("Width", formatWidth(primary.Width), formatWidth(secondary.Width))}
      ${createComparisonRow("Price", formatPrice(primary.MSRP), formatPrice(secondary.MSRP))}
      ${createComparisonRow("Sales Tip", primary.SellingTips, secondary.SellingTips)}
      ${createComparisonRow("Best For", buildBestFor(primary), buildBestFor(secondary))}
      ${createComparisonRow("Compare Notes", primary.CompareTo, secondary.CompareTo)}
    </section>
  `;
}

function renderComparePicker(container, primary, products, brands) {
  const candidates = products
    .filter((product) => {
      return (
        String(product.ProductID) !== String(primary.ProductID) &&
        String(product.SportID || "").toUpperCase() ===
          String(primary.SportID || "").toUpperCase() &&
        String(product.CategoryID || "").toUpperCase() ===
          String(primary.CategoryID || "").toUpperCase()
      );
    })
    .sort((a, b) =>
      String(a.Model || "").localeCompare(String(b.Model || ""))
    );

  container.innerHTML = `
    <a
      class="back-button"
      href="#/product/${String(primary.ProductID).toLowerCase()}"
    >
      ← Back to Product
    </a>

    <section class="section-heading">
      <p class="eyebrow">Compare ${escapeHtml(primary.Model)}</p>
      <h1 class="page-title">Choose another product</h1>
      <p class="page-description">
        Only products from the same sport and category are shown.
      </p>
    </section>

    <section id="compare-picker" class="compare-picker"></section>
  `;

  const picker = container.querySelector("#compare-picker");

  if (!candidates.length) {
    picker.innerHTML = `
      <div class="empty-state">
        <h2>No comparison products found</h2>
        <p>
          Add at least one more active product with the same SportID and CategoryID.
        </p>
      </div>
    `;
    return;
  }

  candidates.forEach((product) => {
    const brand = getBrandById(brands, product.BrandID);
    const link = document.createElement("a");

    link.className = "compare-picker-card";
    link.href =
      `#/compare/${String(primary.ProductID).toLowerCase()}/` +
      `${String(product.ProductID).toLowerCase()}`;

    link.innerHTML = `
      <div>
        <p>${escapeHtml(brand?.Name || product.BrandID || "")}</p>
        <h2>${escapeHtml(product.Model || "")}</h2>
        <span>
          ${escapeHtml(
            [product.Ability, product.Terrain, formatWidth(product.Width)]
              .filter(Boolean)
              .join(" · ")
          )}
        </span>
      </div>

      <strong aria-hidden="true">→</strong>
    `;

    picker.append(link);
  });
}

function createProductColumn(product, brand) {
  return `
    <article class="comparison-product">
      <p>${escapeHtml(brand?.Name || product.BrandID || "")}</p>
      <h2>${escapeHtml(product.Model || "")}</h2>
      <a href="#/product/${String(product.ProductID).toLowerCase()}">
        View Product
      </a>
    </article>
  `;
}

function createComparisonRow(label, leftValue, rightValue) {
  return `
    <section class="comparison-row">
      <h2>${escapeHtml(label)}</h2>
      <div>${formatContent(leftValue)}</div>
      <div>${formatContent(rightValue)}</div>
    </section>
  `;
}

function formatContent(value) {
  return value
    ? `<p>${escapeHtml(value)}</p>`
    : `<p class="comparison-empty">Not entered yet</p>`;
}

function buildBestFor(product) {
  return [
    product.Ability ? `${product.Ability} ability` : "",
    product.Terrain ? `${product.Terrain} use` : "",
    product.Width ? `${formatWidth(product.Width)} platform` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatWidth(value) {
  const width = String(value || "").trim();

  if (!width) return "";

  return width.toLowerCase().includes("mm")
    ? width
    : `${width} mm`;
}

function formatPrice(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(number);
}

function renderMissing(container, message) {
  container.innerHTML = `
    <section class="section-heading">
      <p class="eyebrow">Not found</p>
      <h1 class="page-title">${escapeHtml(message)}</h1>
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
