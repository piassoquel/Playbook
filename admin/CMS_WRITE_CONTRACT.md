# Playbook Admin product-update contract

The connected implementation is in `cms/Code.gs`. Admin sends authenticated
`text/plain` JSON requests to the existing Apps Script deployment.

The `updateProduct` request uses patch semantics:

```json
{
  "action": "updateProduct",
  "productId": "SNB0004",
  "changes": {
    "Profile": "CamRock",
    "SnowboardWidth": "Wide"
  },
  "expectedLastUpdated": "2026-09-10T18:30:00Z",
  "authToken": "Google ID token"
}
```

Only fields present in `changes` are written. The backend verifies the Google
identity, checks its allowlist, validates controlled values, locks writes, and
uses `expectedLastUpdated` to prevent stale overwrites.

Winter Sports v2.1 accepts `Profile`, `SnowboardWidth`, `TurnRadius`,
`BootFlex`, `ClosureSystem`, `BootFlexIndex`, `LastWidth`, `BindingFlex`,
`EntryStyle`, `Response`, `DINRange`, and `BrakeWidth`, in addition to the
existing product, performance, sales-dashboard, status, and recommendation
fields.

The CMS DataDictionary is authoritative for controlled values. Code defaults
exist only so older workbooks can be migrated without breaking Admin.

Product recommendations remain ProductID relationships in the normalized
`ProductRecommendations` sheet. Product sizes and lengths use the normalized
`ProductVariants` sheet and are returned as `product.Variants`.
