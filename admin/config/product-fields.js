export const SNOWBOARD_SHAPES = [
  "Twin",
  "True Twin",
  "Directional Twin",
  "Directional",
  "Tapered Directional",
  "Asymmetrical",
];

// The live CMS currently returns these values but does not expose a reference
// vocabulary. Keep this fallback isolated until DataDictionary.Flex is added.
const OBSERVED_CMS_FLEX_VALUES = [
  "Soft",
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
