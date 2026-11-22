-- TydBase dev seed for SQL Server 2022. Run by the one-shot mssql-seed container.
IF DB_ID('tydbase_dev') IS NULL CREATE DATABASE tydbase_dev;
GO
USE tydbase_dev;
GO
IF OBJECT_ID('dbo.workspaces') IS NULL
BEGIN
  CREATE TABLE dbo.workspaces (
    id INT IDENTITY PRIMARY KEY,
    slug NVARCHAR(64) UNIQUE NOT NULL,
    [plan] NVARCHAR(32) NOT NULL,
    region NVARCHAR(32) NOT NULL,
    created_at DATE NOT NULL
  );
  INSERT INTO dbo.workspaces (slug, [plan], region, created_at) VALUES
    (N'northstar-labs', N'cloud-pro', N'us-east-1', '2026-04-12'),
    (N'kestrel-pay', N'cloud-pro', N'eu-central-1', '2026-06-03'),
    (N'harbor-ml', N'self-hosted', N'ap-southeast-1', '2026-08-19'),
    (N'verve-commerce', N'cloud-hobby', N'us-west-2', '2026-10-05');
END
GO
