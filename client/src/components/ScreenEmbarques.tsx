// ============================================================
// APYMSA — ScreenEmbarques
// Pantalla de Documentación / Administración de Embarques
// Design: Enterprise Precision — two-panel split, light theme
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  ORDERS_DB, Order, OrderStatus, STATUS_COLORS,
  Shipment, ShipmentStatus, SHIPMENT_STATUS_COLORS, SHIPMENTS_DB_INITIAL,
} from '@/lib/data';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  preSelectedOrderId?: string | null;
  onBack: () => void;
}

function ShipmentBadge({ status }: { status: ShipmentStatus }) {
  const c = SHIPMENT_STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

function OrderBadge({ status }: { status: OrderStatus }) {
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

// ── Modal Crear Embarque ──────────────────────────────────────
interface ModalCrearEmbarqueProps {
  onClose: () => void;
  onCreated: (shipment: Shipment, orderIds: string[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  preOrderId?: string | null;
  orderStatuses: Record<string, OrderStatus>;
}

const PAQUETERIAS = ['BlueGo', 'Uber', 'Transporte Interno', 'MEXICO EXPRESS'];
const TIPOS_VEHICULO = ['Sedan', 'Van', 'Camioneta', 'Camión'];

function ModalCrearEmbarque({ onClose, onCreated, showToast, preOrderId, orderStatuses }: ModalCrearEmbarqueProps) {
  // Eligible orders: Revisado or Revisado con incidencias, not yet in any shipment
  const eligibleOrders = useMemo(() =>
    Object.values(ORDERS_DB).filter(o => {
      const st = orderStatuses[o.id] ?? o.status;
      return st === 'Revisado' || st === 'Revisado con incidencias';
    }),
    [orderStatuses]
  );

  const [selectedOrders, setSelectedOrders] = useState<string[]>(
    preOrderId && eligibleOrders.some(o => o.id === preOrderId) ? [preOrderId] : []
  );
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);

  const [paqueteria, setPaqueteria] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cajas, setCajas] = useState('');
  const [peso, setPeso] = useState('');

  const dropdownOrders = eligibleOrders.filter(o =>
    !selectedOrders.includes(o.id) &&
    (o.id.includes(orderSearch) || o.cliente.toLowerCase().includes(orderSearch.toLowerCase()))
  );

  const addOrder = (id: string) => {
    setSelectedOrders(prev => [...prev, id]);
    setOrderSearch('');
    setShowOrderDropdown(false);
  };

  const removeOrder = (id: string) => setSelectedOrders(prev => prev.filter(x => x !== id));

  const isWebService = paqueteria === 'BlueGo' || paqueteria === 'Uber';
  const isManual = paqueteria === 'Transporte Interno' || paqueteria === 'MEXICO EXPRESS';

  const handleCreate = () => {
    if (selectedOrders.length === 0) { showToast('Selecciona al menos un pedido', 'error'); return; }
    if (!paqueteria) { showToast('Selecciona una paquetería', 'error'); return; }
    if (!cajas || parseInt(cajas) <= 0) { showToast('Número de cajas debe ser mayor a 0', 'error'); return; }
    if (!peso || parseFloat(peso) <= 0) { showToast('Peso debe ser mayor a 0', 'error'); return; }

    const newId = String(88516 + Math.floor(Math.random() * 100));
    const finalStatus: ShipmentStatus = isWebService ? 'Solicitado' : 'Generado';

    const newShipment: Shipment = {
      id: newId,
      paqueteria,
      pedidos: selectedOrders,
      observaciones,
      status: finalStatus,
      fecha: '2026-04-22',
      tipoVehiculo,
      cajas: parseInt(cajas),
      peso: parseFloat(peso),
      usuario: 'Cosme',
    };

    onCreated(newShipment, selectedOrders);

    if (isWebService) {
      showToast(`Solicitud enviada automáticamente a ${paqueteria}`, 'success');
    }
    showToast(`Embarque #${newId} creado correctamente`, 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#fff', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)' }}
        >
          <div>
            <h2 className="text-white font-bold text-lg">Crear Embarque</h2>
            <p className="text-blue-200 text-xs mt-0.5">EmbarqueID: Por asignar</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

          {/* Section 1 — Pedidos */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">1</span>
              Pedidos a incluir
            </h3>

            {/* Search input */}
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Buscar pedido por ID o cliente..."
                value={orderSearch}
                onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }}
                onFocus={() => setShowOrderDropdown(true)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {showOrderDropdown && dropdownOrders.length > 0 && (
                <div
                  className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden"
                  style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                >
                  {dropdownOrders.slice(0, 6).map(o => (
                    <button
                      key={o.id}
                      onClick={() => addOrder(o.id)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between"
                    >
                      <span>
                        <span className="font-semibold text-gray-800">#{o.id}</span>
                        <span className="text-gray-500 ml-2">{o.cliente}</span>
                      </span>
                      <span className="text-gray-500 font-medium">{o.total}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 min-h-8">
              {selectedOrders.map(id => {
                const o = ORDERS_DB[id];
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.2)' }}
                  >
                    #{id} — {o?.cliente} — {o?.total}
                    <button onClick={() => removeOrder(id)} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                  </span>
                );
              })}
              {selectedOrders.length === 0 && (
                <span className="text-xs text-gray-400 italic">Ningún pedido seleccionado</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedOrders.length} pedido(s) seleccionado(s)</p>
          </div>

          {/* Section 2 — Configuración */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">2</span>
              Configuración
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Paquetería <span className="text-red-500">*</span></label>
                <select
                  value={paqueteria}
                  onChange={e => setPaqueteria(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Seleccionar...</option>
                  {PAQUETERIAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Tipo de vehículo</label>
                <select
                  value={tipoVehiculo}
                  onChange={e => setTipoVehiculo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Paquetería note */}
            {isWebService && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb' }}>
                <strong>Web service activo</strong> — solicitud automática al confirmar
              </div>
            )}
            {isManual && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)', color: '#d97706' }}>
                <strong>Registro manual requerido</strong> — el embarque quedará en estado Generado
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs text-gray-500 font-medium mb-1">Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={2}
                placeholder="Opcional..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>
          </div>

          {/* Section 3 — Empaque */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">3</span>
              Empaque
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Número de cajas <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  value={cajas}
                  onChange={e => setCajas(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Peso total (kg) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={peso}
                  onChange={e => setPeso(e.target.value)}
                  placeholder="0.0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)', color: '#d97706' }}>
              Verifique que el peso coincida con el contenido declarado
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            className="px-6 py-2 rounded-lg text-sm font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)', boxShadow: '0 4px 14px rgba(26,43,107,0.3)' }}
          >
            Crear embarque
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ScreenEmbarques ──────────────────────────────────────
export default function ScreenEmbarques({ showToast, preSelectedOrderId, onBack }: Props) {
  const { state, updateOrderStatus } = useApp();

  const [shipments, setShipments] = useState<Shipment[]>(SHIPMENTS_DB_INITIAL);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<'BlueGO' | 'UBER' | null>(null);

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId) ?? null;

  const handleCreated = (shipment: Shipment, orderIds: string[]) => {
    setShipments(prev => [shipment, ...prev]);
    orderIds.forEach(id => updateOrderStatus(id, 'Documentado'));
    setSelectedShipmentId(shipment.id);
  };

  const handleEnviarSolicitud = () => {
    if (!selectedShipment || !selectedTransport) return;
    setShipments(prev =>
      prev.map(s => s.id === selectedShipment.id ? { ...s, status: 'Solicitado' } : s)
    );
    showToast(`Solicitud enviada a ${selectedTransport}`, 'success');
    setSelectedTransport(null);
  };

  // Compute total for selected shipment
  const shipmentTotal = selectedShipment
    ? selectedShipment.pedidos.reduce((sum, pid) => {
        const o = ORDERS_DB[pid];
        if (!o) return sum;
        const num = parseFloat(o.total.replace(/[$,]/g, ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0)
    : 0;

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Roboto, sans-serif', background: '#f4f6fa' }}>

      {/* ── Sub-header ── */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Pedidos
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">Administración de Embarques</span>
      </div>

      {/* ── Two-panel split ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL — 35% */}
        <div
          className="flex flex-col"
          style={{ width: '35%', borderRight: '1px solid #e5e7eb', background: '#fff' }}
        >
          {/* Panel header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #e5e7eb' }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-sm">Embarques</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(26,43,107,0.1)', color: '#1a2b6b' }}
              >
                {shipments.length}
              </span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)', boxShadow: '0 2px 8px rgba(26,43,107,0.3)' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Crear embarque
            </button>
          </div>

          {/* Shipment list */}
          <div className="flex-1 overflow-y-auto">
            {shipments.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedShipmentId(s.id); setSelectedTransport(null); }}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  background: s.id === selectedShipmentId ? 'rgba(26,43,107,0.06)' : 'transparent',
                  borderLeft: s.id === selectedShipmentId ? '3px solid #1a2b6b' : '3px solid transparent',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800">#{s.id}</span>
                  <ShipmentBadge status={s.status} />
                </div>
                <div className="text-xs text-gray-500 mb-1">{s.paqueteria}</div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b' }}
                  >
                    {s.pedidos.length} pedido{s.pedidos.length !== 1 ? 's' : ''}
                  </span>
                  {s.observaciones && (
                    <span className="text-xs text-gray-400 truncate">{s.observaciones}</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">{s.fecha}</div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — 65% */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f8f9fb' }}>
          {!selectedShipment ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(26,43,107,0.08)' }}
              >
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="1" y="3" width="15" height="13" rx="1"/>
                  <path d="M16 8h4l3 3v5h-7V8z"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">Selecciona un embarque para ver el detalle</p>
              <p className="text-gray-400 text-xs mt-1">O crea uno nuevo con el botón de arriba</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              {/* Detail header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black" style={{ color: '#1a2b6b' }}>
                      Embarque #{selectedShipment.id}
                    </h2>
                    <ShipmentBadge status={selectedShipment.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedShipment.paqueteria}
                    {selectedShipment.tipoVehiculo && ` · ${selectedShipment.tipoVehiculo}`}
                    {' · '}{selectedShipment.fecha}
                  </p>
                </div>
              </div>

              {/* Meta card */}
              <div
                className="rounded-xl px-5 py-4 grid grid-cols-3 gap-4"
                style={{ background: '#fff', border: '1px solid #e5e7eb' }}
              >
                {[
                  ['Paquetería', selectedShipment.paqueteria],
                  ['Tipo vehículo', selectedShipment.tipoVehiculo || '—'],
                  ['Cajas', String(selectedShipment.cajas)],
                  ['Peso', `${selectedShipment.peso} kg`],
                  ['Usuario', selectedShipment.usuario],
                  ['Observaciones', selectedShipment.observaciones || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-gray-800">{value}</div>
                  </div>
                ))}
              </div>

              {/* Orders included */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Pedidos incluidos</h3>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid #e5e7eb', background: '#fff' }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                        {['PedidoID', 'Cliente', 'Total', 'Status'].map(col => (
                          <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedShipment.pedidos.map((pid, idx) => {
                        const o: Order | undefined = ORDERS_DB[pid];
                        const st = (state.orderStatuses[pid] ?? o?.status ?? 'Activo') as OrderStatus;
                        return (
                          <tr key={pid} style={{ borderBottom: idx < selectedShipment.pedidos.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                            <td className="px-4 py-2.5 font-semibold text-gray-800">#{pid}</td>
                            <td className="px-4 py-2.5 text-gray-600">{o?.cliente ?? '—'}</td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800">{o?.total ?? '—'}</td>
                            <td className="px-4 py-2.5"><OrderBadge status={st} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Summary footer */}
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ background: '#f8f9fb', borderTop: '1px solid #e5e7eb' }}
                  >
                    <span className="text-xs text-gray-500">
                      Total de pedidos: <strong className="text-gray-700">{selectedShipment.pedidos.length}</strong>
                    </span>
                    <span className="text-sm font-bold" style={{ color: '#1a2b6b' }}>
                      Monto total: ${shipmentTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transport action buttons */}
              <div
                className="rounded-xl px-5 py-4"
                style={{ background: '#fff', border: '1px solid #e5e7eb' }}
              >
                <h3 className="text-sm font-bold text-gray-700 mb-3">Solicitar transporte</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTransport(t => t === 'BlueGO' ? null : 'BlueGO')}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold border-2 transition-all"
                    style={selectedTransport === 'BlueGO'
                      ? { background: '#1a2b6b', color: '#fff', borderColor: '#1a2b6b' }
                      : { background: '#fff', color: '#1a2b6b', borderColor: '#1a2b6b' }
                    }
                  >
                    BlueGO
                  </button>
                  <button
                    onClick={() => setSelectedTransport(t => t === 'UBER' ? null : 'UBER')}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold border-2 transition-all"
                    style={selectedTransport === 'UBER'
                      ? { background: '#111', color: '#fff', borderColor: '#111' }
                      : { background: '#fff', color: '#111', borderColor: '#111' }
                    }
                  >
                    UBER
                  </button>
                  <button
                    onClick={handleEnviarSolicitud}
                    disabled={!selectedTransport || selectedShipment.status !== 'Generado'}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={selectedTransport && selectedShipment.status === 'Generado'
                      ? { background: '#16a34a', color: '#fff', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }
                      : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
                    }
                  >
                    Enviar solicitud
                  </button>
                </div>
                {selectedShipment.status !== 'Generado' && (
                  <p className="text-xs text-gray-400 mt-2">
                    Solo disponible para embarques en estado <strong>Generado</strong>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalCrearEmbarque
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          showToast={showToast}
          preOrderId={preSelectedOrderId}
          orderStatuses={state.orderStatuses}
        />
      )}
    </div>
  );
}
