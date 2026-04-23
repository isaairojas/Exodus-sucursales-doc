// ============================================================
// APYMSA — ScreenOrders
// Pantalla principal de gestión de pedidos
// Design: Enterprise Precision — light theme, navy #1a2b6b
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB, Order, OrderStatus, STATUS_COLORS } from '@/lib/data';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToEmbarques: () => void;
}

const ALL_STATUSES: OrderStatus[] = ['Activo', 'Surtido', 'Revisado', 'Revisado con incidencias', 'Documentado', 'Enviado', 'Facturado', 'Cancelado'];

function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS['Activo'];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

export default function ScreenOrders({ showToast, onNavigateToEmbarques }: Props) {
  const { state, goToScreen, loadOrder, updateOrderStatus } = useApp();

  // Filters
  const [fechaInicial, setFechaInicial] = useState('2026-04-22');
  const [fechaFinal, setFechaFinal] = useState('2026-04-22');
  const [filterActivo, setFilterActivo] = useState(true);
  const [filterRetenido, setFilterRetenido] = useState(true);
  const [filterFacturado, setFilterFacturado] = useState(false);
  const [filterCancelado, setFilterCancelado] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Build orders list with live statuses
  const allOrders: Order[] = useMemo(() =>
    Object.values(ORDERS_DB).map(o => ({
      ...o,
      status: (state.orderStatuses[o.id] ?? o.status) as OrderStatus,
    })),
    [state.orderStatuses]
  );

  // Apply filters
  const filteredOrders = useMemo(() => {
    const allowedStatuses = new Set<OrderStatus>();
    if (filterActivo)    { allowedStatuses.add('Activo'); allowedStatuses.add('Surtido'); allowedStatuses.add('Revisado'); allowedStatuses.add('Revisado con incidencias'); allowedStatuses.add('Documentado'); allowedStatuses.add('Enviado'); }
    if (filterRetenido)  { /* same as activo for demo */ }
    if (filterFacturado) { allowedStatuses.add('Facturado'); }
    if (filterCancelado) { allowedStatuses.add('Cancelado'); }

    return allOrders.filter(o => {
      if (!allowedStatuses.has(o.status)) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        return o.id.includes(q) || o.cliente.toLowerCase().includes(q) || o.vendedor.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allOrders, filterActivo, filterRetenido, filterFacturado, filterCancelado, searchText]);

  const selectedOrder = selectedId ? filteredOrders.find(o => o.id === selectedId) ?? null : null;

  // Action button logic
  const canSurtir      = selectedOrder?.status === 'Activo';
  const canRevisar     = selectedOrder?.status === 'Surtido';
  const canDocumentar  = selectedOrder?.status === 'Revisado' || selectedOrder?.status === 'Revisado con incidencias';
  const canVerEmbarques = selectedOrder?.status === 'Documentado' || selectedOrder?.status === 'Enviado';

  const handleSurtir = () => {
    if (!selectedOrder) return;
    // Simulate surtido: update status to Surtido
    updateOrderStatus(selectedOrder.id, 'Surtido');
    showToast(`Pedido #${selectedOrder.id} marcado como Surtido`, 'success');
    setSelectedId(null);
  };

  const handleRevisar = () => {
    if (!selectedOrder) return;
    loadOrder(selectedOrder.id);
    goToScreen('review');
  };

  const handleDocumentar = () => {
    if (!selectedOrder) return;
    onNavigateToEmbarques();
  };

  const handleVerEmbarques = () => {
    onNavigateToEmbarques();
  };

  const btnBase = "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap";

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Roboto, sans-serif', background: '#f4f6fa' }}>

      {/* ── Filter bar ── */}
      <div
        className="flex-shrink-0 px-6 py-3 flex flex-wrap items-center gap-4"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        {/* Date range */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Fecha Inicial</span>
          <input
            type="date"
            value={fechaInicial}
            onChange={e => setFechaInicial(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Fecha Final</span>
          <input
            type="date"
            value={fechaFinal}
            onChange={e => setFechaFinal(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Status checkboxes */}
        <div
          className="flex items-center gap-4 px-4 py-2 rounded-lg"
          style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}
        >
          {[
            { label: 'Activo',    val: filterActivo,    set: setFilterActivo },
            { label: 'Retenido',  val: filterRetenido,  set: setFilterRetenido },
            { label: 'Facturado', val: filterFacturado, set: setFilterFacturado },
            { label: 'Cancelado', val: filterCancelado, set: setFilterCancelado },
          ].map(({ label, val, set }) => (
            <label key={label} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={val}
                onChange={e => set(e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-700 rounded"
              />
              <span className="text-xs text-gray-600 font-medium">{label}</span>
            </label>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-40 max-w-xs">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar pedido o cliente..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Refresh / Clear */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => showToast('Lista actualizada', 'info')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all hover:bg-gray-50"
            style={{ border: '1px solid #1a2b6b', color: '#1a2b6b' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refrescar
          </button>
          <button
            onClick={() => { setSearchText(''); setFilterActivo(true); setFilterRetenido(true); setFilterFacturado(false); setFilterCancelado(false); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
                {['Origen','PedidoID','Fecha Captura','Fecha Entrega','Hora Entrega','Zona','Local','ClienteID','Cliente','VendedorID','Vendedor','Plazo','Total','Status'].map(col => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron pedidos con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const isSelected = order.id === selectedId;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedId(isSelected ? null : order.id)}
                      className="cursor-pointer transition-colors"
                      style={{
                        background: isSelected
                          ? 'rgba(26,43,107,0.08)'
                          : idx % 2 === 0 ? '#fff' : '#fafbfc',
                        borderBottom: '1px solid #f0f0f0',
                        borderLeft: isSelected ? '3px solid #1a2b6b' : '3px solid transparent',
                      }}
                    >
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{order.origen}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{order.id}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{order.fechaCaptura}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{order.fechaEntrega || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{order.horaEntrega || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{order.zona || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {order.local ? (
                          <svg className="w-4 h-4 mx-auto text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{order.clienteId}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap max-w-[180px] truncate">{order.cliente}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{order.vendedorId}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[160px] truncate">{order.vendedor}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">{order.plazo || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{order.total}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div
        className="flex-shrink-0 px-6 py-3 flex items-center justify-between gap-4"
        style={{ background: '#fff', borderTop: '1px solid #e5e7eb' }}
      >
        {/* Status text */}
        <p className="text-xs text-gray-500">
          Se encontraron <strong className="text-gray-700">{filteredOrders.length}</strong> pedidos
          {selectedOrder
            ? <> | Pedido <strong className="text-blue-700">#{selectedOrder.id}</strong> seleccionado — {selectedOrder.status}</>
            : ' | Selecciona un pedido para ver las acciones disponibles'
          }
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Surtir */}
          <button
            onClick={handleSurtir}
            disabled={!canSurtir}
            className={btnBase}
            style={canSurtir
              ? { background: '#d97706', color: '#fff', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            Surtir
          </button>

          {/* Revisar */}
          <button
            onClick={handleRevisar}
            disabled={!canRevisar}
            className={btnBase}
            style={canRevisar
              ? { background: '#2563eb', color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            Revisar
          </button>

          {/* Documentar */}
          <button
            onClick={handleDocumentar}
            disabled={!canDocumentar}
            className={btnBase}
            style={canDocumentar
              ? { background: '#7c3aed', color: '#fff', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Documentar
          </button>

          {/* Ver embarques */}
          <button
            onClick={handleVerEmbarques}
            disabled={!canVerEmbarques}
            className={btnBase}
            style={canVerEmbarques
              ? { background: 'transparent', color: '#1a2b6b', border: '1.5px solid #1a2b6b' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed', border: '1.5px solid transparent' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="1" y="3" width="15" height="13" rx="1"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Ver embarques
          </button>
        </div>
      </div>
    </div>
  );
}
