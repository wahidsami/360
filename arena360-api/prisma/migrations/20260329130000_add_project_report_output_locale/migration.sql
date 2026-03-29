ALTER TABLE "ProjectReport"
ADD COLUMN "outputLocale" TEXT NOT NULL DEFAULT 'en';

UPDATE "ProjectReport" pr
SET "outputLocale" = CASE
  WHEN LOWER(COALESCE(tv."schemaJson"->'locale'->>'primary', tv."pdfConfigJson"->>'locale', 'en')) LIKE 'ar%'
    THEN 'ar'
  ELSE 'en'
END
FROM "ReportBuilderTemplateVersion" tv
WHERE pr."templateVersionId" = tv."id";

CREATE INDEX "ProjectReport_outputLocale_idx" ON "ProjectReport"("outputLocale");

ALTER TABLE "ProjectReportExport"
ADD COLUMN "outputLocale" TEXT NOT NULL DEFAULT 'en';

UPDATE "ProjectReportExport" pre
SET "outputLocale" = CASE
  WHEN LOWER(COALESCE(fa."filename", '')) LIKE '%-ar.pdf'
    THEN 'ar'
  ELSE 'en'
END
FROM "FileAsset" fa
WHERE pre."fileAssetId" = fa."id";

CREATE INDEX "ProjectReportExport_outputLocale_idx" ON "ProjectReportExport"("outputLocale");
