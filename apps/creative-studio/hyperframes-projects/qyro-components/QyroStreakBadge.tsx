/**
 * Badge de racha: número grande + "días" + emoji 🔥 con gradient ring.
 */
export interface QyroStreakBadgeProps {
  days: number;
  size?: number;
}

export function QyroStreakBadge({ days, size = 320 }: QyroStreakBadgeProps) {
  const stroke = size * 0.06;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Racha de ${days} días`}
      >
        <title>{`Racha de ${days} días`}</title>
        <defs>
          <linearGradient id="qyro-streak-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#qyro-streak-grad)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: size * 0.4, lineHeight: 1, marginBottom: 8 }}>🔥</div>
        <div style={{ fontWeight: 800, fontSize: size * 0.22, color: '#0B1220', lineHeight: 1 }}>
          {days}
        </div>
        <div style={{ fontWeight: 500, fontSize: size * 0.08, color: '#64748B', marginTop: 4 }}>
          días seguidos
        </div>
      </div>
    </div>
  );
}

export default QyroStreakBadge;
