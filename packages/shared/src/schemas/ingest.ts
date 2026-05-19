import { z } from 'zod';

const ratioSchema = z.enum(['1:1', '4:5', '9:16', '16:9']);

const platformVariantPayloadSchema = z.object({
  media_url: z.string().url(),
  ratio: ratioSchema,
  duration_s: z.number().int().positive().optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  first_comment: z.string().optional(),
  music_ref: z.string().nullable().optional(),
});

export const platformVariantsPayloadSchema = z.object({
  tiktok: platformVariantPayloadSchema.optional(),
  instagram_reel: platformVariantPayloadSchema.optional(),
  instagram_feed: platformVariantPayloadSchema.optional(),
  instagram_story: platformVariantPayloadSchema.optional(),
  facebook_feed: platformVariantPayloadSchema.optional(),
  facebook_reel: platformVariantPayloadSchema.optional(),
});

const isoDateString = z.string().datetime({ offset: true });

export const suggestedScheduleSchema = z
  .object({
    tiktok: isoDateString.optional(),
    instagram_reel: isoDateString.optional(),
    instagram_feed: isoDateString.optional(),
    instagram_story: isoDateString.optional(),
    facebook_feed: isoDateString.optional(),
    facebook_reel: isoDateString.optional(),
  })
  .partial();

export const ingestPayloadSchema = z.object({
  external_ref: z.string().uuid(),
  title: z.string().min(1).max(200),
  format: z.enum(['image', 'carousel', 'reel', 'ugc_video', 'app_demo', 'lifestyle_ad']),
  buyer_persona_ids: z.array(z.string().min(1)).default([]),
  campaign_id: z.string().nullable().optional(),
  concept_id: z.string().nullable().optional(),
  framework_used: z.string().nullable().optional(),
  hook_used: z.string().nullable().optional(),
  platform_variants: platformVariantsPayloadSchema,
  suggested_schedule: suggestedScheduleSchema.optional(),
  creative_run_metadata: z.record(z.unknown()).optional(),
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
export type PlatformVariantPayload = z.infer<typeof platformVariantPayloadSchema>;
