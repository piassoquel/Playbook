export function createProductCard(product, brand, href, options = {}) {
  const link = document.createElement("a");
  link.className = "product-card product-card--visual";
  link.href = href;
  link.setAttribute(
    "aria-label",
    `Open ${brand?.Name || product.BrandID || ""} ${product.Model || ""}`
  );

  const image =
    product.ThumbnailImage ||
    product.HeroImage ||
    product.ImageURL ||
    "";

  const facts = [
    product.Ability,
    product.Terrain,
    formatWidth(product.Width)
  ].filter(Boolean);
  const price = formatPrice(product.MSRP);
  const isSkiBoot = String(product.SportID || "").toUpperCase() === "SKI" &&
    ["SKIBOOT", "SKIBOOTS"].includes(String(product.CategoryID || "").toUpperCase());
  const lastWidth = isSkiBoot ? formatWidth(product.LastWidth) : "";
  if (lastWidth) link.classList.add("product-card--ski-boot");

  link.innerHTML = `
    <div class="product-card__visual">
      ${
        image
          ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.Model || "")}" loading="lazy">`
          : `<div class="product-card__placeholder">
               <span>${escapeHtml(brand?.Name || product.BrandID || "")}</span>
               <strong>${escapeHtml(product.Model || "Product")}</strong>
             </div>`
      }
    </div>

    <div class="product-card__body">
      ${
        options.showBrand
          ? `<p class="product-card__brand">${escapeHtml(
              brand?.Name || product.BrandID || ""
            )}</p>`
          : ""
      }

      <div class="product-card__headline">
        <h2 class="product-card__title">${escapeHtml(product.Model || "Unnamed product")}</h2>
        ${price ? `<strong class="product-card__price">${escapeHtml(price)}</strong>` : ""}
      </div>

      ${lastWidth ? `<span class="product-card__last">Last ${escapeHtml(lastWidth)}</span>` : ""}

      ${
        facts.length
          ? `<p class="product-card__facts">${facts
              .map((fact) => escapeHtml(fact))
              .join(" · ")}</p>`
          : ""
      }

      ${
        product.SellingTips
          ? `<p class="product-card__summary">${escapeHtml(product.SellingTips)}</p>`
          : product.Description
          ? `<p class="product-card__summary">${escapeHtml(product.Description)}</p>`
          : ""
      }
    </div>

    <span class="circle-arrow" aria-hidden="true">→</span>
  `;

  return link;
}

function formatWidth(value) {
  const width = String(value ?? "").trim();
  if (!width) return "";
  return width.toLowerCase().includes("mm") ? width : `${width} mm`;
}

function formatPrice(value) {
  if (value === "" || value === null || value === undefined) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
