// ============================================================
// APYMSA — ModalTraspasoDetail
// Detalle completo de una petición de traspaso
// Design: Enterprise Precision
// ============================================================
import { useState, useEffect } from 'react';
import {
  TraspasoPeticion, TraspasoStatus, TRASPASO_STATUS_COLORS, TRASPASO_STATUS_POR_TIPO, TRASPASO_STATUS_CEDIS,
  TRASPASO_TIPO_LABELS, TRASPASO_TIPO_ICONS, TRASPASO_CATEGORIA_LABELS, CEDIS_SUBTIPO_COLORS,
  PRODUCT_CATALOG, tiempoTranscurrido, ORDERS_DB, EXISTENCIA_POR_SUCURSAL,
  esConsolidadorIntermedio, peticionesDependientesDe, tipoSolicitudDe, SUCURSAL_COORDS,
  horasSinMovimiento,
} from '@/lib/data';
import MiniMapaRuta from './MiniMapaRuta';
import Pipeline6Monitores, { monitorDeShipmentStatus } from './Pipeline6Monitores';
import { TRASPASO_DIAS_VENCIDO_SURTIDO, TRASPASO_DIAS_VENCIDO_CEDIS } from '@/lib/traspasoConfig';
import { useApp } from '@/contexts/AppContext';
import ResumenTraspasosPedido from './ResumenTraspasosPedido';
import PipelineHH from './PipelineHH';

interface Props {
  peticion: TraspasoPeticion;    // petición INICIAL con la que se abre el modal
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  // Navegación a la vista PRINCIPAL del pedido (fuera del modal). Cuando está
  // presente, el botón "Ver detalle del pedido" invoca este callback en lugar
  // del modal anidado ligero.
  onVerPedido?: (pedidoId: string) => void;
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
    if (t.status === 'Cancelado' && t.resultado === 'rechazada') tags.push({ label: 'Rechazado', icon: 'block', color: '#f87171' });
    if (t.status === 'Cancelado' && t.resultado !== 'rechazada') tags.push({ label: 'Cancelado', icon: 'do_not_disturb_on', color: '#d1d5db' });
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

export default function ModalTraspasoDetail({ peticion: initialPeticion, onClose, showToast, onVerPedido }: Props) {
  const { sucursalActual, cancelarSolicitud, traspasos, embarquesTraspaso, actualizarObservacionesEmbarque } = useApp();
  // Petición ACTIVA dentro del modal. Empieza con la que se abrió, pero puede
  // cambiar cuando el usuario pulsa "Ver detalle" en una fila del resumen de
  // peticiones relacionadas — así toda la ventana se recompone con los datos
  // de esa otra petición, sin abrir una ventana nueva.
  const [activePetId, setActivePetId] = useState<string>(initialPeticion.id);
  const peticion = traspasos.find(t => t.id === activePetId) ?? initialPeticion;
  // Consolidador intermedio: la sucursal actual es el ORIGEN de esta petición
  // y existen peticiones dependientes (SMC generó apoyo desde sus locales).
  // En ese modo se OCULTA el linaje del pedido cliente y se muestra en su lugar
  // una sección con la solicitud interna + tabla de dependencias por recibir.
  const esCI = esConsolidadorIntermedio(peticion, sucursalActual, traspasos);
  const dependencias = esCI ? peticionesDependientesDe(peticion, traspasos) : [];
  // Tipo de solicitud: 'ConPedido' (relacionada a pedido cliente), 'ConPeticion'
  // (solicitud consolidadora — apunta a una petición padre) o 'SinPedido'.
  // Ver Detalle del pedido y "Pedido origen" solo aplican en ConPedido.
  const tipoSol = tipoSolicitudDe(peticion);
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [showPedidoDetalle, setShowPedidoDetalle] = useState(false);
  // Lightbox de imagen del producto (tabla de piezas).
  const [imgOpen, setImgOpen] = useState<string | null>(null);
  // Regla estricta de CANCELACIÓN por la sucursal solicitante:
  //   1) El traspaso aún NO ha sido surtido en HH  → status === 'Pendiente'.
  //   2) La petición es de tipo MANUAL.
  //   3) NO está relacionada a un pedido cliente (SinPedido).
  // Cualquier otro caso — Automático SMC, con pedido, ya surtido, etc. —
  // NO se cancela por el solicitante; el flujo es rechazo por el donante en HH.
  const esSolicitante = peticion.sucursalDestino === sucursalActual;
  const puedeCancelar =
    esSolicitante &&
    peticion.status === 'Pendiente' &&
    peticion.categoria === 'Manual' &&
    !peticion.pedidoOrigen &&
    !peticion.peticionOrigenId;

  // F80 — ESC cierra el modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

          {/* Timeline (pipeline) — encima de todo. */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1a2b6b' }}>Progreso</h3>
            <PipelineHH status={peticion.status} pasos={STATUS_ORDER} />
          </section>

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
              <InfoRow label={peticion.tipo === 'Entrante' ? 'Sucursal donante' : 'Sucursal destino'}>
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

          {/* Sección informativa: "Por recibir + ConPeticion" — la sucursal
              actual es una consolidadora que recibe apoyo de sus locales para
              completar una petición saliente propia. Explica al usuario que
              esta petición NO está ligada a un pedido cliente visible; su
              origen es la petición padre que él debe enviar a otra sucursal. */}
          {peticion.tipo === 'Entrante' && tipoSol === 'ConPeticion' && peticion.peticionOrigenId && (
            <section className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.25)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>info</span>
              <div className="text-xs" style={{ color: '#1e3a8a' }}>
                Esta petición <strong>no está relacionada a un pedido</strong> que puedas ver: SMC la generó
                para apoyar tu petición <strong>{peticion.peticionOrigenId}</strong> — la que TÚ debes enviar
                a otra sucursal. Puedes consultar las demás peticiones relacionadas de la misma solicitud
                consolidadora en el resumen de abajo.
              </div>
            </section>
          )}

          {/* Sección: Solicitud interna generada por esta petición (consolidador intermedio). */}
          {esCI && (
            <section className="rounded-lg p-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: '#7c3aed' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>merge</span>
                  Solicitud interna generada por esta petición
                </p>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: '#7c3aed', color: '#fff' }}
                  title="Esta petición requiere traspasos que aún están por recibir"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>call_received</span>
                  Requiere traspasos por recibir
                </span>
              </div>
              <p className="text-xs mt-1 mb-3" style={{ color: '#374151' }}>
                Esta sucursal actúa como <strong>consolidadora</strong>: SMC generó una solicitud interna
                para completar la petición <strong>{peticion.id}</strong> apoyándose en sus sucursales locales.
                No se podrá surtir hasta que las dependencias estén <strong>Entregadas</strong>.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(124,58,237,0.10)', borderBottom: '1px solid rgba(124,58,237,0.35)' }}>
                      <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#5b21b6' }}>Petición</th>
                      <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#5b21b6' }}>Sucursal donante</th>
                      <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#5b21b6' }}>Estado</th>
                      <th className="text-center px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#5b21b6' }}>Piezas</th>
                      <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#5b21b6' }}>Arribo estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dependencias.map(d => {
                      const entregada = d.status === 'Entregado' || d.status === 'Recibido';
                      const piezas = d.piezas.reduce((s, p) => s + p.qtySolicitada, 0);
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
                          <td className="px-2.5 py-1.5 font-semibold" style={{ color: '#5b21b6' }}>{d.id}</td>
                          <td className="px-2.5 py-1.5" style={{ color: '#374151' }}>{d.sucursalOrigen ?? d.sucursalContraparte}</td>
                          <td className="px-2.5 py-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: entregada ? '#16a34a' : '#d97706' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{entregada ? 'check_circle' : 'schedule'}</span>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 text-center" style={{ color: '#374151' }}>{piezas}</td>
                          <td className="px-2.5 py-1.5 text-[11px]" style={{ color: '#6b7280' }}>{d.fechaArribo ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}


          {/* Sección 3: Piezas — no se desglosan en reabasto/unificado (recepción ciega). */}
          {!ocultarDesglose && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
              {peticion.tipo === 'Entrante' ? 'Piezas por recibir' : 'Piezas por enviar'}
            </h3>
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
                  <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280', width: 40 }}>No.</th>
                  <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280', width: 60 }}>Imagen</th>
                  <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Código</th>
                  <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Producto</th>
                  <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Solicitada</th>
                  <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#6b7280', whiteSpace: 'pre-line' }}>Existencia{'\n'}actual</th>
                  <th className="text-center px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Surtida</th>
                  <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {peticion.piezas.map((p, idx) => {
                  const prod = PRODUCT_CATALOG[p.code];
                  const isCompleta = p.qtySurtida >= p.qtySolicitada;
                  const isParcial = p.qtySurtida > 0 && p.qtySurtida < p.qtySolicitada;
                  const isNegada = p.qtySurtida === 0 && peticion.status !== 'Pendiente';
                  const sucExistencia = peticion.sucursalDestino ?? peticion.sucursalContraparte;
                  const existencia = EXISTENCIA_POR_SUCURSAL[sucExistencia]?.[p.code] ?? 0;
                  return (
                    <tr key={p.code} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => setImgOpen(p.code)}
                          className="inline-flex items-center justify-center rounded"
                          style={{ width: 36, height: 36, background: '#f2f4f8', border: '1px solid #e5e7eb', cursor: 'zoom-in' }}
                          title="Ver imagen del producto"
                        >
                          {prod?.img ? (
                            <img src={prod.img} alt={prod.name} style={{ maxWidth: 32, maxHeight: 32, borderRadius: 3 }} />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#9ca3af' }}>photo</span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-semibold" style={{ color: '#1a2b6b' }}>{p.code}</td>
                      <td className="px-3 py-2" style={{ color: '#374151' }}>{prod?.name ?? p.code}</td>
                      <td className="px-3 py-2 text-center">{p.qtySolicitada}</td>
                      <td className="px-3 py-2 text-center font-semibold" style={{ color: '#d97706' }} title={`Existencia actual del solicitante (${sucExistencia})`}>{existencia}</td>
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

          {/* Sección 4: Pedido origen. Regla dura:
                SOLO se muestra en "Por recibir" (Entrante) con solicitud
                relacionada a un pedido cliente (ConPedido). Cualquier vista
                "Por enviar" NUNCA muestra el pedido — el donante no tiene
                acceso a pedidos ajenos: si necesita información del pedido,
                la sucursal solicitante debió mandarla en la solicitud.
                Reabasto ciego CEDIS: nunca lleva pedido. */}
          {!isReabastoCiego && peticion.tipo === 'Entrante' && tipoSol === 'ConPedido' && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1a2b6b' }}>
                Pedido origen
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {peticion.pedidoOrigen ? (
                  <>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.18)' }}
                    >
                      #{peticion.pedidoOrigen}
                    </span>
                    <button
                      onClick={() => {
                        // Prefiere navegar a la vista PRINCIPAL del pedido si
                        // el padre expuso el callback; si no, cae al modal
                        // anidado ligero (backward compatible).
                        if (onVerPedido && peticion.pedidoOrigen) { onVerPedido(peticion.pedidoOrigen); onClose(); return; }
                        setShowPedidoDetalle(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                      style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.35)' }}
                      title="Abrir la ventana principal del pedido"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                      Ver detalle del pedido
                    </button>
                  </>
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
                {(() => {
                  const emb = embarquesTraspaso.find(e => e.id === peticion.embarqueId);
                  if (!emb) return null;
                  const h = Math.round(horasSinMovimiento(emb));
                  return <InfoRow label="Sin movimiento">{h}h</InfoRow>;
                })()}
              </div>
              {/* F38 — Pipeline de 6 monitores del embarque asociado */}
              {(() => {
                const emb = embarquesTraspaso.find(e => e.id === peticion.embarqueId);
                if (!emb) return null;
                return (
                  <div className="mt-3 rounded-lg p-3" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                    <div className="text-[10px] font-semibold mb-2" style={{ color: '#64748b', letterSpacing: '0.05em' }}>PROGRESO DEL EMBARQUE</div>
                    <Pipeline6Monitores monitorActual={monitorDeShipmentStatus(emb.status)} compact />
                  </div>
                );
              })()}
              {/* F20 — Mini-mapa OSRM origen → destino (si ambas coords existen) */}
              {(() => {
                const origen = peticion.sucursalOrigen ?? sucursalActual;
                const destino = peticion.sucursalDestino ?? peticion.sucursalContraparte;
                const oc = SUCURSAL_COORDS[origen];
                const dc = SUCURSAL_COORDS[destino];
                if (!oc || !dc) return null;
                return (
                  <div className="mt-3">
                    <MiniMapaRuta origen={origen} destino={destino} origenCoords={oc} destinoCoords={dc} height={160} compact />
                  </div>
                );
              })()}
              {/* F35 — Observaciones editables del embarque (F27 handler). */}
              {(() => {
                const emb = embarquesTraspaso.find(e => e.id === peticion.embarqueId);
                if (!emb) return null;
                return <ObservacionesEmbarqueEditor emb={emb} onGuardar={actualizarObservacionesEmbarque} />;
              })()}
            </section>
          )}

          {/* ── Sección final: PETICIONES RELACIONADAS de la misma solicitud.
                 Se ubica al FINAL para que el usuario primero vea la info de
                 SU petición y luego, si necesita, consulte las hermanas. La
                 fila actual viene seleccionada; doble-click en OTRA abre esa
                 petición en una nueva ventana apilada. */}
          {!ocultarDesglose && !esCI && (
            <ResumenTraspasosPedido
              solicitudId={peticion.solicitudId}
              pedidoOrigen={tipoSol === 'ConPedido' ? peticion.pedidoOrigen : undefined}
              currentPetId={peticion.id}
              perspectiva={peticion.tipo}
              onAbrirPeticion={setActivePetId}
              sucursalPropia={sucursalActual}
            />
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

        {/* Detalle del pedido origen (modal ligero anidado) */}
        {/* Lightbox de imagen del producto. */}
        {imgOpen && (() => {
          const prod = PRODUCT_CATALOG[imgOpen];
          return (
            <div className="fixed inset-0 z-[95] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setImgOpen(null)}>
              <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-center rounded-lg" style={{ maxWidth: '90vw', maxHeight: '70vh', minWidth: 280, minHeight: 280, background: '#fff', padding: 12 }}>
                  {prod?.img ? (
                    <img src={prod.img} alt={prod.name} style={{ maxHeight: '66vh', maxWidth: '86vw' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 160, color: '#c5cbd6' }}>photo</span>
                  )}
                </div>
                <div className="text-white text-sm font-semibold text-center">
                  {imgOpen} — {prod?.name ?? ''}
                </div>
                <button
                  onClick={() => setImgOpen(null)}
                  className="flex items-center justify-center rounded-lg text-white"
                  style={{ background: '#e53935', width: 72, height: 40 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
                </button>
              </div>
            </div>
          );
        })()}

        {showPedidoDetalle && peticion.pedidoOrigen && (() => {
          const orderKey = peticion.pedidoOrigen.replace(/^P/, '');
          const order = ORDERS_DB[orderKey];
          return (
            <div className="absolute inset-0 z-[90] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) setShowPedidoDetalle(false); }}>
              <div className="w-full bg-white overflow-hidden flex flex-col" style={{ maxWidth: 520, maxHeight: '86vh', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="flex items-center gap-2 px-5 py-4" style={{ background: '#2563eb' }}>
                  <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>person</span>
                  <span className="font-bold text-sm text-white">Detalle del pedido</span>
                  <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>#{peticion.pedidoOrigen}</span>
                  <button onClick={() => setShowPedidoDetalle(false)} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
                  {order ? (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Cliente</div><div className="font-semibold" style={{ color: '#1a2b6b' }}>{order.cliente}</div></div>
                        <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Vendedor</div><div className="font-semibold" style={{ color: '#1a2b6b' }}>{order.vendedor}</div></div>
                        <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Fecha captura</div><div className="font-semibold" style={{ color: '#1a2b6b' }}>{order.fechaCaptura}</div></div>
                        <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Estatus</div><div className="font-semibold" style={{ color: '#1a2b6b' }}>{order.status}</div></div>
                        <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Total</div><div className="font-bold text-sm" style={{ color: '#16a34a' }}>{order.total}</div></div>
                        <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Origen</div><div className="font-semibold" style={{ color: '#1a2b6b' }}>{order.origen}</div></div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold mb-1.5" style={{ color: '#9ca3af' }}>Partidas del pedido</div>
                        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                          <div className="grid grid-cols-[1fr_60px] px-3 py-2 text-[10px] font-bold uppercase" style={{ background: '#f8f9fb', color: '#6b7280' }}>
                            <span>Producto</span><span className="text-center">Cant.</span>
                          </div>
                          {order.partidas.map(p => (
                            <div key={p.code} className="grid grid-cols-[1fr_60px] px-3 py-2 text-xs" style={{ borderTop: '1px solid #f0f0f0' }}>
                              <div><span className="font-semibold" style={{ color: '#1a2b6b' }}>{p.code}</span> <span style={{ color: '#6b7280' }}>— {PRODUCT_CATALOG[p.code]?.name ?? p.code}</span></div>
                              <span className="text-center font-bold" style={{ color: '#1a2b6b' }}>{p.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {order.observaciones && (
                        <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Observaciones</div><div className="text-xs" style={{ color: '#374151' }}>{order.observaciones}</div></div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-center py-6" style={{ color: '#9ca3af' }}>
                      Pedido <strong>#{peticion.pedidoOrigen}</strong> no disponible en catálogo local.
                    </p>
                  )}
                </div>
                <div className="flex justify-end px-5 py-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <button onClick={() => setShowPedidoDetalle(false)} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>Cerrar</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// F35 — Editor de observaciones del embarque. Se guarda inline con debounce.
function ObservacionesEmbarqueEditor({ emb, onGuardar }: {
  emb: { id: string; observaciones?: string };
  onGuardar: (id: string, texto: string) => void;
}) {
  const [txt, setTxt] = useState(emb.observaciones ?? '');
  const [guardado, setGuardado] = useState(true);
  const guardar = () => { onGuardar(emb.id, txt); setGuardado(true); };
  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-semibold" style={{ color: '#1a2b6b' }}>Observaciones del embarque</div>
        {!guardado && (
          <button onClick={guardar} className="text-[10px] px-2 py-0.5 rounded font-semibold text-white" style={{ background: '#16a34a' }}>
            Guardar
          </button>
        )}
      </div>
      <textarea
        value={txt}
        onChange={e => { setTxt(e.target.value); setGuardado(false); }}
        onBlur={guardar}
        rows={2}
        placeholder="Añade cualquier nota que la sucursal receptora deba saber…"
        className="w-full text-xs rounded p-2 border"
        style={{ borderColor: '#cbd5e1', resize: 'vertical' }}
      />
    </div>
  );
}
