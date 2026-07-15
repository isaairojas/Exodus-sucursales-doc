// ============================================================
// APYMSA — AppHeader
// Design: Enterprise Precision — navy sticky header with nav tabs
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'wouter';
import { TRASPASO_TIPO_LABELS, TRASPASO_TIPO_ICONS } from '@/lib/data';

type DesktopView = 'orders' | 'embarques' | 'traspasos-recibir' | 'traspasos-envio' | 'traspasos-nueva';

interface Props {
  activeView?: DesktopView;
  onNavigateToOrders?: () => void;
  onNavigateToEmbarques?: () => void;
  onNavigateToTraspasosRecibir?: () => void;
  onNavigateToTraspasosEnviar?: () => void;
  onNavigateToTraspasosNueva?: () => void;
}

const OPEN_DELAY = 150;
const CLOSE_DELAY = 200;

export default function AppHeader({
  activeView,
  onNavigateToOrders,
  onNavigateToEmbarques,
  onNavigateToTraspasosRecibir,
  onNavigateToTraspasosEnviar,
  onNavigateToTraspasosNueva,
}: Props) {
  const { state } = useApp();
  const [, navigate] = useLocation();
  const showNav = state.currentScreen === 'orders';

  const [traspasosOpen, setTraspasosOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = () => {
    if (openTimerRef.current) { clearTimeout(openTimerRef.current); openTimerRef.current = null; }
  };
  const clearCloseTimer = () => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  };

  const scheduleOpen = () => {
    clearCloseTimer();
    if (traspasosOpen) return;
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => setTraspasosOpen(true), OPEN_DELAY);
  };

  const scheduleClose = () => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setTraspasosOpen(false), CLOSE_DELAY);
  };

  const handleTriggerClick = () => {
    clearOpenTimer();
    clearCloseTimer();
    setTraspasosOpen(o => !o);
  };

  const closeNow = () => {
    clearOpenTimer();
    clearCloseTimer();
    setTraspasosOpen(false);
  };

  // Cierra al hacer click fuera del menú
  useEffect(() => {
    if (!traspasosOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeNow();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [traspasosOpen]);

  // Limpieza de timers al desmontar
  useEffect(() => () => { clearOpenTimer(); clearCloseTimer(); }, []);

  const isTraspasosActive = activeView === 'traspasos-recibir' || activeView === 'traspasos-envio' || activeView === 'traspasos-nueva';

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

  const submenuItemStyle = (active: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
    width: '100%',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? '#1a2b6b' : '#374151',
    background: active ? 'rgba(26,43,107,0.06)' : 'transparent',
    border: 'none',
    cursor: 'pointer' as const,
    textAlign: 'left' as const,
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

            <img
              src="/apymsa-logo.png"
              alt="APYMSA"
              style={{ height: 22, width: 'auto', display: 'block' }}
            />

          <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.3px', lineHeight: 1, marginTop: 3 }}>
            Exodus Sucursales
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

          {/* Traspasos — dropdown menu */}
          <div
            ref={containerRef}
            className="relative"
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
          >
            <button
              style={tabStyle(isTraspasosActive)}
              onClick={handleTriggerClick}
              aria-haspopup="true"
              aria-expanded={traspasosOpen}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>swap_horiz</span>
              Traspasos
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, transition: 'transform 0.15s', transform: traspasosOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                expand_more
              </span>
            </button>

            {traspasosOpen && (
              <div
                className="absolute rounded-lg overflow-hidden"
                style={{
                  top: '100%',
                  left: 0,
                  minWidth: 200,
                  background: '#fff',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
                  border: '1px solid #e5e7eb',
                  padding: '6px 0',
                  zIndex: 60,
                }}
              >
                <button
                  style={submenuItemStyle(activeView === 'traspasos-recibir')}
                  onClick={() => { onNavigateToTraspasosRecibir?.(); closeNow(); }}
                >
                  {TRASPASO_TIPO_LABELS.Entrante}
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#2563eb' }}>
                    {TRASPASO_TIPO_ICONS.Entrante}
                  </span>
                </button>
                <button
                  style={submenuItemStyle(activeView === 'traspasos-envio')}
                  onClick={() => { onNavigateToTraspasosEnviar?.(); closeNow(); }}
                >
                  {TRASPASO_TIPO_LABELS.Saliente}
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7c3aed' }}>
                    {TRASPASO_TIPO_ICONS.Saliente}
                  </span>
                </button>
                <div style={{ height: 1, background: '#e5e7eb', margin: '6px 0' }} />
                <button
                  style={submenuItemStyle(activeView === 'traspasos-nueva')}
                  onClick={() => { onNavigateToTraspasosNueva?.(); closeNow(); }}
                >
                  Nueva solicitud
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#16a34a' }}>
                    add_circle
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User chip */}
      {state.currentScreen !== 'auth' && (
        <div className="flex items-center gap-2 text-sm px-6 ml-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
            title="Ir al Home"
            aria-label="Ir al Home"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 9.5V20h14V9.5" />
              <path d="M10 20v-6h4v6" />
            </svg>
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
            style={{ background: '#2563eb', border: '2px solid rgba(255,255,255,0.3)' }}
          >
            C
          </div>
          <span>Cosme</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Logistica</span>
        </div>
      )}
    </header>
  );
}
