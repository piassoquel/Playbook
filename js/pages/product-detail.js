import {
  getBrandById,
  getProductById
} from "../services/product-filter.js";
import {
  isFavorite,
  toggleFavorite
} from "../services/favorites.js";
import {
  getPrimaryImage,
  getProductBadges,
  parseRelatedProductIds
} from "../components/product-detail-layout.js";
import {
  createPerformancePanel,
  createSecondarySpecs
} from "../components/product-performance.js";

export function renderProductDetailPage(
  container,
  productId,
  products,
  brands
) {
  const product = getProductById(products, productId);

  if (!product) {
    container.innerHTML = `
      <section class="section-heading">
        <p class="eyebrow">Product not found</p>
        <h1 class="page-title">This product is unavailable.</h1>
      </section>
      <a class="back-button" href="#/">Back to Home</a>
    `;
    return;
  }

  const brand = getBrandById(brands, product.BrandID);
  const brandName = brand?.Name || product.BrandID || "";
  const suggestedProducts = getSuggestedProducts(product, products);
  const saved = isFavorite(product.ProductID);

  container.innerHTML = `
    <button class="back-button" type="button" data-browser-back>
      <span aria-hidden="true">←</span>
      <span>Back</span>
    </button>

    <article class="product-detail product-detail-v2">
      <header class="product-detail-v2__hero">
        <div class="product-detail-v2__media">
          <button
            class="favorite-toggle-button favorite-toggle-button--media"
            type="button"
            data-favorite-toggle
            aria-pressed="${saved}"
          >
            ${heartIcon()}
            <span>${saved ? "Saved" : "Add to Favorites"}</span>
          </button>

          ${createProductImage(product, brandName)}
        </div>

        <div class="product-detail-v2__intro">
          <div class="product-detail-v2__topline">
            <p class="eyebrow">${escapeHtml(brandName)}</p>

            ${
              product.MSRP !== "" &&
              product.MSRP !== null &&
              product.MSRP !== undefined
                ? `<strong class="product-detail-v2__price">${escapeHtml(formatPrice(product.MSRP))}</strong>`
                : ""
            }
          </div>

          <h1 class="product-detail-v2__title">
            ${escapeHtml(product.Model || "")}
          </h1>

          ${createBadges(product)}
          ${createProductActions(product, products)}
          ${createPerformancePanel(product)}
          ${createSecondarySpecs(product)}
        </div>
      </header>

      ${createSalesDashboard(product)}

      <div class="product-detail-v2__content">
        ${createSuggestedProducts(suggestedProducts, brands)}
      </div>
    </article>
  `;

  container
    .querySelector("[data-browser-back]")
    .addEventListener("click", () => window.history.back());

  const favoriteButton = container.querySelector("[data-favorite-toggle]");

  favoriteButton.addEventListener("click", () => {
    const nowSaved = toggleFavorite(product.ProductID);
    favoriteButton.setAttribute("aria-pressed", String(nowSaved));
    favoriteButton.querySelector("span").textContent =
      nowSaved ? "Saved" : "Add to Favorites";
  });

  const image = container.querySelector("[data-product-image]");

  if (image) {
    image.addEventListener("error", () => {
      const media = image.closest(".product-detail-v2__media");
      media.innerHTML = createImagePlaceholder(product, brandName);
    }, { once: true });
  }
}

function createProductImage(product, brandName) {
  const image = getPrimaryImage(product);

  if (!image) {
    return createImagePlaceholder(product, brandName);
  }

  return `
    <img
      class="product-detail-v2__image"
      data-product-image
      src="${escapeHtml(image)}"
      alt="${escapeHtml(`${brandName} ${product.Model || ""}`)}"
    >
  `;
}

function createImagePlaceholder(product, brandName) {
  return `
    <div class="product-detail-v2__placeholder" role="img" aria-label="Product image coming soon">
      <span class="product-detail-v2__placeholder-mark">PLAYBOOK</span>
      <strong>${escapeHtml(product.Model || "Product")}</strong>
      <small>${escapeHtml(brandName)} · Image coming soon</small>
    </div>
  `;
}

function createBadges(product) {
  const badges = getProductBadges(product);

  if (!badges.length) return "";

  return `
    <div class="product-badges" aria-label="Product badges">
      ${badges.map((badge) => `
        <span class="product-badge ${badge.className}">
          ${escapeHtml(badge.label)}
        </span>
      `).join("")}
    </div>
  `;
}

function createProductActions(product, products) {
  const hasVideo = isValidUrl(product.VideoURL);
  const hasComparison = hasComparableProduct(product, products);

  if (!hasVideo && !hasComparison) return "";

  return `
    <div class="product-actions" aria-label="Product actions">
      ${
        hasVideo
          ? `
            <a
              class="product-action product-action--video"
              href="${escapeHtml(product.VideoURL)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch product video"
              title="Watch product video"
            >
              ${videoIcon()}
            </a>
          `
          : ""
      }

      ${
        hasComparison
          ? `
            <a
              class="product-action product-action--compare"
              href="#/compare/${encodeURIComponent(String(product.ProductID).toLowerCase())}"
              aria-label="Compare this product"
              title="Compare this product"
            >
              ${compareActionIcon()}
              <span>Compare</span>
            </a>
          `
          : ""
      }
    </div>
  `;
}

function hasComparableProduct(product, products) {
  return products.some((candidate) =>
    String(candidate.ProductID || "") !== String(product.ProductID || "") &&
    String(candidate.SportID || "").toUpperCase() === String(product.SportID || "").toUpperCase() &&
    String(candidate.CategoryID || "").toUpperCase() === String(product.CategoryID || "").toUpperCase()
  );
}

function isValidUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function videoIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="m10 8 6 4-6 4z"></path>
    </svg>
  `;
}

function compareActionIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h12"></path>
      <path d="m16 4 3 3-3 3"></path>
      <path d="M17 17H5"></path>
      <path d="m8 14-3 3 3 3"></path>
    </svg>
  `;
}

function createSalesDashboard(product) {
  const cards = [
    createSalesDashboardCard(
      "Who is this for?",
      product.CustomerProfile,
      "person",
      "profile",
      false
    ),
    createSalesDashboardCard(
      "Why we recommend it",
      product.SellingTips,
      "lightbulb",
      "recommend",
      false
    ),
    createSalesDashboardCard(
      "How it compares",
      product.ComparisonNotes,
      "compare",
      "compare",
      false
    ),
    createSalesDashboardCard(
      "Talking points",
      product.TalkingPoints,
      "talk",
      "talk",
      true
    ),
    createSalesDashboardCard(
      "Common questions",
      product.CommonQuestions,
      "question",
      "question",
      true
    )
  ].filter(Boolean);

  if (!cards.length) {
    return "";
  }

  return `
    <section
      class="sales-dashboard sales-dashboard--count-${cards.length}"
      aria-label="Sales Dashboard"
    >
      ${cards.join("")}
    </section>
  `;
}

function createSalesDashboardCard(
  title,
  content,
  icon,
  accent,
  useList
) {
  const cleanContent = String(content || "").trim();

  if (!cleanContent) {
    return "";
  }

  const body = useList
    ? createSalesDashboardList(cleanContent)
    : `<p>${formatMultiline(cleanContent)}</p>`;

  return `
    <article class="sales-dashboard__card sales-dashboard__card--${accent}">
      <div class="sales-dashboard__icon" aria-hidden="true">
        ${getIcon(icon)}
      </div>

      <div class="sales-dashboard__body">
        <h2>${escapeHtml(title)}</h2>
        ${body}
      </div>
    </article>
  `;
}

function createSalesDashboardList(content) {
  const items = parseContentItems(content);

  if (!items.length) {
    return `<p>${formatMultiline(content)}</p>`;
  }

  return `
    <ul>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function createSuggestedProducts(suggestedProducts, brands) {
  if (!suggestedProducts.length) {
    return "";
  }

  return `
    <section
      class="suggested-products-section suggested-products-section--count-${suggestedProducts.length}"
      aria-label="Suggested products"
    >
      <div class="suggested-products-section__heading">
        <div class="suggested-products-section__heading-icon" aria-hidden="true">
          ${suggestionIcon()}
        </div>

        <div>
          <p class="eyebrow">Complete the setup</p>
          <h2>Suggested Products</h2>
        </div>
      </div>

      <div class="suggested-products-grid">
        ${suggestedProducts.map((suggested) => {
          const brand = getBrandById(brands, suggested.BrandID);
          const categoryLabel =
            suggested.CategoryName ||
            suggested.Category ||
            suggested.CategoryID ||
            "";

          return `
            <a
              class="suggested-product-card"
              href="#/product/${encodeURIComponent(String(suggested.ProductID).toLowerCase())}"
              aria-label="Open ${escapeHtml(
                [brand?.Name || suggested.BrandID, suggested.Model]
                  .filter(Boolean)
                  .join(" ")
              )}"
            >
              <div class="suggested-product-card__visual">
                ${createSuggestedImage(
                  suggested,
                  brand?.Name || suggested.BrandID || ""
                )}
              </div>

              <div class="suggested-product-card__body">
                <p>${escapeHtml(brand?.Name || suggested.BrandID || "")}</p>
                <h3>${escapeHtml(suggested.Model || "")}</h3>

                ${
                  categoryLabel
                    ? `<span>${escapeHtml(categoryLabel)}</span>`
                    : ""
                }
              </div>

              <strong aria-hidden="true">→</strong>
            </a>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function createSuggestedImage(product, brandName) {
  const image =
    product.ThumbnailImage ||
    product.ImageURL ||
    product.HeroImage ||
    "";

  if (!image) {
    return `
      <span class="suggested-product-card__placeholder">
        ${escapeHtml(brandName || "Playbook")}
      </span>
    `;
  }

  return `
    <img
      src="${escapeHtml(image)}"
      alt=""
      loading="lazy"
      onerror="this.remove();"
    >
  `;
}

function suggestionIcon() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M9.5 14.5 14.5 9"></path>
      <path d="M7.5 16.5 5 19a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0"></path>
      <path d="m16.5 7.5 2.5-2.5a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0"></path>
    </svg>
  `;
}

function getSuggestedProducts(product, products) {
  const rawIds =
    product.RecommendedProductIDs ||
    product.RelatedProductIDs ||
    "";

  const ids = parseRelatedProductIds(rawIds);
  const seen = new Set();

  return ids
    .map((id) => getProductById(products, id))
    .filter(Boolean)
    .filter((item) => {
      const itemId = String(item.ProductID || "").trim().toUpperCase();
      const currentId = String(product.ProductID || "").trim().toUpperCase();

      if (!itemId || itemId === currentId || seen.has(itemId)) {
        return false;
      }

      seen.add(itemId);
      return true;
    })
    .slice(0, 3);
}

function parseContentItems(content) {
  return String(content || "")
    .split(/\n|\||•/)
    .map((item) => item.replace(/^[-–—]\s*/, "").trim())
    .filter(Boolean);
}

function formatMultiline(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function formatWidth(value) {
  const width = String(value ?? "").trim();
  if (!width) return "";
  return width.toLowerCase().includes("mm") ? width : `${width} mm`;
}

function formatPrice(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(number);
}

function heartIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 4.8 13.8A5.2 5.2 0 0 1 12 6.4a5.2 5.2 0 0 1 7.2 7.4z"></path></svg>`;
}

function getIcon(name) {
  const icons = {
    person: `<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"></circle><path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6"></path></svg>`,
    lightbulb: `<svg viewBox="0 0 24 24"><path d="M9 18h6M10 22h4"></path><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5C14.7 15.2 14 16 14 17h-4c0-1-.7-1.8-1.5-2.5Z"></path></svg>`,
    compare: `<svg viewBox="0 0 24 24"><path d="M7 7h12m-3-3 3 3-3 3M17 17H5m3-3-3 3 3 3"></path></svg>`,
    talk: `<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"></path></svg>`,
    question: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M9.8 9a2.3 2.3 0 1 1 3.5 2c-.9.6-1.3 1.1-1.3 2M12 17h.01"></path></svg>`
  };
  return icons[name] || icons.lightbulb;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
