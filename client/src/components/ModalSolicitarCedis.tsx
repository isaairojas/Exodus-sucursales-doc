// ============================================================
// APYMSA — ModalSolicitarCedis
// Wizard 3 pasos para solicitar un traspaso de urgencia a CEDIS
// (siempre lleva pedido relacionado; sucursal fija = CEDIS; sin
// restricción de piezas — se puede pedir cualquier producto).
// Design: Enterprise Precision
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, CrearSolicitudCedisData } from '@/contexts/AppContext';
import { PRODUCT_CATALOG, TraspasoPiezaDetalle, EXISTENCIA_POR_SUCURSAL, SUCURSAL_LOCAL } from '@/lib/data';
import { PEDIDOS_URGENCIA_DEMO, getPedidoUrgenciaDemo, horasDesdeCaptura } from '@/lib/traspasoCedisDemo';
import { validarSeleccionPedidoUrgencia, calcularImpactoPeticiones } from '@/lib/traspasoRules';
import { PEDIDO_VIGENCIA_URGENCIA_HORAS } from '@/lib/traspasoConfig';

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
  const { crearSolicitudCedisUrgencia, cancelarPeticiones, traspasos } = useApp();
  const [step, setStep] = useState<Step>(1);

  // Paso 1: pedido origen (obligatorio para Urgencia)
  const [pedidoSelected, setPedidoSelected] = useState<string | null>(null);
  const [bloqueoMsg, setBloqueoMsg] = useState<string | null>(null);

  // Paso 2: piezas (se precargan del pedido; editables)
  const [piezas, setPiezas] = useState<PiezaSeleccionada[]>([]);

  // Paso 3: observaciones
  const [observaciones, setObservaciones] = useState('');

  const pedidoDemo = pedidoSelected ? getPedidoUrgenciaDemo(pedidoSelected) : null;

  // Validación de selección + precarga de productos del pedido (ERB-51530).
  const handleSelectPedido = (id: string) => {
    const pedido = getPedidoUrgenciaDemo(id);
    if (!pedido) return;
    const estadoPedido = pedido.estado === 'entregado' ? 'facturado'
      : pedido.estado === 'cancelado' ? 'cancelado' : 'activo';
    const val = validarSeleccionPedidoUrgencia({
      estado: estadoPedido,
      usadoEnUrgencia: pedido.usadoEnUrgencia,
      horasDesdeCaptura: horasDesdeCaptura(pedido.fechaCaptura),
      vigenciaHoras: PEDIDO_VIGENCIA_URGENCIA_HORAS,
    });
    if (!val.ok) {
      setBloqueoMsg(val.mensaje ?? 'No es posible seleccionar este pedido.');
      setPedidoSelected(null);
      setPiezas([]);
      return;
    }
    setBloqueoMsg(null);
    setPedidoSelected(id);
    // Precarga de los productos del pedido.
    setPiezas(pedido.partidas.map(p => ({ code: p.code, qty: p.qty })));
  };

  // Impacto sobre peticiones auto/semi existentes (eliminación/ajuste).
  const impacto = useMemo(() => {
    if (!pedidoDemo?.pedidoRealVinculado || piezas.length === 0) return null;
    const relacionadas = traspasos.filter(t =>
      t.pedidoOrigen === pedidoDemo.pedidoRealVinculado &&
      (t.flujo === 'Automatico' || t.flujo === 'Semiautomatico'));
    if (relacionadas.length === 0) return null;
    const res = calcularImpactoPeticiones(relacionadas, piezas.map(p => ({ code: p.code, qty: p.qty })));
    if (res.cancelar.length + res.ajustar.length + res.enTransito.length === 0) return null;
    return res;
  }, [pedidoDemo, traspasos, piezas]);

  // ── Paso 2 ──
  // CEDIS: no se puede agregar mercancía fuera del pedido (sin buscador).
  // Cantidad requerida por el pedido para un código.
  const requeridoDe = (code: string): number | null =>
    pedidoDemo?.partidas.find(p => p.code === code)?.qty ?? null;

  const handleRemovePieza = (code: string) => {
    setPiezas(prev => prev.filter(p => p.code !== code));
  };

  // CEDIS permite superar la cantidad del pedido (solo muestra leyenda).
  const handleUpdateQty = (code: string, qty: number) => {
    setPiezas(prev => prev.map(p => p.code === code ? { ...p, qty: Math.max(1, qty) } : p));
  };

  const canGoToStep3 = piezas.length > 0 && piezas.every(p => p.qty > 0);

  // ── Paso 3 ──
  const canConfirmar = !!pedidoSelected && piezas.length > 0;

  const handleConfirmar = () => {
    if (!canConfirmar || !pedidoSelected) return;
    // Eliminación de peticiones sustituidas (no toca las que están en tránsito).
    if (impacto && impacto.cancelar.length > 0) {
      cancelarPeticiones(impacto.cancelar, 'urgencia-cedis');
    }
    const data: CrearSolicitudCedisData = {
      piezas: piezas.map(p => ({ code: p.code, qtySolicitada: p.qty, qtySurtida: 0 } as TraspasoPiezaDetalle)),
      pedidoOrigen: pedidoDemo?.pedidoRealVinculado ?? pedidoSelected,
      observaciones: observaciones.trim() || undefined,
    };
    const solicitudId = crearSolicitudCedisUrgencia(data);
    const extra = impacto && impacto.cancelar.length > 0 ? ` · ${impacto.cancelar.length} petición(es) cancelada(s)` : '';
    showToast(`Solicitud de urgencia ${solicitudId} enviada a CEDIS${extra}`, 'success');
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

                {bloqueoMsg && (
                  <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.35)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#dc2626' }}>block</span>
                    <p className="text-xs font-medium" style={{ color: '#b91c1c' }}>{bloqueoMsg}</p>
                  </div>
                )}

                {pedidoSelected && pedidoDemo ? (
                  <div className="flex items-center justify-between rounded-lg p-3" style={{ background: 'rgba(26,43,107,0.06)', border: '1.5px solid #1a2b6b' }}>
                    <div>
                      <span className="font-bold text-sm" style={{ color: '#1a2b6b' }}>#{pedidoSelected}</span>
                      <span className="ml-2 text-xs" style={{ color: '#6b7280' }}>{pedidoDemo.cliente}</span>
                      <div className="text-[11px] mt-0.5" style={{ color: '#16a34a' }}>Productos precargados del pedido ({pedidoDemo.partidas.length})</div>
                    </div>
                    <button
                      onClick={() => { setPedidoSelected(null); setPiezas([]); }}
                      className="w-7 h-7 flex items-center justify-center rounded-full"
                      style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                    </button>
                  </div>
                ) : (
                  <BuscadorSugerencias
                    placeholder="Buscar pedido por número o cliente…"
                    options={PEDIDOS_URGENCIA_DEMO.map(p => p.id)}
                    getId={id => id}
                    getLabel={id => `#${id}`}
                    getSubLabel={id => {
                      const p = getPedidoUrgenciaDemo(id)!;
                      return `${p.cliente}${p.etiquetaDemo ? ' · ' + p.etiquetaDemo : ''}`;
                    }}
                    onSelect={handleSelectPedido}
                  />
                )}
              </div>
            )}

            {/* Paso 2: Piezas (solo las del pedido — sin buscador) */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>Productos del pedido a solicitar a CEDIS</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Solo puedes solicitar productos del pedido #{pedidoSelected}. Puedes superar la cantidad requerida; se avisará con una leyenda.
                </p>
                <p className="text-[11px] flex items-center gap-1" style={{ color: '#9ca3af' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#dc2626' }}>info</span>
                  Se muestra tu existencia en <strong style={{ color: '#6b7280' }}>{SUCURSAL_LOCAL}</strong>. Si solicitas más de lo que tienes, la cantidad se marca en <span style={{ color: '#dc2626', fontWeight: 600 }}>rojo</span> (traes mercancía de más de CEDIS).
                </p>

                {/* Encabezado de columnas */}
                {piezas.length > 0 && (
                  <div className="flex items-center gap-2 px-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
                    <div className="flex-1">Producto</div>
                    <div style={{ width: 70, textAlign: 'center' }}>Requerido</div>
                    <div style={{ width: 78, textAlign: 'center' }} title={`Existencia disponible en tu sucursal (${SUCURSAL_LOCAL})`}>Existencia</div>
                    <div style={{ width: 64, textAlign: 'center' }}>A solicitar</div>
                    <div style={{ width: 28 }} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {piezas.map(p => {
                    const prod = PRODUCT_CATALOG[p.code];
                    const req = requeridoDe(p.code);
                    const excede = req != null && p.qty > req;
                    const existenciaLocal = EXISTENCIA_POR_SUCURSAL[SUCURSAL_LOCAL]?.[p.code] ?? 0;
                    const solicitaDeMas = p.qty > existenciaLocal;
                    const tooltip = solicitaDeMas
                      ? `Solicitas ${p.qty} pzs y solo tienes ${existenciaLocal} en existencia (${SUCURSAL_LOCAL}). Se traerían ${p.qty - existenciaLocal} pzs de más de CEDIS para completar el pedido.`
                      : `Existencia suficiente en ${SUCURSAL_LOCAL} (${existenciaLocal} pzs).`;
                    return (
                      <div key={p.code} className="rounded-lg p-2.5" style={{ border: `1px solid ${excede ? 'rgba(217,119,6,0.4)' : '#e5e7eb'}` }}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-xs" style={{ color: '#1a2b6b' }}>{p.code}</span>
                            <span className="ml-1.5 text-xs" style={{ color: '#6b7280' }}>{prod?.name}</span>
                          </div>
                          <div style={{ width: 70, textAlign: 'center' }}>
                            <span className="text-xs font-semibold" style={{ color: '#1a2b6b' }}>{req ?? '—'}</span>
                          </div>
                          <div style={{ width: 78, textAlign: 'center' }} title={tooltip}>
                            <span className="text-xs font-semibold" style={{ color: solicitaDeMas ? '#dc2626' : '#16a34a', cursor: 'help' }}>{existenciaLocal}</span>
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={p.qty}
                            title={tooltip}
                            onChange={e => handleUpdateQty(p.code, parseInt(e.target.value) || 1)}
                            className="text-xs rounded border px-2 py-1.5 text-center font-semibold"
                            style={{
                              borderColor: solicitaDeMas ? '#dc2626' : (excede ? '#d97706' : '#d1d5db'),
                              color: solicitaDeMas ? '#dc2626' : '#111827',
                              background: solicitaDeMas ? 'rgba(220,38,38,0.05)' : '#fff',
                              width: 64,
                            }}
                          />
                          <button
                            onClick={() => handleRemovePieza(p.code)}
                            className="w-7 h-7 flex items-center justify-center rounded transition-all"
                            style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                          </button>
                        </div>
                        {excede && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#d97706' }}>info</span>
                            <span className="text-[11px] font-medium" style={{ color: '#b45309' }}>Se superó la cantidad del pedido (requerido: {req}).</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {piezas.length === 0 && (
                    <p className="text-xs text-center py-6" style={{ color: '#9ca3af' }}>Selecciona un pedido para cargar sus productos.</p>
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
                  {pedidoSelected && pedidoDemo && (
                    <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                      Pedido origen: <strong style={{ color: '#1a2b6b' }}>#{pedidoSelected}</strong> — {pedidoDemo.cliente}
                    </div>
                  )}
                </div>

                {/* Impacto: eliminación/ajuste de peticiones existentes (ERB-51530) */}
                {impacto && (
                  <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.3)' }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706' }}>warning</span>
                      <p className="text-xs font-bold" style={{ color: '#b45309' }}>Esta urgencia sustituye mercancía de peticiones existentes</p>
                    </div>
                    <ul className="text-xs flex flex-col gap-1" style={{ color: '#374151' }}>
                      <li>• Se cancelarán <strong>{impacto.cancelar.length}</strong> petición(es): {impacto.cancelar.join(', ') || '—'}</li>
                      <li>• Con ajuste parcial: <strong>{impacto.ajustar.length}</strong> {impacto.ajustar.length ? `(${impacto.ajustar.map(a => a.id).join(', ')})` : ''}</li>
                      <li>• En tránsito que continúan (no se cancelan): <strong>{impacto.enTransito.length}</strong> {impacto.enTransito.length ? `(${impacto.enTransito.join(', ')})` : ''}</li>
                    </ul>
                    <p className="text-[11px]" style={{ color: '#9ca3af' }}>Al confirmar se aplicará este impacto. Cancelar no modifica nada.</p>
                  </div>
                )}

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
