// ============================================================
// APYMSA — AppHeader
// Design: Enterprise Precision — navy sticky header with nav tabs
// ============================================================
import { useApp } from '@/contexts/AppContext';

interface Props {
  activeView?: 'orders' | 'embarques' | 'revision';
  onNavigateToOrders?: () => void;
  onNavigateToEmbarques?: () => void;
  onNavigateToRevision?: () => void;
}

export default function AppHeader({ activeView, onNavigateToOrders, onNavigateToEmbarques, onNavigateToRevision }: Props) {
  const { state } = useApp();
  const showNav = state.currentScreen === 'orders';

  const tabStyle = (active: boolean) => ({
    padding: '0 16px',
    height: 56,
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 6,
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? '#fff' : 'rgba(255,255,255,0.55)',
    cursor: 'pointer' as const,
    transition: 'all 0.15s',
    background: 'transparent',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid' as const,
    borderBottomColor: active ? '#60a5fa' : 'transparent',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <header
      className="flex items-center sticky top-0 z-50"
      style={{
        background: '#1a2b6b',
        height: 56,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6" style={{ borderRight: showNav ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
        <div>
          <div className="font-bold tracking-widest text-white" style={{ fontSize: 18, letterSpacing: '1px' }}>
            APYMSA
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.3px', lineHeight: 1 }}>
            Autopartes y Mayoreo, S.A. de C.V.
          </div>
        </div>
      </div>

      {/* Nav tabs — only shown on orders screen */}
      {showNav && (
        <div className="flex items-center flex-1">
          <button
            style={tabStyle(activeView === 'orders')}
            onClick={onNavigateToOrders}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="12" y2="16"/>
            </svg>
            Pedidos
          </button>
          <button
            style={tabStyle(activeView === 'embarques')}
            onClick={onNavigateToEmbarques}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="1" y="3" width="15" height="13" rx="1"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Embarques
          </button>
          <button
            style={tabStyle(activeView === 'revision')}
            onClick={onNavigateToRevision}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            Revisión
          </button>
        </div>
      )}

      {/* User chip */}
      {state.currentScreen !== 'auth' && (
        <div className="flex items-center gap-2 text-sm px-6 ml-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
            style={{ background: '#2563eb', border: '2px solid rgba(255,255,255,0.3)' }}
          >
            C
          </div>
          <span>Cosme</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Gestión de Pedidos</span>
        </div>
      )}
    </header>
  );
}
