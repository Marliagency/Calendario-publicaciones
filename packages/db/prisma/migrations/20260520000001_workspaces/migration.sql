-- Migration: multi-workspace
-- Añade Workspace, WorkspaceMember, WorkspaceApiKey y workspaceId a todas las
-- tablas de contenido. Los datos existentes se asignan al workspace 'ws_qyro'.

BEGIN;

-- ── Enums ─────────────────────────────────────────────────────────────────────
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- ── Workspace ──────────────────────────────────────────────────────────────────
CREATE TABLE "Workspace" (
  "id"                  TEXT NOT NULL,
  "slug"                TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "description"         TEXT,
  "brandColorPrimary"   TEXT NOT NULL DEFAULT '#3B82F6',
  "brandColorSecondary" TEXT NOT NULL DEFAULT '#7C5CFC',
  "brandLogoUrl"        TEXT,
  "defaultTimezone"     TEXT NOT NULL DEFAULT 'Europe/Madrid',
  "defaultLanguage"     TEXT NOT NULL DEFAULT 'es-ES',
  "dailyBoostCapEur"    DECIMAL(8,2) NOT NULL DEFAULT 5,
  "monthlyBoostCapEur"  DECIMAL(8,2) NOT NULL DEFAULT 150,
  "status"              "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId"     TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- Insertar workspaces iniciales (los registros existentes se asignarán aquí).
INSERT INTO "Workspace" ("id", "slug", "name", "description", "brandColorPrimary", "brandColorSecondary", "status", "updatedAt")
VALUES
  ('ws_qyro', 'qyro', 'QYRO', 'Calendario social de QYRO', '#3B82F6', '#7C5CFC', 'ACTIVE', CURRENT_TIMESTAMP),
  ('ws_diego-personal', 'diego-personal', 'Diego personal', 'Cuenta personal de Diego', '#111111', '#444444', 'ACTIVE', CURRENT_TIMESTAMP);

-- ── WorkspaceMember ────────────────────────────────────────────────────────────
CREATE TABLE "WorkspaceMember" (
  "id"           TEXT NOT NULL,
  "workspaceId"  TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "role"         "WorkspaceRole" NOT NULL DEFAULT 'EDITOR',
  "invitedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt"   TIMESTAMP(3),
  "lastActiveAt" TIMESTAMP(3),
  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE,
  CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- ── WorkspaceApiKey ────────────────────────────────────────────────────────────
CREATE TABLE "WorkspaceApiKey" (
  "id"          TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "keyHash"     TEXT NOT NULL,
  "prefix"      TEXT NOT NULL,
  "name"        TEXT NOT NULL DEFAULT 'Estudio Creativo',
  "lastUsedAt"  TIMESTAMP(3),
  "revokedAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceApiKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "WorkspaceApiKey_keyHash_key" ON "WorkspaceApiKey"("keyHash");
CREATE INDEX "WorkspaceApiKey_workspaceId_idx" ON "WorkspaceApiKey"("workspaceId");

-- ── Añadir workspaceId a tablas existentes ────────────────────────────────────
-- Se usa DEFAULT 'ws_qyro' para asignar los datos actuales; el DEFAULT se quita al final.

ALTER TABLE "SocialAccount"       ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "ContentPiece"        ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "BuyerPersona"        ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "Campaign"            ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "QCRule"              ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "AuditLog"            ADD COLUMN "workspaceId" TEXT         DEFAULT 'ws_qyro'  REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "NotificationChannel" ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "AudiencePreset"           ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "BoostSpendLedger"         ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "NotificationDelivery"     ADD COLUMN "workspaceId" TEXT NOT NULL DEFAULT 'ws_qyro' REFERENCES "Workspace"("id") ON DELETE CASCADE;

-- ── Índices en workspaceId ────────────────────────────────────────────────────
CREATE INDEX "SocialAccount_workspaceId_idx"       ON "SocialAccount"("workspaceId");
CREATE INDEX "ContentPiece_workspaceId_status_idx" ON "ContentPiece"("workspaceId", status);
CREATE INDEX "BuyerPersona_workspaceId_idx"        ON "BuyerPersona"("workspaceId");
CREATE INDEX "Campaign_workspaceId_idx"             ON "Campaign"("workspaceId");
CREATE INDEX "QCRule_workspaceId_idx"              ON "QCRule"("workspaceId");
CREATE INDEX "AuditLog_workspaceId_idx"            ON "AuditLog"("workspaceId");
CREATE INDEX "NotificationChannel_workspaceId_idx" ON "NotificationChannel"("workspaceId");
CREATE INDEX "AudiencePreset_workspaceId_idx"           ON "AudiencePreset"("workspaceId");
CREATE INDEX "NotificationDelivery_workspaceId_idx"    ON "NotificationDelivery"("workspaceId");

-- ── Actualizar constraints únicos ──────────────────────────────────────────────
-- ContentPiece: externalRef pasa de globalmente único a único por workspace.
ALTER TABLE "ContentPiece" DROP CONSTRAINT IF EXISTS "ContentPiece_externalRef_key";
CREATE UNIQUE INDEX "ContentPiece_workspaceId_externalRef_key"
  ON "ContentPiece"("workspaceId", "externalRef")
  WHERE "externalRef" IS NOT NULL;

-- BoostSpendLedger: kill switch pasa a ser por workspace.
ALTER TABLE "BoostSpendLedger" DROP CONSTRAINT IF EXISTS "BoostSpendLedger_date_platform_key";
CREATE UNIQUE INDEX "BoostSpendLedger_workspaceId_date_platform_key"
  ON "BoostSpendLedger"("workspaceId", date, platform);

-- ── Quitar defaults de workspaceId (nuevos registros DEBEN proveerlo) ──────────
ALTER TABLE "SocialAccount"       ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "ContentPiece"        ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "BuyerPersona"        ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "Campaign"            ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "QCRule"              ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "NotificationChannel" ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "AudiencePreset"           ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "BoostSpendLedger"         ALTER COLUMN "workspaceId" DROP DEFAULT;
ALTER TABLE "NotificationDelivery"     ALTER COLUMN "workspaceId" DROP DEFAULT;

COMMIT;
