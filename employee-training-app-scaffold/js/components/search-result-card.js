export function createSearchResultCard(product, brand) {
  const link = document.createElement("a");
  link.className = "search-result-card";
  link.href = `#/product/${String(product.ProductID).toLowerCase()}`;

  const image =
    product.ThumbnailImage ||
    product.HeroImage ||
    product.ImageURL ||
    "";

  const facts = [
    product.Ability,
    product.Terrain,
    product.Width ? `${product.Width} mm` : ""
  ].filter(Boolean);

  link.innerHTML = `
    <div class="search-result-card__visual">
      ${
        image
          ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">`
          : `<div class="search-result-card__placeholder">
               <span>${escapeHtml(brand?.Name || product.BrandID || "")}</span>
               <strong>${escapeHtml(product.Model || "")}</strong>
             </div>`
      }
    </div>

    <div class="search-result-card__body">
      <p class="search-result-card__brand">
        ${escapeHtml(brand?.Name || product.BrandID || "")}
      </p>

      <h2>${escapeHtml(product.Model || "Unnamed product")}</h2>

      ${
        facts.length
          ? `<p class="search-result-card__facts">${facts
              .map((fact) => escapeHtml(fact))
              .join(" · ")}</p>`
          : ""
      }
    </div>

    <span class="search-result-card__arrow" aria-hidden="true">→</span>
  `;

  return link;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
