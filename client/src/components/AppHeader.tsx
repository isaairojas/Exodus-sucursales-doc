// ============================================================
// APYMSA — AppHeader
// Design: Enterprise Precision — navy sticky header
// ============================================================
import { useApp } from '@/contexts/AppContext';

export default function AppHeader() {
  const { state } = useApp();
  const showUser = state.currentScreen !== 'auth';

  return (
    <header
      className="flex items-center justify-between px-6 sticky top-0 z-50"
      style={{
        background: '#1a2b6b',
        height: 56,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        flexShrink: 0,
      }}>
      <div className="flex items-center gap-3">
        <div>
          <div className="font-bold tracking-widest text-white" style={{ fontSize: 18, letterSpacing: '1px' }}>
            APYMSA
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.3px', lineHeight: 1 }}>
            Autopartes y Mayoreo, S.A. de C.V.
          </div>
        </div>
      </div>

      {showUser && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
            style={{ background: '#2563eb', border: '2px solid rgba(255,255,255,0.3)' }}>
            C
          </div>
          <span>Cosme</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Módulo de Revisión</span>
        </div>
      )}
    </header>
  );
}
