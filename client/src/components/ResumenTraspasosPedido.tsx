// ============================================================
// APYMSA — ResumenTraspasosPedido
// Resumen de las peticiones de traspaso que cubren un pedido: estado
// individual, % que cubre cada una, existencia de la sucursal donante,
// derivadas/canceladas y faltante. Reutilizable en el detalle del pedido
// y en el detalle de la petición.
// ============================================================
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, TraspasoStatus, TRASPASO_STATUS_COLORS, ORDERS_DB, EXISTENCIA_POR_SUCURSAL } from '@/lib/data';

interface Props {
  pedidoOrigen: string;      // id del pedido tal como lo referencian los traspasos ('P#######')
  currentPetId?: string;     // petición a resaltar (opcional)
}

const RECIBIDO_ST: TraspasoStatus[] = ['Recibido', 'Entregado'];
const sumaPiezas = (p: TraspasoPeticion) => p.piezas.reduce((s, x) => s + x.qtySolicitada, 0);

export default function ResumenTraspasosPedido({ pedidoOrigen, currentPetId }: Props) {
  const { traspasos } = useApp();
  if (!pedidoOrigen) return null;

  const orderKey = pedidoOrigen.replace(/^P/, '');
  const order = ORDERS_DB[orderKey];
  const totalRequerido = order ? order.partidas.reduce((s, p) => s + p.qty, 0) : 0;
  const relacionadas = traspasos.filter(t => t.pedidoOrigen === pedidoOrigen);
  if (relacionadas.length === 0) return null;

  const vigentes = relacionadas.filter(t => t.status !== 'Cancelado');
  const piezasRecibidas = relacionadas.filter(t => RECIBIDO_ST.includes(t.status)).reduce((s, t) => s + sumaPiezas(t), 0);
  const piezasVigentes = vigentes.reduce((s, t) => s + sumaPiezas(t), 0);
  const faltante = Math.max(0, totalRequerido - piezasVigentes);
  const pct = (n: number) => totalRequerido > 0 ? Math.round((n / totalRequerido) * 100) : 0;
  const existenciaSuc = (t: TraspasoPeticion) =>
    t.piezas.reduce((s, x) => s + (EXISTENCIA_POR_SUCURSAL[t.sucursalContraparte]?.[x.code] ?? 0), 0);

  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
        Resumen de traspasos del pedido #{orderKey}
      </h3>

      {!order && (
        <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>Pedido no disponible en catálogo local; se muestra el desglose de peticiones.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
              {['Petición', 'Sucursal', 'Estado', 'Piezas', '% pedido', 'Existencia suc.', 'Nota'].map(col => (
                <th key={col} className="text-left px-2.5 py-2 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#6b7280' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {relacionadas
              .slice()
              .sort((a, b) => (a.intento ?? 0) - (b.intento ?? 0))
              .map(t => {
                const piezas = sumaPiezas(t);
                const cancelada = t.status === 'Cancelado';
                const c = TRASPASO_STATUS_COLORS[t.status];
                const esActual = t.id === currentPetId;
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: esActual ? 'rgba(26,43,107,0.05)' : 'transparent' }}>
                    <td className="px-2.5 py-2 font-semibold whitespace-nowrap" style={{ color: '#1a2b6b' }}>
                      {t.id}{esActual && <span className="ml-1 text-[10px]" style={{ color: '#6b7280' }}>(actual)</span>}
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap" style={{ color: '#374151' }}>{t.sucursalContraparte}</td>
                    <td className="px-2.5 py-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{t.status}</span>
                    </td>
                    <td className="px-2.5 py-2 text-center" style={{ textDecoration: cancelada ? 'line-through' : 'none', color: cancelada ? '#9ca3af' : '#374151' }}>{piezas}</td>
                    <td className="px-2.5 py-2 text-center font-semibold" style={{ color: cancelada ? '#9ca3af' : '#1a2b6b' }}>{pct(piezas)}%</td>
                    <td className="px-2.5 py-2 text-center" style={{ color: '#374151' }}>{existenciaSuc(t)}</td>
                    <td className="px-2.5 py-2 whitespace-nowrap text-[11px]">
                      {cancelada ? (
                        <span style={{ color: '#dc2626' }}>Cancelada{t.peticionSiguienteId ? ' · generó nueva' : ''}</span>
                      ) : t.peticionAnteriorId ? (
                        <span style={{ color: '#2563eb' }}>Derivada (reintento)</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>Original</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #e5e7eb' }}>
              <td colSpan={3} className="px-2.5 py-2 text-right font-semibold" style={{ color: '#6b7280' }}>Requerido del pedido: {totalRequerido} pzs</td>
              <td className="px-2.5 py-2 text-center font-bold" style={{ color: '#1a2b6b' }}>{piezasVigentes}</td>
              <td className="px-2.5 py-2 text-center font-bold" style={{ color: faltante > 0 ? '#d97706' : '#16a34a' }}>{pct(piezasVigentes)}%</td>
              <td colSpan={2} className="px-2.5 py-2 text-[11px]" style={{ color: faltante > 0 ? '#b45309' : '#166534' }}>
                {faltante > 0 ? `Faltan ${faltante} pzs` : 'Completo'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
