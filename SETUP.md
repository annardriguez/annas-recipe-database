# Appwrite rollout — 13 November 2026

Anna's Kitchen now uses its own Appwrite project, without pausing Luna or Honours Student Companion.

Provisioned on the free plan:

- Frankfurt project `6af647a70013af378363`.
- TablesDB database `6af6480d001895013491` and private `records` table.
- Private `kitchen-photos` bucket with file-level permissions and an 8 MB upload limit.
- Built and enabled Node.js 22 `kitchen-sync` function, with user-approved `rows.read` / `rows.write` dynamic scopes and `users/verified` execution permission.
- Exact web hostnames `annardriguez.github.io` and `127.0.0.1`; the original wildcard hostname was replaced.

The static app uses the pinned Appwrite SDK and adapter; Supabase configuration is no longer loaded by the pages. The public 72-recipe library is preserved. Guest data remains separate, with explicit repeat-safe account import. Older Supabase cloud records remain in the inactive Supabase project; no cloud export was possible and no historic cloud migration is claimed.

Verified against real Appwrite:

- Account signup, password login, verification email delivery to the user-selected inbox, and completing verification using the delivered email token.
- Two independent authenticated session cookies: all private record types and photo bytes available in the second session, edits and deletions propagated, stale and concurrent writes rejected, grouped changes rolled back atomically, guest imports did not resurrect deletions, anonymous access denied, and logout invalidated the selected session.
- Actual local browser UI: magic email login, persisted login after reload, creating an original, adding notes/substitutions/rating/status, uploading and rendering a private image, recording cooking history, seeing edits made from the independent API session, and removal of private recipe/photo elements on logout.

Local checks passed: ten data/security tests and the Chromium guest journey (saved recipes, originals, collections, notes, cooking history create/edit/delete, planner, groceries, reload persistence, mobile overflow, account form and no browser exceptions).

These checks use one actual browser and independent API sessions. They are not a claim that a physical iPhone was tested. The GitHub Pages deployment completed successfully. The live profile callback was exercised with an actual emailed magic link, restored the records created from localhost, rendered their private photos, and showed the independent-session edit. A profile save from the deployed UI was read back from the API session. Temporary test recipes, history and images were then removed, and the live profile reflected the cleanup.

For the opt-in real-backend check, run `ANNA_APPWRITE_TEST_CREDENTIALS=/absolute/path/to/test-credentials.json node tests/hosted-appwrite.cjs`. The credentials file must contain a verified test account's email and password and must stay outside the repository. The script creates explicitly test-prefixed records and a test image, checks them, then removes them. Its report is written to `/tmp/anna-kitchen-appwrite-report.json` without credentials.

During testing, the generated test password and cookies were stored only in owner-readable temporary files outside the repository; those credential files and consumed email callback links were removed after verification. They are never included in frontend configuration or committed files. Use a magic email link or password reset to access the account with your own credentials.

Project schema, permissions and function deployment instructions are in [appwrite/README.md](appwrite/README.md).

---

## Previous Supabase implementation notes (historical)

These notes document the superseded backend. They are retained for recovery; do not apply the Supabase migration to Appwrite.

# Personal cookbook and accounts

The code is implemented locally. **The hosted setup is not complete.** On 12 November 2026, the connected Supabase project `jlcvhiwfdpskvvecybuq` was `INACTIVE`; listing its tables returned `Database is possibly not accessible at the moment`. No production migration was applied, no other project was used, and nothing was deployed to GitHub Pages.

## Enable the existing backend

1. Open [the existing Supabase project](https://supabase.com/dashboard/project/jlcvhiwfdpskvvecybuq). Restore it and wait for it to become healthy. Review any plan or restoration requirements shown by Supabase.
2. Take a database backup/export before changing the schema. In its SQL Editor, run the **entire** file `supabase/migrations/20261112224216_personal_kitchen.sql` once. It runs in a transaction. Do not run the old `supabase-schema.sql` as a substitute for this migration.
3. Inspect the resulting `public.kitchen_records` table, both RPC functions, its owner RLS policy and the private `kitchen-photos` bucket. The migration grants authenticated clients SELECT/INSERT/UPDATE on the table, restricts every operation to `auth.uid()`, and denies anonymous access. It adds private Storage SELECT/INSERT/DELETE policies based on the first path segment (the owner's UUID). Uploads use unique paths, never file upserts.
4. In **Authentication → Providers → Email**, enable email signup and email/password authentication. Enable email confirmation for verified accounts. Configure production SMTP and verify delivery for confirmation, magic-link and password-reset emails. Passwordless login is available for existing accounts.
5. In **Authentication → URL Configuration**, set Site URL to:

   `https://annardriguez.github.io/annas-recipe-database/`

   Add this exact redirect URL:

   `https://annardriguez.github.io/annas-recipe-database/profile.html`

   If testing locally, also allow `http://127.0.0.1:4173/profile.html`. Keep the standard Supabase confirmation and recovery email templates, or make sure custom templates retain the generated confirmation URL. The client handles the returned session and password recovery event on the static `profile.html` page.
6. Verify `supabase-config.js` still points to this project with its **publishable** key. No service-role key is needed in this app.
7. Deploy the updated static files together to the existing GitHub Pages repository. Include the new `kitchen-data.js`, `cookbook.html`, `profile.html`, `cookbook.js`, `cookbook.css`, and modified shared files. Do not publish `node_modules`. Reload old tabs so they use the new data layer.

Supabase references: [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## Data and synchronization

- The public library stays in `recipes.js`, unmodified by this work. Private originals are added to the in-memory library only for the active account/guest.
- `kitchen_records` has an owner foreign key to `auth.users`, a record kind, a stable ID, a JSON object payload, a version, a deletion marker and an update timestamp. Its primary key is `(user_id, kind, id)`. The kinds are `recipe`, `favourite`, `entry`, `history`, `collection`, `meal`, `grocery`, and `profile`.
- Recipe IDs refer to the static library or the account's private originals. Entries refer to recipe IDs and collection IDs; meal records hold one slot each (`YYYY-MM-DD|Breakfast`, etc.). History has its own stable IDs, recipe ID, title snapshot, cooking date, notes, rating and photo path. History survives recipe deletion. These links to the static library are application references; they are not SQL foreign keys.
- Saves use `save_kitchen_records` with expected versions. A whole group of changes commits or rolls back together. A stale editor receives a conflict and retains its draft for review. Deletions leave tombstones to prevent stale data or repeat imports from resurrecting items. The UI does not treat an optimistic change as a completed cloud save.
- Login fetches all private records in pages of 500. Visible pages refresh every 15 seconds, on returning to the tab and on reconnect. Changes appear on another active device after its next refresh; the cookbook/profile also offer manual refresh. No Realtime publication is required.
- Failed account writes are **not** silently queued in guest storage. Editors stay open with the draft and an error. A failed planner edit returns to confirmed state. Retry after reconnecting. Account data is held in memory; Supabase persists the authentication session. Logout/account switching clears private views and returns to the separate guest kitchen.
- Photos use the private bucket and short-lived (five-minute) signed URLs. Their owner-prefixed paths are stored in records. File replacement uses a new path. Removing a photo/entry stops displaying it on refresh; old unreferenced files may remain private in Storage. Periodic orphan cleanup is an operational follow-up, not an automatic destructive migration. Already issued signed links can remain usable until expiry.
- Guests continue to browse, bookmark, create originals, write notes, organise collections, log cooking and plan meals locally. Photo uploads require an account. New guest records live in `annaKitchenGuest`. The original `annaRecipeFavourites`, `annaCustomRecipes` and `annaMealPlan` keys remain untouched as backups and are read during guest migration.
- After login the import banner is explicit and optional. `import_kitchen_guest` is transactional and uses `ON CONFLICT DO NOTHING`: existing account edits **and tombstones** win, repeat imports don't create duplicates. The marker is recorded only after a successful import and readback. Guest source data is retained even then. Legacy account favourites are copied into the new table by the SQL migration; the old favourites table is preserved.
- The display name is an account-owned profile record. Auth user metadata is only a fallback display value and never an authorization source. Password changes and logout use Supabase Auth.

## Verification performed locally

Run:

```sh
npm ci
npm test
npx playwright install chromium
npm run serve
# In a second terminal:
npm run test:browser
```

`npm test` runs a real embedded Postgres (PGlite) against the migration with local `auth`/`storage` test schemas. It checks owner isolation, cross-user insert denial, anonymous denial, Storage path isolation, private bucket configuration, legacy favourite preservation, atomic rollback, stale-write rejection, deletion tombstones and repeat imports. Data-service tests use a test adapter for two sessions, failure/retry handling, explicit import, account switching, logout, pagination and photo guards. These adapter tests do not authenticate with hosted Supabase.

The Chromium test covers real local guest UI interactions: saving a library recipe; notes, substitutions, status and rating; logging and editing a cooking memory; collections; creating an original with ingredient/method punctuation preserved; reload persistence; meal/grocery writes and checked items; mobile overflow; account forms; and preservation of all 72 public recipes. It also checks for browser exceptions. Screenshots are generated under `tests/`.

**Not performed:** hosted signup, email verification, actual email delivery/password recovery, hosted photo upload, authenticated browser sessions on separate devices, production RLS/advisors, or deployment verification. The inactive project prevents those checks. Do not treat local tests as evidence these hosted steps passed.

## Hosted acceptance check after setup

Use a real test email you control and two separate browser profiles (or desktop and phone).

1. Sign up on desktop. Follow the verification email, log in, reload and confirm the session persists.
2. Choose whether to import the browser's guest recipes. Verify source guest data remains intact and repeating an import doesn't duplicate recipes or overwrite account changes.
3. Save a library recipe. Create an original. Add notes, substitutions, rating and collection membership. Upload a photo and record a cooking date. Add a meal plan, a manual grocery item, and check an ingredient.
4. In the second browser, log in with the same email. Verify all of that information, including the private photo. Edit a note and remove a planned meal; return to the first browser and refresh to confirm both changes.
5. Open an entry editor in both browsers. Save in the first, then try to save the stale second editor. Confirm it reports a conflict and preserves the draft for review. Reopen it to see the current version.
6. Disconnect networking, attempt a save, and confirm an error (no success claim). Reconnect, retry, and check from the second browser.
7. Delete a bookmark, an original and a history item; confirm disappearance in the second browser. The deletion of an original keeps its history snapshots; deleting a history item removes that individual memory.
8. Log out. Confirm private originals, notes, signed-photo elements, plans and account records no longer appear. Public recipes and the independent guest kitchen should still work. Sign in as a second account and confirm it cannot see the first account's data.
9. Request password recovery from the account dialog. Follow the email back to the GitHub Pages profile URL, save the new password, log out and log in with it.
10. Run Supabase's Security Advisor and inspect the actual hosted table and Storage policies before calling the rollout complete.


## Live entry points

- Website: https://annardriguez.github.io/annas-recipe-database/
- Cookbook: https://annardriguez.github.io/annas-recipe-database/cookbook.html
- Profile and email callbacks: https://annardriguez.github.io/annas-recipe-database/profile.html

Use **Log in → Email me a login link** with your verified email. To choose a password yourself, use **Forgot password?** and complete the recovery form from your email. Test fixture data was removed; your existing guest collection can be imported explicitly from the browser where it was originally saved. Existing Supabase cloud data was not exported from the inactive project.

Authentication signup, password login and email verification were tested through the actual Appwrite APIs. Magic login and the GitHub Pages callback were tested through the real browser UI. The password-recovery API/form wiring is implemented, but setting a new personal password through the browser was not performed on the user's behalf. No physical-phone test or live second-user penetration test is claimed; owner isolation is also covered by the function authorization tests.

The main GitHub Pages application assets were fetched after deployment and their hashes matched the local tested sources. `.nojekyll` ensures GitHub Pages serves the bundled SDK under `vendor/` unchanged.
