import qyroPreset from '@qyro/ui/tailwind-preset';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  presets: [qyroPreset as Config],
};

export default config;
