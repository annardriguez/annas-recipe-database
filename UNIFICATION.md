# One Anna’s Kitchen, with the existing website design

The supplied website and web-app URLs are the same deployment. The earlier app is preserved in this repository’s history (the account/cookbook implementation at `acbf978`); the updated visual source is the current website at `f5022b7`. Both use static HTML, CSS and JavaScript. There is no second framework to port or separate application to maintain.

The user explicitly chose to retain the working Appwrite backend instead of returning to the inactive Supabase project. Existing Appwrite accounts, private records and Storage files are retained. The legacy Supabase configuration and SQL files remain historical recovery material and are not loaded by the website.

## What is shared

| Area | Existing implementation | Integration in this change |
| --- | --- | --- |
| Homepage, header, navigation, cards, typography, themes, responsive styling | Updated website | Preserved. HTML changes only load the shared script revisions. No stylesheets or image assets are changed. |
| Public recipes | 72 source recipes in `recipes.js` | Preserved byte for byte. Personal changes remain private overlays rather than modifications to the shared library. |
| Recipe creation and editing | Website’s full editor supports servings, timings, nutrition and photos; the older cookbook editor exposed a subset | All recipe creation/editing uses the website’s complete editor and one save handler, including cookbook/profile entry points and planner previews. The incomplete editor is removed. |
| Personal cookbook and cooking diary | Archive, original recipes, cooking-history forms | Extracted into `cooking-journal.js`, used by library recipes, planner previews, cookbook and profile. The existing form styling and record structure are retained. |
| Cooking mode | Step navigation, ingredients, wake lock, finish/exit | Existing behaviour retained. Finishing adds a non-blocking “Record this cook” action; the shared diary preselects a dated cooking memory. It is saved only when the user submits. |
| Notes, substitutions, ratings and collections | Shared `entry`, `history` and `collection` records | The diary preserves other entry metadata, including the website’s `recipeEdit` overlays. Recipe edits preserve diary records and additional recipe fields. No parallel note store is added. |
| Favourites | `favourite` records and existing header counts | Unchanged; the same account boundary is used on all routes. |
| Meal plans, saved weeks and groceries | Updated website’s planned servings, templates, consolidation, manual extras and checkboxes | Preserved. Planner recipe previews now also reach the shared editor and diary. |
| Nutrition | Recorded source/per-serving values and the website’s editor and planner calculations | Preserved, including existing caveats for unknown values. The cookbook now has the same editor fields. No nutrition values are invented or replaced. |
| Recipe/kitchen importing | Version 3 backups and explicit guest account import | Preserved. Existing account records and deletion markers take priority; no automatic data merge or destructive migration is introduced. |
| Accounts and profiles | Shared email authentication, persistent sessions, profile and Appwrite adapter | Unchanged. No new account system, new project or new credentials are introduced. |
| Private cloud data | Owner-scoped verified-user function, private table and owner-only photos | Unchanged. No schema or backend deployment is required. |

The shared editor reports failed saves explicitly and retains the draft. Modal scroll locking follows all open dialogs so that closing a diary or editor does not unlock a recipe underneath it. Existing private photo references are retained and loaded in the shared editor.

## Preservation and verification

No data migration is needed: the archive and updated website already use the same `AnnaKitchen` boundary and the same Appwrite project. Source history is preserved on the `codex/unify-kitchen-workflows` branch. No existing recipes, accounts, photos, notes, meal plans or grocery data are deleted or rewritten by the integration. The live backend test creates uniquely named temporary records/photos, then removes only those fixtures.

Verification performed:

- `npm test`: ten existing account/data/handler/security tests.
- `npm run test:browser`: cookbook, journal, originals, collections, reload persistence, planner/groceries, account forms and mobile overflow.
- `node tests/redesign-browser.cjs`: the updated website’s original functional and responsive regression.
- `ANNA_COMPARE_BASELINE=1 node tests/unification-browser.cjs`: shared recipe editor; diary from the library, completed cooking and planner; archive note preservation; photo, servings and nutrition retention; preservation of source-recipe edits; nested-dialog scroll locking; one header navigation; and homepage screenshot comparisons against the pre-change baseline at 390 and 1440 CSS pixels in light and dark themes. The comparison allows a small channel-level rasterization tolerance; no CSS or layout changes are introduced.
- `ANNA_TEST_ENGINE=webkit node tests/unification-browser.cjs`: the integration journey in WebKit, using a fresh guest context.
- `ANNA_TEST_BASE=http://127.0.0.1:4173/ npm run test:mobile`: existing Chromium/WebKit phone-profile regression against the integrated source.
- A fresh live Appwrite test authenticated two independent sessions through emailed magic links. It verified all private record types, shared private photo bytes, edits, deletions, stale-write rejection, atomic rollback, concurrent edits, repeat-safe import and selected-session logout. It also confirmed anonymous/direct-table access is denied. No user account credentials are committed, and existing private account data is not modified by the fixtures.

Screenshot comparison uses captures taken before implementation, stored outside the repository. Running the integration test without `ANNA_COMPARE_BASELINE=1` runs the functional checks without requiring those temporary baseline files.

Independent authenticated API sessions and browser phone emulation do not constitute a test on two physical phones. The backend/auth configuration and owner access rules are unchanged by this frontend integration. GitHub Pages remains the sole public application deployment.
