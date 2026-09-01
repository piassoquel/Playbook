import { createProductCard } from "../components/product-card.js";
import {
  getBrandById,
  getProductById
} from "../services/product-filter.js";
import {
  getFavoriteProductIds,
  removeFavorite
} from "../services/favorites.js";

export function renderFavoritesPage(
  container,
  products,
  brands
) {
  const favoriteIds = getFavoriteProductIds();

  const favoriteProducts = favoriteIds
    .map((id) => getProductById(products, id))
    .filter(Boolean)
    .sort((a, b) =>
      String(a.Model || "").localeCompare(
        String(b.Model || "")
      )
    );

  container.innerHTML = `
    <section class="section-heading">
      <p class="eyebrow">Saved Products</p>
      <h1 class="page-title">Favorites</h1>
      <p class="page-description">
        Keep frequently reviewed products together for quick access.
      </p>
    </section>

    <section
      id="favorites-list"
      class="favorites-list product-list"
      aria-label="Favorite products"
    ></section>
  `;

  const list = container.querySelector("#favorites-list");

  if (!favoriteProducts.length) {
    list.innerHTML = `
      <div class="empty-state favorites-empty">
        <div class="favorites-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 20.5 4.8 13.8A5.2 5.2 0 0 1 12 6.4a5.2 5.2 0 0 1 7.2 7.4z"></path>
          </svg>
        </div>

        <h2>No favorites yet</h2>

        <p>
          Open a product and tap “Add to Favorites.”
        </p>

        <a class="favorites-empty__button" href="#/search">
          Search Products
          <span aria-hidden="true">→</span>
        </a>
      </div>
    `;
    return;
  }

  favoriteProducts.forEach((product) => {
    const brand = getBrandById(brands, product.BrandID);
    const wrapper = document.createElement("div");
    wrapper.className = "favorite-product-row";

    wrapper.append(
      createProductCard(
        product,
        brand,
        `#/product/${String(product.ProductID).toLowerCase()}`,
        { showBrand: true }
      )
    );

    const removeButton = document.createElement("button");
    removeButton.className = "favorite-remove-button";
    removeButton.type = "button";
    removeButton.setAttribute(
      "aria-label",
      `Remove ${product.Model} from favorites`
    );

    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18"></path>
      </svg>
      <span>Remove</span>
    `;

    removeButton.addEventListener("click", () => {
      removeFavorite(product.ProductID);
      wrapper.remove();

      if (!list.querySelector(".favorite-product-row")) {
        renderFavoritesPage(container, products, brands);
      }
    });

    wrapper.append(removeButton);
    list.append(wrapper);
  });
}
