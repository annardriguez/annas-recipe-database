# Anna’s Kitchen 2.0

Implemented in the existing static HTML/CSS/JavaScript app. There is no framework migration, new runtime dependency, schema migration, or backend deployment in this change. The current Appwrite adapter, private record boundary, cookbook journal, profile, account flows, original source recipes and legacy guest migration remain in place.

## What changed

- A shared cream, tomato, olive and butter design system using the existing Instrument Serif / DM Sans pairing. Responsive editorial homepage, seasonal recipe pairings, six working discovery collections, photographic recipe cards, consistent private cookbook/profile styling, dark theme, reduced-motion support and print styling.
- Shareable recipe detail URLs (`index.html#recipe=<id>`), ingredient checkboxes, servings from 1–48, quantity scaling, recorded preparation/cooking times, related recipes, print and link-copy controls, and direct meal-planner placement.
- Mobile recipe tabs keep ingredients and method within reach. Cooking mode shows one large instruction at a time, previous/next controls, ingredient access and optional Screen Wake Lock. It releases the lock on exit or close.
- Search combines words in any order and includes personal tags. Independent meal, time, dietary tag, collection, calorie, protein, pantry-ingredient and meal-prep filters compose with existing quick filters, sorting, favourites and random recipe selection. Nutrition targets can be remembered.
- The recipe editor adds servings, optional preparation/cooking times, precise multiline ingredients and steps, tags, per-serving nutrition, photo selection and editing of both source and original recipes. Commas within instructions or ingredient descriptions are preserved. Source recipe edits live in private `entry.recipeEdit` records; `recipes.js` is unchanged. Existing custom fields survive normalisation.
- Notes, substitutions and collections use the existing `entry` and `collection` records, including `collection_ids`, so they also appear in the existing My cookbook experience. Cookbook journal saves retain additional recipe metadata. Editors reject stale versions; note drafts are retained if notes change elsewhere.
- Planner meals now record `servings`. Old meal records remain readable and use the recorded recipe yield, matching their original full-batch shopping quantities. New “fill empty slots” plans use one serving, preserve occupied slots and offer undo. Weeks can be named, saved and reused into empty slots.
- Shopping retains every ingredient. It combines matching ingredient descriptions in compatible mass/volume units (g/kg and ml/l); differing preparation descriptions or spoon measures remain separate. Unparsed repeated ingredients display their number of uses. Lists have categories, persistent checkboxes, manual extras and copying. They no longer discard differing quantities or truncate the displayed list.
- Version 3 kitchen backups export current guest/account records and import missing records without replacing existing records or deletion markers. Account credentials are never exported. Private photo file references are included; the actual private file bytes remain in the account. Photos from a different owner are not imported as account photo references.

## Data boundaries

All new persistent data uses `AnnaKitchen` from `kitchen-data.js`. Signed-in records stay in the current account, and guest records use the established `annaKitchenGuest` store. Source guest keys remain untouched. New tool settings use the `profile/cookbook-tools` record; saved weeks use `profile/meal-templates`. Existing photo storage and owner checks are retained. Guest photos are resized JPEG data URLs; account photos use the existing private upload API. No user account data was changed during the automated UI tests.

## Verification

- `npm test`: 10 existing data/auth/handler/migration tests pass.
- `npm run test:browser`: existing guest cookbook, journal/history CRUD, original recipes, collections, planner/grocery persistence, account forms and mobile checks pass.
- `node tests/redesign-browser.cjs`: serving arithmetic, checkboxes, notes, collections, cooking navigation, source-recipe edits and reloads, search/empty states, combined filters, nutrition targets, original recipes and photo selection, planner handoff/servings, grocery consolidation, saved/reused weeks, undo, checked-item persistence and backup export/import.
- The redesign browser test checks all six major routes at 360, 390, 768, 1024 and 1440 CSS pixels, with no horizontal page overflow or uncaught browser exceptions.
- Visual review in the in-app browser, including the existing dark theme. Browser tests generate screenshots in `tests/` (ignored by Git).

## Practical limits and next steps

Nutrition is recorded source data, not independently verified or calculated from an ingredient database. Per-serving values remain constant as servings change; full-batch values and planned daily totals multiply those values by servings. Missing macros stay unknown, and a daily total with incomplete inputs displays a dash. Editing ingredients does not invent new nutritional values. Dietary preferences use explicit tags and are not allergen guarantees.

Ingredient text is heterogeneous. Scaling recognises a leading number/fraction/range (including section prefixes) and explicit equivalent amounts in parentheses. Unquantified text stays unchanged. Review alternative choices and indivisible ingredients when scaling. Grocery consolidation intentionally avoids fuzzy ingredient matches.

Wake Lock support and clipboard permissions vary by browser. Guest storage can fill up; failed saves leave the draft open and report the error. Private photo replacement can leave unreferenced files in the existing backend, as before; automatic file cleanup is not introduced.

New authenticated writes reuse the existing, tested account boundary, but the new workflows have not been tested with live writes to a user account or across two real devices. Before publishing, run a separate test account through the new recipe editor, photo upload, planned servings and saved-week flows. Deployment uses the existing GitHub Pages site (main branch, repository root); no backend redeployment is required.

Photography is serving inspiration, labelled on the images. Six custom images were created with the built-in imagegen tool; remaining category images are locally bundled Unsplash photographs. Some recipes deliberately use a typographic fallback until their own photo is added. See `assets/README.md` for sources and the generation prompts. Replacing illustrative category images with Anna’s own dish photos is the most useful content refinement.


## Live mobile QA — 13 November 2026

`npm run test:mobile` exercises the deployed GitHub Pages URL in fresh guest browser contexts. It uses Playwright’s iPhone 13 and small iPhone SE touch profiles in Chromium and WebKit, with additional 375 × 667, 390 × 844 and 844 × 390 viewports. No signed-in account records or existing personal meal plans are changed. Install the test browsers with `npx playwright install chromium webkit`. To run the same journeys locally, set `ANNA_TEST_BASE=http://127.0.0.1:4173/`.

Mobile testing found and corrected:

- Recipe deep links opened before the data boundary was ready, so persisted notes could initially appear blank. Library and planner deep links now wait for readiness.
- Safari did not reliably commit planned-serving edits when tapping non-focusable text. A visible Update servings action and Enter-key handler supplement the existing change handler. The field validates whole-number servings from 1–48.
- Planner meal buttons occupied the whole slot height and could cover serving controls in the next row. Slots now use a column flex layout that accounts for both recipe selection and serving controls.
- Closing a recipe preview inside the planner picker removed the body’s scroll lock while the picker was still open. The lock now follows whether another modal remains open.
- Mobile recipe/editor/planner inputs use readable 16px text, and planned-serving fields have larger touch targets.

The mobile regression covers ingredient scaling/checking, saved-note reload, all cooking steps/back/finish/exit, recipe-to-planner handoff, picker search/preview, planned servings, groceries/manual extras/checkmark persistence, week templates, clear/remove/undo, guest offline edits, and portrait/landscape overflow. It also opens all 72 source recipe links and checks that every ingredient and method step renders. Reports are written under `/tmp/anna-live-mobile-*-report.json` and screenshots under ignored `tests/live-*.png` paths. Device emulation does not verify a physical iPhone’s software keyboard, safe-area chrome or actual screen-sleep behaviour. Authenticated account writes remain a separate acceptance check.
