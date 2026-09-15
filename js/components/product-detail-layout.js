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
  const images = getProductImages(product);
  return images[0]?.ImageURL || (
    product.HeroImage ||
    product.ImageURL ||
    product.ThumbnailImage ||
    ""
  );
}

export function getProductImages(product) {
  const rows = Array.isArray(product.Images) ? product.Images : [];
  const images = rows
    .map((image) => ({
      ImageURL: String(image.ImageURL || "").trim(),
      AltText: String(image.AltText || ""),
      ImageRole: String(image.ImageRole || ""),
    }))
    .filter((image) => image.ImageURL);
  if (images.length) return images;
  const fallback = String(product.HeroImage || product.ImageURL || product.ThumbnailImage || "").trim();
  return fallback ? [{ ImageURL: fallback, AltText: "", ImageRole: "Primary" }] : [];
}

export function isTrue(value) {
  return (
    value === true ||
    String(value).trim().toLowerCase() === "true" ||
    String(value).trim() === "1"
  );
}
