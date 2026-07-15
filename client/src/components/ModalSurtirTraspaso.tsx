// ============================================================
// APYMSA — ModalSurtirTraspaso
// Flujo de surtido: escaneo + confirmación de cantidades
// Design: Enterprise Precision
// ============================================================
import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, TraspasoPiezaDetalle, PRODUCT_CATALOG } from '@/lib/data';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function ModalSurtirTraspaso({ peticion, onClose, showToast }: Props) {
  const { surtirTraspaso } = useApp();
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanInput, setScanInput] = useState('');

  // Estado de cantidades surtidas (mutable durante el flujo)
  const [surtidas, setSurtidas] = useState<Record<string, number>>(
    Object.fromEntries(peticion.piezas.map(p => [p.code, p.qtySurtida]))
  );

  // Para confirmación de surtido parcial
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
    const actual = surtidas[code] ?? 0;
    if (actual >= pieza.qtySolicitada) {
      showToast(`${code}: ya se alcanzó la cantidad solicitada (${pieza.qtySolicitada})`, 'warning');
      return;
    }
    setSurtidas(prev => ({ ...prev, [code]: actual + 1 }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleScan();
  };

  const isCompleta = peticion.piezas.every(p => (surtidas[p.code] ?? 0) >= p.qtySolicitada);
  const hayAlgunaPositiva = peticion.piezas.some(p => (surtidas[p.code] ?? 0) > 0);

  const buildPiezasSurtidas = (): TraspasoPiezaDetalle[] =>
    peticion.piezas.map(p => ({
      code: p.code,
      qtySolicitada: p.qtySolicitada,
      qtySurtida: surtidas[p.code] ?? 0,
    }));

  const handleConfirmarCompleta = () => {
    surtirTraspaso(peticion.id, buildPiezasSurtidas());
    showToast(`Traspaso ${peticion.id} marcado como surtido (completo)`, 'success');
    onClose();
  };

  const handleConfirmarParcial = () => {
    if (!confirmParcial) {
      showToast('Debes confirmar que no puedes surtir el faltante', 'warning');
      return;
    }
    if (!motivoParcial.trim()) {
      showToast('Ingresa el motivo del faltante', 'warning');
      return;
    }
    const piezas = buildPiezasSurtidas().map(p => {
      if (p.qtySurtida < p.qtySolicitada) return { ...p, motivoNegacion: motivoParcial.trim() };
      return p;
    });
    surtirTraspaso(peticion.id, piezas);
    showToast(`Traspaso ${peticion.id} marcado como surtido (parcial)`, 'info');
    onClose();
  };

  const getPiezaEstado = (code: string) => {
    const p = peticion.piezas.find(pi => pi.code === code)!;
    const surt = surtidas[code] ?? 0;
    if (surt >= p.qtySolicitada) return 'completa';
    if (surt > 0) return 'parcial';
    return 'pendiente';
  };

  const estadoColor = { completa: '#16a34a', parcial: '#d97706', pendiente: '#6b7280' };
  const estadoIcon = { completa: 'check_circle', parcial: 'warning', pendiente: 'radio_button_unchecked' };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 600, maxWidth: '96vw', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>package_2</span>
          <span className="font-bold text-sm text-white">Surtir Traspaso</span>
          <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            #{peticion.id}
          </span>
          <span className="ml-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>→ {peticion.sucursalContraparte}</span>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">

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
                  borderColor: '#d97706',
                  background: '#fefce8',
                  fontSize: 15,
                  letterSpacing: '0.05em',
                }}
              />
              <button
                onClick={handleScan}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: '#d97706' }}
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
                {['Código', 'Producto', 'Solicitada', 'Surtida', 'Estado'].map(col => (
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
                const surt = surtidas[p.code] ?? 0;
                return (
                  <tr key={p.code} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: '#1a2b6b' }}>{p.code}</td>
                    <td className="px-3 py-2.5" style={{ color: '#374151' }}>
                      {PRODUCT_CATALOG[p.code]?.name ?? p.code}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium">{p.qtySolicitada}</td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min={0}
                        max={p.qtySolicitada}
                        value={surt}
                        onChange={e => {
                          const v = Math.min(p.qtySolicitada, Math.max(0, parseInt(e.target.value) || 0));
                          setSurtidas(prev => ({ ...prev, [p.code]: v }));
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
                        {estado === 'completa' ? 'Completa' : estado === 'parcial' ? `Parcial (${surt}/${p.qtySolicitada})` : 'Pendiente'}
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
              <p className="text-xs font-semibold" style={{ color: '#d97706' }}>Surtido parcial: hay piezas sin alcanzar la cantidad solicitada</p>
              <label className="flex items-start gap-2 text-xs" style={{ color: '#374151', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={confirmParcial}
                  onChange={e => setConfirmParcial(e.target.checked)}
                  className="mt-0.5"
                  style={{ accentColor: '#d97706' }}
                />
                Confirmo que no puedo surtir el faltante en este momento
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
                Marcar como surtida (parcial)
              </button>
            )}
            {isCompleta && (
              <button
                onClick={handleConfirmarCompleta}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: '#16a34a', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                Marcar como surtida (completa)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
