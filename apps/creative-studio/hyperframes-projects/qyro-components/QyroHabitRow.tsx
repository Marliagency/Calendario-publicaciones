/**
 * Fila de hábito de la tab "Hoy". Idéntica visualmente a la PWA real.
 */
export interface QyroHabitRowProps {
  emoji: string;
  name: string;
  timeLabel: string;
  durationLabel?: string;
  checked: boolean;
  streak?: number;
}

export function QyroHabitRow({
  emoji,
  name,
  timeLabel,
  durationLabel,
  checked,
  streak,
}: QyroHabitRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '20px 24px',
        background: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 1px 2px rgba(11,18,32,0.04), 0 1px 1px rgba(11,18,32,0.02)',
        marginBottom: 12,
        fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: '#F4F6FB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          marginRight: 16,
        }}
      >
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 22, color: '#0B1220', marginBottom: 4 }}>
          {name}
        </div>
        <div style={{ fontWeight: 500, fontSize: 16, color: '#64748B' }}>
          {timeLabel}
          {durationLabel ? ` · ${durationLabel}` : ''}
          {streak ? ` · 🔥 ${streak}` : ''}
        </div>
      </div>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '2px solid #E5E7EB',
          background: checked ? '#22C55E' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: 24,
          fontWeight: 800,
        }}
      >
        {checked ? '✓' : ''}
      </div>
    </div>
  );
}

export default QyroHabitRow;
