// ============================================================
// APYMSA — ModalNuevaSolicitudTraspaso
// Wizard 4 pasos (modal) para crear una solicitud de traspaso (Entrante):
// 1) Pedido origen (opcional, con omitir)
// 2) Piezas a solicitar (acotadas al pedido si aplica)
// 3) Sucursales de origen (con existencias y recomendación SMC)
// 4) Confirmación (token si se omitió el pedido)
// Design: Enterprise Precision
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, CrearSolicitudData } from '@/contexts/AppContext';
import {
  SUCURSALES, PRODUCT_CATALOG, ORDERS_DB, TraspasoPiezaDetalle,
  EXISTENCIA_POR_SUCURSAL, calcularSucursalRecomendada,
} from '@/lib/data';

interface Props {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Step = 1 | 2 | 3 | 4;

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

export default function ModalNuevaSolicitudTraspaso({ onClose, showToast }: Props) {
  const { crearSolicitudTraspaso } = useApp();
  const [step, setStep] = useState<Step>(1);

  // Paso 1: pedido origen
  const [pedidoSelected, setPedidoSelected] = useState<string | null>(null);

  // Paso 2: piezas (lista global, todavía sin sucursal asignada)
  const [piezas, setPiezas] = useState<PiezaSeleccionada[]>([]);

  // Paso 3: sucursales agregadas + cantidad asignada por sucursal y pieza
  const [sucursalesAgregadas, setSucursalesAgregadas] = useState<string[]>([]);
  const [asignaciones, setAsignaciones] = useState<Record<string, Record<string, number>>>({});

  // Paso 4: observaciones + autorización
  const [observaciones, setObservaciones] = useState('');
  const [autorizacionToken, setAutorizacionToken] = useState('');

  const ORDER_IDS = Object.keys(ORDERS_DB);

  // ── Paso 1 ──
  const handleOmitirPedido = () => {
    setPedidoSelected(null);
    setStep(2);
  };

  // ── Paso 2 ──
  const productCodesDisponibles = pedidoSelected
    ? ORDERS_DB[pedidoSelected].partidas.map(p => p.code)
    : Object.keys(PRODUCT_CATALOG);

  const opcionesPiezas = productCodesDisponibles
    .filter(code => !piezas.some(p => p.code === code))
    .map(code => PRODUCT_CATALOG[code])
    .filter(Boolean);

  const handleAddPieza = (prod: (typeof PRODUCT_CATALOG)[string]) => {
    const defaultQty = pedidoSelected
      ? ORDERS_DB[pedidoSelected].partidas.find(p => p.code === prod.code)?.qty ?? 1
      : 1;
    setPiezas(prev => [...prev, { code: prod.code, qty: defaultQty }]);
  };

  const handleRemovePieza = (code: string) => {
    setPiezas(prev => prev.filter(p => p.code !== code));
    setAsignaciones(prev => {
      const next: Record<string, Record<string, number>> = {};
      for (const suc of Object.keys(prev)) {
        const { [code]: _omit, ...rest } = prev[suc];
        next[suc] = rest;
      }
      return next;
    });
  };

  const handleUpdateQty = (code: string, qty: number) => {
    setPiezas(prev => prev.map(p => p.code === code ? { ...p, qty: Math.max(1, qty) } : p));
  };

  const canGoToStep3 = piezas.length > 0 && piezas.every(p => p.qty > 0);

  // ── Paso 3 ──
  const restantePorAsignar = (code: string) => {
    const total = piezas.find(p => p.code === code)?.qty ?? 0;
    const asignado = sucursalesAgregadas.reduce((sum, suc) => sum + (asignaciones[suc]?.[code] ?? 0), 0);
    return Math.max(0, total - asignado);
  };

  const opcionesSucursales = SUCURSALES.filter(s => !sucursalesAgregadas.includes(s));

  const recomendacion = useMemo(
    () => calcularSucursalRecomendada(piezas, sucursalesAgregadas),
    [piezas, sucursalesAgregadas]
  );

  const handleAddSucursal = (suc: string) => {
    const inicial: Record<string, number> = {};
    piezas.forEach(p => {
      const restante = restantePorAsignar(p.code);
      if (restante > 0) inicial[p.code] = restante;
    });
    setSucursalesAgregadas(prev => [...prev, suc]);
    setAsignaciones(prev => ({ ...prev, [suc]: inicial }));
  };

  const handleRemoveSucursal = (suc: string) => {
    setSucursalesAgregadas(prev => prev.filter(s => s !== suc));
    setAsignaciones(prev => {
      const { [suc]: _omit, ...rest } = prev;
      return rest;
    });
  };

  const handleUpdateAsignacion = (suc: string, code: string, qty: number) => {
    setAsignaciones(prev => ({
      ...prev,
      [suc]: { ...prev[suc], [code]: Math.max(0, qty) },
    }));
  };

  const canGoToStep4 = sucursalesAgregadas.some(suc =>
    Object.values(asignaciones[suc] ?? {}).some(qty => qty > 0)
  );

  // ── Paso 4 ──
  const requiereAutorizacion = !pedidoSelected;
  const canConfirmar = !requiereAutorizacion || autorizacionToken.trim() !== '';

  const sucursalesConPiezas = sucursalesAgregadas.filter(suc =>
    Object.values(asignaciones[suc] ?? {}).some(qty => qty > 0)
  );

  const handleConfirmar = () => {
    if (!canConfirmar) return;
    const piezasPorSucursal: Record<string, TraspasoPiezaDetalle[]> = {};
    sucursalesConPiezas.forEach(suc => {
      piezasPorSucursal[suc] = Object.entries(asignaciones[suc] ?? {})
        .filter(([, qty]) => qty > 0)
        .map(([code, qty]) => ({ code, qtySolicitada: qty, qtySurtida: 0 }));
    });

    const data: CrearSolicitudData = {
      sucursales: sucursalesConPiezas,
      piezasPorSucursal,
      pedidoOrigen: pedidoSelected ?? '',
      observaciones: observaciones.trim() || undefined,
      autorizacionToken: requiereAutorizacion ? autorizacionToken.trim() : undefined,
    };
    const solicitudId = crearSolicitudTraspaso(data);
    showToast(
      `Solicitud ${solicitudId} creada con ${sucursalesConPiezas.length} petición${sucursalesConPiezas.length !== 1 ? 'es' : ''}`,
      'success'
    );
    onClose();
  };

  const canAdvance =
    step === 1 ? !!pedidoSelected :
    step === 2 ? canGoToStep3 :
    step === 3 ? canGoToStep4 :
    true;

  const stepLabel = ['Pedido origen', 'Piezas', 'Sucursales', 'Confirmación'];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 760, maxWidth: '96vw', height: '88vh', maxHeight: 900, boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>add_circle</span>
          <span className="font-bold text-sm text-white">Nueva solicitud de traspaso</span>
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

            {/* Paso 1: Pedido origen */}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿Qué pedido originó esta necesidad?</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Busca y selecciona el pedido relacionado. Es opcional: si lo omites, se te pedirá un token de autorización al final.
                </p>

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

            {/* Paso 2: Piezas */}
            {step === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿Qué piezas necesitas?</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {pedidoSelected
                    ? `Solo se muestran las piezas incluidas en el pedido #${pedidoSelected}.`
                    : 'Busca cualquier pieza del catálogo.'}
                </p>

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

            {/* Paso 3: Sucursales de origen */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿De qué sucursal solicitarás la mercancía?</p>

                <BuscadorSugerencias
                  placeholder="Buscar sucursal…"
                  options={opcionesSucursales}
                  getId={s => s}
                  getLabel={s => s}
                  onSelect={handleAddSucursal}
                  disabled={opcionesSucursales.length === 0}
                />

                {recomendacion && !sucursalesAgregadas.includes(recomendacion.sucursal) && (
                  <div className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.25)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18, color: '#2563eb' }}>bolt</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color: '#1a2b6b' }}>
                          Sucursal recomendada (SMC): {recomendacion.sucursal}
                        </p>
                        <p className="text-[11px]" style={{ color: '#6b7280' }}>
                          {recomendacion.suficiente
                            ? 'Es la sucursal más cercana con existencia suficiente.'
                            : 'Es la sucursal más cercana disponible, aunque no cubre toda la existencia solicitada.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddSucursal(recomendacion.sucursal)}
                      className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded transition-all"
                      style={{ background: '#1a2b6b', color: '#fff' }}
                    >
                      Agregar
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {sucursalesAgregadas.map(suc => {
                    const stock = EXISTENCIA_POR_SUCURSAL[suc] ?? {};
                    const hasWarning = piezas.some(p => (stock[p.code] ?? 0) < (asignaciones[suc]?.[p.code] ?? 0));
                    return (
                      <div key={suc} className="rounded-lg overflow-hidden" style={{ border: `1.5px solid ${hasWarning ? '#f59e0b' : '#e5e7eb'}` }}>
                        <div className="flex items-center justify-between px-3 py-2" style={{ background: '#f8f9fb' }}>
                          <span className="flex items-center gap-1.5 font-semibold text-sm" style={{ color: '#1a2b6b' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                            {suc}
                          </span>
                          <div className="flex items-center gap-2">
                            {hasWarning && (
                              <span
                                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={{ background: 'rgba(217,119,6,0.12)', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
                                Falta de existencia
                              </span>
                            )}
                            <button
                              onClick={() => handleRemoveSucursal(suc)}
                              className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0"
                              style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 p-3">
                          {piezas.map(p => {
                            const existencia = stock[p.code] ?? 0;
                            const asignado = asignaciones[suc]?.[p.code] ?? 0;
                            const corto = existencia < asignado;
                            return (
                              <div key={p.code} className="flex items-center gap-2 text-xs">
                                <span className="flex-1 min-w-0 truncate" style={{ color: '#374151' }}>
                                  {p.code} — {PRODUCT_CATALOG[p.code]?.name}
                                </span>
                                <span className="whitespace-nowrap" style={{ color: corto ? '#dc2626' : '#6b7280', fontWeight: corto ? 700 : 400 }}>
                                  Existencia {existencia}
                                </span>
                                <label className="whitespace-nowrap" style={{ color: '#6b7280' }}>Solicitado</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={asignado}
                                  onChange={e => handleUpdateAsignacion(suc, p.code, parseInt(e.target.value) || 0)}
                                  className="rounded border px-2 py-1 text-center"
                                  style={{ borderColor: '#d1d5db', width: 56 }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {sucursalesAgregadas.length === 0 && (
                    <p className="text-xs text-center py-6" style={{ color: '#9ca3af' }}>Aún no agregas sucursales.</p>
                  )}
                </div>
              </div>
            )}

            {/* Paso 4: Confirmación */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                {requiereAutorizacion && (
                  <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}>
                    <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#d97706' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>vpn_key</span>
                      Autorización requerida
                    </p>
                    <p className="text-xs" style={{ color: '#6b7280' }}>
                      Como se omitió el pedido origen, esta solicitud requiere autorización con token/PIN.
                    </p>
                    <input
                      type="text"
                      value={autorizacionToken}
                      onChange={e => setAutorizacionToken(e.target.value)}
                      placeholder="Ingresa el token/PIN de autorización"
                      className="text-xs rounded border px-3 py-2"
                      style={{ borderColor: '#d97706', fontFamily: 'Roboto, sans-serif' }}
                    />
                  </div>
                )}

                <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#1a2b6b' }}>Resumen</p>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{sucursalesConPiezas.length}</span>
                      <span className="text-xs ml-1" style={{ color: '#6b7280' }}>petición{sucursalesConPiezas.length !== 1 ? 'es' : ''}</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{piezas.length}</span>
                      <span className="text-xs ml-1" style={{ color: '#6b7280' }}>pieza{piezas.length !== 1 ? 's' : ''} distinta{piezas.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{pedidoSelected ? 1 : 0}</span>
                      <span className="text-xs ml-1" style={{ color: '#6b7280' }}>pedido vinculado</span>
                    </div>
                  </div>
                  {pedidoSelected && (
                    <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                      Pedido origen: <strong style={{ color: '#1a2b6b' }}>#{pedidoSelected}</strong> — {ORDERS_DB[pedidoSelected].cliente}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#1a2b6b' }}>Desglose por sucursal</p>
                  <div className="flex flex-col gap-3">
                    {sucursalesConPiezas.map(suc => {
                      const totalSuc = Object.values(asignaciones[suc] ?? {}).reduce((s, q) => s + q, 0);
                      return (
                        <div key={suc} className="rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                          <div className="flex items-center justify-between px-3 py-2" style={{ background: '#f8f9fb' }}>
                            <span className="flex items-center gap-1.5 font-semibold text-sm" style={{ color: '#1a2b6b' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                              {suc}
                            </span>
                            <span className="text-xs" style={{ color: '#6b7280' }}>
                              {totalSuc} pieza{totalSuc !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex flex-col" style={{ borderTop: '1px solid #f3f4f6' }}>
                            {Object.entries(asignaciones[suc] ?? {})
                              .filter(([, qty]) => qty > 0)
                              .map(([code, qty]) => (
                                <div
                                  key={code}
                                  className="flex items-center justify-between px-3 py-2 text-xs"
                                  style={{ borderBottom: '1px solid #f3f4f6' }}
                                >
                                  <span style={{ color: '#374151' }}>
                                    <strong style={{ color: '#1a2b6b' }}>{code}</strong> — {PRODUCT_CATALOG[code]?.name}
                                  </span>
                                  <span className="font-semibold" style={{ color: '#1a2b6b' }}>x{qty}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    })}
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

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                onClick={handleOmitirPedido}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
              >
                Omitir
              </button>
            )}

            {step < 4 ? (
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
                Confirmar y enviar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
