# Playbook Admin product-update contract

The current Playbook CMS integration is read-only. The repository contains a
GET client only, and the live CMS response does not advertise a write action,
write URL, authentication mechanism, DataDictionary, product variants, or
ProductRecommendations.

## Endpoint required

Provide an authenticated HTTPS endpoint that accepts `POST` requests from the
Admin origin. The URL can then be assigned to `PRODUCT_WRITE_URL` in
`admin/services/product-admin-api.js`.

Request body:

```json
{
  "action": "updateProduct",
  "productId": "SNB0004",
  "changes": {
    "ShapeOrWidth": "True Twin",
    "Flex": "Medium"
  },
  "expectedLastUpdated": "2026-07-14"
}
```

- `productId` is required and must identify exactly one Products record.
- `changes` uses patch semantics. Omitted fields must remain untouched.
- `expectedLastUpdated` supports optimistic concurrency and should reject a
  stale edit instead of overwriting a newer change.
- The backend must allowlist and validate editable fields rather than accepting
  arbitrary spreadsheet column names.
- Shape, Flex, terrain, status, sport, category, brand, and relationship values
  must be validated against CMS reference data.
- Authentication and authorization must be checked on the server. No write
  secret may be embedded in the static Admin JavaScript.
- CORS must allow the deployed Admin origin and local development origin.

Successful response:

```json
{
  "success": true,
  "product": {},
  "lastUpdated": "2026-09-01T18:30:00Z"
}
```

Error responses should use an appropriate HTTP status and return:

```json
{
  "success": false,
  "error": "Human-readable explanation",
  "code": "VALIDATION_ERROR"
}
```

## Reference data required

Add a reference-data block to the existing GET response, preferably:

```json
{
  "settings": {
    "DataDictionary": {
      "Flex": ["Soft", "Medium", "Medium-Stiff", "Stiff"]
    }
  }
}
```

The current Flex fallback in `admin/config/product-fields.js` is based on values
observed in the live product payload and can be replaced by this reference data.

## Recommendation support required

Add CMS-backed ProductRecommendations records with a source `ProductID`, a
relationship type (`Binding` or `Boot`), a tier (`Recommended`, `Upgrade`, or
`Budget`), and a target `ProductID`. Admin will use searchable product pickers
and save only these ProductID relationships once the API supports them.
