// ============================================================
// APYMSA — ScreenOrders
// Pantalla principal de gestión de pedidos
// Design: Enterprise Precision — light theme, navy #1a2b6b
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB, Order, OrderStatus, STATUS_COLORS, Shipment, ShipmentStatus, SHIPMENTS_DB_INITIAL } from '@/lib/data';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToEmbarques: (orderId?: string) => void;
}

const ALL_STATUSES: OrderStatus[] = ['Activo', 'Surtido', 'Revisado', 'Revisado con incidencias', 'Documentado', 'Enviado', 'Facturado', 'Cancelado'];

function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS['Activo'];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

// ── Mini Auth Modal (fingerprint gate before review) ─────────
function ModalAuth({ orderId, onConfirm, onClose }: { orderId: string; onConfirm: () => void; onClose: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'success'>('idle');

  const handleActivate = () => {
    if (phase !== 'idle') return;
    setPhase('scanning');
    setTimeout(() => {
      setPhase('success');
      setTimeout(() => {
        onConfirm();
      }, 1200);
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget && phase === 'idle') onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)' }}
        >
          <div>
            <h2 className="text-white font-bold text-base">Autenticación requerida</h2>
            <p className="text-blue-200 text-xs mt-0.5">Revisar pedido #{orderId}</p>
          </div>
          {phase === 'idle' && (
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col items-center gap-5 px-8 py-8">
          {/* Fingerprint icon */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            {phase === 'idle' && (
              <>
                <div className="absolute w-24 h-24 rounded-full border-2" style={{ borderColor: '#2563eb', animation: 'fpPulse 2.5s ease-out infinite', opacity: 0 }} />
                <div className="absolute w-24 h-24 rounded-full border-2" style={{ borderColor: '#2563eb', animation: 'fpPulse 2.5s ease-out 0.8s infinite', opacity: 0 }} />
              </>
            )}
            <span
              className="material-symbols-outlined relative z-10 transition-all duration-300"
              style={{
                fontSize: 64,
                color: phase === 'success' ? '#16a34a' : phase === 'scanning' ? '#2563eb' : '#1a2b6b',
                fontVariationSettings: phase === 'success' ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48",
              }}>
              {phase === 'success' ? 'check_circle' : 'fingerprint'}
            </span>
            {phase === 'scanning' && (
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-20">
                <div className="absolute left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)', animation: 'scanSweep 0.6s linear infinite' }} />
              </div>
            )}
          </div>

          <div className="text-sm font-medium text-center" style={{ color: phase === 'success' ? '#16a34a' : '#6b7280' }}>
            {phase === 'idle' && 'Presione el botón para autenticarse'}
            {phase === 'scanning' && 'Escaneando huella...'}
            {phase === 'success' && 'Identidad confirmada — Cosme'}
          </div>

          <button
            onClick={handleActivate}
            disabled={phase !== 'idle'}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium text-sm transition-all duration-200 w-full justify-center"
            style={{
              background: phase !== 'idle' ? '#d1d5db' : '#1a2b6b',
              color: phase !== 'idle' ? '#9ca3af' : 'white',
              cursor: phase !== 'idle' ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (phase === 'idle') (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
            onMouseLeave={e => { if (phase === 'idle') (e.currentTarget as HTMLButtonElement).style.background = '#1a2b6b'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>fingerprint</span>
            Activar lector de huella
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Embarcar — nuevo flujo con detección de embarques existentes ───────
const PAQUETERIAS = ['Estafeta', 'BlueGo', 'Uber', 'Transporte Interno', 'MEXICO EXPRESS'];
const TIPOS_VEHICULO = ['Motocicleta', 'Auto', 'Camioneta', 'Camión'];

type BoxState = {
  id: string;
  pedidoId: string;
  peso: string;
  pesoSimulado: boolean;
  pesoSimulando: boolean;
  dims: { largo: string; ancho: string; alto: string } | null;
  showDims: boolean;
};

interface ModalEmbarcarProps {
  order: Order;
  existingShipments: Shipment[];
  onClose: () => void;
  onCreated: (shipment: Shipment, addedToExisting?: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function ModalEmbarcar({ order, existingShipments, onClose, onCreated, showToast }: ModalEmbarcarProps) {
  // Detect existing shipments for same client (Generado status only)
  const clienteShipments = useMemo(() =>
    existingShipments.filter(s =>
      s.status === 'Generado' &&
      s.pedidos.some(pid => {
        const o = ORDERS_DB[pid];
        return o && o.clienteId === order.clienteId;
      })
    ),
    [existingShipments, order.clienteId]
  );

  // Step: 'select' (choose existing or new) | 'form' (fill data)
  const [step, setStep] = useState<'select' | 'form'>(clienteShipments.length > 0 ? 'select' : 'form');
  const [selectedExistingId, setSelectedExistingId] = useState<string | null>(null);
  const [mode, setMode] = useState<'new' | 'existing'>('new');

  const existingShipment = selectedExistingId
    ? existingShipments.find(s => s.id === selectedExistingId) ?? null
    : null;

  const [paqueteria, setPaqueteria] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [boxes, setBoxes] = useState<BoxState[]>([
    { id: '1', pedidoId: order.id, peso: '', pesoSimulado: false, pesoSimulando: false, dims: null, showDims: false }
  ]);

  const handleSelectExisting = (id: string) => {
    setSelectedExistingId(id);
    const s = existingShipments.find(sh => sh.id === id);
    if (s) {
      setPaqueteria(s.paqueteria);
      setTipoVehiculo(s.tipoVehiculo);
      setObservaciones(s.observaciones);
      const base: BoxState[] = (s.boxes ?? []).map(b => ({
        id: b.id,
        pedidoId: b.pedidoId,
        peso: String(b.peso),
        pesoSimulado: true,
        pesoSimulando: false,
        dims: b.largo ? { largo: String(b.largo), ancho: String(b.ancho ?? ''), alto: String(b.alto ?? '') } : null,
        showDims: !!b.largo,
      }));
      base.push({ id: String(base.length + 1), pedidoId: order.id, peso: '', pesoSimulado: false, pesoSimulando: false, dims: null, showDims: false });
      setBoxes(base);
    }
  };

  const updateBox = (idx: number, partial: Partial<BoxState>) =>
    setBoxes(prev => prev.map((b, i) => i === idx ? { ...b, ...partial } : b));

  const addBox = () =>
    setBoxes(prev => [...prev, { id: String(prev.length + 1), pedidoId: order.id, peso: '', pesoSimulado: false, pesoSimulando: false, dims: null, showDims: false }]);

  const removeBox = (idx: number) =>
    setBoxes(prev => prev.filter((_, i) => i !== idx));

  const simulateBoxScale = (idx: number) => {
    updateBox(idx, { pesoSimulando: true });
    setTimeout(() => {
      const w = (1.2 + Math.random() * 3.5).toFixed(1);
      updateBox(idx, { peso: w, pesoSimulado: true, pesoSimulando: false });
      showToast(`Báscula caja ${idx + 1}: ${w} kg`, 'success');
    }, 1200);
  };

  const isUberOrBluego = paqueteria === 'Uber' || paqueteria === 'BlueGo';
  const isEstafeta = paqueteria === 'Estafeta';
  const totalPeso = boxes.reduce((sum, b) => sum + (parseFloat(b.peso) || 0), 0);
  const canCreate = paqueteria !== '' && boxes.length > 0 &&
    boxes.every(b => b.peso !== '' && parseFloat(b.peso) > 0 && b.pedidoId !== '');

  const allOrderIds = useMemo(() => {
    const ids = new Set<string>(existingShipment?.pedidos ?? []);
    ids.add(order.id);
    return Array.from(ids);
  }, [existingShipment, order.id]);

  const handleSubmit = (withSolicitud: boolean) => {
    if (!canCreate) return;
    const finalBoxes = boxes.map((b, i) => ({
      id: b.id || String(i + 1),
      pedidoId: b.pedidoId,
      peso: parseFloat(b.peso),
      ...(b.dims ? {
        largo: parseFloat(b.dims.largo) || undefined,
        ancho: parseFloat(b.dims.ancho) || undefined,
        alto: parseFloat(b.dims.alto) || undefined,
      } : {}),
    }));

    if (mode === 'existing' && existingShipment) {
      const updated: Shipment = {
        ...existingShipment,
        pedidos: allOrderIds,
        paqueteria,
        tipoVehiculo,
        observaciones,
        cajas: finalBoxes.length,
        peso: totalPeso,
        boxes: finalBoxes,
        status: withSolicitud
          ? (isUberOrBluego || isEstafeta ? 'En tránsito' : existingShipment.status)
          : existingShipment.status,
      };
      onCreated(updated, true);
      if (withSolicitud && isUberOrBluego) showToast(`Solicitud enviada a ${paqueteria} — Embarque #${existingShipment.id}`, 'success');
      else if (withSolicitud && isEstafeta) showToast(`Guía generada — Embarque #${existingShipment.id}`, 'success');
      else showToast(`Pedido #${order.id} agregado al embarque #${existingShipment.id}`, 'success');
    } else {
      const newId = String(88500 + Math.floor(Math.random() * 900));
      const finalStatus: ShipmentStatus = withSolicitud
        ? (isUberOrBluego || isEstafeta ? 'En tránsito' : 'Generado')
        : 'Generado';
      const newShipment: Shipment = {
        id: newId,
        paqueteria,
        pedidos: [order.id],
        observaciones,
        status: finalStatus,
        fecha: '2026-04-22',
        tipoVehiculo,
        cajas: finalBoxes.length,
        peso: totalPeso,
        usuario: 'Cosme',
        boxes: finalBoxes,
      };
      onCreated(newShipment, false);
      if (withSolicitud && isUberOrBluego) showToast(`Solicitud enviada a ${paqueteria} — Embarque #${newId}`, 'success');
      else if (withSolicitud && isEstafeta) showToast(`Guía generada — Embarque #${newId}`, 'success');
      else showToast(`Embarque #${newId} creado — Pedido #${order.id}`, 'success');
    }
    onClose();
  };

  // ── STEP: select existing or new ──
  if (step === 'select') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
          style={{ background: '#fff', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        >
          <div
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)' }}
          >
            <div>
              <h2 className="text-white font-bold text-lg">Gestión de embarque</h2>
              <p className="text-blue-200 text-xs mt-0.5">Pedido #{order.id}</p>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Se encontraron embarques del cliente{' '}
              <strong className="font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                {order.cliente}
              </strong>{' '}
              que aún no están en "Reparto iniciado":
            </p>
            <div className="flex flex-col gap-2">
              {clienteShipments.map(s => (
                <label
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                  style={selectedExistingId === s.id
                    ? { borderColor: '#1a2b6b', background: 'rgba(26,43,107,0.06)' }
                    : { borderColor: '#e5e7eb', background: '#fff' }
                  }
                >
                  <input
                    type="radio"
                    name="existingShipment"
                    value={s.id}
                    checked={selectedExistingId === s.id}
                    onChange={() => setSelectedExistingId(s.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-gray-800 text-sm">EMB-{s.id}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Pedidos: {s.pedidos.join(', ')} · Paquetería: {s.paqueteria}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div
            className="flex-shrink-0 flex items-center justify-between px-6 py-4"
            style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb' }}
          >
            <button
              disabled={!selectedExistingId}
              onClick={() => {
                setMode('existing');
                handleSelectExisting(selectedExistingId!);
                setStep('form');
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all"
              style={selectedExistingId
                ? { background: 'linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)' }
                : { background: '#d1d5db', color: '#9ca3af', cursor: 'not-allowed' }
              }
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Adjuntar a embarque seleccionado
            </button>
            <button
              onClick={() => { setMode('new'); setStep('form'); }}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
              style={{ borderColor: '#1a2b6b', color: '#1a2b6b', background: '#fff' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Crear nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: form ──
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#fff', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)' }}
        >
          <div>
            <h2 className="text-white font-bold text-lg">
              {mode === 'existing' ? `Agregar a Embarque #${selectedExistingId}` : 'Crear Embarque'}
            </h2>
            <p className="text-blue-200 text-xs mt-0.5">
              {mode === 'existing'
                ? `Pedido #${order.id} → ${order.cliente}`
                : `EmbarqueID: Por asignar · Pedido #${order.id}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {clienteShipments.length > 0 && (
              <button
                onClick={() => setStep('select')}
                className="text-blue-200 hover:text-white transition-colors text-xs flex items-center gap-1"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                Regresar
              </button>
            )}
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Tipo de vehículo */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-2">Tipo de vehículo</p>
            <div className="flex items-center gap-3">
              {TIPOS_VEHICULO.map(v => (
                <button
                  key={v}
                  onClick={() => setTipoVehiculo(v)}
                  className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border-2 transition-all text-xs font-semibold"
                  style={tipoVehiculo === v
                    ? { borderColor: '#1a2b6b', background: 'rgba(26,43,107,0.08)', color: '#1a2b6b' }
                    : { borderColor: '#e5e7eb', background: '#fff', color: '#6b7280' }
                  }
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    {v === 'Motocicleta' ? 'two_wheeler' : v === 'Auto' ? 'directions_car' : v === 'Camioneta' ? 'local_shipping' : 'fire_truck'}
                  </span>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Datos del embarque */}
          <div
            className="rounded-xl px-4 py-4 flex flex-col gap-4"
            style={{ border: '1px solid #e5e7eb', background: '#f8f9fb' }}
          >
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Datos del Embarque</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">EmbarqueID</label>
                <div className="text-sm font-bold text-gray-400">
                  {mode === 'existing' ? `#${selectedExistingId}` : 'Por asignar'}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Usuario</label>
                <div className="text-sm font-semibold text-gray-700">Cosme</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">
                  Paquetería <span className="text-red-500">*</span>
                </label>
                <select
                  value={paqueteria}
                  onChange={e => setPaqueteria(e.target.value)}
                  disabled={mode === 'existing'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Seleccionar...</option>
                  {PAQUETERIAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end">
                {paqueteria && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      background: paqueteria === 'Uber' ? 'rgba(0,0,0,0.06)'
                        : paqueteria === 'BlueGo' ? 'rgba(37,99,235,0.08)'
                        : paqueteria === 'Estafeta' ? 'rgba(220,38,38,0.07)'
                        : 'rgba(26,43,107,0.06)',
                      color: '#374151'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      {paqueteria === 'Uber' ? 'local_taxi'
                        : paqueteria === 'BlueGo' ? 'electric_moped'
                        : paqueteria === 'Estafeta' ? 'local_shipping'
                        : 'warehouse'}
                    </span>
                    {paqueteria}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-medium mb-1">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Opcional..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none bg-white"
              />
            </div>
          </div>

          {/* Cajas individuales */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                  style={{ background: '#1a2b6b' }}
                >
                  {boxes.length}
                </span>
                Cajas ({boxes.length})
                <span className="text-xs font-normal text-gray-400 ml-1">
                  Peso total: <strong className="text-gray-700">{totalPeso.toFixed(1)} kg</strong>
                </span>
              </h3>
              <button
                onClick={addBox}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.2)' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Agregar caja
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {boxes.map((box, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 overflow-hidden"
                  style={{ background: '#fafbff' }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-2"
                    style={{ background: 'rgba(26,43,107,0.06)', borderBottom: '1px solid #e5e7eb' }}
                  >
                    <span className="text-xs font-bold text-gray-700">Caja {idx + 1}</span>
                    {boxes.length > 1 && (
                      <button
                        onClick={() => removeBox(idx)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        × Eliminar
                      </button>
                    )}
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 font-medium mb-1">
                        Pedido <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={box.pedidoId}
                        onChange={e => updateBox(idx, { pedidoId: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">Seleccionar...</option>
                        {allOrderIds.map(id => (
                          <option key={id} value={id}>#{id} — {ORDERS_DB[id]?.cliente}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                        Peso (kg) <span className="text-red-500">*</span>
                        {box.pesoSimulado && <span className="text-green-600 font-semibold">✓</span>}
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={box.peso}
                          onChange={e => updateBox(idx, { peso: e.target.value, pesoSimulado: false })}
                          placeholder="0.0"
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                          style={box.pesoSimulado ? { borderColor: '#16a34a', background: 'rgba(22,163,74,0.04)' } : {}}
                        />
                        <button
                          onClick={() => simulateBoxScale(idx)}
                          disabled={box.pesoSimulando || box.pesoSimulado}
                          title="Báscula"
                          className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={box.pesoSimulado
                            ? { background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)' }
                            : box.pesoSimulando
                              ? { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
                              : { background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.2)' }
                          }
                        >
                          {box.pesoSimulando ? '...' : box.pesoSimulado ? '✓' : '⚖️'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    {!box.showDims ? (
                      <button
                        onClick={() => updateBox(idx, { showDims: true, dims: { largo: '', ancho: '', alto: '' } })}
                        className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors"
                      >
                        + Agregar dimensiones (opcional)
                      </button>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-500">Dimensiones (cm)</span>
                          <button
                            onClick={() => updateBox(idx, { showDims: false, dims: null })}
                            className="text-xs text-gray-400 hover:text-red-500"
                          >
                            × Quitar
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['largo', 'ancho', 'alto'] as const).map(dim => (
                            <div key={dim}>
                              <label className="block text-xs text-gray-400 mb-0.5 capitalize">{dim}</label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={box.dims?.[dim] ?? ''}
                                onChange={e => updateBox(idx, {
                                  dims: { ...(box.dims ?? { largo: '', ancho: '', alto: '' }), [dim]: e.target.value }
                                })}
                                placeholder="0"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info banner por paquetería */}
          {isEstafeta && (
            <div
              className="px-4 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}
            >
              <strong>Estafeta — Web service activo</strong> — Puedes crear el embarque ahora y generar la guía después, o crear y generar la guía en un solo paso.
            </div>
          )}
          {isUberOrBluego && (
            <div
              className="px-4 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb' }}
            >
              <strong>{paqueteria} — Web service activo</strong> — Puedes guardar el embarque ahora y enviar la solicitud después, o guardar y enviar en un solo paso.
            </div>
          )}
        </div>

        {/* Footer — botones diferenciados por paquetería */}
        <div
          className="flex-shrink-0 px-6 py-4"
          style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {boxes.length} caja{boxes.length !== 1 ? 's' : ''} · {totalPeso.toFixed(1)} kg total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              {/* Solo guardar/crear */}
              <button
                onClick={() => handleSubmit(false)}
                disabled={!canCreate}
                className="px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all"
                style={canCreate
                  ? { borderColor: '#1a2b6b', color: '#1a2b6b', background: '#fff' }
                  : { borderColor: '#d1d5db', color: '#9ca3af', background: '#fff', cursor: 'not-allowed' }
                }
              >
                {mode === 'existing' ? 'Guardar cambios' : 'Crear embarque'}
              </button>
              {/* Guardar + acción de paquetería */}
              {(isUberOrBluego || isEstafeta) && (
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={!canCreate}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white transition-all"
                  style={canCreate
                    ? {
                        background: isEstafeta
                          ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                          : paqueteria === 'Uber'
                            ? 'linear-gradient(135deg, #111827 0%, #374151 100%)'
                            : 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                      }
                    : { background: '#d1d5db', color: '#9ca3af', cursor: 'not-allowed' }
                  }
                >
                  {mode === 'existing'
                    ? isEstafeta ? 'Guardar y generar guía' : `Guardar y enviar solicitud ${paqueteria}`
                    : isEstafeta ? 'Crear y generar guía' : `Crear y enviar solicitud ${paqueteria}`
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ScreenOrders ─────────────────────────────────────────
export default function ScreenOrders({ showToast, onNavigateToEmbarques }: Props) {
  const { state, goToScreen, loadOrder, updateOrderStatus } = useApp();

  // Filters
  const [fechaInicial, setFechaInicial] = useState('2026-04-22');
  const [fechaFinal, setFechaFinal] = useState('2026-04-22');
  const [filterActivo, setFilterActivo] = useState(true);
  const [filterRevisado, setFilterRevisado] = useState(true);
  const [filterCancelado, setFilterCancelado] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Embarcar modal state
  const [showEmbarcarModal, setShowEmbarcarModal] = useState(false);
  const [localShipments, setLocalShipments] = useState<Shipment[]>(SHIPMENTS_DB_INITIAL);

  // Build orders list with live statuses
  const allOrders: Order[] = useMemo(() =>
    Object.values(ORDERS_DB).map(o => ({
      ...o,
      status: (state.orderStatuses[o.id] ?? o.status) as OrderStatus,
    })),
    [state.orderStatuses]
  );

  // Apply filters
  // "Activo" = todo lo que aún no ha sido entregado ni facturado (Activo, Surtido, Documentado, Enviado)
  // "Revisado" = pedidos en estado Revisado o Revisado con incidencias (pendientes de facturar/documentar)
  const filteredOrders = useMemo(() => {
    const allowedStatuses = new Set<OrderStatus>();
    if (filterActivo)   { allowedStatuses.add('Activo'); allowedStatuses.add('Surtido'); allowedStatuses.add('Documentado'); allowedStatuses.add('Enviado'); }
    if (filterRevisado) { allowedStatuses.add('Revisado'); allowedStatuses.add('Revisado con incidencias'); }
    if (filterCancelado){ allowedStatuses.add('Cancelado'); allowedStatuses.add('Facturado'); }

    return allOrders.filter(o => {
      if (!allowedStatuses.has(o.status)) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        return o.id.includes(q) || o.cliente.toLowerCase().includes(q) || o.vendedor.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allOrders, filterActivo, filterRevisado, filterCancelado, searchText]);

  const selectedOrder = selectedId ? filteredOrders.find(o => o.id === selectedId) ?? null : null;

  // Action button logic
  const canSurtir       = selectedOrder?.status === 'Activo';
  const canRevisar      = selectedOrder?.status === 'Surtido';
  const canFacturar     = selectedOrder?.status === 'Revisado' || selectedOrder?.status === 'Revisado con incidencias';
  const canDocumentar   = selectedOrder?.status === 'Revisado' || selectedOrder?.status === 'Revisado con incidencias';
  const canVerEmbarques = selectedOrder?.status === 'Documentado' || selectedOrder?.status === 'Enviado';

  const handleSurtir = () => {
    if (!selectedOrder) return;
    updateOrderStatus(selectedOrder.id, 'Surtido');
    showToast(`Pedido #${selectedOrder.id} marcado como Surtido`, 'success');
    setSelectedId(null);
  };

  const handleRevisarClick = () => {
    if (!selectedOrder) return;
    setShowAuthModal(true);
  };

  const handleAuthConfirm = () => {
    if (!selectedOrder) return;
    setShowAuthModal(false);
    loadOrder(selectedOrder.id);
    goToScreen('review');
  };

  const handleDocumentar = () => {
    if (!selectedOrder) return;
    onNavigateToEmbarques(selectedOrder.id);
  };

  const handleVerEmbarques = () => {
    if (!selectedOrder) return;
    onNavigateToEmbarques(selectedOrder.id);
  };

  const handleEmbarcarCreated = (shipment: Shipment, addedToExisting?: boolean) => {
    if (addedToExisting) {
      // Update existing shipment in list
      setLocalShipments(prev => prev.map(s => s.id === shipment.id ? shipment : s));
    } else {
      setLocalShipments(prev => [shipment, ...prev]);
    }
    // Mark all orders in the shipment as Documentado
    shipment.pedidos.forEach(pid => updateOrderStatus(pid, 'Documentado'));
    setShowEmbarcarModal(false);
  };

  const btnBase = "px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap";

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Roboto, sans-serif', background: '#f4f6fa' }}>

      {/* ── Filter bar ── */}
      <div
        className="flex-shrink-0 px-6 py-3 flex flex-wrap items-center gap-4"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        {/* Date range */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Fecha Inicial</span>
          <input
            type="date"
            value={fechaInicial}
            onChange={e => setFechaInicial(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Fecha Final</span>
          <input
            type="date"
            value={fechaFinal}
            onChange={e => setFechaFinal(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {/* Status checkboxes */}
        <div
          className="flex items-center gap-4 px-4 py-2 rounded-lg"
          style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}
        >
          {/* Activo = todo no entregado/facturado */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={filterActivo} onChange={e => setFilterActivo(e.target.checked)} className="w-3.5 h-3.5 accent-blue-700 rounded" />
            <span className="text-xs text-gray-600 font-medium">Activo</span>
          </label>
          {/* Revisado = pendientes de facturar/documentar */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={filterRevisado} onChange={e => setFilterRevisado(e.target.checked)} className="w-3.5 h-3.5 accent-blue-700 rounded" />
            <span className="text-xs text-gray-600 font-medium">Revisado</span>
          </label>
          {/* Retenido — deshabilitado en esta versión */}
          <label className="flex items-center gap-1.5 cursor-not-allowed select-none opacity-40">
            <input type="checkbox" checked={false} disabled className="w-3.5 h-3.5 rounded" />
            <span className="text-xs text-gray-400 font-medium">Retenido</span>
          </label>
          {/* Cancelado (incluye Facturado) */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={filterCancelado} onChange={e => setFilterCancelado(e.target.checked)} className="w-3.5 h-3.5 accent-blue-700 rounded" />
            <span className="text-xs text-gray-600 font-medium">Cancelado / Facturado</span>
          </label>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-40 max-w-xs">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar pedido o cliente..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Refresh / Clear */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => showToast('Lista actualizada', 'info')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all hover:bg-gray-50"
            style={{ border: '1px solid #1a2b6b', color: '#1a2b6b' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refrescar
          </button>
          <button
            onClick={() => { setSearchText(''); setFilterActivo(true); setFilterRevisado(true); setFilterCancelado(false); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #e5e7eb', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
                {['Origen','Status','PedidoID','Fecha Captura','Fecha Entrega','Hora Entrega','Zona','Local','ClienteID','Cliente','VendedorID','Vendedor','Plazo','Total'].map(col => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron pedidos con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const isSelected = order.id === selectedId;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedId(isSelected ? null : order.id)}
                      onDoubleClick={() => {
                        setSelectedId(order.id);
                        if (order.status === 'Surtido') setShowAuthModal(true);
                        else if (order.status === 'Revisado' || order.status === 'Revisado con incidencias') setShowEmbarcarModal(true); // Documentar
                        else if (order.status === 'Documentado' || order.status === 'Enviado') onNavigateToEmbarques(order.id);
                      }}
                      className="cursor-pointer transition-colors"
                      style={{
                        background: isSelected
                          ? 'rgba(26,43,107,0.08)'
                          : idx % 2 === 0 ? '#fff' : '#fafbfc',
                        borderBottom: '1px solid #f0f0f0',
                        borderLeft: isSelected ? '3px solid #1a2b6b' : '3px solid transparent',
                      }}
                    >
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{order.origen}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{order.id}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{order.fechaCaptura}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{order.fechaEntrega || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap text-xs">{order.horaEntrega || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{order.zona || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {order.local ? (
                          <svg className="w-4 h-4 mx-auto text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{order.clienteId}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap max-w-[180px] truncate">{order.cliente}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{order.vendedorId}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[160px] truncate">{order.vendedor}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">{order.plazo || '—'}</td>
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">{order.total}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex-shrink-0 px-6 py-1.5" style={{ background: '#f8f9fb', borderTop: '1px solid #e5e7eb' }}>
        <p className="text-xs text-gray-500">
          Se encontraron <strong className="text-gray-700">{filteredOrders.length}</strong> pedidos
          {selectedOrder
            ? <> | Pedido <strong className="text-blue-700">#{selectedOrder.id}</strong> seleccionado — {selectedOrder.status}</>
            : ' | Doble clic: Surtido→Revisar · Revisado→Documentar · Documentado→Ver embarque | F3 - Editar Pedido'
          }
        </p>
      </div>

      {/* ── Action bar ── */}
      <div
        className="flex-shrink-0 px-6 py-3 flex items-center justify-between gap-4"
        style={{ background: '#fff', borderTop: '1px solid #e5e7eb' }}
      >
        <p className="text-xs text-gray-400 font-mono">F4 -Pedido | F7 -Surtir | F8 -Revisar | F9 -Factura | F11 -Cotizador | F12 -Productos</p>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Surtir */}
          <button
            onClick={handleSurtir}
            disabled={!canSurtir}
            className={btnBase}
            style={canSurtir
              ? { background: '#d97706', color: '#fff', boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            Surtir
          </button>

          {/* Revisar */}
          <button
            onClick={handleRevisarClick}
            disabled={!canRevisar}
            className={btnBase}
            style={canRevisar
              ? { background: '#2563eb', color: '#fff', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            Revisar
          </button>

          {/* Facturar */}
          <button
            onClick={() => showToast(`Abriendo facturación para pedido #${selectedOrder?.id}`, 'info')}
            disabled={!canFacturar}
            className={btnBase}
            style={canFacturar
              ? { background: '#059669', color: '#fff', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Facturar
          </button>

          {/* Documentar / Embarcar */}
          <button
            onClick={() => setShowEmbarcarModal(true)}
            disabled={!canDocumentar}
            className={btnBase}
            style={canDocumentar
              ? { background: '#7c3aed', color: '#fff', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="1" y="3" width="15" height="13" rx="1"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Documentar
          </button>

          {/* Ver embarques */}
          <button
            onClick={handleVerEmbarques}
            disabled={!canVerEmbarques}
            className={btnBase}
            style={canVerEmbarques
              ? { background: 'transparent', color: '#1a2b6b', border: '1.5px solid #1a2b6b' }
              : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed', border: '1.5px solid transparent' }
            }
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 17H5a2 2 0 00-2 2v2h18v-2a2 2 0 00-2-2h-4"/>
              <path d="M12 3v14"/>
              <path d="M8 7l4-4 4 4"/>
            </svg>
            Ver embarques
          </button>
        </div>
      </div>

      {/* Auth modal */}
      {showAuthModal && selectedOrder && (
        <ModalAuth
          orderId={selectedOrder.id}
          onConfirm={handleAuthConfirm}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Embarcar modal */}
      {showEmbarcarModal && selectedOrder && (
        <ModalEmbarcar
          order={selectedOrder}
          existingShipments={localShipments}
          onClose={() => setShowEmbarcarModal(false)}
          onCreated={handleEmbarcarCreated}
          showToast={showToast}
        />
      )}
    </div>
  );
}
