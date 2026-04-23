// ============================================================
// APYMSA — Screen 3: Blind Review (Main scanning screen)
// Design: Enterprise Precision — asymmetric split panel
// Interaction:
//   - Click product row → simulates scanning that product
//   - Click scanner input → fires one unknown product scan (XX-999)
//   - Manual typing + Enter still works
// ============================================================
import { useState, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB, PRODUCT_CATALOG } from '@/lib/data';
import ModalAuthorize from './ModalAuthorize';
import ModalDiscrepancy, { Discrepancy } from './ModalDiscrepancy';
import { DiscrepancyResolution } from '@/contexts/AppContext';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const UNKNOWN_CODE = 'XX-999';

export default function ScreenReview({ showToast }: Props) {
  const { state, processScan, goToScreen, finalizeReview, resetReview } = useApp();
  const [scanValue, setScanValue] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDiscModal, setShowDiscModal] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [lastBump, setLastBump] = useState<string | null>(null);
  const [unknownFired, setUnknownFired] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const order = state.selectedOrderId ? ORDERS_DB[state.selectedOrderId] : null;

  const refocusScanner = useCallback(() => {
    setTimeout(() => scanInputRef.current?.focus(), 80);
  }, []);

  // Core scan dispatcher
  const fireScan = useCallback((code: string) => {
    const isInOrder = order?.partidas.some(p => p.code === code);
    if (!isInOrder) {
      showToast(`Producto ${code} no pertenece al pedido — separar físicamente`, 'warning');
    }
    processScan(code);
    setLastBump(code);
    setTimeout(() => setLastBump(null), 400);
  }, [order, processScan, showToast]);

  // Click on a product row → scan it once
  const handleRowClick = (code: string) => {
    fireScan(code);
    refocusScanner();
  };

  // Click on the scanner input → fire unknown product (only once per session to keep it realistic)
  const handleInputClick = () => {
    if (!unknownFired) {
      setUnknownFired(true);
      fireScan(UNKNOWN_CODE);
      showToast(`Producto desconocido ${UNKNOWN_CODE} detectado`, 'warning');
    }
  };

  // Manual scan via keyboard
  const handleManualScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = scanValue.trim().toUpperCase();
      setScanValue('');
      if (!code) return;
      fireScan(code);
      refocusScanner();
    }
  };

  const handleFinalize = () => {
    if (!order) return;
    const discs: Discrepancy[] = [];
    order.partidas.forEach(p => {
      const item = state.scannedItems[p.code];
      const diff = item.conteo - p.qty;
      if (diff !== 0 && !item.authorized) {
        discs.push({
          code: p.code,
          name: PRODUCT_CATALOG[p.code]?.name || p.code,
          req: p.qty, conteo: item.conteo, diff,
          tipo: diff > 0 ? 'Sobrante' : 'Faltante',
        });
      }
    });
    state.unknownProducts.forEach(code => {
      const item = state.scannedItems[code];
      if (!item.authorized) {
        discs.push({
          code,
          name: PRODUCT_CATALOG[code]?.name || 'Producto no identificado',
          req: 0, conteo: item.conteo, diff: item.conteo,
          tipo: 'Producto incorrecto',
        });
      }
    });

    if (discs.length > 0) {
      setDiscrepancies(discs);
      setShowDiscModal(true);
    } else {
      finalizeReview();
      goToScreen('summary');
    }
  };

  const handleConfirmDisc = (resolutions: DiscrepancyResolution[]) => {
    setShowDiscModal(false);
    finalizeReview(resolutions);
    goToScreen('summary');
  };

  if (!order) return null;

  const lastCode = state.lastScannedCode;
  const lastItem = lastCode ? state.scannedItems[lastCode] : null;
  const lastProduct = lastCode ? PRODUCT_CATALOG[lastCode] : null;

  let totalPartidas = 0, totalUnidades = 0;
  Object.values(state.scannedItems).forEach(item => {
    if (item.conteo > 0) { totalPartidas++; totalUnidades += item.conteo; }
  });

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden" style={{ animation: 'screenFadeIn 0.3s ease' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 px-5 py-2 flex-shrink-0" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => resetReview()}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6"/></svg>
            Pedidos
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-700">Revisión — Pedido #{order?.id}</span>
        </div>
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left panel ── */}
          <div className="flex flex-col gap-4 p-5 overflow-y-auto"
            style={{ width: 360, flexShrink: 0, background: 'white', borderRight: '1px solid #e5e7eb' }}>

            {/* Order header */}
            <div className="rounded-lg p-4" style={{ background: '#f9fafb' }}>
              <div className="text-xl font-bold mb-3" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
                Pedido #{order.id}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Cliente ID', order.clienteId],
                  ['Cliente', order.cliente],
                  ['Elaboró', order.elaboro],
                  ['Origen', order.origen],
                  ['Fecha captura', order.fechaCaptura],
                  ['Inicio surtido', order.horaInicioSurtido],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
                    <span className="text-sm" style={{ color: '#374151' }}>{value}</span>
                  </div>
                ))}
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Fin surtido</span>
                  <span className="text-sm" style={{ color: '#374151' }}>{order.horaFinSurtido}</span>
                </div>
                {order.observaciones && (
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Observaciones</span>
                    <span className="text-sm italic" style={{ color: '#6b7280' }}>{order.observaciones}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scanner */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#6b7280' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#2563eb' }}>barcode_scanner</span>
                Campo de escaneo (activo)
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 z-10"
                  style={{ fontSize: 20, color: '#2563eb' }}>qr_code_scanner</span>
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanValue}
                  onChange={e => setScanValue(e.target.value)}
                  onKeyDown={handleManualScan}
                  onClick={handleInputClick}
                  placeholder="Clic aquí o escanear producto..."
                  autoFocus
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none"
                  style={{
                    border: '2px solid #2563eb',
                    fontFamily: 'Roboto, sans-serif',
                    animation: 'scannerPulse 2s ease-in-out infinite',
                    cursor: 'pointer',
                  }}
                  onFocus={e => { e.target.style.animation = 'none'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)'; }}
                  onBlur={e => { e.target.style.animation = 'scannerPulse 2s ease-in-out infinite'; e.target.style.boxShadow = ''; }}
                />
              </div>
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                Clic en el campo para simular producto no reconocido · Clic en fila para escanear
              </p>
            </div>

            {/* Stats */}
            <div className="rounded-lg p-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: '#6b7280' }}>Partidas escaneadas</span>
                <span className="font-bold" style={{ color: '#1a2b6b' }}>{totalPartidas}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#6b7280' }}>Unidades totales</span>
                <span className="font-bold" style={{ color: '#1a2b6b' }}>{totalUnidades}</span>
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto" style={{ background: '#f3f4f6' }}>

            {/* Product display */}
            <div className="bg-white rounded-lg p-5 flex gap-5 items-center"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <div className="rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                style={{ width: 120, height: 120, background: '#f9fafb', border: '2px dashed #d1d5db', color: '#9ca3af', fontSize: 11 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36 }}>photo_camera</span>
                <span>Sin imagen</span>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>
                  {lastCode || '—'}
                </div>
                <div className="font-bold mb-2 leading-tight" style={{ fontSize: 16, color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
                  {lastProduct ? lastProduct.name : lastCode ? lastCode : 'Esperando escaneo...'}
                </div>
                {lastCode && !lastProduct && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mb-2"
                    style={{ background: '#fffbeb', border: '1.5px solid #fbbf24', color: '#92400e' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#d97706' }}>warning</span>
                    Producto no pertenece al pedido
                  </div>
                )}
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>
                  Unidades escaneadas
                </div>
                <div
                  className="font-bold leading-none"
                  style={{
                    fontSize: 52,
                    color: lastCode && !lastProduct ? '#d97706' : '#1a2b6b',
                    fontFamily: 'Roboto, sans-serif',
                    animation: lastBump === lastCode ? 'countBump 0.3s ease' : 'none',
                  }}>
                  {lastItem ? lastItem.conteo : 0}
                </div>
              </div>
            </div>

            {/* Scanned table — clickable rows */}
            <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>table_rows</span>
                <span className="font-bold text-sm" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
                  Registro de conteo — Modo Ciego
                </span>
                <span className="ml-auto text-xs" style={{ color: '#9ca3af' }}>
                  Haz clic en una fila para escanear ese producto
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Roboto, sans-serif' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Cantidad req.', 'Conteo', 'No. Producto', 'Descripción', 'Observación'].map(h => (
                        <th key={h} className="text-left px-3 py-2"
                          style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #d1d5db' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {order.partidas.map(p => {
                      const item = state.scannedItems[p.code];
                      const isLast = state.lastScannedCode === p.code;
                      const isBumping = lastBump === p.code;
                      const isComplete = item.conteo >= p.qty && p.qty > 0;
                      return (
                        <tr
                          key={p.code}
                          onClick={() => handleRowClick(p.code)}
                          title="Clic para simular escaneo"
                          style={{
                            background: isComplete ? '#f0fdf4' : isLast && item.conteo > 0 ? '#fffbeb' : 'transparent',
                            transition: 'background 0.3s',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={e => { if (!isComplete && !isLast) (e.currentTarget as HTMLTableRowElement).style.background = '#eff6ff'; }}
                          onMouseLeave={e => { if (!isComplete && !isLast) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                          <td className="px-3 py-2.5 text-center font-bold"
                            style={{ borderBottom: '1px solid #f0f0f0', color: isComplete ? '#16a34a' : '#374151', borderLeft: isComplete ? '3px solid #16a34a' : isLast && item.conteo > 0 ? '3px solid #fbbf24' : '3px solid transparent' }}>
                            {p.qty}
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <span
                              className="inline-flex items-center justify-center rounded-full text-white font-bold text-sm"
                              style={{
                                minWidth: 28, height: 28, padding: '0 8px',
                                background: isComplete ? '#16a34a' : isLast ? '#2563eb' : item.conteo > 0 ? '#1a2b6b' : '#d1d5db',
                                animation: isBumping ? 'badgePop 0.3s ease' : 'none',
                                transition: 'background 0.3s',
                              }}>
                              {item.conteo}
                            </span>
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#111827' }}>{p.code}</td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', color: '#374151' }}>
                            {PRODUCT_CATALOG[p.code]?.name || p.code}
                          </td>
                          <td className="px-3 py-2.5 text-xs" style={{ borderBottom: '1px solid #f0f0f0', color: '#9ca3af' }}>
                            {item.observacion || '—'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Unknown products section */}
                    {state.unknownProducts.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={5} className="px-3 py-2"
                            style={{ background: '#fff7ed', borderTop: '2px solid #fbbf24', borderBottom: '1px solid #fde68a' }}>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706' }}>warning</span>
                              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#92400e' }}>
                                Productos no pertenecientes al pedido — Separar físicamente
                              </span>
                            </div>
                          </td>
                        </tr>
                        {state.unknownProducts.map(code => {
                          const item = state.scannedItems[code];
                          const isLast = state.lastScannedCode === code;
                          const isBumping = lastBump === code;
                          return (
                            <tr key={code}
                              style={{ background: '#fff7ed', cursor: 'default' }}>
                              <td className="px-3 py-2.5 text-center italic"
                                style={{ borderBottom: '1px solid #fde68a', color: '#9ca3af', borderLeft: '3px solid #fbbf24' }}>
                                —
                              </td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a' }}>
                                <span className="inline-flex items-center justify-center rounded-full text-white font-bold text-sm"
                                  style={{ minWidth: 28, height: 28, padding: '0 8px', background: '#d97706', animation: isBumping ? 'badgePop 0.3s ease' : 'none' }}>
                                  {item.conteo}
                                </span>
                              </td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a', fontWeight: 600, color: '#d97706' }}>{code}</td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a', color: '#d97706' }}>
                                {PRODUCT_CATALOG[code]?.name || 'Producto no identificado'}
                              </td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a' }}>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ background: '#fef3c7', color: '#92400e' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
                                  No pertenece al pedido
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 px-6 py-3 flex-wrap"
          style={{ background: 'white', borderTop: '1px solid #e5e7eb' }}>
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#d1d5db', color: '#9ca3af', cursor: 'not-allowed', fontFamily: 'Roboto, sans-serif' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
            Revisar nuevo pedido
          </button>
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
            Autorizar partida
          </button>
          <button
            onClick={() => showToast('Reimprimiendo etiquetas del pedido...', 'info')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
            Reimprimir etiquetas
          </button>
          <div className="flex-1" />
          <button
            onClick={handleFinalize}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a2b6b')}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>task_alt</span>
            Finalizar revisión
          </button>
        </div>
      </div>

      {showAuthModal && (
        <ModalAuthorize
          onClose={() => { setShowAuthModal(false); refocusScanner(); }}
          showToast={showToast}
        />
      )}
      {showDiscModal && (
        <ModalDiscrepancy
          discrepancies={discrepancies}
          onConfirm={handleConfirmDisc}
          onBack={() => { setShowDiscModal(false); refocusScanner(); }}
          showToast={showToast}
        />
      )}
    </>
  );
}
