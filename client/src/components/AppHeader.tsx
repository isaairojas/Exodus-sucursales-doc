// ============================================================
// APYMSA — AppHeader
// Design: Enterprise Precision — navy sticky header with nav tabs
// ============================================================
import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { SUCURSALES_EJERCICIO, TraspasoTipo, perspectivaTraspaso, tipoPaqueteriaDe } from '@/lib/data';
import { useLocation } from 'wouter';

type DesktopView = 'orders' | 'embarques' | 'traspasos-entre-sucursales';

interface Props {
  activeView?: DesktopView;
  onNavigateToOrders?: () => void;
  onNavigateToEmbarques?: () => void;
  // El header decide con qué vista abrir Traspasos (Por enviar / Por recibir).
  // Home lo forwardea a ScreenTraspasosEntreSucursales como `initialTab`.
  onNavigateToTraspasosEntreSucursales?: (tab?: TraspasoTipo) => void;
}

export default function AppHeader({
  activeView,
  onNavigateToOrders,
  onNavigateToEmbarques,
  onNavigateToTraspasosEntreSucursales,
}: Props) {
  const { state, sucursalActual, setSucursalActual, reiniciarEstadoCompartido, traspasos, embarquesTraspaso } = useApp();
  const [, navigate] = useLocation();
  const [traspasosMenuOpen, setTraspasosMenuOpen] = useState(false);

  // Contadores accionables por vista (para el badge y el menú):
  //  • Por recibir (Entrante) → status 'Enviado' (pendiente de dar entrada).
  //  • Por enviar  (Saliente) → status 'Pendiente' (pendiente de surtir).
  const contadorPorTipo = useMemo(() => {
    const counts: Record<TraspasoTipo, number> = { Entrante: 0, Saliente: 0 };
    traspasos.forEach(t => {
      const per = perspectivaTraspaso(t, sucursalActual);
      if (!per.visible) return;
      if (per.tipo === 'Entrante' && t.status === 'Enviado') counts.Entrante++;
      if (per.tipo === 'Saliente' && t.status === 'Pendiente') counts.Saliente++;
    });
    return counts;
  }, [traspasos, sucursalActual]);
  const totalTraspasos = contadorPorTipo.Entrante + contadorPorTipo.Saliente;

  // F21 — Contador de guías pendientes de la sucursal actual. Un embarque
  // "tiene guía pendiente" si es WebService y aún no se generó guiaId.
  const guiasPendientes = useMemo(() => {
    return embarquesTraspaso.filter(e => {
      if (tipoPaqueteriaDe(e.paqueteria) !== 'WebService') return false;
      if (e.guiaId) return false;
      // Cuenta solo si algún traspaso del embarque involucra a la sucursal actual.
      return e.traspasos.some(petId => {
        const t = traspasos.find(x => x.id === petId);
        if (!t) return false;
        const per = perspectivaTraspaso(t, sucursalActual);
        return per.visible;
      });
    }).length;
  }, [embarquesTraspaso, traspasos, sucursalActual]);

  const handleReiniciar = () => {
    const ok = window.confirm(
      'Reiniciar el estado compartido a su estado inicial.\n\nSe perderán todos los cambios registrados en todas las computadoras conectadas. ¿Continuar?'
    );
    if (ok) reiniciarEstadoCompartido();
  };
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

            <img
              src={`${import.meta.env.BASE_URL}apymsa-logo.png`}
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

          {/* Traspasos: dropdown que expone las dos vistas (Por enviar / Por
              recibir) cada una con su flecha individual. El badge sobre el ↔
              muestra el TOTAL accionable (por dar entrada + por surtir); dentro
              del menú se desglosa por vista. */}
          <div className="relative">
            <button
              style={tabStyle(activeView === 'traspasos-entre-sucursales')}
              onClick={() => setTraspasosMenuOpen(o => !o)}
            >
              <span className="relative inline-flex items-center">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>swap_horiz</span>
                {totalTraspasos > 0 && (
                  <span
                    className="absolute flex items-center justify-center text-[9px] font-bold rounded-full"
                    style={{
                      top: -6, right: -8, minWidth: 15, height: 15, padding: '0 3px',
                      background: '#ef4444', color: '#fff', border: '1.5px solid #1a2b6b',
                    }}
                    title={`${totalTraspasos} traspaso(s) accionable(s)`}
                  >
                    {totalTraspasos}
                  </span>
                )}
              </span>
              Traspasos
              <span className="material-symbols-outlined" style={{ fontSize: 16, opacity: 0.75, transform: traspasosMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                expand_more
              </span>
            </button>
            {traspasosMenuOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setTraspasosMenuOpen(false)} />
                <div
                  className="absolute z-[61] rounded-lg overflow-hidden"
                  style={{ top: '100%', left: 0, marginTop: 2, background: '#fff', border: '1px solid #d1d5db', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', minWidth: 250 }}
                >
                  {/* Por enviar (Saliente) — flecha derecha morada. */}
                  <button
                    onClick={() => { setTraspasosMenuOpen(false); onNavigateToTraspasosEntreSucursales?.('Saliente'); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-left transition-colors hover:bg-gray-50"
                    style={{ color: '#1a2b6b' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7c3aed' }}>arrow_forward</span>
                    <span>Por enviar</span>
                    <span className="ml-auto text-[11px] font-semibold" style={{ color: '#7c3aed' }}>
                      {contadorPorTipo.Saliente} por surtir
                    </span>
                  </button>
                  {/* Por recibir (Entrante) — flecha izquierda azul. */}
                  <button
                    onClick={() => { setTraspasosMenuOpen(false); onNavigateToTraspasosEntreSucursales?.('Entrante'); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-left transition-colors hover:bg-gray-50"
                    style={{ color: '#1a2b6b', borderTop: '1px solid #f0f0f0' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>arrow_back</span>
                    <span>Por recibir</span>
                    <span className="ml-auto text-[11px] font-semibold" style={{ color: '#2563eb' }}>
                      {contadorPorTipo.Entrante} por dar entrada
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* F21 — Badge de guías pendientes de la sucursal actual */}
      {state.currentScreen !== 'auth' && guiasPendientes > 0 && (
        <div
          className="flex items-center gap-1 ml-auto rounded px-2 py-1"
          style={{ background: 'rgba(234,179,8,0.20)', border: '1px solid rgba(234,179,8,0.55)', color: '#fbbf24' }}
          title={`${guiasPendientes} embarque(s) WebService sin guía generada`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>pending</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>{guiasPendientes}</span>
          <span style={{ fontSize: 10, opacity: 0.9 }}>guías pendientes</span>
        </div>
      )}

      {/* Selector global de sucursal */}
      {state.currentScreen !== 'auth' && (
        <div className={`flex items-center gap-2 ${guiasPendientes > 0 ? 'ml-2' : 'ml-auto'} pr-2`} title="Sucursal en la que estás operando">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>store</span>
          <div className="flex flex-col leading-none">
            <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>Sucursal</span>
            <select
              value={sucursalActual}
              onChange={e => setSucursalActual(e.target.value)}
              className="text-xs font-bold rounded cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '3px 6px',
                marginTop: 2,
              }}
            >
              {SUCURSALES_EJERCICIO.map(s => (
                <option key={s} value={s} style={{ color: '#1a2b6b', background: '#fff' }}>{s}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              // F132 — Dispara la tecla ? para abrir el modal de ayuda
              window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
            }}
            className="flex items-center gap-1 rounded text-xs font-semibold transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)', padding: '5px 8px', marginLeft: 6 }}
            title="Ver atajos de teclado (?)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>help</span>
          </button>
          <button
            onClick={handleReiniciar}
            className="flex items-center gap-1 rounded text-xs font-semibold transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)', padding: '5px 8px', marginLeft: 6 }}
            title="Reiniciar el estado compartido al estado inicial (afecta a todas las computadoras)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>restart_alt</span>
            Reiniciar
          </button>
        </div>
      )}

      {/* User chip */}
      {state.currentScreen !== 'auth' && (
        <div className="flex items-center gap-2 text-sm px-6" style={{ color: 'rgba(255,255,255,0.85)' }}>
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
            L
          </div>
          <span>Logístico 1</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>|</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Logistica</span>
        </div>
      )}
    </header>
  );
}
