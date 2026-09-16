# Playbook customer snowboard finder prototype

This is a separate static customer app. It does not import the employee app, Admin, or CMS code. Hosting serves only this folder. The catalog is projected to a small, explicit customer schema before Firestore receives it.

## Journey and matching

The four questions ask ability, preferred terrain, preferred flex feel, and whether to highlight listed wide variants. Ability is an exact eligibility match against `Ability`; terrain scores a board when the relevant `Terrain*` rating is 4 or 5; flex feel maps `Soft`/`Soft-Medium` to playful, `Medium` to balanced, and `Medium-Stiff`/`Stiff` to supportive. A listed wide size adds a small boost. Results show the actual reasons and say ranking is a starting point. No fit or inventory claim is made.

The CMS currently has 22 published snowboard products. All 22 have these fields, plus shape, profile, flex, images, sizes and ProductID-based boot and binding recommendation tiers. The customer detail page shows the `Recommended` tier. The projection excludes review-only products, internal selling content, Admin settings, and unrelated employee fields.

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

The CMS lacks rider weight ranges, boot size to waist width guidance, board width measurements, and live inventory. Those are needed for actual size and width recommendations. It also has no explicit riding-style taxonomy; the current flex-feel question uses catalog flex labels rather than claiming freestyle/freeride matching. Confirm whether price, gender, or desired board shape should become finder preferences, and review boot/binding compatibility before presenting setup suggestions as purchasable combinations.
