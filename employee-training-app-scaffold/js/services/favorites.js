const STORAGE_KEY = "playbook-favorite-products";

export function getFavoriteProductIds() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];

    return Array.isArray(parsed)
      ? parsed.map((id) => String(id))
      : [];
  } catch (error) {
    console.warn("Could not read favorites.", error);
    return [];
  }
}

export function isFavorite(productId) {
  return getFavoriteProductIds().includes(String(productId));
}

export function addFavorite(productId) {
  const ids = new Set(getFavoriteProductIds());
  ids.add(String(productId));
  saveFavorites([...ids]);
}

export function removeFavorite(productId) {
  const ids = getFavoriteProductIds().filter(
    (id) => id !== String(productId)
  );

  saveFavorites(ids);
}

export function toggleFavorite(productId) {
  if (isFavorite(productId)) {
    removeFavorite(productId);
    return false;
  }

  addFavorite(productId);
  return true;
}

function saveFavorites(ids) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(ids)
  );

  window.dispatchEvent(
    new CustomEvent("playbook:favorites-changed", {
      detail: { ids }
    })
  );
}
