-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram', 'facebook', 'tiktok');

-- CreateEnum
CREATE TYPE "SocialAccountStatus" AS ENUM ('ACTIVE', 'NEEDS_REAUTH', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "ContentFormat" AS ENUM ('image', 'carousel', 'reel', 'ugc_video', 'app_demo', 'lifestyle_ad');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ANALYZED', 'FAILED');

-- CreateEnum
CREATE TYPE "BoostObjective" AS ENUM ('REACH', 'VIDEO_VIEWS', 'TRAFFIC', 'CONVERSIONS', 'FOLLOWERS');

-- CreateEnum
CREATE TYPE "PlatformVariantKind" AS ENUM ('tiktok', 'instagram_reel', 'instagram_feed', 'instagram_story', 'facebook_feed', 'facebook_reel');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video', 'carousel');

-- CreateEnum
CREATE TYPE "PublishJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdCampaignStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MetricKind" AS ENUM ('ORGANIC', 'PAID');

-- CreateEnum
CREATE TYPE "QCRuleType" AS ENUM ('HOOK_IN_3S', 'CTA_PRESENT', 'HASHTAG_LIMIT', 'CAPTION_TYPOS', 'MUSIC_LICENSE', 'THUMBNAIL_TEXT_READABLE', 'PLATFORM_DURATION', 'PLATFORM_RATIO', 'CUSTOM_SCRIPT');

-- CreateEnum
CREATE TYPE "QCRuleSeverity" AS ENUM ('BLOCKER', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "NotificationChannelKind" AS ENUM ('PUSH', 'EMAIL', 'SLACK', 'TELEGRAM', 'WEBHOOK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "businessId" TEXT,
    "pageId" TEXT,
    "igUserId" TEXT,
    "ttAdvertiserId" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "SocialAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerPersona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "pains" TEXT[],
    "jtbdFunctional" TEXT NOT NULL,
    "jtbdEmotional" TEXT NOT NULL,
    "jtbdSocial" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "preferredPlatforms" TEXT[],
    "workingHooks" TEXT[],
    "isProTarget" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "kpi" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPiece" (
    "id" TEXT NOT NULL,
    "externalRef" TEXT,
    "title" TEXT NOT NULL,
    "format" "ContentFormat" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "campaignId" TEXT,
    "conceptId" TEXT,
    "frameworkUsed" TEXT,
    "hookUsed" TEXT,
    "qcChecklistJson" JSONB,
    "boostBudgetEur" DECIMAL(8,2),
    "boostDurationDays" INTEGER,
    "boostObjective" "BoostObjective",
    "boostAudiencePresetId" TEXT,
    "creativeRunMetadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPieceBuyerPersona" (
    "contentPieceId" TEXT NOT NULL,
    "buyerPersonaId" TEXT NOT NULL,

    CONSTRAINT "ContentPieceBuyerPersona_pkey" PRIMARY KEY ("contentPieceId","buyerPersonaId")
);

-- CreateTable
CREATE TABLE "PlatformVariant" (
    "id" TEXT NOT NULL,
    "contentPieceId" TEXT NOT NULL,
    "kind" "PlatformVariantKind" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "ratio" TEXT NOT NULL,
    "durationS" INTEGER,
    "caption" TEXT,
    "hashtags" TEXT[],
    "firstComment" TEXT,
    "musicRef" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "platformPostId" TEXT,
    "platformVideoId" TEXT,
    "socialAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishJob" (
    "id" TEXT NOT NULL,
    "platformVariantId" TEXT NOT NULL,
    "status" "PublishJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "containerId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "platformVariantId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "externalCampaignId" TEXT,
    "externalAdsetId" TEXT,
    "externalAdId" TEXT,
    "dailyBudgetCents" INTEGER,
    "lifetimeBudgetCents" INTEGER,
    "status" "AdCampaignStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "spendCents" INTEGER NOT NULL DEFAULT 0,
    "audiencePresetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoostSpendLedger" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "platform" "Platform" NOT NULL,
    "spendCents" INTEGER NOT NULL DEFAULT 0,
    "committedCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoostSpendLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudiencePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geo" TEXT[],
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "languages" TEXT[],
    "interestsMeta" TEXT[],
    "interestsTiktok" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "behaviors" TEXT[],
    "placementsRecommended" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudiencePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "platformVariantId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "MetricKind" NOT NULL,
    "dataJson" JSONB NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QCRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "appliesToFormats" "ContentFormat"[],
    "appliesToPlatforms" "PlatformVariantKind"[],
    "ruleType" "QCRuleType" NOT NULL,
    "paramsJson" JSONB,
    "severity" "QCRuleSeverity" NOT NULL DEFAULT 'WARNING',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QCRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "actorUserId" TEXT,
    "comment" TEXT,
    "metadataJson" JSONB,
    "contentPieceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL,
    "kind" "NotificationChannelKind" NOT NULL,
    "target" TEXT NOT NULL,
    "eventsSubscribed" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "channelKind" "NotificationChannelKind" NOT NULL,
    "event" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_platform_handle_key" ON "SocialAccount"("platform", "handle");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPiece_externalRef_key" ON "ContentPiece"("externalRef");

-- CreateIndex
CREATE INDEX "ContentPiece_status_idx" ON "ContentPiece"("status");

-- CreateIndex
CREATE INDEX "ContentPiece_campaignId_idx" ON "ContentPiece"("campaignId");

-- CreateIndex
CREATE INDEX "ContentPiece_createdAt_idx" ON "ContentPiece"("createdAt");

-- CreateIndex
CREATE INDEX "PlatformVariant_scheduledAt_idx" ON "PlatformVariant"("scheduledAt");

-- CreateIndex
CREATE INDEX "PlatformVariant_kind_idx" ON "PlatformVariant"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformVariant_contentPieceId_kind_key" ON "PlatformVariant"("contentPieceId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PublishJob_idempotencyKey_key" ON "PublishJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PublishJob_status_scheduledAt_idx" ON "PublishJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "AdCampaign_status_idx" ON "AdCampaign"("status");

-- CreateIndex
CREATE INDEX "AdCampaign_startedAt_idx" ON "AdCampaign"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BoostSpendLedger_date_platform_key" ON "BoostSpendLedger"("date", "platform");

-- CreateIndex
CREATE INDEX "Metric_platformVariantId_fetchedAt_idx" ON "Metric"("platformVariantId", "fetchedAt");

-- CreateIndex
CREATE INDEX "Metric_kind_idx" ON "Metric"("kind");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_contentPieceId_idx" ON "AuditLog"("contentPieceId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_deliveredAt_idx" ON "NotificationDelivery"("deliveredAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_readAt_idx" ON "NotificationDelivery"("readAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_boostAudiencePresetId_fkey" FOREIGN KEY ("boostAudiencePresetId") REFERENCES "AudiencePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPieceBuyerPersona" ADD CONSTRAINT "ContentPieceBuyerPersona_contentPieceId_fkey" FOREIGN KEY ("contentPieceId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPieceBuyerPersona" ADD CONSTRAINT "ContentPieceBuyerPersona_buyerPersonaId_fkey" FOREIGN KEY ("buyerPersonaId") REFERENCES "BuyerPersona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformVariant" ADD CONSTRAINT "PlatformVariant_contentPieceId_fkey" FOREIGN KEY ("contentPieceId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformVariant" ADD CONSTRAINT "PlatformVariant_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishJob" ADD CONSTRAINT "PublishJob_platformVariantId_fkey" FOREIGN KEY ("platformVariantId") REFERENCES "PlatformVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_platformVariantId_fkey" FOREIGN KEY ("platformVariantId") REFERENCES "PlatformVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_audiencePresetId_fkey" FOREIGN KEY ("audiencePresetId") REFERENCES "AudiencePreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_platformVariantId_fkey" FOREIGN KEY ("platformVariantId") REFERENCES "PlatformVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_contentPieceId_fkey" FOREIGN KEY ("contentPieceId") REFERENCES "ContentPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;
