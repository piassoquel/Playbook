# Playbook customer snowboard finder prototype

This is a separate static customer app. It does not import the employee app, Admin, or CMS code. Hosting serves only this folder. The catalog is projected to a small, explicit customer schema before Firestore receives it.

The local customer preview uses the Night Blue palette: deep navy surfaces, a restrained blue for active controls, pale blue product backgrounds, and warm orange accents. This is the selected visual direction for the next design pass.

## Journey and matching

The entry page uses the existing Playbook sport photos and asks visitors to choose Snowboard or Ski. Snowboard opens question 1 directly; Ski currently opens a clearly labeled coming-soon page. A ski-specific journey and catalog projection are still needed before that path can recommend products.

The five steps ask ability, preferred terrain, preferred flex feel, height in feet and inches/weight/boot size, and preferred board category (men’s, women’s, youth, or all boards). Boot size is selected with touch-sized US or Mondo buttons. Adult Mondo values are converted to US using the published [Burton men's](https://www.burton.com/en-us/products/mens-burton-swath-boa-snowboard-boots-2031816-o) and [women's](https://www.burton.com/en-us/products/womens-burton-waverange-step-on-snowboard-boots-302981) snowboard boot charts; conversions and final boot fit should be confirmed in store. Ability is an exact eligibility match against `Ability`; terrain scores a board when its CMS rating is 4 or 5; flex feel maps the listed labels. The customer-facing “Resort” choice maps to the existing `TerrainGroomers` CMS field. Men’s and women’s choices also include the unisex board. All Boards considers every published board category; sizing uses each board’s category to interpret US boot size. The shortlist includes only boards with a listed size that passes the available size guidance, shows three matches initially, and can expand. Sizing reasons appear only on product pages. US boot size 11 or above selects wide variants automatically; a smaller boot can still receive a wide variant when only that variant fits the rider’s weight. This is a width suggestion, not a final fit guarantee.

The current catalog has 22 published snowboards. We found 2027 manufacturer size charts for 19 models and 62 exact CMS size variants. They are recorded in `size-charts.json` with source URLs, then attached by ProductID, season, and exact size during publishing. A listed size within its manufacturer's weight range receives a ranking boost. Where a chart specifies the relevant US men's or women's boot sizing system, boot size narrows it further. Kids' boot numbering crosses child and youth scales, so the prototype holds that width check for an in-store fit review. For Lib Tech and GNU charts that publish a minimum rider weight only, the app also checks the broad general weight-to-length guide and labels the result accordingly. It does not claim a complete maker size fit. Three boards without a matching 2027 chart (Nitro Lectra Abstract, Salomon Pulse, Salomon Wonder) use a clearly labeled broad weight-to-length guide from Jones. Height is collected for the final stance and balance check but receives no length score because the manufacturer guidance places much greater weight on rider weight and boot size.

Manufacturer charts disagree with three CMS variant rows: D.O.A. `162W`, and DPR `135` and `140` do not appear on the matching 2027 maker charts. These variants receive no maker-chart match and are hidden from the personalized “My Size” badges. The CMS rows should be verified before relying on them. All size results are starting points, not guarantees of fit or live inventory.

The customer detail page puts the personalized size and setup above the longer explanation and specs. It offers ProductID-based `Recommended`, `Budget`, and `Upgrade` boot and binding tiers as a compact selector when each pair is available and compatible. A Step On binding and conventional boot (or the reverse) are withheld together; the upgrade pairings for D.O.A. and Orca 2 currently fail this check and do not appear as customer options. FASE and other hands-free strap systems remain conventional. The Step On boot flag comes from its model name because the CMS has no normalized boot interface field. The projection excludes review-only products, internal selling content, Admin settings, and unrelated employee fields.

## Local preview

From this directory, run `npm test` and `npm run preview`, then open `http://localhost:4173`. Localhost reads `data/catalog-preview.json`, a customer-safe snapshot generated from the current public CMS on 2026-09-16. It is preview data only. Firestore is the intended catalog for the hosted app.

## Publish from CMS to Firestore

1. Review the CMS products in the existing Sheets and Admin workflow and ensure approved rows are `Active` and `Published`.
2. Run `npm install` in this directory for `firebase-admin`.
3. Set `PLAYBOOK_CMS_URL` to the existing public `/exec` endpoint and run `npm run publish -- --output data/catalog-preview.json` to inspect the projected customer data. An empty catalog aborts the run.
4. With Application Default Credentials authorized for the chosen Firebase project, run `npm run publish -- --apply --project-id YOUR_PROJECT_ID`. This replaces customer board documents and removes stale ones. The operation never writes to Sheets or Admin.

The publisher reads the public active CMS API, which already merges the Products, SnowsportsAttributes, ProductVariants, ProductImages, and ProductRecommendations sheets. It performs an additional explicit `Published` check and allowlists fields. Run it after approved CMS changes, or schedule it in a trusted server environment. Do not run it in the customer browser. Review the preview and permissions before first publication.

## Firebase setup still needed

Create a Firebase project and web app, copy `firebase-config.example.js` to `firebase-config.js` and fill in its public web app config. Enable Firestore, deploy `firestore.rules` (public reads of `customerBoards`, no client writes), and give the trusted publishing identity Firestore write permission. Configure Hosting from `customer/firebase.json`. Review the project and rules before any live deployment. No Firebase project is configured or deployed in this branch.

## Decisions for the next iteration

Verify the three CMS size discrepancies and add a normalized boot interface field for Step On compatibility. Consider adding approved manufacturer chart fields to the Sheets CMS so sizing provenance can follow the existing editorial workflow; the current version-controlled chart supplement is keyed to ProductID, season, and variant and is not edited in the customer app. Live inventory is not required. The CMS still has no explicit riding-style taxonomy, so the flex question remains a preference rather than a freestyle/freeride claim.
