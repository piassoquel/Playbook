// Configure this with the /exec URL from the Apps Script web-app deployment.
export const PRODUCT_WRITE_URL = "https://script.google.com/macros/s/AKfycbySTeySHlA3PXVL7QCvGsTg-mi0BitTXr0nWG2-SzUNqMk1D5Wg4TvZsi8W35pRHChVHQ/exec";

export class ProductWriteUnavailableError extends Error {
  constructor() {
    super("Product saving is not connected to the Playbook CMS yet.");
    this.name = "ProductWriteUnavailableError";
  }
}

export class ProductWriteError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "ProductWriteError";
    this.code = code || "WRITE_ERROR";
    Object.assign(this, details);
  }
}

/**
 * options.authToken must be a fresh Google Identity Services ID token for the
 * OAuth client configured in Apps Script Script Properties. The token is a
 * per-session credential; no shared write secret belongs in static JavaScript.
 */
export async function updateProduct(productId, changes, options = {}) {
  if (!PRODUCT_WRITE_URL) throw new ProductWriteUnavailableError();
  if (!options.authToken) {
    throw new ProductWriteError("Sign in before saving.", "UNAUTHORIZED");
  }

  // text/plain makes this a CORS-simple request. Apps Script still receives
  // and parses the JSON body, without a browser OPTIONS preflight.
  const response = await fetch(PRODUCT_WRITE_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      action: "updateProduct",
      productId,
      changes,
      expectedLastUpdated: options.expectedLastUpdated || "",
      authToken: options.authToken,
    }),
  });

  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new ProductWriteError(
      `The CMS returned an unreadable response (${response.status}).`,
      "INVALID_RESPONSE"
    );
  }

  if (!result || result.success !== true) {
    throw new ProductWriteError(
      result?.error || `Product save failed (${response.status}).`,
      result?.code,
      {
        currentLastUpdated: result?.currentLastUpdated || "",
        product: result?.product || null,
      }
    );
  }
  return result;
}
