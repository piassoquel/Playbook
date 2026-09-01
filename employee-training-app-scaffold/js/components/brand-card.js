export function createBrandCard(brand, productCount, href) {
  const link = document.createElement("a");
  link.className = "brand-card";
  link.href = href;
  link.setAttribute("aria-label", `Browse ${brand.Name}`);

  link.innerHTML = `
    <div>
      <h2 class="brand-card__title">${escapeHtml(brand.Name)}</h2>
      <p class="brand-card__count">
        ${productCount} ${productCount === 1 ? "product" : "products"}
      </p>
    </div>
    <span class="circle-arrow" aria-hidden="true">→</span>
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
