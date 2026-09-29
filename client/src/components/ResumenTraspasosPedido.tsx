// ============================================================
// APYMSA — ResumenTraspasosPedido
// Resumen de las peticiones de traspaso que cubren un pedido/petición padre.
// Cambios (spec del usuario):
//  • Columna "Sucursal" ahora es "Sucursal destino" (Saliente) o
//    "Sucursal donante" (Entrante), con salto de línea para no ensanchar.
//  • Se quitó "% pedido"; la columna "Piezas" pasa a "Piezas / Códigos"
//    (total de piezas + cantidad de códigos distintos).
//  • Columna "Estado" mantiene el estatus operativo (Pendiente/Surtido/etc.).
//  • Se movió la columna "Nota" fuera de la tabla — ahora es una sección
//    debajo con las notas por petición.
//  • En el encabezado del resumen aparece un badge global:
//    Activo / Rechazado / Cancelado.
//  • Doble click sobre una fila la marca y despliega el DESGLOSE DE PIEZAS
//    en la misma ventana (aún cuando solo haya una petición).
//  • En el desglose se quitó "Surtida" y se agregó "Existencia (sucursal
//    donante)" y el estado por pieza indica cantidades surtida/enviada.
// ============================================================
import { Fragment, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoPeticion, TraspasoStatus, TRASPASO_STATUS_COLORS,
  ORDERS_DB, EXISTENCIA_POR_SUCURSAL, PRODUCT_CATALOG,
} from '@/lib/data';

interface Props {
  // Fuente de agrupación (una de las tres):
  solicitudId?: string;                    // agrupa todas las peticiones de la misma solicitud (preferido).
  pedidoOrigen?: string;                   // fallback: id del pedido cliente ('P#######').
  peticionOrigenId?: string;               // fallback: id de la petición padre (consolidadora).
  currentPetId?: string;                   // petición a resaltar (opcional).
  perspectiva?: 'Entrante' | 'Saliente';   // ajusta el label de la columna de sucursal.
  onAbrirPeticion?: (id: string) => void;  // doble click en OTRA petición: abre ventana con esa petición.
  mostrarExistencia?: boolean;             // agrega columna "Existencia sucursal actual" en la tabla de piezas.
  sucursalPropia?: string;                 // sucursal cuya existencia mostrar (default: la del donante de la fila).
}

const RECIBIDO_ST: TraspasoStatus[] = ['Recibido', 'Entregado'];
const ENVIADO_ST: TraspasoStatus[] = ['Enviado', 'Recibido', 'Entregado'];
const SURTIDO_ST: TraspasoStatus[] = ['Surtido', 'Revisado', 'Documentado', 'Enviado', 'Recibido', 'Entregado'];

const sumaPiezas = (p: TraspasoPeticion) => p.piezas.reduce((s, x) => s + x.qtySolicitada, 0);
const sumaSurtidas = (p: TraspasoPeticion) => p.piezas.reduce((s, x) => s + x.qtySurtida, 0);
const codigosDistintos = (p: TraspasoPeticion) => new Set(p.piezas.map(x => x.code)).size;

// Estatus global del resumen: activo / rechazado / cancelado.
type EstatusResumen = 'Activo' | 'Rechazado' | 'Cancelado';
function estatusResumenDe(peticiones: TraspasoPeticion[]): EstatusResumen {
  if (peticiones.length === 0) return 'Activo';
  const todasCanceladas = peticiones.every(t => t.status === 'Cancelado');
  if (todasCanceladas) {
    // Si alguna cancelada tiene resultado 'rechazada' Y no tiene derivada activa → Rechazado.
    const algunaRechazada = peticiones.some(t => t.resultado === 'rechazada');
    return algunaRechazada ? 'Rechazado' : 'Cancelado';
  }
  // Alguna activa: si hay rechazadas pendientes de reasignar mostrar Rechazado,
  // pero si el flujo ya avanzó (hay derivada activa) → Activo.
  const rechazadaSinDerivada = peticiones.some(t => t.status === 'Cancelado' && t.resultado === 'rechazada' && !t.peticionSiguienteId);
  if (rechazadaSinDerivada) return 'Rechazado';
  return 'Activo';
}

const COLOR_ESTATUS: Record<EstatusResumen, { bg: string; text: string; border: string }> = {
  Activo:     { bg: 'rgba(37,99,235,0.10)',  text: '#1d4ed8', border: 'rgba(37,99,235,0.35)' },
  Rechazado:  { bg: 'rgba(220,38,38,0.10)',  text: '#dc2626', border: 'rgba(220,38,38,0.35)' },
  Cancelado:  { bg: 'rgba(107,114,128,0.10)', text: '#374151', border: 'rgba(107,114,128,0.35)' },
};

export default function ResumenTraspasosPedido({ solicitudId, pedidoOrigen, peticionOrigenId, currentPetId, perspectiva = 'Saliente', onAbrirPeticion, mostrarExistencia, sucursalPropia }: Props) {
  const { traspasos } = useApp();
  // Fila expandida (desglose de piezas). Por defecto: si hay currentPetId, esa
  // — así al abrir la ventana la petición actual ya viene seleccionada con su
  // tabla de productos visible.
  const [expandedId, setExpandedId] = useState<string | null>(currentPetId ?? null);

  // Fuente de agrupación — precedencia: solicitudId > peticionOrigenId > pedidoOrigen.
  // solicitudId agrupa TODAS las peticiones de la misma solicitud (siempre existen
  // ≥ 1 hermana lógica). Los fallbacks se mantienen por compatibilidad.
  const modo: 'solicitud' | 'peticion' | 'pedido' =
    solicitudId ? 'solicitud' : peticionOrigenId ? 'peticion' : 'pedido';
  if (modo === 'solicitud' && !solicitudId) return null;
  if (modo === 'peticion' && !peticionOrigenId) return null;
  if (modo === 'pedido' && !pedidoOrigen) return null;

  const orderKey = (pedidoOrigen ?? '').replace(/^P/, '');
  const order = pedidoOrigen ? ORDERS_DB[orderKey] : undefined;
  const totalRequerido = order ? order.partidas.reduce((s, p) => s + p.qty, 0) : 0;
  const relacionadas =
      modo === 'solicitud' ? traspasos.filter(t => t.solicitudId === solicitudId)
    : modo === 'peticion'  ? traspasos.filter(t => t.peticionOrigenId === peticionOrigenId)
    :                        traspasos.filter(t => t.pedidoOrigen === pedidoOrigen);
  if (relacionadas.length === 0) return null;

  const vigentes = relacionadas.filter(t => t.status !== 'Cancelado');
  const piezasVigentes = vigentes.reduce((s, t) => s + sumaPiezas(t), 0);
  const faltante = Math.max(0, totalRequerido - piezasVigentes);

  const existenciaSucOfPet = (t: TraspasoPeticion) =>
    t.piezas.reduce((s, x) => s + (EXISTENCIA_POR_SUCURSAL[t.sucursalContraparte]?.[x.code] ?? 0), 0);
  const existenciaCodigoEn = (suc: string, code: string) =>
    EXISTENCIA_POR_SUCURSAL[suc]?.[code] ?? 0;

  const estatusGlobal = estatusResumenDe(relacionadas);
  const cGlobal = COLOR_ESTATUS[estatusGlobal];
  const colSucLabel = perspectiva === 'Entrante' ? 'Sucursal\ndonante' : 'Sucursal\ndestino';

  const rowsOrdenadas = relacionadas.slice().sort((a, b) => (a.intento ?? 0) - (b.intento ?? 0));
  const notas = rowsOrdenadas.filter(t => t.status === 'Cancelado' || t.peticionAnteriorId);

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);
  const handleDoubleClick = (id: string) => {
    // Si es la petición actual (ya viene expandida): solo colapsar/expandir.
    // Si es OTRA y el padre pasó onAbrirPeticion: abre nueva ventana con esa
    // petición (comportamiento pedido por el usuario). Si no hay callback,
    // cae al toggle-expand para no romper otros consumidores.
    if (id !== currentPetId && onAbrirPeticion) { onAbrirPeticion(id); return; }
    toggleExpand(id);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#1a2b6b' }}>
          {modo === 'peticion' ? 'Resumen de solicitud consolidadora:'
          : modo === 'solicitud' && relacionadas.length > 1 ? 'Resumen de la solicitud (peticiones relacionadas):'
          : 'Resumen de traspaso:'}
        </h3>
        <span
          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
          style={{ background: cGlobal.bg, color: cGlobal.text, border: `1px solid ${cGlobal.border}` }}
          title={
            estatusGlobal === 'Activo'    ? 'En progreso'
          : estatusGlobal === 'Rechazado' ? 'Rechazado en HH (pendiente de reasignar)'
          :                                  'Cancelado (pedido facturado/cancelado o cancelación manual)'
          }
        >
          {estatusGlobal}
        </span>
      </div>

      {!order && (
        <p className="text-xs" style={{ color: '#9ca3af' }}>Pedido no disponible en catálogo local; se muestra el desglose de peticiones.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
              <th className="text-left px-2.5 py-2 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#6b7280' }}>Petición</th>
              <th className="text-left px-2.5 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280', whiteSpace: 'pre-line' }}>{colSucLabel}</th>
              <th className="text-left px-2.5 py-2 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#6b7280' }}>Estado / Avance</th>
              <th className="text-left px-2.5 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280', whiteSpace: 'pre-line' }}>Piezas /{'\n'}códigos</th>
              <th className="text-right px-2.5 py-2 font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#6b7280' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {rowsOrdenadas.map(t => {
              const piezas = sumaPiezas(t);
              const codigos = codigosDistintos(t);
              const cancelada = t.status === 'Cancelado';
              const c = TRASPASO_STATUS_COLORS[t.status];
              const isSelected = t.id === expandedId;
              const isActual = t.id === currentPetId;
              return (
                <Fragment key={t.id}>
                  <tr
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: isActual ? 'rgba(26,43,107,0.06)' : isSelected ? 'rgba(26,43,107,0.03)' : 'transparent',
                    }}
                    title={isActual ? 'Petición actual del detalle' : undefined}
                  >
                    <td className="px-2.5 py-2 font-semibold whitespace-nowrap" style={{ color: '#1a2b6b' }}>
                      {t.id}{isActual && <span className="ml-1 text-[10px] font-bold" style={{ color: '#7c3aed' }}>(actual)</span>}
                    </td>
                    <td className="px-2.5 py-2 whitespace-nowrap" style={{ color: '#374151' }}>{t.sucursalContraparte}</td>
                    <td className="px-2.5 py-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{t.status}</span>
                    </td>
                    <td className="px-2.5 py-2 text-center whitespace-nowrap" style={{ textDecoration: cancelada ? 'line-through' : 'none', color: cancelada ? '#9ca3af' : '#374151' }}>
                      <span className="font-bold">{piezas}</span> pza · <span className="font-bold">{codigos}</span> cód
                    </td>
                    <td className="px-2.5 py-2 text-right whitespace-nowrap">
                      {isActual ? (
                        <span className="text-[10px] italic" style={{ color: '#9ca3af' }}>mostrada arriba</span>
                      ) : onAbrirPeticion ? (
                        <button
                          onClick={() => onAbrirPeticion(t.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors"
                          style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.25)' }}
                          title="Cargar esta petición en esta misma ventana"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>visibility</span>
                          Ver detalle
                        </button>
                      ) : (
                        <button
                          onClick={() => setExpandedId(prev => prev === t.id ? null : t.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-colors"
                          style={{ background: 'rgba(107,114,128,0.10)', color: '#374151', border: '1px solid rgba(107,114,128,0.25)' }}
                          title="Expandir/colapsar desglose"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{isSelected ? 'expand_less' : 'expand_more'}</span>
                          Desglose
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Desglose de piezas (solo se muestra si onAbrirPeticion no
                      está — modo standalone). En modo integrado al modal, el
                      desglose de la actual ya se ve en la sección "Piezas". */}
                  {isSelected && !onAbrirPeticion && (
                    <tr style={{ background: '#fafbfc' }}>
                      <td colSpan={5} className="px-3 py-3">
                        <div className="rounded-md" style={{ border: '1px solid #e5e7eb', background: '#fff' }}>
                          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#1a2b6b', borderBottom: '1px solid #e5e7eb', background: '#f6f7fb' }}>
                            Desglose de piezas — {t.id}
                          </div>
                          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                                <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>No.</th>
                                <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Código</th>
                                <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Producto</th>
                                <th className="text-center px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Solicitada</th>
                                <th className="text-center px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Existencia</th>
                                <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {t.piezas.map((p, idx) => {
                                const prod = PRODUCT_CATALOG[p.code];
                                const yaSurtido = SURTIDO_ST.includes(t.status);
                                const yaEnviado = ENVIADO_ST.includes(t.status);
                                const yaRecibido = RECIBIDO_ST.includes(t.status);
                                const existencia = existenciaCodigoEn(t.sucursalContraparte, p.code);
                                return (
                                  <tr key={p.code} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td className="px-2.5 py-1.5 text-gray-400">{idx + 1}</td>
                                    <td className="px-2.5 py-1.5 font-semibold" style={{ color: '#1a2b6b' }}>{p.code}</td>
                                    <td className="px-2.5 py-1.5" style={{ color: '#374151' }}>{prod?.name ?? p.code}</td>
                                    <td className="px-2.5 py-1.5 text-center">{p.qtySolicitada}</td>
                                    <td className="px-2.5 py-1.5 text-center" style={{ color: existencia >= p.qtySolicitada ? '#16a34a' : '#d97706' }}>{existencia}</td>
                                    <td className="px-2.5 py-1.5 text-[11px]">
                                      {yaRecibido ? (
                                        <span style={{ color: '#16a34a' }}>Recibida: <strong>{p.qtySurtida}</strong></span>
                                      ) : yaEnviado ? (
                                        <span style={{ color: '#2563eb' }}>Enviada: <strong>{p.qtySurtida}</strong></span>
                                      ) : yaSurtido ? (
                                        <span style={{ color: '#0d9488' }}>Surtida: <strong>{p.qtySurtida}</strong></span>
                                      ) : (
                                        <span style={{ color: '#9ca3af' }}>Pendiente</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notas — fuera de la tabla, como sección debajo. */}
      {notas.length > 0 && (
        <div className="rounded-md p-3 flex flex-col gap-1.5 mt-3" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
          <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#9ca3af' }}>Notas por petición</div>
          {notas.map(t => {
            const label =
              t.status === 'Cancelado' ? (t.resultado === 'rechazada' ? 'Rechazada en HH' : 'Cancelada')
              : t.peticionAnteriorId ? 'Derivada (reintento)'
              : 'Original';
            const color =
              t.status === 'Cancelado' ? (t.resultado === 'rechazada' ? '#dc2626' : '#374151')
              : '#2563eb';
            return (
              <div key={t.id} className="text-[11px] flex items-center gap-2">
                <span className="font-semibold whitespace-nowrap" style={{ color: '#1a2b6b' }}>{t.id}</span>
                <span style={{ color }}>{label}{t.status === 'Cancelado' && t.peticionSiguienteId ? ' · generó nueva' : ''}</span>
                {t.motivoRechazo && <span style={{ color: '#6b7280' }}>· {t.motivoRechazo}</span>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
