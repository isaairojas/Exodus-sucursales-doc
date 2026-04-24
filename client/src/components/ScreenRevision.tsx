// ============================================================
// APYMSA — Módulo de Revisión (Selector de pedidos a revisar)
// Design: Enterprise Precision — navy header, table layout
// Muestra pedidos en estado "Surtido" listos para revisión
// Al seleccionar un pedido, lanza el flujo de escaneo (ScreenReview)
// ============================================================
import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB, Order, OrderStatus } from '@/lib/data';
import ScreenReview from './ScreenReview';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  'Surtido':                { bg: '#fff7ed', color: '#c2410c', label: 'Surtido' },
  'Revisado':               { bg: '#f0fdf4', color: '#15803d', label: 'Revisado' },
  'Revisado con incidencias': { bg: '#fef3c7', color: '#b45309', label: 'Revisado c/inc.' },
};

export default function ScreenRevision({ showToast }: Props) {
  const { state, loadOrder, goToScreen } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Build orders with live statuses
  const allOrders: Order[] = useMemo(() =>
    Object.values(ORDERS_DB).map(o => ({
      ...o,
      status: (state.orderStatuses[o.id] ?? o.status) as OrderStatus,
    })),
    [state.orderStatuses]
  );

  // Only show Surtido orders (ready to review)
  const pendingOrders = useMemo(() =>
    allOrders.filter(o => o.status === 'Surtido'),
    [allOrders]
  );

  const handleIniciarRevision = () => {
    if (!selectedId) return;
    loadOrder(selectedId);
    goToScreen('review');
  };

  // If review is in progress, show the review screen
  if (state.currentScreen === 'review' || state.currentScreen === 'summary') {
    return <ScreenReview showToast={showToast} onPostReviewPrompt={() => goToScreen('orders')} />;
  }

  const selectedOrder = selectedId ? pendingOrders.find(o => o.id === selectedId) ?? null : null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#f5f7fa' }}>
      {/* Sub-header */}
      <div
        className="flex-shrink-0 px-6 py-3 flex items-center gap-3"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#1a2b6b' }}
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-gray-800" style={{ fontSize: 15 }}>Módulo de Revisión</h2>
          <p className="text-xs text-gray-500">Selecciona un pedido surtido para iniciar la revisión de productos</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
          >
            {pendingOrders.length} pedido{pendingOrders.length !== 1 ? 's' : ''} pendiente{pendingOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {pendingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <svg className="w-16 h-16 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <p className="text-sm font-medium">No hay pedidos pendientes de revisión</p>
            <p className="text-xs text-center max-w-xs">Los pedidos en estado "Surtido" aparecerán aquí listos para iniciar la revisión de productos.</p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
                  {['', 'Pedido ID', 'Cliente', 'Vendedor', 'Fecha Captura', 'Fecha Entrega', 'Hora Entrega', 'Zona', 'Total', 'Partidas'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map((order, idx) => {
                  const isSelected = order.id === selectedId;
                  const statusCfg = STATUS_COLORS[order.status] ?? { bg: '#f3f4f6', color: '#6b7280', label: order.status };
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedId(isSelected ? null : order.id)}
                      style={{
                        background: isSelected ? '#eff6ff' : idx % 2 === 0 ? '#fff' : '#fafafa',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                        transition: 'background 0.12s',
                      }}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedId(order.id)}
                          className="accent-blue-700"
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2.5 font-bold text-gray-800">{order.id}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-700">{order.cliente}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{order.vendedor}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{order.fechaCaptura}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{order.fechaEntrega || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{order.horaEntrega || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{order.zona || '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{order.total}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: '#e0e7ff', color: '#3730a3' }}
                        >
                          {order.partidas.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div
        className="flex-shrink-0 px-6 py-3 flex items-center justify-between gap-4"
        style={{ background: '#fff', borderTop: '1px solid #e5e7eb' }}
      >
        <div className="text-xs text-gray-400">
          {selectedOrder
            ? `Pedido #${selectedOrder.id} — ${selectedOrder.cliente} · ${selectedOrder.partidas.length} partida${selectedOrder.partidas.length !== 1 ? 's' : ''} · ${selectedOrder.total}`
            : 'Selecciona un pedido para iniciar la revisión'
          }
        </div>
        <button
          onClick={handleIniciarRevision}
          disabled={!selectedId}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          style={selectedId
            ? { background: '#2563eb', color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }
            : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
          }
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          Iniciar revisión
        </button>
      </div>
    </div>
  );
}
