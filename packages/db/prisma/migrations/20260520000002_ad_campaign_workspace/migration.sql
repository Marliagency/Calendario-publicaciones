-- Migration: workspaceId en AdCampaign
-- AdCampaign quedó sin workspaceId en la migración anterior. Lo añadimos aquí
-- con el mismo patrón: DEFAULT 'ws_qyro' para backfill, DROP DEFAULT al final.

BEGIN;

ALTER TABLE "AdCampaign"
  ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro'
  REFERENCES "Workspace"("id") ON DELETE CASCADE;

CREATE INDEX "AdCampaign_workspaceId_idx" ON "AdCampaign"("workspaceId");

ALTER TABLE "AdCampaign" ALTER COLUMN "workspaceId" DROP DEFAULT;

COMMIT;
