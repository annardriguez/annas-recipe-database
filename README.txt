ANNA'S RECIPE DATABASE V3

DESIGN CHANGES
- Filter/search panel is no longer sticky and will not cover recipe cards
- Fully symmetrical recipe grid
- Three equal columns on desktop, two on tablet, one on mobile
- Warm neutral base with a muted baby-blue accent
- Restrained card colours rather than a rainbow palette
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
