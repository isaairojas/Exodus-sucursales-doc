// ============================================================
// APYMSA — ModalTraspasoDetail
// Detalle completo de una petición de traspaso
// Design: Enterprise Precision
// ============================================================
import { useState } from 'react';
import {
  TraspasoPeticion, TraspasoStatus, TRASPASO_STATUS_COLORS, TRASPASO_STATUS_POR_TIPO, TRASPASO_STATUS_CEDIS,
  TRASPASO_TIPO_LABELS, TRASPASO_TIPO_ICONS, TRASPASO_CATEGORIA_LABELS, CEDIS_SUBTIPO_COLORS,
  PRODUCT_CATALOG, tiempoTranscurrido,
} from '@/lib/data';
import { TRASPASO_DIAS_VENCIDO_SURTIDO, TRASPASO_DIAS_VENCIDO_CEDIS } from '@/lib/traspasoConfig';
import { useApp } from '@/contexts/AppContext';
import ResumenTraspasosPedido from './ResumenTraspasosPedido';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

// SLAs de la petición (los mismos iconos que las cards de la tabla) para mostrar
// en la barra azul del header, junto al id.
interface SlaTag { label: string; icon: string; color: string; }
function slaTagsPeticion(t: TraspasoPeticion): SlaTag[] {
  const tags: SlaTag[] = [];
  // Los drafts (pendientes de aprobación de token) no cuentan para SLA.
  if (t.esDraft) return tags;
  const dias = Math.max(0, Math.floor((Date.now() - new Date(t.fechaCreacion.replace(' ', 'T')).getTime()) / 86_400_000));
  const noRecibidoCedis = ['Pendiente', 'Documentado', 'Enviado'].includes(t.status);
  const pendienteSurtir = t.status === 'Pendiente';
  const vencido = t.categoria === 'CEDIS'
    ? noRecibidoCedis && dias >= TRASPASO_DIAS_VENCIDO_CEDIS
    : pendienteSurtir && dias >= TRASPASO_DIAS_VENCIDO_SURTIDO;
  if (vencido) tags.push({ label: t.categoria === 'CEDIS' ? `Vencido (${dias} días · SLA CEDIS)` : `Vencido (${dias} día(s) por surtir)`, icon: 'event_busy', color: '#f87171' });
  if (t.categoria !== 'CEDIS') {
    if (t.parcial && ['Surtido', 'Revisado', 'Documentado', 'Enviado', 'Recibido', 'Entregado'].includes(t.status)) tags.push({ label: 'Surtido con parcialidad', icon: 'splitscreen', color: '#93c5fd' });
    if (t.parcial && ['Revisado', 'Documentado', 'Enviado', 'Recibido', 'Entregado'].includes(t.status)) tags.push({ label: 'Revisado con parcialidad', icon: 'fact_check', color: '#c4b5fd' });
    if (t.status === 'Cancelado' && t.resultado === 'rechazada') tags.push({ label: 'Rechazado', icon: 'cancel', color: '#f87171' });
  }
  return tags;
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

export default function ModalTraspasoDetail({ peticion, onClose, showToast }: Props) {
  const { sucursalActual, cancelarSolicitud } = useApp();
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  // La solicitud la puede cancelar la sucursal que la generó (destino/solicitante),
  // ANTES de su revisión (mientras sigue Pendiente o Surtido). No mueve inventario.
  const esSolicitante = peticion.sucursalDestino === sucursalActual;
  const puedeCancelar = esSolicitante && (peticion.status === 'Pendiente' || peticion.status === 'Surtido');

  const handleCancelar = () => {
    const r = cancelarSolicitud(peticion.id);
    showToast?.(r.mensaje, r.ok ? 'success' : 'warning');
    if (r.ok) onClose();
  };

  const isCedis = peticion.categoria === 'CEDIS';
  // Urgencia/Especial: la sucursal ya sabe qué pidió, se ve el desglose completo.
  // Reabasto: recepción ciega por control anti-robo, solo se ve el número de cajas.
  const isReabastoCiego = isCedis && peticion.subtipoCedis === 'Reabasto';
  // En un traspaso de REABASTO o de REABASTO UNIFICADO (y en la solicitud que fue
  // unificada) NO se muestran las peticiones ni el desglose de piezas: solo se
  // indica el número de la petición sustituida/relacionada.
  const esUnificado = peticion.resultado === 'unificada' || !!peticion.reabastoUnifica?.length;
  const ocultarDesglose = isReabastoCiego || esUnificado;
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
        {/* Header con SLAs del pedido/petición */}
        {(() => {
          const slas = slaTagsPeticion(peticion);
          return (
            <div
              className="flex items-center gap-2 px-5 py-4"
              style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}
            >
              <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>swap_horiz</span>
              <span className="font-bold text-sm text-white">Detalle de Traspaso</span>
              <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                #{peticion.id}
              </span>
              {/* SLAs del pedido (mismos iconos que en la tabla) */}
              {slas.length > 0 ? (
                <div className="flex items-center gap-1.5 ml-2" title="SLAs del pedido">
                  {slas.map(s => (
                    <span key={s.label} className="material-symbols-outlined" title={s.label} style={{ fontSize: 20, color: s.color, cursor: 'help' }}>
                      {s.icon}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="material-symbols-outlined ml-2" title="En tiempo" style={{ fontSize: 20, color: '#86efac', cursor: 'help' }}>check_circle</span>
              )}
              <button
                onClick={onClose}
                className="ml-auto w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>
          );
        })()}

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
                <InfoRow label="Observaciones — asesor">{peticion.observaciones}</InfoRow>
              )}
            </div>
          </section>

          {/* Notas del surtido / revisión — las escribe el logístico de la sucursal
              donante al finalizar surtido/revisión parcial o al rechazar. */}
          {(peticion.notaDonante || peticion.motivoRechazo) && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1a2b6b' }}>
                Notas del surtido / revisión
              </h3>
              <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
                {peticion.motivoRechazo && (
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#dc2626' }}>cancel</span>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#9ca3af' }}>Motivo de rechazo</div>
                      <div className="text-xs" style={{ color: '#374151' }}>{peticion.motivoRechazo}</div>
                    </div>
                  </div>
                )}
                {peticion.notaDonante && (
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0d9488' }}>edit_note</span>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#9ca3af' }}>Nota del donante</div>
                      <div className="text-xs" style={{ color: '#374151' }}>{peticion.notaDonante}</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Sección: Unificación con reabasto (la decide CEDIS) */}
          {peticion.resultado === 'unificada' && peticion.unificadaEnTraspaso && (
            <section className="rounded-lg p-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#7c3aed' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>merge</span>
                Solicitud a CEDIS unificada con un traspaso de reabasto
              </p>
              <p className="text-xs mt-1" style={{ color: '#374151' }}>
                CEDIS unificó esta solicitud dentro del traspaso de reabasto <strong>#{peticion.unificadaEnTraspaso}</strong>.
                La mercancía viaja en ese reabasto; por eso esta petición pasó a <strong>Finalizadas</strong> con estado <strong>Unificada</strong>.
              </p>
            </section>
          )}
          {peticion.reabastoUnifica && peticion.reabastoUnifica.length > 0 && (
            <section className="rounded-lg p-4" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.3)' }}>
              <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#2563eb' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>inventory_2</span>
                Reabasto con mercancía unificada
              </p>
              <p className="text-xs mt-1 mb-2" style={{ color: '#374151' }}>
                Este reabasto lo generó CEDIS e incluye mercancía relacionada con pedido(s) de cliente (unificados desde una solicitud a CEDIS):
              </p>
              <ul className="flex flex-col gap-1">
                {peticion.reabastoUnifica.map(u => (
                  <li key={u.peticionId} className="text-xs flex items-center gap-2" style={{ color: '#1a2b6b' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#2563eb' }}>link</span>
                    Pedido <strong>#{u.pedido}</strong> · urgencia <strong>#{u.peticionId}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Sección: Resumen de traspasos del pedido (cobertura / recálculo).
              No se muestra en reabasto/unificado (no se ven las peticiones). */}
          {peticion.pedidoOrigen && !ocultarDesglose && (
            <ResumenTraspasosPedido pedidoOrigen={peticion.pedidoOrigen} currentPetId={peticion.id} />
          )}

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

          {/* Sección 3: Piezas — no se desglosan en reabasto/unificado (recepción ciega). */}
          {!ocultarDesglose && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
              Piezas
            </h3>
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
          </section>
          )}

          {/* Sección: Cajas — solo visible una vez documentado (embarque preparado). */}
          {['Documentado', 'Enviado', 'Recibido', 'Entregado'].includes(peticion.status) && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
              Cajas
            </h3>
            <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: '#6b7280' }}>
              <span>No. Papeleta <strong style={{ color: '#1a2b6b' }}>{peticion.noPapeleta}</strong></span>
              <span>·</span>
              <span><strong style={{ color: '#16a34a' }}>{peticion.cajasRecibidas}</strong> / {peticion.cajasTotal} recibidas</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: peticion.cajasTotal }, (_, i) => {
                const recibida = i < peticion.cajasRecibidas;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 rounded-lg py-3"
                    style={{
                      background: recibida ? 'rgba(22,163,74,0.06)' : '#f9fafb',
                      border: `1px solid ${recibida ? 'rgba(22,163,74,0.3)' : '#e5e7eb'}`,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: recibida ? '#16a34a' : '#9ca3af' }}>
                      {recibida ? 'inventory_2' : 'inventory'}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: recibida ? '#16a34a' : '#6b7280' }}>C{i + 1}</span>
                    <span className="text-[10px]" style={{ color: recibida ? '#16a34a' : '#9ca3af' }}>
                      {recibida ? 'Recibida' : 'Pendiente'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          )}

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
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}
        >
          {/* Cancelar solicitud: solo la sucursal solicitante, antes de la revisión. */}
          {puedeCancelar ? (
            <button
              onClick={() => setConfirmCancelar(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ border: '1.5px solid #dc2626', color: '#dc2626', background: 'white' }}
              title="Cancela esta solicitud antes de su revisión. No mueve inventario."
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
              Cancelar solicitud
            </button>
          ) : <span />}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
          >
            Cerrar
          </button>
        </div>

        {/* Confirmación de cancelación de la solicitud */}
        {confirmCancelar && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="w-full bg-white p-5 rounded-2xl" style={{ maxWidth: 420 }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#dc2626' }}>cancel</span>
                <span className="text-sm font-extrabold" style={{ color: '#1a1a2e' }}>Cancelar solicitud {peticion.id}</span>
              </div>
              <p className="text-xs mb-2" style={{ color: '#555' }}>
                Se cancelará esta solicitud (aún <strong>antes de su revisión</strong>). Si todavía necesitas la mercancía,
                deberás <strong>generar una nueva solicitud</strong>.
              </p>
              <p className="text-[11px] mb-4 flex items-start gap-1.5" style={{ color: '#166534' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>inventory_2</span>
                Esta cancelación <strong>no movió mercancía de tu inventario</strong>.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancelar(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>No, volver</button>
                <button onClick={() => { setConfirmCancelar(false); handleCancelar(); }} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: '#dc2626' }}>Cancelar solicitud</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
