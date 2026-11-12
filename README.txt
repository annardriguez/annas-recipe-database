CURRENT BACKEND — APPWRITE (13 NOVEMBER 2026)
The website now uses its own Appwrite project for email accounts, private recipes,
photos, notes, history, collections, meal plans and grocery lists.
Current setup and verification: SETUP.md
Backend architecture and deployment: appwrite/README.md
Guest source data and all 72 public recipes are preserved.
The older Supabase sections below are retained as historical implementation notes.

ANNA'S RECIPE DATABASE V3

DESIGN CHANGES
- Filter/search panel is no longer sticky and will not cover recipe cards
- Fully symmetrical recipe grid
- Three equal columns on desktop, two on tablet, one on mobile
- Warm neutral base with a muted baby-blue accent
- Restrained card colours rather than a rainbow palette
- My Kitchen login-style profile panel for saved recipes
- Export/import saved recipes for moving favourites between browsers
- Optional Supabase email login for cloud-synced favourites across devices
- Weekly meal planner summary with macros and a shopping list
- All V2 features are preserved: favourites, random recipe, search, sorting,
  filters, keyboard shortcut and recipe dialog

HOW TO OPEN
1. Open this folder in Visual Studio Code.
2. Install the extension "Live Server" if you have not already.
3. Right-click index.html.
4. Select "Open with Live Server".

FILES
- index.html: recipe library page
- planner.html: weekly meal planner page
- about.html: about page
- style.css: appearance and layout
- recipes.js: recipe database
- script.js: search, filters, favourites and interactions
- planner.js: meal planner interactions
- theme.js: dark/light theme toggle

OCTOBER 2026 UPDATE
- refinements.css: shared cream and blue design, responsive layouts, and focus styles
- New featured recipe, meal-type filters, and ingredient checkboxes
- Search supports multiple words in any order
- Favourites links open saved recipes across pages
- 15-minute filters now use actual recipe time
- Repaired two syntax errors that prevented recipes.js from loading

Keep refinements.css alongside style.css when copying or deploying this folder.
Favourites and meal plans continue to use the existing browser storage keys.

PLANNER AND NAVIGATION REFINEMENT
- All recipes and Favourites are separate, bookmarkable views.
- Filters and reset stay within the current collection.
- Favourites count lives in the navigation; the duplicate heart shortcut is removed.
- Planner uses one row per day, with a modal recipe chooser and keyboard-accessible removal.

- account.js: shared login dialog for planner/about pages
- theme.js: dark/light theme toggle
- supabase-config.js: Supabase project URL and publishable key for login sync
- supabase-schema.sql: database setup script for synced favourites

SUPABASE LOGIN STATUS
- Project configured: jlcvhiwfdpskvvecybuq
- Favourites table created: public.recipe_favourites
- Row Level Security enabled for per-user saved recipes
- Site URL set to: https://annardriguez.github.io/annas-recipe-database/
- Upload/push the updated files to GitHub, then test My Kitchen > Log in.

NOVEMBER 2026 — PERSONAL COOKBOOK AND ACCOUNTS
- cookbook.html: private/guest cookbook, original recipes, notes, photos,
  substitutions, ratings, collections and a cooking journal.
- profile.html: display name, account email, recipe counts, saved recipes,
  collections, cooking history, password recovery and logout.
- kitchen-data.js: shared Supabase data boundary for all pages; account records
  stay separate from guest browser storage. No automatic guest imports.
- Meal plans and grocery lists use the same account data layer.
- SQL migration: supabase/migrations/20261112224216_personal_kitchen.sql
- Setup, data model, verification results and hosted acceptance checklist:
  SETUP.md

IMPORTANT: The configured Supabase project was INACTIVE on 12 November 2026.
The new migration has NOT been applied and these changes have NOT been deployed.
Restore the existing project, follow SETUP.md, then run the hosted journey.
Local automated checks: npm test; npm run serve; npm run test:browser.

APPWRITE TRANSITION — 13 NOVEMBER 2026
The pages now use appwrite-config.js, appwrite-backend.js and the pinned SDK in
vendor/. The new Appwrite project is independent of the two active Supabase apps.
See SETUP.md for current rollout status and appwrite/README.md for backend details.
Older Supabase instructions above are historical; they are not the active setup.
