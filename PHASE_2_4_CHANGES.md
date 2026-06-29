# FieldForce Enterprise — Phase 2.4 Changes

This release adds a full **Category Management** module with external **MIS Sync**.

---

## 1. New Module: Category Management (Admin)

Route: `/admin/categories` (sidebar entry **Categories**, Admin role only)

The Admin user can:

| Action          | UI                                              | API                                  |
| --------------- | ----------------------------------------------- | ------------------------------------ |
| **Create**      | “Add Category” button → modal form              | `POST /api/categories`               |
| **Update**      | Edit (pencil) icon on each row → modal form     | `PUT  /api/categories/:id`           |
| **Discontinue** | Ban icon → confirm dialog (soft-deactivate)    | `PATCH /api/categories/:id/discontinue` |
| **Reactivate**  | Refresh icon (shown only on discontinued rows) | `PATCH /api/categories/:id/reactivate`  |

`Discontinue` is a *soft* operation — the row is preserved for historical reports but flagged
`is_discontinued = 1`, `is_active = 0` and stamped with `discontinued_at`.

Form fields: **Name (unique)**, **Code**, **Description**, **Active flag**.

---

## 2. New: Sync from MIS button

A **Sync from MIS** button sits next to “Add Category” at the top of the page.

Behaviour:

1. Calls `POST /api/categories/sync`.
2. The backend fetches the external MIS endpoint configured in `backend/.env`:
   - `MIS_CATEGORY_API_URL` — full URL of the MIS categories API
   - `MIS_API_KEY` (optional) — sent as `Authorization: Bearer <key>` header
3. The MIS response is normalised — it accepts any of these shapes:
   - top-level array `[ {...}, {...} ]`
   - `{ data:   [...] }`, `{ items: [...] }`, `{ result: [...] }`
4. Each incoming record is matched against the **`mis_id` column** in our
   `categories` table (the **Sync Primary Key** — kept separate from the
   local auto-increment `id`).
   - If `mis_id` already exists → **record is skipped**.
   - Otherwise → record is **inserted** as a new local category
     with `source = 'MIS'` and `synced_at = GETDATE()`.
5. The backend returns a full **sync report**:
   ```json
   {
     "totalReceived": 25,
     "saved": 18,
     "skipped": 7,
     "savedRecords":   [ { "id": 42, "misId": "C-1001", "name": "Mobiles" }, ... ],
     "skippedRecords": [ { "misId": "C-1002", "name": "TVs", "reason": "MIS primary key already exists in categories (sync key column)" }, ... ]
   }
   ```
6. The UI shows this report in a modal at the end of the sync, with three summary
   cards (Received / Saved / Skipped) and two tables listing every saved and every
   skipped record (with the reason for the skip).

This matches the spec exactly:

> *MIS data Primary key already available in category Sync Primary key column then
> particular record will be skip and other record will be entered then report will
> show at end of sync this record already available and these record will save.*

---

## 3. Key design points

- **Separate Sync Primary Key column** — `categories.mis_id` (`NVARCHAR(100)`,
  `UNIQUE`) is independent of the local `categories.id` (auto-increment `INT`).
  Local records created manually have `mis_id = NULL`. MIS-synced records carry
  the MIS PK as a string so it works whether MIS uses numeric or alphanumeric ids.
- **`source` column** distinguishes `MANUAL` vs `MIS` records (visible as a badge).
- **DB-level safety net** — `UNIQUE(mis_id)` and `UNIQUE(name)` constraints stop
  duplicates even if two simultaneous syncs try to insert the same row.
- **Admin-only** — both the page route (`AdminRoute`) and the backend mutating
  endpoints (`adminOnly` middleware) gate every write.

---

## 4. Files added / changed

### Added
- `backend/src/routes/categories.js` — REST endpoints + MIS sync logic
- `src/pages/admin/CategoriesPage.tsx` — full Admin UI
- `src/api/categoriesApi.ts` — typed frontend client
- `PHASE_2_4_DATABASE_MIGRATION.sql` — one-off SQL migration script
- `PHASE_2_4_CHANGES.md` — this document

### Modified
- `backend/src/server.js` — registers `/api/categories`
- `backend/src/db/init.js` — auto-creates the `categories` table on boot
- `backend/.env` — new `MIS_CATEGORY_API_URL` / `MIS_API_KEY` keys
- `src/App.tsx` — registers `/admin/categories` route
- `src/components/layout/Sidebar.tsx` — adds **Categories** sidebar item
- `src/types/index.ts` — adds `Category` and `CategorySyncReport` interfaces
- `.env` — `VITE_APP_VERSION` bumped to `2.4.0`

---

## 5. Deployment

1. Run the migration on the SQL Server database:
   ```bash
   sqlcmd -S <host> -U <user> -P <pwd> -d <db> -i PHASE_2_4_DATABASE_MIGRATION.sql
   ```
   (Or just restart the backend — `init.js` will create the table automatically.)
2. Set `MIS_CATEGORY_API_URL` (and optionally `MIS_API_KEY`) in `backend/.env`.
3. Restart backend and frontend.
4. Log in as **Admin** → **Categories** in the sidebar.
