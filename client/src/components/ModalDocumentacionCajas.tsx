// ============================================================
// APYMSA — ModalDocumentacionCajas
// Paso 2 del flujo de embarque (ver docs/flujo-embarque-cambios.md §5).
// Permite documentar cajas/tarimas por pedido dentro de un embarque:
//   • Tipo de envío: Caja o Tarima.
//   • Factor volumétrico interno (default 250 kg/m³, no visible al usuario).
//   • Cálculo en vivo de peso volumétrico y peso facturable (interno).
//   • Modo de peso Consolidado / CadaCajaSeparado.
//   • Modo báscula: la lectura se toma con un botón "Guardar peso" (MOCK).
//   • Quick-pick de peso: chips de 1/5/10/20 kg (solo si NO hay báscula).
//   • Agregar cajas con botón "+ Agregar caja", eliminar una a una.
//   • Mínimo 1 caja por pedido (no puede quedarse vacío).
// ============================================================
import { useMemo, useState, useEffect, useRef } from 'react';
import { EmbarqueTraspaso, DocumentacionPorPedido, BoxItem } from '@/lib/data';
import ModalBasculaConfig, { BasculaConfig, cargarBasculaConfig, guardarBasculaConfig } from './ModalBasculaConfig';

interface Props {
  embarque: EmbarqueTraspaso;
  onClose: () => void;
  onContinuar: (doc: DocumentacionPorPedido[]) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const NAVY = '#1a2b6b';
const FACTOR_VOL_DEFAULT = 250;
const QUICK_PESOS = [1, 5, 10, 20];

interface PedidoDraft {
  pedidoId: string;
  tipoEnvio: 'Caja' | 'Tarima';
  cantidadCajas: number;
  factorVolumetrico: number;
  cajas: { peso: number; largo: number; ancho: number; alto: number }[];
  tarimaConocePeso: boolean;
  tarimaPesoTotal: number;
  tarimaCajasSueltas: { peso: number }[];
  tarimaLargo: number;
  tarimaAncho: number;
  tarimaAlto: number;
}

function draftInicial(pedidoId: string): PedidoDraft {
  return {
    pedidoId, tipoEnvio: 'Caja', cantidadCajas: 1, factorVolumetrico: FACTOR_VOL_DEFAULT,
    cajas: [{ peso: 0, largo: 0, ancho: 0, alto: 0 }],
    tarimaConocePeso: true, tarimaPesoTotal: 0, tarimaCajasSueltas: [{ peso: 0 }],
    tarimaLargo: 0, tarimaAncho: 0, tarimaAlto: 0,
  };
}

function calcVolumen(l: number, a: number, h: number) { return l * a * h; }
function calcPesoVolumetrico(l: number, a: number, h: number, factor: number) {
  return (calcVolumen(l, a, h) / 1_000_000) * factor;
}
function calcPesoFacturable(pesoReal: number, pesoVol: number) {
  return Math.max(pesoReal, pesoVol);
}

// Simula una lectura de báscula (mismo patrón que ModalBasculaConfig).
function simularLecturaBascula(cfg?: BasculaConfig): number {
  const lectura = Math.round((Math.random() * 20 + 1) * 100) / 100;
  const tara = cfg?.tara ?? 0;
  return Math.max(0, Math.round((lectura - tara) * 100) / 100);
}

export default function ModalDocumentacionCajas({ embarque, onClose, onContinuar, showToast }: Props) {
  const [drafts, setDrafts] = useState<Record<string, PedidoDraft>>(() => {
    const r: Record<string, PedidoDraft> = {};
    embarque.traspasos.forEach(pid => { r[pid] = draftInicial(pid); });
    return r;
  });
  const [modoPeso, setModoPeso] = useState<'Consolidado' | 'CadaCajaSeparado'>('Consolidado');
  const [basculaOpen, setBasculaOpen] = useState(false);
  const [basculaCfg, setBasculaCfg] = useState<BasculaConfig | undefined>(() => cargarBasculaConfig());
  const [popoverPeso, setPopoverPeso] = useState<{ pid: string; idx: number } | null>(null);
  const [intentoContinuar, setIntentoContinuar] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!popoverPeso) return;
      const target = e.target as HTMLElement;
      if (popoverRef.current && !popoverRef.current.contains(target) && !target.closest('[data-peso-input]')) {
        setPopoverPeso(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [popoverPeso]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (basculaOpen) return;
      if (popoverPeso) { setPopoverPeso(null); return; }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, basculaOpen, popoverPeso]);

  const basculaActiva = !!basculaCfg?.activa;

  const setDraft = (pid: string, patch: Partial<PedidoDraft>) => {
    setDrafts(prev => ({ ...prev, [pid]: { ...prev[pid], ...patch } }));
  };
  const agregarCaja = (pid: string) => {
    setDrafts(prev => {
      const d = prev[pid];
      const cajas = [...d.cajas, { peso: 0, largo: 0, ancho: 0, alto: 0 }];
      return { ...prev, [pid]: { ...d, cajas, cantidadCajas: cajas.length } };
    });
  };
  const eliminarCaja = (pid: string, idx: number) => {
    setDrafts(prev => {
      const d = prev[pid];
      if (d.cajas.length <= 1) return prev; // mínimo 1 caja
      const cajas = d.cajas.filter((_, i) => i !== idx);
      return { ...prev, [pid]: { ...d, cajas, cantidadCajas: cajas.length } };
    });
  };
  const setCajaField = (pid: string, idx: number, field: 'peso' | 'largo' | 'ancho' | 'alto', v: number) => {
    setDrafts(prev => {
      const d = prev[pid];
      const cajas = d.cajas.map((c, i) => i === idx ? { ...c, [field]: Math.max(0, v) } : c);
      return { ...prev, [pid]: { ...d, cajas } };
    });
  };
  const agregarCajaTarima = (pid: string) => {
    setDrafts(prev => {
      const d = prev[pid];
      const c = [...d.tarimaCajasSueltas, { peso: 0 }];
      return { ...prev, [pid]: { ...d, tarimaCajasSueltas: c } };
    });
  };
  const eliminarCajaTarima = (pid: string, idx: number) => {
    setDrafts(prev => {
      const d = prev[pid];
      if (d.tarimaCajasSueltas.length <= 1) return prev;
      const c = d.tarimaCajasSueltas.filter((_, i) => i !== idx);
      return { ...prev, [pid]: { ...d, tarimaCajasSueltas: c } };
    });
  };
  const capturarPesoBascula = (pid: string, idx: number) => {
    const peso = simularLecturaBascula(basculaCfg);
    setCajaField(pid, idx, 'peso', peso);
    showToast(`Peso capturado desde báscula: ${peso.toFixed(2)} kg`, 'success');
  };

  const borderInput = (v: number) => intentoContinuar && !(v > 0) ? '#fca5a5' : '#d1d5db';

  const totalPedidos = embarque.traspasos.length;
  const tienenMultiplesCajas = useMemo(() => {
    return Object.values(drafts).some(d => d.tipoEnvio === 'Caja' ? d.cajas.length > 1 : (d.tarimaCajasSueltas.length > 1));
  }, [drafts]);
  const puedeContinuar = useMemo(() => {
    return embarque.traspasos.every(pid => {
      const d = drafts[pid];
      if (!d) return false;
      if (d.tipoEnvio === 'Caja') {
        if (d.cajas.length < 1) return false;
        return d.cajas.every(c => c.peso > 0 && c.largo > 0 && c.ancho > 0 && c.alto > 0);
      } else {
        if (d.tarimaLargo <= 0 || d.tarimaAncho <= 0 || d.tarimaAlto <= 0) return false;
        if (d.tarimaConocePeso) return d.tarimaPesoTotal > 0;
        return d.tarimaCajasSueltas.length > 0 && d.tarimaCajasSueltas.every(c => c.peso > 0);
      }
    });
  }, [drafts, embarque.traspasos]);

  const handleContinuar = () => {
    if (!puedeContinuar) {
      setIntentoContinuar(true);
      showToast('Completa los pesos y dimensiones de todas las cajas/tarimas antes de continuar.', 'warning');
      return;
    }
    const doc: DocumentacionPorPedido[] = embarque.traspasos.map(pid => {
      const d = drafts[pid];
      if (d.tipoEnvio === 'Caja') {
        const cajas: BoxItem[] = d.cajas.map((c, i) => {
          const volumen = calcVolumen(c.largo, c.ancho, c.alto);
          const pesoVol = calcPesoVolumetrico(c.largo, c.ancho, c.alto, d.factorVolumetrico);
          const pesoFact = calcPesoFacturable(c.peso, pesoVol);
          return {
            id: `C${i + 1}`, pedidoId: pid,
            peso: c.peso, largo: c.largo, ancho: c.ancho, alto: c.alto,
            volumen, pesoVolumetrico: Number(pesoVol.toFixed(2)), pesoFacturable: Number(pesoFact.toFixed(2)),
          };
        });
        return {
          pedidoId: pid, tipoEnvio: 'Caja',
          cantidadCajas: d.cajas.length, factorVolumetrico: d.factorVolumetrico, modoPeso,
          cajas,
        };
      }
      return {
        pedidoId: pid, tipoEnvio: 'Tarima',
        cantidadCajas: 0, factorVolumetrico: d.factorVolumetrico, modoPeso,
        cajas: [],
        tarima: {
          conocePesoTotal: d.tarimaConocePeso,
          pesoTotal: d.tarimaConocePeso ? d.tarimaPesoTotal : d.tarimaCajasSueltas.reduce((s, c) => s + c.peso, 0),
          cajasConteo: d.tarimaConocePeso ? undefined : d.tarimaCajasSueltas,
          largo: d.tarimaLargo, ancho: d.tarimaAncho, alto: d.tarimaAlto,
        },
      };
    });
    onContinuar(doc);
  };

  // Grid unificado: 4 inputs + acciones.
  // Sin báscula:  #  |  Peso  |  Largo  |  Ancho  |  Alto  |  (elim)
  // Con báscula:  #  |  Peso  |  Guardar  |  Largo  |  Ancho  |  Alto  |  (elim)
  const gridCols = basculaActiva
    ? '32px 90px 90px 80px 80px 80px 32px'
    : '32px 90px 80px 80px 80px 32px';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="flex flex-col bg-white overflow-hidden" style={{ width: 720, maxWidth: '96vw', height: '90vh', maxHeight: 820, borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: 'Roboto, sans-serif' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3" style={{ background: NAVY, flexShrink: 0 }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>inventory_2</span>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-white">Documentación de cajas</div>
            <div className="text-[11px] text-white/70">Embarque {embarque.id} · {embarque.traspasos.length} pedido(s)</div>
          </div>
          <button
            onClick={() => setBasculaOpen(true)}
            title="Configurar báscula"
            className="w-7 h-7 rounded-full flex items-center justify-center mr-1"
            style={{ background: basculaActiva ? 'rgba(22,163,74,0.35)' : 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>scale</span>
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {basculaOpen && (
          <ModalBasculaConfig
            valor={basculaCfg}
            onClose={() => setBasculaOpen(false)}
            onGuardar={cfg => {
              guardarBasculaConfig(cfg);
              setBasculaCfg(cfg);
              setBasculaOpen(false);
              showToast(cfg.activa ? 'Báscula habilitada · configuración guardada' : 'Báscula deshabilitada', 'info');
            }}
          />
        )}

        {(totalPedidos > 1 || tienenMultiplesCajas) && (
          <div className="px-5 py-3 flex items-center gap-3" style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
            <span className="text-xs font-bold" style={{ color: NAVY }}>Modo de peso:</span>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="radio" name="modo" checked={modoPeso === 'Consolidado'} onChange={() => setModoPeso('Consolidado')} style={{ accentColor: NAVY }} />
              Consolidado
            </label>
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input type="radio" name="modo" checked={modoPeso === 'CadaCajaSeparado'} onChange={() => setModoPeso('CadaCajaSeparado')} style={{ accentColor: NAVY }} />
              Cada caja por separado
            </label>
          </div>
        )}

        {/* Body — un bloque por pedido */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {embarque.traspasos.map(pid => {
            const d = drafts[pid];
            return (
              <div key={pid} className="rounded-lg" style={{ border: '1px solid #e5e7eb', background: '#fff' }}>
                <div className="px-4 py-2 flex items-center justify-between" style={{ background: '#f6f7fb', borderBottom: '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: NAVY }}>receipt_long</span>
                    <span className="text-xs font-bold" style={{ color: NAVY }}>Pedido {pid}</span>
                    <span className="text-[10px]" style={{ color: '#9ca3af' }}>
                      · {d.tipoEnvio === 'Caja' ? `${d.cajas.length} caja(s)` : (d.tarimaConocePeso ? 'tarima' : `${d.tarimaCajasSueltas.length} caja(s) en tarima`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDraft(pid, { tipoEnvio: 'Caja' })}
                      className="px-2 py-1 rounded text-[11px] font-semibold"
                      style={{
                        background: d.tipoEnvio === 'Caja' ? NAVY : '#fff',
                        color: d.tipoEnvio === 'Caja' ? '#fff' : NAVY,
                        border: '1px solid ' + NAVY,
                      }}
                    >Caja</button>
                    <button
                      onClick={() => setDraft(pid, { tipoEnvio: 'Tarima' })}
                      className="px-2 py-1 rounded text-[11px] font-semibold"
                      style={{
                        background: d.tipoEnvio === 'Tarima' ? NAVY : '#fff',
                        color: d.tipoEnvio === 'Tarima' ? '#fff' : NAVY,
                        border: '1px solid ' + NAVY,
                      }}
                    >Tarima</button>
                  </div>
                </div>

                {d.tipoEnvio === 'Caja' ? (
                  <div className="p-4 flex flex-col gap-3">
                    {basculaActiva && (
                      <div className="text-[10px] px-2 py-1 rounded flex items-center gap-1" style={{ background: 'rgba(22,163,74,0.10)', color: '#166534', border: '1px solid rgba(22,163,74,0.35)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>scale</span>
                        Báscula conectada · el peso se captura con "Guardar"
                      </div>
                    )}

                    <div className="rounded-md" style={{ border: '1px solid #eef0f4' }}>
                      <div
                        className="grid gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: '#f6f7fb', color: '#6b7280', gridTemplateColumns: gridCols }}
                      >
                        <span className="text-center">#</span>
                        <span className="text-center">Peso (kg)</span>
                        {basculaActiva && <span className="text-center">Acción</span>}
                        <span className="text-center">Largo (cm)</span>
                        <span className="text-center">Ancho (cm)</span>
                        <span className="text-center">Alto (cm)</span>
                        <span className="text-center">{/* elim */}</span>
                      </div>
                      {d.cajas.map((c, i) => {
                        const popAbierto = popoverPeso?.pid === pid && popoverPeso.idx === i;
                        const puedeEliminar = d.cajas.length > 1;
                        return (
                          <div
                            key={i}
                            className="grid gap-2 px-3 py-1.5 text-xs items-center"
                            style={{
                              gridTemplateColumns: gridCols,
                              borderTop: i === 0 ? 'none' : '1px solid #f0f0f0',
                            }}
                          >
                            <span className="text-gray-500 text-[11px] font-semibold text-center">C{i + 1}</span>

                            <div className="relative">
                              <input
                                data-peso-input
                                type="number" min={0} step={0.1} value={c.peso || ''}
                                onChange={e => setCajaField(pid, i, 'peso', parseFloat(e.target.value || '0'))}
                                onFocus={() => { if (!basculaActiva) setPopoverPeso({ pid, idx: i }); }}
                                readOnly={basculaActiva}
                                className="text-xs rounded border px-1 py-1 text-center w-full"
                                style={{
                                  borderColor: borderInput(c.peso),
                                  background: basculaActiva ? '#f3f4f6' : '#fff',
                                  cursor: basculaActiva ? 'not-allowed' : 'text',
                                }}
                              />
                              {popAbierto && !basculaActiva && (
                                <div
                                  ref={popoverRef}
                                  className="absolute top-full left-0 mt-1 flex items-center gap-1 p-1.5 rounded shadow-lg z-10"
                                  style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}
                                >
                                  {QUICK_PESOS.map(kg => (
                                    <button
                                      key={kg}
                                      type="button"
                                      onMouseDown={e => {
                                        e.preventDefault();
                                        setCajaField(pid, i, 'peso', kg);
                                        setPopoverPeso(null);
                                      }}
                                      className="px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap"
                                      style={{ background: '#eef2ff', color: NAVY, border: '1px solid #c7d2fe' }}
                                    >
                                      {kg} kg
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {basculaActiva && (
                              <button
                                type="button"
                                onClick={() => capturarPesoBascula(pid, i)}
                                className="text-[10px] font-semibold rounded px-2 py-1 text-white"
                                style={{ background: '#16a34a' }}
                                title="Capturar la lectura actual de la báscula"
                              >
                                <span className="material-symbols-outlined align-middle" style={{ fontSize: 12 }}>scale</span>
                                {' '}Guardar
                              </button>
                            )}

                            {(['largo', 'ancho', 'alto'] as const).map(f => (
                              <input
                                key={f} type="number" min={0} step={0.1} value={c[f] || ''}
                                onChange={e => setCajaField(pid, i, f, parseFloat(e.target.value || '0'))}
                                className="text-xs rounded border px-1 py-1 text-center w-full"
                                style={{ borderColor: borderInput(c[f]) }}
                              />
                            ))}

                            <button
                              type="button"
                              onClick={() => eliminarCaja(pid, i)}
                              disabled={!puedeEliminar}
                              className="w-7 h-7 rounded flex items-center justify-center"
                              style={{
                                background: puedeEliminar ? 'transparent' : 'transparent',
                                color: puedeEliminar ? '#dc2626' : '#d1d5db',
                                cursor: puedeEliminar ? 'pointer' : 'not-allowed',
                              }}
                              title={puedeEliminar ? 'Eliminar esta caja' : 'Debe quedar al menos una caja'}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botón agregar caja debajo de la lista, por pedido */}
                    <button
                      type="button"
                      onClick={() => agregarCaja(pid)}
                      className="flex items-center justify-center gap-1 text-xs font-semibold rounded py-1.5"
                      style={{ background: '#eef2ff', color: NAVY, border: '1px dashed ' + NAVY }}
                      title="Agregar otra caja a este pedido"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                      Agregar caja
                    </button>
                  </div>
                ) : (
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: '#374151' }}>¿Conoces el peso total?</span>
                      <label className="flex items-center gap-1 text-xs cursor-pointer">
                        <input type="radio" checked={d.tarimaConocePeso} onChange={() => setDraft(pid, { tarimaConocePeso: true })} style={{ accentColor: NAVY }} />
                        Sí
                      </label>
                      <label className="flex items-center gap-1 text-xs cursor-pointer">
                        <input type="radio" checked={!d.tarimaConocePeso} onChange={() => setDraft(pid, { tarimaConocePeso: false })} style={{ accentColor: NAVY }} />
                        No
                      </label>
                    </div>
                    {d.tarimaConocePeso ? (
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold" style={{ color: '#374151' }}>Peso total (kg)</label>
                        <input
                          type="number" min={0} step={0.1} value={d.tarimaPesoTotal || ''}
                          onChange={e => setDraft(pid, { tarimaPesoTotal: Math.max(0, parseFloat(e.target.value || '0')) })}
                          className="text-xs rounded border px-2 py-1 w-24 text-center" style={{ borderColor: borderInput(d.tarimaPesoTotal) }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold" style={{ color: '#374151' }}>Cajas dentro de la tarima</span>
                          <span className="text-[11px]" style={{ color: '#6b7280' }}>
                            Suma: <strong style={{ color: NAVY }}>{d.tarimaCajasSueltas.reduce((s, c) => s + c.peso, 0).toFixed(2)} kg</strong>
                          </span>
                        </div>
                        <div className="rounded-md" style={{ border: '1px solid #eef0f4' }}>
                          {d.tarimaCajasSueltas.map((c, i) => (
                            <div
                              key={i}
                              className="grid gap-2 px-3 py-1.5 text-xs items-center"
                              style={{ gridTemplateColumns: '32px 90px 32px', borderTop: i === 0 ? 'none' : '1px solid #f0f0f0' }}
                            >
                              <span className="text-gray-500 text-[11px] font-semibold text-center">C{i + 1}</span>
                              <input
                                type="number" min={0} step={0.1} value={c.peso || ''}
                                placeholder="Peso (kg)"
                                onChange={e => setDrafts(prev => {
                                  const arr = [...prev[pid].tarimaCajasSueltas];
                                  arr[i] = { peso: Math.max(0, parseFloat(e.target.value || '0')) };
                                  return { ...prev, [pid]: { ...prev[pid], tarimaCajasSueltas: arr } };
                                })}
                                className="text-xs rounded border px-1 py-1 text-center"
                                style={{ borderColor: borderInput(c.peso) }}
                              />
                              <button
                                type="button"
                                onClick={() => eliminarCajaTarima(pid, i)}
                                disabled={d.tarimaCajasSueltas.length <= 1}
                                className="w-7 h-7 rounded flex items-center justify-center"
                                style={{
                                  color: d.tarimaCajasSueltas.length > 1 ? '#dc2626' : '#d1d5db',
                                  cursor: d.tarimaCajasSueltas.length > 1 ? 'pointer' : 'not-allowed',
                                }}
                                title={d.tarimaCajasSueltas.length > 1 ? 'Eliminar esta caja' : 'Debe quedar al menos una caja'}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => agregarCajaTarima(pid)}
                          className="flex items-center justify-center gap-1 text-xs font-semibold rounded py-1.5"
                          style={{ background: '#eef2ff', color: NAVY, border: '1px dashed ' + NAVY }}
                          title="Agregar otra caja a esta tarima"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                          Agregar caja
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold" style={{ color: '#374151' }}>Dimensiones tarima (cm)</label>
                      <input type="number" min={0} step={0.1} placeholder="Largo" value={d.tarimaLargo || ''}
                        onChange={e => setDraft(pid, { tarimaLargo: Math.max(0, parseFloat(e.target.value || '0')) })}
                        className="text-xs rounded border px-2 py-1 w-20 text-center" style={{ borderColor: borderInput(d.tarimaLargo) }} />
                      <input type="number" min={0} step={0.1} placeholder="Ancho" value={d.tarimaAncho || ''}
                        onChange={e => setDraft(pid, { tarimaAncho: Math.max(0, parseFloat(e.target.value || '0')) })}
                        className="text-xs rounded border px-2 py-1 w-20 text-center" style={{ borderColor: borderInput(d.tarimaAncho) }} />
                      <input type="number" min={0} step={0.1} placeholder="Alto" value={d.tarimaAlto || ''}
                        onChange={e => setDraft(pid, { tarimaAlto: Math.max(0, parseFloat(e.target.value || '0')) })}
                        className="text-xs rounded border px-2 py-1 w-20 text-center" style={{ borderColor: borderInput(d.tarimaAlto) }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3" style={{ borderTop: '1px solid #eef0f4', flexShrink: 0 }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
          <button
            onClick={handleContinuar}
            disabled={!puedeContinuar}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold text-white"
            style={{ background: puedeContinuar ? NAVY : '#9ca3af', cursor: puedeContinuar ? 'pointer' : 'not-allowed' }}
            title={puedeContinuar ? 'Continuar al cotizador' : 'Completa pesos y dimensiones'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
