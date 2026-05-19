/**
 * Tres anillos concéntricos estilo Apple Activity, mapeados a los pilares
 * de QYRO: hábitos (azul), entrenos (púrpura), nutrición (verde).
 *
 * Cada `progress[i]` ∈ [0, 1]. Para animación, alimenta cada valor como
 * función del frame.
 */
export interface QyroActivityRingsProps {
  /** [hábitos, entrenos, nutrición] en [0,1]. */
  progress: [number, number, number];
  size?: number;
  stroke?: number;
}

const COLORS: [string, string, string] = ['#3B82F6', '#7C5CFC', '#22C55E'];
const LABELS = ['Hábitos', 'Entrenos', 'Nutrición'] as const;

export function QyroActivityRings({ progress, size = 480, stroke = 32 }: QyroActivityRingsProps) {
  const center = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Actividad"
    >
      {progress.map((p, i) => {
        const clamped = Math.max(0, Math.min(1, p));
        const radius = (size - stroke) / 2 - i * (stroke + 8);
        if (radius <= 0) return null;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - clamped);
        return (
          <g key={LABELS[i]}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={`${COLORS[i]}22`}
              strokeWidth={stroke}
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={COLORS[i]}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${center} ${center})`}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default QyroActivityRings;
