export function getProductsForCategory(products, sport, category) {
  const sportId = normalize(sport.sourceId || sport.id);
  const categoryId = normalize(category.sourceId || category.id);

  return products.filter((product) => {
    return (
      normalize(product.SportID) === sportId &&
      normalize(product.CategoryID) === categoryId
    );
  });
}

export function getProductsByBrand(products, brandId) {
  const normalizedBrandId = normalize(brandId);

  return products.filter(
    (product) => normalize(product.BrandID) === normalizedBrandId
  );
}

export function getProductsByMultiValueField(products, fieldName, value) {
  const target = normalize(value);

  return products.filter((product) =>
    splitMultiValue(product[fieldName]).some(
      (entry) => normalize(entry) === target
    )
  );
}

export function getProductsByFlag(products, fieldName) {
  return products.filter((product) =>
    isTruthy(product[fieldName])
  );
}

export function getFilterValues(products, fieldName) {
  const values = new Set();

  products.forEach((product) => {
    splitMultiValue(product[fieldName]).forEach((entry) => {
      const clean = String(entry || "").trim();

      if (clean) {
        values.add(clean);
      }
    });
  });

  return [...values].sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

export function getBrandsWithProducts(brands, products) {
  const productBrandIds = new Set(
    products.map((product) => normalize(product.BrandID))
  );

  return brands
    .filter((brand) => productBrandIds.has(normalize(brand.BrandID)))
    .sort((a, b) =>
      String(a.Name || "").localeCompare(String(b.Name || ""))
    );
}

export function getProductById(products, productId) {
  const normalizedProductId = normalize(productId);

  return products.find(
    (product) => normalize(product.ProductID) === normalizedProductId
  );
}

export function getBrandById(brands, brandId) {
  const normalizedBrandId = normalize(brandId);

  return brands.find(
    (brand) => normalize(brand.BrandID) === normalizedBrandId
  );
}

function splitMultiValue(value) {
  return String(value || "")
    .split(/[|,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isTruthy(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return (
    value === true ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "1"
  );
}

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}
