import { createSearchResultCard } from "../components/search-result-card.js";
import { getBrandById } from "../services/product-filter.js";

export function renderSearchPage(container, products, brands) {
  container.innerHTML = `
    <section class="search-page">
      <div class="search-page__heading">
        <p class="eyebrow">Quick Reference</p>
        <h1 class="page-title">Search products</h1>
        <p class="page-description">
          Search by brand, model, ability, terrain, description, or selling tip.
        </p>
      </div>

      <label class="search-box">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle>
          <path d="m16.5 16.5 4 4"></path>
        </svg>

        <input
          id="product-search-input"
          type="search"
          inputmode="search"
          autocomplete="off"
          placeholder="Search Playbook..."
          aria-label="Search products"
        >

        <button
          id="clear-search-button"
          type="button"
          aria-label="Clear search"
          hidden
        >
          ×
        </button>
      </label>

      <div class="search-page__status">
        <span id="search-result-count">Start typing to search.</span>
      </div>

      <section
        id="search-results"
        class="search-results"
        aria-live="polite"
      ></section>
    </section>
  `;

  const input = container.querySelector("#product-search-input");
  const clearButton = container.querySelector("#clear-search-button");
  const results = container.querySelector("#search-results");
  const count = container.querySelector("#search-result-count");

  input.addEventListener("input", () => {
    const query = input.value.trim();
    clearButton.hidden = query.length === 0;

    if (query.length < 2) {
      results.innerHTML = "";
      count.textContent = query.length
        ? "Type at least 2 characters."
        : "Start typing to search.";
      return;
    }

    const matches = searchProducts(products, brands, query);

    results.innerHTML = "";
    count.textContent =
      `${matches.length} ${matches.length === 1 ? "result" : "results"}`;

    if (!matches.length) {
      results.innerHTML = `
        <div class="empty-state">
          <h2>No products found</h2>
          <p>
            Try a brand, model, ability level, terrain type, or selling keyword.
          </p>
        </div>
      `;
      return;
    }

    matches.forEach((product) => {
      const brand = getBrandById(brands, product.BrandID);
      results.append(createSearchResultCard(product, brand));
    });
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    clearButton.hidden = true;
    results.innerHTML = "";
    count.textContent = "Start typing to search.";
    input.focus();
  });

  window.requestAnimationFrame(() => {
    input.focus();
  });
}

function searchProducts(products, brands, query) {
  const normalizedQuery = normalize(query);

  return products
    .map((product) => {
      const brand = getBrandById(brands, product.BrandID);

      const searchableValues = [
        brand?.Name,
        product.BrandID,
        product.Model,
        product.Gender,
        product.Ability,
        product.Terrain,
        product.Flex,
        product.Width,
        product.Description,
        product.SellingTips,
        product.CompareTo,
        product.ProductID
      ];

      const searchableText = normalize(
        searchableValues.filter(Boolean).join(" ")
      );

      return {
        product,
        score: calculateScore(product, brand, normalizedQuery, searchableText)
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      return String(a.product.Model || "").localeCompare(
        String(b.product.Model || "")
      );
    })
    .map((entry) => entry.product);
}

function calculateScore(product, brand, query, searchableText) {
  const model = normalize(product.Model);
  const brandName = normalize(brand?.Name);
  const productId = normalize(product.ProductID);

  if (model === query) return 100;
  if (brandName === query) return 90;
  if (productId === query) return 85;
  if (model.startsWith(query)) return 75;
  if (brandName.startsWith(query)) return 70;
  if (searchableText.includes(query)) return 50;

  return 0;
}

function normalize(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}
