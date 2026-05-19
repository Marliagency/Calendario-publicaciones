import type { ReactNode } from 'react';

/**
 * Marco de iPhone con notch, ratio 9:16 nativo. Es el contenedor visual
 * por defecto para todos los demos de UI de QYRO en HyperFrames.
 *
 * Dimensiones por defecto (1080 × 1920) — se renderiza a Reel/TikTok 9:16
 * sin recrop. Para 4:5 IG-Feed, envolver en un canvas más ancho con
 * background QYRO `#F4F6FB` y centrar este componente.
 */
export interface QyroPhoneFrameProps {
  width?: number;
  height?: number;
  /** Color del marco. */
  bezelColor?: string;
  /** Color del fondo dentro del marco (canvas de la app). */
  canvasColor?: string;
  /** Reloj del status bar. */
  time?: string;
  children?: ReactNode;
}

export function QyroPhoneFrame({
  width = 1080,
  height = 1920,
  bezelColor = '#0B1220',
  canvasColor = '#F4F6FB',
  time = '9:41',
  children,
}: QyroPhoneFrameProps) {
  const bezelRadius = 96;
  const notchWidth = 360;
  const notchHeight = 56;
  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        background: bezelColor,
        borderRadius: bezelRadius,
        overflow: 'hidden',
        boxShadow: '0 16px 64px rgba(11,18,32,0.18)',
        fontFamily: "Inter, -apple-system, system-ui, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          bottom: 20,
          background: canvasColor,
          borderRadius: bezelRadius - 18,
          overflow: 'hidden',
        }}
      >
        {/* Notch */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            width: notchWidth,
            height: notchHeight,
            background: '#0B1220',
            borderRadius: notchHeight / 2,
            zIndex: 10,
          }}
        />
        {/* Status bar */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 60,
            right: 60,
            height: notchHeight,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 26,
            fontWeight: 700,
            color: '#0B1220',
            zIndex: 11,
          }}
        >
          <span>{time}</span>
          <span style={{ opacity: 0.8 }}>● ● ●</span>
        </div>
        {/* Content area */}
        <div style={{ position: 'absolute', top: 100, left: 0, right: 0, bottom: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default QyroPhoneFrame;
