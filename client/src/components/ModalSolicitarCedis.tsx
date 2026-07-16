// ============================================================
// APYMSA — ModalSolicitarCedis
// Wizard 3 pasos para solicitar un traspaso de urgencia a CEDIS
// (siempre lleva pedido relacionado; sucursal fija = CEDIS; sin
// restricción de piezas — se puede pedir cualquier producto).
// Design: Enterprise Precision
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { useApp, CrearSolicitudCedisData } from '@/contexts/AppContext';
import { PRODUCT_CATALOG, ORDERS_DB, TraspasoPiezaDetalle } from '@/lib/data';

interface Props {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Step = 1 | 2 | 3;

interface PiezaSeleccionada {
  code: string;
  qty: number;
}

// ── Buscador tipo sugerencias (autocomplete) ──────────────────
interface BuscadorSugerenciasProps<T> {
  placeholder: string;
  options: T[];
  getId: (o: T) => string;
  getLabel: (o: T) => string;
  getSubLabel?: (o: T) => string;
  onSelect: (o: T) => void;
  disabled?: boolean;
}

function BuscadorSugerencias<T>({
  placeholder, options, getId, getLabel, getSubLabel, onSelect, disabled,
}: BuscadorSugerenciasProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = (q
    ? options.filter(o => getLabel(o).toLowerCase().includes(q) || (getSubLabel?.(o) ?? '').toLowerCase().includes(q))
    : options
  ).slice(0, 8);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-2" style={{ fontSize: 15, color: '#9ca3af' }}>search</span>
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={disabled ? 'No hay opciones disponibles' : placeholder}
          className="w-full text-xs rounded border pl-7 pr-3 py-2"
          style={{ borderColor: '#d1d5db', background: disabled ? '#f3f4f6' : '#fff' }}
        />
      </div>
      {open && !disabled && filtered.length > 0 && (
        <div
          className="absolute overflow-y-auto rounded-lg"
          style={{ top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 220, background: '#fff', boxShadow: '0 12px 32px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb', zIndex: 40 }}
        >
          {filtered.map(o => (
            <button
              key={getId(o)}
              onClick={() => { onSelect(o); setQuery(''); setOpen(false); }}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50"
              style={{ borderBottom: '1px solid #f3f4f6' }}
            >
              <span className="font-semibold" style={{ color: '#1a2b6b' }}>{getLabel(o)}</span>
              {getSubLabel && <span className="truncate" style={{ color: '#6b7280' }}>{getSubLabel(o)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ModalSolicitarCedis({ onClose, showToast }: Props) {
  const { crearSolicitudCedisUrgencia } = useApp();
  const [step, setStep] = useState<Step>(1);

  // Paso 1: pedido origen (obligatorio para Urgencia)
  const [pedidoSelected, setPedidoSelected] = useState<string | null>(null);

  // Paso 2: piezas (sin restricción — cualquier producto del catálogo)
  const [piezas, setPiezas] = useState<PiezaSeleccionada[]>([]);

  // Paso 3: observaciones
  const [observaciones, setObservaciones] = useState('');

  const ORDER_IDS = Object.keys(ORDERS_DB);

  // ── Paso 2 ──
  const opcionesPiezas = Object.keys(PRODUCT_CATALOG)
    .filter(code => !piezas.some(p => p.code === code))
    .map(code => PRODUCT_CATALOG[code]);

  const handleAddPieza = (prod: (typeof PRODUCT_CATALOG)[string]) => {
    setPiezas(prev => [...prev, { code: prod.code, qty: 1 }]);
  };

  const handleRemovePieza = (code: string) => {
    setPiezas(prev => prev.filter(p => p.code !== code));
  };

  const handleUpdateQty = (code: string, qty: number) => {
    setPiezas(prev => prev.map(p => p.code === code ? { ...p, qty: Math.max(1, qty) } : p));
  };

  const canGoToStep3 = piezas.length > 0 && piezas.every(p => p.qty > 0);

  // ── Paso 3 ──
  const canConfirmar = !!pedidoSelected && piezas.length > 0;

  const handleConfirmar = () => {
    if (!canConfirmar || !pedidoSelected) return;
    const data: CrearSolicitudCedisData = {
      piezas: piezas.map(p => ({ code: p.code, qtySolicitada: p.qty, qtySurtida: 0 } as TraspasoPiezaDetalle)),
      pedidoOrigen: pedidoSelected,
      observaciones: observaciones.trim() || undefined,
    };
    const solicitudId = crearSolicitudCedisUrgencia(data);
    showToast(`Solicitud de urgencia ${solicitudId} enviada a CEDIS`, 'success');
    onClose();
  };

  const canAdvance =
    step === 1 ? !!pedidoSelected :
    step === 2 ? canGoToStep3 :
    true;

  const stepLabel = ['Pedido origen', 'Piezas', 'Confirmación'];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 680, maxWidth: '96vw', height: '80vh', maxHeight: 800, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>warehouse</span>
          <span className="font-bold text-sm text-white">Solicitar traspaso urgente a CEDIS</span>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-6 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center w-full">
            {stepLabel.map((label, i) => {
              const n = (i + 1) as Step;
              const done = step > n;
              const active = step === n;
              return (
                <div key={label} className="flex items-center flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: done ? '#16a34a' : active ? '#1a2b6b' : '#e5e7eb',
                        color: done || active ? '#fff' : '#9ca3af',
                      }}
                    >
                      {done ? <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>check</span> : n}
                    </div>
                    <span className="text-xs font-medium truncate" style={{ color: active ? '#1a2b6b' : done ? '#16a34a' : '#9ca3af' }}>
                      {label}
                    </span>
                  </div>
                  {i < stepLabel.length - 1 && (
                    <div className="flex-1 h-0.5 mx-3" style={{ background: done ? '#16a34a' : '#e5e7eb', minWidth: 20 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="flex flex-col gap-4">

            {/* Paso 1: Pedido origen (obligatorio) */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿Qué pedido origina esta urgencia?</p>
                <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#dc2626' }}>priority_high</span>
                  <p className="text-xs" style={{ color: '#374151' }}>
                    Las solicitudes a CEDIS se marcan como <strong>Urgencia</strong> y siempre requieren un pedido relacionado.
                  </p>
                </div>

                {pedidoSelected ? (
                  <div className="flex items-center justify-between rounded-lg p-3" style={{ background: 'rgba(26,43,107,0.06)', border: '1.5px solid #1a2b6b' }}>
                    <div>
                      <span className="font-bold text-sm" style={{ color: '#1a2b6b' }}>#{pedidoSelected}</span>
                      <span className="ml-2 text-xs" style={{ color: '#6b7280' }}>{ORDERS_DB[pedidoSelected].cliente}</span>
                    </div>
                    <button
                      onClick={() => setPedidoSelected(null)}
                      className="w-7 h-7 flex items-center justify-center rounded-full"
                      style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                    </button>
                  </div>
                ) : (
                  <BuscadorSugerencias
                    placeholder="Buscar pedido por número o cliente…"
                    options={ORDER_IDS}
                    getId={id => id}
                    getLabel={id => `#${id}`}
                    getSubLabel={id => ORDERS_DB[id].cliente}
                    onSelect={id => setPedidoSelected(id)}
                  />
                )}
              </div>
            )}

            {/* Paso 2: Piezas (sin restricción) */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿Qué piezas necesitas?</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>Busca cualquier pieza del catálogo, sin restricción.</p>

                <BuscadorSugerencias
                  placeholder="Buscar pieza por código o nombre…"
                  options={opcionesPiezas}
                  getId={p => p.code}
                  getLabel={p => p.code}
                  getSubLabel={p => p.name}
                  onSelect={handleAddPieza}
                  disabled={opcionesPiezas.length === 0}
                />

                <div className="flex flex-col gap-2">
                  {piezas.map(p => {
                    const prod = PRODUCT_CATALOG[p.code];
                    return (
                      <div key={p.code} className="flex items-center gap-2 rounded-lg p-2.5" style={{ border: '1px solid #e5e7eb' }}>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs" style={{ color: '#1a2b6b' }}>{p.code}</span>
                          <span className="ml-1.5 text-xs" style={{ color: '#6b7280' }}>{prod?.name}</span>
                        </div>
                        <label className="text-xs whitespace-nowrap" style={{ color: '#6b7280' }}>Cantidad</label>
                        <input
                          type="number"
                          min={1}
                          value={p.qty}
                          onChange={e => handleUpdateQty(p.code, parseInt(e.target.value) || 1)}
                          className="text-xs rounded border px-2 py-1.5 text-center"
                          style={{ borderColor: '#d1d5db', width: 64 }}
                        />
                        <button
                          onClick={() => handleRemovePieza(p.code)}
                          className="w-7 h-7 flex items-center justify-center rounded transition-all"
                          style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                        </button>
                      </div>
                    );
                  })}
                  {piezas.length === 0 && (
                    <p className="text-xs text-center py-6" style={{ color: '#9ca3af' }}>Aún no agregas piezas.</p>
                  )}
                </div>
              </div>
            )}

            {/* Paso 3: Confirmación */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#1a2b6b' }}>Resumen</p>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{piezas.length}</span>
                      <span className="text-xs ml-1" style={{ color: '#6b7280' }}>pieza{piezas.length !== 1 ? 's' : ''} distinta{piezas.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>CEDIS</span>
                      <span className="text-xs ml-1" style={{ color: '#6b7280' }}>origen</span>
                    </div>
                  </div>
                  {pedidoSelected && (
                    <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                      Pedido origen: <strong style={{ color: '#1a2b6b' }}>#{pedidoSelected}</strong> — {ORDERS_DB[pedidoSelected].cliente}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1a2b6b' }}>Piezas solicitadas</p>
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                    {piezas.map(p => (
                      <div
                        key={p.code}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <span style={{ color: '#374151' }}>
                          <strong style={{ color: '#1a2b6b' }}>{p.code}</strong> — {PRODUCT_CATALOG[p.code]?.name}
                        </span>
                        <span className="font-semibold" style={{ color: '#1a2b6b' }}>x{p.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: '#374151' }}>Observaciones (opcional)</label>
                  <textarea
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    placeholder="Notas adicionales para esta solicitud…"
                    rows={3}
                    className="w-full text-xs rounded border px-3 py-2 resize-none"
                    style={{ borderColor: '#d1d5db', fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}
        >
          <button
            onClick={step === 1 ? onClose : () => setStep(prev => (prev - 1) as Step)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
          >
            {step === 1 ? 'Cancelar' : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
                Atrás
              </>
            )}
          </button>

          {step < 3 ? (
            <button
              disabled={!canAdvance}
              onClick={() => setStep(prev => (prev + 1) as Step)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{
                background: canAdvance ? '#1a2b6b' : '#9ca3af',
                cursor: canAdvance ? 'pointer' : 'not-allowed',
              }}
            >
              Siguiente
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleConfirmar}
              disabled={!canConfirmar}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{
                background: canConfirmar ? '#16a34a' : '#9ca3af',
                cursor: canConfirmar ? 'pointer' : 'not-allowed',
                boxShadow: canConfirmar ? '0 2px 8px rgba(22,163,74,0.3)' : 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
              Enviar solicitud
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
