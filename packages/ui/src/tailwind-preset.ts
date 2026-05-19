import type { Config } from 'tailwindcss';
import { colors, fontFamily, radii, shadows } from './tokens.js';

/**
 * Preset Tailwind compartido. apps/web lo importa en su tailwind.config.ts
 * para no duplicar tokens.
 */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        qyro: colors.qyro,
      },
      borderRadius: {
        card: radii.card,
        'card-sm': radii.cardSm,
        pill: radii.pill,
        input: radii.input,
      },
      boxShadow: {
        soft: shadows.soft,
        elevated: shadows.elevated,
      },
      fontFamily: {
        sans: fontFamily.sans as unknown as string[],
      },
    },
  },
};

export default preset;
