-- ============================================================
-- FieldForce Enterprise — Phase 1.1 Database Migration
-- Target: Microsoft SQL Server / MSSQL
-- Run against the existing FieldForce database before deploying Phase 1.1 backend.
-- ============================================================

-- 1) Shop registration new fields
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'contact_person')
  ALTER TABLE shops ADD contact_person NVARCHAR(255) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'contact_no')
  ALTER TABLE shops ADD contact_no NVARCHAR(50) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'contact_no_2')
  ALTER TABLE shops ADD contact_no_2 NVARCHAR(50) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('shops') AND name = 'ntn_no')
  ALTER TABLE shops ADD ntn_no NVARCHAR(100) NULL;
GO

-- 2) Unique shop name validation at DB level
-- If duplicates already exist, clean them first, then re-run this block.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_shops_shop_name' AND object_id = OBJECT_ID('shops'))
   AND NOT EXISTS (SELECT shop_name FROM shops GROUP BY shop_name HAVING COUNT(*) > 1)
  CREATE UNIQUE INDEX UX_shops_shop_name ON shops(shop_name);
GO

-- 3) Promoter multi-region assignment
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='user_regions')
CREATE TABLE user_regions (
  user_id    INT NOT NULL,
  region_id  INT NOT NULL,
  created_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT pk_user_regions PRIMARY KEY (user_id, region_id),
  CONSTRAINT fk_user_regions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_regions_region FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE
);
GO

-- 4) Multiple items per order
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='order_items')
CREATE TABLE order_items (
  id           INT           PRIMARY KEY IDENTITY(1,1),
  order_id     INT           NOT NULL,
  product_name NVARCHAR(255) NOT NULL,
  quantity     INT           NOT NULL,
  created_at   DATETIME      DEFAULT GETDATE(),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
GO

-- 5) Optional backfill for existing single-item orders
INSERT INTO order_items (order_id, product_name, quantity)
SELECT o.id, o.product_name, o.quantity
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)
  AND o.product_name IS NOT NULL
  AND o.quantity IS NOT NULL;
GO
