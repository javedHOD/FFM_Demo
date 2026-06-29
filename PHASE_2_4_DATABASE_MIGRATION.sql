-- ============================================================
-- FieldForce Enterprise — Phase 2.4 Database Migration
-- Target  : Microsoft SQL Server / MSSQL
-- Feature : Category Management + MIS Sync
-- Run against the existing FieldForce database before deploying
-- the Phase 2.4 backend.
-- ============================================================

-- 1) Categories master table
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='categories')
BEGIN
  CREATE TABLE categories (
    id              INT           PRIMARY KEY IDENTITY(1,1),  -- local PK
    mis_id          NVARCHAR(100) NULL,                       -- *** MIS Sync Primary Key (kept separate) ***
    name            NVARCHAR(255) NOT NULL,
    code            NVARCHAR(100) NULL,
    description     NVARCHAR(1000) NULL,
    is_active       BIT           DEFAULT 1,
    is_discontinued BIT           DEFAULT 0,
    discontinued_at DATETIME      NULL,
    source          NVARCHAR(20)  DEFAULT 'MANUAL',           -- MANUAL | MIS
    synced_at       DATETIME      NULL,
    created_at      DATETIME      DEFAULT GETDATE(),
    updated_at      DATETIME      DEFAULT GETDATE(),
    CONSTRAINT uq_categories_name   UNIQUE (name),
    CONSTRAINT uq_categories_mis_id UNIQUE (mis_id)            -- guarantees the “skip if exists” rule at DB level too
  );
END
GO

-- 2) Helpful indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_categories_mis_id' AND object_id=OBJECT_ID('categories'))
  CREATE INDEX IX_categories_mis_id ON categories(mis_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_categories_is_active' AND object_id=OBJECT_ID('categories'))
  CREATE INDEX IX_categories_is_active ON categories(is_active, is_discontinued);
GO
