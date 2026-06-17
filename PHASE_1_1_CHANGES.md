# FieldForce Enterprise — Phase 1.1 Changes

This project has been updated from Phase 1 to **Phase 1.1**.

## Admin Portal — Shop Registration

Added the following fields to shop registration/editing:

- Contact Person
- Contact No
- Contact No 2
- NTN No

Also added shop-name uniqueness validation:

- Frontend validation checks duplicate shop names before save.
- Backend API validates duplicate shop names on create/update.
- Database migration creates a unique index for `shops.shop_name` when existing data has no duplicates.

## Admin Portal — Promoter Multi-Region Assignment

Added option in Admin > Users to assign multiple regions to a Promoter.

Implementation details:

- New `user_regions` junction table.
- User API accepts `regionIds`.
- User list displays assigned multi-regions.
- Promoter shop loading now includes:
  - directly assigned shops,
  - shops in the user's primary region,
  - shops in all assigned multi-regions.

## Promoter Portal / App — Order Creation

Enhanced order creation for the Promoter portal and Capacitor app:

- Item search while creating an order.
- Multiple items can be added in one order.
- Each item has its own quantity.
- Order details display item-wise quantity.

Implementation details:

- New `order_items` table.
- Orders API accepts `items: [{ productName, quantity }]`.
- Existing order fields `product_name` and `quantity` remain as summary fields for backward compatibility.
- Existing reports/admin screens continue to work with the summary values.

## Build Result

Frontend production build verified successfully after modifications:

```bash
npm run build
```

Result: successful Vite single-file build.
