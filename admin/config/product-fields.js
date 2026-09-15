export const SNOWBOARD_SHAPES = [
  "Twin",
  "True Twin",
  "Directional Twin",
  "Directional",
  "Tapered Directional",
  "Asymmetrical",
];

export const WINTER_SPORTS_DEFAULTS = {
  SnowboardProfile: ["Camber", "Rocker", "Flat", "CamRock", "Hybrid Camber", "Hybrid Rocker"],
  SkiProfile: ["Camber", "Tip Rocker", "Tip/Tail Rocker", "Full Rocker", "Hybrid"],
  SnowboardWidth: ["Regular", "Wide", "Volume Shifted"],
  ClosureSystem: ["Traditional", "Single BOA", "Dual BOA", "Triple BOA", "Speed Lace", "Hybrid"],
  EntryStyle: ["Traditional", "Step On", "Hands Free"],
  Response: ["Playful", "Balanced", "Precise"],
};

export function getControlledOptions(appData, field, currentValue = "") {
  const referenceValues = appData?.settings?.DataDictionary?.[field];
  const source = Array.isArray(referenceValues) && referenceValues.length
    ? referenceValues
    : (WINTER_SPORTS_DEFAULTS[field] || []);
  return [...new Set([...source.map(String), String(currentValue || "")].filter(Boolean))];
}

// The live CMS currently returns these values but does not expose a reference
// vocabulary. Keep this fallback isolated until DataDictionary.Flex is added.
const OBSERVED_CMS_FLEX_VALUES = [
  "Soft",
  "Soft-Medium",
  "Medium",
  "Medium-Stiff",
  "Stiff",
];

export function getFlexOptions(appData, currentValue = "") {
  const referenceValues =
    appData?.settings?.DataDictionary?.Flex ||
    appData?.settings?.FlexOptions ||
    [];

  const source = Array.isArray(referenceValues) && referenceValues.length
    ? referenceValues
    : OBSERVED_CMS_FLEX_VALUES;

  return [...new Set([...source.map(String), String(currentValue || "")].filter(Boolean))];
}
