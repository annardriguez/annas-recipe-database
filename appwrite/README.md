# Anna's Kitchen Appwrite backend

Project: `6af647a70013af378363`, Frankfurt (`https://fra.cloud.appwrite.io/v1`).
Database: `6af6480d001895013491`, TablesDB serverless (free).
Table: `records`. Bucket: `kitchen-photos`. Function: `kitchen-sync`, Node.js 22.

The function is the only record write path. No browser user has direct table read or write permission. The server derives the owner by validating the caller's JWT with Appwrite Account, requires verified email, and applies owner filters for every read. Stable SHA-256 record IDs include the verified owner, record kind and local record ID. Values and file ownership references are validated server-side.

The function needs `rows.read` and `rows.write` dynamic execution scopes. It does not need user-management, API-key management or schema-management scopes. Execution permission must be `users/verified`, never `any`. Dynamic keys are provided by Appwrite at execution time; they are not in the repository or browser config.

Writes read and stage changes inside one Appwrite transaction, check the client's expected version, and commit together. Transaction conflicts reject the entire group. Deletion markers keep old imports and stale writers from resurrecting records. Guest imports run in retry-safe batches of 80, below the free plan's 100-operation transaction limit. Completed batches are preserved if a later batch fails; no guest source data is deleted. On retry existing account records, including tombstones, win.

The private photo bucket has File Security enabled, permits only verified users to create files, and grants read/delete permissions only to each uploaded file's owner. No bucket-wide read/write grants are needed. The browser fetches private file content with its authenticated SDK and renders revocable local blob URLs. It does not make photos public or persist their bytes in guest storage. Unreferenced replacement files remain private until explicit cleanup; cleanup must check history snapshots before deleting any file.

## Deployment

The function's source is `functions/kitchen-sync/main.js`. It uses pinned `node-appwrite@31.2.0` and a lockfile. Deploy an archive containing `main.js`, `package.json`, and `package-lock.json`, with entrypoint `main.js`, build command `npm ci --omit=dev`, runtime Node 22, and a 60-second execution timeout. The default database ID is in the source; `KITCHEN_DATABASE_ID` can override it.

The web client uses the pinned official `appwrite@29.2.0` SDK copied into `vendor/` with its license, plus `appwrite-config.js` (public identifiers only) and `appwrite-backend.js` (the adapter for the shared cookbook interface).

Allowed web hostnames are `annardriguez.github.io` and `127.0.0.1` for local tests. Authentication email callbacks return to `profile.html` with a `flow` query value (`verify`, `magic`, or `recovery`). Auth secrets are consumed and removed from the URL before any private data is rendered. The app's callback does not rely on GitHub Pages server routing.

The previous Supabase setup files are retained for reference and recovery. This Appwrite project does not have access to old Supabase account records. Existing browser guest data can be imported explicitly; historic Supabase cloud data requires a separate export once that project is available. No Supabase project was paused, deleted or upgraded.

## Local checks

`npm test` includes Appwrite handler tests for verified-user authorization, owner isolation, forbidden photo references, atomic rollback, version conflicts and repeat-safe imports. It also retains tests for the existing guest migration and data boundary, and a historical Supabase migration test.

`npm run test:browser` exercises the real local guest UI with the Appwrite web SDK. It does not prove authenticated cross-device sync. Hosted test results and pending rollout steps belong in `SETUP.md`.
