import { loadAppData } from "../js/services/api.js";
import {
  SNOWBOARD_SHAPES,
  getFlexOptions,
} from "./config/product-fields.js";
import {
  ProductWriteError,
  ProductWriteUnavailableError,
  updateProduct,
} from "./services/product-admin-api.js";

const GOOGLE_OAUTH_CLIENT_ID = "739744165564-k3i9gq2ivhb1namdl7jf65rgplk59oo7.apps.googleusercontent.com";

const pageContent = {
  import: ["Import", "Bring product information into Playbook."],
  brands: ["Brands", "Organize and maintain the brands in your catalog."],
  categories: ["Categories", "Structure products into clear, useful categories."],
  settings: ["Settings", "Configure your Playbook Admin workspace."],
};

const productTaxonomy = {
  snowboarding: {
    name: "Snowboarding",
    cmsSportIds: ["SNB", "SNOWBOARDING"],
    image: "../assets/sports/snowboarding-home.webp",
    types: {
      boards: ["Boards", ["SNBBOARD", "BOARDS"]],
      bindings: ["Bindings", ["SNBBIND", "SNBBINDINGS", "BINDINGS"]],
      boots: ["Boots", ["SNBBOOT", "SNBBOOTS", "BOOTS"]],
    },
  },
  skiing: {
    name: "Skiing",
    cmsSportIds: ["SKI", "SKIING"],
    image: "../assets/sports/skiing-home.webp",
    types: {
      skis: ["Skis", ["SKIS"]],
      bindings: ["Bindings", ["SKIBIND", "SKIBINDINGS", "BINDINGS"]],
      boots: ["Boots", ["SKIBOOT", "SKIBOOTS", "BOOTS"]],
    },
  },
};

const statCards = [
  ["Products", "box"],
  ["Needs Review", "review"],
  ["Published", "check"],
  ["Archived", "archive"],
];

const icons = {
  box: '<path d="m4 7 8-4 8 4-8 4z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4z"/>',
  review: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/>',
  archive: '<path d="M4 7h16v13H4zM3 3h18v4H3zM9 11h6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
};

const main = document.querySelector("#main-content");
const navItems = [...document.querySelectorAll("[data-page]")];
const menuButton = document.querySelector(".menu-button");
const backdrop = document.querySelector(".sidebar-backdrop");
const googleSignInContainer = document.querySelector("[data-google-signin]");
const signedInAccount = document.querySelector("[data-signed-in-account]");
const accountLabel = document.querySelector("[data-account-label]");
const accountAvatar = document.querySelector("[data-account-avatar]");
const signOutButton = document.querySelector("[data-sign-out]");

let appData = null;
let dataError = null;
let editorState = null;
let navigationApproved = false;
let adminIdentity = null;

function initializeGoogleSignIn(attempt = 0) {
  if (!window.google?.accounts?.id) {
    if (attempt < 50) window.setTimeout(() => initializeGoogleSignIn(attempt + 1), 100);
    else googleSignInContainer.textContent = "Google Sign-In could not load.";
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  renderGoogleSignInButton();
}

function renderGoogleSignInButton() {
  googleSignInContainer.hidden = false;
  googleSignInContainer.replaceChildren();
  window.google.accounts.id.renderButton(googleSignInContainer, {
    type: "standard",
    theme: "outline",
    size: "medium",
    text: "signin_with",
    shape: "rectangular",
  });
}

function handleGoogleCredential(response) {
  const claims = decodeGoogleCredential(response?.credential);
  if (!claims?.email || !claims?.exp) {
    adminIdentity = null;
    renderGoogleSignInButton();
    return;
  }

  adminIdentity = {
    token: response.credential,
    email: String(claims.email),
    expiresAt: Number(claims.exp) * 1000,
  };
  googleSignInContainer.hidden = true;
  signedInAccount.hidden = false;
  accountLabel.textContent = adminIdentity.email;
  accountAvatar.textContent = accountInitials(adminIdentity.email);
}

function decodeGoogleCredential(token) {
  try {
    const payload = String(token || "").split(".")[1];
    if (!payload) return null;
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(decodeURIComponent(atob(normalized).split("").map((character) =>
      `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`
    ).join("")));
  } catch (error) {
    console.error("Google credential could not be read.", error);
    return null;
  }
}

function accountInitials(email) {
  return String(email).split("@")[0].split(/[._-]/).map((part) => part[0] || "").join("").slice(0, 2).toUpperCase() || "PA";
}

function getAdminAuthToken() {
  if (!adminIdentity?.token || adminIdentity.expiresAt <= Date.now() + 30000) {
    adminIdentity = null;
    signedInAccount.hidden = true;
    if (window.google?.accounts?.id) renderGoogleSignInButton();
    return "";
  }
  return adminIdentity.token;
}

function signOutAdmin() {
  adminIdentity = null;
  signedInAccount.hidden = true;
  window.google?.accounts?.id?.disableAutoSelect();
  if (window.google?.accounts?.id) renderGoogleSignInButton();
}

function getRouteParts() {
  return window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
}

function renderHeading(title, description, eyebrow = "Overview") {
  return `<header class="page-heading"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></header>`;
}

function renderDashboard() {
  const products = appData?.products || [];
  const values = {
    Products: products.length || "—",
    "Needs Review": countByStatus(products, "review") || "—",
    Published: countByStatus(products, "published") || "—",
    Archived: countByStatus(products, "archived") || "—",
  };
  const cards = statCards.map(([label, icon]) => `
    <article class="stat-card">
      <div class="stat-card__header"><p class="stat-card__label">${label}</p><span class="stat-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons[icon]}</svg></span></div>
      <p class="stat-card__value">${values[label]}</p>
      <p class="stat-card__note">${appData ? "Live catalog" : "Data will appear here"}</p>
    </article>`).join("");
  main.innerHTML = `${renderHeading("Dashboard", "A quick view of your Playbook catalog.")}<section class="stat-grid" aria-label="Catalog summary">${cards}</section>`;
}

function renderProductsHome() {
  if (!renderDataBoundary()) return;
  const choices = Object.entries(productTaxonomy).map(([slug, sport]) => {
    const count = getProductsForSport(slug).length;
    return `<a class="choice-card choice-card--sport" href="#/products/${slug}">
      <div class="choice-card__media"><img src="${sport.image}" alt="" loading="lazy"></div>
      <div class="choice-card__body"><div><p class="choice-card__meta">${count} ${count === 1 ? "product" : "products"}</p><h3>${sport.name}</h3></div>${chevronIcon()}</div>
    </a>`;
  }).join("");
  main.innerHTML = `${renderHeading("Products", "Choose a sport to browse its product catalog.", "Catalog")}<section class="choice-grid choice-grid--sports" aria-label="Choose a sport">${choices}</section>`;
}

function renderProductTypes(sportSlug) {
  const sport = productTaxonomy[sportSlug];
  if (!sport) return renderNotFound("Sport not found", "#/products");
  if (!renderDataBoundary()) return;
  const choices = Object.entries(sport.types).map(([typeSlug, [name]]) => {
    const count = getProductsForType(sportSlug, typeSlug).length;
    return `<a class="choice-card choice-card--type" href="#/products/${sportSlug}/${typeSlug}">
      <span class="type-icon" aria-hidden="true">${name.charAt(0)}</span>
      <div class="choice-card__body"><div><p class="choice-card__meta">${count} ${count === 1 ? "product" : "products"}</p><h3>${name}</h3></div>${chevronIcon()}</div>
    </a>`;
  }).join("");
  main.innerHTML = `${renderBreadcrumbs([["Products", "#/products"], [sport.name]])}${renderHeading(sport.name, "Choose a product type to continue.", "Products")}<section class="choice-grid choice-grid--types" aria-label="Choose a product type">${choices}</section>`;
}

function renderProductList(sportSlug, typeSlug) {
  const sport = productTaxonomy[sportSlug];
  const type = sport?.types[typeSlug];
  if (!sport || !type) return renderNotFound("Product type not found", "#/products");
  if (!renderDataBoundary()) return;
  const [typeName] = type;
  const products = getProductsForType(sportSlug, typeSlug).sort((a, b) => getBrandName(a).localeCompare(getBrandName(b)) || String(a.Model || "").localeCompare(String(b.Model || "")));

  main.innerHTML = `
    ${renderBreadcrumbs([["Products", "#/products"], [sport.name, `#/products/${sportSlug}`], [typeName]])}
    <div class="list-heading">
      ${renderHeading(typeName, `${sport.name} catalog`, "Products")}
      <label class="search-field"><span class="search-field__icon" aria-hidden="true"><svg viewBox="0 0 24 24">${icons.search}</svg></span><span class="sr-only">Search products</span><input type="search" placeholder="Search by brand or model" autocomplete="off" data-product-search></label>
    </div>
    <div class="result-summary" aria-live="polite" data-result-summary></div>
    <section class="product-list" aria-label="Products" data-product-list></section>`;

  const input = main.querySelector("[data-product-search]");
  const updateList = () => renderProductRows(products, sportSlug, typeSlug, input.value);
  input.addEventListener("input", updateList);
  updateList();
}

function renderProductRows(products, sportSlug, typeSlug, query = "") {
  const filtered = products.filter((product) => normalize([getBrandName(product), product.Model, product.Season, getStatus(product)].join(" ")).includes(normalize(query)));
  const list = main.querySelector("[data-product-list]");
  main.querySelector("[data-result-summary]").textContent = `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`;
  if (!filtered.length) {
    list.innerHTML = `<div class="catalog-empty"><span class="empty-state__icon" aria-hidden="true">0</span><h3>No products found</h3><p>${products.length ? "Try a different brand or model." : "No products in this category are available from the CMS yet."}</p></div>`;
    return;
  }
  list.innerHTML = filtered.map((product) => createProductRow(product, sportSlug, typeSlug)).join("");
  bindImageFallbacks();
}

function createProductRow(product, sportSlug, typeSlug) {
  const brand = getBrandName(product);
  const model = product.Model || "Unnamed product";
  const image = getProductImage(product);
  const status = getStatus(product);
  const productId = encodeURIComponent(String(product.ProductID || ""));
  return `<a class="admin-product" href="#/products/${sportSlug}/${typeSlug}/product/${productId}" aria-label="Open ${escapeHtml(`${brand} ${model}`)}">
    <div class="admin-product__image">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" data-product-image>` : productPlaceholder(brand, model)}</div>
    <div class="admin-product__identity"><p>${escapeHtml(brand)}</p><h3>${escapeHtml(model)}</h3></div>
    <dl class="admin-product__facts"><div><dt>Season</dt><dd>${escapeHtml(product.Season || "—")}</dd></div><div><dt>Status</dt><dd><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span></dd></div></dl>
    ${chevronIcon()}
  </a>`;
}

function renderProductDetail(sportSlug, typeSlug, productId) {
  const sport = productTaxonomy[sportSlug];
  const type = sport?.types[typeSlug];
  if (!sport || !type) return renderNotFound("Product path not found", "#/products");
  if (!renderDataBoundary()) return;
  const product = (appData.products || []).find((item) => normalize(item.ProductID) === normalize(productId));
  if (!product) return renderNotFound("Product not found", `#/products/${sportSlug}/${typeSlug}`);
  const [typeName] = type;
  const route = window.location.hash;

  if (!editorState || normalize(editorState.productId) !== normalize(product.ProductID)) {
    const draft = createProductDraft(product);
    editorState = {
      productId: product.ProductID,
      route,
      original: { ...draft },
      draft,
      touched: new Set(),
      dirty: false,
    };
  } else {
    editorState.route = route;
  }

  const draft = editorState.draft;
  const brand = getBrandName({ BrandID: draft.BrandID });
  const neighbors = getProductNeighbors(sportSlug, typeSlug, product.ProductID);
  const variants = getAvailableVariants(product);

  main.innerHTML = `
    ${renderBreadcrumbs([["Products", "#/products"], [sport.name, `#/products/${sportSlug}`], [typeName, `#/products/${sportSlug}/${typeSlug}`], [draft.Model || "Product Editor"]])}
    <header class="editor-header">
      <a class="editor-neighbor ${neighbors.previous ? "" : "is-disabled"}" ${neighbors.previous ? `href="${neighbors.previous.href}"` : 'aria-disabled="true"'}>
        <span aria-hidden="true">←</span><span><small>Previous Product</small>${escapeHtml(neighbors.previous?.name || "None")}</span>
      </a>
      <div class="editor-header__title">
        <p class="eyebrow">Product Editor</p>
        <h2>${escapeHtml(draft.Model || "Unnamed product")}</h2>
        <div class="editor-header__status"><span class="status-pill ${statusClass(draft.Status)}" data-editor-status>${escapeHtml(draft.Status)}</span><span class="unsaved-label" data-unsaved-label hidden>Unsaved changes</span></div>
      </div>
      <a class="editor-neighbor editor-neighbor--next ${neighbors.next ? "" : "is-disabled"}" ${neighbors.next ? `href="${neighbors.next.href}"` : 'aria-disabled="true"'}>
        <span><small>Next Product</small>${escapeHtml(neighbors.next?.name || "None")}</span><span aria-hidden="true">→</span>
      </a>
      <button class="save-button" type="submit" form="product-editor-form" data-save-button disabled>Save Changes</button>
    </header>

    <div class="save-feedback" role="status" aria-live="polite" data-save-feedback hidden></div>

    <form class="product-editor" id="product-editor-form">
      ${renderEditorSection("Product Information", "Core catalog identity and publishing information.", `
        <div class="editor-grid">
          ${renderSelectField("Brand", "BrandID", draft.BrandID, getBrandOptions())}
          ${renderInputField("Model", "Model", draft.Model)}
          ${renderSelectField("Sport", "SportID", draft.SportID, [["SNB", "Snowboarding"], ["SKI", "Skiing"]])}
          ${renderSelectField("Category", "CategoryID", draft.CategoryID, getCategoryOptions(draft.SportID))}
          ${renderInputField("Season", "Season", draft.Season, "number")}
          ${renderInputField("Price", "MSRP", draft.MSRP, "number", { step: "0.01", min: "0" })}
          ${renderInputField("Image URL", "ImageURL", draft.ImageURL, "url", { wide: true })}
          ${renderSelectField("Status", "Status", draft.Status, [["Needs Review", "Needs Review"], ["Published", "Published"], ["Archived", "Archived"]])}
        </div>
        <div class="editor-image-preview" data-image-preview>
          ${draft.ImageURL ? `<img src="${escapeHtml(draft.ImageURL)}" alt="${escapeHtml(`${brand} ${draft.Model}`)}">` : productPlaceholder(brand, draft.Model)}
        </div>
      `)}

      ${renderEditorSection("Performance", "Customer fit and on-snow performance ratings.", `
        <div class="editor-grid">
          ${renderSelectField("Ability Level", "AbilityLevel", draft.AbilityLevel, [["", "Not set"], ["1", "1 — Beginner"], ["2", "2 — Beginner / Intermediate"], ["3", "3 — Intermediate"], ["4", "4 — Advanced"], ["5", "5 — Expert"]])}
          ${renderTerrainField("Groomers", "TerrainGroomers", draft.TerrainGroomers)}
          ${renderTerrainField("All Mountain", "TerrainAllMountain", draft.TerrainAllMountain)}
          ${renderTerrainField("Powder", "TerrainPowder", draft.TerrainPowder)}
          ${renderTerrainField("Trees", "TerrainTrees", draft.TerrainTrees)}
          ${renderTerrainField("Park", "TerrainPark", draft.TerrainPark)}
          <div data-shape-or-width-field>${renderShapeOrWidthField(draft)}</div>
          ${renderSelectField("Flex", "Flex", draft.Flex, [["", "Not set"], ...getFlexOptions(appData, draft.Flex).map((value) => [value, value])])}
        </div>
        ${variants.length ? renderVariants(variants) : `<div class="editor-empty-inline"><strong>Variants / sizes</strong><span>Not currently exposed by the CMS API.</span></div>`}
      `)}

      ${renderEditorSection("Sales Dashboard", "Editable customer-facing guidance for the employee experience.", `
        <div class="editor-grid editor-grid--textareas">
          ${renderTextareaField("Customer Profile", "CustomerProfile", draft.CustomerProfile)}
          ${renderTextareaField("Selling Tips", "SellingTips", draft.SellingTips)}
          ${renderTextareaField("Comparison Notes", "ComparisonNotes", draft.ComparisonNotes)}
          ${renderTextareaField("Talking Points", "TalkingPoints", draft.TalkingPoints)}
          ${renderTextareaField("Common Questions", "CommonQuestions", draft.CommonQuestions)}
        </div>
      `)}

      ${renderEditorSection("Recommendations", "Pair this product with recommended bindings and boots.", `
        <div class="recommendation-groups">
          ${renderRecommendationGroup("Binding")}
          ${renderRecommendationGroup("Boot")}
        </div>
        <p class="recommendation-note">Recommendation fields are not currently exposed by the CMS API. These slots are ready to connect when support is added.</p>
      `)}
    </form>`;

  bindProductEditor(product, sportSlug, typeSlug);
}

function createProductDraft(product) {
  const ability = firstValue(product.AbilityLevel, product["Ability Level"]);
  const shapeOrWidth = String(product.ShapeOrWidth ?? product.Width ?? "");
  const controlledShapeOrWidth = normalize(product.SportID) === "SKI"
    ? shapeOrWidth.replace(/\s*mm\s*$/i, "")
    : shapeOrWidth;
  return {
    BrandID: String(product.BrandID ?? ""),
    Model: String(product.Model ?? ""),
    SportID: String(product.SportID ?? ""),
    CategoryID: String(product.CategoryID ?? ""),
    Season: String(product.Season ?? ""),
    MSRP: String(product.MSRP ?? ""),
    ImageURL: String(product.ImageURL || product.HeroImage || product.ThumbnailImage || ""),
    Status: mapCmsStatus(product),
    AbilityLevel: String(ability ?? ""),
    TerrainGroomers: String(product.TerrainGroomers ?? ""),
    TerrainAllMountain: String(product.TerrainAllMountain ?? ""),
    TerrainPowder: String(product.TerrainPowder ?? ""),
    TerrainTrees: String(product.TerrainTrees ?? ""),
    TerrainPark: String(product.TerrainPark ?? ""),
    ShapeOrWidth: controlledShapeOrWidth,
    Flex: String(product.Flex ?? ""),
    CustomerProfile: String(product.CustomerProfile ?? ""),
    SellingTips: String(product.SellingTips ?? ""),
    ComparisonNotes: String(product.ComparisonNotes ?? ""),
    TalkingPoints: String(product.TalkingPoints ?? ""),
    CommonQuestions: String(product.CommonQuestions ?? ""),
  };
}

function renderEditorSection(title, description, content) {
  return `<section class="editor-section"><header><div><h3>${title}</h3><p>${description}</p></div></header><div class="editor-section__body">${content}</div></section>`;
}

function renderInputField(label, field, value, type = "text", options = {}) {
  const attributes = Object.entries(options).filter(([key]) => key !== "wide").map(([key, item]) => `${key}="${escapeHtml(item)}"`).join(" ");
  return `<label class="form-field ${options.wide ? "form-field--wide" : ""}"><span>${label}</span><input type="${type}" value="${escapeHtml(value)}" data-field="${field}" ${attributes}></label>`;
}

function renderSelectField(label, field, value, options) {
  return `<label class="form-field"><span>${label}</span><select data-field="${field}">${options.map(([optionValue, optionLabel]) => `<option value="${escapeHtml(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`).join("")}</select></label>`;
}

function renderTerrainField(label, field, value) {
  return renderSelectField(label, field, value, [["", "Not set"], ...Array.from({ length: 5 }, (_, index) => {
    const rating = index + 1;
    return [String(rating), `${rating} / 5`];
  })]);
}

function renderShapeOrWidthField(draft) {
  if (normalize(draft.SportID) === "SKI") {
    const numericWidth = String(draft.ShapeOrWidth || "").replace(/\s*mm\s*$/i, "");
    return renderInputField("Width", "ShapeOrWidth", numericWidth, "number", { min: "0", step: "1" });
  }

  const options = [...SNOWBOARD_SHAPES];
  if (draft.ShapeOrWidth && !options.includes(draft.ShapeOrWidth)) options.push(draft.ShapeOrWidth);
  return renderSelectField("Shape", "ShapeOrWidth", draft.ShapeOrWidth, [["", "Not set"], ...options.map((value) => [value, value])]);
}

function renderTextareaField(label, field, value) {
  return `<label class="form-field form-field--textarea"><span>${label}</span><textarea rows="6" data-field="${field}">${escapeHtml(value)}</textarea></label>`;
}

function renderRecommendationGroup(productType) {
  return `<div class="recommendation-group"><h4>${productType}</h4><div class="recommendation-slots">${["Recommended", "Upgrade", "Budget"].map((tier) => `<div class="recommendation-slot"><span>${tier}</span><strong>Not configured</strong><small>CMS field required</small></div>`).join("")}</div></div>`;
}

function renderVariants(variants) {
  return `<div class="editor-variants"><strong>Available variants / sizes</strong><div>${variants.map((variant) => `<span>${escapeHtml(variant)}</span>`).join("")}</div></div>`;
}

function getAvailableVariants(product) {
  const value = firstValue(product.Variants, product.Sizes, product.AvailableSizes, product.Lengths);
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value).split(/[|,]/).map((item) => item.trim()).filter(Boolean);
}

function getBrandOptions() {
  return (appData.brands || []).map((brand) => [String(brand.BrandID || brand.id || ""), String(brand.Name || brand.name || "Unknown brand")]);
}

function getCategoryOptions(sportId) {
  const isSnowboarding = normalize(sportId) === "SNB";
  const sport = productTaxonomy[isSnowboarding ? "snowboarding" : "skiing"];
  return Object.values(sport.types).map(([name, ids]) => [ids[0], name]);
}

function getProductNeighbors(sportSlug, typeSlug, productId) {
  const products = getProductsForType(sportSlug, typeSlug).sort((a, b) => getBrandName(a).localeCompare(getBrandName(b)) || String(a.Model || "").localeCompare(String(b.Model || "")));
  const index = products.findIndex((item) => normalize(item.ProductID) === normalize(productId));
  const createNeighbor = (item) => item ? { name: `${getBrandName(item)} ${item.Model || ""}`, href: `#/products/${sportSlug}/${typeSlug}/product/${encodeURIComponent(item.ProductID)}` } : null;
  return { previous: createNeighbor(products[index - 1]), next: createNeighbor(products[index + 1]) };
}

function mapCmsStatus(product) {
  const status = normalize(product.RowStatus || product.Status || (isTruthy(product.Active) ? "Active" : "Archived"));
  if (status.includes("REVIEW") || status === "DRAFT") return "Needs Review";
  if (status === "ARCHIVED" || status === "INACTIVE") return "Archived";
  return "Published";
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function bindProductEditor(product, sportSlug, typeSlug) {
  const form = main.querySelector("#product-editor-form");
  const saveButton = main.querySelector("[data-save-button]");
  const feedback = main.querySelector("[data-save-feedback]");

  form.querySelectorAll("[data-field]").forEach((control) => {
    control.addEventListener("input", () => {
      updateDraftField(control.dataset.field, control.value);

      if (control.dataset.field === "Status") {
        const status = main.querySelector("[data-editor-status]");
        status.textContent = control.value;
        status.className = `status-pill ${statusClass(control.value)}`;
      }

      if (control.dataset.field === "ImageURL") {
        updateImagePreview(control.value);
      }

      if (control.dataset.field === "SportID") {
        const categoryControl = form.querySelector('[data-field="CategoryID"]');
        const categoryOptions = getCategoryOptions(control.value);
        categoryControl.innerHTML = categoryOptions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
        categoryControl.value = categoryOptions[0]?.[0] || "";
        updateDraftField("CategoryID", categoryControl.value);
        renderProductDetail(sportSlug, typeSlug, product.ProductID);
        return;
      }

      feedback.hidden = true;
      updateEditorDirtyUi();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editorState.dirty) return;

    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    feedback.hidden = true;

    try {
      const changes = buildProductChanges(editorState.draft, editorState.touched);
      const authToken = getAdminAuthToken();
      if (!authToken) {
        throw new ProductWriteError("Sign in with Google before saving.", "UNAUTHORIZED");
      }
      const result = await updateProduct(product.ProductID, changes, {
        expectedLastUpdated: product.LastUpdated,
        authToken,
      });
      Object.assign(product, result.product || changes);
      product.LastUpdated = result.lastUpdated;
      editorState.original = { ...editorState.draft };
      editorState.touched.clear();
      editorState.dirty = false;
      showSaveFeedback("Changes saved to Playbook CMS.", "success");
    } catch (error) {
      if (error instanceof ProductWriteUnavailableError) {
        showSaveFeedback("Saving is not connected to the CMS yet. Your edits remain in this browser and have not been persisted.", "warning");
      } else if (error instanceof ProductWriteError) {
        console.error("Product save failed.", error);
        if (error.code === "UNAUTHORIZED") signOutAdmin();
        showSaveFeedback(error.message, "error");
      } else {
        console.error("Product save failed.", error);
        showSaveFeedback("The product could not be saved. Your edits remain in this browser.", "error");
      }
    } finally {
      saveButton.textContent = "Save Changes";
      updateEditorDirtyUi();
    }
  });

  updateEditorDirtyUi();
}

function updateDraftField(field, value) {
  editorState.draft[field] = value;
  if (String(value) === String(editorState.original[field])) editorState.touched.delete(field);
  else editorState.touched.add(field);
  editorState.dirty = editorState.touched.size > 0;
}

function updateEditorDirtyUi() {
  const saveButton = main.querySelector("[data-save-button]");
  const label = main.querySelector("[data-unsaved-label]");
  if (saveButton) saveButton.disabled = !editorState?.dirty;
  if (label) label.hidden = !editorState?.dirty;
}

function updateImagePreview(url) {
  const preview = main.querySelector("[data-image-preview]");
  if (!preview) return;
  const brand = getBrandName({ BrandID: editorState.draft.BrandID });
  preview.innerHTML = String(url).trim()
    ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(`${brand} ${editorState.draft.Model}`)}">`
    : productPlaceholder(brand, editorState.draft.Model);
}

function buildProductChanges(draft, touched) {
  const numericFields = new Set(["Season", "MSRP", "AbilityLevel", "TerrainGroomers", "TerrainAllMountain", "TerrainPowder", "TerrainTrees", "TerrainPark"]);
  const changes = {};

  touched.forEach((field) => {
    const apiField = field;
    const value = draft[field];
    const isSkiWidth = field === "ShapeOrWidth" && normalize(draft.SportID) === "SKI";
    changes[apiField] = (numericFields.has(field) || isSkiWidth) && value !== "" ? Number(value) : value;
  });

  return changes;
}

function showSaveFeedback(message, type) {
  const feedback = main.querySelector("[data-save-feedback]");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `save-feedback save-feedback--${type}`;
  feedback.hidden = false;
}

function renderPlaceholder(page) {
  const [title, description] = pageContent[page];
  main.innerHTML = `${renderHeading(title, description)}<section class="empty-state"><div><span class="empty-state__icon" aria-hidden="true">${title.charAt(0)}</span><h3>${title} workspace</h3><p>This area is ready for the next phase of Playbook Admin development.</p></div></section>`;
}

function renderDataBoundary() {
  if (appData) return true;
  if (dataError) {
    main.innerHTML = `${renderHeading("Products unavailable", "The Playbook CMS could not be reached.", "Connection error")}<section class="catalog-empty"><span class="empty-state__icon" aria-hidden="true">!</span><h3>Could not load the catalog</h3><p>Check your connection and refresh the page to try again.</p></section>`;
  } else {
    main.innerHTML = `${renderHeading("Products", "Loading the latest catalog from Playbook CMS.", "Catalog")}<div class="loading-state" role="status"><span class="spinner" aria-hidden="true"></span>Loading products…</div>`;
  }
  return false;
}

function renderNotFound(message, backHref) {
  main.innerHTML = `${renderHeading(message, "The requested catalog location does not exist.", "Not found")}<a class="text-link" href="${backHref}">Return to products</a>`;
}

function renderBreadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="Breadcrumb">${items.map(([label, href], index) => `${index ? '<span aria-hidden="true">/</span>' : ""}${href ? `<a href="${href}">${escapeHtml(label)}</a>` : `<span aria-current="page">${escapeHtml(label)}</span>`}`).join("")}</nav>`;
}

function getProductsForSport(sportSlug) {
  const sport = productTaxonomy[sportSlug];
  return (appData?.products || []).filter((product) => sport.cmsSportIds.includes(normalize(product.SportID)));
}

function getProductsForType(sportSlug, typeSlug) {
  const sport = productTaxonomy[sportSlug];
  const categoryIds = sport?.types[typeSlug]?.[1];
  if (!sport || !categoryIds) return [];
  return getProductsForSport(sportSlug).filter((product) => categoryIds.includes(normalize(product.CategoryID)));
}

function getBrandName(product) {
  const brand = (appData?.brands || []).find((item) => normalize(item.BrandID || item.id) === normalize(product.BrandID));
  return String(brand?.Name || brand?.name || product.BrandID || "Unknown brand");
}

function getProductImage(product) {
  return String(product.ThumbnailImage || product.HeroImage || product.ImageURL || "").trim();
}

function getStatus(product) {
  if (product.RowStatus || product.Status) return String(product.RowStatus || product.Status);
  return isTruthy(product.Active) ? "Active" : "Archived";
}

function countByStatus(products, type) {
  return products.filter((product) => {
    const status = normalize(getStatus(product));
    if (type === "review") return status.includes("REVIEW") || status === "DRAFT";
    if (type === "published") return ["PUBLISHED", "READY", "ACTIVE"].includes(status);
    return ["ARCHIVED", "INACTIVE"].includes(status);
  }).length;
}

function statusClass(status) {
  const normalized = normalize(status);
  if (["READY", "PUBLISHED", "ACTIVE"].includes(normalized)) return "status-pill--positive";
  if (normalized.includes("REVIEW") || normalized === "DRAFT") return "status-pill--warning";
  if (["ARCHIVED", "INACTIVE"].includes(normalized)) return "status-pill--muted";
  return "";
}

function productPlaceholder(brand, model) {
  return `<div class="product-placeholder"><span>${escapeHtml(brand)}</span><strong>${escapeHtml(model)}</strong></div>`;
}

function bindImageFallbacks() {
  main.querySelectorAll("[data-product-image]").forEach((image) => image.addEventListener("error", () => {
    const product = image.closest(".admin-product, .product-view");
    const brand = product?.querySelector(".admin-product__identity p, .eyebrow")?.textContent || "Playbook";
    const model = product?.querySelector("h2, h3")?.textContent || "Product";
    image.parentElement.innerHTML = productPlaceholder(brand, model);
  }, { once: true }));
}

function chevronIcon() {
  return `<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">${icons.chevron}</svg>`;
}

function isTruthy(value) {
  return value === true || ["TRUE", "YES", "1"].includes(normalize(value));
}

function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function closeNavigation() {
  document.body.classList.remove("nav-open");
  menuButton.setAttribute("aria-expanded", "false");
}

function updateNavigation(activePage) {
  navItems.forEach((item) => item.dataset.page === activePage ? item.setAttribute("aria-current", "page") : item.removeAttribute("aria-current"));
}

function renderRoute() {
  const parts = getRouteParts();
  const root = parts[0] || "dashboard";
  updateNavigation(root);
  if (root === "dashboard" && parts.length === 1) renderDashboard();
  else if (root === "products" && parts.length === 1) renderProductsHome();
  else if (root === "products" && parts.length === 2) renderProductTypes(parts[1]);
  else if (root === "products" && parts.length === 3) renderProductList(parts[1], parts[2]);
  else if (root === "products" && parts[3] === "product" && parts.length === 5) renderProductDetail(parts[1], parts[2], parts[4]);
  else if (pageContent[root] && parts.length === 1) renderPlaceholder(root);
  else renderNotFound("Page not found", "#/products");
  closeNavigation();
  window.scrollTo({ top: 0, behavior: "instant" });
  main.focus({ preventScroll: true });
  document.title = `${root.charAt(0).toUpperCase() + root.slice(1)} | Playbook Admin`;
}

menuButton.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("nav-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});
backdrop.addEventListener("click", closeNavigation);
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#/']");
  if (!link || !editorState?.dirty || link.hash === window.location.hash) return;

  if (!window.confirm("You have unsaved changes. Leave this product without saving?")) {
    event.preventDefault();
    return;
  }

  navigationApproved = true;
  editorState = null;
});

window.addEventListener("hashchange", () => {
  if (navigationApproved) {
    navigationApproved = false;
    renderRoute();
    return;
  }

  if (editorState?.dirty && window.location.hash !== editorState.route) {
    if (window.confirm("You have unsaved changes. Leave this product without saving?")) {
      editorState = null;
      renderRoute();
    } else {
      navigationApproved = true;
      window.location.hash = editorState.route;
    }
    return;
  }

  if (editorState && window.location.hash !== editorState.route) editorState = null;
  renderRoute();
});

window.addEventListener("beforeunload", (event) => {
  if (!editorState?.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});
window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeNavigation(); });

async function startApp() {
  if (!window.location.hash) window.location.replace("#/dashboard");
  renderRoute();
  try {
    appData = await loadAppData();
  } catch (error) {
    console.error("Admin catalog load failed.", error);
    dataError = error;
  }
  renderRoute();
}

startApp();
initializeGoogleSignIn();
signOutButton.addEventListener("click", signOutAdmin);
