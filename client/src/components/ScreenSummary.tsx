// ============================================================
// APYMSA — Screen 4b: Summary
// Design: Enterprise Precision
//
// Status logic per scanned item:
//   removedFromCount → diff 0, "✓ Correcto" (pieza retirada del conteo)
//   denied           → diff negative, "✗ Producto negado (motivo)"
//   authorized       → diff as-is, "⚠ Autorizado (motivo)"  [sobrante]
//   diff === 0       → "✓ Correcto"
//   else             → "✗ Con diferencia"
//
// resetReview adds order to completedOrderIds → hidden from selection
// ============================================================
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB, PRODUCT_CATALOG, formatDateTime } from '@/lib/data';
import ModalFacturacion from './ModalFacturacion';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function ScreenSummary({ showToast }: Props) {
  const { state, resetReview } = useApp();
  const [showFactura, setShowFactura] = useState(false);
  const order = state.selectedOrderId ? ORDERS_DB[state.selectedOrderId] : null;
  if (!order) return null;

  let totalReq = 0, totalCont = 0, negados = 0;
  order.partidas.forEach(p => {
    totalReq += p.qty;
    const item = state.scannedItems[p.code];
    // If removed from count, effective conteo = req (no diff)
    const effectiveConteo = item?.removedFromCount ? p.qty : (item?.conteo ?? 0);
    totalCont += effectiveConteo;
    if (item?.denied) negados++;
  });

  // Has incidencias only if there are denied products (negados) or sobrantes
  const hasIncidencias = order.partidas.some(p => {
    const item = state.scannedItems[p.code];
    if (!item) return false;
    if (item.removedFromCount) return false; // resolved cleanly
    if (item.denied) return true;
    return item.conteo !== p.qty;
  });

  const handleClose = () => resetReview();
  const handlePrint = () => {
    showToast('Preparando reporte para impresión...', 'info');
    setTimeout(() => window.print(), 500);
  };

  return (
    <>
      <div className="flex-1 p-8 overflow-auto" style={{ background: '#f3f4f6', animation: 'screenFadeIn 0.3s ease' }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#16a34a', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <span className="material-symbols-outlined text-white"
              style={{ fontSize: 32, fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24" }}>
              check
            </span>
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
              Revisión Completada
            </div>
            <div className="text-sm mt-0.5" style={{ color: '#6b7280' }}>
              El pedido ha sido verificado exitosamente
            </div>
          </div>
          <div>
            {hasIncidencias ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm"
                style={{ background: '#fef3c7', color: '#92400e' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
                CON INCIDENCIAS AUTORIZADAS
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm"
                style={{ background: '#dcfce7', color: '#166534' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                SIN INCIDENCIAS
              </span>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="flex gap-6 mb-5 text-xs" style={{ color: '#6b7280' }}>
          <span>Inicio revisión: <strong style={{ color: '#374151' }}>{formatDateTime(state.reviewStartTime)}</strong></span>
          <span>Fin revisión: <strong style={{ color: '#374151' }}>{formatDateTime(state.reviewEndTime)}</strong></span>
          <span>Revisor: <strong style={{ color: '#374151' }}>Isai</strong></span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: 'Pedido ID', value: order.id, large: true },
            { label: 'Cliente', value: order.cliente, large: false },
            { label: 'Total productos requeridos', value: String(totalReq), large: true },
            { label: 'Total productos contados', value: String(totalCont), large: true },
            { label: 'Productos negados', value: String(negados), large: true },
            {
              label: 'Resultado', value: '', large: false,
              custom: hasIncidencias ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm"
                  style={{ background: '#fef3c7', color: '#92400e' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                  CON INCIDENCIAS
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm"
                  style={{ background: '#dcfce7', color: '#166534' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                  SIN INCIDENCIAS
                </span>
              )
            },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-lg p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#6b7280', fontSize: 11 }}>
                {stat.label}
              </div>
              {(stat as any).custom ? (stat as any).custom : (
                <div className="font-bold" style={{ fontSize: stat.large ? 22 : 16, color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
                  {stat.value}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Full table — only order partidas, NO unknown products */}
        <div className="bg-white rounded-lg overflow-hidden mb-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>table_rows</span>
            <span className="font-bold text-sm" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
              Detalle completo de partidas
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Roboto, sans-serif' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['No. Producto', 'Descripción', 'Cantidad req.', 'Conteo', 'Diferencia', 'Estatus'].map(h => (
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

                  // Effective values after resolution
                  const effectiveConteo = item?.removedFromCount ? p.qty : (item?.conteo ?? 0);
                  const diff = effectiveConteo - p.qty;
                  const diffStr = diff === 0 ? '—' : diff > 0 ? `+${diff}` : `${diff}`;
                  const diffColor = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#6b7280';

                  let statusEl: React.ReactNode;
                  if (item?.removedFromCount) {
                    // Piece was removed from count → treat as correct
                    statusEl = <span className="font-semibold" style={{ color: '#16a34a' }}>✓ Correcto</span>;
                  } else if (item?.denied) {
                    // Faltante authorized → product negado
                    statusEl = (
                      <span className="font-semibold" style={{ color: '#dc2626' }}>
                        ✗ Producto negado{item.authMotivo ? ` (${item.authMotivo})` : ''}
                      </span>
                    );
                  } else if (diff === 0) {
                    statusEl = <span className="font-semibold" style={{ color: '#16a34a' }}>✓ Correcto</span>;
                  } else if (item?.authorized) {
                    statusEl = <span className="font-semibold" style={{ color: '#d97706' }}>⚠ Autorizado ({item.authMotivo || 'sin motivo'})</span>;
                  } else {
                    statusEl = <span className="font-semibold" style={{ color: '#dc2626' }}>✗ Con diferencia</span>;
                  }

                  return (
                    <tr key={p.code}>
                      <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#111827' }}>{p.code}</td>
                      <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', color: '#374151' }}>
                        {PRODUCT_CATALOG[p.code]?.name || p.code}
                      </td>
                      <td className="px-3 py-2.5 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#374151' }}>{p.qty}</td>
                      <td className="px-3 py-2.5 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#374151' }}>{effectiveConteo}</td>
                      <td className="px-3 py-2.5 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: diffColor }}>{diffStr}</td>
                      <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0' }}>{statusEl}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={handleClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Volver a selección
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
            Imprimir reporte
          </button>
          <button
            onClick={() => setShowFactura(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a2b6b')}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>
            Facturar pedido
          </button>
        </div>
      </div>

      {showFactura && (
        <ModalFacturacion
          order={order}
          onClose={() => { setShowFactura(false); handleClose(); }}
          showToast={showToast}
        />
      )}
    </>
  );
}
