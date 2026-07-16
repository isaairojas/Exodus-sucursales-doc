// ============================================================
// APYMSA — ModalEmbarcarTraspaso
// Flujo de "Embarcar" (basado en ModalEmbarque del módulo de pedidos):
//   Step 1 — Choose: adjuntar a un embarque existente con el mismo
//             destino (sucursalContraparte) o crear uno nuevo
//   Step 2 — Paquetería (con aviso si cambia la de un embarque
//             existente) + observaciones
//   Step 3 — Success
// ============================================================
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, TRASPASO_PAQUETERIAS } from '@/lib/data';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Step = 'choose' | 'shipment' | 'success';

export default function ModalEmbarcarTraspaso({ peticion, onClose, showToast }: Props) {
  const { embarquesTraspaso, embarcarTraspaso } = useApp();

  const embarquesDisponibles = embarquesTraspaso.filter(
    e => e.sucursalDestino === peticion.sucursalContraparte && e.status !== 'Entregado'
  );

  const [step, setStep] = useState<Step>('choose');
  const [isNew, setIsNew] = useState(false);
  const [selectedEmbarqueId, setSelectedEmbarqueId] = useState<string>(embarquesDisponibles[0]?.id ?? '');
  const [paqueteria, setPaqueteria] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showPaqueteriaWarning, setShowPaqueteriaWarning] = useState(false);
  const [pendingPaqueteria, setPendingPaqueteria] = useState('');
  const [embarqueFinalId, setEmbarqueFinalId] = useState('');

  const selectedEmbarque = embarquesDisponibles.find(e => e.id === selectedEmbarqueId) ?? null;

  // ── Step 1: Choose ──
  const handleChooseExisting = () => {
    setIsNew(false);
    setPaqueteria(selectedEmbarque?.paqueteria ?? '');
    setStep('shipment');
  };
  const handleChooseNew = () => {
    setIsNew(true);
    setPaqueteria('');
    setStep('shipment');
  };

  // ── Paquetería change warning (embarque existente) ──
  const handlePaqueteriaChange = (p: string) => {
    if (!isNew && selectedEmbarque && p !== selectedEmbarque.paqueteria) {
      setPendingPaqueteria(p);
      setShowPaqueteriaWarning(true);
    } else {
      setPaqueteria(p);
    }
  };
  const confirmPaqueteriaChange = () => {
    setPaqueteria(pendingPaqueteria);
    setShowPaqueteriaWarning(false);
    showToast(`Paquetería cambiada a ${pendingPaqueteria}`, 'warning');
  };

  // ── Step 2 → success ──
  const handleConfirmar = () => {
    if (!paqueteria) { showToast('Selecciona una paquetería para continuar.', 'warning'); return; }
    const embarqueId = embarcarTraspaso(peticion.id, {
      embarqueExistenteId: isNew ? undefined : (selectedEmbarque?.id ?? undefined),
      paqueteria,
      observaciones: observaciones.trim() || undefined,
    });
    setEmbarqueFinalId(embarqueId);
    setStep('success');
    showToast('Traspaso embarcado correctamente.', 'success');
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget && step !== 'success') onClose(); }}
    >
      {/* Paquetería change warning overlay */}
      {showPaqueteriaWarning && selectedEmbarque && (
        <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="bg-white rounded-xl p-6 flex flex-col gap-4" style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined flex-shrink-0" style={{ color: '#d97706', fontSize: 24 }}>warning</span>
              <div>
                <p className="font-bold text-sm mb-1" style={{ color: '#1a2b6b' }}>Cambio de paquetería</p>
                <p className="text-sm" style={{ color: '#374151' }}>
                  El embarque <strong>{selectedEmbarque.id}</strong> ya tiene asignada la paquetería
                  <strong> {selectedEmbarque.paqueteria}</strong>. ¿Desea cambiarla a
                  <strong> {pendingPaqueteria}</strong>?
                </p>
                <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>Este cambio afectará a todos los traspasos del embarque.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPaqueteriaWarning(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>
                Cancelar
              </button>
              <button onClick={confirmPaqueteriaChange}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: '#d97706' }}>
                Confirmar cambio
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 560, maxWidth: '96vw', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>local_shipping</span>
          <span className="font-bold text-sm text-white">
            {step === 'choose' && 'Embarcar traspaso'}
            {step === 'shipment' && (isNew ? 'Nuevo embarque' : `Adjuntar a embarque ${selectedEmbarque?.id}`)}
            {step === 'success' && 'Embarque generado'}
          </span>
          {step !== 'success' && (
            <>
              <span className="ml-auto text-xs text-white opacity-70">Petición #{peticion.id}</span>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </>
          )}
        </div>

        {/* ── STEP: CHOOSE ── */}
        {step === 'choose' && (
          <div className="p-6 flex flex-col gap-5 overflow-auto">
            {embarquesDisponibles.length > 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>
                    Se encontraron embarques abiertos con destino a <strong>{peticion.sucursalContraparte}</strong>:
                  </p>
                  <div className="flex flex-col gap-2">
                    {embarquesDisponibles.map(e => (
                      <label key={e.id}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                        style={{
                          border: selectedEmbarqueId === e.id ? '1.5px solid #2563eb' : '1.5px solid #e5e7eb',
                          background: selectedEmbarqueId === e.id ? '#eff6ff' : 'white',
                        }}>
                        <input type="radio" name="embarque" checked={selectedEmbarqueId === e.id}
                          onChange={() => setSelectedEmbarqueId(e.id)}
                          style={{ accentColor: '#1a2b6b' }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm" style={{ color: '#1a2b6b' }}>{e.id}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: '#fef3c7', color: '#92400e' }}>{e.status}</span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                            Traspasos: {e.traspasos.join(', ')} · Paquetería: {e.paqueteria}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleChooseExisting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                    style={{ background: '#1a2b6b' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#2563eb')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = '#1a2b6b')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
                    Adjuntar a embarque seleccionado
                  </button>
                  <button onClick={handleChooseNew}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
                    style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = '#f9fafb')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'white')}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_box</span>
                    Crear nuevo
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
                  No hay embarques activos con destino a <strong>{peticion.sucursalContraparte}</strong>.
                </p>
                <button onClick={handleChooseNew}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white mx-auto transition-all"
                  style={{ background: '#1a2b6b' }}>
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
            {!isNew && selectedEmbarque && (
              <div className="rounded-lg p-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div className="text-xs font-medium mb-1" style={{ color: '#0369a1' }}>Embarque existente</div>
                <div className="text-sm font-bold" style={{ color: '#1a2b6b' }}>{selectedEmbarque.id}</div>
                <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                  Traspasos actuales: {selectedEmbarque.traspasos.join(', ')} + <strong>{peticion.id}</strong> (nuevo)
                </div>
              </div>
            )}

            {/* Paquetería selector */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#374151' }}>
                Paquetería {!isNew && selectedEmbarque && <span style={{ color: '#9ca3af' }}>(actual: {selectedEmbarque.paqueteria})</span>}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TRASPASO_PAQUETERIAS.map(p => (
                  <button key={p}
                    onClick={() => handlePaqueteriaChange(p)}
                    className="px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left"
                    style={{
                      border: paqueteria === p ? '1.5px solid #1a2b6b' : '1.5px solid #e5e7eb',
                      background: paqueteria === p ? '#eff6ff' : 'white',
                      color: paqueteria === p ? '#1a2b6b' : '#374151',
                    }}>
                    {p === 'Uber' && <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 3 }}>directions_car</span>}
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Observaciones</label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Instrucciones especiales para el embarque..."
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                style={{ border: '1.5px solid #d1d5db' }}
                onFocus={e => (e.target.style.borderColor = '#2563eb')}
                onBlur={e => (e.target.style.borderColor = '#d1d5db')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setStep('choose')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                Regresar
              </button>
              <button onClick={handleConfirmar}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: paqueteria ? '#1a2b6b' : '#9ca3af', cursor: paqueteria ? 'pointer' : 'not-allowed' }}
                onMouseEnter={e => { if (paqueteria) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
                onMouseLeave={e => { if (paqueteria) (e.currentTarget as HTMLButtonElement).style.background = '#1a2b6b'; }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                Confirmar embarque
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === 'success' && (
          <div className="flex flex-col items-center p-8 gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#dcfce7', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#16a34a', fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold mb-1" style={{ color: '#1a2b6b' }}>¡Traspaso embarcado!</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>
                Solicitud <strong>#{peticion.solicitudId}</strong> — Petición <strong>#{peticion.id}</strong>
              </div>
              <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>A: {peticion.sucursalContraparte}</div>
              <div className="rounded-lg p-3 text-left mt-3" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', minWidth: 280 }}>
                <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: '#6b7280' }}>
                  {isNew ? 'Nuevo embarque creado' : 'Adjuntado a embarque existente'}
                </div>
                <div className="flex items-center gap-2 py-0.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#16a34a' }}>local_shipping</span>
                  <span className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>{embarqueFinalId}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: '#6b7280' }}>Paquetería: {paqueteria}</div>
              </div>
            </div>
            <button onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: '#1a2b6b' }}
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
