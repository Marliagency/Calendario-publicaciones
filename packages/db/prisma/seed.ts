import {
  ContentFormat,
  ContentStatus,
  type Prisma,
  PrismaClient,
  QCRuleSeverity,
  QCRuleType,
} from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

const WS_QYRO = 'ws_qyro';
const WS_DIEGO = 'ws_diego-personal';

async function seedWorkspaces() {
  await prisma.workspace.upsert({
    where: { id: WS_QYRO },
    create: {
      id: WS_QYRO,
      slug: 'qyro',
      name: 'QYRO',
      description: 'Calendario social de QYRO — TikTok, Instagram, Facebook.',
      brandColorPrimary: '#3B82F6',
      brandColorSecondary: '#7C5CFC',
      defaultTimezone: 'Europe/Madrid',
      defaultLanguage: 'es-ES',
      dailyBoostCapEur: 5,
      monthlyBoostCapEur: 150,
    },
    update: { name: 'QYRO', brandColorPrimary: '#3B82F6', brandColorSecondary: '#7C5CFC' },
  });

  await prisma.workspace.upsert({
    where: { id: WS_DIEGO },
    create: {
      id: WS_DIEGO,
      slug: 'diego-personal',
      name: 'Diego personal',
      description: 'Cuenta personal — contenido orgánico.',
      brandColorPrimary: '#111111',
      brandColorSecondary: '#444444',
      defaultTimezone: 'Europe/Madrid',
      defaultLanguage: 'es-ES',
      dailyBoostCapEur: 3,
      monthlyBoostCapEur: 50,
    },
    update: { name: 'Diego personal' },
  });
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'diego@qyro.app';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme-on-first-login';
  const passwordHash = await hash(password, { type: 2 });

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, displayName: 'Diego (admin)', isAdmin: true },
    update: { passwordHash, displayName: 'Diego (admin)', isAdmin: true },
  });

  for (const workspaceId of [WS_QYRO, WS_DIEGO]) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      create: { workspaceId, userId: user.id, role: 'OWNER', acceptedAt: new Date() },
      update: { role: 'OWNER', acceptedAt: new Date() },
    });
  }

  await prisma.workspace.updateMany({
    where: { createdByUserId: null },
    data: { createdByUserId: user.id },
  });

  return user;
}

async function seedBuyerPersonas() {
  await prisma.buyerPersona.upsert({
    where: { id: 'persona-01-optimizador-consciente' },
    create: {
      id: 'persona-01-optimizador-consciente',
      workspaceId: WS_QYRO,
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
    },
    update: { workspaceId: WS_QYRO },
  });

  await prisma.buyerPersona.upsert({
    where: { id: 'persona-02-en-transicion' },
    create: {
      id: 'persona-02-en-transicion',
      workspaceId: WS_QYRO,
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
    update: { workspaceId: WS_QYRO },
  });
}

async function seedCampaign() {
  return prisma.campaign.upsert({
    where: { id: 'campaign-demo-q3-2026' },
    create: {
      id: 'campaign-demo-q3-2026',
      workspaceId: WS_QYRO,
      name: 'Lanzamiento Q3 2026',
      objective: 'Awareness + conversión a descarga',
      startAt: new Date('2026-07-01'),
      endAt: new Date('2026-09-30'),
      kpi: 'CPA < 2€',
      notes: 'Campaña de lanzamiento — mezcla orgánico + paid.',
    },
    update: { workspaceId: WS_QYRO },
  });
}

async function seedAudiencePresets() {
  await prisma.audiencePreset.upsert({
    where: { id: 'preset-optimizador-es' },
    create: {
      id: 'preset-optimizador-es',
      workspaceId: WS_QYRO,
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
      interestsTiktok: ['self_improvement', 'fitness', 'productivity', 'wellness'],
      behaviors: ['Engaged shoppers'],
      placementsRecommended: ['reels', 'feed', 'stories', 'tiktok_in_feed'],
    },
    update: { workspaceId: WS_QYRO },
  });

  await prisma.audiencePreset.upsert({
    where: { id: 'preset-transicion-es' },
    create: {
      id: 'preset-transicion-es',
      workspaceId: WS_QYRO,
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
      interestsTiktok: ['healthy_lifestyle', 'mental_health', 'mindfulness'],
      behaviors: ['Activos en apps de salud y fitness'],
      placementsRecommended: ['reels', 'feed', 'facebook_feed', 'facebook_reels'],
    },
    update: { workspaceId: WS_QYRO },
  });
}

async function seedQCRules() {
  const rules: Prisma.QCRuleCreateInput[] = [
    {
      workspace: { connect: { id: WS_QYRO } },
      name: 'Ratio correcto por plataforma',
      ruleType: QCRuleType.PLATFORM_RATIO,
      severity: QCRuleSeverity.BLOCKER,
      appliesToFormats: Object.values(ContentFormat),
      appliesToPlatforms: [],
      description: 'El ratio del media debe coincidir con el esperado para el placement.',
    },
    {
      workspace: { connect: { id: WS_QYRO } },
      name: 'Duración válida por plataforma',
      ruleType: QCRuleType.PLATFORM_DURATION,
      severity: QCRuleSeverity.BLOCKER,
      appliesToFormats: [ContentFormat.reel, ContentFormat.ugc_video, ContentFormat.app_demo],
      appliesToPlatforms: [],
      description: 'La duración del vídeo debe estar dentro del rango permitido.',
    },
    {
      workspace: { connect: { id: WS_QYRO } },
      name: 'Hashtags dentro del límite',
      ruleType: QCRuleType.HASHTAG_LIMIT,
      severity: QCRuleSeverity.WARNING,
      appliesToFormats: Object.values(ContentFormat),
      appliesToPlatforms: [],
      description: 'IG ≤ 30 hashtags. TikTok: recomendado ≤ 8.',
    },
    {
      workspace: { connect: { id: WS_QYRO } },
      name: 'Licencia de música (TikTok)',
      ruleType: QCRuleType.MUSIC_LICENSE,
      severity: QCRuleSeverity.WARNING,
      appliesToFormats: [ContentFormat.reel, ContentFormat.ugc_video],
      appliesToPlatforms: ['tiktok'],
      description: 'Si la pista no está en la biblioteca comercial de TikTok, puede ser bloqueada.',
    },
    {
      workspace: { connect: { id: WS_QYRO } },
      name: 'Hook en los primeros 3 segundos',
      ruleType: QCRuleType.HOOK_IN_3S,
      severity: QCRuleSeverity.WARNING,
      appliesToFormats: [ContentFormat.reel, ContentFormat.ugc_video, ContentFormat.app_demo],
      appliesToPlatforms: [],
      description: 'Verificar manualmente que el vídeo engancha en los primeros 3 segundos.',
    },
    {
      workspace: { connect: { id: WS_QYRO } },
      name: 'CTA presente',
      ruleType: QCRuleType.CTA_PRESENT,
      severity: QCRuleSeverity.WARNING,
      appliesToFormats: Object.values(ContentFormat),
      appliesToPlatforms: [],
      description: 'La caption o el vídeo debe incluir una llamada a la acción clara.',
    },
    {
      workspace: { connect: { id: WS_QYRO } },
      name: 'Texto en thumbnail legible',
      ruleType: QCRuleType.THUMBNAIL_TEXT_READABLE,
      severity: QCRuleSeverity.INFO,
      appliesToFormats: [ContentFormat.image, ContentFormat.carousel],
      appliesToPlatforms: [],
      description: 'El texto superpuesto debe ser legible en tamaño miniatura.',
    },
    {
      workspace: { connect: { id: WS_QYRO } },
      name: 'Ortografía de caption',
      ruleType: QCRuleType.CAPTION_TYPOS,
      severity: QCRuleSeverity.INFO,
      appliesToFormats: Object.values(ContentFormat),
      appliesToPlatforms: [],
      description: 'Revisar manualmente que la caption no tiene errores tipográficos.',
    },
  ];

  for (const rule of rules) {
    await prisma.qCRule.create({ data: rule });
  }
}

async function seedContentPieces(campaignId: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(12, 0, 0, 0);

  await prisma.contentPiece.create({
    data: {
      workspaceId: WS_QYRO,
      title: 'POV: 5 apps de salud abiertas y ninguna te dice si vas bien',
      format: ContentFormat.ugc_video,
      status: ContentStatus.IN_REVIEW,
      campaignId,
      hookUsed: 'POV',
      frameworkUsed: 'PROBLEM_SOLUTION',
      buyerPersonas: { create: [{ buyerPersonaId: 'persona-01-optimizador-consciente' }] },
      variants: {
        create: [
          {
            kind: 'tiktok',
            mediaUrl: 'https://placehold.co/720x1280/3B82F6/FFFFFF?text=TikTok+UGC',
            mediaType: 'video',
            ratio: '9:16',
            durationS: 22,
            caption:
              'POV: 5 apps de salud abiertas y ninguna te dice si vas bien. QYRO las sustituye todas.',
            hashtags: ['#qyro', '#saludybienestar', '#habitos', '#productividad'],
            scheduledAt: tomorrow,
          },
          {
            kind: 'instagram_reel',
            mediaUrl: 'https://placehold.co/720x1280/7C5CFC/FFFFFF?text=IG+Reel',
            mediaType: 'video',
            ratio: '9:16',
            durationS: 22,
            caption: 'POV: 5 apps de salud y ninguna te dice si vas bien. QYRO lo soluciona.',
            hashtags: ['#qyro', '#wellness', '#habitos'],
            scheduledAt: new Date(tomorrow.getTime() + 3600_000),
          },
        ],
      },
    },
  });

  await prisma.contentPiece.create({
    data: {
      workspaceId: WS_QYRO,
      title: 'Habitica, MyFitnessPal, Strong, Notion — QYRO las sustituye todas',
      format: ContentFormat.carousel,
      status: ContentStatus.SCHEDULED,
      campaignId,
      hookUsed: 'LIST',
      frameworkUsed: 'BEFORE_AFTER',
      buyerPersonas: { create: [{ buyerPersonaId: 'persona-02-en-transicion' }] },
      variants: {
        create: [
          {
            kind: 'instagram_feed',
            mediaUrl: 'https://placehold.co/1080x1080/22C55E/FFFFFF?text=Carousel+IG',
            mediaType: 'carousel',
            ratio: '1:1',
            caption: 'Habitica, MyFitnessPal, Strong, Notion — esto las sustituye todas.',
            hashtags: ['#qyro', '#productividad', '#apps'],
            scheduledAt: dayAfter,
          },
          {
            kind: 'facebook_feed',
            mediaUrl: 'https://placehold.co/1080x1080/22C55E/FFFFFF?text=Carousel+FB',
            mediaType: 'carousel',
            ratio: '1:1',
            caption:
              'Dejas de necesitar 5 apps. QYRO unifica hábitos, nutrición, entrenamiento y tareas.',
            hashtags: ['#qyro'],
            scheduledAt: new Date(dayAfter.getTime() + 1800_000),
          },
        ],
      },
    },
  });

  const published = new Date();
  published.setDate(published.getDate() - 1);
  published.setHours(19, 0, 0, 0);

  await prisma.contentPiece.create({
    data: {
      workspaceId: WS_QYRO,
      title: 'Antes vs después de 30 días con QYRO',
      format: ContentFormat.reel,
      status: ContentStatus.PUBLISHED,
      campaignId,
      hookUsed: 'TRANSFORMATION',
      frameworkUsed: 'BEFORE_AFTER',
      buyerPersonas: { create: [{ buyerPersonaId: 'persona-01-optimizador-consciente' }] },
      variants: {
        create: [
          {
            kind: 'instagram_reel',
            mediaUrl: 'https://placehold.co/720x1280/0B1220/FFFFFF?text=Reel+IG',
            mediaType: 'video',
            ratio: '9:16',
            durationS: 30,
            caption: 'Antes vs después de 30 días con QYRO. El cambio es real.',
            hashtags: ['#qyro', '#transformacion', '#habitos30dias'],
            scheduledAt: published,
            publishedAt: published,
            platformPostId: 'mock_ig_post_abc123',
          },
        ],
      },
    },
  });
}

async function main() {
  console.log('🌱 Iniciando seed...');

  await seedWorkspaces();
  console.log('  ✅ Workspaces');

  await seedAdmin();
  console.log('  ✅ Admin + memberships');

  await seedBuyerPersonas();
  console.log('  ✅ Buyer personas');

  await seedAudiencePresets();
  console.log('  ✅ Audience presets');

  const campaign = await seedCampaign();
  console.log('  ✅ Campaign');

  const existingRules = await prisma.qCRule.count({ where: { workspaceId: WS_QYRO } });
  if (existingRules === 0) {
    await seedQCRules();
    console.log('  ✅ QC Rules');
  } else {
    console.log('  ⏭  QC Rules ya existen');
  }

  const existingPieces = await prisma.contentPiece.count({ where: { workspaceId: WS_QYRO } });
  if (existingPieces === 0) {
    await seedContentPieces(campaign.id);
    console.log('  ✅ Content pieces demo');
  } else {
    console.log('  ⏭  Content pieces ya existen');
  }

  console.log('🎉 Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
