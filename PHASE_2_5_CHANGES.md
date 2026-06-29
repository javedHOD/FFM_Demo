# FieldForce Enterprise — Phase 2.5 Changes

This release adds the **Product Management** module with external **MIS Sync**, sitting on top of the Phase 2.4 Category module.

---

## 1. New Module: Product Management (Admin)

Route: `/admin/products` (sidebar entry **Products**, Admin role only)

The Admin user can:

| Action          | UI                                              | API                                  |
| --------------- | ----------------------------------------------- | ------------------------------------ |
| **Create**      | “Add Product” button → modal form              | `POST /api/products`                 |
| **Update**      | Edit (pencil) icon on each row → modal form     | `PUT  /api/products/:id`             |
| **Discontinue** | Ban icon → confirm dialog (soft-deactivate)    | `PATCH /api/products/:id/discontinue` |
| **Reactivate**  | Refresh icon (only on discontinued rows)       | `PATCH /api/products/:id/reactivate`  |

Form fields: **Name** *(required, unique within category)*, **Code**, **Category** *(required, dropdown of active categories)*, **Unit Price**, **UOM**, **Description**, **Active**.

`Discontinue` is a *soft* operation — record stays for history.

---

## 2. New: Sync from MIS button (Products)

A **Sync from MIS** button at the top of the Products page triggers a two-phase server-side flow:

### Phase A — PRE-CHECK (categories must exist first)

1. Backend fetches the product list from the URL in `MIS_PRODUCT_API_URL`.
2. For every incoming product, it reads the `category_id` / `categoryMisId` field.
3. Each of those MIS category ids is looked up in our `categories.mis_id` column.
4. **If even one MIS category id is missing**, the sync is **HALTED immediately** — no products are inserted. The backend responds with:

   ```json
   HTTP 409
   {
     "success": false,
     "code":    "CATEGORIES_NOT_SYNCED",
     "message": "Kindly sync category first. ...",
     "report": {
       "totalReceived": 120,
       "missingCategoryCount": 3,
       "missingCategories": [
         { "categoryMisId": "C-1007", "productCount": 12 },
         { "categoryMisId": "C-1011", "productCount":  4 },
         { "categoryMisId": "C-1098", "productCount": 23 }
       ]
     }
   }
   ```

   The UI shows this in a modal with the message **“Kindly sync category first.”** plus a table of every new (not-yet-synced) MIS category id and a button to jump straight to the Categories page.

### Phase B — IMPORT (only if every category is present)

For every incoming product:
- If `products.mis_id` already contains the incoming MIS PK → **UPDATE** the row in place (name, code, description, price, uom, category mapping).
- Otherwise → **INSERT** as a brand-new product (`source = 'MIS'`, `synced_at = GETDATE()`).
- Rows that fail validation (no MIS id, no name, no category id) are **skipped** with a clear reason.

At the end of sync, the backend returns:

```json
{
  "success": true,
  "message": "Sync complete — 18 inserted, 41 updated, 2 skipped.",
  "report": {
    "totalReceived": 61,
    "inserted": 18,
    "updated":  41,
    "skipped":   2,
    "insertedRecords": [ { "id": 142, "misId": "P-9001", "name": "iPhone 15", "categoryMisId": "C-1001" }, ... ],
    "updatedRecords":  [ { "id":  42, "misId": "P-8002", "name": "Galaxy S24",  "categoryMisId": "C-1002" }, ... ],
    "skippedRecords":  [ { "misId": null, "name": "", "reason": "Missing MIS primary key in source record" }, ... ]
  }
}
```

The UI displays this in a **Sync Report modal** with:
- 4 summary cards: **Received / Inserted / Updated / Skipped**
- Three tables: every inserted record, every updated record, every skipped record (with the reason).

This implements your full spec:

> *Product ID and Category id will be available in api data check. first check all MIS Category id should be available in db category mis_id. If not available then show message “Kindly sync category first.” and generate report these are new category not synced. Second all category mis_id available in db then check product mis_id if product is available then data will update and if not available then data will insert. at the end of sync report will generate these data update and these data inserted.*

---

## 3. Key design points

- **Separate Sync Primary Key column** — `products.mis_id` (`NVARCHAR(100)`, `UNIQUE`) is independent of `products.id`. Manual products leave it `NULL`. MIS products carry the MIS PK as a string.
- **Traceability** — every MIS-imported product also stores the original `category_mis_id` it came with, so you can always audit the MIS↔DB mapping.
- **Category FK** — `products.category_id` references our local `categories.id`, resolved at sync time from `categories.mis_id`.
- **Atomic pre-check** — the entire payload is validated against the categories table *before* any product is touched. If the pre-check fails, the DB is untouched.
- **Idempotent** — running the same sync twice is safe; the second run will simply UPDATE rows it already inserted on the first run.
- **Admin-only** — page route is `AdminRoute`, all mutating endpoints use `adminOnly` middleware.

---

## 4. Files added / changed

### Added
- `backend/src/routes/products.js` — REST endpoints + MIS sync with category pre-check
- `src/pages/admin/ProductsPage.tsx` — full Admin UI (table, modal form, sync, two report modals)
- `src/api/productsApi.ts` — typed frontend client (returns either *blocked* or *ok* sync result)
- `PHASE_2_5_DATABASE_MIGRATION.sql` — one-off SQL migration script
- `PHASE_2_5_CHANGES.md` — this document

### Modified
- `backend/src/server.js` — registers `/api/products`
- `backend/src/db/init.js` — auto-creates the `products` table on boot
- `backend/.env` — new key `MIS_PRODUCT_API_URL`
- `src/App.tsx` — registers `/admin/products` route
- `src/components/layout/Sidebar.tsx` — adds **Products** sidebar item
- `src/types/index.ts` — adds `Product`, `ProductSyncReport`, `ProductSyncBlockedReport`
- `.env` — `VITE_APP_VERSION` bumped to `2.5.0`

---

## 5. Deployment

1. **Run Phase 2.4 first** if you haven't already (categories table is a hard dependency).
2. Run the Phase 2.5 migration on the SQL Server database:
   ```bash
   sqlcmd -S <host> -U <user> -P <pwd> -d <db> -i PHASE_2_5_DATABASE_MIGRATION.sql
   ```
   (Or just restart the backend — `init.js` will create the table automatically.)
3. Set `MIS_PRODUCT_API_URL` (and optional `MIS_API_KEY`) in `backend/.env`.
4. Restart backend and frontend.
5. Log in as **Admin** → **Products** in the sidebar.

---

## 6. Note on the last spec bullet

The final bullet of the v2.5 spec restates the v2.4 *“skip if exists”* rule but references the **category** Sync PK column. The four bullets above it are specific to products and call for **UPSERT** behaviour (insert new, update existing). This release implements **UPSERT for products** (matches the explicit step-by-step requirement) and keeps the v2.4 *skip* rule for categories unchanged. If you actually want products to be *skipped* when the MIS PK already exists (instead of updated), let me know and I'll flip a single branch in `routes/products.js`.
