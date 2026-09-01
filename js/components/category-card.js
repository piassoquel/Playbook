export function createCategoryCard(category, sportId) {
  const button = document.createElement("button");
  button.className = "category-card";
  button.type = "button";
  button.setAttribute("aria-label", `Open ${category.name}`);

  button.innerHTML = `
    <div>
      <h2 class="category-card__title">${escapeHtml(category.name)}</h2>
      <p class="category-card__description">${escapeHtml(category.description)}</p>
    </div>
    <span class="circle-arrow" aria-hidden="true">→</span>
  `;

  button.addEventListener("click", () => {
    window.location.hash = `#/sport/${sportId}/category/${category.id}`;
  });

  return button;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
