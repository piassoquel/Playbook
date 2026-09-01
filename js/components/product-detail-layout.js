export function getProductBadges(product) {
  const badges = [];

  if (isTrue(product.NewThisSeason)) {
    badges.push({ label: "New This Season", className: "product-badge--new" });
  }

  if (isTrue(product.StoreFavorite)) {
    badges.push({ label: "Store Favorite", className: "product-badge--favorite" });
  }

  if (isTrue(product.Featured)) {
    badges.push({ label: "Featured", className: "product-badge--featured" });
  }

  return badges;
}

export function parseRelatedProductIds(value) {
  return String(value || "")
    .split(/[|,]/)
    .map((id) => id.trim())
    .filter(Boolean);
}

export function getPrimaryImage(product) {
  return (
    product.HeroImage ||
    product.ImageURL ||
    product.ThumbnailImage ||
    ""
  );
}

export function isTrue(value) {
  return (
    value === true ||
    String(value).trim().toLowerCase() === "true" ||
    String(value).trim() === "1"
  );
}
