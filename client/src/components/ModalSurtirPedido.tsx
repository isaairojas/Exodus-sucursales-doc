// ============================================================
// APYMSA — ModalSurtirPedido
// Advertencia al iniciar el surtido de un pedido con peticiones de traspaso
// aún NO recibidas: muestra el estado individual de cada petición (se
// cancelarán) y permite surtir solo lo que hay en existencia en ese momento.
// Design: Enterprise Precision
// ============================================================
import { Order, TraspasoPeticion, PRODUCT_CATALOG, TRASPASO_STATUS_COLORS } from '@/lib/data';

interface Props {
  order: Order;
  peticiones: TraspasoPeticion[];        // peticiones de traspaso relacionadas al pedido
  existencias: Record<string, number>;   // existencia local disponible por código
  onClose: () => void;
  onConfirm: () => void;                 // surtir con existencia + cancelar pendientes
}

const RECIBIDO = ['Recibido', 'Entregado'];

export default function ModalSurtirPedido({ order, peticiones, existencias, onClose, onConfirm }: Props) {
  const pendientes = peticiones.filter(p => !RECIBIDO.includes(p.status) && p.status !== 'Cancelado');

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 760, maxWidth: '96vw', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: '#1a2b6b', flexShrink: 0 }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>inventory_2</span>
          <span className="font-bold text-sm text-white">Surtir pedido</span>
          <span className="ml-1 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>#{order.id}</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4" style={{ background: '#f8f9fb' }}>
          {/* Advertencia */}
          <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.35)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#d97706' }}>warning</span>
            <p className="text-xs" style={{ color: '#b45309' }}>
              Este pedido tiene <strong>{pendientes.length}</strong> petición(es) de traspaso <strong>aún no recibidas</strong>.
              Si surtes ahora, solo se surtirá lo que hay en existencia y esas peticiones <strong>se cancelarán</strong>.
            </p>
          </div>

          {/* Peticiones relacionadas con su estado individual */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1a2b6b' }}>Peticiones de traspaso relacionadas</p>
            <div className="rounded-lg overflow-hidden bg-white" style={{ border: '1px solid #e5e7eb' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Petición', 'Solicitud', 'Sucursal', 'Estado', 'Acción'].map(h => (
                      <th key={h} className="text-left px-3 py-2" style={{ color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {peticiones.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-4" style={{ color: '#9ca3af' }}>Sin peticiones relacionadas</td></tr>
                  )}
                  {peticiones.map(p => {
                    const recibida = RECIBIDO.includes(p.status);
                    const cancelada = p.status === 'Cancelado';
                    const c = TRASPASO_STATUS_COLORS[p.status];
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td className="px-3 py-2 font-semibold" style={{ color: '#1a2b6b' }}>{p.id}</td>
                        <td className="px-3 py-2" style={{ color: '#6b7280' }}>{p.solicitudId}</td>
                        <td className="px-3 py-2" style={{ color: '#374151' }}>{p.sucursalContraparte}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{p.status}</span>
                        </td>
                        <td className="px-3 py-2">
                          {recibida ? (
                            <span className="font-semibold" style={{ color: '#16a34a' }}>Se conserva</span>
                          ) : cancelada ? (
                            <span style={{ color: '#9ca3af' }}>—</span>
                          ) : (
                            <span className="font-semibold" style={{ color: '#dc2626' }}>Se cancelará</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Existencia por artículo */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1a2b6b' }}>Existencia disponible ahora</p>
            <div className="rounded-lg overflow-hidden bg-white" style={{ border: '1px solid #e5e7eb' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Código', 'Descripción', 'Requerido', 'Existencia', 'A surtir'].map(h => (
                      <th key={h} className="text-left px-3 py-2" style={{ color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.partidas.map(p => {
                    const exist = existencias[p.code] ?? 0;
                    const aSurtir = Math.min(p.qty, exist);
                    const falta = p.qty - aSurtir;
                    return (
                      <tr key={p.code} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td className="px-3 py-2 font-semibold" style={{ color: '#111827' }}>{p.code}</td>
                        <td className="px-3 py-2" style={{ color: '#374151' }}>{PRODUCT_CATALOG[p.code]?.name ?? '—'}</td>
                        <td className="px-3 py-2 text-center" style={{ color: '#374151' }}>{p.qty}</td>
                        <td className="px-3 py-2 text-center font-semibold" style={{ color: exist >= p.qty ? '#16a34a' : '#d97706' }}>{exist}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-bold" style={{ color: '#1a2b6b' }}>{aSurtir}</span>
                          {falta > 0 && <span className="ml-1 text-[11px]" style={{ color: '#dc2626' }}>(faltan {falta})</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Nota de temporalidad del traspaso */}
          <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.25)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#2563eb' }}>schedule</span>
            <p className="text-[11px]" style={{ color: '#374151' }}>
              Si esperas a que se complete el traspaso, la cantidad disponible <strong>podría ser mayor o mejor</strong>, según el tiempo transcurrido
              desde la creación del pedido (captura: {order.fechaCaptura}).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0, background: '#fff' }}>
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border" style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#d97706' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>inventory</span>
            Surtir con existencia y cancelar peticiones
          </button>
        </div>
      </div>
    </div>
  );
}
