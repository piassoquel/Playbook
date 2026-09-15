import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) throw new Error("Usage: node build-winter-template.mjs input.xlsx output.xlsx");

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(input));
const batch = workbook.worksheets.getItem("BatchUpload");

const newHeaders = [
  "Profile", "SnowboardWidth", "TurnRadius", "BootFlex", "ClosureSystem",
  "BootFlexIndex", "LastWidth", "BindingFlex", "EntryStyle", "Response",
  "DINRange", "BrakeWidth",
];
batch.getRange("AJ4:AU4").values = [newHeaders];
batch.getRange("AJ5:AU5").values = [["Tip/Tail Rocker", "", 16.5, "", "", "", "", "", "", "", "", ""]];
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

const variants = workbook.worksheets.add("ProductVariants");
variants.getRange("A1:G1").merge();
variants.getRange("A1").values = [["PRODUCT VARIANTS — Add one row per available size or length. ProductID must match a BatchUpload row."]];
variants.getRange("A4:G5").values = [[
  "ProductVariantID", "ProductID", "VariantType", "VariantValue", "DisplayOrder", "Active", "LastUpdated",
], [
  "SKI0001-SIZE-177", "SKI0001", "Size", "177", 1, true, "",
]];
variants.getRange("A1:G1").format = { fill: "#E8F0FE", font: { bold: true, color: "#17324D", size: 12 }, wrapText: true };
variants.getRange("A4:G4").format = { fill: "#17324D", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
variants.getRange("A1:G5").format.autofitColumns();
variants.getRange("A1:A5").format.columnWidth = 25;
variants.getRange("B1:B5").format.columnWidth = 16;
variants.getRange("C1:D5").format.columnWidth = 18;
variants.getRange("E1:G5").format.columnWidth = 16;
variants.getRange("A1").format.rowHeight = 34;
variants.freezePanes.freezeRows(4);

const dictionary = workbook.worksheets.add("DataDictionary");
dictionary.getRange("A1:C1").merge();
dictionary.getRange("A1").values = [["DATA DICTIONARY — READ ONLY REFERENCE DATA. Controlled values used by the Product Builder and CMS."]];
dictionary.getRange("A4:C10").values = [["Field", "AllowedValues", "AppliesTo"],
  ["ShapeOrWidth", "Twin|True Twin|Directional Twin|Directional|Tapered Directional|Asymmetrical", "Snowboards (shape); skis use numeric waist width"],
  ["SnowboardProfile", "Camber|Rocker|Flat|CamRock|Hybrid Camber|Hybrid Rocker", "Snowboards"],
  ["SkiProfile", "Camber|Tip Rocker|Tip/Tail Rocker|Full Rocker|Hybrid", "Skis"],
  ["SnowboardWidth", "Regular|Wide|Volume Shifted", "Snowboards"],
  ["ClosureSystem", "Traditional|Single BOA|Dual BOA|Triple BOA|Speed Lace|Hybrid", "Snowboard and ski boots"],
  ["EntryStyle", "Traditional|Step On|Hands Free", "Snowboard bindings"],
];
dictionary.getRange("A11:C11").values = [["Response", "Playful|Balanced|Precise", "Snowboard bindings"]];
dictionary.getRange("A12:C12").values = [["Flex", "Soft|Soft-Medium|Medium|Medium-Stiff|Stiff", "Snowboards and skis"]];
dictionary.getRange("A1:C1").format = { fill: "#E8F0FE", font: { bold: true, color: "#17324D", size: 12 }, wrapText: true };
dictionary.getRange("A4:C4").format = { fill: "#17324D", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
dictionary.getRange("A1:C12").format.autofitColumns();
dictionary.getRange("B1:B12").format.columnWidth = 58;
dictionary.getRange("C1:C12").format.columnWidth = 34;
dictionary.getRange("A1:C12").format.wrapText = true;
dictionary.freezePanes.freezeRows(4);

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(output);
