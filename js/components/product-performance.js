const ABILITY_LABELS = {
  1: "Beginner",
  2: "Beginner / Intermediate",
  3: "Intermediate",
  4: "Advanced",
  5: "Expert"
};

const TERRAIN_DEFINITIONS = [
  { key: "TerrainGroomers", label: "Groomers", icon: "groomers" },
  { key: "TerrainAllMountain", label: "All Mountain", icon: "all-mountain" },
  { key: "TerrainPowder", label: "Powder", icon: "powder" },
  { key: "TerrainTrees", label: "Trees", icon: "trees" },
  { key: "TerrainPark", label: "Park", icon: "park" }
];

const SHAPE_EDUCATION = {
  twin: {
    title: "Twin",
    summary: "A balanced shape that feels similar riding forward or switch.",
    benefits: [
      "Easy to recommend for park, jumps, side hits, and riders who value freestyle versatility.",
      "Helps customers who want a playful, centered feel instead of directional float or carving power.",
      "Usually best when the rider spends meaningful time riding switch."
    ]
  },
  truetwin: {
    title: "True Twin",
    summary: "A fully symmetrical twin shape with matching nose and tail dimensions.",
    benefits: [
      "Most natural choice for riders who want the same feel regular or switch.",
      "Strong fit for park laps, jumps, rails, and freestyle-focused all-mountain riding.",
      "Less specialized for deep powder than directional or tapered shapes."
    ]
  },
  directionaltwin: {
    title: "Directional Twin",
    summary: "A twin-inspired outline with subtle directional advantages.",
    benefits: [
      "A good middle ground for riders who want freestyle comfort with better all-mountain confidence.",
      "Often feels more stable at speed than a true twin while still being switch-friendly.",
      "Easy recommendation for customers who ride groomers and natural features but still want playfulness."
    ]
  },
  directional: {
    title: "Directional",
    summary: "A shape designed to perform best with one end leading.",
    benefits: [
      "Supports stronger carving, stability, and confidence in mixed resort conditions.",
      "Usually gives better drive through turns than a twin shape.",
      "Best for customers who mostly ride forward and do not prioritize switch riding."
    ]
  },
  tapereddirectional: {
    title: "Tapered Directional",
    summary: "A directional shape with a wider nose and narrower tail.",
    benefits: [
      "Helps the nose float and the tail sink in softer snow.",
      "Great talking point for powder, trees, surfy turns, and directional freeride boards.",
      "Usually not the first choice for customers who want symmetrical park performance."
    ]
  },
  asymmetrical: {
    title: "Asymmetrical",
    summary: "A shape tuned differently from toe edge to heel edge.",
    benefits: [
      "Designed to make heel-side turns feel more balanced and easier to control.",
      "Useful for riders who want a board that feels intuitive edge-to-edge.",
      "A strong education point when explaining why the board may look unusual but ride naturally."
    ]
  }
};

const PROFILE_EDUCATION = {
  camber: {
    title: "Camber",
    summary: "Traditional arch underfoot that stores energy and grips strongly.",
    benefits: [
      "Best talking points are edge hold, pop, stability, and powerful carving.",
      "Great for confident riders who like response and precision.",
      "Can feel less forgiving for newer riders compared with rocker or hybrid profiles."
    ]
  },
  rocker: {
    title: "Rocker",
    summary: "Upturned profile that makes the board easier to pivot and float.",
    benefits: [
      "Helps with easier turn initiation and a more forgiving feel.",
      "Useful for powder float and relaxed riding styles.",
      "May feel less locked-in at speed than camber-heavy profiles."
    ]
  },
  flat: {
    title: "Flat",
    summary: "A stable, neutral profile that sits between camber and rocker.",
    benefits: [
      "Good balance of stability, predictability, and forgiveness.",
      "Often easy for employees to position as a dependable all-around option.",
      "Less energetic than camber, but typically more planted than full rocker."
    ]
  },
  camrock: {
    title: "CamRock",
    summary: "Camber between the feet with rocker toward the tip and tail.",
    benefits: [
      "Combines grip and pop underfoot with easier turn entry and improved float.",
      "Strong all-mountain story for riders who want performance without a punishing feel.",
      "A helpful bridge between traditional camber and more forgiving rocker profiles."
    ]
  },
  hybridcamber: {
    title: "Hybrid Camber",
    summary: "Camber-focused profile with added shaping for forgiveness or float.",
    benefits: [
      "Keeps much of the edge hold and energy customers expect from camber.",
      "Often more approachable than full traditional camber.",
      "Good fit for riders who want responsive all-mountain performance."
    ]
  },
  hybridrocker: {
    title: "Hybrid Rocker",
    summary: "Rocker-focused profile with added camber or stable zones.",
    benefits: [
      "Prioritizes forgiveness, float, and easy turn initiation.",
      "Added camber zones can improve grip and stability compared with full rocker.",
      "Good for riders who want a mellow feel without giving up all support."
    ]
  }
};

export function createPerformancePanel(product) {
  const abilityLevel = resolveAbilityLevel(product);
  const terrainRatings = shouldShowTerrainPerformance(product)
    ? resolveTerrainRatings(product)
    : [];
  const productSpecs = resolveProductSpecs(product);

  if (!abilityLevel && !terrainRatings.length && !productSpecs.length) {
    return "";
  }

  return `
    <section class="performance-panel" aria-label="Product performance">
      ${
        terrainRatings.length
          ? createTerrainPerformance(terrainRatings)
          : ""
      }

      ${
        abilityLevel || productSpecs.length
          ? `
            <div class="performance-lower-grid">
              ${
                abilityLevel
                  ? createAbilityGauge(product, abilityLevel)
                  : `<div class="performance-lower-grid__empty" aria-hidden="true"></div>`
              }

              ${
                productSpecs.length
                  ? productSpecs.map(createSpecCard).join("")
                  : `<div class="performance-lower-grid__empty" aria-hidden="true"></div>`
              }
            </div>
          `
          : ""
      }
    </section>
  `;
}

export function createSecondarySpecs() {
  return "";
}

export function bindPerformanceEducation(container) {
  container.querySelectorAll("[data-education-card]").forEach((card) => {
    card.addEventListener("click", () => {
      openEducationDialog({
        kind: card.dataset.educationKind || "",
        value: card.dataset.educationValue || "",
        title: card.dataset.educationTitle || "",
        image: card.dataset.educationImage || ""
      });
    });
  });
}

function createAbilityGauge(product, level) {
  const label = String(product.Ability || ABILITY_LABELS[level] || "");
  const gaugeAngles = {
    1: -150,
    2: -122,
    3: -90,
    4: -55,
    5: -18
  };

  const angle = gaugeAngles[level] ?? -90;
  const point = polarToCartesian(120, 112, 82, angle);

  return `
    <div class="ability-visual">
      <p class="performance-label">Ability</p>
      <svg class="ability-gauge" viewBox="0 0 240 145" role="img" aria-label="Ability level ${escapeHtml(label)}">
        <defs>
          <linearGradient id="abilityGaugeGradient" x1="0" x2="1">
            <stop offset="0%" stop-color="#168cff" />
            <stop offset="28%" stop-color="#32d38a" />
            <stop offset="52%" stop-color="#ffd233" />
            <stop offset="76%" stop-color="#ff6a00" />
            <stop offset="100%" stop-color="#e22c5d" />
          </linearGradient>
        </defs>
        <path class="ability-gauge__track" d="M40 112 A80 80 0 0 1 200 112" />
        <path class="ability-gauge__value" d="M40 112 A80 80 0 0 1 200 112" />
        ${createGaugeTicks()}
        <line class="ability-gauge__needle" x1="120" y1="112" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" />
        <circle class="ability-gauge__hub" cx="120" cy="112" r="8" />
        <circle class="ability-gauge__marker" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="6" />
      </svg>
      <strong class="ability-visual__level">${escapeHtml(label)}</strong>
      <div class="ability-visual__range" aria-hidden="true">
        <span>Beginner</span><span>Expert</span>
      </div>
    </div>
  `;
}

function createGaugeTicks() {
  return Array.from({ length: 17 }, (_, index) => {
    const angle = -150 + (index / 16) * 120;
    const outer = polarToCartesian(120, 112, 80, angle);
    const inner = polarToCartesian(120, 112, index % 4 === 0 ? 67 : 72, angle);
    return `<line class="ability-gauge__tick" x1="${inner.x.toFixed(1)}" y1="${inner.y.toFixed(1)}" x2="${outer.x.toFixed(1)}" y2="${outer.y.toFixed(1)}" />`;
  }).join("");
}

function createTerrainPerformance(ratings) {
  return `
    <div class="terrain-performance">
      <p class="performance-label">Terrain Performance</p>
      <div class="terrain-grid">
        ${ratings.map(createTerrainItem).join("")}
      </div>
    </div>
  `;
}

function createTerrainItem(item) {
  const opacityScale = [0.20, 0.30, 0.42, 0.58, 0.78, 1.00];
  const activeOpacityScale = [0.18, 0.30, 0.46, 0.64, 0.82, 1.00];

  const opacity = opacityScale[item.rating].toFixed(2);
  const activeOpacity = activeOpacityScale[item.rating].toFixed(2);

  return `
    <div class="terrain-item" style="--terrain-opacity:${opacity};--active-dot-opacity:${activeOpacity}" aria-label="${escapeHtml(item.label)} ${item.rating} out of 5">
      <div class="terrain-item__icon" aria-hidden="true">
        ${terrainIcon(item.icon)}
      </div>
      <strong>${escapeHtml(item.label)}</strong>
      <div class="terrain-rating" aria-hidden="true">
        ${Array.from({ length: 5 }, (_, index) =>
          `<span class="terrain-dot ${index < item.rating ? "terrain-dot--active" : ""}"></span>`
        ).join("")}
      </div>
    </div>
  `;
}

function createProductCharacteristic(product, value) {
  const sportId = String(product.SportID || "").trim().toUpperCase();
  if (sportId === "SKI") return createWidthCharacteristic(value);
  if (sportId === "SNB") return createShapeCharacteristic(value);
  return createGenericCharacteristic(value);
}

function createSpecCard(spec) {
  if (spec.kind === "brakeWidth") return createBrakeWidthCharacteristic(spec);
  if (spec.kind === "width") return createWidthCharacteristic(spec.value);
  if (spec.kind === "shape") return createShapeCharacteristic(spec.value);
  if (spec.kind === "profile") return createProfileCharacteristic(spec.value, spec.sportId);
  if (spec.kind === "flex") return createGenericCharacteristic(spec.value, "Flex", flexIcon());
  return createGenericCharacteristic(spec.value, spec.label);
}

function createWidthCharacteristic(value) {
  const numericWidth = Number(value);
  const safeWidth = Number.isFinite(numericWidth)
    ? numericWidth
    : Number.parseFloat(String(value));

  if (!Number.isFinite(safeWidth)) {
    return createGenericCharacteristic(value, "Width");
  }

  const minWidth = 70;
  const maxWidth = 130;
  const clamped = Math.min(maxWidth, Math.max(minWidth, safeWidth));
  const position = ((clamped - minWidth) / (maxWidth - minWidth)) * 100;

  return `
    <div class="secondary-spec secondary-spec--width">
      <div class="secondary-spec__heading">
        ${widthIcon()}
        <span>Width</span>
      </div>
      <div class="width-scale" aria-label="Ski width ${escapeHtml(formatMillimeters(safeWidth))}">
        <div class="width-scale__labels"><span>Narrow</span><span>Wide</span></div>
        <div class="width-scale__rail">
          <span class="width-scale__marker" style="left:${position.toFixed(2)}%" aria-hidden="true"></span>
        </div>
      </div>
      <strong>${escapeHtml(formatMillimeters(safeWidth))}</strong>
    </div>`;
}

function createShapeCharacteristic(value) {
  const iconPath = getSnowboardShapeIconPath(value);
  const education = getEducationContent("shape", value);

  return `
    <button
      class="secondary-spec secondary-spec--shape secondary-spec--interactive"
      type="button"
      data-education-card
      data-education-kind="shape"
      data-education-value="${escapeHtml(String(value || ""))}"
      data-education-title="${escapeHtml(education?.title || String(value || ""))}"
      data-education-image="${escapeHtml(iconPath)}"
      aria-label="Learn about ${escapeHtml(String(value || ""))} snowboard shape"
    >
      <div class="secondary-spec__heading">
        ${shapeIcon()}
        <span>Shape</span>
      </div>
      <div class="shape-visual" aria-hidden="true">
        ${iconPath
          ? `<img src="${escapeHtml(iconPath)}" alt="" loading="lazy">`
          : "<span></span>"}
      </div>
      <strong>${escapeHtml(String(value || ""))}</strong>
    </button>`;
}

function getSnowboardShapeIconPath(value) {
  const shape = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  const iconMap = {
    asymmetrical: "Asymmetrical.svg",
    directional: "Directional.svg",
    directionaltwin: "DirectionalTwin.svg",
    tapereddirectional: "TaperedDirectional.svg",
    truetwin: "TrueTwin.svg"
  };

  if (!iconMap[shape]) return "";

  return `${getAppPath()}assets/Icons/SnowboardShape/${iconMap[shape]}`;
}

function createProfileCharacteristic(value, sportId) {
  const imagePath = normalize(sportId) === "SNB"
    ? getSnowboardProfileImagePath(value)
    : "";

  if (!imagePath) {
    return createGenericCharacteristic(value, "Profile", profileIcon());
  }

  const education = getEducationContent("profile", value);

  return `
    <button
      class="secondary-spec secondary-spec--profile secondary-spec--interactive"
      type="button"
      data-education-card
      data-education-kind="profile"
      data-education-value="${escapeHtml(String(value || ""))}"
      data-education-title="${escapeHtml(education?.title || String(value || ""))}"
      data-education-image="${escapeHtml(imagePath)}"
      aria-label="Learn about ${escapeHtml(String(value || ""))} snowboard profile"
    >
      <div class="secondary-spec__heading">
        ${profileIcon()}
        <span>Profile</span>
      </div>
      <div class="profile-visual" aria-hidden="true">
        <img src="${escapeHtml(imagePath)}" alt="" loading="lazy">
      </div>
      <strong>${escapeHtml(String(value || ""))}</strong>
    </button>`;
}

function getSnowboardProfileImagePath(value) {
  const profile = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  const imageMap = {
    camber: "Camber.jpg",
    rocker: "Rocker.jpg",
    flat: "Flat.jpg",
    camrock: "CamRock.jpg",
    hybridcamber: "HybridCamber.jpg",
    hybridrocker: "HybridRocker.jpg"
  };

  return imageMap[profile]
    ? `${getAppPath()}assets/Icons/SnowboardProfile/${imageMap[profile]}`
    : "";
}

function getAppPath() {
  return typeof window === "undefined"
    ? "./"
    : window.location.pathname.replace(/(?:index\.html)?$/, "");
}

function getEducationContent(kind, value) {
  const key = normalizeEducationKey(value);
  if (kind === "shape") return SHAPE_EDUCATION[key];
  if (kind === "profile") return PROFILE_EDUCATION[key];
  return null;
}

function normalizeEducationKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function openEducationDialog({ kind, value, title, image }) {
  const content = getEducationContent(kind, value);
  if (!content) return;

  const dialog = document.createElement("div");
  dialog.className = "education-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", `${content.title} details`);

  dialog.innerHTML = `
    <div class="education-dialog__scrim" data-education-close></div>
    <div class="education-dialog__panel">
      <button class="education-dialog__close" type="button" data-education-close aria-label="Close details">×</button>
      <div class="education-dialog__media education-dialog__media--${escapeHtml(kind)}">
        ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : ""}
      </div>
      <div class="education-dialog__body">
        <p class="eyebrow">${escapeHtml(kind === "shape" ? "Snowboard Shape" : "Snowboard Profile")}</p>
        <h2>${escapeHtml(title || content.title)}</h2>
        <p>${escapeHtml(content.summary)}</p>
        <ul>
          ${content.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("")}
        </ul>
      </div>
    </div>`;

  const closeDialog = () => {
    document.removeEventListener("keydown", handleKeydown);
    dialog.remove();
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") closeDialog();
  };

  dialog.querySelectorAll("[data-education-close]").forEach((button) => {
    button.addEventListener("click", closeDialog);
  });

  document.addEventListener("keydown", handleKeydown);
  document.body.append(dialog);
  dialog.querySelector(".education-dialog__close")?.focus();
}

function createGenericCharacteristic(value, label = "Product Characteristic", icon = characteristicIcon()) {
  return `
    <div class="secondary-spec secondary-spec--characteristic">
      <div class="secondary-spec__heading">
        ${icon}
        <span>${escapeHtml(label)}</span>
      </div>
      <strong>${escapeHtml(String(value || ""))}</strong>
    </div>`;
}

function createBrakeWidthCharacteristic(spec) {
  const options = Array.isArray(spec.options) ? spec.options : [];
  return `
    <div class="secondary-spec secondary-spec--characteristic secondary-spec--brake-width">
      <div class="secondary-spec__heading">
        ${characteristicIcon()}
        <span>Brake Width</span>
      </div>
      ${hasValue(spec.value) ? `<strong>${escapeHtml(String(spec.value))}</strong>` : ""}
      ${options.length ? `
        <small>
          <span>Carried widths</span>
          <strong>${options.map((item) => escapeHtml(item)).join("</strong><strong>")}</strong>
        </small>
      ` : ""}
    </div>`;
}

function getShapeOrWidthValue(product) {
  if (product.ShapeOrWidth !== "" && product.ShapeOrWidth !== null && product.ShapeOrWidth !== undefined) {
    return product.ShapeOrWidth;
  }
  return product.Width;
}

function resolveProductSpecs(product) {
  const sportId = normalize(product.SportID);
  const categoryId = normalize(product.CategoryID);
  const specs = [];
  const shapeOrWidth = getShapeOrWidthValue(product);
  const profile = getProfileValue(product);
  const flex = getFlexValue(product);

  if (hasValue(shapeOrWidth)) {
    specs.push({
      kind: sportId === "SKI" ? "width" : sportId === "SNB" ? "shape" : "characteristic",
      label: sportId === "SKI" ? "Width" : sportId === "SNB" ? "Shape" : "Product Characteristic",
      value: shapeOrWidth
    });
  }

  if (hasValue(profile)) {
    specs.push({ kind: "profile", label: "Profile", value: profile, sportId });
  }

  if (hasValue(flex)) {
    specs.push({ kind: "flex", label: "Flex", value: flex });
  }

  if (categoryId.includes("BOOT")) {
    addSpec(specs, "Closure", product.ClosureSystem || product.LacingSystem);
    addSpec(specs, "Last Width", formatMillimeters(product.LastWidth));
  }

  if (categoryId.includes("BIND")) {
    addSpec(specs, "Entry", product.EntryStyle);
    addSpec(specs, "Response", product.Response);
    addSpec(specs, "DIN Range", product.DINRange);
    const brakeVariants = getVariantValues(product, "Brake Width")
      .map(formatMillimeters)
      .filter(Boolean);
    if (hasValue(product.BrakeWidth) || brakeVariants.length) specs.push({
      kind: "brakeWidth",
      label: "Brake Width",
      value: formatMillimeters(product.BrakeWidth),
      options: brakeVariants
    });
  }

  return specs;
}

function addSpec(specs, label, value) {
  if (hasValue(value)) specs.push({ kind: "characteristic", label, value });
}

function getProfileValue(product) {
  return product.Profile || product.CamberProfile || product.RockerProfile || "";
}

function getFlexValue(product) {
  return product.Flex || product.BootFlex || product.BootFlexIndex || product.BindingFlex || "";
}

function getVariantValues(product, type) {
  const variants = Array.isArray(product.Variants) ? product.Variants : [];
  const target = normalize(type);
  return [...new Set(variants
    .filter((variant) => normalize(variant.VariantType || "Size") === target)
    .map((variant) => String(variant.VariantValue || variant.Value || "").trim())
    .filter(Boolean))];
}

function shouldShowTerrainPerformance(product) {
  const categoryId = normalize(product.CategoryID);
  return !categoryId.includes("BOOT") && !categoryId.includes("BIND");
}

function hasValue(value) {
  return value !== "" && value !== null && value !== undefined;
}

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function formatMillimeters(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.toLowerCase().includes("mm") ? text : `${text} mm`;
}

function widthIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"></path><path d="m7 9-3 3 3 3"></path><path d="m17 9 3 3-3 3"></path></svg>`;
}

function shapeIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3c3 4 3 14 0 18"></path><path d="M16 3c-3 4-3 14 0 18"></path><path d="M8 3c2 1 6 1 8 0"></path><path d="M8 21c2-1 6-1 8 0"></path></svg>`;
}

function characteristicIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path><circle cx="8" cy="7" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="11" cy="17" r="1"></circle></svg>`;
}

function profileIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15c3-6 5-6 8 0s5 6 8 0"></path><path d="M4 9c3 6 5 6 8 0s5-6 8 0"></path></svg>`;
}

function flexIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4c-3 5-3 11 0 16"></path><path d="M17 4c3 5 3 11 0 16"></path><path d="M7 12h10"></path></svg>`;
}
function resolveAbilityLevel(product) {
  const explicit = toInteger(product.AbilityLevel, 1, 5);
  if (explicit) return explicit;

  const text = String(product.Ability || "").toLowerCase();
  if (!text) return null;
  if (text.includes("expert")) return 5;
  if (text.includes("advanced")) return 4;
  if (text.includes("intermediate")) return text.includes("beginner") ? 2 : 3;
  if (text.includes("beginner")) return 1;
  return null;
}

function resolveTerrainRatings(product) {
  const explicit = TERRAIN_DEFINITIONS.map((definition) => ({
    ...definition,
    rating: toInteger(product[definition.key], 0, 5)
  })).filter((item) => item.rating !== null);

  if (explicit.length) return explicit;

  const terrainText = String(product.Terrain || "").toLowerCase();
  if (!terrainText) return [];

  return TERRAIN_DEFINITIONS.map((definition) => ({
    ...definition,
    rating: terrainMatches(terrainText, definition.icon) ? 5 : 0
  })).filter((item) => item.rating > 0);
}

function terrainMatches(text, icon) {
  const aliases = {
    groomers: ["groomer", "groomed", "carving"],
    "all-mountain": ["all mountain", "all-mountain"],
    powder: ["powder", "soft snow"],
    trees: ["trees", "glades"],
    park: ["park", "freestyle"]
  };
  return aliases[icon].some((alias) => text.includes(alias));
}

function terrainIcon(name) {
  const icons = {
    groomers: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/><path d="M7 42 23 21l8 10 7-8 19 19M10 47c12-5 24-5 44 0M14 52c10-4 22-4 36 0"/></svg>`,
    "all-mountain": `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/><path d="M7 43 22 24l7 8 9-13 19 24M15 22v16M11 28h8M14 17l-4 8h8zM8 49c13-4 27-4 48 0"/></svg>`,
    powder: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/><path d="M7 39 23 21l8 10 8-9 18 17M10 47c8-5 14 4 22 0s14 4 22 0M15 53c6-3 11 3 17 0s11 3 17 0"/></svg>`,
    trees: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/><path d="m20 15-8 13h6l-8 13h20l-8-13h6zM43 22l-7 11h5l-7 11h18l-7-11h5zM20 41v8M43 44v6"/></svg>`,
    park: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/><path d="M10 43 38 25l16 13M13 43h34M20 37v10M43 31v16"/></svg>`
  };
  return icons[name] || icons["all-mountain"];
}

function rulerIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="1"/><path d="M7 7h4M7 11h3M7 15h4M7 19h3"/></svg>`;
}

function polarToCartesian(cx, cy, radius, angleDegrees) {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}

function toInteger(value, min, max) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatWidth(value) {
  const width = String(value ?? "").trim();
  if (!width) return "";
  return width.toLowerCase().includes("mm") ? width : `${width} mm`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
