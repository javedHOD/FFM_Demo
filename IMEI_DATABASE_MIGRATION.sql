-- ============================================================
-- FieldForce Enterprise — IMEI Verification Table Migration
-- Target: Microsoft SQL Server / MSSQL
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='IMEIVerificationLog')
CREATE TABLE IMEIVerificationLog
(
    IMEIVerificationLogId NVARCHAR(50) NOT NULL PRIMARY KEY,
    CompanyId NVARCHAR(50) NULL,
    PromoterUserId NVARCHAR(50) NULL,
    PromoterName NVARCHAR(200) NULL,
    VisitId NVARCHAR(50) NULL,
    ShopId NVARCHAR(50) NULL,
    ShopName NVARCHAR(200) NULL,
    Region NVARCHAR(200) NULL,
    City NVARCHAR(200) NULL,
    ScanIMEI NVARCHAR(50) NULL,
    InvoiceNo NVARCHAR(100) NULL,
    InvoiceDate DATETIME NULL,
    CustomerName NVARCHAR(200) NULL,
    ApiCompanyName NVARCHAR(200) NULL,
    ProductName NVARCHAR(200) NULL,
    ProductCategory NVARCHAR(200) NULL,
    Lat DECIMAL(18, 8) NULL,
    Long DECIMAL(18, 8) NULL,
    ScanDatetime DATETIME NOT NULL DEFAULT GETDATE(),
    ApiResponse NVARCHAR(MAX) NULL,
    IsDummy BIT NOT NULL DEFAULT 0,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CreatedBy NVARCHAR(50) NULL,
    CreatedDate DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- Indexes for reporting performance
CREATE INDEX IX_IMEI_ScanDatetime ON IMEIVerificationLog(ScanDatetime DESC);
CREATE INDEX IX_IMEI_PromoterUserId ON IMEIVerificationLog(PromoterUserId);
CREATE INDEX IX_IMEI_ShopId ON IMEIVerificationLog(ShopId);
CREATE INDEX IX_IMEI_ScanIMEI ON IMEIVerificationLog(ScanIMEI);
CREATE INDEX IX_IMEI_IsDeleted ON IMEIVerificationLog(IsDeleted);
CREATE INDEX IX_IMEI_Composite ON IMEIVerificationLog(VisitId, ScanIMEI, IsDeleted);
GO

-- Admin settings for IMEI verification
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE type='U' AND name='admin_settings')
CREATE TABLE admin_settings
(
    id                INT           PRIMARY KEY IDENTITY(1,1),
    duplication_check BIT           NOT NULL DEFAULT 0,
    updated_at        DATETIME      DEFAULT GETDATE(),
    updated_by        NVARCHAR(255) NULL
);
GO

IF NOT EXISTS (SELECT 1 FROM admin_settings)
    INSERT INTO admin_settings (duplication_check) VALUES (0);
GO
