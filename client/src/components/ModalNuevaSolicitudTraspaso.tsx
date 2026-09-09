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
  PRODUCT_CATALOG, ORDERS_DB, TraspasoPiezaDetalle,
  EXISTENCIA_POR_SUCURSAL, calcularSucursalRecomendada, PRODUCTOS_ALTA_ROTACION,
  SUCURSALES_EJERCICIO, totalPartidas,
} from '@/lib/data';
import { esTokenValido, TOKEN_PRUEBA, UMBRAL_AUTO_RECOMENDADOS } from '@/lib/traspasoConfig';

interface Props {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Step = 1 | 2 | 3 | 4;

interface PiezaSeleccionada {
  code: string;
  qty: number;
}

// Opción calculada por el algoritmo SMC 4.0 (el usuario elige una, no elige libremente la sucursal).
interface OpcionSMC {
  id: string;
  titulo: string;
  mejor: boolean;
  nota: string;
  sucursales: string[];
  asignacion: Record<string, Record<string, number>>;
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
  const { crearSolicitudTraspaso, sucursalActual } = useApp();
  const [step, setStep] = useState<Step>(1);

  // Paso 1: pedido origen
  const [pedidoSelected, setPedidoSelected] = useState<string | null>(null);

  // Paso 2: piezas (lista global, todavía sin sucursal asignada)
  const [piezas, setPiezas] = useState<PiezaSeleccionada[]>([]);

  // Paso 3: opciones que calcula el algoritmo SMC 4.0 (el usuario elige una)
  const [sucursalesAgregadas, setSucursalesAgregadas] = useState<string[]>([]);
  const [asignaciones, setAsignaciones] = useState<Record<string, Record<string, number>>>({});
  const [calculandoSMC, setCalculandoSMC] = useState(false);
  const [opcionesSMC, setOpcionesSMC] = useState<OpcionSMC[]>([]);
  const [opcionElegida, setOpcionElegida] = useState<string | null>(null);

  // Paso 4: observaciones + autorización
  const [observaciones, setObservaciones] = useState('');
  const [autorizacionToken, setAutorizacionToken] = useState('');

  const ORDER_IDS = Object.keys(ORDERS_DB);

  // Cantidad requerida por el pedido para un código (null si el producto no
  // pertenece al pedido — p. ej. un recomendado de alta rotación).
  const requeridoDe = (code: string): number | null => {
    if (!pedidoSelected) return null;
    return ORDERS_DB[pedidoSelected].partidas.find(p => p.code === code)?.qty ?? null;
  };

  // ── Paso 1 ──
  const handleSelectPedido = (id: string) => {
    setPedidoSelected(id);
    const partidas = ORDERS_DB[id].partidas;
    // Precarga los productos del pedido con su cantidad requerida.
    let nuevas = partidas.map(p => ({ code: p.code, qty: p.qty }));
    // Piezas recomendadas (alta rotación): si el total del pedido NO supera el
    // umbral, se agregan automáticamente, sin que el usuario las elija.
    if (totalPartidas(partidas) <= UMBRAL_AUTO_RECOMENDADOS) {
      const recomendados = PRODUCTOS_ALTA_ROTACION
        .filter(code => !nuevas.some(x => x.code === code) && PRODUCT_CATALOG[code]);
      nuevas = [...nuevas, ...recomendados.map(code => ({ code, qty: 1 }))];
    }
    setPiezas(nuevas);
    setSucursalesAgregadas([]);
    setAsignaciones({});
  };

  const handleClearPedido = () => {
    setPedidoSelected(null);
    setPiezas([]);
    setSucursalesAgregadas([]);
    setAsignaciones({});
  };

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
    // Para traspasos entre sucursales, la cantidad NO puede superar lo requerido
    // por el pedido (tope duro). Los recomendados/extra no tienen tope.
    const req = requeridoDe(code);
    let next = Math.max(1, qty);
    if (req != null && next > req) {
      next = req;
      showToast(`No puedes superar lo requerido por el pedido (${req}) para ${code}`, 'warning');
    }
    setPiezas(prev => prev.map(p => p.code === code ? { ...p, qty: next } : p));
  };

  // Total del pedido (precio × cantidad) y bandera de auto-agregado de recomendados.
  const pedidoTotal = pedidoSelected ? totalPartidas(ORDERS_DB[pedidoSelected].partidas) : 0;
  const autoRecomendados = !!pedidoSelected && pedidoTotal <= UMBRAL_AUTO_RECOMENDADOS;

  // Recomendados de alta rotación que aún no están en la lista.
  const recomendadosAltaRotacion = PRODUCTOS_ALTA_ROTACION
    .filter(code => !piezas.some(p => p.code === code) && PRODUCT_CATALOG[code]);

  const handleAddRecomendado = (code: string) => {
    setPiezas(prev => [...prev, { code, qty: 1 }]);
  };

  const canGoToStep3 = piezas.length > 0 && piezas.every(p => p.qty > 0);

  // ── Paso 3: opciones SMC 4.0 ──
  // El usuario NO elige libremente la sucursal: el algoritmo propone 3 opciones y
  // el usuario selecciona una. La "mejor opción" es una sola sucursal: la
  // contraparte del ejercicio (Tesistán si opero en Federalismo, y viceversa).
  const calcularOpcionesSMC = (): OpcionSMC[] => {
    const req = piezas.filter(p => p.qty > 0);
    const asignUnica = (suc: string): Record<string, Record<string, number>> => ({
      [suc]: Object.fromEntries(req.map(p => [p.code, p.qty])),
    });
    const mejorSuc = sucursalActual === SUCURSALES_EJERCICIO[1] ? SUCURSALES_EJERCICIO[0] : SUCURSALES_EJERCICIO[1];
    const rec2 = calcularSucursalRecomendada(req.map(p => ({ code: p.code, qty: p.qty })), [mejorSuc, sucursalActual]);
    const altSuc = rec2?.sucursal ?? 'Adolf Horn';
    // Reparto entre 2 sucursales (mitad y mitad por pieza).
    const asignSplit: Record<string, Record<string, number>> = { [mejorSuc]: {}, [altSuc]: {} };
    req.forEach(p => {
      const mitad = Math.ceil(p.qty / 2);
      if (mitad > 0) asignSplit[mejorSuc][p.code] = mitad;
      if (p.qty - mitad > 0) asignSplit[altSuc][p.code] = p.qty - mitad;
    });
    return [
      { id: 'mejor', titulo: 'Tu mejor opción', mejor: true, sucursales: [mejorSuc], asignacion: asignUnica(mejorSuc),
        nota: `Una sola sucursal (${mejorSuc}) cubre todo lo solicitado con la mejor cercanía y existencia.` },
      { id: 'alt', titulo: 'Alternativa', mejor: false, sucursales: [altSuc], asignacion: asignUnica(altSuc),
        nota: `Otra sucursal (${altSuc}) también puede surtir el total.` },
      { id: 'split', titulo: 'Reparto entre 2 sucursales', mejor: false, sucursales: [mejorSuc, altSuc], asignacion: asignSplit,
        nota: `Divide el surtido entre ${mejorSuc} y ${altSuc}.` },
    ];
  };

  // Al entrar al paso 3: animación de cálculo SMC y luego se muestran las opciones.
  const irAPasoSucursales = () => {
    setStep(3);
    setOpcionElegida(null);
    setSucursalesAgregadas([]);
    setAsignaciones({});
    setOpcionesSMC([]);
    setCalculandoSMC(true);
    window.setTimeout(() => {
      setOpcionesSMC(calcularOpcionesSMC());
      setCalculandoSMC(false);
    }, 1700);
  };

  const elegirOpcionSMC = (op: OpcionSMC) => {
    setOpcionElegida(op.id);
    setSucursalesAgregadas(op.sucursales);
    setAsignaciones(op.asignacion);
  };

  const canGoToStep4 = !!opcionElegida && sucursalesAgregadas.some(suc =>
    Object.values(asignaciones[suc] ?? {}).some(qty => qty > 0)
  );

  // ── Paso 4 ──
  const requiereAutorizacion = !pedidoSelected;
  const canConfirmar = !requiereAutorizacion || esTokenValido(autorizacionToken);

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
      // Convención de IDs: pedidos de clientes con prefijo P + 7 dígitos.
      pedidoOrigen: pedidoSelected ? `P${pedidoSelected.replace(/\D/g, '').padStart(7, '0')}` : '',
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
                      onClick={handleClearPedido}
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
                    onSelect={handleSelectPedido}
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
                    ? `Productos precargados del pedido #${pedidoSelected}. La cantidad no puede superar lo requerido.`
                    : 'Busca cualquier pieza del catálogo.'}
                </p>
                <p className="text-[11px] flex items-center gap-1" style={{ color: '#9ca3af' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#dc2626' }}>info</span>
                  Se muestra tu existencia en <strong style={{ color: '#6b7280' }}>{sucursalActual}</strong>. Si solicitas más de lo que tienes, la cantidad se marca en <span style={{ color: '#dc2626', fontWeight: 600 }}>rojo</span> (traes mercancía de más por traspaso).
                </p>

                {!pedidoSelected && (
                  <BuscadorSugerencias
                    placeholder="Buscar pieza por código o nombre…"
                    options={opcionesPiezas}
                    getId={p => p.code}
                    getLabel={p => p.code}
                    getSubLabel={p => p.name}
                    onSelect={handleAddPieza}
                    disabled={opcionesPiezas.length === 0}
                  />
                )}

                {/* Recomendados: auto-agregados si el pedido ≤ umbral; manuales si lo supera. */}
                {autoRecomendados ? (
                  <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.25)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#0d9488' }}>auto_awesome</span>
                    <p className="text-xs" style={{ color: '#0f766e' }}>
                      Las <strong>piezas recomendadas</strong> (alta rotación) se agregaron <strong>automáticamente</strong> porque
                      el pedido no supera <strong>${UMBRAL_AUTO_RECOMENDADOS.toLocaleString('es-MX')}</strong> (total ${pedidoTotal.toLocaleString('es-MX')}).
                    </p>
                  </div>
                ) : recomendadosAltaRotacion.length > 0 && (
                  <div className="rounded-lg p-3" style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.25)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#0d9488' }}>trending_up</span>
                      <span className="text-xs font-bold" style={{ color: '#0f766e' }}>Recomendados (más vendidos / alta rotación)</span>
                      {pedidoSelected && <span className="text-[10px]" style={{ color: '#9ca3af' }}>· pedido supera ${UMBRAL_AUTO_RECOMENDADOS.toLocaleString('es-MX')}: agrégalos manualmente</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recomendadosAltaRotacion.map(code => (
                        <button key={code} onClick={() => handleAddRecomendado(code)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: '#fff', border: '1px solid rgba(13,148,136,0.4)', color: '#0f766e' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span>
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Encabezado de columnas */}
                {piezas.length > 0 && (
                  <div className="flex items-center gap-2 px-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
                    <div className="flex-1">Producto</div>
                    <div style={{ width: 70, textAlign: 'center' }}>Requerido</div>
                    <div style={{ width: 78, textAlign: 'center' }} title={`Existencia disponible en tu sucursal (${sucursalActual})`}>Existencia</div>
                    <div style={{ width: 64, textAlign: 'center' }}>A solicitar</div>
                    <div style={{ width: 28 }} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {piezas.map(p => {
                    const prod = PRODUCT_CATALOG[p.code];
                    const req = requeridoDe(p.code);
                    const existenciaLocal = EXISTENCIA_POR_SUCURSAL[sucursalActual]?.[p.code] ?? 0;
                    // Solicitar más de lo que hay en la sucursal local es lo normal
                    // (por eso se pide traspaso), pero se marca en rojo con tooltip.
                    const solicitaDeMas = p.qty > existenciaLocal;
                    const tooltip = solicitaDeMas
                      ? `Solicitas ${p.qty} pzs y solo tienes ${existenciaLocal} en existencia (${sucursalActual}). Se traerían ${p.qty - existenciaLocal} pzs de más por traspaso para completar el pedido.`
                      : `Existencia suficiente en ${sucursalActual} (${existenciaLocal} pzs).`;
                    return (
                      <div key={p.code} className="flex items-center gap-2 rounded-lg p-2.5" style={{ border: '1px solid #e5e7eb' }}>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-xs" style={{ color: '#1a2b6b' }}>{p.code}</span>
                          <span className="ml-1.5 text-xs" style={{ color: '#6b7280' }}>{prod?.name}</span>
                          {req == null && pedidoSelected && (
                            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>Recomendado</span>
                          )}
                        </div>
                        <div style={{ width: 70, textAlign: 'center' }}>
                          <span className="text-xs font-semibold" style={{ color: req != null ? '#1a2b6b' : '#9ca3af' }}>{req != null ? req : '—'}</span>
                        </div>
                        <div style={{ width: 78, textAlign: 'center' }} title={tooltip}>
                          <span className="text-xs font-semibold" style={{ color: solicitaDeMas ? '#dc2626' : '#16a34a', cursor: 'help' }}>{existenciaLocal}</span>
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={req ?? undefined}
                          value={p.qty}
                          title={tooltip}
                          onChange={e => handleUpdateQty(p.code, parseInt(e.target.value) || 1)}
                          className="text-xs rounded border px-2 py-1.5 text-center font-semibold"
                          style={{
                            borderColor: solicitaDeMas ? '#dc2626' : (req != null && p.qty >= req ? '#0d9488' : '#d1d5db'),
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
                    );
                  })}
                  {piezas.length === 0 && (
                    <p className="text-xs text-center py-6" style={{ color: '#9ca3af' }}>Aún no agregas piezas.</p>
                  )}
                </div>
              </div>
            )}

            {/* Paso 3: Selección de sucursales por SMC 4.0 (opciones, no libre) */}
            {step === 3 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>El algoritmo SMC 4.0 selecciona las sucursales</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  No eliges la sucursal manualmente: elige una de las opciones que calculó <strong>SMC 4.0</strong> según cercanía, existencia y cobertura.
                </p>

                {calculandoSMC ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <div className="animate-spin rounded-full" style={{ width: 54, height: 54, border: '4px solid #e5e7eb', borderTopColor: '#1a2b6b' }} />
                    <p className="text-sm font-bold" style={{ color: '#1a2b6b' }}>SMC 4.0 está calculando las sucursales…</p>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>Analizando cercanía, existencia y cobertura</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {opcionesSMC.map(op => {
                      const elegida = opcionElegida === op.id;
                      return (
                        <button
                          key={op.id}
                          onClick={() => elegirOpcionSMC(op)}
                          className="text-left rounded-xl p-3 transition-all"
                          style={{
                            border: `2px solid ${elegida ? '#1a2b6b' : op.mejor ? 'rgba(22,163,74,0.55)' : '#e5e7eb'}`,
                            background: elegida ? 'rgba(26,43,107,0.05)' : op.mejor ? 'rgba(22,163,74,0.04)' : '#fff',
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 font-bold text-sm" style={{ color: '#1a2b6b' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18, color: op.mejor ? '#16a34a' : '#6b7280' }}>{op.mejor ? 'star' : 'alt_route'}</span>
                              {op.titulo}
                              {op.mejor && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>Recomendada</span>}
                            </span>
                            {elegida && <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#1a2b6b' }}>check_circle</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {op.sucursales.map(s => (
                              <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>location_on</span>{s}
                              </span>
                            ))}
                          </div>
                          <p className="text-[11px] mt-2" style={{ color: '#6b7280' }}>{op.nota}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
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
                      Como es un traspaso manual <strong>sin pedido de cliente</strong>, requiere autorización con token/PIN.
                      Para las pruebas el token es <strong style={{ color: '#d97706' }}>{TOKEN_PRUEBA}</strong>.
                    </p>
                    <input
                      type="text"
                      value={autorizacionToken}
                      onChange={e => setAutorizacionToken(e.target.value)}
                      placeholder={`Ingresa el token/PIN (${TOKEN_PRUEBA})`}
                      className="text-xs rounded border px-3 py-2"
                      style={{ borderColor: esTokenValido(autorizacionToken) ? '#16a34a' : '#d97706', fontFamily: 'Roboto, sans-serif' }}
                    />
                    {autorizacionToken.trim() !== '' && !esTokenValido(autorizacionToken) && (
                      <span className="text-[11px]" style={{ color: '#dc2626' }}>Token incorrecto (usa {TOKEN_PRUEBA}).</span>
                    )}
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
                disabled={!canAdvance || calculandoSMC}
                onClick={() => { if (step === 2) irAPasoSucursales(); else setStep(prev => (prev + 1) as Step); }}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{
                  background: (canAdvance && !calculandoSMC) ? '#1a2b6b' : '#9ca3af',
                  cursor: (canAdvance && !calculandoSMC) ? 'pointer' : 'not-allowed',
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
