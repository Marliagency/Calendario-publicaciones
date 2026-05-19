/**
 * Donut Life Score animable 0 → score / 100. Tamaño por defecto 480 px.
 * El gradiente de stroke usa la paleta oficial QYRO (azul → cian → púrpura).
 *
 * Para animar de 25 → 70 sobre 2s en HyperFrames, alimenta `score` como
 * función del frame: `score = lerp(25, 70, t / 2s)`.
 */
export interface QyroLifeScoreDonutProps {
  score: number;
  /** Tamaño del SVG en px. */
  size?: number;
  /** Grosor del trazo del donut. */
  stroke?: number;
  /** Etiqueta debajo del número. */
  label?: string;
}

export function QyroLifeScoreDonut({
  score,
  size = 480,
  stroke = 36,
  label = 'Life Score',
}: QyroLifeScoreDonutProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const gradId = 'qyro-donut-grad';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2C7BFF" />
          <stop offset="50%" stopColor="#5AC8FA" />
          <stop offset="100%" stopColor="#7B61FF" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={stroke}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* Number */}
      <text
        x={size / 2}
        y={size / 2 - 8}
        textAnchor="middle"
        fontFamily="Inter, -apple-system, system-ui, sans-serif"
        fontWeight={800}
        fontSize={size * 0.32}
        fill="#0B1220"
      >
        {Math.round(clamped)}
      </text>
      <text
        x={size / 2}
        y={size / 2 + size * 0.16}
        textAnchor="middle"
        fontFamily="Inter, -apple-system, system-ui, sans-serif"
        fontWeight={500}
        fontSize={size * 0.07}
        fill="#64748B"
      >
        {label}
      </text>
    </svg>
  );
}

export default QyroLifeScoreDonut;
