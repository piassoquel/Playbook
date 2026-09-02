import { PLAYBOOK_CONFIG } from "../config/app-config.js";

const FALLBACK_DATA_URL = "./data/app-data.json";

export async function loadAppData() {
  try {
    const cmsData = await fetchCmsData();
    return normalizeCmsData(cmsData);
  } catch (error) {
    console.error("CMS data load failed.", error);

    try {
      const fallbackResponse = await fetch(FALLBACK_DATA_URL, {
        cache: "no-store"
      });

      if (!fallbackResponse.ok) {
        throw new Error(
          `Fallback data request failed with status ${fallbackResponse.status}.`
        );
      }

      const fallbackData = await fallbackResponse.json();

      return normalizeLegacyData(fallbackData, {
        dataSource: "fallback",
        warning:
          "Playbook is showing local fallback data because the CMS could not be reached."
      });
    } catch (fallbackError) {
      console.error("Fallback data load failed.", fallbackError);

      throw new Error(
        "Playbook could not load data from the CMS or the local fallback file."
      );
    }
  }
}

async function fetchCmsData() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    PLAYBOOK_CONFIG.requestTimeoutMs
  );

  try {
    const separator = PLAYBOOK_CONFIG.apiUrl.includes("?") ? "&" : "?";
    const response = await fetch(
      `${PLAYBOOK_CONFIG.apiUrl}${separator}t=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(
        `CMS request failed with status ${response.status}.`
      );
    }

    const data = await response.json();

    if (!data || data.success !== true) {
      throw new Error(
        data?.error || "The CMS returned an invalid response."
      );
    }

    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function normalizeCmsData(data) {
  const sports = Array.isArray(data.sports)
    ? data.sports.map(normalizeSport)
    : [];

  return {
    sports,
    categories: Array.isArray(data.categories)
      ? data.categories
      : [],
    brands: Array.isArray(data.brands)
      ? data.brands
      : [],
    products: Array.isArray(data.products)
      ? data.products
      : [],
    recommendationCandidates: data.recommendationCandidates || { Binding: [], Boot: [] },
    dailyFocus: normalizeDailyFocus(data.dailyFocus),
    settings: data.settings || {},
    version: data.version || {},
    generatedAt: data.generatedAt || "",
    lastUpdated: data.lastUpdated || "",
    dataSource: "cms",
    warning: ""
  };
}

function normalizeSport(sport) {
  const sourceId = String(
    sport.id || sport.SportID || ""
  ).trim();

  return {
    id: sourceId.toLowerCase(),
    sourceId,
    name: String(sport.name || sport.Name || ""),
    description: String(
      sport.description || sport.Description || ""
    ),
    image: String(sport.image || sport.ImageURL || ""),
    icon: String(sport.icon || sport.Icon || ""),
    displayOrder: Number(
      sport.displayOrder || sport.DisplayOrder || 0
    ),
    categories: Array.isArray(sport.categories)
      ? sport.categories.map(normalizeCategory)
      : []
  };
}

function normalizeCategory(category) {
  const sourceId = String(
    category.id || category.CategoryID || ""
  ).trim();

  return {
    id: sourceId.toLowerCase(),
    sourceId,
    name: String(category.name || category.Name || ""),
    description: String(
      category.description || category.Description || ""
    ),
    icon: String(category.icon || category.Icon || ""),
    displayOrder: Number(
      category.displayOrder || category.DisplayOrder || 0
    )
  };
}

function normalizeDailyFocus(focus) {
  if (!focus || focus.enabled !== true) {
    return { enabled: false };
  }

  return {
    enabled: true,
    focusId: String(focus.focusId || ""),
    startDate: String(focus.startDate || ""),
    endDate: String(focus.endDate || ""),
    productId: String(focus.productId || ""),
    headline: String(focus.headline || "Daily Focus"),
    message: String(focus.message || ""),
    brand: String(focus.brand || ""),
    name: String(focus.name || ""),
    summary: String(
      focus.summary || focus.message || ""
    )
  };
}

function normalizeLegacyData(data, metadata = {}) {
  return {
    ...data,
    sports: Array.isArray(data.sports) ? data.sports : [],
    brands: Array.isArray(data.brands) ? data.brands : [],
    products: Array.isArray(data.products) ? data.products : [],
    dailyFocus: data.dailyFocus || { enabled: false },
    settings: data.settings || {},
    version: data.version || {},
    generatedAt: data.generatedAt || "",
    lastUpdated: data.lastUpdated || "",
    dataSource: metadata.dataSource || "legacy",
    warning: metadata.warning || ""
  };
}
