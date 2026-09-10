// ============================================================
// APYMSA — ModalSurtidoHH
// Simulación simplificada de la Hand Held (HH) para SURTIR o REVISAR un traspaso.
// Basado en el prototipo Revision-HH-v2, reducido a un modal:
//   • Se surte/revisa dando clic en "Surtir/Revisar" por producto.
//   • Puede ser PARCIAL (stepper por producto).
//   • El botón "Negar traspaso" (3 puntos) es para TODO (no surtir nada).
//   • Al finalizar con faltante se genera una petición automática (recálculo SMC).
// Mismo comportamiento en surtido y revisión (solo flujo de traspasos).
// Design: HH APYMSA (navy #1B3892)
// ============================================================
import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, TraspasoPiezaDetalle, PRODUCT_CATALOG, EXISTENCIA_POR_SUCURSAL, MotivoRechazoTipo, MOTIVOS_RECHAZO } from '@/lib/data';

type Modo = 'surtido' | 'revision';

interface Props {
  peticion: TraspasoPeticion;
  modo?: Modo;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const NAVY = '#1B3892';

export default function ModalSurtidoHH({ peticion, modo = 'surtido', onClose, showToast }: Props) {
  const { finalizarSurtidoTraspaso, finalizarRevisionTraspaso, negarTraspaso, sucursalActual } = useApp();
  const stock = EXISTENCIA_POR_SUCURSAL[sucursalActual] ?? {};
  const esRevision = modo === 'revision';
  const verboMayus = esRevision ? 'Revisar' : 'Surtir';
  const tituloPantalla = esRevision ? 'Revisión de mercancía' : 'Surtido de órdenes';
  const accionFinal = esRevision ? 'Finalizar revisión' : 'Finalizar surtido';
  // Envío de la sucursal HACIA CEDIS (devolución/garantía): usa terminología de
  // "Rechazar/Cancelar traspaso" en vez de "Negar" (para esta perspectiva no es la
  // sucursal donante rechazando una necesidad, es cancelar un envío propio).
  const esEnvioACedis = peticion.sucursalDestino === 'CEDIS' || !!peticion.motivoEnvioCedis;
  const menuLabel = esEnvioACedis ? 'Rechazar traspaso' : 'Negar traspaso';
  const confirmTitulo = esEnvioACedis ? 'Rechazar traspaso' : 'Negar traspaso';

  // En revisión se parte de lo ya surtido; en surtido se parte de 0.
  const [qtyByCode, setQtyByCode] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    peticion.piezas.forEach(p => { init[p.code] = esRevision ? p.qtySurtida : 0; });
    return init;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmFaltante, setConfirmFaltante] = useState(false);
  const [confirmNegar, setConfirmNegar] = useState(false);
  // Nota que escribe el donante al finalizar surtido/revisión parcial.
  const [notaSurtido, setNotaSurtido] = useState('');
  // Motivo tipificado + comentario libre (solo si es "Otro") para el rechazo.
  const [motivoRechazo, setMotivoRechazo] = useState<MotivoRechazoTipo>('Producto dañado');
  const [motivoOtro, setMotivoOtro] = useState('');

  const solicitadaDe = (code: string) => peticion.piezas.find(p => p.code === code)?.qtySolicitada ?? 0;
  const existenciaDe = (code: string) => stock[code] ?? 0;

  const estadoLinea = (code: string): 'completado' | 'parcial' | 'pendiente' => {
    const q = qtyByCode[code];
    if (q <= 0) return 'pendiente';
    if (q >= solicitadaDe(code)) return 'completado';
    return 'parcial';
  };

  const contadores = useMemo(() => {
    const c = { completado: 0, parcial: 0, pendiente: 0 };
    peticion.piezas.forEach(p => { c[estadoLinea(p.code)]++; });
    return c;
  }, [qtyByCode, peticion.piezas]);

  const setQty = (code: string, n: number) => {
    const tope = Math.min(solicitadaDe(code), existenciaDe(code));
    setQtyByCode(prev => ({ ...prev, [code]: Math.max(0, Math.min(n, tope)) }));
  };
  const surtirTodo = (code: string) => setQty(code, solicitadaDe(code));

  const hayFaltante = peticion.piezas.some(p => qtyByCode[p.code] < solicitadaDe(p.code));
  // Validación de 0: puede ser parcial (menos de lo solicitado) pero NUNCA cero.
  // Un surtido/revisión en 0 no confirma nada: para eso está "Negar traspaso".
  const totalSurtido = peticion.piezas.reduce((s, p) => s + (qtyByCode[p.code] ?? 0), 0);
  const puedeFinalizar = totalSurtido > 0;

  const construirPiezas = (): TraspasoPiezaDetalle[] =>
    peticion.piezas.map(p => ({ code: p.code, qtySolicitada: p.qtySolicitada, qtySurtida: qtyByCode[p.code] }));

  const ejecutarFinalizar = () => {
    const piezas = construirPiezas();
    const nota = notaSurtido.trim() || undefined;
    if (esRevision) finalizarRevisionTraspaso(peticion.id, piezas, nota);
    else finalizarSurtidoTraspaso(peticion.id, piezas, nota);
    if (hayFaltante) {
      showToast(`${esRevision ? 'Revisión' : 'Surtido'} parcial registrado. La sucursal solicitante decidirá si reasigna o genera una nueva solicitud por el restante.`, 'warning');
    } else {
      showToast(`Traspaso ${peticion.id} ${esRevision ? 'revisado' : 'surtido'} completo.`, 'success');
    }
    onClose();
  };

  const handleFinalizar = () => {
    if (!puedeFinalizar) {
      showToast(`No puedes finalizar ${esRevision ? 'la revisión' : 'el surtido'} en 0. ${esRevision ? 'Revisa' : 'Surte'} al menos una pieza o usa "Negar traspaso".`, 'warning');
      return;
    }
    if (hayFaltante) { setConfirmFaltante(true); return; }
    ejecutarFinalizar();
  };

  // Motivo definitivo que se guarda en el traspaso: "Otro" concatena el comentario libre.
  const motivoFinal = () => {
    if (motivoRechazo === 'Otro') {
      const c = motivoOtro.trim();
      return c ? `Otro — ${c}` : 'Otro';
    }
    return motivoRechazo as string;
  };
  const puedeConfirmarRechazo = motivoRechazo !== 'Otro' || motivoOtro.trim().length > 0;

  const ejecutarNegar = () => {
    if (!puedeConfirmarRechazo) return;
    negarTraspaso(peticion.id, motivoFinal());
    showToast(
      esEnvioACedis
        ? `Traspaso ${peticion.id} cancelado. Ya no será enviado a CEDIS.`
        : 'Traspaso rechazado. La sucursal solicitante podrá reasignarlo desde "Por recibir".',
      'warning',
    );
    onClose();
  };

  const pill = (estado: ReturnType<typeof estadoLinea>) => {
    const map = {
      completado: { t: 'Completado', bg: 'rgba(46,125,50,0.12)', c: '#2e7d32' },
      parcial: { t: 'Parcial', bg: 'rgba(27,56,146,0.1)', c: NAVY },
      pendiente: { t: esRevision ? 'Sin revisar' : 'Pendiente', bg: 'rgba(249,168,37,0.15)', c: '#b7791f' },
    }[estado];
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: map.bg, color: map.c }}>{map.t}</span>;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', animation: 'screenFadeIn 0.2s ease' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white overflow-hidden" style={{ width: 420, maxWidth: '96vw', height: '86vh', maxHeight: 760, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}>

        {/* Header HH */}
        <div className="flex items-center gap-2 px-4" style={{ background: NAVY, height: 52, flexShrink: 0 }}>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: '#fff' }} title="Cerrar">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#fff', margin: '0 auto' }}>{esRevision ? 'fact_check' : 'assignment'}</span>
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: '#fff' }} title="Opciones">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 20, minWidth: 220 }}>
                <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                  {esEnvioACedis ? 'Rechaza el envío completo a CEDIS' : 'Negar es para todo (no surtir nada)'}
                </div>
                <button
                  onClick={() => { setMenuOpen(false); setConfirmNegar(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-gray-50"
                  style={{ color: '#e53935' }}
                >
                  {menuLabel}
                </button>
                <button onClick={() => setMenuOpen(false)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#6b7280', borderTop: '1px solid #f0f0f0' }}>
                  Cerrar menú
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Título */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid #eef0f4', flexShrink: 0 }}>
          <span className="text-sm font-extrabold" style={{ color: '#1a1a2e' }}>{tituloPantalla}</span>
          <span className="text-xs font-semibold" style={{ color: NAVY }}>Traspaso {peticion.id}</span>
        </div>

        {/* Avance */}
        <div className="grid grid-cols-3 gap-1 px-3 py-2.5" style={{ background: '#f6f7fb', flexShrink: 0 }}>
          {([['completado', 'Completado', '#2e7d32'], ['parcial', 'Parcial', NAVY], ['pendiente', esRevision ? 'Sin revisar' : 'Pendientes', '#f9a825']] as const).map(([k, label, color]) => (
            <div key={k} className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-extrabold" style={{ color: '#1a1a2e' }}>{contadores[k]}</span>
              <span className="text-[10px] font-medium text-center" style={{ color }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Lista de artículos */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ background: '#fafbfc' }}>
          <p className="text-[11px] text-center" style={{ color: '#9ca3af' }}>
            Toca <strong>{verboMayus}</strong> para simular el escaneo · ajusta la cantidad para parcial · o usa los 3 puntos para negar todo.
          </p>
          {peticion.piezas.map(p => {
            const estado = estadoLinea(p.code);
            const sol = solicitadaDe(p.code);
            const ex = existenciaDe(p.code);
            const topeExistencia = ex < sol;
            const q = qtyByCode[p.code];
            return (
              <div key={p.code} className="rounded-xl p-3" style={{ background: '#fff', border: `1.5px solid ${estado === 'pendiente' ? '#eef0f4' : estado === 'completado' ? 'rgba(46,125,50,0.35)' : 'rgba(27,56,146,0.35)'}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold" style={{ color: NAVY }}>{p.code}</div>
                    <div className="text-xs truncate" style={{ color: '#555' }}>{PRODUCT_CATALOG[p.code]?.name ?? p.code}</div>
                  </div>
                  {pill(estado)}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: '#6b7280' }}>
                  <span>Solicitado: <strong style={{ color: '#1a1a2e' }}>{sol}</strong></span>
                  <span title={`Existencia en ${sucursalActual}`}>Existencia: <strong style={{ color: topeExistencia ? '#e53935' : '#2e7d32' }}>{ex}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #d7dbe6' }}>
                    <button onClick={() => setQty(p.code, q - 1)} className="w-8 h-8 font-bold" style={{ background: '#f2f4f8', color: NAVY }}>−</button>
                    <span className="w-9 text-center text-sm font-bold" style={{ color: '#1a1a2e' }}>{q}</span>
                    <button onClick={() => setQty(p.code, q + 1)} className="w-8 h-8 font-bold" style={{ background: '#f2f4f8', color: NAVY }}>+</button>
                  </div>
                  <button onClick={() => surtirTodo(p.code)} className="flex-1 h-8 rounded-lg text-xs font-bold text-white" style={{ background: NAVY }}>
                    {verboMayus}{topeExistencia ? ` (máx ${ex})` : ''}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #eef0f4' }}>
          <button
            onClick={handleFinalizar}
            disabled={!puedeFinalizar}
            title={!puedeFinalizar ? `No puedes finalizar en 0. ${esRevision ? 'Revisa' : 'Surte'} al menos una pieza o usa "Negar traspaso".` : undefined}
            className="w-full h-11 rounded-xl text-sm font-extrabold text-white"
            style={{ background: puedeFinalizar ? NAVY : '#9ca3af', cursor: puedeFinalizar ? 'pointer' : 'not-allowed', letterSpacing: 0.3 }}
          >
            {accionFinal}
          </button>
          {!puedeFinalizar && (
            <p className="text-[11px] text-center mt-1.5" style={{ color: '#b7791f' }}>
              {esRevision ? 'Revisa' : 'Surte'} al menos una pieza (no se puede finalizar en 0) o usa "Negar traspaso".
            </p>
          )}
        </div>

        {/* Confirmar finalizar con faltante (surtido/revisión parcial) */}
        {confirmFaltante && (() => {
          const parciales = peticion.piezas
            .filter(p => qtyByCode[p.code] < solicitadaDe(p.code))
            .map(p => ({ code: p.code, name: PRODUCT_CATALOG[p.code]?.name ?? p.code, sol: p.qtySolicitada, sur: qtyByCode[p.code] }));
          return (
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                {/* Icono + título */}
                <div className="flex flex-col items-center gap-3 pt-6 px-5">
                  <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(27,56,146,0.12)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: NAVY }}>splitscreen</span>
                  </div>
                  <div className="text-sm font-extrabold text-center leading-snug" style={{ color: '#1a1a2e' }}>
                    Surtido parcial, para los siguientes artículos se realizó un surtido parcial:
                  </div>
                </div>
                {/* Tabla de artículos parciales */}
                <div className="px-5 mt-3">
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #eef0f4' }}>
                    <div className="grid grid-cols-[1fr_54px_54px] px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#f6f7fb', color: '#6b7280' }}>
                      <span>Artículo</span>
                      <span className="text-center">Sol.</span>
                      <span className="text-center">Surt.</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {parciales.map(p => (
                        <div key={p.code} className="grid grid-cols-[1fr_54px_54px] px-3 py-2 text-xs" style={{ borderTop: '1px solid #f0f0f0' }}>
                          <div className="min-w-0">
                            <div className="font-semibold truncate" style={{ color: NAVY }}>{p.code}</div>
                            <div className="text-[10px] truncate" style={{ color: '#6b7280' }}>{p.name}</div>
                          </div>
                          <span className="text-center font-semibold self-center" style={{ color: '#1a1a2e' }}>{p.sol}</span>
                          <span className="text-center font-bold self-center" style={{ color: NAVY }}>{p.sur}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Nota del donante para el surtido/revisión parcial (opcional) */}
                <div className="px-5 mt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>Nota (opcional)</label>
                  <textarea
                    value={notaSurtido}
                    onChange={e => setNotaSurtido(e.target.value)}
                    placeholder={`Nota para la sucursal solicitante (por qué no se ${esRevision ? 'revisó' : 'surtió'} completo)…`}
                    rows={2}
                    className="w-full text-xs rounded-lg px-3 py-2 mt-1 resize-none"
                    style={{ border: '1px solid #d7dbe6', background: '#fafbfc', fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
                <p className="text-[11px] mt-2 px-5 text-center" style={{ color: '#6b7280' }}>
                  Solo se registrarán los artículos surtidos. ¿Deseas continuar?
                </p>
                <div className="flex gap-2 px-5 py-5 mt-2">
                  <button onClick={() => setConfirmFaltante(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                  <button onClick={() => { setConfirmFaltante(false); ejecutarFinalizar(); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: NAVY }}>Continuar</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Confirmar rechazar/negar traspaso (todo) */}
        {confirmNegar && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              {/* Icono + título */}
              <div className="flex flex-col items-center gap-3 pt-6 px-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(229,57,53,0.12)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#e53935' }}>block</span>
                </div>
                <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>{confirmTitulo}</div>
              </div>
              <p className="text-xs mt-3 px-6 text-center leading-relaxed" style={{ color: '#555' }}>
                ¿Estás seguro de rechazar el traspaso <strong style={{ color: '#1a1a2e' }}>{peticion.id}</strong>?<br />
                Esta acción <strong>no puede ser cancelada</strong>. ¿Desea continuar?
              </p>
              {/* Motivo de rechazo (obligatorio): Producto dañado / Diferencia de inventarios / Otro */}
              <div className="px-5 mt-3">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>Motivo del rechazo</label>
                <div className="flex flex-col gap-1.5 mt-1.5">
                  {MOTIVOS_RECHAZO.map(m => (
                    <label key={m} className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer" style={{
                      border: `1px solid ${motivoRechazo === m ? '#e53935' : '#e5e7eb'}`,
                      background: motivoRechazo === m ? 'rgba(229,57,53,0.06)' : '#fff',
                    }}>
                      <input type="radio" name="motivoRechazo" value={m} checked={motivoRechazo === m} onChange={() => setMotivoRechazo(m)} style={{ accentColor: '#e53935' }} />
                      <span className="text-xs font-semibold" style={{ color: motivoRechazo === m ? '#e53935' : '#374151' }}>{m}</span>
                    </label>
                  ))}
                </div>
                {motivoRechazo === 'Otro' && (
                  <textarea
                    value={motivoOtro}
                    onChange={e => setMotivoOtro(e.target.value)}
                    placeholder="Escribe el motivo o razón…"
                    rows={2}
                    className="w-full text-xs rounded-lg px-3 py-2 mt-2 resize-none"
                    style={{ border: '1px solid #d7dbe6', background: '#fafbfc', fontFamily: 'Roboto, sans-serif' }}
                  />
                )}
              </div>
              {!esEnvioACedis && (
                <p className="text-[11px] mt-3 px-6 text-center" style={{ color: '#9ca3af' }}>
                  La sucursal solicitante podrá reasignarlo a otra sucursal desde "Por recibir".
                </p>
              )}
              <div className="flex gap-2 px-6 py-5 mt-2">
                <button onClick={() => setConfirmNegar(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                <button
                  onClick={ejecutarNegar}
                  disabled={!puedeConfirmarRechazo}
                  title={!puedeConfirmarRechazo ? 'Describe el motivo en "Otro" para continuar.' : undefined}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: puedeConfirmarRechazo ? '#e53935' : '#9ca3af', cursor: puedeConfirmarRechazo ? 'pointer' : 'not-allowed' }}
                >
                  Rechazar traspaso
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
