// ============================================================
// APYMSA — ModalTraspasoDetail
// Detalle completo de una petición de traspaso
// Design: Enterprise Precision
// ============================================================
import {
  TraspasoPeticion, TraspasoStatus, TRASPASO_STATUS_COLORS, TRASPASO_STATUS_POR_TIPO, TRASPASO_STATUS_CEDIS,
  TRASPASO_TIPO_LABELS, TRASPASO_TIPO_ICONS, TRASPASO_CATEGORIA_LABELS, CEDIS_SUBTIPO_COLORS,
  PRODUCT_CATALOG, tiempoTranscurrido,
} from '@/lib/data';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
}

function TraspasoStatusBadge({ status }: { status: TraspasoStatus }) {
  const c = TRASPASO_STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9ca3af' }}>{label}</div>
      <div className="text-sm" style={{ color: '#1a2b6b', fontWeight: 500 }}>{children}</div>
    </div>
  );
}

export default function ModalTraspasoDetail({ peticion, onClose }: Props) {
  const isCedis = peticion.categoria === 'CEDIS';
  // Urgencia: la sucursal ya sabe qué pidió, se ve el desglose completo (como un traspaso normal).
  // Reabasto: recepción ciega por control anti-robo, solo se ve el número de cajas.
  const isReabastoCiego = isCedis && peticion.subtipoCedis === 'Reabasto';
  const STATUS_ORDER = isCedis ? TRASPASO_STATUS_CEDIS : TRASPASO_STATUS_POR_TIPO[peticion.tipo];
  const statusIndex = STATUS_ORDER.indexOf(peticion.status);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 720, maxWidth: '96vw', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>swap_horiz</span>
          <span className="font-bold text-sm text-white">Detalle de Traspaso</span>
          <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            #{peticion.id}
          </span>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6">

          {/* Sección 1: Info general */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
              Información general
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <InfoRow label="Solicitud">#{peticion.solicitudId}</InfoRow>
              <InfoRow label="Petición">#{peticion.id}</InfoRow>
              <InfoRow label="Tipo">
                <span className="flex items-center gap-1.5" style={{ color: peticion.tipo === 'Entrante' ? '#2563eb' : '#7c3aed', fontWeight: 600 }}>
                  {TRASPASO_TIPO_LABELS[peticion.tipo]}
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {TRASPASO_TIPO_ICONS[peticion.tipo]}
                  </span>
                </span>
              </InfoRow>
              <InfoRow label="Sucursal contraparte">
                {peticion.tipo === 'Entrante' ? 'De: ' : 'A: '}{peticion.sucursalContraparte}
              </InfoRow>
              <InfoRow label="Categoría">
                <span className="flex items-center gap-1.5">
                  {TRASPASO_CATEGORIA_LABELS[peticion.categoria]}
                  {peticion.subtipoCedis && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        background: CEDIS_SUBTIPO_COLORS[peticion.subtipoCedis].bg,
                        color: CEDIS_SUBTIPO_COLORS[peticion.subtipoCedis].text,
                        border: `1px solid ${CEDIS_SUBTIPO_COLORS[peticion.subtipoCedis].border}`,
                      }}
                    >
                      {peticion.subtipoCedis}
                    </span>
                  )}
                </span>
              </InfoRow>
              {peticion.autorizacionToken && (
                <InfoRow label="Autorización">
                  <span className="flex items-center gap-1" style={{ color: '#d97706' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>vpn_key</span>
                    {peticion.autorizacionToken}
                  </span>
                </InfoRow>
              )}
              <InfoRow label="Fecha creación">{peticion.fechaCreacion}</InfoRow>
              <InfoRow label="Tiempo transcurrido">
                <span style={{ color: '#6b7280' }}>{tiempoTranscurrido(peticion.fechaCreacion)}</span>
              </InfoRow>
              <InfoRow label="Última actualización">{peticion.fechaActualizacion}</InfoRow>
              <InfoRow label="Usuario creador">{peticion.usuarioCreador}</InfoRow>
              <InfoRow label="Estatus"><TraspasoStatusBadge status={peticion.status} /></InfoRow>
              {peticion.observaciones && (
                <InfoRow label="Observaciones">{peticion.observaciones}</InfoRow>
              )}
            </div>
          </section>

          {/* Sección 2: Timeline */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
              Progreso
            </h3>
            <div className="flex items-center gap-0">
              {STATUS_ORDER.map((step, i) => {
                const isDone = i <= statusIndex;
                const isCurrent = i === statusIndex;
                const stepColor = isDone ? '#1a2b6b' : '#cbd5e1';
                const textColor = isDone ? '#1a2b6b' : '#9ca3af';
                return (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all"
                        style={{ background: stepColor, color: '#fff', flexShrink: 0 }}
                      >
                        {isDone ? (
                          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check</span>
                        ) : (
                          String(i + 1)
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight" style={{ color: textColor }}>
                        {step}
                        {isCurrent && <span className="block text-[9px]" style={{ color: '#6b7280' }}>actual</span>}
                      </span>
                    </div>
                    {i < STATUS_ORDER.length - 1 && (
                      <div
                        className="h-0.5 flex-1"
                        style={{ background: i < statusIndex ? '#1a2b6b' : '#e5e7eb', minWidth: 16 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sección 3: Piezas (Reabasto no desglosa — recepción ciega por caja) */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
              {isReabastoCiego ? 'Cajas' : 'Piezas'}
            </h3>
            {isReabastoCiego ? (
              <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#7c3aed' }}>inventory_2</span>
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>
                  <span className="text-2xl font-bold">{peticion.cajas ?? 0}</span>{' '}
                  caja{(peticion.cajas ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
                  {['No.', 'Código', 'Producto', 'Solicitada', 'Surtida', 'Estado'].map(col => (
                    <th key={col} className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peticion.piezas.map((p, idx) => {
                  const prod = PRODUCT_CATALOG[p.code];
                  const isCompleta = p.qtySurtida >= p.qtySolicitada;
                  const isParcial = p.qtySurtida > 0 && p.qtySurtida < p.qtySolicitada;
                  const isNegada = p.qtySurtida === 0 && peticion.status !== 'Pendiente';
                  return (
                    <tr key={p.code} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: '#1a2b6b' }}>{p.code}</td>
                      <td className="px-3 py-2" style={{ color: '#374151' }}>{prod?.name ?? p.code}</td>
                      <td className="px-3 py-2 text-center">{p.qtySolicitada}</td>
                      <td className="px-3 py-2 text-center">{p.qtySurtida}</td>
                      <td className="px-3 py-2">
                        {isCompleta ? (
                          <span className="flex items-center gap-1" style={{ color: '#16a34a' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Completa
                          </span>
                        ) : isParcial ? (
                          <span className="flex items-center gap-1" style={{ color: '#d97706' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
                            Parcial
                          </span>
                        ) : isNegada ? (
                          <span className="flex items-center gap-1" style={{ color: '#dc2626' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>cancel</span>
                            {p.motivoNegacion ?? 'No surtida'}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </section>

          {/* Sección 4: Pedido origen (no aplica a Reabasto, nunca lleva pedido) */}
          {!isReabastoCiego && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
                Pedido origen
              </h3>
              <div className="flex flex-wrap gap-2">
                {peticion.pedidoOrigen ? (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.18)' }}
                  >
                    #{peticion.pedidoOrigen}
                  </span>
                ) : (
                  <span style={{ color: '#9ca3af' }}>—</span>
                )}
              </div>
            </section>
          )}

          {/* Sección 5: Embarque (si aplica) */}
          {peticion.embarqueId && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
                Embarque
              </h3>
              <div className="grid grid-cols-3 gap-4 p-4 rounded-lg" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
                <InfoRow label="ID Embarque">#{peticion.embarqueId}</InfoRow>
                <InfoRow label="Método de envío">{peticion.metodoEnvio ?? '—'}</InfoRow>
                <InfoRow label="Fecha actualización">{peticion.fechaActualizacion}</InfoRow>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex justify-end px-6 py-4"
          style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
