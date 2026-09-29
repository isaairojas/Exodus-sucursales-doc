// ============================================================
// APYMSA — ModalCotizador (Paso 3 del flujo de embarque).
// Ver docs/flujo-embarque-cambios.md §6.
//
// Reglas actuales:
//   • Se muestran máximo 3 tarifas fijas (top 3 más baratas). Uber y BlueGo
//     NO cuentan aquí — se muestran aparte solo si la distancia < 18 km.
//   • Uber / BlueGo aparecen como tarjetas SIN precio (el costo se define al
//     solicitar el viaje).
//   • Tarjeta "Seleccionar manualmente" para elegir cualquier paquetería del
//     catálogo TRASPASO_PAQUETERIAS con un motivo obligatorio.
//   • El botón "Seleccionar" de cada tarjeta solo marca la tarjeta como
//     elegida. Al final el botón "Continuar" del footer avanza.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EmbarqueTraspaso, DocumentacionPorPedido, CotizacionPaqueteria,
  SUCURSAL_COORDS, SUCURSAL_CP, TRASPASO_PAQUETERIAS, TipoPaqueteria, tipoPaqueteriaDe,
} from '@/lib/data';
import { cotizarTodas, obtenerRutaOSRM, RutaOsrm } from '@/lib/paqueterias';

interface Props {
  embarque: EmbarqueTraspaso;
  documentacion: DocumentacionPorPedido[];
  origen: string;
  modoPeso: 'Consolidado' | 'CadaCajaSeparado';
  onClose: () => void;
  onRegresar: () => void;
  onSeleccionar: (cot: CotizacionPaqueteria) => void;
}

// Umbral de kilómetros bajo el cual Uber/BlueGo son opciones viables.
const KM_LOCAL_UBER_BLUEGO = 18;
// Cuántas tarifas fijas mostrar como opciones "reales" del tarifario.
const TOP_TARIFAS = 3;

type SeleccionKey =
  | { tipo: 'tarifa'; paqueteria: string }
  | { tipo: 'api'; paqueteria: 'Uber' | 'BlueGo' }
  | { tipo: 'manual' };

export default function ModalCotizador({
  embarque, documentacion, origen, modoPeso,
  onClose, onRegresar, onSeleccionar,
}: Props) {
  const destino = embarque.sucursalDestino;
  const origenCoords = SUCURSAL_COORDS[origen] ?? [20.68, -103.35];
  const destinoCoords = SUCURSAL_COORDS[destino] ?? [20.68, -103.35];
  const destinoSinCoords = !SUCURSAL_COORDS[destino];

  const [ruta, setRuta] = useState<RutaOsrm | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(true);

  // Nuevo modelo de selección: una sola tarjeta activa a la vez.
  const [seleccion, setSeleccion] = useState<SeleccionKey | null>(null);
  // Sub-form inline de "Seleccionar manualmente".
  const [manualExpandido, setManualExpandido] = useState(false);
  const [manualPaqueteria, setManualPaqueteria] = useState<string>('');
  const [manualMotivo, setManualMotivo] = useState<string>('');
  const manualConfirmado = useMemo(
    () => seleccion?.tipo === 'manual' && !!manualPaqueteria && manualMotivo.trim().length > 0,
    [seleccion, manualPaqueteria, manualMotivo],
  );
  // Al deseleccionar la tarjeta manual, colapsa el sub-form.
  useEffect(() => {
    if (seleccion?.tipo !== 'manual') setManualExpandido(false);
  }, [seleccion]);

  useEffect(() => {
    let cancel = false;
    setCargandoRuta(true);
    obtenerRutaOSRM(origenCoords, destinoCoords).then(r => {
      if (!cancel) { setRuta(r); setCargandoRuta(false); }
    });
    return () => { cancel = true; };
  }, [origen, destino]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cotizaciones "tarifa fija" (todas las de tarifario, incluyendo Transporte
  // interno; excluye Uber/BlueGo que van como tarjetas aparte). Se recorta al
  // top 3 más baratas.
  const todasCotizaciones = useMemo<CotizacionPaqueteria[]>(() => {
    if (!ruta) return [];
    return cotizarTodas({
      origen, destino, origenCoords, destinoCoords,
      distanciaKm: ruta.distanciaKm,
      documentacion, modoPeso,
      destinoCP: SUCURSAL_CP[destino],
    });
  }, [ruta, documentacion, modoPeso, origen, destino]);

  const tarifasTop = useMemo<CotizacionPaqueteria[]>(() => {
    return todasCotizaciones
      .filter(c => c.paqueteria !== 'Uber' && c.paqueteria !== 'BlueGo')
      .slice(0, TOP_TARIFAS);
  }, [todasCotizaciones]);

  const mostrarApiLocal = !!ruta && ruta.distanciaKm < KM_LOCAL_UBER_BLUEGO;

  // Proyección de coords a viewBox SVG 0..500 x 0..300.
  const viewBox = useMemo(() => {
    const coords = ruta?.coords?.length ? ruta.coords : [origenCoords, destinoCoords];
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const dLat = Math.max(maxLat - minLat, 0.005);
    const dLng = Math.max(maxLng - minLng, 0.005);
    const padX = dLng * 0.15, padY = dLat * 0.15;
    return {
      x0: minLng - padX, y0: minLat - padY,
      dLat: dLat + 2 * padY, dLng: dLng + 2 * padX,
    };
  }, [ruta]);

  const proj = (c: [number, number]): [number, number] => {
    const x = ((c[1] - viewBox.x0) / viewBox.dLng) * 500;
    const y = 300 - ((c[0] - viewBox.y0) / viewBox.dLat) * 300;
    return [x, y];
  };

  const polylineStr = ruta?.coords?.length
    ? ruta.coords.map(c => { const [x, y] = proj(c); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ')
    : '';
  const [ox, oy] = proj(origenCoords);
  const [dx, dy] = proj(destinoCoords);

  // Estilos comunes por estado de selección/recomendación.
  const cardStyle = (opts: { activo: boolean; recomendada?: boolean; cara?: boolean }) => {
    const { activo, recomendada, cara } = opts;
    if (activo) return { border: '2px solid #1a2b6b', background: 'rgba(26,43,107,0.06)' };
    if (cara)   return { border: '2px solid #dc2626', background: 'rgba(220,38,38,0.05)' };
    if (recomendada) return { border: '2px solid #16a34a', background: 'rgba(22,163,74,0.05)' };
    return { border: '1px solid #e5e7eb', background: 'white' };
  };
  const isKeyActiva = (k: SeleccionKey): boolean => {
    if (!seleccion) return false;
    if (seleccion.tipo !== k.tipo) return false;
    if (seleccion.tipo === 'tarifa' && k.tipo === 'tarifa') return seleccion.paqueteria === k.paqueteria;
    if (seleccion.tipo === 'api' && k.tipo === 'api') return seleccion.paqueteria === k.paqueteria;
    if (seleccion.tipo === 'manual') return true;
    return false;
  };

  const puedeContinuar = useMemo(() => {
    if (!seleccion) return false;
    if (seleccion.tipo === 'manual') return manualConfirmado;
    return true;
  }, [seleccion, manualConfirmado]);

  const handleContinuar = () => {
    if (!seleccion) return;

    // TODO: variantes por paquetería (pendiente de definición) — según la
    // paquetería seleccionada, el siguiente paso puede variar (generar guía
    // WebService, solicitar Uber/BlueGo por API, capturar guía manual, etc.).
    let cot: CotizacionPaqueteria | null = null;

    if (seleccion.tipo === 'tarifa') {
      cot = tarifasTop.find(c => c.paqueteria === seleccion.paqueteria) ?? null;
    } else if (seleccion.tipo === 'api') {
      cot = {
        paqueteria: seleccion.paqueteria,
        tipo: seleccion.paqueteria as TipoPaqueteria,
        costo: 0, moneda: 'MXN',
        tiempoEntregaDias: seleccion.paqueteria === 'Uber' ? '2-4 horas' : '2-6 horas',
        notas: ['Cotización por solicitud — el costo se define al despachar el viaje'],
        cubierto: true,
      };
    } else if (seleccion.tipo === 'manual' && manualConfirmado) {
      cot = {
        paqueteria: manualPaqueteria,
        tipo: tipoPaqueteriaDe(manualPaqueteria),
        costo: 0, moneda: 'MXN',
        notas: [`Selección manual · Motivo: ${manualMotivo.trim()}`],
        cubierto: true,
      };
    }
    if (!cot) return;

    // Placeholder: informa al usuario del siguiente paso (aún no implementado).
    // eslint-disable-next-line no-console
    console.log('[cotizador] Siguiente paso para', cot.paqueteria, '— pendiente de definir', cot);
    onSeleccionar(cot);
  };

  // Datos derivados para render.
  const kmTxt = ruta ? `${ruta.distanciaKm} km` : '';
  const minTxt = ruta?.tiempoMin ? ` · ~${ruta.tiempoMin} min` : '';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full bg-white flex flex-col" style={{ maxWidth: 1100, maxHeight: '90vh', borderRadius: 20, fontFamily: 'Roboto, sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ background: '#1a2b6b', color: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>route</span>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Cotizador de paqueterías — {embarque.id}</div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              Ruta: <strong>{origen}</strong> → <strong>{destino}</strong>
              {ruta && ` · ${kmTxt}${minTxt}`}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10" aria-label="Cerrar">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        {/* Body — 2 columnas */}
        <div className="flex-1 overflow-hidden grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {/* Mapa SVG */}
          <div className="p-4 flex flex-col" style={{ background: '#f8fafc', borderRight: '1px solid #e5e7eb' }}>
            {destinoSinCoords && (
              <div className="rounded p-2 mb-2" style={{ background: '#fef3c7', color: '#92400e', fontSize: 11, border: '1px solid #fde68a' }}>
                <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>warning</span>
                {' '}Destino "{destino}" sin coordenadas oficiales — la distancia es una aproximación.
              </div>
            )}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2b6b', marginBottom: 8 }}>Ruta estimada</div>
            <div className="flex-1 rounded-lg overflow-hidden" style={{ background: 'white', border: '1px solid #e5e7eb', minHeight: 320 }}>
              {cargandoRuta ? (
                <div className="w-full h-full flex items-center justify-center" style={{ color: '#64748b', fontSize: 13 }}>
                  <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                  Calculando ruta…
                </div>
              ) : (
                <svg viewBox="0 0 500 300" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                  <rect x="0" y="0" width="500" height="300" fill="#eef4fb" />
                  {polylineStr && (
                    <polyline points={polylineStr} fill="none" stroke="#1a2b6b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                  )}
                  <circle cx={ox} cy={oy} r="8" fill="#16a34a" stroke="white" strokeWidth="2" />
                  <text x={ox + 12} y={oy + 4} fontSize="11" fill="#0f172a" fontWeight="600">{origen}</text>
                  <circle cx={dx} cy={dy} r="8" fill="#dc2626" stroke="white" strokeWidth="2" />
                  <text x={dx + 12} y={dy + 4} fontSize="11" fill="#0f172a" fontWeight="600">{destino}</text>
                </svg>
              )}
            </div>
            {ruta && (
              <div className="mt-2 grid grid-cols-2 gap-2" style={{ fontSize: 12 }}>
                <div className="rounded p-2" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                  <div style={{ color: '#64748b' }}>Distancia</div>
                  <div style={{ fontWeight: 700, color: '#1a2b6b' }}>{ruta.distanciaKm} km</div>
                </div>
                <div className="rounded p-2" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                  <div style={{ color: '#64748b' }}>Tiempo estimado</div>
                  <div style={{ fontWeight: 700, color: '#1a2b6b' }}>{ruta.tiempoMin ? `~${ruta.tiempoMin} min` : 'N/D'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Lista de opciones */}
          <div className="p-4 overflow-auto" style={{ maxHeight: '70vh' }}>
            <div className="flex items-center justify-between mb-2">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2b6b' }}>
                Paqueterías disponibles ({tarifasTop.length + (mostrarApiLocal ? 2 : 0) + 1})
              </div>
              <div className="text-[10px]" style={{ color: '#64748b' }}>
                Orden: <strong style={{ color: '#1a2b6b' }}>Menor costo</strong>
              </div>
            </div>

            {cargandoRuta && (
              <div style={{ color: '#64748b', fontSize: 13 }}>Esperando ruta para cotizar…</div>
            )}

            <div className="rounded p-2 mb-2" style={{ background: '#eef4fb', color: '#1a2b6b', fontSize: 11, border: '1px solid #cbd5e1' }}>
              <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>info</span>
              {' '}Tarifas del tarifario oficial APYMSA 2026 · sin IVA. Sujetas a actualización por convenio con la paquetería.
            </div>

            {!cargandoRuta && tarifasTop.length === 0 && !mostrarApiLocal && (
              <div className="rounded p-3 mb-2" style={{ background: '#fef3c7', color: '#92400e', fontSize: 13 }}>
                <div className="flex items-center gap-2 mb-1" style={{ fontWeight: 700 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                  Sin paqueterías con tarifa disponible
                </div>
                <ul className="pl-4" style={{ listStyle: 'disc', fontSize: 12 }}>
                  <li>Verifica que el destino ({destino}) tenga cobertura.</li>
                  <li>Puedes seleccionar manualmente cualquier paquetería del catálogo abajo.</li>
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {/* Top 3 tarifas fijas */}
              {tarifasTop.map((cot, i) => {
                const recomendada = i === 0;
                const cara = !!cot.muyCara;
                const key: SeleccionKey = { tipo: 'tarifa', paqueteria: cot.paqueteria };
                const activo = isKeyActiva(key);
                return (
                  <div key={cot.paqueteria} className="rounded-lg p-3" style={cardStyle({ activo, recomendada, cara })}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{cot.paqueteria}</div>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>{cot.tipo}</span>
                          {recomendada && (
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#16a34a', color: 'white', fontWeight: 700 }}>RECOMENDADA</span>
                          )}
                          {cara && (
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#dc2626', color: 'white', fontWeight: 700 }}>MUY CARA</span>
                          )}
                        </div>
                        {cot.advertencia && (
                          <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600, marginTop: 3 }}>
                            <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>warning</span>
                            {' '}{cot.advertencia}
                          </div>
                        )}
                        {cot.tiempoEntregaDias && (
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                            <span className="material-symbols-outlined align-middle" style={{ fontSize: 14 }}>schedule</span>
                            {' '}{cot.tiempoEntregaDias}
                          </div>
                        )}
                        {cot.notas && cot.notas.length > 0 && (
                          <ul style={{ marginTop: 4, fontSize: 11, color: '#64748b', paddingLeft: 16 }}>
                            {cot.notas.map((n, idx) => <li key={idx} style={{ listStyle: 'disc' }}>{n}</li>)}
                          </ul>
                        )}
                        {cot.desglose && cot.desglose.length > 0 && (
                          <details className="mt-1" style={{ fontSize: 11, color: '#475569' }}>
                            <summary style={{ cursor: 'pointer', color: '#1a2b6b', fontWeight: 600 }}>Ver desglose</summary>
                            <table style={{ marginTop: 4, width: '100%' }}>
                              <tbody>
                                {cot.desglose.map((d, idx) => (
                                  <tr key={idx}>
                                    <td>{d.concepto}</td>
                                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${d.monto.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </details>
                        )}
                      </div>
                      <div className="text-right">
                        <div style={{ fontSize: 18, fontWeight: 800, color: cara ? '#b91c1c' : '#1a2b6b' }}>${cot.costo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{cot.moneda} · sin IVA</div>
                        <SelectButton activo={activo} onClick={() => setSeleccion(key)} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Uber y BlueGo (solo si distancia < 18 km, sin costo) */}
              {mostrarApiLocal && (['Uber', 'BlueGo'] as const).map(paq => {
                const key: SeleccionKey = { tipo: 'api', paqueteria: paq };
                const activo = isKeyActiva(key);
                return (
                  <div key={paq} className="rounded-lg p-3" style={cardStyle({ activo })}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{paq}</div>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>{paq}</span>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#0891b2', color: 'white', fontWeight: 700 }}>LOCAL &lt; {KM_LOCAL_UBER_BLUEGO} KM</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                          <span className="material-symbols-outlined align-middle" style={{ fontSize: 14 }}>schedule</span>
                          {' '}{paq === 'Uber' ? '2-4 horas' : '2-6 horas'}
                        </div>
                        <ul style={{ marginTop: 4, fontSize: 11, color: '#64748b', paddingLeft: 16 }}>
                          <li style={{ listStyle: 'disc' }}>Tracking en tiempo real</li>
                          <li style={{ listStyle: 'disc' }}>El costo lo devuelve la API al despachar</li>
                        </ul>
                      </div>
                      <div className="text-right">
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0891b2', maxWidth: 130 }}>Cotización por solicitud</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Se define al despachar</div>
                        <SelectButton activo={activo} onClick={() => setSeleccion(key)} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Seleccionar manualmente */}
              <ManualCard
                activo={seleccion?.tipo === 'manual'}
                expandido={manualExpandido}
                paqueteria={manualPaqueteria}
                motivo={manualMotivo}
                confirmado={manualConfirmado}
                onIniciar={() => {
                  setSeleccion({ tipo: 'manual' });
                  setManualExpandido(true);
                }}
                onCambiarPaq={setManualPaqueteria}
                onCambiarMotivo={setManualMotivo}
                onCancelar={() => {
                  setManualExpandido(false);
                  if (seleccion?.tipo === 'manual') setSeleccion(null);
                }}
                onConfirmar={() => {
                  // Al confirmar simplemente colapsa el sub-form; la key
                  // "manual" ya está en `seleccion` y `manualConfirmado`
                  // ahora es true → habilita "Continuar".
                  setManualExpandido(false);
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}>
          <button onClick={onRegresar} className="px-4 py-2 rounded font-semibold" style={{ background: 'white', color: '#1a2b6b', border: '1px solid #cbd5e1', fontSize: 13 }}>
            <span className="material-symbols-outlined align-middle" style={{ fontSize: 16 }}>arrow_back</span>
            {' '}Regresar
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded font-semibold" style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', fontSize: 13 }}>
              Cancelar
            </button>
            <button
              onClick={handleContinuar}
              disabled={!puedeContinuar}
              className="px-4 py-2 rounded font-bold text-white flex items-center gap-1"
              style={{
                background: puedeContinuar ? '#16a34a' : '#9ca3af',
                fontSize: 13,
                cursor: puedeContinuar ? 'pointer' : 'not-allowed',
              }}
              title={puedeContinuar ? 'Continuar al siguiente paso' : 'Selecciona una paquetería antes de continuar'}
            >
              Continuar
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componentes ──

function SelectButton({ activo, onClick }: { activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 px-3 py-1.5 rounded font-semibold flex items-center gap-1"
      style={{
        background: activo ? '#1a2b6b' : 'white',
        color: activo ? 'white' : '#1a2b6b',
        border: '1px solid #1a2b6b',
        fontSize: 12,
      }}
    >
      {activo && (
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
      )}
      {activo ? 'Seleccionada' : 'Seleccionar'}
    </button>
  );
}

interface ManualCardProps {
  activo: boolean;
  expandido: boolean;
  paqueteria: string;
  motivo: string;
  confirmado: boolean;
  onIniciar: () => void;
  onCambiarPaq: (v: string) => void;
  onCambiarMotivo: (v: string) => void;
  onCancelar: () => void;
  onConfirmar: () => void;
}
function ManualCard({
  activo, expandido, paqueteria, motivo, confirmado,
  onIniciar, onCambiarPaq, onCambiarMotivo, onCancelar, onConfirmar,
}: ManualCardProps) {
  const paqRef = useRef<HTMLSelectElement | null>(null);
  useEffect(() => { if (expandido) paqRef.current?.focus(); }, [expandido]);
  const puedeConfirmar = !!paqueteria && motivo.trim().length > 0;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        border: activo ? '2px solid #1a2b6b' : '1px dashed #94a3b8',
        background: activo ? 'rgba(26,43,107,0.06)' : '#f8fafc',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Seleccionar manualmente</div>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>OTRA PAQUETERÍA</span>
            {confirmado && (
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#1a2b6b', color: 'white', fontWeight: 700 }}>ELEGIDA</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
            Elige una paquetería del catálogo y captura un motivo para dejar registro de la decisión.
          </div>
          {confirmado && !expandido && (
            <div className="mt-2 text-[12px]" style={{ color: '#0f172a' }}>
              <div><strong>Paquetería:</strong> {paqueteria}</div>
              <div style={{ marginTop: 2, color: '#475569' }}><strong>Motivo:</strong> {motivo.trim()}</div>
            </div>
          )}
        </div>
        <div className="text-right" style={{ minWidth: 130 }}>
          {!expandido && !confirmado && (
            <button
              onClick={onIniciar}
              className="mt-1 px-3 py-1.5 rounded font-semibold"
              style={{ background: 'white', color: '#1a2b6b', border: '1px solid #1a2b6b', fontSize: 12 }}
            >
              Seleccionar
            </button>
          )}
          {confirmado && !expandido && (
            <button
              onClick={onIniciar}
              className="mt-1 px-3 py-1.5 rounded font-semibold flex items-center gap-1"
              style={{ background: 'white', color: '#1a2b6b', border: '1px solid #1a2b6b', fontSize: 12 }}
              title="Editar la selección manual"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>edit</span>
              Editar
            </button>
          )}
        </div>
      </div>

      {expandido && (
        <div className="mt-3 flex flex-col gap-2" style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10 }}>
          <div>
            <label className="text-[11px] font-semibold" style={{ color: '#374151' }}>Paquetería</label>
            <select
              ref={paqRef}
              value={paqueteria}
              onChange={e => onCambiarPaq(e.target.value)}
              className="w-full text-xs rounded border px-2 py-1.5 mt-0.5"
              style={{ borderColor: '#cbd5e1' }}
            >
              <option value="">— Selecciona una paquetería —</option>
              {TRASPASO_PAQUETERIAS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold" style={{ color: '#374151' }}>Motivo <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              rows={2}
              value={motivo}
              onChange={e => onCambiarMotivo(e.target.value)}
              placeholder="¿Por qué se elige manualmente esta paquetería?"
              className="w-full text-xs rounded border px-2 py-1.5 mt-0.5"
              style={{ borderColor: motivo.trim() ? '#cbd5e1' : '#fca5a5', resize: 'vertical' }}
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              onClick={onCancelar}
              className="px-3 py-1.5 rounded font-semibold"
              style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', fontSize: 12 }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmar}
              disabled={!puedeConfirmar}
              className="px-3 py-1.5 rounded font-semibold text-white flex items-center gap-1"
              style={{ background: puedeConfirmar ? '#1a2b6b' : '#9ca3af', fontSize: 12, cursor: puedeConfirmar ? 'pointer' : 'not-allowed' }}
              title={puedeConfirmar ? 'Confirmar selección manual' : 'Selecciona paquetería y captura el motivo'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
