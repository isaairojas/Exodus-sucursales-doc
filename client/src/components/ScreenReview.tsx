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
import ModalDiscrepancy, { Discrepancy } from './ModalDiscrepancy';
import { DiscrepancyResolution } from '@/contexts/AppContext';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onPostReviewPrompt: (orderId: string) => void;
}

const UNKNOWN_CODE = 'XX-999';
const IMAGE_THEME: Record<string, { bg: string; accent: string }> = {
  'BP-001': { bg: '#eff6ff', accent: '#2563eb' },
  'FT-223': { bg: '#ecfeff', accent: '#0891b2' },
  'AM-445': { bg: '#f5f3ff', accent: '#7c3aed' },
  'BC-118': { bg: '#fff1f2', accent: '#e11d48' },
  'RD-772': { bg: '#f0fdfa', accent: '#0f766e' },
  'XX-999': { bg: '#fff7ed', accent: '#d97706' },
  'LT-334': { bg: '#f0f9ff', accent: '#0369a1' },
  'AC-201': { bg: '#f7fee7', accent: '#65a30d' },
  'BT-055': { bg: '#fef2f2', accent: '#dc2626' },
};

function getAdhocProductImage(code: string) {
  const theme = IMAGE_THEME[code] ?? { bg: '#f3f4f6', accent: '#4b5563' };
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'>
      <rect width='120' height='80' rx='10' fill='${theme.bg}'/>
      <rect x='10' y='12' width='100' height='56' rx='8' fill='white' stroke='${theme.accent}' stroke-width='1.8'/>
      <circle cx='28' cy='40' r='10' fill='${theme.accent}' opacity='0.22'/>
      <rect x='44' y='30' width='48' height='8' rx='3' fill='${theme.accent}' opacity='0.28'/>
      <rect x='44' y='44' width='38' height='6' rx='3' fill='${theme.accent}' opacity='0.18'/>
      <text x='60' y='72' text-anchor='middle' font-family='Roboto, Arial, sans-serif' font-size='11' fill='${theme.accent}' font-weight='700'>${code}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function ScreenReview({ showToast, onPostReviewPrompt }: Props) {
  const { state, processScan, finalizeReview, resetReview } = useApp();
  const [scanValue, setScanValue] = useState('');
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
      onPostReviewPrompt(order.id);
    }
  };

  const handleConfirmDisc = (resolutions: DiscrepancyResolution[]) => {
    setShowDiscModal(false);
    finalizeReview(resolutions);
    if (!order) return;
    onPostReviewPrompt(order.id);
  };

  if (!order) return null;

  let totalPartidas = 0, totalUnidades = 0;
  Object.values(state.scannedItems).forEach(item => {
    if (item.conteo > 0) { totalPartidas++; totalUnidades += item.conteo; }
  });

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden" style={{ animation: 'screenFadeIn 0.25s ease' }}>
        {/* Header estilo modal facturación */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #e5e7eb', background: '#1a2b6b' }}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>qr_code_scanner</span>
            <span className="font-bold text-sm text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
              Agregar revisión de pedido
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded text-xs font-bold text-white" style={{ background: '#2563eb' }}>
              Pedido #{order.id}
            </span>
            <span className="text-xs text-white opacity-75">Modo ciego</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4" style={{ background: '#f3f4f6' }}>
          {/* Scanner + stats */}
          <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#6b7280' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#2563eb' }}>barcode_scanner</span>
                  Campo de escaneo (activo)
                </div>
                <div className="relative">
                  <span
                    className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 z-10"
                    style={{ fontSize: 20, color: '#2563eb' }}
                  >
                    qr_code_scanner
                  </span>
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanValue}
                    onChange={e => setScanValue(e.target.value)}
                    onKeyDown={handleManualScan}
                    onClick={handleInputClick}
                    placeholder="Escanea o captura el código del producto..."
                    autoFocus
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none"
                    style={{
                      border: '2px solid #2563eb',
                      fontFamily: 'Roboto, sans-serif',
                      animation: 'scannerPulse 2s ease-in-out infinite',
                    }}
                    onFocus={e => { e.target.style.animation = 'none'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)'; }}
                    onBlur={e => { e.target.style.animation = 'scannerPulse 2s ease-in-out infinite'; e.target.style.boxShadow = ''; }}
                  />
                </div>
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  Clic en fila para escaneo rápido · Enter para confirmar código manual
                </p>
              </div>
              <div className="flex gap-5 lg:gap-6">
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: '#6b7280' }}>Partidas escaneadas</p>
                  <p className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{totalPartidas}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: '#6b7280' }}>Unidades totales</p>
                  <p className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{totalUnidades}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla con imagen de producto */}
          <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>table_rows</span>
              <span className="font-bold text-sm" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
                Registro de conteo
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Roboto, sans-serif' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Imagen', 'Cantidad req.', 'Conteo', 'No. Producto', 'Descripción', 'Observación'].map(h => (
                      <th
                        key={h}
                        className="text-left px-3 py-2"
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          borderBottom: '1px solid #d1d5db',
                        }}
                      >
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
                        onMouseLeave={e => { if (!isComplete && !isLast) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      >
                        <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <img
                            src={getAdhocProductImage(p.code)}
                            alt={p.code}
                            className="w-[72px] h-[48px] rounded-md object-cover border"
                            style={{ borderColor: '#e5e7eb' }}
                          />
                        </td>
                        <td
                          className="px-3 py-2.5 text-center font-bold"
                          style={{
                            borderBottom: '1px solid #f0f0f0',
                            color: isComplete ? '#16a34a' : '#374151',
                            borderLeft: isComplete ? '3px solid #16a34a' : isLast && item.conteo > 0 ? '3px solid #fbbf24' : '3px solid transparent',
                          }}
                        >
                          {p.qty}
                        </td>
                        <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <span
                            className="inline-flex items-center justify-center rounded-full text-white font-bold text-sm"
                            style={{
                              minWidth: 28,
                              height: 28,
                              padding: '0 8px',
                              background: isComplete ? '#16a34a' : isLast ? '#2563eb' : item.conteo > 0 ? '#1a2b6b' : '#d1d5db',
                              animation: isBumping ? 'badgePop 0.3s ease' : 'none',
                              transition: 'background 0.3s',
                            }}
                          >
                            {item.conteo}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#111827' }}>
                          {p.code}
                        </td>
                        <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', color: '#374151' }}>
                          {PRODUCT_CATALOG[p.code]?.name || p.code}
                        </td>
                        <td className="px-3 py-2.5 text-xs" style={{ borderBottom: '1px solid #f0f0f0', color: '#9ca3af' }}>
                          {item.observacion || '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {state.unknownProducts.length > 0 && (
                    <>
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-2"
                          style={{ background: '#fff7ed', borderTop: '2px solid #fbbf24', borderBottom: '1px solid #fde68a' }}
                        >
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
                        const isBumping = lastBump === code;
                        return (
                          <tr key={code} style={{ background: '#fff7ed', cursor: 'default' }}>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a' }}>
                              <img
                                src={getAdhocProductImage(code)}
                                alt={code}
                                className="w-[72px] h-[48px] rounded-md object-cover border"
                                style={{ borderColor: '#fcd34d' }}
                              />
                            </td>
                            <td
                              className="px-3 py-2.5 text-center italic"
                              style={{ borderBottom: '1px solid #fde68a', color: '#9ca3af', borderLeft: '3px solid #fbbf24' }}
                            >
                              —
                            </td>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a' }}>
                              <span
                                className="inline-flex items-center justify-center rounded-full text-white font-bold text-sm"
                                style={{ minWidth: 28, height: 28, padding: '0 8px', background: '#d97706', animation: isBumping ? 'badgePop 0.3s ease' : 'none' }}
                              >
                                {item.conteo}
                              </span>
                            </td>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a', fontWeight: 600, color: '#d97706' }}>
                              {code}
                            </td>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a', color: '#d97706' }}>
                              {PRODUCT_CATALOG[code]?.name || 'Producto no identificado'}
                            </td>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a' }}>
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: '#fef3c7', color: '#92400e' }}
                              >
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

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 flex-wrap" style={{ borderTop: '1px solid #e5e7eb', background: 'white' }}>
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
            onClick={() => resetReview()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #dc2626', color: '#dc2626', background: 'white', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
            Cancelar revisión
          </button>
          <button
            onClick={handleFinalize}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: '#16a34a', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#15803d')}
            onMouseLeave={e => (e.currentTarget.style.background = '#16a34a')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
            Aceptar
          </button>
        </div>
      </div>

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
