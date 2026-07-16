// ============================================================
// APYMSA — ModalRecepcionTraspaso
// Flujo de "Dar entrada": escaneo + confirmación de recepción
// Design: Enterprise Precision
// ============================================================
import { useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, TraspasoPiezaDetalle, PRODUCT_CATALOG } from '@/lib/data';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Stage = 'scan' | 'success';

export default function ModalRecepcionTraspaso({ peticion, onClose, showToast }: Props) {
  const { entregarTraspaso } = useApp();
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanInput, setScanInput] = useState('');
  const [stage, setStage] = useState<Stage>('scan');

  // Cantidades recibidas (se escanean desde cero — recepción abierta, no ciega)
  const [recibidas, setRecibidas] = useState<Record<string, number>>(
    Object.fromEntries(peticion.piezas.map(p => [p.code, 0]))
  );

  // Para confirmación de recepción parcial
  const [confirmParcial, setConfirmParcial] = useState(false);
  const [motivoParcial, setMotivoParcial] = useState('');

  const handleScan = () => {
    const code = scanInput.trim().toUpperCase();
    setScanInput('');
    if (!code) return;
    const pieza = peticion.piezas.find(p => p.code === code);
    if (!pieza) {
      showToast(`Código ${code} no está en esta petición`, 'warning');
      return;
    }
    const actual = recibidas[code] ?? 0;
    if (actual >= pieza.qtySurtida) {
      showToast(`${code}: ya se alcanzó la cantidad enviada (${pieza.qtySurtida})`, 'warning');
      return;
    }
    setRecibidas(prev => ({ ...prev, [code]: actual + 1 }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleScan();
  };

  const isCompleta = peticion.piezas.every(p => (recibidas[p.code] ?? 0) >= p.qtySurtida);
  const hayAlgunaPositiva = peticion.piezas.some(p => (recibidas[p.code] ?? 0) > 0);

  const buildPiezasRecibidas = (): TraspasoPiezaDetalle[] =>
    peticion.piezas.map(p => ({
      code: p.code,
      qtySolicitada: p.qtySolicitada,
      qtySurtida: recibidas[p.code] ?? 0,
    }));

  const handleConfirmarCompleta = () => {
    entregarTraspaso(peticion.id, buildPiezasRecibidas());
    showToast(`Traspaso ${peticion.id} recibido (completo)`, 'success');
    setStage('success');
  };

  const handleConfirmarParcial = () => {
    if (!confirmParcial) {
      showToast('Debes confirmar que no llegó el faltante', 'warning');
      return;
    }
    if (!motivoParcial.trim()) {
      showToast('Ingresa el motivo del faltante', 'warning');
      return;
    }
    const piezas = buildPiezasRecibidas().map(p => {
      if (p.qtySurtida < p.qtySolicitada) return { ...p, motivoNegacion: motivoParcial.trim() };
      return p;
    });
    entregarTraspaso(peticion.id, piezas);
    showToast(`Traspaso ${peticion.id} recibido (parcial)`, 'info');
    setStage('success');
  };

  const getPiezaEstado = (code: string) => {
    const p = peticion.piezas.find(pi => pi.code === code)!;
    const rec = recibidas[code] ?? 0;
    if (rec >= p.qtySurtida) return 'completa';
    if (rec > 0) return 'parcial';
    return 'pendiente';
  };

  const estadoColor = { completa: '#16a34a', parcial: '#d97706', pendiente: '#6b7280' };
  const estadoIcon = { completa: 'check_circle', parcial: 'warning', pendiente: 'radio_button_unchecked' };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget && stage === 'scan') onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 640, maxWidth: '96vw', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>inventory</span>
          <span className="font-bold text-sm text-white">Recepción de traspaso - #{peticion.solicitudId}</span>
          {stage === 'scan' && (
            <button
              onClick={onClose}
              className="ml-auto w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          )}
        </div>

        {stage === 'scan' ? (
          <>
            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">

              {/* Detalles del traspaso */}
              <div className="grid grid-cols-3 gap-3 rounded-lg p-3" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>Petición</div>
                  <div className="text-xs font-semibold" style={{ color: '#1a2b6b' }}>#{peticion.id}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>De</div>
                  <div className="text-xs font-semibold" style={{ color: '#1a2b6b' }}>{peticion.sucursalContraparte}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>Pedido origen</div>
                  <div className="text-xs font-semibold" style={{ color: '#1a2b6b' }}>{peticion.pedidoOrigen ? `#${peticion.pedidoOrigen}` : '—'}</div>
                </div>
              </div>

              {/* Input de escaneo */}
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: '#374151' }}>
                  Escanear o capturar código
                </label>
                <div className="flex gap-2">
                  <input
                    ref={scanRef}
                    type="text"
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="Escanea o captura código…"
                    autoFocus
                    className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-mono"
                    style={{
                      borderColor: '#16a34a',
                      background: '#f0fdf4',
                      fontSize: 15,
                      letterSpacing: '0.05em',
                    }}
                  />
                  <button
                    onClick={handleScan}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                    style={{ background: '#16a34a' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>barcode_scanner</span>
                    Añadir
                  </button>
                </div>
                <p className="text-xs mt-1.5" style={{ color: '#9ca3af' }}>Presiona Enter para añadir la pieza escaneada</p>
              </div>

              {/* Tabla de piezas */}
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
                    {['Código', 'Producto', 'Enviada', 'Recibida', 'Estado'].map(col => (
                      <th key={col} className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {peticion.piezas.map(p => {
                    const estado = getPiezaEstado(p.code);
                    const color = estadoColor[estado];
                    const icon = estadoIcon[estado];
                    const rec = recibidas[p.code] ?? 0;
                    return (
                      <tr key={p.code} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: '#1a2b6b' }}>{p.code}</td>
                        <td className="px-3 py-2.5" style={{ color: '#374151' }}>
                          {PRODUCT_CATALOG[p.code]?.name ?? p.code}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium">{p.qtySurtida}</td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min={0}
                            max={p.qtySurtida}
                            value={rec}
                            onChange={e => {
                              const v = Math.min(p.qtySurtida, Math.max(0, parseInt(e.target.value) || 0));
                              setRecibidas(prev => ({ ...prev, [p.code]: v }));
                            }}
                            className="text-xs rounded border px-2 py-1 text-center w-14"
                            style={{ borderColor: '#d1d5db' }}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-1" style={{ color }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: estado === 'completa' ? "'FILL' 1" : "'FILL' 0" }}>
                              {icon}
                            </span>
                            {estado === 'completa' ? 'Completa' : estado === 'parcial' ? `Parcial (${rec}/${p.qtySurtida})` : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Confirmación parcial */}
              {!isCompleta && hayAlgunaPositiva && (
                <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#d97706' }}>Recepción parcial: hay piezas sin alcanzar la cantidad enviada</p>
                  <label className="flex items-start gap-2 text-xs" style={{ color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={confirmParcial}
                      onChange={e => setConfirmParcial(e.target.checked)}
                      className="mt-0.5"
                      style={{ accentColor: '#d97706' }}
                    />
                    Confirmo que no llegó el faltante en este momento
                  </label>
                  {confirmParcial && (
                    <textarea
                      value={motivoParcial}
                      onChange={e => setMotivoParcial(e.target.value)}
                      placeholder="Motivo del faltante (obligatorio)…"
                      rows={2}
                      className="text-xs rounded border px-3 py-2 resize-none w-full"
                      style={{ borderColor: '#d97706', fontFamily: 'Roboto, sans-serif' }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}
            >
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
              >
                Cancelar
              </button>

              <div className="flex gap-2">
                {!isCompleta && hayAlgunaPositiva && (
                  <button
                    onClick={handleConfirmarParcial}
                    disabled={!confirmParcial || !motivoParcial.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                    style={{
                      background: confirmParcial && motivoParcial.trim() ? '#d97706' : '#9ca3af',
                      cursor: confirmParcial && motivoParcial.trim() ? 'pointer' : 'not-allowed',
                      boxShadow: confirmParcial && motivoParcial.trim() ? '0 2px 8px rgba(217,119,6,0.3)' : 'none',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>warning</span>
                    Confirmar recepción (parcial)
                  </button>
                )}
                {isCompleta && (
                  <button
                    onClick={handleConfirmarCompleta}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                    style={{ background: '#16a34a', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                    Confirmar recepción
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── Success stage ── */
          <div className="flex flex-col items-center p-8 gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#dcfce7', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#16a34a', fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold mb-1" style={{ color: '#1a2b6b' }}>
                ¡Traspaso recibido!
              </div>
              <div className="text-sm" style={{ color: '#6b7280' }}>
                Solicitud <strong>#{peticion.solicitudId}</strong> — Petición <strong>#{peticion.id}</strong>
              </div>
              <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                De: {peticion.sucursalContraparte}
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: '#1a2b6b' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
