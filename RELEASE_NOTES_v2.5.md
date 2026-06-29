# FieldForce Enterprise v2.5 — Release Notes

**Release date:** 2026-06-24
**Codename:** *Product Management & MIS Sync (with Category pre-check)*

---

## ✨ What's new in 2.5

### 1. Product Management module (Admin)
- New sidebar entry **Products** at `/admin/products` (Admin role only)
- **Create / Update / Discontinue / Reactivate** products
- Fields: Name, Code, Category (required), Unit Price, UOM, Description, Active
- Names are unique within a category

### 2. MIS Sync button (Products) — two-phase
1. **Pre-check (categories)**
   - Reads every incoming product's MIS category id
   - Looks it up in `categories.mis_id`
   - If any is missing → sync is **halted**; UI shows *“Kindly sync category first”* + a list of every missing MIS category id with affected product counts and a one-click button to jump to Categories
2. **Upsert (products)** *(only if every category is present)*
   - `products.mis_id` exists → **UPDATE** the row in place
   - `products.mis_id` missing → **INSERT** new row
   - Invalid rows are skipped with a clear reason

### 3. End-of-sync report
A modal with 4 summary cards (Received / Inserted / Updated / Skipped) and three detail tables (every inserted, updated, and skipped record with reasons).

### 4. Separate Sync Primary Key column
`products.mis_id NVARCHAR(100) UNIQUE` — completely independent of the local auto-increment `id`. Records also retain `category_mis_id` for traceability of the original MIS mapping.

---

## 🗂️ Files added in v2.5

| Layer | File |
|---|---|
| Backend | `backend/src/routes/products.js` |
| Frontend | `src/pages/admin/ProductsPage.tsx` |
| Frontend | `src/api/productsApi.ts` |
| SQL | `PHASE_2_5_DATABASE_MIGRATION.sql` |
| Docs | `PHASE_2_5_CHANGES.md` |
| Docs | `RELEASE_NOTES_v2.5.md` (this file) |

## 🔧 Files modified in v2.5

- `backend/src/server.js` — registers `/api/products`
- `backend/src/db/init.js` — auto-creates `products` table on boot
- `backend/.env` — new key `MIS_PRODUCT_API_URL`
- `src/App.tsx` — registers `/admin/products`
- `src/components/layout/Sidebar.tsx` — adds **Products** entry
- `src/types/index.ts` — adds `Product`, `ProductSyncReport`, `ProductSyncBlockedReport`
- `.env` — `VITE_APP_VERSION=2.5.0`
- `package.json`, `backend/package.json`, `PROJECT_MANIFEST.json` — version 2.5.0

---

## 🚀 Deployment

```bash
unzip FFM_Demo_v2.5_source.zip
cd FFM_Demo_v2.5

# Backend
cd backend
npm install
# edit .env → set MIS_PRODUCT_API_URL=<your MIS endpoint>
# (and MIS_CATEGORY_API_URL from v2.4 if not already set)
npm start            # auto-creates products table

# Frontend (dev)
cd ..
npm install
npm run dev          # http://localhost:5173

# OR ship the pre-built bundle in dist/index.html
```

> **Important**: products depend on the v2.4 categories table. If you skip v2.4 the products table can't be created (FK to `categories.id`).

---

## ✅ Verification

- `node --check` passes on every new backend file
- `tsc --noEmit` clean for all new files
- `npm run build` succeeds → `dist/index.html` (1.37 MB / 384 KB gzipped, 2 961 modules)
