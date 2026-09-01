export function renderCategoriesPage(container, sport) {
  const heroClass =
    sport.id === "ski"
      ? "category-hero--skiing"
      : "category-hero--snowboarding";

  container.innerHTML = `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="#/">Home</a>
      <span aria-hidden="true">›</span>
      <span>${escapeHtml(sport.name)}</span>
    </nav>

    <section class="category-hero ${heroClass}">
      <div class="category-hero__overlay"></div>

      <div class="category-hero__content">
        <p class="eyebrow">${escapeHtml(sport.name)}</p>
        <h1>${escapeHtml(sport.name)} Training</h1>
        <p>Choose a product category to start learning.</p>
      </div>
    </section>

    <section class="category-choice-section">
      <div class="showcase-section-heading">
        <div>
          <p class="showcase-kicker">Categories</p>
          <h2>What would you like to learn?</h2>
        </div>
      </div>

      <div
        id="category-choice-grid"
        class="showcase-learning-grid category-choice-grid"
        aria-label="${escapeHtml(sport.name)} categories"
      ></div>
    </section>
  `;

  const grid = container.querySelector("#category-choice-grid");

  sport.categories.forEach((category, index) => {
    grid.append(createCategoryChoiceCard(category, sport.id, index));
  });
}

function createCategoryChoiceCard(category, sportId, index) {
  const link = document.createElement("a");
  link.className =
    "showcase-learning-card category-choice-card " +
    `category-choice-card--accent-${(index % 5) + 1}`;

  link.href = `#/sport/${sportId}/category/${category.id}`;
  link.setAttribute("aria-label", `Open ${category.name}`);

  link.innerHTML = `
    <span class="showcase-learning-card__icon" aria-hidden="true">
      ${getCategoryIcon(category.name)}
    </span>

    <span>${escapeHtml(category.name)}</span>
  `;

  return link;
}

function getCategoryIcon(categoryName) {
  const key = String(categoryName || "").toLowerCase();

  if (key.includes("ski") || key.includes("board")) {
    return `
      <svg viewBox="0 0 24 24">
        <path d="M7 3c3 5 3 13 0 18"></path>
        <path d="M17 3c-3 5-3 13 0 18"></path>
      </svg>
    `;
  }

  if (key.includes("boot")) {
    return `
      <svg viewBox="0 0 24 24">
        <path d="M7 3v10l-3 4v3h16v-4l-7-2V3z"></path>
      </svg>
    `;
  }

  if (key.includes("binding")) {
    return `
      <svg viewBox="0 0 24 24">
        <rect x="5" y="4" width="5" height="16" rx="2"></rect>
        <rect x="14" y="4" width="5" height="16" rx="2"></rect>
        <path d="M10 9h4M10 15h4"></path>
      </svg>
    `;
  }

  if (key.includes("helmet")) {
    return `
      <svg viewBox="0 0 24 24">
        <path d="M4 13a8 8 0 0 1 16 0v3H9a5 5 0 0 1-5-3Z"></path>
        <path d="M15 16v4"></path>
      </svg>
    `;
  }

  if (key.includes("outerwear") || key.includes("apparel")) {
    return `
      <svg viewBox="0 0 24 24">
        <path d="m8 4-4 3 2 5 3-2v10h6V10l3 2 2-5-4-3-2 3h-4z"></path>
      </svg>
    `;
  }

  if (key.includes("accessor")) {
    return `
      <svg viewBox="0 0 24 24">
        <path d="M6 8h12l2 12H4z"></path>
        <path d="M9 8a3 3 0 0 1 6 0"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24">
      <rect x="4" y="4" width="6" height="6" rx="1"></rect>
      <rect x="14" y="4" width="6" height="6" rx="1"></rect>
      <rect x="4" y="14" width="6" height="6" rx="1"></rect>
      <rect x="14" y="14" width="6" height="6" rx="1"></rect>
    </svg>
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
