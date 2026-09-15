/**
 * Playbook CMS API v2.1.0 — Winter Sports attributes
 *
 * Backward-compatible with CMS v1.0 and v1.1.
 * Product payload and batch imports are header-driven, so the added
 * AbilityLevel and terrain rating columns require no positional mapping.
 */

const PLAYBOOK = {
  SHEETS: {
    PRODUCTS: "Products",
    SPORTS: "Sports",
    CATEGORIES: "Categories",
    BRANDS: "Brands",
    DAILY_FOCUS: "DailyFocus",
    BATCH_UPLOAD: "BatchUpload",
    BATCH_ARCHIVE: "BatchArchive",
    SETTINGS: "Settings",
    SNOWSPORTS_ATTRIBUTES: "SnowsportsAttributes",
    DATA_DICTIONARY: "DataDictionary",
    PRODUCT_RECOMMENDATIONS: "ProductRecommendations",
    PRODUCT_VARIANTS: "ProductVariants"
  },
  ID_DIGITS: 4
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Playbook CMS")
    .addItem("Prepare Batch", "prepareBatch")
    .addItem("Import Approved Batch Rows", "importApprovedBatchRows")
    .addItem("Archive Imported Batch Rows", "archiveImportedBatchRows")
    .addItem("Set Up Product Recommendations", "setupProductRecommendations")
    .addItem("Set Up Winter Sports v2.1", "setupWinterSportsV21")
    .addItem("Generate Missing Product IDs", "generateMissingProductIds")
    .addItem("Migrate Related Product Field", "migrateRelatedProductField")
    .addSeparator()
    .addItem("Refresh CMS", "refreshPlaybookCms")
    .addToUi();
}

function doGet(e) {
  try {
    const action = String(e && e.parameter && e.parameter.action || "").trim();
    if (action === "catalogReference") return jsonOutput_(buildCatalogReference_());
    if (action === "referenceDictionary") return jsonOutput_(buildReferenceDictionary_());
    return ContentService
      .createTextOutput(JSON.stringify(buildPlaybookPayload_()))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: String(error && error.message ? error.message : error),
        generatedAt: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Authenticated Admin write endpoint. Apps Script ContentService always emits
 * HTTP 200, so clients must use success/code in the JSON body. Send the body
 * as text/plain to keep browser requests "simple" and avoid a CORS preflight.
 */
function doPost(e) {
  try {
    const request = parseAdminRequest_(e);
    authorizeAdminRequest_(request);
    if (request.action === "updateProduct") return jsonOutput_(updateProduct_(request));
    if (request.action === "adminCatalog") return jsonOutput_(buildAdminCatalog_());
    if (request.action === "validateImport") return jsonOutput_(validateImport_(request));
    if (request.action === "commitImport") return jsonOutput_(commitImport_(request));
    throw apiError_("Unsupported action.", "INVALID_ACTION");
  } catch (error) {
    return jsonOutput_({
      success: false,
      error: String(error && error.message ? error.message : error),
      code: String(error && error.code ? error.code : "INTERNAL_ERROR"),
      ...(error && error.details ? error.details : {})
    });
  }
}

function buildPlaybookPayload_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const settings = buildSettingsObject_(
    getRows_(spreadsheet, PLAYBOOK.SHEETS.SETTINGS)
  );

  const sportsRows = getRows_(spreadsheet, PLAYBOOK.SHEETS.SPORTS);
  const categoriesRows = getRows_(spreadsheet, PLAYBOOK.SHEETS.CATEGORIES);
  const brandsRows = getRows_(spreadsheet, PLAYBOOK.SHEETS.BRANDS);
  const productRows = getRows_(spreadsheet, PLAYBOOK.SHEETS.PRODUCTS);
  const focusRows = getRows_(spreadsheet, PLAYBOOK.SHEETS.DAILY_FOCUS);
  const snowRows = getOptionalRows_(
    spreadsheet, PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES
  );
  const recommendationRows = getOptionalRows_(
    spreadsheet, PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS
  );
  const variantRows = getOptionalRows_(
    spreadsheet, PLAYBOOK.SHEETS.PRODUCT_VARIANTS
  );
  const hasRecommendationSheet = Boolean(
    spreadsheet.getSheetByName(PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS)
  );

  const activeSports = sportsRows.filter(isActive_).sort(sortByDisplayOrder_);
  const activeSportIds = new Set(
    activeSports.map((row) => normalizeId_(row.SportID))
  );

  const activeCategories = categoriesRows
    .filter((row) =>
      isActive_(row) &&
      activeSportIds.has(normalizeId_(row.SportID))
    )
    .sort(sortByDisplayOrder_);

  const activeCategoryIds = new Set(
    activeCategories.map((row) => normalizeId_(row.CategoryID))
  );

  const activeBrands = brandsRows
    .filter(isActive_)
    .sort((a, b) => String(a.Name || "").localeCompare(String(b.Name || "")));

  const activeBrandIds = new Set(
    activeBrands.map((row) => normalizeId_(row.BrandID))
  );

  const activeProducts = productRows
    .filter((product) =>
      isActive_(product) &&
      activeSportIds.has(normalizeId_(product.SportID)) &&
      activeCategoryIds.has(normalizeId_(product.CategoryID)) &&
      activeBrandIds.has(normalizeId_(product.BrandID))
    )
    .map((product) => normalizeProduct_(mergeSnowProduct_(product, snowRows)))
    .sort(sortProducts_);

  const activeProductIds = new Set(
    activeProducts.map((product) => normalizeId_(product.ProductID))
  );

  attachRecommendations_(
    activeProducts, recommendationRows, activeBrands, hasRecommendationSheet
  );
  attachVariants_(activeProducts, variantRows);

  const sports = activeSports.map((sport) => ({
    id: String(sport.SportID || ""),
    name: String(sport.Name || ""),
    description: String(sport.Description || ""),
    image: String(sport.ImageURL || ""),
    icon: String(sport.Icon || ""),
    displayOrder: toNumber_(sport.DisplayOrder),
    categories: activeCategories
      .filter((category) =>
        normalizeId_(category.SportID) === normalizeId_(sport.SportID)
      )
      .map((category) => ({
        id: String(category.CategoryID || ""),
        name: String(category.Name || ""),
        description: String(category.Description || ""),
        icon: String(category.Icon || ""),
        displayOrder: toNumber_(category.DisplayOrder)
      }))
  }));

  const brands = activeBrands
    .filter((brand) =>
      activeProducts.some((product) =>
        normalizeId_(product.BrandID) === normalizeId_(brand.BrandID)
      )
    )
    .map((brand) => ({
      BrandID: String(brand.BrandID || ""),
      Name: String(brand.Name || ""),
      LogoURL: String(brand.LogoURL || ""),
      WebsiteURL: String(brand.WebsiteURL || ""),
      Description: String(brand.Description || ""),
      DisplayOrder: toNumber_(brand.DisplayOrder),
      Active: true
    }));

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    version: {
      app: String(settings.AppVersion || ""),
      cms: String(settings.CMSVersion || ""),
      data: String(settings.DataVersion || "")
    },
    settings: addReferenceData_(spreadsheet, settings),
    dailyFocus: selectCurrentDailyFocus_(
      focusRows, activeProductIds, activeProducts, brands
    ),
    sports,
    categories: activeCategories,
    brands,
    products: activeProducts,
    recommendationCandidates: buildRecommendationCandidates_(
      activeProducts, activeCategories, brands
    )
  };
}

/**
 * Authenticated Admin catalog. The public employee payload remains filtered
 * to active products, while Admin receives Needs Review and Archived rows too.
 */
function buildAdminCatalog_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const payload = buildPlaybookPayload_();
  const snowRows = getOptionalRows_(spreadsheet, PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES);
  const recommendationRows = getOptionalRows_(spreadsheet, PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS);
  const variantRows = getOptionalRows_(spreadsheet, PLAYBOOK.SHEETS.PRODUCT_VARIANTS);
  const brandRows = getRows_(spreadsheet, PLAYBOOK.SHEETS.BRANDS).filter(isActive_);
  const products = getRows_(spreadsheet, PLAYBOOK.SHEETS.PRODUCTS)
    .map((product) => normalizeProduct_(mergeSnowProduct_(product, snowRows)))
    .sort(sortProducts_);
  attachRecommendations_(
    products,
    recommendationRows,
    brandRows,
    Boolean(spreadsheet.getSheetByName(PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS))
  );
  attachVariants_(products, variantRows);
  return { ...payload, products, adminCatalog: true };
}

function attachVariants_(products, rows) {
  const byId = {};
  products.forEach((product) => {
    byId[normalizeId_(product.ProductID)] = product;
    product.Variants = [];
  });
  rows.filter(isActive_).sort(sortByDisplayOrder_).forEach((row) => {
    const product = byId[normalizeId_(row.ProductID)];
    if (!product) return;
    product.Variants.push({
      ProductVariantID: String(row.ProductVariantID || ""),
      VariantType: String(row.VariantType || "Size"),
      VariantValue: String(row.VariantValue || ""),
      DisplayOrder: toNumber_(row.DisplayOrder)
    });
  });
}

function normalizeProduct_(product) {
  const recommendedIds = String(
    product.RecommendedProductIDs ||
    product.RelatedProductIDs ||
    ""
  ).trim();

  return {
    ...product,
    ProductID: String(product.ProductID || ""),
    SportID: String(product.SportID || ""),
    CategoryID: String(product.CategoryID || ""),
    BrandID: String(product.BrandID || ""),
    Model: String(product.Model || ""),
    Active: isTrue_(product.Active),
    StoreFavorite: isTrue_(product.StoreFavorite),
    NewThisSeason: isTrue_(product.NewThisSeason),
    Featured: isTrue_(product.Featured),
    AbilityLevel: optionalNumber_(product.AbilityLevel !== undefined
      ? product.AbilityLevel
      : product["Ability Level"]),
    TerrainGroomers: optionalNumber_(product.TerrainGroomers),
    TerrainAllMountain: optionalNumber_(product.TerrainAllMountain),
    TerrainPowder: optionalNumber_(product.TerrainPowder),
    TerrainTrees: optionalNumber_(product.TerrainTrees),
    TerrainPark: optionalNumber_(product.TerrainPark),
    RecommendedProductIDs: recommendedIds,
    RelatedProductIDs: recommendedIds,
    ShapeOrWidth: product.ShapeOrWidth !== undefined
      ? product.ShapeOrWidth
      : (product.Width === "" ? "" : product.Width),
    Width: product.ShapeOrWidth !== undefined
      ? product.ShapeOrWidth
      : (product.Width === "" ? "" : product.Width),
    Profile: product.Profile !== undefined && product.Profile !== ""
      ? product.Profile
      : (product.CamberProfile || product.RockerProfile || ""),
    MSRP: product.MSRP === "" ? "" : product.MSRP,
    DisplayOrder: toNumber_(product.DisplayOrder),
    Status: statusFromRow_(product),
    LastUpdated: toIsoTimestamp_(product.LastUpdated)
  };
}

function attachRecommendations_(products, rows, brands, authoritative) {
  const byId = {};
  const brandNames = {};
  brands.forEach((brand) => {
    brandNames[normalizeId_(brand.BrandID)] = String(brand.Name || "");
  });
  products.forEach((product) => {
    byId[normalizeId_(product.ProductID)] = product;
    product.Recommendations = emptyRecommendationGroups_();
    product.ResolvedRecommendations = emptyRecommendationGroups_();
    if (authoritative) {
      product.RecommendedProductIDs = "";
      product.RelatedProductIDs = "";
    }
  });

  const occupied = new Set();
  rows.filter(isActive_).forEach((row) => {
    const sourceId = normalizeId_(row.SourceProductID);
    const targetId = normalizeId_(row.TargetProductID);
    const type = String(row.RecommendationType || "").trim();
    const tier = String(row.RecommendationTier || "").trim();
    if (!ADMIN_WRITE.RECOMMENDATION_TYPES.includes(type) ||
        !ADMIN_WRITE.RECOMMENDATION_TIERS.includes(tier)) {
      throw apiError_("ProductRecommendations contains an invalid type or tier.", "DATA_INTEGRITY_ERROR");
    }
    if (!byId[sourceId] || !byId[targetId]) return;
    const slot = `${sourceId}|${type}|${tier}`;
    if (occupied.has(slot)) {
      throw apiError_(`Duplicate active recommendation tier: ${slot}`, "DATA_INTEGRITY_ERROR");
    }
    occupied.add(slot);
    byId[sourceId].Recommendations[type][tier] = targetId;
    byId[sourceId].ResolvedRecommendations[type][tier] = recommendationProduct_(
      byId[targetId], brandNames
    );
  });

  if (!authoritative) return;
  products.forEach((product) => {
    const ids = [];
    ADMIN_WRITE.RECOMMENDATION_TIERS.forEach((tier) => {
      ADMIN_WRITE.RECOMMENDATION_TYPES.forEach((type) => {
        const id = product.Recommendations[type][tier];
        if (id && !ids.includes(id)) ids.push(id);
      });
    });
    product.RecommendedProductIDs = ids.join("|");
    product.RelatedProductIDs = product.RecommendedProductIDs;
  });
}

function emptyRecommendationGroups_() {
  return ADMIN_WRITE.RECOMMENDATION_TYPES.reduce((groups, type) => {
    groups[type] = {};
    ADMIN_WRITE.RECOMMENDATION_TIERS.forEach((tier) => { groups[type][tier] = ""; });
    return groups;
  }, {});
}

function recommendationProduct_(product, brandNames) {
  const resolved = { ...product };
  delete resolved.Recommendations;
  delete resolved.ResolvedRecommendations;
  resolved.Brand = brandNames[normalizeId_(product.BrandID)] || String(product.BrandID || "");
  resolved.Price = product.MSRP;
  return resolved;
}

function buildRecommendationCandidates_(products, categories, brands) {
  const categoryRefs = referenceMap_(categories, "CategoryID", "Name");
  const sportRows = [];
  products.forEach((product) => {
    if (!sportRows.some((row) => normalizeId_(row.SportID) === normalizeId_(product.SportID))) {
      sportRows.push({ SportID: product.SportID, Name: product.SportID, Active: true });
    }
  });
  const sportRefs = referenceMap_(sportRows, "SportID", "Name");
  const brandNames = {};
  brands.forEach((brand) => {
    brandNames[normalizeId_(brand.BrandID)] = String(brand.Name || "");
  });
  const result = { Binding: [], Boot: [] };
  ADMIN_WRITE.RECOMMENDATION_TYPES.forEach((type) => {
    result[type] = products
      .filter((product) => isPublishedProduct_(product) &&
        matchesRecommendationType_(product, type, categoryRefs, sportRefs))
      .map((product) => recommendationProduct_(product, brandNames))
      .sort((a, b) => String(a.Brand || "").localeCompare(String(b.Brand || "")) ||
        String(a.Model || "").localeCompare(String(b.Model || "")));
  });
  return result;
}

function selectCurrentDailyFocus_(rows, activeProductIds, products, brands) {
  const today = startOfDay_(new Date());

  const matches = rows
    .filter((row) => {
      if (!isActive_(row)) return false;
      if (!activeProductIds.has(normalizeId_(row.ProductID))) return false;

      const startDate = parseDate_(row.StartDate);
      const endDate = parseDate_(row.EndDate);

      return (!startDate || startDate <= today) &&
        (!endDate || endDate >= today);
    })
    .sort((a, b) => {
      const aDate = parseDate_(a.StartDate);
      const bDate = parseDate_(b.StartDate);
      return (bDate ? bDate.getTime() : 0) -
        (aDate ? aDate.getTime() : 0);
    });

  if (!matches.length) return null;

  const row = matches[0];
  const product = products.find((item) =>
    normalizeId_(item.ProductID) === normalizeId_(row.ProductID)
  );
  const brand = brands.find((item) =>
    normalizeId_(item.BrandID) ===
      normalizeId_(product && product.BrandID)
  );

  return {
    enabled: true,
    focusId: String(row.FocusID || ""),
    startDate: formatDate_(row.StartDate),
    endDate: formatDate_(row.EndDate),
    productId: String(row.ProductID || ""),
    headline: String(row.Headline || "Daily Focus"),
    message: String(row.Message || ""),
    brand: String((brand && brand.Name) || ""),
    name: String((product && product.Model) || row.ProductID || ""),
    summary:
      String(row.Message || "") ||
      String((product && product.SellingTips) || "") ||
      String((product && product.Description) || "")
  };
}


function prepareBatch() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(PLAYBOOK.SHEETS.BATCH_UPLOAD);
  if (!sh) throw new Error("BatchUpload sheet is missing.");
  const data = sh.getDataRange().getValues();
  if (data.length < 2) { SpreadsheetApp.getUi().alert("There are no BatchUpload rows to prepare."); return; }
  const h = buildHeaderMap_(data[0]);
  const batchIdx = requireHeader_(h,"BatchID");
  const modelIdx = requireHeader_(h,"Model");
  const importedIdx = requireHeader_(h,"Imported");
  const rows=[];
  data.slice(1).forEach((r,i)=>{
    if (String(r[modelIdx]||"").trim() && !String(r[batchIdx]||"").trim() && !isTrue_(r[importedIdx])) rows.push(i+2);
  });
  if (!rows.length) { SpreadsheetApp.getUi().alert("No new rows need preparation."); return; }
  const batchId = generateNextBatchId_();
  rows.forEach(n=>sh.getRange(n,batchIdx+1).setValue(batchId));
  const count=assignMissingIdsOnSheet_(sh);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(`${rows.length} row(s) prepared as ${batchId}. ${count} ProductID(s) generated.`);
}

function archiveImportedBatchRows() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const sh=ss.getSheetByName(PLAYBOOK.SHEETS.BATCH_UPLOAD);
  if (!sh) throw new Error("BatchUpload sheet is missing.");
  const archive=ensureBatchArchiveSheet_(ss,sh);
  const data=sh.getDataRange().getValues();
  if (data.length<2) { SpreadsheetApp.getUi().alert("There are no BatchUpload rows to archive."); return; }
  const h=buildHeaderMap_(data[0]);
  const importedIdx=requireHeader_(h,"Imported");
  const modelIdx=requireHeader_(h,"Model");
  const statusIdx=requireHeader_(h,"ImportStatus");
  const archived=[]; const remaining=[];
  const when=new Date(); const who=Session.getActiveUser().getEmail()||"";
  data.slice(1).forEach(r=>{
    const has=String(r[modelIdx]||"").trim()!=="";
    if (has && isTrue_(r[importedIdx])) archived.push([...r,when,who]);
    else if (has) remaining.push(r.slice(0,statusIdx));
  });
  if (!archived.length) { SpreadsheetApp.getUi().alert("There are no successfully imported rows to archive."); return; }
  archive.getRange(archive.getLastRow()+1,1,archived.length,archived[0].length).setValues(archived);
  const last=Math.max(sh.getLastRow(),2);
  sh.getRange(2,1,last-1,statusIdx).clearContent();
  if (remaining.length) sh.getRange(2,1,remaining.length,statusIdx).setValues(remaining);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(`${archived.length} imported row(s) moved to BatchArchive.`);
}

function generateNextBatchId_() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const date=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyy-MM-dd");
  const prefix=`BATCH-${date}-`; let max=0;
  [PLAYBOOK.SHEETS.BATCH_UPLOAD,PLAYBOOK.SHEETS.BATCH_ARCHIVE].forEach(name=>{
    const sh=ss.getSheetByName(name); if (!sh || sh.getLastRow()<2) return;
    const data=sh.getDataRange().getValues(); const h=buildHeaderMap_(data[0]);
    if (h.BatchID===undefined) return;
    data.slice(1).forEach(r=>{ const v=String(r[h.BatchID]||"").trim(); if (!v.startsWith(prefix)) return; const n=Number(v.slice(prefix.length)); if (Number.isFinite(n)) max=Math.max(max,n); });
  });
  return prefix+String(max+1).padStart(3,"0");
}

function ensureBatchArchiveSheet_(ss,batchSheet) {
  let sh=ss.getSheetByName(PLAYBOOK.SHEETS.BATCH_ARCHIVE);
  if (!sh) sh=ss.insertSheet(PLAYBOOK.SHEETS.BATCH_ARCHIVE);
  const batchHeaders=batchSheet.getRange(1,1,1,batchSheet.getLastColumn()).getValues()[0];
  const headers=[...batchHeaders,"ArchivedAt","ArchivedBy"];
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.getRange(1,1,1,headers.length).setBackground("#17324D").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sh.setFrozenRows(1);
  sh.getRange(2,headers.indexOf("ArchivedAt")+1,Math.max(sh.getMaxRows()-1,1),1).setNumberFormat("yyyy-mm-dd hh:mm");
  return sh;
}

function generateMissingProductIds() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const valid = [
    PLAYBOOK.SHEETS.PRODUCTS,
    PLAYBOOK.SHEETS.BATCH_UPLOAD
  ];

  if (!valid.includes(sheet.getName())) {
    SpreadsheetApp.getUi().alert(
      "Open the Products or BatchUpload tab before generating IDs."
    );
    return;
  }

  const assigned = assignMissingIdsOnSheet_(sheet);
  SpreadsheetApp.getUi().alert(
    assigned === 1
      ? "1 ProductID was generated."
      : `${assigned} ProductIDs were generated.`
  );
}

function importApprovedBatchRows() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const batchSheet = spreadsheet.getSheetByName(
    PLAYBOOK.SHEETS.BATCH_UPLOAD
  );
  const productsSheet = spreadsheet.getSheetByName(
    PLAYBOOK.SHEETS.PRODUCTS
  );

  if (!batchSheet || !productsSheet) {
    throw new Error("Products or BatchUpload sheet is missing.");
  }

  assignMissingIdsOnSheet_(batchSheet);

  const batchData = batchSheet.getDataRange().getValues();
  const productHeaders = productsSheet
    .getRange(1, 1, 1, productsSheet.getLastColumn())
    .getValues()[0];

  if (batchData.length < 2) {
    SpreadsheetApp.getUi().alert(
      "There are no BatchUpload rows to import."
    );
    return;
  }

  const batchHeaders = buildHeaderMap_(batchData[0]);
  const approvedIndex = requireHeader_(batchHeaders, "Approved");
  const importedIndex = requireHeader_(batchHeaders, "Imported");
  const statusIndex = requireHeader_(batchHeaders, "ImportStatus");
  const rowStatusIndex = productHeaders.indexOf("RowStatus");

  const rowsToImport = [];
  const sourceRows = [];

  batchData.slice(1).forEach((row, index) => {
    if (
      !isTrue_(row[approvedIndex]) ||
      isTrue_(row[importedIndex]) ||
      String(row[statusIndex] || "").trim() !== "Ready to Import"
    ) {
      return;
    }

    const recommendationIndex =
      batchHeaders.RecommendedProductIDs !== undefined
        ? batchHeaders.RecommendedProductIDs
        : batchHeaders.RelatedProductIDs;

    if (recommendationIndex !== undefined) {
      const validIds = collectAllProductIds_();
      const issue = validateRecommendedProductIds_(
        row[recommendationIndex],
        validIds
      );

      if (issue) {
        const notesIndex = batchHeaders.ReviewNotes;
        if (notesIndex !== undefined) {
          batchSheet
            .getRange(index + 2, notesIndex + 1)
            .setValue(issue);
        }
        return;
      }
    }

    const targetHeaders = rowStatusIndex >= 0
      ? productHeaders.slice(0, rowStatusIndex)
      : productHeaders;

    rowsToImport.push(targetHeaders.map((header) => {
      const key = String(header || "").trim();

      if (key === "LastUpdated") return new Date();

      let sourceIndex = batchHeaders[key];

      if (
        sourceIndex === undefined &&
        key === "RecommendedProductIDs"
      ) {
        sourceIndex = batchHeaders.RelatedProductIDs;
      }

      return sourceIndex === undefined ? "" : row[sourceIndex];
    }));

    sourceRows.push(index + 2);
  });

  if (!rowsToImport.length) {
    SpreadsheetApp.getUi().alert(
      "No rows are ready to import. Check Approved and ImportStatus."
    );
    return;
  }

  const productIds = productsSheet
    .getRange(
      2,
      1,
      Math.max(productsSheet.getMaxRows() - 1, 1),
      1
    )
    .getValues();

  let firstTargetRow =
    productIds.findIndex((row) => !String(row[0] || "").trim()) + 2;

  if (firstTargetRow < 2) {
    productsSheet.insertRowsAfter(
      productsSheet.getMaxRows(),
      rowsToImport.length
    );
    firstTargetRow = productsSheet.getMaxRows() - rowsToImport.length + 1;
  }

  productsSheet
    .getRange(
      firstTargetRow,
      1,
      rowsToImport.length,
      rowsToImport[0].length
    )
    .setValues(rowsToImport);

  // Preserve the established approval workflow while routing snow-specific
  // columns to the normalized SnowsportsAttributes sheet.
  const productsTable = tableFromSheet_(productsSheet, "ProductID");
  const now = new Date();
  sourceRows.forEach((sourceRow) => {
    const source = batchSheet.getRange(sourceRow, 1, 1, batchSheet.getLastColumn()).getValues()[0];
    const productId = normalizeId_(source[batchHeaders.ProductID]);
    const snowUpdates = {};
    Object.keys(ADMIN_WRITE.PRODUCT_FIELDS).forEach((field) => {
      const route = ADMIN_WRITE.PRODUCT_FIELDS[field];
      const sourceIndex = batchHeaders[field];
      if (route.sheet !== "snow" || sourceIndex === undefined) return;
      const value = source[sourceIndex];
      if (value !== "" && value !== null && value !== undefined) snowUpdates[route.column] = value;
    });
    if (productId && Object.keys(snowUpdates).length) {
      writeSnowPatch_(spreadsheet, productId, snowUpdates, now, productsTable);
    }
  });

  sourceRows.forEach((rowNumber) => {
    batchSheet.getRange(rowNumber, importedIndex + 1).setValue(true);
  });

  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    rowsToImport.length === 1
      ? "1 product was imported into Products."
      : `${rowsToImport.length} products were imported into Products.`
  );
}

function migrateRelatedProductField() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let renamed = 0;

  [
    PLAYBOOK.SHEETS.PRODUCTS,
    PLAYBOOK.SHEETS.BATCH_UPLOAD
  ].forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return;

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    const oldIndex = headers.indexOf("RelatedProductIDs");
    const newIndex = headers.indexOf("RecommendedProductIDs");

    if (oldIndex >= 0 && newIndex < 0) {
      sheet
        .getRange(1, oldIndex + 1)
        .setValue("RecommendedProductIDs");
      renamed += 1;
    }
  });

  SpreadsheetApp.flush();

  SpreadsheetApp.getUi().alert(
    renamed
      ? `${renamed} field header(s) were renamed. Existing values were preserved.`
      : "No migration was needed."
  );
}

function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();

  if (
    sheetName !== PLAYBOOK.SHEETS.PRODUCTS &&
    sheetName !== PLAYBOOK.SHEETS.BATCH_UPLOAD
  ) {
    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  const targetIndex = headers.indexOf("RecommendedProductIDs");

  if (targetIndex < 0 || e.range.getColumn() !== targetIndex + 1) {
    return;
  }

  const validIds = collectAllProductIds_();
  const issue = validateRecommendedProductIds_(
    e.range.getValue(),
    validIds
  );

  if (issue) {
    e.range
      .setBackground("#F4CCCC")
      .setNote(issue);

    SpreadsheetApp.getActiveSpreadsheet().toast(
      issue,
      "Playbook CMS",
      5
    );
  } else {
    e.range
      .setBackground(null)
      .setNote("");
  }
}

function validateRecommendedProductIds_(value, validIds) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  const ids = raw
    .split("|")
    .map((id) => normalizeId_(id))
    .filter(Boolean);

  if (ids.length > 3) {
    return "Use no more than three RecommendedProductIDs.";
  }

  const missing = ids.filter((id) => !validIds.has(id));

  if (missing.length) {
    return `Unknown ProductID: ${missing.join(", ")}`;
  }

  return "";
}

function refreshPlaybookCms() {
  SpreadsheetApp.flush();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "CMS formulas and validations refreshed.",
    "Playbook CMS",
    4
  );
}

function setupProductRecommendations() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS);
  const headers = [
    "SourceProductID", "RecommendationType", "RecommendationTier",
    "TargetProductID", "Active", "LastUpdated"
  ];
  if (!sheet) sheet = ss.insertSheet(PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS);
  if (sheet.getLastRow() === 0 || !String(sheet.getRange(1, 1).getValue()).trim()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map((value) => String(value || "").trim());
    const missing = headers.filter((header) => !existing.includes(header));
    if (missing.length) throw new Error(`ProductRecommendations is missing: ${missing.join(", ")}`);
  }
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#17324D").setFontColor("#FFFFFF").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheet.setFrozenRows(1);
  sheet.getRange(2, 5, Math.max(sheet.getMaxRows() - 1, 1), 1).insertCheckboxes();
  sheet.getRange(2, 6, Math.max(sheet.getMaxRows() - 1, 1), 1)
    .setNumberFormat("yyyy-mm-dd hh:mm:ss");
  SpreadsheetApp.getUi().alert("ProductRecommendations is ready.");
}

/**
 * Run once before deploying v2.1. Adds the Winter Sports columns without
 * moving or deleting any existing data, and creates normalized variant rows.
 */
function setupWinterSportsV21() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const snowHeaders = [
    "Profile", "SnowboardWidth", "TurnRadius", "BootFlex",
    "ClosureSystem", "BootFlexIndex", "LastWidth", "BindingFlex",
    "EntryStyle", "Response", "DINRange", "BrakeWidth"
  ];
  const batch = ss.getSheetByName(PLAYBOOK.SHEETS.BATCH_UPLOAD);
  if (batch) appendMissingHeaders_(batch, snowHeaders);
  let snow = ss.getSheetByName(PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES);
  const existingSnowHeaders = [
    "ProductID", "Ability", "Terrain", "AbilityLevel",
    "TerrainGroomers", "TerrainAllMountain", "TerrainPowder",
    "TerrainTrees", "TerrainPark", "ShapeOrWidth", "Flex",
    "CustomerProfile", "SellingTips", "ComparisonNotes",
    "TalkingPoints", "CommonQuestions"
  ];
  if (!snow) {
    snow = ss.insertSheet(PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES);
    snow.getRange(1, 1, 1, existingSnowHeaders.length + snowHeaders.length + 1)
      .setValues([[...existingSnowHeaders, ...snowHeaders, "LastUpdated"]]);
  } else {
    appendMissingHeaders_(snow, [...existingSnowHeaders, ...snowHeaders, "LastUpdated"]);
  }
  snow.getRange(1, 1, 1, snow.getLastColumn())
    .setBackground("#17324D").setFontColor("#FFFFFF").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  snow.setFrozenRows(1);
  migrateExistingSnowAttributes_(ss, snow);

  let variants = ss.getSheetByName(PLAYBOOK.SHEETS.PRODUCT_VARIANTS);
  if (!variants) variants = ss.insertSheet(PLAYBOOK.SHEETS.PRODUCT_VARIANTS);
  const variantHeaders = [
    "ProductVariantID", "ProductID", "VariantType", "VariantValue",
    "DisplayOrder", "Active", "LastUpdated"
  ];
  if (!String(variants.getRange(1, 1).getValue()).trim()) {
    variants.getRange(1, 1, 1, variantHeaders.length).setValues([variantHeaders]);
  } else {
    appendMissingHeaders_(variants, variantHeaders);
  }
  variants.getRange(1, 1, 1, variants.getLastColumn())
    .setBackground("#17324D").setFontColor("#FFFFFF").setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  variants.setFrozenRows(1);

  let dictionary = ss.getSheetByName(PLAYBOOK.SHEETS.DATA_DICTIONARY);
  if (!dictionary) dictionary = ss.insertSheet(PLAYBOOK.SHEETS.DATA_DICTIONARY);
  if (!String(dictionary.getRange(1, 1).getValue()).trim()) {
    dictionary.getRange(1, 1, 1, 3).setValues([["Field", "AllowedValues", "Notes"]]);
  } else {
    // Older CMS workbooks may already have a dictionary with Attribute/Options
    // columns or a title block. Preserve it and append the canonical columns.
    appendMissingHeaders_(dictionary, ["Field", "AllowedValues", "Notes"]);
  }
  appendDictionaryDefaults_(dictionary);
  applyWinterSportsValidations_(ss, snow);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert("Winter Sports v2.1 schema is ready.");
}

function appendMissingHeaders_(sheet, required) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    .map((value) => String(value || "").trim());
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) sheet.getRange(1, lastColumn + 1, 1, missing.length).setValues([missing]);
}

function migrateExistingSnowAttributes_(ss, snowSheet) {
  const products = requireTable_(ss, PLAYBOOK.SHEETS.PRODUCTS, "ProductID");
  const snow = tableFromSheet_(snowSheet, "ProductID");
  const productRows = getRows_(ss, PLAYBOOK.SHEETS.PRODUCTS);
  const existingRows = {};
  if (snowSheet.getLastRow() >= 2) {
    snowSheet.getRange(2, 1, snowSheet.getLastRow() - 1, snow.headers.length)
      .getValues().forEach((values, index) => {
        const id = normalizeId_(values[snow.map.ProductID]);
        if (id) existingRows[id] = { values, rowNumber: index + 2 };
      });
  }
  const aliases = { ShapeOrWidth: ["ShapeOrWidth", "Width"], AbilityLevel: ["AbilityLevel", "Ability Level"] };
  const now = new Date();
  productRows.forEach((product) => {
    const productId = normalizeId_(product.ProductID);
    if (!productId) return;
    const current = existingRows[productId];
    const patch = {};
    snow.headers.forEach((header) => {
      if (header === "ProductID" || header === "LastUpdated") return;
      const sourceColumns = aliases[header] || [header];
      const source = sourceColumns.find((column) => products.map[column] !== undefined);
      if (!source) return;
      const value = product[source];
      const targetValue = current ? current.values[snow.map[header]] : "";
      if ((targetValue === "" || targetValue === null) && value !== "" && value !== null && value !== undefined) {
        patch[header] = value;
      }
    });
    if (current && !Object.keys(patch).length) return;
    const rowNumber = current ? current.rowNumber : nextLogicalRow_(snow, "ProductID");
    patch.ProductID = product.ProductID;
    patch.LastUpdated = now;
    writePatch_(snow, rowNumber, patch);
  });
}

function appendDictionaryDefaults_(sheet) {
  const table = tableFromSheet_(sheet, "Field");
  requireTableColumn_(table, "AllowedValues");
  const entries = {};
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, table.headers.length)
      .getValues().forEach((values, index) => {
        const field = String(values[table.map.Field] || "").trim();
        if (field && !entries[field]) entries[field] = { values, rowNumber: index + 2 };
      });
  }
  const rows = [];
  Object.keys(ADMIN_WRITE.DICTIONARY_DEFAULTS).forEach((field) => {
    const existing = entries[field];
    if (existing) {
      const current = String(existing.values[table.map.AllowedValues] || "")
        .split(/\s*\|\s*|\s*,\s*/).filter(Boolean);
      const merged = current.slice();
      ADMIN_WRITE.DICTIONARY_DEFAULTS[field].forEach((value) => {
        if (!merged.includes(value)) merged.push(value);
      });
      sheet.getRange(existing.rowNumber, table.map.AllowedValues + 1)
        .setValue(merged.join("|"));
      return;
    }
    rows.push(table.headers.map((header) => {
      if (header === "Field") return field;
      if (header === "AllowedValues") return ADMIN_WRITE.DICTIONARY_DEFAULTS[field].join("|");
      if (header === "Notes") return "Playbook CMS v2.1 controlled values";
      return "";
    }));
  });
  if (rows.length) sheet.getRange(nextLogicalRow_(table, "Field"), 1, rows.length, table.headers.length).setValues(rows);
}

function applyWinterSportsValidations_(ss, snowSheet) {
  const refs = buildWriteReferences_(ss);
  const table = tableFromSheet_(snowSheet, "ProductID");
  const rowCount = Math.max(snowSheet.getMaxRows() - 1, 1);
  const lists = {
    Flex: refs.flex,
    Profile: refs.snowboardProfiles.concat(refs.skiProfiles)
      .filter((value, index, values) => values.indexOf(value) === index),
    SnowboardWidth: refs.snowboardWidths,
    ClosureSystem: refs.closureSystems,
    EntryStyle: refs.entryStyles,
    Response: refs.responses
  };
  Object.keys(lists).forEach((field) => {
    if (table.map[field] === undefined) return;
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(lists[field], true)
      .setAllowInvalid(false)
      .build();
    snowSheet.getRange(2, table.map[field] + 1, rowCount, 1).setDataValidation(rule);
  });
  ["AbilityLevel", "TerrainGroomers", "TerrainAllMountain", "TerrainPowder",
    "TerrainTrees", "TerrainPark", "BootFlex", "BindingFlex"].forEach((field) => {
    if (table.map[field] === undefined) return;
    const rule = SpreadsheetApp.newDataValidation()
      .requireNumberBetween(1, 5).setAllowInvalid(false).build();
    snowSheet.getRange(2, table.map[field] + 1, rowCount, 1)
      .setDataValidation(rule).setNumberFormat("0");
  });
  const numericRanges = {
    TurnRadius: "0.0", BootFlexIndex: "0", LastWidth: "0.0", BrakeWidth: "0"
  };
  Object.keys(numericRanges).forEach((field) => {
    if (table.map[field] !== undefined) {
      snowSheet.getRange(2, table.map[field] + 1, rowCount, 1)
        .setNumberFormat(numericRanges[field]);
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Playbook Import Packages                                                    */
/* -------------------------------------------------------------------------- */

const IMPORT_FIELD_MAP = {
  ProductID: "ProductID", Brand: "BrandID", BrandID: "BrandID",
  Model: "Model", Sport: "SportID", SportID: "SportID",
  Category: "CategoryID", CategoryID: "CategoryID", Gender: "Gender",
  Ability: "Ability", AbilityLevel: "AbilityLevel", Terrain: "Terrain", Price: "MSRP", MSRP: "MSRP",
  Season: "Season", ProductDescription: "ProductDescription", Description: "ProductDescription",
  PrimaryImageURL: "ImageURL", ImageURL: "ImageURL", VideoURL: "VideoURL",
  NewThisSeason: "NewThisSeason", StoreFavorite: "StoreFavorite", Featured: "Featured",
  ShapeOrWidth: "ShapeOrWidth", Flex: "Flex",
  Profile: "Profile", CamberProfile: "Profile", RockerProfile: "Profile",
  SnowboardWidth: "SnowboardWidth", TurnRadius: "TurnRadius",
  BootFlex: "BootFlex", LacingSystem: "ClosureSystem", ClosureSystem: "ClosureSystem",
  BootFlexIndex: "BootFlexIndex", LastWidth: "LastWidth",
  BindingFlex: "BindingFlex", EntryStyle: "EntryStyle", Response: "Response",
  DINRange: "DINRange", BrakeWidth: "BrakeWidth",
  TerrainGroomers: "TerrainGroomers", TerrainAllMountain: "TerrainAllMountain",
  TerrainPowder: "TerrainPowder", TerrainTrees: "TerrainTrees", TerrainPark: "TerrainPark",
  CustomerProfile: "CustomerProfile", SellingTips: "SellingTips",
  ComparisonNotes: "ComparisonNotes", TalkingPoints: "TalkingPoints",
  CommonQuestions: "CommonQuestions"
};

const IMPORT_REQUIRED_FIELDS = ["BrandID", "Model", "SportID", "CategoryID"];
const IMPORT_IGNORED_FIELDS = [
  "BatchID", "Approved", "Imported", "ImportStatus", "ReviewNotes",
  "ValidationStatus", "ValidationErrors", "RowStatus", "Status", "Active",
  "LastUpdated", "DisplayOrder", "RecommendedProductIDs", "RelatedProductIDs",
  "__PlaybookSourceRow"
];
const IMPORT_DESTINATION_ALIASES = {
  ProductDescription: ["ProductDescription", "Description"],
  AbilityLevel: ["AbilityLevel", "Ability Level"]
};

function validateImport_(request) {
  const analysis = analyzeImportPackage_(request.importPackage);
  return {
    success: true,
    valid: analysis.errors.length === 0,
    summary: analysis.summary,
    updates: analysis.updates,
    errors: analysis.errors,
    warnings: analysis.warnings,
    ignoredWorksheets: analysis.ignoredWorksheets,
    sourceWorksheet: analysis.sourceWorksheet,
    packageFingerprint: importFingerprint_(request.importPackage)
  };
}

function commitImport_(request) {
  const fingerprint = importFingerprint_(request.importPackage);
  if (!request.packageFingerprint || request.packageFingerprint !== fingerprint) {
    throw apiError_("The import package changed after preview. Validate it again.", "IMPORT_CHANGED");
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw apiError_("The CMS is busy. Please try again.", "CMS_BUSY");
  try {
    const analysis = analyzeImportPackage_(request.importPackage);
    if (analysis.errors.length) {
      throw apiError_("The import package contains validation errors.", "VALIDATION_ERROR", {
        valid: false, summary: analysis.summary, errors: analysis.errors, warnings: analysis.warnings
      });
    }
    const result = applyImportPlan_(analysis.plan, analysis.variantPlan);
    return { success: true, imported: result, summary: analysis.summary, warnings: analysis.warnings };
  } finally {
    lock.releaseLock();
  }
}

function analyzeImportPackage_(importPackage) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const errors = [];
  const warnings = [];
  const sheets = importPackage && importPackage.worksheets;
  const sourceWorksheet = sheets && Array.isArray(sheets.Products)
    ? "Products"
    : (sheets && Array.isArray(sheets.BatchUpload) ? "BatchUpload" : "");
  const products = sourceWorksheet ? sheets[sourceWorksheet] : null;
  const variants = sheets && Array.isArray(sheets.ProductVariants) ? sheets.ProductVariants : [];
  const ignoredWorksheets = sheets && typeof sheets === "object"
    ? Object.keys(sheets).filter((name) => name !== sourceWorksheet && name !== "ProductVariants") : [];
  if (!Array.isArray(products)) {
    errors.push(importError_(0, "Products", "A Products or BatchUpload worksheet is required."));
    return emptyImportAnalysis_(errors, ignoredWorksheets, sourceWorksheet);
  }
  if (!products.length) {
    errors.push(importError_(0, sourceWorksheet, `The ${sourceWorksheet} worksheet contains no product rows.`));
    return emptyImportAnalysis_(errors, ignoredWorksheets, sourceWorksheet);
  }
  if (products.length > 500) {
    errors.push(importError_(0, "Products", "A package may contain no more than 500 products."));
  }

  const refs = buildWriteReferences_(ss);
  const productTable = requireTable_(ss, PLAYBOOK.SHEETS.PRODUCTS, "ProductID");
  const snowSheet = ss.getSheetByName(PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES);
  const snowTable = snowSheet ? tableFromSheet_(snowSheet, "ProductID") : null;
  if (snowSheet) {
    getRows_(ss, PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES).forEach((row) => {
      const id = normalizeId_(row.ProductID);
      if (id && refs.products[id]) refs.products[id] = { ...refs.products[id], ...row, ProductID: refs.products[id].ProductID };
    });
  }
  const seenIds = new Set();
  const seenRows = new Set();
  const reservedIds = new Set(Object.keys(refs.products));
  const maxByPrefix = buildMaxSequenceMap_(reservedIds);
  const plan = [];
  const updates = [];

  products.forEach((source, index) => {
    const rowNumber = Number(source && source.__PlaybookSourceRow) || index + 2;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      errors.push(importError_(rowNumber, "Row", "Row must contain named product fields."));
      return;
    }
    const unsupported = Object.keys(source).filter((field) =>
      source[field] !== "" && source[field] !== null && source[field] !== undefined &&
      !Object.prototype.hasOwnProperty.call(IMPORT_FIELD_MAP, field) &&
      !IMPORT_IGNORED_FIELDS.includes(field)
    );
    unsupported.forEach((field) => errors.push(importError_(
      rowNumber, field, "This field is not supported by the Products import schema."
    )));

    const canonical = {};
    Object.keys(source).forEach((field) => {
      const target = IMPORT_FIELD_MAP[field];
      if (target && source[field] !== undefined) canonical[target] = source[field];
    });
    IMPORT_REQUIRED_FIELDS.forEach((field) => {
      if (canonical[field] === "" || canonical[field] === null || canonical[field] === undefined) {
        errors.push(importError_(rowNumber, field, "Required field is missing."));
      }
    });
    let productId = normalizeId_(canonical.ProductID);
    if (productId && seenIds.has(productId)) {
      errors.push(importError_(rowNumber, "ProductID", `Duplicate ProductID in package: ${productId}`));
    }
    if (productId) seenIds.add(productId);
    const rowKey = stableStringify_(canonical);
    if (seenRows.has(rowKey)) errors.push(importError_(rowNumber, "Row", "Duplicate row in package."));
    seenRows.add(rowKey);

    const existing = refs.products[productId];
    try {
      const validated = validateImportRow_(canonical, existing || {}, refs);
      if (!productId) {
        productId = nextImportProductId_(validated.SportID, maxByPrefix, reservedIds);
        validated.ProductID = productId;
      }
      reservedIds.add(productId);
      const isSnow = isSnowSport_(validated.SportID || (existing && existing.SportID), refs.sports);
      const expectedSnowFields = isSnow
        ? requiredSnowFields_(validated.CategoryID || (existing && existing.CategoryID), refs.categories)
        : [];
      expectedSnowFields.forEach((field) => {
        const value = importReviewValue_(validated, existing, field);
        if (value === "" || value === null || value === undefined) {
          warnings.push(importWarning_(rowNumber, field));
        }
      });
      expectedReviewFields_(isSnow).forEach((field) => {
        if (expectedSnowFields.includes(field)) return;
        const value = importReviewValue_(validated, existing, field);
        if (value === "" || value === null || value === undefined) warnings.push(importWarning_(rowNumber, field));
      });
      validateImportDestinations_(validated, productTable, snowTable, rowNumber, errors);
      plan.push({ rowNumber, productId, existing: Boolean(existing), values: validated });
      if (existing) updates.push({
        ProductID: productId,
        Brand: referenceName_(validated.BrandID || existing.BrandID, refs.brands),
        Model: String(validated.Model || existing.Model || "")
      });
    } catch (error) {
      errors.push(importError_(rowNumber, importFieldFromMessage_(error.message), error.message));
    }
  });

  const newCount = plan.filter((item) => !item.existing).length;
  const updateCount = plan.filter((item) => item.existing).length;
  const variantAnalysis = analyzeVariantRows_(variants, reservedIds, ss);
  errors.push(...variantAnalysis.errors);
  return {
    errors, warnings, updates, ignoredWorksheets, sourceWorksheet, plan,
    variantPlan: variantAnalysis.plan,
    summary: { newProducts: newCount, existingProducts: updateCount, variants: variantAnalysis.plan.length, errors: errors.length, warnings: warnings.length }
  };
}

function analyzeVariantRows_(rows, validProductIds, ss) {
  const errors = [];
  const plan = [];
  if (!rows.length) return { errors, plan };
  const sheet = ss.getSheetByName(PLAYBOOK.SHEETS.PRODUCT_VARIANTS);
  if (!sheet) {
    errors.push(importError_(0, "ProductVariants", "Run Set Up Winter Sports v2.1 before importing variants."));
    return { errors, plan };
  }
  const table = tableFromSheet_(sheet, "ProductVariantID");
  ["ProductID", "VariantType", "VariantValue", "DisplayOrder", "Active", "LastUpdated"]
    .forEach((column) => requireTableColumn_(table, column));
  const packageIds = new Set();
  rows.forEach((row, index) => {
    const rowNumber = Number(row && row.__PlaybookSourceRow) || index + 2;
    const variantId = normalizeId_(row && row.ProductVariantID);
    const productId = normalizeId_(row && row.ProductID);
    if (!variantId) errors.push(importError_(rowNumber, "ProductVariantID", "ProductVariantID is required."));
    if (!productId || !validProductIds.has(productId)) errors.push(importError_(rowNumber, "ProductID", "ProductID must identify a product in the CMS or this package."));
    if (!String(row && row.VariantValue || "").trim()) errors.push(importError_(rowNumber, "VariantValue", "VariantValue is required."));
    if (packageIds.has(variantId)) errors.push(importError_(rowNumber, "ProductVariantID", `Duplicate ProductVariantID in package: ${variantId}`));
    packageIds.add(variantId);
    if (!variantId || !productId || !validProductIds.has(productId) || !String(row && row.VariantValue || "").trim()) return;
    plan.push({
      ProductVariantID: variantId,
      ProductID: productId,
      VariantType: textValue_(row.VariantType || "Size", "VariantType", 80),
      VariantValue: textValue_(row.VariantValue, "VariantValue", 120),
      DisplayOrder: row.DisplayOrder === "" || row.DisplayOrder === null || row.DisplayOrder === undefined ? 0 : numericValue_(row.DisplayOrder, "DisplayOrder", 0, 10000),
      Active: row.Active === "" || row.Active === null || row.Active === undefined ? true : isTrue_(row.Active)
    });
  });
  return { errors, plan };
}

function validateImportRow_(canonical, existing, refs) {
  const result = { ProductID: normalizeId_(canonical.ProductID) };
  Object.keys(canonical).forEach((field) => {
    if (field === "ProductID") return;
    const value = canonical[field];
    if (field === "BrandID") result[field] = referenceId_(value, refs.brands, "brand");
    else if (field === "SportID") result[field] = referenceId_(value, refs.sports, "sport");
    else if (field === "CategoryID") result[field] = referenceId_(value, refs.categories, "category");
    else if (field === "MSRP") result[field] = numericValue_(value, field, 0, 1000000);
    else if (field === "Gender") result[field] = optionalEnumValue_(value, refs.genders, field);
    else if (field === "Ability") result[field] = abilityValue_(value);
    else if (field === "Terrain") result[field] = multiEnumValue_(value, ADMIN_WRITE.TERRAIN_OPTIONS, field);
    else if (field === "AbilityLevel" || field.startsWith("Terrain") || field === "BootFlex" || field === "BindingFlex") result[field] = numericValue_(value, field, 1, 5);
    else if (field === "TurnRadius") result[field] = numericValue_(value, field, 5, 50);
    else if (field === "BootFlexIndex") result[field] = numericValue_(value, field, 40, 180);
    else if (field === "LastWidth") result[field] = numericValue_(value, field, 85, 110);
    else if (field === "BrakeWidth") result[field] = numericValue_(value, field, 50, 160);
    else if (field === "ImageURL" || field === "VideoURL") result[field] = urlValue_(value, field);
    else if (field === "Flex") result[field] = optionalEnumValue_(value, refs.flex, field);
    else if (field === "ShapeOrWidth") result[field] = shapeOrWidthValue_(value, refs.shapes, canonical);
    else if (field === "Profile") result[field] = categoryEnumValue_(value, profileOptions_(canonical, existing, refs), field);
    else if (field === "SnowboardWidth") result[field] = optionalEnumValue_(value, refs.snowboardWidths, field);
    else if (field === "ClosureSystem") result[field] = optionalEnumValue_(value, refs.closureSystems, field);
    else if (field === "EntryStyle") result[field] = optionalEnumValue_(value, refs.entryStyles, field);
    else if (field === "Response") result[field] = optionalEnumValue_(value, refs.responses, field);
    else if (field === "DINRange") result[field] = dinRangeValue_(value);
    else if (["NewThisSeason", "StoreFavorite", "Featured"].includes(field)) result[field] = isTrue_(value);
    else result[field] = textValue_(value, field, 5000);
  });
  synchronizeAbilityFields_(result);
  const sportId = result.SportID || existing.SportID;
  const categoryId = result.CategoryID || existing.CategoryID;
  const category = refs.categories.byId[normalizeId_(categoryId)];
  if (category && normalizeId_(category.row.SportID) !== normalizeId_(sportId)) {
    throw apiError_("Category does not belong to the selected sport.", "VALIDATION_ERROR");
  }
  return result;
}

function validateImportDestinations_(values, productTable, snowTable, rowNumber, errors) {
  Object.keys(values).forEach((field) => {
    if (field === "ProductID") return;
    const route = ADMIN_WRITE.PRODUCT_FIELDS[field];
    const target = route && route.sheet === "snow" && snowTable ? snowTable : productTable;
    if (!destinationColumn_(field, target)) errors.push(importError_(
      rowNumber, field, `CMS destination column is missing from ${target.sheet.getName()}.`
    ));
  });
}

function applyImportPlan_(plan, variantPlan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const products = requireTable_(ss, PLAYBOOK.SHEETS.PRODUCTS, "ProductID");
  const snowSheet = ss.getSheetByName(PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES);
  const snow = snowSheet ? tableFromSheet_(snowSheet, "ProductID") : null;
  const now = new Date();
  const originalProducts = products.sheet.getDataRange().getValues();
  const originalSnow = snow ? snow.sheet.getDataRange().getValues() : null;
  const variantSheet = ss.getSheetByName(PLAYBOOK.SHEETS.PRODUCT_VARIANTS);
  const variants = variantSheet ? tableFromSheet_(variantSheet, "ProductVariantID") : null;
  const originalVariants = variants ? variants.sheet.getDataRange().getValues() : null;
  try {
    plan.forEach((item) => {
      let productMatches = findRows_(products, "ProductID", item.productId);
      let productRow;
      if (productMatches.length) productRow = productMatches[0].rowNumber;
      else {
        productRow = nextLogicalRow_(products, "ProductID");
        products.sheet.getRange(productRow, 1, 1, products.headers.length)
          .setValues([products.headers.map((header) => header === "ProductID" ? item.productId : "")]);
      }
      const productUpdates = {};
      const snowUpdates = {};
      Object.keys(item.values).forEach((field) => {
        if (field === "ProductID") return;
        const route = ADMIN_WRITE.PRODUCT_FIELDS[field];
        if (route && route.sheet === "snow" && snow) snowUpdates[destinationColumn_(field, snow)] = item.values[field];
        else productUpdates[destinationColumn_(field, products)] = item.values[field];
      });
      if (!item.existing) {
        productUpdates.Active = false;
        if (products.map.RowStatus !== undefined) productUpdates.RowStatus = "Needs Review";
        if (products.map.Status !== undefined) productUpdates.Status = "Needs Review";
      }
      productUpdates.LastUpdated = now;
      writePatch_(products, productRow, productUpdates);
      if (snow && Object.keys(snowUpdates).length) writeSnowPatch_(ss, item.productId, snowUpdates, now, products);
    });
    (variantPlan || []).forEach((item) => {
      const matches = findRows_(variants, "ProductVariantID", item.ProductVariantID);
      if (matches.length > 1) throw apiError_(`Duplicate ProductVariantID: ${item.ProductVariantID}`, "DATA_INTEGRITY_ERROR");
      const rowNumber = matches.length ? matches[0].rowNumber : nextLogicalRow_(variants, "ProductVariantID");
      writePatch_(variants, rowNumber, { ...item, LastUpdated: now });
    });
    SpreadsheetApp.flush();
    return {
      total: plan.length,
      newProducts: plan.filter((item) => !item.existing).length,
      updatedProducts: plan.filter((item) => item.existing).length,
      variants: (variantPlan || []).length,
      importedAt: now.toISOString()
    };
  } catch (error) {
    restoreSheetSnapshot_(products.sheet, originalProducts);
    if (snow && originalSnow) restoreSheetSnapshot_(snow.sheet, originalSnow);
    if (variants && originalVariants) restoreSheetSnapshot_(variants.sheet, originalVariants);
    SpreadsheetApp.flush();
    throw error;
  }
}

function restoreSheetSnapshot_(sheet, values) {
  sheet.clearContents();
  if (values.length && values[0].length) sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
}

function buildCatalogReference_() {
  const payload = buildPlaybookPayload_();
  const brands = {};
  payload.brands.forEach((brand) => { brands[normalizeId_(brand.BrandID)] = brand.Name; });
  const sports = {}; const categories = {};
  payload.sports.forEach((sport) => { sports[normalizeId_(sport.id)] = sport.name; });
  payload.categories.forEach((category) => { categories[normalizeId_(category.CategoryID)] = category.Name; });
  return {
    success: true, generatedAt: new Date().toISOString(),
    columns: ["ProductID", "Brand", "Model", "Sport", "Category", "Gender"],
    products: payload.products.map((product) => ({
      ProductID: product.ProductID,
      Brand: brands[normalizeId_(product.BrandID)] || product.BrandID,
      Model: product.Model,
      Sport: sports[normalizeId_(product.SportID)] || product.SportID,
      Category: categories[normalizeId_(product.CategoryID)] || product.CategoryID,
      Gender: product.Gender || ""
    }))
  };
}

function buildReferenceDictionary_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const refs = buildWriteReferences_(ss);
  const list = (rows, id, name, extra) => rows.filter(isActive_).map((row) => ({
    id: String(row[id] || ""), name: String(row[name] || ""), ...(extra ? extra(row) : {})
  }));
  return {
    success: true, generatedAt: new Date().toISOString(),
    Sports: list(getRows_(ss, PLAYBOOK.SHEETS.SPORTS), "SportID", "Name"),
    Categories: list(getRows_(ss, PLAYBOOK.SHEETS.CATEGORIES), "CategoryID", "Name", (row) => ({ SportID: row.SportID })),
    Brands: list(getRows_(ss, PLAYBOOK.SHEETS.BRANDS), "BrandID", "Name"),
    SnowboardShapes: refs.shapes,
    SnowboardProfiles: refs.snowboardProfiles,
    SkiProfiles: refs.skiProfiles,
    SnowboardWidths: refs.snowboardWidths,
    ClosureSystems: refs.closureSystems,
    EntryStyles: refs.entryStyles,
    Responses: refs.responses,
    Flex: refs.flex,
    Genders: refs.genders,
    Terrain: ADMIN_WRITE.TERRAIN_OPTIONS,
    AbilityLevels: [1, 2, 3, 4, 5],
    TerrainRatings: [1, 2, 3, 4, 5]
  };
}

function emptyImportAnalysis_(errors, ignoredWorksheets, sourceWorksheet) {
  return { errors, warnings: [], ignoredWorksheets, sourceWorksheet, updates: [], plan: [], variantPlan: [], summary: { newProducts: 0, existingProducts: 0, variants: 0, errors: errors.length, warnings: 0 } };
}

function importError_(row, field, message) { return { row, field, message, code: "VALIDATION_ERROR" }; }
function importWarning_(row, field) {
  return { row, field, message: "Expected field is blank. The product will import as Needs Review so an Admin can complete it.", code: "REVIEW_WARNING" };
}
function expectedReviewFields_(isSnow) {
  const content = ["Gender", "ImageURL", "ProductDescription", "CustomerProfile", "SellingTips", "ComparisonNotes", "TalkingPoints", "CommonQuestions"];
  return isSnow ? content.concat(["TerrainGroomers", "TerrainAllMountain", "TerrainPowder", "TerrainTrees", "TerrainPark"]) : content;
}
function importReviewValue_(validated, existing, field) {
  if (validated[field] !== undefined) return validated[field];
  if (field === "ProductDescription") return existing && (existing.ProductDescription !== undefined ? existing.ProductDescription : existing.Description);
  return existing && existing[field];
}
function importFieldFromMessage_(message) {
  return Object.keys(IMPORT_FIELD_MAP).find((field) => String(message).includes(field)) || "Row";
}
function referenceName_(id, map) {
  const match = map.byId[normalizeId_(id)];
  return match ? String(match.row.Name || match.id) : String(id || "");
}
function isSnowSport_(sportId, sports) {
  const sport = sports.byId[normalizeId_(sportId)];
  const text = normalizeId_(`${sportId} ${(sport && sport.row.Name) || ""}`);
  return text.includes("SKI") || text.includes("SNB") || text.includes("SNOWBOARD");
}
function requiredSnowFields_(categoryId, categories) {
  const category = categories.byId[normalizeId_(categoryId)];
  const text = normalizeId_(`${categoryId} ${(category && category.row.Name) || ""}`);
  if (text.includes("SNBBOOT")) return ["AbilityLevel", "BootFlex", "ClosureSystem"];
  if (text.includes("SKIBOOT")) return ["AbilityLevel", "BootFlexIndex", "LastWidth", "ClosureSystem"];
  if (text.includes("SNBBIND")) return ["AbilityLevel", "BindingFlex", "EntryStyle", "Response"];
  if (text.includes("SKIBIND")) return ["AbilityLevel", "DINRange", "BrakeWidth"];
  if (text.includes("SNB") || text.includes("BOARD")) return ["AbilityLevel", "ShapeOrWidth", "SnowboardWidth", "Profile", "Flex"];
  if (text.includes("SKI")) return ["AbilityLevel", "ShapeOrWidth", "Profile", "Flex"];
  return ["AbilityLevel", "Flex"];
}
function stableStringify_(value) {
  const ordered = {};
  Object.keys(value || {}).sort().forEach((key) => { ordered[key] = value[key]; });
  return JSON.stringify(ordered);
}
function destinationColumn_(field, table) {
  const options = IMPORT_DESTINATION_ALIASES[field] || [field];
  return options.find((column) => table.map[column] !== undefined) || "";
}
function multiEnumValue_(value, allowed, field) {
  if (value === "" || value === null) return "";
  const selected = String(value).split("|").map((item) => item.trim()).filter(Boolean);
  const canonical = selected.map((item) => enumValue_(item, allowed, field));
  return [...new Set(canonical)].join("|");
}
function nextImportProductId_(sportId, maxByPrefix, reservedIds) {
  const prefix = normalizeId_(sportId);
  if (!prefix) throw apiError_("SportID is required before ProductID can be generated.", "VALIDATION_ERROR");
  let number = maxByPrefix[prefix] || 0;
  let candidate = "";
  do {
    number += 1;
    candidate = prefix + String(number).padStart(PLAYBOOK.ID_DIGITS, "0");
  } while (reservedIds.has(candidate));
  maxByPrefix[prefix] = number;
  return candidate;
}
function importFingerprint_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value || {}));
  return Utilities.base64EncodeWebSafe(bytes);
}

/* -------------------------------------------------------------------------- */
/* Playbook Admin write API                                                    */
/* -------------------------------------------------------------------------- */

const ADMIN_WRITE = {
  SCRIPT_PROPERTIES: {
    OAUTH_CLIENT_ID: "ADMIN_GOOGLE_OAUTH_CLIENT_ID",
    ALLOWED_EMAILS: "ADMIN_ALLOWED_EMAILS",
    ALLOWED_DOMAINS: "ADMIN_ALLOWED_DOMAINS"
  },
  PRODUCT_FIELDS: {
    Brand: { sheet: "products", column: "BrandID", type: "brand" },
    BrandID: { sheet: "products", column: "BrandID", type: "brand" },
    Model: { sheet: "products", column: "Model", type: "requiredText", max: 160 },
    Sport: { sheet: "products", column: "SportID", type: "sport" },
    SportID: { sheet: "products", column: "SportID", type: "sport" },
    Category: { sheet: "products", column: "CategoryID", type: "category" },
    CategoryID: { sheet: "products", column: "CategoryID", type: "category" },
    Season: { sheet: "products", column: "Season", type: "text", max: 40 },
    Price: { sheet: "products", column: "MSRP", type: "money" },
    MSRP: { sheet: "products", column: "MSRP", type: "money" },
    ImageURL: { sheet: "products", column: "ImageURL", type: "url" },
    Gender: { sheet: "products", column: "Gender", type: "gender" },
    Ability: { sheet: "snow", column: "Ability", type: "ability" },
    Terrain: { sheet: "snow", column: "Terrain", type: "terrain" },
    Status: { sheet: "virtual", column: "Status", type: "status" },
    // CMS 2.0 stores this snow-specific rating with the other snow attributes.
    // The routing helpers still fall back to Products when that optional sheet
    // is absent, preserving compatibility with older CMS workbooks.
    AbilityLevel: { sheet: "snow", column: "AbilityLevel", type: "rating" },
    ShapeOrWidth: { sheet: "snow", column: "ShapeOrWidth", type: "shape" },
    Flex: { sheet: "snow", column: "Flex", type: "flex" },
    Profile: { sheet: "snow", column: "Profile", type: "profile" },
    SnowboardWidth: { sheet: "snow", column: "SnowboardWidth", type: "snowboardWidth" },
    TurnRadius: { sheet: "snow", column: "TurnRadius", type: "turnRadius" },
    BootFlex: { sheet: "snow", column: "BootFlex", type: "rating" },
    ClosureSystem: { sheet: "snow", column: "ClosureSystem", type: "closureSystem" },
    BootFlexIndex: { sheet: "snow", column: "BootFlexIndex", type: "bootFlexIndex" },
    LastWidth: { sheet: "snow", column: "LastWidth", type: "lastWidth" },
    BindingFlex: { sheet: "snow", column: "BindingFlex", type: "rating" },
    EntryStyle: { sheet: "snow", column: "EntryStyle", type: "entryStyle" },
    Response: { sheet: "snow", column: "Response", type: "response" },
    DINRange: { sheet: "snow", column: "DINRange", type: "dinRange" },
    BrakeWidth: { sheet: "snow", column: "BrakeWidth", type: "brakeWidth" },
    TerrainGroomers: { sheet: "snow", column: "TerrainGroomers", type: "rating" },
    TerrainAllMountain: { sheet: "snow", column: "TerrainAllMountain", type: "rating" },
    TerrainPowder: { sheet: "snow", column: "TerrainPowder", type: "rating" },
    TerrainTrees: { sheet: "snow", column: "TerrainTrees", type: "rating" },
    TerrainPark: { sheet: "snow", column: "TerrainPark", type: "rating" },
    CustomerProfile: { sheet: "snow", column: "CustomerProfile", type: "longText", max: 5000 },
    SellingTips: { sheet: "snow", column: "SellingTips", type: "longText", max: 5000 },
    ComparisonNotes: { sheet: "snow", column: "ComparisonNotes", type: "longText", max: 5000 },
    TalkingPoints: { sheet: "snow", column: "TalkingPoints", type: "longText", max: 5000 },
    CommonQuestions: { sheet: "snow", column: "CommonQuestions", type: "longText", max: 5000 },
    Recommendations: { sheet: "recommendations", column: "Recommendations", type: "recommendations" }
  },
  STATUS: {
    "Needs Review": { Active: false, RowStatus: "Needs Review" },
    "Published": { Active: true, RowStatus: "Published" },
    "Archived": { Active: false, RowStatus: "Archived" }
  },
  DEFAULT_SHAPES: [
    "Twin", "True Twin", "Directional Twin", "Directional",
    "Tapered Directional", "Asymmetrical"
  ],
  DEFAULT_FLEX: ["Soft", "Soft-Medium", "Medium", "Medium-Stiff", "Stiff"],
  DICTIONARY_DEFAULTS: {
    Flex: ["Soft", "Soft-Medium", "Medium", "Medium-Stiff", "Stiff"],
    SnowboardProfile: ["Camber", "Rocker", "Flat", "CamRock", "Hybrid Camber", "Hybrid Rocker"],
    SkiProfile: ["Camber", "Tip Rocker", "Tip/Tail Rocker", "Full Rocker", "Hybrid"],
    SnowboardWidth: ["Regular", "Wide", "Volume Shifted"],
    ClosureSystem: ["Traditional", "Single BOA", "Dual BOA", "Triple BOA", "Speed Lace", "Hybrid"],
    EntryStyle: ["Traditional", "Step On", "Hands Free"],
    Response: ["Playful", "Balanced", "Precise"]
  },
  DEFAULT_GENDERS: ["Unisex", "Men's", "Women's", "Youth"],
  ABILITY_BY_LEVEL: {
    1: "Beginner",
    2: "Beginner|Intermediate",
    3: "Intermediate",
    4: "Intermediate|Advanced",
    5: "Advanced|Expert"
  },
  TERRAIN_OPTIONS: ["Groomers", "All Mountain", "Powder", "Trees", "Park"],
  RECOMMENDATION_TYPES: ["Binding", "Boot"],
  RECOMMENDATION_TIERS: ["Recommended", "Upgrade", "Budget"]
};

function updateProduct_(request) {
  const productId = normalizeId_(request.productId);
  if (!productId) {
    throw apiError_("productId is required.", "VALIDATION_ERROR");
  }
  if (!request.changes || typeof request.changes !== "object" ||
      Array.isArray(request.changes)) {
    throw apiError_("changes must be an object.", "VALIDATION_ERROR");
  }

  const changeKeys = Object.keys(request.changes);
  if (!changeKeys.length) {
    throw apiError_("At least one change is required.", "VALIDATION_ERROR");
  }
  const unknownFields = changeKeys.filter((key) =>
    !Object.prototype.hasOwnProperty.call(ADMIN_WRITE.PRODUCT_FIELDS, key)
  );
  if (unknownFields.length) {
    throw apiError_(
      `Field(s) cannot be edited: ${unknownFields.join(", ")}`,
      "VALIDATION_ERROR"
    );
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw apiError_("The CMS is busy. Please try again.", "CMS_BUSY");
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const products = requireTable_(ss, PLAYBOOK.SHEETS.PRODUCTS, "ProductID");
    const productMatch = findUniqueRow_(products, "ProductID", productId);
    const productObject = rowObject_(products.headers, productMatch.values);
    const currentLastUpdated = toIsoTimestamp_(productObject.LastUpdated);

    if (request.expectedLastUpdated &&
        !timestampsEqual_(request.expectedLastUpdated, currentLastUpdated)) {
      throw apiError_(
        "This product changed after Admin loaded it. Reload before saving.",
        "CONFLICT",
        {
          currentLastUpdated,
          product: buildSingleProduct_(ss, productObject)
        }
      );
    }

    const references = buildWriteReferences_(ss);
    const validated = validateChanges_(request.changes, productObject, references);
    const productUpdates = {};
    const snowUpdates = {};
    let recommendationUpdates = null;

    Object.keys(validated).forEach((requestKey) => {
      const field = ADMIN_WRITE.PRODUCT_FIELDS[requestKey];
      if (field.sheet === "products") productUpdates[field.column] = validated[requestKey];
      if (field.sheet === "snow") snowUpdates[field.column] = validated[requestKey];
      if (field.sheet === "virtual") applyStatusUpdate_(productUpdates, validated[requestKey]);
      if (field.sheet === "recommendations") recommendationUpdates = validated[requestKey];
    });

    const now = new Date();
    productUpdates.LastUpdated = now;
    preflightPatchSchema_(ss, products, productUpdates, snowUpdates, recommendationUpdates);
    writePatch_(products, productMatch.rowNumber, productUpdates);

    if (Object.keys(snowUpdates).length) {
      writeSnowPatch_(ss, productId, snowUpdates, now, products);
    }
    if (recommendationUpdates !== null) {
      reconcileRecommendations_(ss, productId, recommendationUpdates, now);
    }

    SpreadsheetApp.flush();
    const updatedProduct = rowObject_(
      products.headers,
      products.sheet.getRange(productMatch.rowNumber, 1, 1, products.headers.length).getValues()[0]
    );
    return {
      success: true,
      product: buildSingleProduct_(ss, updatedProduct),
      lastUpdated: now.toISOString()
    };
  } finally {
    lock.releaseLock();
  }
}

function parseAdminRequest_(e) {
  const raw = e && e.postData && e.postData.contents;
  if (!raw) throw apiError_("Request body is required.", "INVALID_REQUEST");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw apiError_("Request body must be valid JSON.", "INVALID_JSON");
  }
}

function authorizeAdminRequest_(request) {
  const token = String(request.authToken || "").trim();
  if (!token) throw apiError_("Authentication is required.", "UNAUTHORIZED");

  const props = PropertiesService.getScriptProperties();
  const clientId = String(props.getProperty(
    ADMIN_WRITE.SCRIPT_PROPERTIES.OAUTH_CLIENT_ID
  ) || "").trim();
  if (!clientId) throw apiError_("Admin authentication is not configured.", "AUTH_NOT_CONFIGURED");

  const response = UrlFetchApp.fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token),
    { muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) {
    throw apiError_("Authentication token is invalid or expired.", "UNAUTHORIZED");
  }
  const identity = JSON.parse(response.getContentText());
  if (String(identity.aud || "") !== clientId ||
      !(identity.email_verified === true || String(identity.email_verified) === "true")) {
    throw apiError_("Authentication token was not issued for Playbook Admin.", "UNAUTHORIZED");
  }

  const email = String(identity.email || "").trim().toLowerCase();
  const allowedEmails = csvSet_(props.getProperty(
    ADMIN_WRITE.SCRIPT_PROPERTIES.ALLOWED_EMAILS
  ));
  const allowedDomains = csvSet_(props.getProperty(
    ADMIN_WRITE.SCRIPT_PROPERTIES.ALLOWED_DOMAINS
  ));
  const domain = email.includes("@") ? email.split("@").pop() : "";
  if (!email || (!allowedEmails.has(email) && !allowedDomains.has(domain))) {
    throw apiError_("This account is not authorized to edit products.", "FORBIDDEN");
  }
}

function validateChanges_(changes, currentProduct, refs) {
  const result = {};
  Object.keys(changes).forEach((key) => {
    const definition = ADMIN_WRITE.PRODUCT_FIELDS[key];
    const raw = changes[key];
    switch (definition.type) {
      case "brand": result[key] = referenceId_(raw, refs.brands, "brand"); break;
      case "sport": result[key] = referenceId_(raw, refs.sports, "sport"); break;
      case "category": result[key] = referenceId_(raw, refs.categories, "category"); break;
      case "money": result[key] = numericValue_(raw, key, 0, 1000000); break;
      case "gender": result[key] = optionalEnumValue_(raw, refs.genders, key); break;
      case "ability": result[key] = abilityValue_(raw); break;
      case "terrain": result[key] = multiEnumValue_(raw, ADMIN_WRITE.TERRAIN_OPTIONS, key); break;
      case "rating": result[key] = numericValue_(raw, key, 1, 5); break;
      case "url": result[key] = urlValue_(raw, key); break;
      case "status": result[key] = enumValue_(raw, Object.keys(ADMIN_WRITE.STATUS), key); break;
      case "shape": result[key] = shapeOrWidthValue_(raw, refs.shapes, currentProduct); break;
      case "flex": result[key] = optionalEnumValue_(raw, refs.flex, key); break;
      case "profile": result[key] = categoryEnumValue_(raw, profileOptions_(changes, currentProduct, refs), key); break;
      case "snowboardWidth": result[key] = optionalEnumValue_(raw, refs.snowboardWidths, key); break;
      case "closureSystem": result[key] = optionalEnumValue_(raw, refs.closureSystems, key); break;
      case "entryStyle": result[key] = optionalEnumValue_(raw, refs.entryStyles, key); break;
      case "response": result[key] = optionalEnumValue_(raw, refs.responses, key); break;
      case "turnRadius": result[key] = numericValue_(raw, key, 5, 50); break;
      case "bootFlexIndex": result[key] = numericValue_(raw, key, 40, 180); break;
      case "lastWidth": result[key] = numericValue_(raw, key, 85, 110); break;
      case "brakeWidth": result[key] = numericValue_(raw, key, 50, 160); break;
      case "dinRange": result[key] = dinRangeValue_(raw); break;
      case "recommendations": result[key] = validateRecommendationPayload_(raw, currentProduct.ProductID, refs); break;
      case "requiredText": result[key] = requiredTextValue_(raw, key, definition.max || 500); break;
      default: result[key] = textValue_(raw, key, definition.max || 500);
    }
  });
  synchronizeAbilityFields_(result);

  const sportId = result.Sport || result.SportID || currentProduct.SportID;
  const categoryId = result.Category || result.CategoryID || currentProduct.CategoryID;
  const category = refs.categories.byId[normalizeId_(categoryId)];
  if (category && normalizeId_(category.row.SportID) !== normalizeId_(sportId)) {
    throw apiError_("Category does not belong to the selected sport.", "VALIDATION_ERROR");
  }
  return result;
}

function writeSnowPatch_(ss, productId, updates, now, productsTable) {
  const snowSheet = ss.getSheetByName(PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES);
  if (!snowSheet) {
    const fallback = {};
    Object.keys(updates).forEach((column) => {
      const destination = destinationColumn_(column, productsTable);
      if (!destination) {
        throw apiError_(
          `Cannot save ${column}: add SnowsportsAttributes or retain that Products column.`,
          "SCHEMA_ERROR"
        );
      }
      fallback[destination] = updates[column];
    });
    fallback.LastUpdated = now;
    const match = findUniqueRow_(productsTable, "ProductID", productId);
    writePatch_(productsTable, match.rowNumber, fallback);
    return;
  }

  const snow = tableFromSheet_(snowSheet, "ProductID");
  const resolvedUpdates = {};
  Object.keys(updates).forEach((column) => {
    const destination = destinationColumn_(column, snow);
    if (!destination) requireTableColumn_(snow, column);
    resolvedUpdates[destination] = updates[column];
  });
  let matches = findRows_(snow, "ProductID", productId);
  if (matches.length > 1) throw apiError_("Duplicate ProductID in SnowsportsAttributes.", "DATA_INTEGRITY_ERROR");
  let rowNumber;
  if (!matches.length) {
    rowNumber = nextLogicalRow_(snow, "ProductID");
    const row = snow.headers.map((header) => header === "ProductID" ? productId : "");
    snowSheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  } else {
    rowNumber = matches[0].rowNumber;
  }
  if (snow.map.LastUpdated !== undefined) resolvedUpdates.LastUpdated = now;
  writePatch_(snow, rowNumber, resolvedUpdates);
}

function preflightPatchSchema_(ss, products, productUpdates, snowUpdates, recommendationUpdates) {
  Object.keys(productUpdates).forEach((column) => {
    if (column === "Status" && products.map.Status === undefined) return;
    if (column === "RowStatus" && products.map.RowStatus === undefined) return;
    requireTableColumn_(products, column);
  });
  if (Object.keys(snowUpdates).length) {
    const snowSheet = ss.getSheetByName(PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES);
    if (snowSheet) {
      const snow = tableFromSheet_(snowSheet, "ProductID");
      Object.keys(snowUpdates).forEach((column) => {
        if (!destinationColumn_(column, snow)) requireTableColumn_(snow, column);
      });
    } else {
      Object.keys(snowUpdates).forEach((column) => {
        if (!destinationColumn_(column, products)) requireTableColumn_(products, column);
      });
    }
  }
  if (recommendationUpdates !== null) {
    validateRecommendationTableIntegrity_(
      requireRecommendationTable_(ss), recommendationUpdates
    );
  }
}

function validateRecommendationTableIntegrity_(table) {
  if (table.sheet.getLastRow() < 2) return;
  const seen = new Set();
  const rows = table.sheet.getRange(
    2, 1, table.sheet.getLastRow() - 1, table.headers.length
  ).getValues();
  rows.forEach((row) => {
    const source = normalizeId_(row[table.map.SourceProductID]);
    const type = String(row[table.map.RecommendationType] || "").trim();
    const tier = String(row[table.map.RecommendationTier] || "").trim();
    if (!source || !ADMIN_WRITE.RECOMMENDATION_TYPES.includes(type) ||
        !ADMIN_WRITE.RECOMMENDATION_TIERS.includes(tier)) return;
    const key = `${source}|${type}|${tier}`;
    if (seen.has(key)) {
      throw apiError_(`Duplicate recommendation tier: ${key}`, "DATA_INTEGRITY_ERROR");
    }
    seen.add(key);
  });
}

function applyStatusUpdate_(updates, status) {
  const mapping = ADMIN_WRITE.STATUS[status];
  updates.Active = mapping.Active;
  updates.RowStatus = mapping.RowStatus;
  updates.Status = status;
}

function buildSingleProduct_(ss, productRow) {
  const snowRows = getOptionalRows_(ss, PLAYBOOK.SHEETS.SNOWSPORTS_ATTRIBUTES);
  const current = normalizeProduct_(mergeSnowProduct_(productRow, snowRows));
  const products = getRows_(ss, PLAYBOOK.SHEETS.PRODUCTS)
    .filter((row) => isPublishedProduct_(row))
    .map((row) => normalizeProduct_(mergeSnowProduct_(row, snowRows)))
    .filter((row) => normalizeId_(row.ProductID) !== normalizeId_(current.ProductID));
  products.unshift(current);
  const brands = getRows_(ss, PLAYBOOK.SHEETS.BRANDS).filter(isActive_);
  const recommendationSheet = ss.getSheetByName(PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS);
  attachRecommendations_(
    products,
    getOptionalRows_(ss, PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS),
    brands,
    Boolean(recommendationSheet)
  );
  attachVariants_(products, getOptionalRows_(ss, PLAYBOOK.SHEETS.PRODUCT_VARIANTS));
  return products[0];
}

function mergeSnowProduct_(product, snowRows) {
  const id = normalizeId_(product.ProductID);
  const matches = snowRows.filter((row) => normalizeId_(row.ProductID) === id);
  if (!matches.length) return product;
  const merged = { ...product, ...matches[0], ProductID: product.ProductID };
  merged.LastUpdated = product.LastUpdated;
  return merged;
}

function statusFromRow_(row) {
  const explicit = String(row.Status || row.RowStatus || "").trim();
  if (Object.prototype.hasOwnProperty.call(ADMIN_WRITE.STATUS, explicit)) return explicit;
  return isTrue_(row.Active) ? "Published" : "Needs Review";
}

function addReferenceData_(ss, settings) {
  const refs = buildWriteReferences_(ss);
  return {
    ...settings,
    DataDictionary: {
      ...(settings.DataDictionary || {}),
      Flex: refs.flex,
      Gender: refs.genders,
      Terrain: ADMIN_WRITE.TERRAIN_OPTIONS,
      ShapeOrWidth: refs.shapes,
      SnowboardProfile: refs.snowboardProfiles,
      SkiProfile: refs.skiProfiles,
      SnowboardWidth: refs.snowboardWidths,
      ClosureSystem: refs.closureSystems,
      EntryStyle: refs.entryStyles,
      Response: refs.responses,
      Status: Object.keys(ADMIN_WRITE.STATUS)
    }
  };
}

function buildWriteReferences_(ss) {
  const dictionary = getOptionalRows_(ss, PLAYBOOK.SHEETS.DATA_DICTIONARY);
  return {
    sports: referenceMap_(getRows_(ss, PLAYBOOK.SHEETS.SPORTS), "SportID", "Name"),
    categories: referenceMap_(getRows_(ss, PLAYBOOK.SHEETS.CATEGORIES), "CategoryID", "Name"),
    brands: referenceMap_(getRows_(ss, PLAYBOOK.SHEETS.BRANDS), "BrandID", "Name"),
    products: productReferenceMap_(getRows_(ss, PLAYBOOK.SHEETS.PRODUCTS)),
    genders: dictionaryOptions_(dictionary, "Gender", ADMIN_WRITE.DEFAULT_GENDERS),
    flex: dictionaryOptions_(dictionary, "Flex", ADMIN_WRITE.DEFAULT_FLEX),
    shapes: dictionaryOptions_(dictionary, "ShapeOrWidth", ADMIN_WRITE.DEFAULT_SHAPES),
    snowboardProfiles: dictionaryOptions_(dictionary, "SnowboardProfile", ADMIN_WRITE.DICTIONARY_DEFAULTS.SnowboardProfile),
    skiProfiles: dictionaryOptions_(dictionary, "SkiProfile", ADMIN_WRITE.DICTIONARY_DEFAULTS.SkiProfile),
    snowboardWidths: dictionaryOptions_(dictionary, "SnowboardWidth", ADMIN_WRITE.DICTIONARY_DEFAULTS.SnowboardWidth),
    closureSystems: dictionaryOptions_(dictionary, "ClosureSystem", ADMIN_WRITE.DICTIONARY_DEFAULTS.ClosureSystem),
    entryStyles: dictionaryOptions_(dictionary, "EntryStyle", ADMIN_WRITE.DICTIONARY_DEFAULTS.EntryStyle),
    responses: dictionaryOptions_(dictionary, "Response", ADMIN_WRITE.DICTIONARY_DEFAULTS.Response)
  };
}

function profileOptions_(changes, currentProduct, refs) {
  const sportId = changes.Sport || changes.SportID || currentProduct.SportID;
  const categoryId = changes.Category || changes.CategoryID || currentProduct.CategoryID;
  const text = normalizeId_(`${sportId} ${categoryId}`);
  return text.includes("SNB") || text.includes("SNOWBOARD")
    ? refs.snowboardProfiles
    : refs.skiProfiles;
}

function categoryEnumValue_(value, allowed, field) {
  return optionalEnumValue_(value, allowed, field);
}

function dinRangeValue_(value) {
  if (value === "" || value === null) return "";
  const raw = String(value).trim().replace(/[–—]/g, "-");
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (!match || Number(match[1]) >= Number(match[2])) {
    throw apiError_("DINRange must use a lower-to-upper range such as 4-12.", "VALIDATION_ERROR");
  }
  return `${Number(match[1])}-${Number(match[2])}`;
}

function productReferenceMap_(rows) {
  const result = {};
  rows.forEach((row) => {
    const id = normalizeId_(row.ProductID);
    if (!id) return;
    if (result[id]) {
      throw apiError_(`ProductID is not unique: ${id}`, "DATA_INTEGRITY_ERROR");
    }
    result[id] = row;
  });
  return result;
}

function validateRecommendationPayload_(value, sourceProductId, refs) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw apiError_("Recommendations must be an object.", "VALIDATION_ERROR");
  }
  const invalidTypes = Object.keys(value).filter((type) =>
    !ADMIN_WRITE.RECOMMENDATION_TYPES.includes(type)
  );
  if (invalidTypes.length) {
    throw apiError_(`Invalid recommendation type: ${invalidTypes.join(", ")}`, "VALIDATION_ERROR");
  }

  const normalized = {};
  ADMIN_WRITE.RECOMMENDATION_TYPES.forEach((type) => {
    const tiers = value[type] || {};
    if (typeof tiers !== "object" || Array.isArray(tiers)) {
      throw apiError_(`${type} recommendations must be an object.`, "VALIDATION_ERROR");
    }
    const invalidTiers = Object.keys(tiers).filter((tier) =>
      !ADMIN_WRITE.RECOMMENDATION_TIERS.includes(tier)
    );
    if (invalidTiers.length) {
      throw apiError_(`Invalid ${type} tier: ${invalidTiers.join(", ")}`, "VALIDATION_ERROR");
    }
    normalized[type] = {};
    ADMIN_WRITE.RECOMMENDATION_TIERS.forEach((tier) => {
      const targetId = normalizeId_(tiers[tier]);
      if (!targetId) return;
      if (targetId === normalizeId_(sourceProductId)) {
        throw apiError_("A product cannot recommend itself.", "VALIDATION_ERROR");
      }
      const target = refs.products[targetId];
      if (!target) {
        throw apiError_(`Unknown recommendation ProductID: ${targetId}`, "VALIDATION_ERROR");
      }
      if (!isPublishedProduct_(target)) {
        throw apiError_(`Recommendation target ${targetId} is not published and active.`, "VALIDATION_ERROR");
      }
      if (!matchesRecommendationType_(target, type, refs.categories, refs.sports)) {
        throw apiError_(`${targetId} is not an eligible snowboarding ${type.toLowerCase()}.`, "VALIDATION_ERROR");
      }
      normalized[type][tier] = targetId;
    });
  });
  return normalized;
}

function isPublishedProduct_(product) {
  return isTrue_(product.Active) && statusFromRow_(product) === "Published";
}

function matchesRecommendationType_(product, type, categories, sports) {
  const sport = sports.byId[normalizeId_(product.SportID)];
  const sportText = normalizeId_(`${product.SportID} ${(sport && sport.row.Name) || ""}`);
  if (!sportText.includes("SNB") && !sportText.includes("SNOWBOARD")) return false;
  const category = categories.byId[normalizeId_(product.CategoryID)];
  const categoryText = normalizeId_(`${product.CategoryID} ${(category && category.row.Name) || ""}`);
  return type === "Binding" ? categoryText.includes("BIND") : categoryText.includes("BOOT");
}

function requireRecommendationTable_(ss) {
  const table = requireTable_(
    ss, PLAYBOOK.SHEETS.PRODUCT_RECOMMENDATIONS, "SourceProductID"
  );
  ["RecommendationType", "RecommendationTier", "TargetProductID", "Active", "LastUpdated"]
    .forEach((column) => requireTableColumn_(table, column));
  return table;
}

function reconcileRecommendations_(ss, sourceProductId, desired, now) {
  const table = requireRecommendationTable_(ss);
  const sourceId = normalizeId_(sourceProductId);
  const rows = table.sheet.getLastRow() < 2 ? [] : table.sheet
    .getRange(2, 1, table.sheet.getLastRow() - 1, table.headers.length)
    .getValues()
    .map((values, index) => ({ values, rowNumber: index + 2 }))
    .filter((entry) => normalizeId_(entry.values[table.map.SourceProductID]) === sourceId);
  const existingBySlot = {};
  rows.forEach((entry) => {
    const type = String(entry.values[table.map.RecommendationType] || "").trim();
    const tier = String(entry.values[table.map.RecommendationTier] || "").trim();
    if (!ADMIN_WRITE.RECOMMENDATION_TYPES.includes(type) ||
        !ADMIN_WRITE.RECOMMENDATION_TIERS.includes(tier)) return;
    const slot = `${type}|${tier}`;
    if (existingBySlot[slot]) {
      throw apiError_(`Duplicate recommendation tier for ${type} ${tier}.`, "DATA_INTEGRITY_ERROR");
    }
    existingBySlot[slot] = entry;
  });

  ADMIN_WRITE.RECOMMENDATION_TYPES.forEach((type) => {
    ADMIN_WRITE.RECOMMENDATION_TIERS.forEach((tier) => {
      const slot = `${type}|${tier}`;
      const targetId = normalizeId_(desired[type] && desired[type][tier]);
      const existing = existingBySlot[slot];
      if (existing) {
        const oldTarget = normalizeId_(existing.values[table.map.TargetProductID]);
        const wasActive = isTrue_(existing.values[table.map.Active]);
        if (targetId && oldTarget === targetId && wasActive) return;
        writePatch_(table, existing.rowNumber, {
          TargetProductID: targetId || existing.values[table.map.TargetProductID],
          Active: Boolean(targetId),
          LastUpdated: now
        });
      } else if (targetId) {
        const row = table.headers.map((header) => {
          if (header === "SourceProductID") return sourceId;
          if (header === "RecommendationType") return type;
          if (header === "RecommendationTier") return tier;
          if (header === "TargetProductID") return targetId;
          if (header === "Active") return true;
          if (header === "LastUpdated") return now;
          return "";
        });
        table.sheet.getRange(nextLogicalRow_(table, "SourceProductID"), 1, 1, row.length).setValues([row]);
      }
    });
  });
}

function dictionaryOptions_(rows, field, fallback) {
  const values = [];
  rows.forEach((row) => {
    const rowField = String(row.Field || row.Attribute || row.Name || "").trim();
    if (rowField !== field) return;
    const raw = row.AllowedValues || row.Options || row.Value || "";
    String(raw).split(/\s*\|\s*|\s*,\s*/).filter(Boolean).forEach((value) => values.push(value));
  });
  return [...new Set(values.length ? values : fallback)];
}

function referenceMap_(rows, idField, nameField) {
  const result = { byId: {}, byName: {} };
  rows.filter(isActive_).forEach((row) => {
    const id = normalizeId_(row[idField]);
    const name = String(row[nameField] || "").trim().toLowerCase();
    if (id) result.byId[id] = { id: String(row[idField]), row };
    if (name) result.byName[name] = { id: String(row[idField]), row };
  });
  return result;
}

function referenceId_(value, map, label) {
  const raw = String(value || "").trim();
  const match = map.byId[normalizeId_(raw)] || map.byName[raw.toLowerCase()];
  if (!match) throw apiError_(`Unknown ${label}: ${raw}`, "VALIDATION_ERROR");
  return match.id;
}

function enumValue_(value, allowed, field) {
  const raw = String(value || "").trim();
  const match = allowed.find((item) => String(item).toLowerCase() === raw.toLowerCase());
  if (!match) throw apiError_(`${field} must be one of: ${allowed.join(", ")}.`, "VALIDATION_ERROR");
  return match;
}

function optionalEnumValue_(value, allowed, field) {
  if (value === "" || value === null) return "";
  return enumValue_(value, allowed, field);
}

function synchronizeAbilityFields_(values) {
  const hasLevel = Object.prototype.hasOwnProperty.call(values, "AbilityLevel");
  const hasAbility = Object.prototype.hasOwnProperty.call(values, "Ability");
  if (hasLevel) {
    if (values.AbilityLevel === "" || values.AbilityLevel === null) {
      values.Ability = "";
      return values;
    }
    const derived = ADMIN_WRITE.ABILITY_BY_LEVEL[Number(values.AbilityLevel)];
    if (!derived) throw apiError_("AbilityLevel must be a whole number from 1 to 5.", "VALIDATION_ERROR");
    if (hasAbility && values.Ability && values.Ability !== derived) {
      throw apiError_(`Ability must be ${derived} when AbilityLevel is ${values.AbilityLevel}.`, "VALIDATION_ERROR");
    }
    values.Ability = derived;
    return values;
  }
  if (hasAbility && values.Ability) {
    const match = Object.keys(ADMIN_WRITE.ABILITY_BY_LEVEL)
      .find((level) => ADMIN_WRITE.ABILITY_BY_LEVEL[level] === values.Ability);
    if (!match) throw apiError_("Ability is not a supported controlled value.", "VALIDATION_ERROR");
    values.AbilityLevel = Number(match);
  }
  return values;
}

function abilityValue_(value) {
  if (value === "" || value === null) return "";
  const normalized = multiEnumValue_(value, ["Beginner", "Intermediate", "Advanced", "Expert"], "Ability");
  if (!Object.values(ADMIN_WRITE.ABILITY_BY_LEVEL).includes(normalized)) {
    throw apiError_(`Ability must be one of: ${Object.values(ADMIN_WRITE.ABILITY_BY_LEVEL).join(", ")}.`, "VALIDATION_ERROR");
  }
  return normalized;
}

/** Run once after deploying v2.0.9 to align legacy Ability labels to levels. */
function synchronizeProductAbilityLabels() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const products = requireTable_(ss, PLAYBOOK.SHEETS.PRODUCTS, "ProductID");
  const levelColumn = destinationColumn_("AbilityLevel", products);
  requireTableColumn_(products, "Ability");
  if (!levelColumn) throw apiError_("Missing Ability Level column.", "SCHEMA_ERROR");
  const lastRow = products.sheet.getLastRow();
  if (lastRow < 2) return { updated: 0 };
  const values = products.sheet.getRange(2, 1, lastRow - 1, products.headers.length).getValues();
  const now = new Date();
  let updated = 0;
  values.forEach((row, index) => {
    if (!normalizeId_(row[products.map.ProductID])) return;
    const level = Number(row[products.map[levelColumn]]);
    const ability = ADMIN_WRITE.ABILITY_BY_LEVEL[level];
    if (!ability || row[products.map.Ability] === ability) return;
    products.sheet.getRange(index + 2, products.map.Ability + 1).setValue(ability);
    if (products.map.LastUpdated !== undefined) {
      products.sheet.getRange(index + 2, products.map.LastUpdated + 1).setValue(now);
    }
    updated += 1;
  });
  SpreadsheetApp.flush();
  return { updated };
}

function shapeOrWidthValue_(value, shapes, product) {
  if (value === "" || value === null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return enumValue_(raw, shapes, "ShapeOrWidth");
}

function numericValue_(value, field, min, max) {
  if (value === "" || value === null) return "";
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw apiError_(`${field} must be a number from ${min} to ${max}.`, "VALIDATION_ERROR");
  }
  return number;
}

function urlValue_(value, field) {
  if (value === "" || value === null) return "";
  const raw = String(value).trim();
  if (!/^https:\/\/[^\s]+$/i.test(raw)) {
    throw apiError_(`${field} must be a valid HTTPS URL.`, "VALIDATION_ERROR");
  }
  return raw;
}

function textValue_(value, field, max) {
  if (value === null || value === undefined) return "";
  const raw = String(value).trim();
  if (raw.length > max) throw apiError_(`${field} exceeds ${max} characters.`, "VALIDATION_ERROR");
  return raw;
}

function requiredTextValue_(value, field, max) {
  const raw = textValue_(value, field, max);
  if (!raw) throw apiError_(`${field} cannot be blank.`, "VALIDATION_ERROR");
  return raw;
}

function requireTable_(ss, sheetName, keyColumn) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw apiError_(`Missing required sheet: ${sheetName}`, "SCHEMA_ERROR");
  return tableFromSheet_(sheet, keyColumn);
}

function tableFromSheet_(sheet, keyColumn) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map((header) => String(header || "").trim());
  const table = { sheet, headers, map: buildHeaderMap_(headers) };
  requireTableColumn_(table, keyColumn);
  return table;
}

function requireTableColumn_(table, column) {
  if (table.map[column] === undefined) {
    throw apiError_(`Missing required column: ${column}`, "SCHEMA_ERROR");
  }
}

function findRows_(table, column, value) {
  requireTableColumn_(table, column);
  if (table.sheet.getLastRow() < 2) return [];
  const values = table.sheet.getRange(2, 1, table.sheet.getLastRow() - 1, table.headers.length).getValues();
  return values.map((row, index) => ({ rowNumber: index + 2, values: row }))
    .filter((entry) => normalizeId_(entry.values[table.map[column]]) === normalizeId_(value));
}

function findUniqueRow_(table, column, value) {
  const matches = findRows_(table, column, value);
  if (!matches.length) throw apiError_(`Unknown ProductID: ${value}`, "NOT_FOUND");
  if (matches.length > 1) throw apiError_(`ProductID is not unique: ${value}`, "DATA_INTEGRITY_ERROR");
  return matches[0];
}

/**
 * Finds the row after the last real keyed record. Google Sheets may report a
 * much later physical last row when template formulas or placeholder values
 * extend through row 1000; those must not determine where records are added.
 */
function nextLogicalRow_(table, keyColumn) {
  requireTableColumn_(table, keyColumn);
  const lastRow = table.sheet.getLastRow();
  if (lastRow < 2) return 2;
  const values = table.sheet
    .getRange(2, table.map[keyColumn] + 1, lastRow - 1, 1)
    .getValues();
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (normalizeId_(values[index][0])) return index + 3;
  }
  return 2;
}

function writePatch_(table, rowNumber, updates) {
  Object.keys(updates).forEach((column) => {
    if (table.map[column] === undefined) {
      if (column === "Status") return;
      if (column === "RowStatus" && table.map.Active !== undefined) return;
      if (column === "LastUpdated") requireTableColumn_(table, column);
      else requireTableColumn_(table, column);
    }
    if (table.map[column] !== undefined) {
      table.sheet.getRange(rowNumber, table.map[column] + 1).setValue(updates[column]);
    }
  });
}

function rowObject_(headers, row) {
  const result = {};
  headers.forEach((header, index) => { if (header) result[header] = row[index]; });
  return result;
}

function getOptionalRows_(ss, sheetName) {
  return ss.getSheetByName(sheetName) ? getRows_(ss, sheetName) : [];
}

function timestampsEqual_(expected, current) {
  const a = new Date(expected);
  const b = new Date(current);
  return !Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime()) && a.getTime() === b.getTime();
}

function toIsoTimestamp_(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function csvSet_(value) {
  return new Set(String(value || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function jsonOutput_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function apiError_(message, code, details) {
  const error = new Error(message);
  error.code = code;
  error.details = details || null;
  return error;
}

function assignMissingIdsOnSheet_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;

  const headers = buildHeaderMap_(values[0]);
  const productIdIndex = requireHeader_(headers, "ProductID");
  const sportIdIndex = requireHeader_(headers, "SportID");
  const modelIndex = requireHeader_(headers, "Model");
  const usedIds = collectAllProductIds_();
  const maxByPrefix = buildMaxSequenceMap_(usedIds);
  const updates = [];

  values.slice(1).forEach((row, index) => {
    const existingId = String(row[productIdIndex] || "").trim();
    const sportId = normalizeId_(row[sportIdIndex]);
    const model = String(row[modelIndex] || "").trim();

    if (existingId || !sportId || !model) return;

    const nextNumber = (maxByPrefix[sportId] || 0) + 1;
    maxByPrefix[sportId] = nextNumber;

    updates.push({
      row: index + 2,
      value:
        sportId +
        String(nextNumber).padStart(PLAYBOOK.ID_DIGITS, "0")
    });
  });

  updates.forEach((update) => {
    sheet.getRange(update.row, productIdIndex + 1).setValue(update.value);
  });

  SpreadsheetApp.flush();
  return updates.length;
}

function collectAllProductIds_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const ids = new Set();

  [PLAYBOOK.SHEETS.PRODUCTS, PLAYBOOK.SHEETS.BATCH_UPLOAD]
    .forEach((sheetName) => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) return;

      const values = sheet.getDataRange().getValues();
      const headers = buildHeaderMap_(values[0]);
      const idIndex = headers.ProductID;
      if (idIndex === undefined) return;

      values.slice(1).forEach((row) => {
        const id = normalizeId_(row[idIndex]);
        if (id) ids.add(id);
      });
    });

  return ids;
}

function buildMaxSequenceMap_(ids) {
  const result = {};

  ids.forEach((id) => {
    const match = String(id).match(/^([A-Z]+)(\d+)$/);
    if (!match) return;

    result[match[1]] = Math.max(
      result[match[1]] || 0,
      Number(match[2])
    );
  });

  return result;
}

function getRows_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Missing required sheet: ${sheetName}`);

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map((header) =>
    String(header || "").trim()
  );

  return values
    .slice(1)
    .filter((row) => row.some((value) => value !== ""))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        if (!header) return;
        item[header] = header === "LastUpdated"
          ? toIsoTimestamp_(row[index])
          : formatValue_(row[index]);
      });
      return item;
    });
}

function buildSettingsObject_(rows) {
  return rows.reduce((result, row) => {
    const key = String(row.Key || "").trim();
    if (key) result[key] = row.Value;
    return result;
  }, {});
}

function sortByDisplayOrder_(a, b) {
  return toNumber_(a.DisplayOrder) - toNumber_(b.DisplayOrder);
}

function sortProducts_(a, b) {
  const order = toNumber_(a.DisplayOrder) - toNumber_(b.DisplayOrder);
  return order !== 0
    ? order
    : String(a.Model || "").localeCompare(String(b.Model || ""));
}

function isActive_(item) {
  return isTrue_(item.Active);
}

function isTrue_(value) {
  return value === true ||
    String(value).trim().toLowerCase() === "true" ||
    String(value).trim().toLowerCase() === "yes" ||
    String(value).trim() === "1";
}

function optionalNumber_(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function normalizeId_(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function toNumber_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseDate_(value) {
  if (!value) return null;
  if (value instanceof Date) return startOfDay_(new Date(value));

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? null
    : startOfDay_(parsed);
}

function startOfDay_(date) {
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate_(value) {
  const date = parseDate_(value);
  if (!date) return "";

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}

function formatValue_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }
  return value;
}

function buildHeaderMap_(headerRow) {
  return headerRow.reduce((map, header, index) => {
    const key = String(header || "").trim();
    if (key) map[key] = index;
    return map;
  }, {});
}

function requireHeader_(headerMap, headerName) {
  const index = headerMap[headerName];
  if (index === undefined) {
    throw new Error(`Missing required column: ${headerName}`);
  }
  return index;
}
