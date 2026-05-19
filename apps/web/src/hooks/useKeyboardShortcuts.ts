import { useEffect } from 'react';

type Handler = () => void;
export interface Shortcuts {
  j?: Handler;
  k?: Handler;
  t?: Handler;
  r?: Handler;
}

/**
 * Atajos de teclado globales:
 *   J  día/semana siguiente · K  anterior · T  hoy · R  cola de revisión
 *
 * Se ignoran si el foco está en un input/textarea para no interferir con escritura.
 */
export function useKeyboardShortcuts(s: Shortcuts) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable)
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'j' && s.j) {
        e.preventDefault();
        s.j();
      } else if (k === 'k' && s.k) {
        e.preventDefault();
        s.k();
      } else if (k === 't' && s.t) {
        e.preventDefault();
        s.t();
      } else if (k === 'r' && s.r) {
        e.preventDefault();
        s.r();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s]);
}
