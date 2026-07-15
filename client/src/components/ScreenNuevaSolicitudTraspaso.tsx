// ============================================================
// APYMSA — ScreenNuevaSolicitudTraspaso
// Wizard 3 pasos para crear una solicitud de traspaso (Entrante)
// Design: Enterprise Precision
// ============================================================
import { useState } from 'react';
import { useApp, CrearSolicitudData } from '@/contexts/AppContext';
import { SUCURSALES, PRODUCT_CATALOG, ORDERS_DB, TraspasoPiezaDetalle } from '@/lib/data';

interface Props {
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Step = 1 | 2 | 3;

interface PiezaRow {
  code: string;
  qty: number;
}

export default function ScreenNuevaSolicitudTraspaso({ onBack, showToast }: Props) {
  const { crearSolicitudTraspaso } = useApp();
  const [step, setStep] = useState<Step>(1);

  // Paso 1: sucursales seleccionadas
  const [sucursalesSelected, setSucursalesSelected] = useState<string[]>([]);

  // Paso 2: piezas por sucursal
  const [piezasPorSucursal, setPiezasPorSucursal] = useState<Record<string, PiezaRow[]>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Paso 3: pedido origen + observaciones
  const [pedidoSelected, setPedidoSelected] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');

  const toggleSucursal = (suc: string) => {
    setSucursalesSelected(prev =>
      prev.includes(suc) ? prev.filter(s => s !== suc) : [...prev, suc]
    );
  };

  const selectPedido = (id: string) => {
    setPedidoSelected(prev => (prev === id ? null : id));
  };

  const addPieza = (suc: string) => {
    setPiezasPorSucursal(prev => ({
      ...prev,
      [suc]: [...(prev[suc] ?? []), { code: '', qty: 1 }],
    }));
  };

  const removePieza = (suc: string, idx: number) => {
    setPiezasPorSucursal(prev => ({
      ...prev,
      [suc]: (prev[suc] ?? []).filter((_, i) => i !== idx),
    }));
  };

  const updatePieza = (suc: string, idx: number, field: 'code' | 'qty', value: string | number) => {
    setPiezasPorSucursal(prev => {
      const rows = [...(prev[suc] ?? [])];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...prev, [suc]: rows };
    });
  };

  const canGoToStep2 = sucursalesSelected.length > 0;

  const canGoToStep3 = sucursalesSelected.every(suc => {
    const rows = piezasPorSucursal[suc] ?? [];
    return rows.length > 0 && rows.every(r => r.code.trim() !== '' && r.qty > 0);
  });

  const handleGoToStep2 = () => {
    // Inicializar piezas para sucursales nuevas
    const init: Record<string, PiezaRow[]> = { ...piezasPorSucursal };
    sucursalesSelected.forEach(suc => {
      if (!init[suc]) init[suc] = [{ code: '', qty: 1 }];
    });
    setPiezasPorSucursal(init);
    setStep(2);
  };

  const totalPiezas = sucursalesSelected.reduce((sum, suc) => {
    return sum + (piezasPorSucursal[suc] ?? []).reduce((s, r) => s + r.qty, 0);
  }, 0);

  const handleConfirmar = () => {
    const data: CrearSolicitudData = {
      sucursales: sucursalesSelected,
      piezasPorSucursal: Object.fromEntries(
        sucursalesSelected.map(suc => [
          suc,
          (piezasPorSucursal[suc] ?? []).map(r => ({
            code: r.code,
            qtySolicitada: r.qty,
            qtySurtida: 0,
          } as TraspasoPiezaDetalle)),
        ])
      ),
      pedidoOrigen: pedidoSelected ?? '',
      observaciones: observaciones.trim() || undefined,
    };
    const solicitudId = crearSolicitudTraspaso(data);
    showToast(
      `Solicitud ${solicitudId} creada con ${sucursalesSelected.length} petición${sucursalesSelected.length > 1 ? 'es' : ''}`,
      'success'
    );
    onBack();
  };

  const PRODUCT_CODES = Object.keys(PRODUCT_CATALOG);
  const ORDER_IDS = Object.keys(ORDERS_DB);

  const stepLabel = ['Sucursales', 'Piezas', 'Confirmación'];

  return (
    <div className="flex flex-col h-full" style={{ background: '#f4f6fa', fontFamily: 'Roboto, sans-serif' }}>

      {/* ── Breadcrumb ── */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-700 transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swap_horiz</span>
          Traspasos
        </button>
        <span className="text-gray-300">/</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
          Nueva solicitud
        </span>
      </div>

      {/* ── Stepper ── */}
      <div
        className="flex items-center px-6 py-3 flex-shrink-0"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        <div className="flex items-center w-full" style={{ maxWidth: 640, margin: '0 auto' }}>
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

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-4" style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Paso 1: Sucursales */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿A qué sucursales solicitarás mercancía?</p>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Por cada sucursal seleccionada se generará una petición individual bajo la misma solicitud.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUCURSALES.map(suc => {
                  const active = sucursalesSelected.includes(suc);
                  return (
                    <button
                      key={suc}
                      onClick={() => toggleSucursal(suc)}
                      className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                      style={{
                        background: active ? '#1a2b6b' : '#f8f9fb',
                        color: active ? '#fff' : '#374151',
                        border: `1.5px solid ${active ? '#1a2b6b' : '#e5e7eb'}`,
                      }}
                    >
                      {suc}
                    </button>
                  );
                })}
              </div>
              {sucursalesSelected.length > 0 && (
                <p className="text-xs" style={{ color: '#1a2b6b' }}>
                  Se crearán <strong>{sucursalesSelected.length}</strong> petición{sucursalesSelected.length > 1 ? 'es' : ''}: {sucursalesSelected.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Paso 2: Piezas */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>Agrega las piezas que necesitas de cada sucursal</p>
              {sucursalesSelected.map(suc => {
                const rows = piezasPorSucursal[suc] ?? [];
                const isCollapsed = collapsed[suc];
                return (
                  <div key={suc} className="rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                    <button
                      onClick={() => setCollapsed(prev => ({ ...prev, [suc]: !prev[suc] }))}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                      style={{ background: '#f8f9fb', color: '#1a2b6b' }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                        {suc}
                        <span className="text-xs font-normal px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(26,43,107,0.1)', color: '#1a2b6b' }}>
                          {rows.length} pieza{rows.length !== 1 ? 's' : ''}
                        </span>
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {isCollapsed ? 'expand_more' : 'expand_less'}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="p-4 flex flex-col gap-2">
                        {rows.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                list={`codes-${suc}-${idx}`}
                                value={row.code}
                                onChange={e => updatePieza(suc, idx, 'code', e.target.value.toUpperCase())}
                                placeholder="Código (ej: BP-001)"
                                className="w-full text-xs rounded border px-3 py-1.5"
                                style={{ borderColor: row.code && !PRODUCT_CATALOG[row.code] ? '#f59e0b' : '#d1d5db' }}
                              />
                              <datalist id={`codes-${suc}-${idx}`}>
                                {PRODUCT_CODES.map(c => <option key={c} value={c}>{PRODUCT_CATALOG[c].name}</option>)}
                              </datalist>
                            </div>
                            <input
                              type="number"
                              min={1}
                              value={row.qty}
                              onChange={e => updatePieza(suc, idx, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                              className="text-xs rounded border px-2 py-1.5 text-center"
                              style={{ borderColor: '#d1d5db', width: 64 }}
                            />
                            <button
                              onClick={() => removePieza(suc, idx)}
                              className="w-7 h-7 flex items-center justify-center rounded transition-all"
                              style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
                            </button>
                          </div>
                        ))}
                        {rows.length > 0 && PRODUCT_CATALOG[rows[rows.length - 1]?.code] && (
                          <p className="text-xs" style={{ color: '#6b7280' }}>
                            {PRODUCT_CATALOG[rows[rows.length - 1].code].name}
                          </p>
                        )}
                        <button
                          onClick={() => addPieza(suc)}
                          className="flex items-center gap-1 text-xs font-medium mt-1 self-start"
                          style={{ color: '#1a2b6b' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                          Agregar pieza
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Paso 3: Pedido origen + confirmación */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#1a2b6b' }}>Pedido que originó esta necesidad</p>
                <p className="text-xs mb-3" style={{ color: '#6b7280' }}>Selecciona el pedido relacionado (opcional). Un pedido solo puede pertenecer a una solicitud.</p>
                <div className="flex flex-wrap gap-2">
                  {ORDER_IDS.map(id => {
                    const order = ORDERS_DB[id];
                    const active = pedidoSelected === id;
                    return (
                      <button
                        key={id}
                        onClick={() => selectPedido(id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
                        style={{
                          background: active ? 'rgba(26,43,107,0.10)' : '#f8f9fb',
                          border: `1.5px solid ${active ? '#1a2b6b' : '#e5e7eb'}`,
                          color: active ? '#1a2b6b' : '#374151',
                        }}
                      >
                        <span className="font-bold">#{id}</span>
                        <span className="ml-1.5 text-[11px]" style={{ color: active ? '#1a2b6b' : '#6b7280' }}>
                          {order.cliente}
                        </span>
                      </button>
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

              {/* Resumen */}
              <div className="rounded-lg p-4 flex flex-col gap-2" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#1a2b6b' }}>Resumen</p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{sucursalesSelected.length}</span>
                    <span className="text-xs ml-1" style={{ color: '#6b7280' }}>petición{sucursalesSelected.length > 1 ? 'es' : ''}</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{totalPiezas}</span>
                    <span className="text-xs ml-1" style={{ color: '#6b7280' }}>piezas en total</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{pedidoSelected ? 1 : 0}</span>
                    <span className="text-xs ml-1" style={{ color: '#6b7280' }}>pedido vinculado</span>
                  </div>
                </div>
                <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                  Sucursales: {sucursalesSelected.join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Action bar ── */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ background: '#fff', borderTop: '1px solid #e5e7eb' }}
      >
        <button
          onClick={step === 1 ? onBack : () => setStep(prev => (prev - 1) as Step)}
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
            disabled={step === 1 ? !canGoToStep2 : !canGoToStep3}
            onClick={step === 1 ? handleGoToStep2 : () => setStep(3)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: (step === 1 ? canGoToStep2 : canGoToStep3) ? '#1a2b6b' : '#9ca3af',
              cursor: (step === 1 ? canGoToStep2 : canGoToStep3) ? 'pointer' : 'not-allowed',
            }}
          >
            Siguiente
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
          </button>
        ) : (
          <button
            onClick={handleConfirmar}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: '#16a34a', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check</span>
            Confirmar y enviar
          </button>
        )}
      </div>
    </div>
  );
}
