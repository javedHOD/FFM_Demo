-- ============================================================
-- FieldForce Enterprise — Phase 2.5 Database Migration
-- Target  : Microsoft SQL Server / MSSQL
-- Feature : Product Management + MIS Sync (depends on Phase 2.4 categories table)
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='products')
BEGIN
  CREATE TABLE products (
    id              INT           PRIMARY KEY IDENTITY(1,1),  -- local PK
    mis_id          NVARCHAR(100) NULL,                       -- *** MIS Sync Primary Key (kept separate) ***
    name            NVARCHAR(255) NOT NULL,
    code            NVARCHAR(100) NULL,
    description     NVARCHAR(1000) NULL,
    unit_price      DECIMAL(18,2) NULL,
    uom             NVARCHAR(50)  NULL,
    category_id     INT           NOT NULL,
    category_mis_id NVARCHAR(100) NULL,                       -- traceability copy of MIS category id at sync time
    is_active       BIT           DEFAULT 1,
    is_discontinued BIT           DEFAULT 0,
    discontinued_at DATETIME      NULL,
    source          NVARCHAR(20)  DEFAULT 'MANUAL',           -- MANUAL | MIS
    synced_at       DATETIME      NULL,
    created_at      DATETIME      DEFAULT GETDATE(),
    updated_at      DATETIME      DEFAULT GETDATE(),
    CONSTRAINT uq_products_mis_id   UNIQUE (mis_id),
    CONSTRAINT uq_products_cat_name UNIQUE (category_id, name),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE NO ACTION
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_products_mis_id' AND object_id=OBJECT_ID('products'))
  CREATE INDEX IX_products_mis_id ON products(mis_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_products_category' AND object_id=OBJECT_ID('products'))
  CREATE INDEX IX_products_category ON products(category_id, is_active, is_discontinued);
GO
