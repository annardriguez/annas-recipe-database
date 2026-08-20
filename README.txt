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
