# Winter Sports CMS v2.2

This upgrade extends the existing header-driven Playbook CMS. It does not
replace the current Products, SnowsportsAttributes, recommendation, image, or Admin
write architecture.

## Canonical fields

`ShapeOrWidth` remains the stored field for snowboard shape and numeric ski
waist width. `Profile` is the single stored profile field. Snowboards use the
SnowboardProfile vocabulary and skis use the SkiProfile vocabulary. The API
can still read legacy `CamberProfile` or `RockerProfile` values.

Category-specific fields stored in `SnowsportsAttributes`:

- Snowboards: `ShapeOrWidth`, `SnowboardWidth`, `Profile`, `Flex`
- Skis: `ShapeOrWidth`, `TurnRadius`, `Profile`, `Flex`
- Snowboard boots: `BootFlex`, `ClosureSystem`
- Ski boots: `BootFlexIndex`, `LastWidth`, `ClosureSystem`
- Snowboard bindings: `BindingFlex`, `EntryStyle`, `Response`
- Ski bindings: `DINRange`, `BrakeWidth`

After migration, `Products` remains the source of truth for shared identity,
publishing, pricing, and the backward-compatible primary `ImageURL`. `SnowsportsAttributes` is the source of
truth for the category-specific fields above. Legacy copies of snow fields in
`Products` are retained temporarily for backward compatibility and should not
be edited directly.

`SnowboardWidth` allows Regular, Wide, and Volume Shifted. `ClosureSystem`
replaces a lossy BOA yes/no field and retains the actual configuration.

## Product variants

Sizes and lengths are normalized in `ProductVariants` with one row per
variant. Its columns are `ProductVariantID`, `ProductID`, `VariantType`,
`VariantValue`, `DisplayOrder`, `Active`, and `LastUpdated`.

The API exposes active variants as `product.Variants`. Import packages may
include a `ProductVariants` worksheet; each ProductID must already exist or be
included explicitly in the same package.

For ski bindings with multiple carried brake widths, use `VariantType` =
`Brake Width` and store the numeric width only in `VariantValue`, such as
`95`, `105`, or `115`. `BrakeWidth` on `SnowsportsAttributes` remains the
default/main displayed spec.

## Product images

Multiple product images are normalized in `ProductImages` with one row per
image. Its columns are `ProductImageID`, `ProductID`, `ImageURL`, `AltText`,
`ImageRole`, `DisplayOrder`, `Active`, and `LastUpdated`.

`Products.ImageURL` remains the primary image for backward compatibility. The
API exposes active normalized rows as `product.Images`; the first active image
is treated as primary in the employee app and Admin preview.

## Deployment

1. Back up the live Playbook CMS spreadsheet and Apps Script project.
2. Replace the Apps Script source with `Code.gs` and keep `appsscript.json`.
3. Run **Playbook CMS → Set Up Winter Sports v2.1** once.
4. Review the added DataDictionary rows and columns.
5. Deploy a new version of the existing Apps Script web app.
6. Test `referenceDictionary`, authenticated `adminCatalog`, product saving,
   and a small import package before importing production data.

The setup function only appends missing headers and reference rows. It does
not delete, rename, or reposition existing data.
