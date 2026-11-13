# Offline cookbook

Open the installed Anna’s Kitchen app while online, sign in and visit My cookbook. Wait for **available offline** in the existing sync bar before disconnecting. The app downloads the public recipe library and app routes, and a separate device copy of the current verified account’s confirmed recipes, favourites, notes, cooking history, collections, plans and groceries. Uploaded private photos referenced by those records are downloaded too. External image URLs in imported recipe backups still depend on their source and are not guaranteed offline.

The installed iPhone app may have separate website storage from Safari: open and sign in inside the home-screen app while online. The first download requires internet. Clearing website data, removing the app, or browser storage eviction can remove downloads; reopen online to rebuild them. This is a device download, not an additional backup.

Account changes and photo uploads require internet. Offline reading does not queue writes. Reconnecting rechecks the session and fetches current server records, including edits and deletions from other devices. Guest records retain their existing local-only behaviour.

## Boundaries

- `sw.js` caches only the explicit public asset list at this deployment’s scope. It never caches Appwrite, account responses, file responses, tokens or authentication URLs. Canonical static keys discard query strings. All public assets, including fonts, are hosted locally.
- `offline-store.js` uses a scoped IndexedDB database with a single last-account snapshot and owner-prefixed photo blobs. This is separate from guest localStorage. No new password, session token or email-link secret is stored in the snapshot.
- An offline snapshot is restored only on a network failure, for a previously verified account. An online unauthenticated/expired session clears it. Authentication callbacks cannot silently restore a different downloaded identity.
- Logout immediately changes the local auth revision, locks restoration and clears the device download and object URLs, including across open tabs. If remote logout cannot complete offline, it is retried before another explicit sign-in. A retained cookie cannot silently reopen the account.
- Epoch, account revision and owner checks reject delayed downloads from an earlier session. Record refresh prunes unreferenced photos. A storage/quota failure reports incomplete offline availability without changing the result of a successful cloud save.
- Service-worker upgrades wait for open pages to close. They do not reload an unsaved editor. Close all kitchen windows and reopen online to pick up a waiting upgrade.

## Development

Run `npm run build:offline` after changing any public app file and commit the regenerated `sw.js`. The generator hashes public asset contents to create a complete versioned shell. Production uses the existing GitHub Pages deployment and existing Appwrite project; no backend migration is needed.

`npm run test:offline` serves the real app at a nested GitHub Pages-style path and uses real service workers, IndexedDB and the Appwrite browser SDK with isolated mock accounts. It tests Chromium and WebKit cold offline launches, recipe methods, private photo bytes, history and planner routes, blocked account writes, reconnection, deletion/photo pruning, logout across tabs, account replacement, quota errors, expired sessions and guest recipes. It does not write production records or constitute a physical-iPhone test.

Validation for this change: `npm test` (10 checks), `npm run test:browser`, `node tests/redesign-browser.cjs`, the shared workflow integration in Chromium and WebKit, matching homepage screenshot baselines at 390/1440 pixels in both themes, and the four Chromium/WebKit iPhone 13/SE regression contexts passed. Offline tests disable Chromium networking and disconnect the test HTTP transport for WebKit, whose automation offline switch rejects some new-page navigations before invoking its service worker. Both tests close and open documents against the downloaded app; neither substitutes an already rendered page for a cold launch.
