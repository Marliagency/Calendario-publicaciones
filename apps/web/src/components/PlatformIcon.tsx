import clsx from 'clsx';
import { PLATFORM_BADGE, type PlatformKind } from '../lib/platforms.js';

export function PlatformIcon({
  kind,
  size = 'md',
}: {
  kind: PlatformKind;
  size?: 'sm' | 'md';
}) {
  const { letter, color } = PLATFORM_BADGE[kind];
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-bold text-white',
        size === 'sm' ? 'h-4 w-4 text-[8px]' : 'h-6 w-6 text-[10px]',
      )}
      style={{ backgroundColor: color }}
      title={kind}
    >
      {letter}
    </span>
  );
}
