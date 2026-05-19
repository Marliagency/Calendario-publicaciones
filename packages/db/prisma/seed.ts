/**
 * Seed inicial del proyecto.
 *
 * Crea:
 *   - 1 usuario admin (con password hasheado con argon2id).
 *   - 2 BuyerPersonas reales de QYRO (Optimizador Consciente, Persona en Transición).
 *   - 1 Campaign demo "Lanzamiento Q3 2026".
 *   - 2 AudiencePresets (uno por persona).
 *   - Reglas QC por defecto.
 *   - 3 ContentPiece de ejemplo con variantes IG/TT/FB para poder demo-ear.
 *
 * Idempotente: usa upsert / connectOrCreate. Se puede re-ejecutar sin duplicados.
 */

import {
  ContentFormat,
  ContentStatus,
  Prisma,
  PrismaClient,
  QCRuleSeverity,
  QCRuleType,
} from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'diego@qyro.app';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme-on-first-login';
  const passwordHash = await hash(password, { type: 2 });

  return prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, displayName: 'Diego (admin)', isAdmin: true },
    update: { passwordHash, displayName: 'Diego (admin)', isAdmin: true },
  });
}

async function seedBuyerPersonas() {
  await prisma.buyerPersona.upsert({
    where: { id: 'persona-01-optimizador-consciente' },
    create: {
      id: 'persona-01-optimizador-consciente',
      name: 'El Optimizador Consciente',
      ageRange: '22-38',
      pains: [
        'Tengo 5 apps distintas y no las uso todas',
        'Empiezo hábitos y los abandono en 2 semanas',
        'No sé si mi entrenamiento está progresando',
        'Como sin control porque no registro lo que como',
        'Siento que no avanzo aunque me esfuerzo',
      ],
      jtbdFunctional: 'Unificar todas mis métricas de vida en un sitio',
      jtbdEmotional: 'Sentir que avanzo y tengo control',
      jtbdSocial: 'Verme como alguien disciplinado/a',
      tone: 'calmado, premium, inteligente, directo',
      preferredPlatforms: ['tiktok', 'instagram_reel', 'instagram_feed', 'youtube_shorts'],
      workingHooks: [
        'POV: 5 apps de salud abiertas y ninguna te dice si vas bien',
        'Habitica, MyFitnessPal, Strong, Notion — esto las sustituye todas',
        'Mi Life Score subió 40 puntos en 3 semanas',
        'Atomic Habits pero ejecutable',
      ],
      isProTarget: false,
    },
    update: {},
  });

  await prisma.buyerPersona.upsert({
    where: { id: 'persona-02-en-transicion' },
    create: {
      id: 'persona-02-en-transicion',
      name: 'La Persona en Transición',
      ageRange: '28-45',
      pains: [
        'Quiero empezar pero no sé por dónde',
        'Ya he intentado el gym 3 veces y siempre lo dejo',
        'Cuando llego del curro estoy fundido y no tengo cabeza para planificar',
        'Necesito a alguien que me diga qué comer hoy',
      ],
      jtbdFunctional: 'Tener una guía clara sin tener que planificar',
      jtbdEmotional: 'Reducir el peso mental de organizar mi vida',
      jtbdSocial: 'Volver a sentir control',
      tone: 'calmado, cercano, premium, sin jerga técnica',
      preferredPlatforms: [
        'instagram_reel',
        'instagram_feed',
        'facebook_feed',
        'facebook_reel',
        'youtube_long',
      ],
      workingHooks: [
        'Si has intentado ponerte en forma 3 veces y siempre lo dejas, mira esto',
        'La IA te dice qué comer, qué entrenar y a qué hora dormir',
        'Sin contar calorías a mano. Foto al plato y listo.',
        'Lunes 0 hábitos. Jueves 70%.',
      ],
      isProTarget: true,
    },
    update: {},
  });
}

async function seedAudiencePresets() {
  await prisma.audiencePreset.upsert({
    where: { id: 'audience_preset_qyro_optimizador_es' },
    create: {
      id: 'audience_preset_qyro_optimizador_es',
      name: 'Optimizador Consciente — ES/MX/AR/CO/CL',
      geo: ['ES', 'MX', 'AR', 'CO', 'CL'],
      ageMin: 22,
      ageMax: 38,
      languages: ['es'],
      interestsMeta: [
        'Personal development',
        'Productivity',
        'Self-improvement',
        'Atomic Habits',
        'James Clear',
        'Stoicism',
        'Fitness and wellness',
        'Weight training',
        'High-intensity interval training (HIIT)',
        'Habit (self-help)',
      ],
      behaviors: ['Engaged shoppers (tech early adopters)'],
      placementsRecommended: ['reels', 'feed', 'stories', 'tiktok_in_feed'],
    },
    update: {},
  });

  await prisma.audiencePreset.upsert({
    where: { id: 'audience_preset_qyro_transicion_es' },
    create: {
      id: 'audience_preset_qyro_transicion_es',
      name: 'Persona en Transición — ES/MX/AR/CO/CL',
      geo: ['ES', 'MX', 'AR', 'CO', 'CL'],
      ageMin: 28,
      ageMax: 45,
      languages: ['es'],
      interestsMeta: [
        'Healthy living',
        'Mental health awareness',
        'Mindfulness',
        'Weight loss',
        'Healthy diet',
        'Yoga',
        'Walking',
      ],
      behaviors: ['Activos en apps de salud y fitness'],
      placementsRecommended: ['reels', 'feed', 'facebook_feed', 'facebook_reels'],
    },
    update: {},
  });
}

async function seedCampaign() {
  const existing = await prisma.campaign.findFirst({ where: { name: 'Lanzamiento Q3 2026' } });
  if (existing) return existing;
  return prisma.campaign.create({
    data: {
      name: 'Lanzamiento Q3 2026',
      objective: 'Awareness + primeros 1.000 usuarios PRO',
      startAt: new Date('2026-07-01T00:00:00+02:00'),
      endAt: new Date('2026-09-30T23:59:59+02:00'),
      kpi: 'Coste por instalación < 1,50 €',
      notes: 'Campaña dummy para poder demo-ear el calendario en Fase 1.',
    },
  });
}

async function seedQCRules() {
  const rules: Array<{
    name: string;
    description: string;
    ruleType: QCRuleType;
    severity: QCRuleSeverity;
    appliesToFormats: ContentFormat[];
    paramsJson?: Record<string, unknown>;
  }> = [
    {
      name: 'Hook visible en los primeros 3 segundos',
      description: 'Vídeos: comprobar que existe un gancho explícito al inicio.',
      ruleType: QCRuleType.HOOK_IN_3S,
      severity: QCRuleSeverity.BLOCKER,
      appliesToFormats: [
        ContentFormat.reel,
        ContentFormat.ugc_video,
        ContentFormat.app_demo,
        ContentFormat.lifestyle_ad,
      ],
    },
    {
      name: 'CTA presente',
      description: 'Toda pieza debe terminar con una llamada a la acción clara.',
      ruleType: QCRuleType.CTA_PRESENT,
      severity: QCRuleSeverity.BLOCKER,
      appliesToFormats: [
        ContentFormat.image,
        ContentFormat.carousel,
        ContentFormat.reel,
        ContentFormat.ugc_video,
        ContentFormat.app_demo,
        ContentFormat.lifestyle_ad,
      ],
    },
    {
      name: 'Hashtags dentro del límite recomendado',
      description: 'Por plataforma. Warn si supera el recomendado, blocker si supera el máximo.',
      ruleType: QCRuleType.HASHTAG_LIMIT,
      severity: QCRuleSeverity.WARNING,
      appliesToFormats: [
        ContentFormat.image,
        ContentFormat.carousel,
        ContentFormat.reel,
        ContentFormat.ugc_video,
        ContentFormat.app_demo,
        ContentFormat.lifestyle_ad,
      ],
    },
    {
      name: 'Caption sin typos evidentes',
      description: 'Chequeo ortográfico básico (es-ES) sobre el caption.',
      ruleType: QCRuleType.CAPTION_TYPOS,
      severity: QCRuleSeverity.WARNING,
      appliesToFormats: [
        ContentFormat.image,
        ContentFormat.carousel,
        ContentFormat.reel,
        ContentFormat.ugc_video,
        ContentFormat.app_demo,
        ContentFormat.lifestyle_ad,
      ],
    },
    {
      name: 'Música con licencia segura',
      description: 'Si la pieza tiene música y va a TikTok, debe estar en la biblioteca comercial.',
      ruleType: QCRuleType.MUSIC_LICENSE,
      severity: QCRuleSeverity.BLOCKER,
      appliesToFormats: [
        ContentFormat.reel,
        ContentFormat.ugc_video,
        ContentFormat.app_demo,
        ContentFormat.lifestyle_ad,
      ],
    },
    {
      name: 'Texto on-screen del thumbnail legible',
      description: 'Comprobación manual en la revisión.',
      ruleType: QCRuleType.THUMBNAIL_TEXT_READABLE,
      severity: QCRuleSeverity.WARNING,
      appliesToFormats: [
        ContentFormat.image,
        ContentFormat.carousel,
        ContentFormat.reel,
        ContentFormat.ugc_video,
        ContentFormat.app_demo,
        ContentFormat.lifestyle_ad,
      ],
    },
    {
      name: 'Duración válida por plataforma',
      description: 'Comprobado automáticamente contra packages/shared/platform-limits.',
      ruleType: QCRuleType.PLATFORM_DURATION,
      severity: QCRuleSeverity.BLOCKER,
      appliesToFormats: [
        ContentFormat.reel,
        ContentFormat.ugc_video,
        ContentFormat.app_demo,
        ContentFormat.lifestyle_ad,
      ],
    },
    {
      name: 'Ratio válido por plataforma',
      description: 'Comprobado automáticamente contra packages/shared/platform-limits.',
      ruleType: QCRuleType.PLATFORM_RATIO,
      severity: QCRuleSeverity.BLOCKER,
      appliesToFormats: [
        ContentFormat.image,
        ContentFormat.carousel,
        ContentFormat.reel,
        ContentFormat.ugc_video,
        ContentFormat.app_demo,
        ContentFormat.lifestyle_ad,
      ],
    },
  ];

  for (const rule of rules) {
    const existing = await prisma.qCRule.findFirst({ where: { name: rule.name } });
    if (existing) continue;
    await prisma.qCRule.create({
      data: {
        name: rule.name,
        description: rule.description,
        ruleType: rule.ruleType,
        severity: rule.severity,
        appliesToFormats: rule.appliesToFormats,
        appliesToPlatforms: [],
        paramsJson: (rule.paramsJson ?? {}) as Prisma.InputJsonValue,
        enabled: true,
      },
    });
  }
}

async function seedDemoContentPieces(campaignId: string) {
  const personaIds = {
    optimizador: 'persona-01-optimizador-consciente',
    transicion: 'persona-02-en-transicion',
  };

  const pieces: Array<{
    externalRef: string;
    title: string;
    format: ContentFormat;
    status: ContentStatus;
    personaId: string;
    hook: string;
    framework: string;
    variants: Array<{
      kind:
        | 'tiktok'
        | 'instagram_reel'
        | 'instagram_feed'
        | 'instagram_story'
        | 'facebook_feed'
        | 'facebook_reel';
      mediaUrl: string;
      mediaType: 'image' | 'video';
      ratio: '1:1' | '4:5' | '9:16' | '16:9';
      durationS?: number;
      caption: string;
      hashtags: string[];
    }>;
  }> = [
    {
      externalRef: '11111111-1111-4111-8111-111111111111',
      title: 'POV: 5 apps de salud y ninguna te dice si vas bien',
      format: ContentFormat.ugc_video,
      status: ContentStatus.IN_REVIEW,
      personaId: personaIds.optimizador,
      hook: 'POV: 5 apps de salud abiertas y ninguna te dice si vas bien',
      framework: 'ugc_15s',
      variants: [
        {
          kind: 'tiktok',
          mediaUrl: 'https://placeholder.qyro.app/demo/pov-5-apps.mp4',
          mediaType: 'video',
          ratio: '9:16',
          durationS: 18,
          caption:
            'POV: tienes 5 apps de salud abiertas y ninguna te dice si vas bien. QYRO unifica todo en un Life Score.',
          hashtags: ['#qyro', '#productividad', '#habitos', '#atomichabits'],
        },
        {
          kind: 'instagram_reel',
          mediaUrl: 'https://placeholder.qyro.app/demo/pov-5-apps.mp4',
          mediaType: 'video',
          ratio: '9:16',
          durationS: 18,
          caption: 'POV: 5 apps abiertas, 0 respuestas. QYRO te da un único Life Score.',
          hashtags: ['#qyro', '#productividad', '#habitos', '#bienestar'],
        },
      ],
    },
    {
      externalRef: '22222222-2222-4222-8222-222222222222',
      title: 'Lunes 0 hábitos. Jueves 70%.',
      format: ContentFormat.lifestyle_ad,
      status: ContentStatus.APPROVED,
      personaId: personaIds.transicion,
      hook: 'Lunes 0 hábitos. Jueves 70%.',
      framework: 'lifestyle_nike',
      variants: [
        {
          kind: 'instagram_reel',
          mediaUrl: 'https://placeholder.qyro.app/demo/lunes-jueves.mp4',
          mediaType: 'video',
          ratio: '9:16',
          durationS: 22,
          caption: 'Lunes 0 hábitos. Jueves 70%. La IA hace el plan, tú sólo aparece.',
          hashtags: ['#qyro', '#habitos', '#cambio', '#bienestar'],
        },
        {
          kind: 'facebook_reel',
          mediaUrl: 'https://placeholder.qyro.app/demo/lunes-jueves.mp4',
          mediaType: 'video',
          ratio: '9:16',
          durationS: 22,
          caption: 'Lunes 0 hábitos. Jueves 70%. QYRO te lleva. Tú sólo apareces.',
          hashtags: ['#qyro', '#habitos', '#cambio'],
        },
        {
          kind: 'instagram_feed',
          mediaUrl: 'https://placeholder.qyro.app/demo/lunes-jueves-feed.jpg',
          mediaType: 'image',
          ratio: '4:5',
          caption: 'De 0 a 70% de adherencia en 4 días. Cómo? Deja que la IA planifique por ti.',
          hashtags: ['#qyro', '#habitos'],
        },
      ],
    },
    {
      externalRef: '33333333-3333-4333-8333-333333333333',
      title: 'Demo: Life Score subiendo en tiempo real',
      format: ContentFormat.app_demo,
      status: ContentStatus.DRAFT,
      personaId: personaIds.optimizador,
      hook: 'Mi Life Score subió 40 puntos en 3 semanas',
      framework: 'app_demo_25s',
      variants: [
        {
          kind: 'tiktok',
          mediaUrl: 'https://placeholder.qyro.app/demo/life-score-demo.mp4',
          mediaType: 'video',
          ratio: '9:16',
          durationS: 24,
          caption:
            'Mi Life Score: +40 puntos en 3 semanas. Sólo siguiendo lo que QYRO me decía cada mañana.',
          hashtags: ['#qyro', '#lifescore', '#productividad'],
        },
      ],
    },
  ];

  for (const piece of pieces) {
    const existing = await prisma.contentPiece.findUnique({
      where: { externalRef: piece.externalRef },
    });
    if (existing) continue;
    await prisma.contentPiece.create({
      data: {
        externalRef: piece.externalRef,
        title: piece.title,
        format: piece.format,
        status: piece.status,
        campaignId,
        frameworkUsed: piece.framework,
        hookUsed: piece.hook,
        createdBy: 'seed',
        buyerPersonas: { create: [{ buyerPersonaId: piece.personaId }] },
        variants: {
          create: piece.variants.map((v) => ({
            kind: v.kind,
            mediaUrl: v.mediaUrl,
            mediaType: v.mediaType,
            ratio: v.ratio,
            durationS: v.durationS,
            caption: v.caption,
            hashtags: v.hashtags,
          })),
        },
      },
    });
  }
}

async function main() {
  console.log('🌱 Seed: usuario admin...');
  await seedAdmin();
  console.log('🌱 Seed: buyer personas...');
  await seedBuyerPersonas();
  console.log('🌱 Seed: audience presets...');
  await seedAudiencePresets();
  console.log('🌱 Seed: campaña demo...');
  const campaign = await seedCampaign();
  console.log('🌱 Seed: reglas QC...');
  await seedQCRules();
  console.log('🌱 Seed: piezas de contenido demo...');
  await seedDemoContentPieces(campaign.id);
  console.log('✅ Seed completado.');
}

main()
  .catch((err) => {
    console.error('❌ Seed falló:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
