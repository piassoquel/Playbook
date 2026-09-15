import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) throw new Error("Usage: node build-winter-template.mjs input.xlsx output.xlsx");

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(input));
const batch = workbook.worksheets.getItem("BatchUpload");
batch.getRange("A1:AU1").unmerge();
batch.getRange("A1:AU1").merge();
batch.getRange("A1").values = [["PLAYBOOK AI BATCH TEMPLATE v2.2 — Enter product rows below. Production rows are intentionally blank. Use reference tabs for exact IDs and controlled values."]];

const newHeaders = [
  "Profile", "SnowboardWidth", "TurnRadius", "BootFlex", "ClosureSystem",
  "BootFlexIndex", "LastWidth", "BindingFlex", "EntryStyle", "Response",
  "DINRange", "BrakeWidth",
];
batch.getRange("AJ4:AU4").values = [newHeaders];
batch.getRange("A5:AU5").clear({ applyTo: "contents" });
batch.getRange("AJ4:AU4").format = {
  fill: "#FFF200",
  font: { bold: true, color: "#17324D" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#66FF33" },
};
batch.getRange("AJ5:AU5").format = {
  fill: "#FFFFFF",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#66FF33" },
};
batch.getRange("AJ4:AU5").format.autofitColumns();
batch.getRange("AJ4:AU5").format.columnWidth = 18;

const listValidation = (range, values) => {
  batch.getRange(range).dataValidation = { rule: { type: "list", values } };
};
listValidation("G5:G504", ["TRUE", "FALSE"]);
listValidation("H5:H504", ["Unisex", "Men's", "Women's", "Youth"]);
listValidation("I5:I504", ["Beginner", "Beginner|Intermediate", "Intermediate", "Intermediate|Advanced", "Advanced|Expert"]);
listValidation("Q5:Q504", ["Soft", "Soft-Medium", "Medium", "Medium-Stiff", "Stiff"]);
listValidation("AG5:AI504", ["TRUE", "FALSE"]);
listValidation("AJ5:AJ504", ["Camber", "Rocker", "Flat", "CamRock", "Hybrid Camber", "Hybrid Rocker", "Tip Rocker", "Tip/Tail Rocker", "Full Rocker", "Hybrid"]);
listValidation("AK5:AK504", ["Regular", "Wide", "Volume Shifted"]);
listValidation("AN5:AN504", ["Traditional", "Traditional Buckles", "Single BOA", "Dual BOA", "Triple BOA", "BOA + Buckles", "Speed Lace", "Hybrid"]);
listValidation("AR5:AR504", ["Traditional", "Step On", "Hands Free"]);
listValidation("AS5:AS504", ["Playful", "Balanced", "Precise"]);
batch.dataValidations.add({ range: "J5:J504", rule: { type: "whole", operator: "between", formula1: 1, formula2: 5 } });
batch.dataValidations.add({ range: "L5:P504", rule: { type: "whole", operator: "between", formula1: 1, formula2: 5 } });
batch.dataValidations.add({ range: "T5:T504", rule: { type: "whole", operator: "between", formula1: 2000, formula2: 2100 } });
batch.dataValidations.add({ range: "AL5:AL504", rule: { type: "decimal", operator: "between", formula1: 5, formula2: 50 } });
batch.dataValidations.add({ range: "AM5:AM504", rule: { type: "whole", operator: "between", formula1: 1, formula2: 5 } });
batch.dataValidations.add({ range: "AO5:AO504", rule: { type: "whole", operator: "between", formula1: 40, formula2: 180 } });
batch.dataValidations.add({ range: "AP5:AP504", rule: { type: "decimal", operator: "between", formula1: 85, formula2: 110 } });
batch.dataValidations.add({ range: "AQ5:AQ504", rule: { type: "whole", operator: "between", formula1: 1, formula2: 5 } });
batch.dataValidations.add({ range: "AU5:AU504", rule: { type: "whole", operator: "between", formula1: 50, formula2: 160 } });

let variants;
try { variants = workbook.worksheets.getItem("ProductVariants"); }
catch { variants = workbook.worksheets.add("ProductVariants"); }
variants.getRange("A1:G504").clear({ applyTo: "all" });
variants.getRange("A1:G1").merge();
variants.getRange("A1").values = [["PRODUCT VARIANTS — Add one row per available size or length. ProductID must match a BatchUpload row."]];
variants.getRange("A4:G5").values = [[
  "ProductVariantID", "ProductID", "VariantType", "VariantValue", "DisplayOrder", "Active", "LastUpdated",
], ["", "", "", "", "", "", ""]];
variants.getRange("A1:G1").format = { fill: "#E8F0FE", font: { bold: true, color: "#17324D", size: 12 }, wrapText: true };
variants.getRange("A4:G4").format = { fill: "#17324D", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
variants.getRange("A1:G5").format.autofitColumns();
variants.getRange("A1:A5").format.columnWidth = 25;
variants.getRange("B1:B5").format.columnWidth = 16;
variants.getRange("C1:D5").format.columnWidth = 18;
variants.getRange("E1:G5").format.columnWidth = 16;
variants.getRange("A1").format.rowHeight = 34;
variants.freezePanes.freezeRows(4);
variants.getRange("C5:C504").dataValidation = { rule: { type: "list", values: ["Size", "Length"] } };
variants.getRange("F5:F504").dataValidation = { rule: { type: "list", values: ["TRUE", "FALSE"] } };
variants.dataValidations.add({ range: "E5:E504", rule: { type: "whole", operator: "between", formula1: 0, formula2: 10000 } });

let dictionary;
try { dictionary = workbook.worksheets.getItem("DataDictionary"); }
catch { dictionary = workbook.worksheets.add("DataDictionary"); }
dictionary.getRange("A1:C100").clear({ applyTo: "all" });
dictionary.getRange("A1:C1").merge();
dictionary.getRange("A1").values = [["DATA DICTIONARY — READ ONLY REFERENCE DATA. Controlled values used by the Product Builder and CMS."]];
const dictionaryRows = [
  ["Field", "AllowedValues / Format", "Instructions"],
  ["ProductID", "Existing ID or blank", "Leave blank for a new product. Use an existing ProductID only when updating that product."],
  ["Gender", "Unisex|Men's|Women's|Youth", "Use the exact controlled value."],
  ["Ability", "Beginner; Beginner|Intermediate; Intermediate; Intermediate|Advanced; Advanced|Expert", "Must match AbilityLevel: 1, 2, 3, 4, or 5 respectively."],
  ["AbilityLevel", "1|2|3|4|5", "1=Beginner; 2=Beginner|Intermediate; 3=Intermediate; 4=Intermediate|Advanced; 5=Advanced|Expert."],
  ["Terrain", "Groomers|All Mountain|Powder|Trees|Park", "Use one or more exact values separated by |. Example: Groomers|All Mountain."],
  ["Terrain ratings", "Whole number 1-5", "Applies to TerrainGroomers, TerrainAllMountain, TerrainPowder, TerrainTrees, and TerrainPark."],
  ["Flex", "Soft|Soft-Medium|Medium|Medium-Stiff|Stiff", "Applies to snowboards and skis."],
  ["ShapeOrWidth", "Snowboard shape or numeric ski waist width", "Snowboards: Twin, True Twin, Directional Twin, Directional, Tapered Directional, or Asymmetrical. Skis: number only, without mm."],
  ["Profile", "Use SnowboardProfile or SkiProfile values", "Select the category-specific vocabulary below and store the result in the Profile column."],
  ["SnowboardProfile", "Camber|Rocker|Flat|CamRock|Hybrid Camber|Hybrid Rocker", "Verify the construction. Do not map a manufacturer term by name alone."],
  ["SkiProfile", "Camber|Tip Rocker|Tip/Tail Rocker|Full Rocker|Hybrid", "Verify the construction. Do not map a manufacturer term by name alone."],
  ["SnowboardWidth", "Regular|Wide|Volume Shifted", "Snowboards only."],
  ["TurnRadius", "Decimal number", "Representative ski turn radius in meters. Leave blank when a reliable value is unavailable."],
  ["BootFlex", "Whole number 1-5", "For a manufacturer 1-10 scale: 1-2→1, 3-4→2, 5-6→3, 7-8→4, 9-10→5. Descriptive ratings require product-specific judgment."],
  ["ClosureSystem", "Traditional|Traditional Buckles|Single BOA|Dual BOA|Triple BOA|BOA + Buckles|Speed Lace|Hybrid", "Use the exact configuration. Traditional Buckles and BOA + Buckles are intended for ski boots."],
  ["BootFlexIndex", "Whole number 40-180", "Ski boots only. Store the manufacturer flex index."],
  ["LastWidth", "Decimal number 85-110", "Ski boots only. Store millimeters without mm."],
  ["BindingFlex", "Whole number 1-5", "Snowboard bindings only."],
  ["EntryStyle", "Traditional|Step On|Hands Free", "Snowboard bindings only."],
  ["Response", "Playful|Balanced|Precise", "Snowboard bindings only."],
  ["DINRange", "lower-upper", "Ski bindings only. Example: 4-12."],
  ["BrakeWidth", "Whole number 50-160", "Ski bindings only. Store millimeters without mm."],
  ["Boolean fields", "TRUE|FALSE", "Use actual Boolean values for Active, StoreFavorite, NewThisSeason, and Featured."],
  ["Season", "Four-digit ending year", "Use 2027 for the 2026/27 season."],
  ["URLs", "HTTPS URL", "Applies to ThumbnailImage, HeroImage, ImageURL, and VideoURL. Leave blank rather than inventing a URL."],
  ["Sales Dashboard text", "Plain text; line breaks allowed", "CustomerProfile, SellingTips, ComparisonNotes, TalkingPoints, and CommonQuestions remain editable. Follow the Product Builder prompt for content length."],
  ["RecommendedProductIDs", "Blank", "Do not invent IDs. Manage normalized recommendations in Playbook Admin."],
  ["ProductVariants", "One row per size or length", "Only use after ProductID is known. ProductVariantID must be unique."],
];
dictionary.getRange(`A4:C${dictionaryRows.length + 3}`).values = dictionaryRows;
dictionary.getRange("A1:C1").format = { fill: "#E8F0FE", font: { bold: true, color: "#17324D", size: 12 }, wrapText: true };
dictionary.getRange("A4:C4").format = { fill: "#17324D", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
const dictionaryEndRow = dictionaryRows.length + 3;
dictionary.getRange(`A1:C${dictionaryEndRow}`).format.autofitColumns();
dictionary.getRange(`B1:B${dictionaryEndRow}`).format.columnWidth = 58;
dictionary.getRange(`C1:C${dictionaryEndRow}`).format.columnWidth = 70;
dictionary.getRange(`A1:C${dictionaryEndRow}`).format.wrapText = true;
dictionary.freezePanes.freezeRows(4);

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(output);
