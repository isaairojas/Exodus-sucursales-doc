// ============================================================
// APYMSA — ModalEnviarCedis
// Wizard 3 pasos para ENVIAR mercancía de la sucursal hacia CEDIS
// (devoluciones y garantías). Rompe la unidireccionalidad histórica:
// la sucursal ahora también envía a CEDIS. Origen = sucursal actual, destino = CEDIS.
// Design: Enterprise Precision
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  PRODUCT_CATALOG, EXISTENCIA_POR_SUCURSAL, TraspasoPiezaDetalle,
  MotivoEnvioCedis, MOTIVO_ENVIO_CEDIS_COLORS,
} from '@/lib/data';

interface Props {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Step = 1 | 2 | 3;
interface PiezaSeleccionada { code: string; qty: number; }

const MOTIVOS: { value: MotivoEnvioCedis; icon: string; desc: string }[] = [
  { value: 'Devolución', icon: 'assignment_return', desc: 'Regresas mercancía a CEDIS (exceso de inventario, error de surtido, etc.).' },
  { value: 'Ajuste de inventario', icon: 'inventory', desc: 'Envías mercancía a CEDIS para regularizar diferencias de inventario.' },
];

// ── Buscador tipo sugerencias (autocomplete) ──────────────────
interface BuscadorProps {
  placeholder: string;
  options: { code: string; name: string }[];
  onSelect: (code: string) => void;
  disabled?: boolean;
}
function Buscador({ placeholder, options, onSelect, disabled }: BuscadorProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const q = query.trim().toLowerCase();
  const filtered = (q ? options.filter(o => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q)) : options).slice(0, 8);
  return (
    <div className="relative" ref={ref}>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-2" style={{ fontSize: 15, color: '#9ca3af' }}>search</span>
        <input
          type="text" value={query} disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={disabled ? 'No hay opciones disponibles' : placeholder}
          className="w-full text-xs rounded border pl-7 pr-3 py-2"
          style={{ borderColor: '#d1d5db', background: disabled ? '#f3f4f6' : '#fff' }}
        />
      </div>
      {open && !disabled && filtered.length > 0 && (
        <div className="absolute overflow-y-auto rounded-lg" style={{ top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 220, background: '#fff', boxShadow: '0 12px 32px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb', zIndex: 40 }}>
          {filtered.map(o => (
            <button key={o.code} onClick={() => { onSelect(o.code); setQuery(''); setOpen(false); }}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50"
              style={{ borderBottom: '1px solid #f3f4f6' }}>
              <span className="font-semibold" style={{ color: '#1a2b6b' }}>{o.code}</span>
              <span className="truncate" style={{ color: '#6b7280' }}>{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ModalEnviarCedis({ onClose, showToast }: Props) {
  const { crearEnvioCedis, sucursalActual, traspasos } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [motivo, setMotivo] = useState<MotivoEnvioCedis | null>(null);
  const [piezas, setPiezas] = useState<PiezaSeleccionada[]>([]);
  const [observaciones, setObservaciones] = useState('');

  // Aprobación de token (INVENTARIOS aprueba el envío a CEDIS): idle → aprobando → aprobado.
  const [aprobEstado, setAprobEstado] = useState<'idle' | 'aprobando' | 'aprobado'>('idle');
  const [draftPetId, setDraftPetId] = useState<string | null>(null);
  const [confirmVolver, setConfirmVolver] = useState(false);

  const stock = EXISTENCIA_POR_SUCURSAL[sucursalActual] ?? {};
  const existenciaDe = (code: string) => stock[code] ?? 0;

  const opciones = Object.values(PRODUCT_CATALOG).filter(p => !piezas.some(x => x.code === p.code));

  const handleAdd = (code: string) => setPiezas(prev => [...prev, { code, qty: 1 }]);
  const handleRemove = (code: string) => setPiezas(prev => prev.filter(p => p.code !== code));
  const handleQty = (code: string, qty: number) => setPiezas(prev => prev.map(p => p.code === code ? { ...p, qty: Math.max(1, qty) } : p));

  const canStep2 = !!motivo;
  const canStep3 = piezas.length > 0 && piezas.every(p => p.qty > 0);
  const puedeSolicitarAprobacion = canStep2 && canStep3 && aprobEstado === 'idle';

  const totalPiezas = piezas.reduce((s, p) => s + p.qty, 0);

  // Solicita la aprobación de token a INVENTARIOS: crea el envío en Draft
  // (esDraft=true) y espera a que alguien lo apruebe (simulado con setTimeout
  // en AppContext). El usuario puede cerrar y seguir trabajando.
  const handleSolicitarAprobacion = () => {
    if (!puedeSolicitarAprobacion || !motivo) return;
    const data = {
      piezas: piezas.map(p => ({ code: p.code, qtySolicitada: p.qty, qtySurtida: 0 } as TraspasoPiezaDetalle)),
      motivo,
      observaciones: observaciones.trim() || undefined,
    };
    const petId = crearEnvioCedis(data);
    setDraftPetId(petId);
    setAprobEstado('aprobando');
    showToast('Token enviado a INVENTARIOS para su aprobación. Puedes cerrar esta ventana.', 'info');
  };

  // Observa el draft: cuando esDraft pasa a false, marca "aprobado".
  useEffect(() => {
    if (aprobEstado !== 'aprobando' || !draftPetId) return;
    const pet = traspasos.find(t => t.id === draftPetId);
    if (pet && !pet.esDraft) {
      setAprobEstado('aprobado');
      showToast(`Token aprobado por INVENTARIOS. Envío ${draftPetId} entró como Pendiente.`, 'success');
    }
  }, [traspasos, draftPetId, aprobEstado, showToast]);

  const handleAtras = () => {
    if (step === 3 && aprobEstado !== 'idle') {
      setConfirmVolver(true);
      return;
    }
    setStep(prev => (prev - 1) as Step);
  };
  const confirmarVolverAPiezas = () => {
    setAprobEstado('idle');
    setDraftPetId(null);
    setConfirmVolver(false);
    setStep(2);
  };

  const canAdvance = step === 1 ? canStep2 : step === 2 ? canStep3 : true;
  const stepLabel = ['Motivo', 'Piezas', 'Confirmación'];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white rounded-xl overflow-hidden" style={{ width: 680, maxWidth: '96vw', height: '80vh', maxHeight: 800, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>local_shipping</span>
          <span className="font-bold text-sm text-white">Enviar mercancía a CEDIS</span>
          <span className="ml-2 px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>Desde {sucursalActual}</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center w-full">
            {stepLabel.map((label, i) => {
              const n = (i + 1) as Step;
              const done = step > n; const active = step === n;
              return (
                <div key={label} className="flex items-center flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: done ? '#16a34a' : active ? '#1a2b6b' : '#e5e7eb', color: done || active ? '#fff' : '#9ca3af' }}>
                      {done ? <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>check</span> : n}
                    </div>
                    <span className="text-xs font-medium truncate" style={{ color: active ? '#1a2b6b' : done ? '#16a34a' : '#9ca3af' }}>{label}</span>
                  </div>
                  {i < stepLabel.length - 1 && <div className="flex-1 h-0.5 mx-3" style={{ background: done ? '#16a34a' : '#e5e7eb', minWidth: 20 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="flex flex-col gap-4">

            {/* Paso 1: Motivo */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿Por qué envías mercancía a CEDIS?</p>
                <div className="grid grid-cols-2 gap-3">
                  {MOTIVOS.map(m => {
                    const active = motivo === m.value;
                    const c = MOTIVO_ENVIO_CEDIS_COLORS[m.value];
                    return (
                      <button key={m.value} onClick={() => setMotivo(m.value)}
                        className="flex flex-col items-start gap-2 rounded-lg p-4 text-left transition-all"
                        style={{ border: `1.5px solid ${active ? c.text : '#e5e7eb'}`, background: active ? c.bg : '#fff' }}>
                        <span className="flex items-center gap-2 font-bold text-sm" style={{ color: active ? c.text : '#1a2b6b' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{m.icon}</span>
                          {m.value}
                        </span>
                        <span className="text-xs" style={{ color: '#6b7280' }}>{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paso 2: Piezas */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿Qué piezas envías a CEDIS?</p>
                <p className="text-[11px] flex items-center gap-1" style={{ color: '#9ca3af' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#dc2626' }}>info</span>
                  Se muestra tu existencia en <strong style={{ color: '#6b7280' }}>{sucursalActual}</strong>. No puedes enviar más de lo que tienes; el excedente se marca en <span style={{ color: '#dc2626', fontWeight: 600 }}>rojo</span>.
                </p>

                <Buscador
                  placeholder="Buscar pieza por código o nombre…"
                  options={opciones.map(p => ({ code: p.code, name: p.name }))}
                  onSelect={handleAdd}
                  disabled={opciones.length === 0}
                />

                {piezas.length > 0 && (
                  <div className="flex items-center gap-2 px-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
                    <div className="flex-1">Producto</div>
                    <div style={{ width: 78, textAlign: 'center' }}>Existencia</div>
                    <div style={{ width: 64, textAlign: 'center' }}>A enviar</div>
                    <div style={{ width: 28 }} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {piezas.map(p => {
                    const existencia = existenciaDe(p.code);
                    const excede = p.qty > existencia;
                    const tooltip = excede
                      ? `Solo tienes ${existencia} pzs en existencia (${sucursalActual}); no puedes enviar ${p.qty}.`
                      : `Existencia en ${sucursalActual}: ${existencia} pzs.`;
                    return (
                      <div key={p.code} className="flex items-center gap-2 rounded-lg p-2.5" style={{ border: '1px solid #e5e7eb' }}>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs" style={{ color: '#1a2b6b' }}>{p.code}</span>
                          <span className="ml-1.5 text-xs" style={{ color: '#6b7280' }}>{PRODUCT_CATALOG[p.code]?.name}</span>
                        </div>
                        <div style={{ width: 78, textAlign: 'center' }} title={tooltip}>
                          <span className="text-xs font-semibold" style={{ color: excede ? '#dc2626' : '#16a34a', cursor: 'help' }}>{existencia}</span>
                        </div>
                        <input
                          type="number" min={1} value={p.qty} title={tooltip}
                          onChange={e => handleQty(p.code, parseInt(e.target.value) || 1)}
                          className="text-xs rounded border px-2 py-1.5 text-center font-semibold"
                          style={{ borderColor: excede ? '#dc2626' : '#d1d5db', color: excede ? '#dc2626' : '#111827', background: excede ? 'rgba(220,38,38,0.05)' : '#fff', width: 64 }}
                        />
                        <button onClick={() => handleRemove(p.code)} className="w-7 h-7 flex items-center justify-center rounded transition-all" style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                        </button>
                      </div>
                    );
                  })}
                  {piezas.length === 0 && <p className="text-xs text-center py-6" style={{ color: '#9ca3af' }}>Aún no agregas piezas.</p>}
                </div>
              </div>
            )}

            {/* Paso 3: Confirmación con aprobación de token por INVENTARIOS */}
            {step === 3 && motivo && (
              <div className="flex flex-col gap-5">
                <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#1a2b6b' }}>Resumen</p>
                  <div className="flex gap-6 text-sm items-center flex-wrap">
                    <div>
                      <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{piezas.length}</span>
                      <span className="text-xs ml-1" style={{ color: '#6b7280' }}>producto{piezas.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{totalPiezas}</span>
                      <span className="text-xs ml-1" style={{ color: '#6b7280' }}>pieza{totalPiezas !== 1 ? 's' : ''} en total</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: MOTIVO_ENVIO_CEDIS_COLORS[motivo].bg, color: MOTIVO_ENVIO_CEDIS_COLORS[motivo].text, border: `1px solid ${MOTIVO_ENVIO_CEDIS_COLORS[motivo].border}` }}>{motivo}</span>
                    </div>
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    Origen: <strong style={{ color: '#1a2b6b' }}>{sucursalActual}</strong> → Destino: <strong style={{ color: '#1a2b6b' }}>CEDIS</strong>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1a2b6b' }}>Piezas a enviar</p>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                    {piezas.map(p => (
                      <div key={p.code} className="flex items-center justify-between px-3 py-2 text-xs" style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#374151' }}><strong style={{ color: '#1a2b6b' }}>{p.code}</strong> — {PRODUCT_CATALOG[p.code]?.name}</span>
                        <span className="font-semibold" style={{ color: '#1a2b6b' }}>x{p.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: '#374151' }}>Observaciones (opcional)</label>
                  <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas del envío a CEDIS…" rows={3}
                    className="w-full text-xs rounded border px-3 py-2 resize-none" style={{ borderColor: '#d1d5db', fontFamily: 'Roboto, sans-serif' }} />
                </div>

                {/* Aprobación de token por INVENTARIOS. Todo movimiento hacia CEDIS
                    requiere aprobación: el envío queda en Draft hasta que alguien
                    de inventarios lo apruebe manualmente. */}
                <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}>
                  <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#d97706' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>vpn_key</span>
                    Autorización de INVENTARIOS
                  </p>

                  {aprobEstado === 'idle' && (
                    <>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        Todo envío a CEDIS requiere <strong>aprobación de token</strong> por parte de INVENTARIOS. Al presionar el botón,
                        el envío queda en <strong>Draft</strong> (sin SLA) hasta que alguien lo apruebe. Puedes cerrar la ventana
                        y seguir trabajando; la cancelación se puede hacer desde el detalle de la petición.
                      </p>
                      <button
                        onClick={handleSolicitarAprobacion}
                        disabled={!puedeSolicitarAprobacion}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                        style={{ background: puedeSolicitarAprobacion ? '#d97706' : '#9ca3af', cursor: puedeSolicitarAprobacion ? 'pointer' : 'not-allowed' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>key</span>
                        Solicitar aprobación de token
                      </button>
                    </>
                  )}

                  {aprobEstado === 'aprobando' && (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="animate-spin rounded-full" style={{ width: 36, height: 36, border: '3px solid #fde68a', borderTopColor: '#d97706' }} />
                      <p className="text-xs font-semibold text-center" style={{ color: '#b45309' }}>
                        Esperando aprobación de INVENTARIOS…
                      </p>
                      <p className="text-[11px] text-center" style={{ color: '#6b7280' }}>
                        Envío <strong style={{ color: '#1a2b6b' }}>{draftPetId}</strong> creado en <strong>Draft</strong>.
                        Puedes cerrar esta ventana; el draft queda pendiente de aprobación (los drafts sin aprobar más de 24 h se cancelan solos).
                      </p>
                    </div>
                  )}

                  {aprobEstado === 'aprobado' && (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: 'rgba(22,163,74,0.14)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#16a34a' }}>check</span>
                      </div>
                      <p className="text-xs font-semibold text-center" style={{ color: '#166534' }}>
                        Token aprobado por INVENTARIOS
                      </p>
                      <p className="text-[11px] text-center" style={{ color: '#6b7280' }}>
                        El envío <strong style={{ color: '#1a2b6b' }}>{draftPetId}</strong> pasó a <strong>Pendiente</strong> y ya cuenta para SLA.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <button onClick={step === 1 ? onClose : handleAtras}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>
            {step === 1 ? 'Cancelar' : (<><span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>Atrás</>)}
          </button>
          {step < 3 ? (
            <button disabled={!canAdvance} onClick={() => setStep(prev => (prev + 1) as Step)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: canAdvance ? '#1a2b6b' : '#9ca3af', cursor: canAdvance ? 'pointer' : 'not-allowed' }}>
              Siguiente<span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
            </button>
          ) : aprobEstado === 'aprobado' ? (
            <button onClick={onClose}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: '#16a34a', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
              Listo, cerrar
            </button>
          ) : aprobEstado === 'aprobando' ? (
            <button onClick={onClose}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium border transition-all"
              style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>
              Cerrar y seguir trabajando
            </button>
          ) : (
            <span className="text-[11px]" style={{ color: '#9ca3af' }}>Presiona "Solicitar aprobación de token" para continuar</span>
          )}
        </div>

        {/* Confirmación al regresar de Confirmación → Piezas si hay draft en curso */}
        {confirmVolver && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 380, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex flex-col items-center gap-3 pt-6 px-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(217,119,6,0.14)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#d97706' }}>warning</span>
                </div>
                <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>¿Regresar a Piezas?</div>
              </div>
              <p className="text-xs mt-3 px-6 text-center leading-relaxed" style={{ color: '#555' }}>
                Si modificas el envío tendrás que <strong>volver a solicitar la aprobación del token</strong>.
                El draft <strong>#{draftPetId}</strong> queda en curso y podrás cancelarlo desde el detalle de la petición.
              </p>
              <div className="flex gap-2 px-6 py-5 mt-2">
                <button onClick={() => setConfirmVolver(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                <button onClick={confirmarVolverAPiezas} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#d97706' }}>Sí, regresar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
