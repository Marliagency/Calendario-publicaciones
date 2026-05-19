/**
 * Pilares de contenido QYRO — §6.6 del brief.
 *
 * Toda pieza generada por el estudio se etiqueta con al menos un pilar.
 * El registry mantiene un balance objetivo aproximado:
 *   - Demostración 40%
 *   - Educación 25%
 *   - Inspiración 15%
 *   - Comunidad 10%
 *   - Behind-the-scenes 10%
 */

export type ContentPillar =
  | 'demostracion'
  | 'educacion'
  | 'inspiracion'
  | 'comunidad'
  | 'behind_the_scenes';

export interface PillarDefinition {
  id: ContentPillar;
  name: string;
  description: string;
  /** Cuota objetivo en mix mensual. Suma ≈ 1. */
  targetShare: number;
  exampleAngles: string[];
}

export const CONTENT_PILLARS: Record<ContentPillar, PillarDefinition> = {
  demostracion: {
    id: 'demostracion',
    name: 'Demostración',
    description:
      'Capturas o demos de QYRO en uso. Foto→IA, streak 30d, dashboard real, PR animándose.',
    targetShare: 0.4,
    exampleAngles: [
      'foto a un plato → macros en 2 segundos',
      'streak 30 días con anillos rellenándose',
      'asistente IA respondiendo "analiza mi semana"',
    ],
  },
  educacion: {
    id: 'educacion',
    name: 'Educación',
    description:
      'Conocimiento de productividad / fitness / bienestar reposicionado con QYRO como herramienta.',
    targetShare: 0.25,
    exampleAngles: [
      'Atomic Habits explicado en 30s',
      'Mifflin-St Jeor: por qué tu calculadora de calorías miente',
      '1RM real vs estimado: qué pasa cuando entrenas con datos',
    ],
  },
  inspiracion: {
    id: 'inspiracion',
    name: 'Inspiración',
    description:
      'Antes (caos, 5 apps) → después (claridad, QYRO). Transformación organizativa, no corporal.',
    targetShare: 0.15,
    exampleAngles: [
      'Mi escritorio antes de QYRO: 5 apps abiertas. Ahora: una.',
      'Lunes 0 hábitos. Jueves 70%.',
      'Life Score 25 → 70. Tres semanas.',
    ],
  },
  comunidad: {
    id: 'comunidad',
    name: 'Comunidad',
    description: 'Retos semanales, compartir capturas del Life Score, hashtag #LifeScoreChallenge.',
    targetShare: 0.1,
    exampleAngles: [
      'Reto: comparte tu Life Score del lunes',
      'Top 3 hábitos más usados esta semana',
      'Tu rutina matutina mostrada en QYRO',
    ],
  },
  behind_the_scenes: {
    id: 'behind_the_scenes',
    name: 'Behind the scenes',
    description: 'Cómo se construye QYRO. Decisiones de diseño, features en cocina.',
    targetShare: 0.1,
    exampleAngles: [
      'Por qué QYRO no tiene gamificación de niños',
      'La decisión de NO usar cloud para tus datos',
      'Cómo entrenamos el modelo de la foto→macros',
    ],
  },
};

export const PILLAR_TARGET_MIX: ReadonlyArray<{ pillar: ContentPillar; share: number }> =
  Object.values(CONTENT_PILLARS).map((p) => ({ pillar: p.id, share: p.targetShare }));
