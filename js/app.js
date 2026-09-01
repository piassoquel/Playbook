import { loadAppData } from "./services/api.js";
import { renderHomePage } from "./pages/home.js";
import { renderCategoriesPage } from "./pages/categories.js";
import { renderLearningPathsPage } from "./pages/learning-paths.js";
import { renderBrandsPage } from "./pages/brands.js";
import { renderFilterOptionsPage } from "./pages/filter-options.js";
import { renderProductListPage } from "./pages/products.js";
import { renderProductDetailPage } from "./pages/product-detail.js";
import { renderComparePage } from "./pages/compare.js";
import { renderNotFoundPage } from "./pages/not-found.js";
import { renderSearchPage } from "./pages/search.js";
import { renderFavoritesPage } from "./pages/favorites.js";
import { showToast } from "./components/toast.js";
import { renderDataStatus } from "./components/data-status.js";

let appData;


function updateBottomNavigation(activeItem) {
  document.querySelectorAll(".bottom-nav__item").forEach((item) => {
    item.classList.remove("bottom-nav__item--active");
    item.removeAttribute("aria-current");
  });

  const active = document.querySelector(
    `[data-nav="${activeItem}"]`
  );

  if (active) {
    active.classList.add("bottom-nav__item--active");
    active.setAttribute("aria-current", "page");
  }
}


function getRouteParts() {
  return window.location.hash
    .replace(/^#\/?/, "")
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
}

function findSport(sportId) {
  return appData.sports.find((item) => item.id === sportId);
}

function findCategory(sport, categoryId) {
  return sport?.categories.find((item) => item.id === categoryId);
}

function renderRoute() {
  const main = document.querySelector("#main-content");
  const parts = getRouteParts();

  window.scrollTo({ top: 0, behavior: "instant" });



  if (parts[0] === "favorites" && parts.length === 1) {
    renderFavoritesPage(
      main,
      appData.products || [],
      appData.brands || []
    );
    updateBottomNavigation("favorites");
    main.focus();
    return;
  }

  if (parts[0] === "search" && parts.length === 1) {
    renderSearchPage(
      main,
      appData.products || [],
      appData.brands || []
    );
    updateBottomNavigation("search");
    main.focus();
    return;
  }

  if (parts.length === 0) {
    updateBottomNavigation("home");
    renderHomePage(main, appData);
    main.focus();
    return;
  }


  if (
    parts[0] === "compare" &&
    (parts.length === 2 || parts.length === 3)
  ) {
    renderComparePage(
      main,
      parts[1],
      parts[2] || null,
      appData.products || [],
      appData.brands || []
    );
    main.focus();
    return;
  }

  if (parts[0] === "product" && parts.length === 2) {
    renderProductDetailPage(
      main,
      parts[1],
      appData.products || [],
      appData.brands || []
    );
    main.focus();
    return;
  }

  if (parts[0] === "sport" && parts.length >= 2) {
    const sport = findSport(parts[1]);

    if (!sport) {
      renderNotFoundPage(main);
      return;
    }

    if (parts.length === 2) {
      renderCategoriesPage(main, sport);
      main.focus();
      return;
    }

    if (parts[2] === "category" && parts.length >= 4) {
      const category = findCategory(sport, parts[3]);

      if (!category) {
        renderNotFoundPage(main);
        return;
      }

      if (parts.length === 4) {
        renderLearningPathsPage(
          main,
          sport,
          category,
          appData.products || []
        );
        main.focus();
        return;
      }

      if (parts[4] === "brands" && parts.length === 5) {
        renderBrandsPage(
          main,
          sport,
          category,
          appData.products || [],
          appData.brands || []
        );
        main.focus();
        return;
      }

      if (
        (parts[4] === "ability" || parts[4] === "terrain") &&
        parts.length === 5
      ) {
        renderFilterOptionsPage(
          main,
          sport,
          category,
          appData.products || [],
          parts[4]
        );
        main.focus();
        return;
      }

      if (
        parts[4] === "favorites" &&
        parts.length === 5
      ) {
        renderProductListPage(
          main,
          sport,
          category,
          appData.products || [],
          appData.brands || [],
          { type: "favorites" }
        );
        main.focus();
        return;
      }

      if (
        parts[4] === "new" &&
        parts.length === 5
      ) {
        renderProductListPage(
          main,
          sport,
          category,
          appData.products || [],
          appData.brands || [],
          { type: "new" }
        );
        main.focus();
        return;
      }

      if (parts[4] === "brand" && parts.length === 6) {
        renderProductListPage(
          main,
          sport,
          category,
          appData.products || [],
          appData.brands || [],
          { type: "brand", value: parts[5] }
        );
        main.focus();
        return;
      }

      if (
        (parts[4] === "ability" || parts[4] === "terrain") &&
        parts.length === 6
      ) {
        renderProductListPage(
          main,
          sport,
          category,
          appData.products || [],
          appData.brands || [],
          { type: parts[4], value: parts[5] }
        );
        main.focus();
        return;
      }

      if (parts[4] === "products" && parts.length === 5) {
        renderProductListPage(
          main,
          sport,
          category,
          appData.products || [],
          appData.brands || [],
          { type: "all" }
        );
        main.focus();
        return;
      }
    }
  }

  renderNotFoundPage(main);
  main.focus();
}

async function startApp() {
  const main = document.querySelector("#main-content");

  try {
    appData = await loadAppData();
    renderDataStatus(appData);

    window.addEventListener("hashchange", renderRoute);
    renderRoute();
  } catch (error) {
    console.error(error);

    main.innerHTML = `
      <section class="section-heading">
        <p class="eyebrow">Something went wrong</p>
        <h1 class="page-title">Playbook could not load.</h1>
        <p class="page-description">
          Refresh the page and make sure Live Server is running.
        </p>
      </section>
    `;
  }

  document.querySelectorAll("[data-coming-soon]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(`${button.dataset.comingSoon} is coming in a future release.`);
    });
  });

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./service-worker.js");
    } catch (error) {
      console.error("Service worker registration failed.", error);
    }
  }
}

startApp();
