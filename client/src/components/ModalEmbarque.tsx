// ============================================================
// APYMSA — Modal: Embarque
// Flow:
//   Step 1 — Choose: attach to existing shipment OR create new
//   Step 2 — If existing: show existing shipment info + carrier
//             selector (warn if changing carrier) + observations
//   Step 2 — If new: carrier selector + observations
//   Step 3 — If Uber: pre-filled delivery form, empty package type
//   Step 4 — Success: list pedidos in the shipment
// ============================================================
import { useState } from 'react';
import { Order } from '@/lib/data';

interface Props {
  order: Order;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

// Simulated existing shipments for this client (not in "Reparto iniciado")
const EXISTING_SHIPMENTS = [
  {
    id: 'EMB-40575',
    pedidos: ['1064770', '1064771'],
    carrier: 'DHL Express',
    status: 'Pendiente',
    cliente: 'CLIENTE MO',
  },
  {
    id: 'EMB-40562',
    pedidos: ['1064768'],
    carrier: 'FedEx',
    status: 'En preparación',
    cliente: 'CLIENTE MO',
  },
];

const CARRIERS = ['DHL Express', 'FedEx', 'Uber', 'Transportes Castores', 'Redpack', 'Transporte Interno'];

// Last Uber delivery data for this client
const UBER_DEFAULTS = {
  direccion: 'SANTA ESTHER 227 Y 229',
  dpto: 'Interior',
  referencias: 'TALLER ELECTRICO FRENTE CARNITAS LA PIEDAD',
  receptor: 'ARROYO LUJAN PABLO ALBERTO',
  telefono: '6461883377',
  descripcion: 'Varios',
};

type Step = 'choose' | 'shipment' | 'uber' | 'success';

export default function ModalEmbarque({ order, onClose, showToast }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [isNew, setIsNew] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(EXISTING_SHIPMENTS[0]);
  const [carrier, setCarrier] = useState('');
  const [observations, setObservations] = useState('');
  const [showCarrierWarning, setShowCarrierWarning] = useState(false);
  const [pendingCarrier, setPendingCarrier] = useState('');

  // Uber form
  const [uberData, setUberData] = useState({ ...UBER_DEFAULTS });
  const [packageType, setPackageType] = useState<'Bolsa' | 'Paquete' | ''>('');

  // Final pedidos list (for success screen)
  const [finalPedidos, setFinalPedidos] = useState<string[]>([]);

  // ── Step 1: Choose ──
  const handleChooseExisting = () => {
    setIsNew(false);
    setCarrier(selectedShipment.carrier);
    setStep('shipment');
  };
  const handleChooseNew = () => {
    setIsNew(true);
    setCarrier('');
    setStep('shipment');
  };

  // ── Carrier change warning (existing shipment) ──
  const handleCarrierChange = (newCarrier: string) => {
    if (!isNew && newCarrier !== selectedShipment.carrier) {
      setPendingCarrier(newCarrier);
      setShowCarrierWarning(true);
    } else {
      setCarrier(newCarrier);
    }
  };
  const confirmCarrierChange = () => {
    setCarrier(pendingCarrier);
    setShowCarrierWarning(false);
    showToast(`Paquetería cambiada a ${pendingCarrier}`, 'warning');
  };

  // ── Step 2 → 3 or success ──
  const handleContinue = () => {
    if (!carrier) { showToast('Seleccione una paquetería para continuar.', 'warning'); return; }
    if (carrier === 'Uber') {
      setStep('uber');
    } else {
      // Build final pedidos list
      const pedidos = isNew
        ? [order.id]
        : [...selectedShipment.pedidos, order.id];
      setFinalPedidos(pedidos);
      setStep('success');
      showToast('Embarque generado correctamente.', 'success');
    }
  };

  // ── Uber step → success ──
  const handleUberAccept = () => {
    if (!packageType) { showToast('Seleccione el tipo de paquete.', 'warning'); return; }
    const pedidos = isNew
      ? [order.id]
      : [...selectedShipment.pedidos, order.id];
    setFinalPedidos(pedidos);
    setStep('success');
    showToast('Solicitud de Uber generada correctamente.', 'success');
  };

  const updateUber = (key: keyof typeof UBER_DEFAULTS, val: string) =>
    setUberData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}>

      {/* Carrier change warning overlay */}
      {showCarrierWarning && (
        <div className="absolute inset-0 z-10 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4"
            style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined flex-shrink-0" style={{ color: '#d97706', fontSize: 24 }}>warning</span>
              <div>
                <p className="font-bold text-sm mb-1" style={{ color: '#1a2b6b' }}>Cambio de paquetería</p>
                <p className="text-sm" style={{ color: '#374151' }}>
                  El embarque <strong>{selectedShipment.id}</strong> ya tiene asignada la paquetería
                  <strong> {selectedShipment.carrier}</strong>. ¿Desea cambiarla a
                  <strong> {pendingCarrier}</strong>?
                </p>
                <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                  Este cambio afectará a todos los pedidos del embarque.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCarrierWarning(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}>
                Cancelar
              </button>
              <button onClick={confirmCarrierChange}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#d97706', fontFamily: 'Roboto, sans-serif' }}>
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl flex flex-col"
        style={{ width: 560, maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'modalIn 0.25s ease' }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4"
          style={{ borderBottom: '1px solid #e5e7eb', background: '#1a2b6b', borderRadius: '12px 12px 0 0' }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>local_shipping</span>
          <span className="font-bold text-sm text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
            {step === 'choose' && 'Gestión de embarque'}
            {step === 'shipment' && (isNew ? 'Nuevo embarque' : `Adjuntar a embarque ${selectedShipment.id}`)}
            {step === 'uber' && 'Confirmar solicitud Uber'}
            {step === 'success' && 'Embarque generado'}
          </span>
          <span className="ml-auto text-xs text-white opacity-70">Pedido #{order.id}</span>
        </div>

        {/* ── STEP: CHOOSE ── */}
        {step === 'choose' && (
          <div className="p-6 flex flex-col gap-5 overflow-auto">
            {EXISTING_SHIPMENTS.length > 0 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>
                    Se encontraron embarques del cliente <strong>{order.cliente}</strong> que aún no están en "Reparto iniciado":
                  </p>
                  <div className="flex flex-col gap-2">
                    {EXISTING_SHIPMENTS.map(s => (
                      <label key={s.id}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                        style={{
                          border: selectedShipment.id === s.id ? '1.5px solid #2563eb' : '1.5px solid #e5e7eb',
                          background: selectedShipment.id === s.id ? '#eff6ff' : 'white',
                        }}>
                        <input type="radio" name="shipment" checked={selectedShipment.id === s.id}
                          onChange={() => setSelectedShipment(s)}
                          style={{ accentColor: '#1a2b6b' }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm" style={{ color: '#1a2b6b' }}>{s.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ background: '#fef3c7', color: '#92400e' }}>{s.status}</span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                            Pedidos: {s.pedidos.join(', ')} · Paquetería: {s.carrier}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleChooseExisting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                    style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#1a2b6b')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
                    Adjuntar a embarque seleccionado
                  </button>
                  <button onClick={handleChooseNew}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
                    style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_box</span>
                    Crear nuevo
                  </button>
                </div>
              </>
            )}
            {EXISTING_SHIPMENTS.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm mb-4" style={{ color: '#6b7280' }}>No hay embarques activos para este cliente.</p>
                <button onClick={handleChooseNew}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white mx-auto transition-all"
                  style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_box</span>
                  Crear nuevo embarque
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP: SHIPMENT (existing or new) ── */}
        {step === 'shipment' && (
          <div className="p-6 flex flex-col gap-4 overflow-auto">
            {!isNew && (
              <div className="rounded-lg p-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#0369a1' }}>Embarque existente</div>
                <div className="text-sm font-bold" style={{ color: '#1a2b6b' }}>{selectedShipment.id}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                  Pedidos actuales: {selectedShipment.pedidos.join(', ')} + <strong>{order.id}</strong> (nuevo)
                </div>
              </div>
            )}

            {/* Carrier selector */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151' }}>
                Paquetería {!isNew && <span style={{ color: '#9ca3af' }}>(actual: {selectedShipment.carrier})</span>}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CARRIERS.map(c => (
                  <button key={c}
                    onClick={() => handleCarrierChange(c)}
                    className="px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left"
                    style={{
                      border: carrier === c ? '1.5px solid #1a2b6b' : '1.5px solid #e5e7eb',
                      background: carrier === c ? '#eff6ff' : 'white',
                      color: carrier === c ? '#1a2b6b' : '#374151',
                      fontFamily: 'Roboto, sans-serif',
                    }}>
                    {c === 'Uber' && <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 3 }}>directions_car</span>}
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Observaciones</label>
              <textarea
                value={observations}
                onChange={e => setObservations(e.target.value)}
                rows={3}
                placeholder="Instrucciones especiales para el embarque..."
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                style={{ border: '1.5px solid #d1d5db', fontFamily: 'Roboto, sans-serif' }}
                onFocus={e => (e.target.style.borderColor = '#2563eb')}
                onBlur={e => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setStep('choose')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                Regresar
              </button>
              <button onClick={handleContinue}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: carrier ? '#1a2b6b' : '#9ca3af', cursor: carrier ? 'pointer' : 'not-allowed', fontFamily: 'Roboto, sans-serif' }}
                onMouseEnter={e => { if (carrier) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
                onMouseLeave={e => { if (carrier) (e.currentTarget as HTMLButtonElement).style.background = '#1a2b6b'; }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: UBER ── */}
        {step === 'uber' && (
          <div className="p-6 flex flex-col gap-4 overflow-auto">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: 20 }}>directions_car</span>
              <span className="text-sm font-bold" style={{ color: '#1a2b6b' }}>Confirmar solicitud Uber</span>
            </div>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              Datos prellenados con el último envío a esta dirección del cliente. Verifique y edite si es necesario.
            </p>

            {/* EmbarqueID */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>EmbarqueID</label>
              <input readOnly value={isNew ? 'EMB-NUEVO' : selectedShipment.id}
                className="w-full px-2.5 py-1.5 rounded border text-sm"
                style={{ border: '1px solid #d1d5db', background: '#f9fafb', fontFamily: 'Roboto, sans-serif' }} />
            </div>

            <p className="text-xs font-medium" style={{ color: '#2563eb' }}>
              Por favor, valida la información de envío, y si es correcta, selecciona cada uno de los cuadros vacíos.
            </p>

            {/* Uber fields */}
            {([
              { key: 'direccion', label: 'Dirección de entrega' },
              { key: 'dpto', label: 'Dpto/Oficina/Piso' },
              { key: 'referencias', label: 'Referencias de la dirección' },
              { key: 'receptor', label: 'Nombre de quién recibe' },
              { key: 'telefono', label: 'Teléfono de quién recibe' },
              { key: 'descripcion', label: 'Descripción de artículo' },
            ] as { key: keyof typeof UBER_DEFAULTS; label: string }[]).map(f => (
              <div key={f.key} className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{f.label}</label>
                  <input
                    value={uberData[f.key]}
                    onChange={e => updateUber(f.key, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border text-sm outline-none"
                    style={{ border: '1.5px solid #d1d5db', fontFamily: 'Roboto, sans-serif' }}
                    onFocus={e => (e.target.style.borderColor = '#2563eb')}
                    onBlur={e => (e.target.style.borderColor = '#d1d5db')}
                  />
                </div>
                <div className="mt-6">
                  <input type="checkbox" defaultChecked className="w-4 h-4" style={{ accentColor: '#1a2b6b' }} />
                </div>
              </div>
            ))}

            {/* Package type — empty by default */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151' }}>
                Tipo de paquete <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div className="flex gap-4">
                {(['Bolsa', 'Paquete'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: '#374151' }}>
                    <input type="radio" name="packageType" value={t}
                      checked={packageType === t}
                      onChange={() => setPackageType(t)}
                      style={{ accentColor: '#1a2b6b', width: 16, height: 16 }} />
                    {t}
                  </label>
                ))}
              </div>
              {!packageType && (
                <p className="text-xs mt-1" style={{ color: '#dc2626' }}>Seleccione el tipo de paquete para continuar.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setStep('shipment')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                Regresar
              </button>
              <button onClick={handleUberAccept}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: packageType ? '#16a34a' : '#9ca3af', cursor: packageType ? 'pointer' : 'not-allowed', fontFamily: 'Roboto, sans-serif' }}
                onMouseEnter={e => { if (packageType) (e.currentTarget as HTMLButtonElement).style.background = '#15803d'; }}
                onMouseLeave={e => { if (packageType) (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                Aceptar
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === 'success' && (
          <div className="p-8 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#dcfce7', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#16a34a', fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold mb-1" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
                {carrier === 'Uber'
                  ? 'Solicitud de Uber generada correctamente'
                  : 'Embarque generado correctamente'}
              </div>
              <div className="text-sm mb-3" style={{ color: '#6b7280' }}>
                {carrier === 'Uber'
                  ? `Solicitud de Uber para los pedidos:`
                  : `${isNew ? 'Nuevo embarque creado' : `Adjuntado a ${selectedShipment.id}`} con paquetería ${carrier}`}
              </div>
              {carrier === 'Uber' && (
                <div className="text-sm mb-3" style={{ color: '#374151' }}>
                  {finalPedidos.map((p, i) => (
                    <span key={p}>
                      <strong>{p}</strong>{i < finalPedidos.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
              {carrier !== 'Uber' && (
                <div className="rounded-lg p-3 text-left" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', minWidth: 300 }}>
                  <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#6b7280' }}>
                    Pedidos en el embarque
                  </div>
                  {finalPedidos.map(p => (
                    <div key={p} className="flex items-center gap-2 py-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#16a34a' }}>inventory_2</span>
                      <span className="text-sm font-semibold" style={{ color: p === order.id ? '#2563eb' : '#374151' }}>
                        {p} {p === order.id ? '(este pedido)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
              onMouseLeave={e => (e.currentTarget.style.background = '#1a2b6b')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
