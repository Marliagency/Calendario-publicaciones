import type { PlatformVariantKind } from '@qyro/shared';
import { PERSONA_IDS, type PersonaId } from '../personas/index.js';

/**
 * Posting times sugeridos por (persona × plataforma).
 *
 * Hora local en Europe/Madrid (TZ del calendario, §3 de CLAUDE.md).
 * Formato 24h, sin zona — se convierte a ISO con offset al construir
 * el `suggested_schedule` del payload.
 *
 * Fuentes: benchmarks generales 2024–2025 + ajuste por hábitos del target.
 * Cuando se acumule data propia, sustituir por valores aprendidos del
 * dashboard del calendario (Fase 10 del brief).
 */

export interface PostingSlot {
  /** Día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado). */
  weekday: number;
  /** Hora local 24h. */
  hourLocal: number;
  /** Minuto local. */
  minuteLocal: number;
}

type ScheduleMap = Partial<Record<PlatformVariantKind, PostingSlot[]>>;

const OPTIMIZADOR_SCHEDULE: ScheduleMap = {
  // Lee TT/IG en commute mañana, comida y antes de dormir.
  tiktok: [
    { weekday: 1, hourLocal: 7, minuteLocal: 30 },
    { weekday: 2, hourLocal: 14, minuteLocal: 0 },
    { weekday: 4, hourLocal: 21, minuteLocal: 30 },
    { weekday: 6, hourLocal: 10, minuteLocal: 0 },
  ],
  instagram_reel: [
    { weekday: 1, hourLocal: 8, minuteLocal: 0 },
    { weekday: 3, hourLocal: 18, minuteLocal: 30 },
    { weekday: 5, hourLocal: 19, minuteLocal: 0 },
  ],
  instagram_feed: [
    { weekday: 2, hourLocal: 12, minuteLocal: 0 },
    { weekday: 4, hourLocal: 19, minuteLocal: 0 },
  ],
  instagram_story: [
    // Stories funcionan bien fuera del prime time
    { weekday: 1, hourLocal: 9, minuteLocal: 0 },
    { weekday: 3, hourLocal: 13, minuteLocal: 0 },
  ],
};

const EN_TRANSICION_SCHEDULE: ScheduleMap = {
  // Más activa en horario late-evening (post-trabajo) y fines de semana.
  instagram_reel: [
    { weekday: 1, hourLocal: 19, minuteLocal: 0 },
    { weekday: 3, hourLocal: 20, minuteLocal: 30 },
    { weekday: 6, hourLocal: 11, minuteLocal: 0 },
  ],
  instagram_feed: [
    { weekday: 2, hourLocal: 20, minuteLocal: 0 },
    { weekday: 5, hourLocal: 19, minuteLocal: 0 },
  ],
  facebook_feed: [
    { weekday: 1, hourLocal: 20, minuteLocal: 0 },
    { weekday: 4, hourLocal: 13, minuteLocal: 0 },
  ],
  facebook_reel: [
    { weekday: 3, hourLocal: 20, minuteLocal: 0 },
    { weekday: 6, hourLocal: 18, minuteLocal: 30 },
  ],
};

export const POSTING_TIMES: Record<PersonaId, ScheduleMap> = {
  [PERSONA_IDS.OPTIMIZADOR_CONSCIENTE]: OPTIMIZADOR_SCHEDULE,
  [PERSONA_IDS.EN_TRANSICION]: EN_TRANSICION_SCHEDULE,
};

/**
 * Devuelve el próximo slot disponible para una (persona, plataforma)
 * a partir de `from` (default: ahora). Si la persona no tiene slots
 * configurados para esa plataforma, devuelve null.
 */
export function nextSlot(
  persona: PersonaId,
  platform: PlatformVariantKind,
  from: Date = new Date(),
): Date | null {
  const slots = POSTING_TIMES[persona]?.[platform];
  if (!slots || slots.length === 0) return null;

  // Buscar el próximo slot dentro de los próximos 7 días.
  for (let offsetDays = 0; offsetDays <= 7; offsetDays++) {
    const candidateDate = new Date(from);
    candidateDate.setDate(from.getDate() + offsetDays);
    const weekday = candidateDate.getDay();

    const matching = slots
      .filter((s) => s.weekday === weekday)
      .map((s) => {
        const d = new Date(candidateDate);
        d.setHours(s.hourLocal, s.minuteLocal, 0, 0);
        return d;
      })
      .filter((d) => d.getTime() > from.getTime())
      .sort((a, b) => a.getTime() - b.getTime());

    if (matching.length > 0 && matching[0]) return matching[0];
  }
  return null;
}
