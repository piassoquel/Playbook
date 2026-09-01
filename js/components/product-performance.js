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

export function createPerformancePanel(product) {
  const abilityLevel = resolveAbilityLevel(product);
  const terrainRatings = resolveTerrainRatings(product);
  const characteristicValue = getShapeOrWidthValue(product);
  const hasCharacteristic =
    characteristicValue !== "" &&
    characteristicValue !== null &&
    characteristicValue !== undefined;

  if (!abilityLevel && !terrainRatings.length && !hasCharacteristic) {
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
        abilityLevel || hasCharacteristic
          ? `
            <div class="performance-lower-grid">
              ${
                abilityLevel
                  ? createAbilityGauge(product, abilityLevel)
                  : `<div class="performance-lower-grid__empty" aria-hidden="true"></div>`
              }

              ${
                hasCharacteristic
                  ? createProductCharacteristic(product, characteristicValue)
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
  return `
    <div class="secondary-spec secondary-spec--shape">
      <div class="secondary-spec__heading">
        ${shapeIcon()}
        <span>Shape</span>
      </div>
      <div class="shape-visual" aria-hidden="true"><span></span></div>
      <strong>${escapeHtml(String(value || ""))}</strong>
    </div>`;
}

function createGenericCharacteristic(value, label = "Product Characteristic") {
  return `
    <div class="secondary-spec secondary-spec--characteristic">
      <div class="secondary-spec__heading">
        ${characteristicIcon()}
        <span>${escapeHtml(label)}</span>
      </div>
      <strong>${escapeHtml(String(value || ""))}</strong>
    </div>`;
}

function getShapeOrWidthValue(product) {
  if (product.ShapeOrWidth !== "" && product.ShapeOrWidth !== null && product.ShapeOrWidth !== undefined) {
    return product.ShapeOrWidth;
  }
  return product.Width;
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
