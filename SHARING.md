# Shared cookbooks and Community recipes

The existing cream/tomato/olive typography, navigation, cards and dialogs are retained. Sharing controls use the same cookbook forms and buttons.

## Use

- **My cookbook → Shared cookbooks → Create shared cookbook.** Choose a name and your name in that cookbook.
- Open it, expand **Members & invitations**, and invite the other person’s account email. Invitations appear inside **My cookbook** and **My profile** for that verified email. This version does not send invitation emails. Ask the person to sign in with the invited email and accept.
- **Open a cookbook → Invite with a link → Create invite link → Copy invite link.** Send it yourself. It opens a **“Join shared cookbook?”** pop-up; the recipient signs in/verifies their own account, chooses a display name, and explicitly joins. Opening or previewing a link never grants membership. Links expire after seven days; only the owner can replace or disable them. Replacement disables the old link; disabling a link keeps existing members. Anyone holding an active link can join, so disable/replace it before removing a member who still has it.
- Members can add recipes, import a website recipe, or write one. Saving an import from a cookbook opens the sharing review after the private save. Members edit only their own shared contributions; the owner can remove contributions, invite/revoke/remove members, and rename the cookbook. Members can leave. Shared copies already contributed remain when a member leaves.
- **Share / publish ↗** on a personal recipe opens a review. Choose an invited cookbook or **Public · All recipes**. Photos are excluded unless explicitly checked. Public publishing additionally requires a public display name and confirmation of permission to publish the recipe/photo with original source credit.
- **All recipes → Recipe library → Community** shows published recipes to signed-in and anonymous visitors. The other filters are All recipes, Anna’s recipes and My recipes. Search and the existing filters work on loaded community recipes. Load more fetches the next page.
- **My cookbook → Published in All recipes** manages publications, including after the private original is deleted. Unpublish removes discovery and direct read access. Personal copies previously saved by viewers remain theirs.

Shared/public recipes are recipe snapshots. Publishing or sharing never copies private diary notes, ratings, cooking history, private photo paths or account email. Editing a personal recipe does not silently update a shared/public copy: explicitly share/publish again to update it. Source author and URL remain attached.

Save, personal edits, notes, cooking diary, folders and planner actions on a shared/community recipe use a separate personal copy. Shared contribution editing updates only that contribution. Personal copies preserve photos and remain available independently of membership or publication changes.

## Storage and access

No new project, table, file bucket, administrator key, table-wide read permission or function execution scope is needed. The existing table has row security enabled, no table-level roles, `owner` string(36), `kind` string(16), `record_id` string(240), and mediumtext payload. These were inspected before deployment.

`social.js` is a dedicated verified-user route on the existing sync function. Reserved kinds cannot be written through the generic private-record save/import routes. Reserved owners are compact 36-character hashes beginning with `!`, which cannot be an Appwrite account ID; users choosing IDs such as `books` or `public` cannot collide with system records. The original eight private record kinds and owner identifiers are unchanged.

Cookbook records, membership indexes, email-addressed invitation indexes, snapshots, and publisher references have empty direct row permissions. The server verifies membership for book/item reads and contributor/owner rights for writes. Invitations are derived from the authenticated verified email, never a caller-supplied recipient identity. Mutations touch the cookbook record inside the same transaction so concurrent membership removal conflicts with a staged contribution. Expected versions protect shared edits and publication updates.

Invite links use 32 random bytes in a URL fragment. Only a hash is stored in protected backend rows; tokens are not included in account sync/offline snapshots. Link preview reveals only the cookbook name and owner’s display name to a verified caller with the token. Joining and owner revocation touch the same cookbook row in a transaction, preventing a concurrent revoked link from committing a join. The pending invitation survives login in session storage for that browser tab and is cleared after joining or dismissing. No member recipes become publicly readable.

Only a separate `publication` snapshot receives `read("any")`, with no public create/update/delete grant. The snapshot has public recipe fields and a chosen display name; its opaque ID and system owner reveal neither private recipe IDs nor user IDs. Anonymous clients list/get only rows allowed by Appwrite’s row ACLs. Unpublishing clears the snapshot, revokes its read grant, and retains a private versioned reference for republishing. Existing private rows and file permissions are never made public.

Photos are separate canvas-rendered JPEG copies, bounded to 96 KiB; original metadata and private file addresses are not shared. Existing public illustration assets can be referenced directly. Snapshot payloads are bounded to 240 KiB. Keeping copied images in the protected snapshot avoids widening private file access or adding storage scopes.

Book recipes are fetched in pages of eight after membership verification. Public pages contain six recipes. Only books actually opened/downloaded are retained for offline reading. Reconnection refreshes membership and prunes revoked book snapshots from memory and the account download, while keeping explicitly saved personal copies. Previously viewed/downloaded content cannot be recalled from a device that remains offline.

## Verification and deployment

- `npm test`: 24 checks including invitations, verified identity, owner/member/contributor isolation, forged IDs, stale writes, removal races, publication ACLs/reversal, reserved namespaces, field/photo privacy, plus existing account/import/security checks.
- `npm run test:sharing`: Chromium and WebKit, two isolated verified accounts plus anonymous browsing, using the real server handler and actual SDK, service workers and IndexedDB against a disposable server fixture. Covers email and link invitations, signed-out/login continuation, explicit joins, link revocation, photos, personal forks, shared edits, member-only links, public discovery/source credit, private notes/planning, unpublish after original deletion, offline reading and revocation.
- Existing browser, shared-editor, importer, redesign, offline, and four iPhone 13/SE browser-profile journeys are also checked. Browser profiles are not physical-iPhone tests.

Deploy `main.js`, `social.js`, `recipe-import.js`, `safe-fetch.js`, `package.json`, and `package-lock.json` to `kitchen-sync`, Node 22, `npm ci --omit=dev`. The backend remains compatible with the previous private/import client. Deploy it before the frontend. Regenerate `sw.js` using `npm run build:offline`; updates wait for existing app windows to close.

Deployment: Appwrite `kitchen-sync` version `6afd66fe10c0da7a4197` is active with invite links. The previous sharing version `6afc9b4a5aa751faaf7e` remains ready for rollback. No schema or security-setting changes were required.
