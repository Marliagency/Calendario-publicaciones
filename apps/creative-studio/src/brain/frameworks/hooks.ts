import { PERSONA_IDS, type PersonaId } from '../personas/index.js';

/**
 * Hook library QYRO — §6.5 del brief.
 * Cada hook está mapeado a persona, pain point, módulo o pilar.
 */

export interface Hook {
  id: string;
  text: string;
  /** Persona objetivo. null = transversal. */
  persona: PersonaId | null;
  /** Pain point que ataca. */
  pain?: string;
  /** Módulo de QYRO al que conecta. */
  module?:
    | 'dashboard'
    | 'habits'
    | 'workouts'
    | 'nutrition'
    | 'journal'
    | 'tasks'
    | 'goals'
    | 'analytics'
    | 'ai';
  /** Pilar de contenido. */
  pillar: 'demostracion' | 'educacion' | 'inspiracion' | 'comunidad' | 'behind_the_scenes';
}

export const HOOKS: Hook[] = [
  // Optimizador Consciente
  {
    id: 'pov-5-apps-fragmentadas',
    text: 'POV: tienes 5 apps de salud abiertas y ninguna te dice si vas bien',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    pain: 'fragmentacion',
    module: 'dashboard',
    pillar: 'demostracion',
  },
  {
    id: 'sustituye-stack-completo',
    text: 'Habitica, MyFitnessPal, Strong y Notion — esto las sustituye todas',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    pain: 'fragmentacion',
    pillar: 'demostracion',
  },
  {
    id: 'life-score-40-puntos',
    text: 'Mi Life Score subió 40 puntos en 3 semanas. Esto fue lo que cambió.',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    module: 'analytics',
    pillar: 'inspiracion',
  },
  {
    id: 'atomic-habits-ejecutable',
    text: 'Atomic Habits pero ejecutable.',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    module: 'habits',
    pillar: 'educacion',
  },
  {
    id: 'ia-conoce-vida-entera',
    text: 'La IA conoce mi vida entera, no solo mi pregunta de hoy.',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    module: 'ai',
    pillar: 'demostracion',
  },
  {
    id: 'streak-47-dias',
    text: 'Llevo 47 días de racha. Antes no llegaba a 5.',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    module: 'habits',
    pillar: 'inspiracion',
  },
  {
    id: 'gym-dieta-progreso',
    text: 'Tu gym, tu dieta y tu progreso en un solo lugar. QYRO sabe cuánto levantaste ayer.',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    module: 'workouts',
    pillar: 'demostracion',
  },

  // Persona en Transición
  {
    id: 'tres-intentos-gym',
    text: 'Si has intentado ponerte en forma 3 veces y siempre lo dejas, mira esto.',
    persona: PERSONA_IDS.EN_TRANSICION,
    pain: 'abandono-recurrente',
    module: 'habits',
    pillar: 'inspiracion',
  },
  {
    id: 'ia-te-dice-que-hacer',
    text: 'La IA te dice qué comer, qué entrenar y a qué hora dormir. Tú solo abres la app.',
    persona: PERSONA_IDS.EN_TRANSICION,
    module: 'ai',
    pillar: 'demostracion',
  },
  {
    id: 'foto-al-plato',
    text: 'Sin contar calorías a mano. Foto al plato y listo.',
    persona: PERSONA_IDS.EN_TRANSICION,
    module: 'nutrition',
    pillar: 'demostracion',
  },
  {
    id: 'lunes-0-jueves-70',
    text: 'Lunes 0 hábitos. Jueves 70%. La diferencia: una sola app.',
    persona: PERSONA_IDS.EN_TRANSICION,
    module: 'habits',
    pillar: 'inspiracion',
  },
  {
    id: 'diario-30-dias',
    text: 'El diario que sabe cómo te has sentido los últimos 30 días.',
    persona: PERSONA_IDS.EN_TRANSICION,
    module: 'journal',
    pillar: 'demostracion',
  },
  {
    id: '80-pct-abandonan',
    text: 'El 80% de la gente abandona sus hábitos en 2 semanas. QYRO cambia eso.',
    persona: PERSONA_IDS.EN_TRANSICION,
    module: 'habits',
    pillar: 'educacion',
  },

  // Transversales declarativos
  {
    id: 'sistema-operativo-personal',
    text: 'Tu sistema operativo personal.',
    persona: null,
    pillar: 'inspiracion',
  },
  {
    id: 'vida-optimizada-ia',
    text: 'Tu vida, optimizada por IA.',
    persona: null,
    module: 'ai',
    pillar: 'inspiracion',
  },
  {
    id: 'vive-mejor',
    text: 'Vive mejor. QYRO.',
    persona: null,
    pillar: 'inspiracion',
  },

  // Anti-competencia (ÚSALOS SOLO EN ORGÁNICO, no en pago — §6.5 del brief)
  {
    id: 'vs-habitica',
    text: 'Sin gamificación de niños. Datos reales, analítica seria.',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    pillar: 'educacion',
  },
  {
    id: 'vs-myfitnesspal',
    text: 'No solo cuenta calorías. Conecta hábitos, gym, ánimo y IA.',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    module: 'nutrition',
    pillar: 'educacion',
  },
  {
    id: 'vs-chatgpt',
    text: 'IA con contexto real de tu vida, no una sesión genérica.',
    persona: PERSONA_IDS.OPTIMIZADOR_CONSCIENTE,
    module: 'ai',
    pillar: 'educacion',
  },
];

/** Hooks marcados como solo para orgánico (no pagar Meta con ellos). */
export const ORGANIC_ONLY_HOOK_IDS = new Set(['vs-habitica', 'vs-myfitnesspal', 'vs-chatgpt']);

export function getHooksByPersona(persona: PersonaId): Hook[] {
  return HOOKS.filter((h) => h.persona === persona || h.persona === null);
}

export function getHookById(id: string): Hook | undefined {
  return HOOKS.find((h) => h.id === id);
}
