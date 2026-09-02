// Product writes are intentionally isolated here. See ../CMS_WRITE_CONTRACT.md
// for the authenticated endpoint and patch schema required by Admin.
const PRODUCT_WRITE_URL = "";

export class ProductWriteUnavailableError extends Error {
  constructor() {
    super("Product saving is not connected to the Playbook CMS yet.");
    this.name = "ProductWriteUnavailableError";
  }
}

export async function updateProduct(productId, changes, options = {}) {
  if (!PRODUCT_WRITE_URL) {
    throw new ProductWriteUnavailableError();
  }

  const response = await fetch(PRODUCT_WRITE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "updateProduct",
      productId,
      changes,
      expectedLastUpdated: options.expectedLastUpdated || "",
    }),
  });

  if (!response.ok) {
    throw new Error(`Product save failed with status ${response.status}.`);
  }

  const result = await response.json();
  if (!result || result.success !== true) {
    throw new Error(result?.error || "The CMS did not confirm the product save.");
  }

  return result;
}
