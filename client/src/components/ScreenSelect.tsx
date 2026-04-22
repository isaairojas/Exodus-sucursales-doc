// ============================================================
// APYMSA — Screen 2: Order Selection
// Design: Enterprise Precision — two-card layout
// ============================================================
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB, Order } from '@/lib/data';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  Surtido:   { bg: '#dcfce7', color: '#166534' },
  Activo:    { bg: '#e0e7ff', color: '#3730a3' },
  Revisado:  { bg: '#fef3c7', color: '#92400e' },
  Facturado: { bg: '#f3f4f6', color: '#374151' },
  Cancelado: { bg: '#fee2e2', color: '#991b1b' },
};

export default function ScreenSelect({ showToast }: Props) {
  const { goToScreen, loadOrder } = useApp();
  const [filter, setFilter] = useState('');
  const [manualId, setManualId] = useState('');
  const [manualError, setManualError] = useState('');
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const orders = Object.values(ORDERS_DB);
  const lf = filter.toLowerCase();
  const filtered = orders.filter(o =>
    !lf ||
    o.id.includes(lf) ||
    o.cliente.toLowerCase().includes(lf) ||
    o.vendedor.toLowerCase().includes(lf)
  );

  const handleSelectOrder = (order: Order) => {
    if (order.status !== 'Surtido') return;
    setSelectedRow(order.id);
    setTimeout(() => {
      loadOrder(order.id);
      goToScreen('review');
    }, 300);
  };

  const handleConfirmManual = () => {
    const val = manualId.trim();
    const order = ORDERS_DB[val];
    if (!order || order.status !== 'Surtido') {
      setManualError('Pedido no encontrado o no disponible para revisión.');
      return;
    }
    setManualError('');
    loadOrder(val);
    goToScreen('review');
  };

  return (
    <div className="flex-1 p-8 overflow-auto" style={{ background: '#f3f4f6', animation: 'screenFadeIn 0.3s ease' }}>
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#2563eb' }}>inventory_2</span>
        <h1 className="text-2xl font-bold" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
          Seleccionar Pedido para Revisión
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Card A: List */}
        <div className="bg-white rounded-lg p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#2563eb' }}>list_alt</span>
            <span className="font-bold text-sm" style={{ color: '#1a2b6b' }}>Seleccionar de la lista</span>
          </div>

          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar por ID, cliente o vendedor..."
            className="w-full mb-3 px-3 py-2 text-sm rounded-lg border outline-none transition-all"
            style={{
              border: '1.5px solid #d1d5db',
              fontFamily: 'Roboto, sans-serif',
            }}
            onFocus={e => (e.target.style.borderColor = '#2563eb')}
            onBlur={e => (e.target.style.borderColor = '#d1d5db')}
          />

          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Roboto, sans-serif' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Pedido ID', 'Cliente', 'Vendedor', 'Total', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2"
                      style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #d1d5db' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const isSurtido = order.status === 'Surtido';
                  const badge = STATUS_BADGE[order.status] || STATUS_BADGE['Activo'];
                  const isSelected = selectedRow === order.id;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      style={{
                        cursor: isSurtido ? 'pointer' : 'not-allowed',
                        background: isSelected ? '#dbeafe' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (isSurtido && !isSelected) (e.currentTarget as HTMLTableRowElement).style.background = '#eff6ff'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                      <td className="px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0', color: isSurtido ? '#111827' : '#d1d5db', fontWeight: 600 }}>
                        {order.id}
                      </td>
                      <td className="px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0', color: isSurtido ? '#374151' : '#d1d5db' }}>
                        {order.cliente}
                      </td>
                      <td className="px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0', color: isSurtido ? '#374151' : '#d1d5db' }}>
                        {order.vendedor}
                      </td>
                      <td className="px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0', color: isSurtido ? '#374151' : '#d1d5db' }}>
                        {order.total}
                      </td>
                      <td className="px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: badge.bg, color: badge.color }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-sm" style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card B: Manual */}
        <div className="bg-white rounded-lg p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#2563eb' }}>edit</span>
            <span className="font-bold text-sm" style={{ color: '#1a2b6b' }}>Ingresar manualmente</span>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#6b7280' }}>
                Número de Pedido
              </label>
              <input
                type="text"
                value={manualId}
                onChange={e => { setManualId(e.target.value); setManualError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmManual(); }}
                placeholder="Ej. 1064772"
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                style={{
                  border: manualError ? '1.5px solid #dc2626' : '1.5px solid #d1d5db',
                  fontFamily: 'Roboto, sans-serif',
                }}
                onFocus={e => { if (!manualError) e.target.style.borderColor = '#2563eb'; }}
                onBlur={e => { if (!manualError) e.target.style.borderColor = '#d1d5db'; }}
              />
              {manualError && (
                <p className="text-xs mt-1" style={{ color: '#dc2626' }}>{manualError}</p>
              )}
            </div>

            <button
              onClick={handleConfirmManual}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-all duration-200"
              style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1a2b6b')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              Confirmar pedido
            </button>

            <div className="mt-4 p-4 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-medium mb-2" style={{ color: '#6b7280' }}>Pedidos disponibles para prueba:</p>
              {Object.values(ORDERS_DB).filter(o => o.status === 'Surtido').map(o => (
                <div key={o.id} className="text-xs mb-1" style={{ color: '#374151' }}>
                  <span className="font-bold">{o.id}</span> — {o.cliente}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
