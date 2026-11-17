# Recipe links and folders

In **My cookbook**, choose **Import a link ↗**, paste a recipe website link and optionally select or name a folder. **Preview recipe ↗** opens the existing full recipe editor. Check the ingredients, method, yield and missing-field messages, then choose **Save recipe ↗**. Cancelling a preview does not create records or upload the imported image.

The original website link, author and website name are retained with the recipe. The saved recipe view links back to its source. Imports are labelled as website recipes rather than original creations. Reimporting an already saved source link offers the existing editor; common tracking parameters are ignored for that check.

Folder buttons in the cookbook filter the saved recipes. The existing recipe editor now lets you choose multiple folders or create a folder while saving. Existing collection IDs and memberships are preserved. Rename/delete controls remain in **Manage folders**; deleting a folder keeps its recipes. Recipe content, folder membership and any newly created folder commit atomically, with the existing version/conflict checks. A failed save retains the editor and can reuse an imported private photo already uploaded for that draft.

Link importing requires a verified signed-in account and an internet connection. Saved imports and private photos participate in the existing account sync, planner, cooking mode and offline download. These folders are still private to their owner. Shared family invitations and membership are a separate next step; naming a folder “Family” does not expose it to another account.

## Website support and limits

The server reads standard Schema.org Recipe JSON-LD (`@graph`, arrays, HowToStep/HowToSection) and a microdata fallback. It does not execute website scripts, infer missing ingredients/steps or transcribe social videos. Unsupported, blocked, login-only or paywalled pages return a useful error. Paste the creator’s recipe website link for social/video recipes, or use the existing manual editor.

Yields that do not clearly describe servings remain unscaled until reviewed. Missing total time must be filled in before saving. Nutrition is left blank because a website’s nutrition serving basis cannot be assumed. Source attribution remains attached when editing an imported recipe. Original-language text is retained.

Source photos are optional: supported JPG/PNG/WebP images up to 512 KiB are fetched server-side, validated and presented for review. On explicit save, the signed-in client uploads the chosen photo to its existing owner-only bucket. Failed/oversized/unsupported photos do not block importing the recipe; the editor explains how to add a photo instead.

## Backend and privacy

The existing `kitchen-sync` function now supports authenticated `import-link` previews. It retains its verified-users-only execution permission and existing `rows.read`/`rows.write` scopes; no keys, extra scopes, database schema or public storage permissions are added. Previewing does not start a database transaction. The web client never fetches arbitrary websites through a public proxy.

`safe-fetch.js` permits HTTP(S) public websites on standard ports, rejects credentials/local/private/reserved addresses, validates every redirect, rejects HTTPS downgrades, and pins validated DNS addresses to the actual connection. Requests have time, response-size and decompression limits and forward no cookies, Appwrite credentials or authorization headers. HTML is parsed as data and imported fields are rendered through the existing escaped text UI.

The new backend deployment is `6afc910e00bd2203f041`; the prior ready deployment `6af6491252a9a305e439` remains available for rollback. Archives now contain `main.js`, `recipe-import.js`, `safe-fetch.js`, `package.json` and `package-lock.json`. Build with `npm ci --omit=dev`, entrypoint `main.js`, Node 22. Frontend deployments must regenerate `sw.js` with `npm run build:offline`.

## Verification

- Six new parser/fetch/handler checks plus ten existing tests: `npm test`.
- Chromium and WebKit at a phone viewport: `npm run test:imports`. Uses isolated mock accounts and real browser SDK/service workers/IndexedDB; checks preview/cancel/error, failed-save atomicity/retry, private photos, duplicate links, folder creation/moving/rename/removal, source attribution and offline cold reopen. No production account rows are written.
- Existing cookbook, redesign, shared-editor, homepage screenshot and offline checks remain in their existing commands. The browser regression selectors now use the visible “folder” labels.
- Direct server imports successfully read public BBC Good Food and Budget Bytes recipe pages and their photos. This does not guarantee every website supports importing.
