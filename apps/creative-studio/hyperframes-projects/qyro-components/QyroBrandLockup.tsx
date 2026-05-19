/**
 * Lockup oficial QYRO: isotipo (gradient azul→cian→púrpura) + wordmark.
 *
 * Para animación de entrada en HyperFrames:
 *   opacity = lerp(0, 1, t / 0.6s)
 *   translateY = lerp(20, 0, easeOut(t / 0.6s)) px
 */
export interface QyroBrandLockupProps {
  /** Tamaño del isotipo en px. */
  size?: number;
  /** Si true, wordmark + isotipo. Si false, solo isotipo. */
  withWordmark?: boolean;
  /** Color del wordmark. */
  wordmarkColor?: string;
}

export function QyroBrandLockup({
  size = 96,
  withWordmark = true,
  wordmarkColor = '#0B1220',
}: QyroBrandLockupProps) {
  const radius = size * 0.22;
  const innerScale = size / 256;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size * 0.25,
        fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 256 256" role="img" aria-label="QYRO">
        <defs>
          <linearGradient id="qyro-lockup-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2C7BFF" />
            <stop offset="50%" stopColor="#5AC8FA" />
            <stop offset="100%" stopColor="#7B61FF" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width="256"
          height="256"
          rx={radius / innerScale}
          fill="url(#qyro-lockup-grad)"
        />
        <g fill="#FFFFFF">
          <path d="M128 64c35.346 0 64 28.654 64 64 0 17.06-6.68 32.554-17.566 44.024l16.92 16.92a8 8 0 1 1-11.314 11.314l-16.92-16.92C151.65 194.32 140.06 200 128 200c-39.764 0-72-32.236-72-72s32.236-64 72-64zm0 32c-22.091 0-40 17.909-40 40s17.909 40 40 40c11.046 0 21.046-4.477 28.284-11.716A39.86 39.86 0 0 0 168 136c0-22.091-17.909-40-40-40z" />
        </g>
      </svg>
      {withWordmark ? (
        <span
          style={{
            fontSize: size * 0.7,
            fontWeight: 800,
            letterSpacing: size * 0.02,
            color: wordmarkColor,
            lineHeight: 1,
          }}
        >
          QYRO
        </span>
      ) : null}
    </div>
  );
}

export default QyroBrandLockup;
