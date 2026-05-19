/**
 * BuyerPersonas — IDs exactos sincronizados con el seed de Prisma
 * (`packages/db/prisma/seed.ts:39-101`). Cualquier `buyer_persona_ids`
 * que el estudio envíe al calendario DEBE usar estos IDs.
 *
 * Si en el futuro las personas se vuelven dinámicas, exponer
 * `GET /api/v1/buyer-personas` desde el calendario y leer de ahí.
 */

export const PERSONA_IDS = {
  OPTIMIZADOR_CONSCIENTE: 'persona-01-optimizador-consciente',
  EN_TRANSICION: 'persona-02-en-transicion',
} as const;

export type PersonaId = (typeof PERSONA_IDS)[keyof typeof PERSONA_IDS];

export interface PersonaBrief {
  id: PersonaId;
  name: string;
  ageRange: string;
  tone: string;
  preferredPlatforms: string[];
  pains: string[];
  workingHooks: string[];
  isProTarget: boolean;
}

export const PERSONAS: Record<PersonaId, PersonaBrief> = {
  [PERSONA_IDS.OPTIMIZADOR_CONSCIENTE]: {
    id: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    name: 'El Optimizador Consciente',
    ageRange: '22-38',
    tone: 'calmado, premium, inteligente, directo',
    preferredPlatforms: ['tiktok', 'instagram_reel', 'instagram_feed', 'youtube_shorts'],
    pains: [
      'Tengo 5 apps distintas y no las uso todas',
      'Empiezo hábitos y los abandono en 2 semanas',
      'No sé si mi entrenamiento está progresando',
      'Como sin control porque no registro lo que como',
      'Siento que no avanzo aunque me esfuerzo',
    ],
    workingHooks: [
      'POV: 5 apps de salud abiertas y ninguna te dice si vas bien',
      'Habitica, MyFitnessPal, Strong, Notion — esto las sustituye todas',
      'Mi Life Score subió 40 puntos en 3 semanas',
      'Atomic Habits pero ejecutable',
    ],
    isProTarget: false,
  },
  [PERSONA_IDS.EN_TRANSICION]: {
    id: PERSONA_IDS.EN_TRANSICION,
    name: 'La Persona en Transición',
    ageRange: '28-45',
    tone: 'calmado, cercano, premium, sin jerga técnica',
    preferredPlatforms: [
      'instagram_reel',
      'instagram_feed',
      'facebook_feed',
      'facebook_reel',
      'youtube_long',
    ],
    pains: [
      'Quiero empezar pero no sé por dónde',
      'Ya he intentado el gym 3 veces y siempre lo dejo',
      'Cuando llego del curro estoy fundido y no tengo cabeza para planificar',
      'Necesito a alguien que me diga qué comer hoy',
    ],
    workingHooks: [
      'Si has intentado ponerte en forma 3 veces y siempre lo dejas, mira esto',
      'La IA te dice qué comer, qué entrenar y a qué hora dormir',
      'Sin contar calorías a mano. Foto al plato y listo.',
      'Lunes 0 hábitos. Jueves 70%.',
    ],
    isProTarget: true,
  },
};
