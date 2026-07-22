// ============================================================
// APYMSA — ModalRecepcionTraspaso
// Flujo de "Dar entrada": recepción de mercancía estilo WMS
// (réplica funcional de la pantalla real "Recepción de mercancía")
// Design: Enterprise Precision
// ============================================================
import { useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, TraspasoPiezaDetalle, PRODUCT_CATALOG, TRASPASO_CATEGORIA_LABELS } from '@/lib/data';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Stage = 'scan' | 'success';
type TipoRecepcion = 'Completa' | 'Parcial';

// Ubicación de anaquel simulada, pero estable por código (misma pieza = misma ubicación).
function localizacionMock(code: string): string {
  const hash = code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pasillo = (hash % 8) + 1;
  const nivel = String.fromCharCode(65 + (hash % 4));
  return `Pasillo ${pasillo} - Nivel ${nivel}`;
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  let h = d.getHours();
  const ampm = h >= 12 ? 'P.M.' : 'A.M.';
  h = h % 12 || 12;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-2.5" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
      <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>{title}</h4>
      {children}
    </div>
  );
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>{label}</div>
      <div className="text-xs font-semibold" style={{ color: '#1a2b6b' }}>{children}</div>
    </div>
  );
}

export default function ModalRecepcionTraspaso({ peticion, onClose, showToast }: Props) {
  const { entregarTraspaso } = useApp();
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanInput, setScanInput] = useState('');
  const [stage, setStage] = useState<Stage>('scan');
  const [tipoRecepcion, setTipoRecepcion] = useState<TipoRecepcion>('Completa');
  const [lastScanCode, setLastScanCode] = useState<string | null>(null);
  const [lastGuardado, setLastGuardado] = useState<Date>(new Date());

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
    setLastScanCode(code);
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

  const handleGuardarAvance = () => {
    setLastGuardado(new Date());
    showToast('Avance guardado', 'success');
  };

  const handleImprimirEtiquetas = () => {
    showToast('Etiquetas enviadas a impresión', 'info');
  };

  const handleRecepcionProveedor = () => {
    showToast('Disponible solo para recepción directa de proveedor', 'info');
  };

  const handleTerminarPedido = () => {
    if (tipoRecepcion === 'Completa') {
      if (!isCompleta) {
        showToast('Faltan piezas por escanear para una recepción completa', 'warning');
        return;
      }
      entregarTraspaso(peticion.id, buildPiezasRecibidas());
      showToast(`Traspaso ${peticion.id} recibido (completo)`, 'success');
      setStage('success');
      return;
    }
    if (!confirmParcial) {
      showToast('Debes confirmar que no llegó el faltante', 'warning');
      return;
    }
    if (!motivoParcial.trim()) {
      showToast('Ingresa el motivo del faltante', 'warning');
      return;
    }
    const piezas = buildPiezasRecibidas().map(p =>
      p.qtySurtida < p.qtySolicitada ? { ...p, motivoNegacion: motivoParcial.trim() } : p
    );
    entregarTraspaso(peticion.id, piezas);
    showToast(`Traspaso ${peticion.id} recibido (parcial)`, 'info');
    setStage('success');
  };

  const cajaActiva = Math.min(peticion.cajasRecibidas + 1, peticion.cajasTotal);
  const cajasFaltantes = peticion.cajasTotal - peticion.cajasRecibidas;
  const lastScanProducto = lastScanCode ? PRODUCT_CATALOG[lastScanCode] : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget && stage === 'scan') onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 940, maxWidth: '97vw', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>inventory</span>
          <span className="font-bold text-sm text-white">Recepción de mercancía</span>
          <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            #{peticion.id}
          </span>
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

              {/* Código de barras + Tipo de recepción */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-semibold block mb-2" style={{ color: '#374151' }}>
                    Código de barras
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
                      style={{ borderColor: '#16a34a', background: '#f0fdf4', fontSize: 15, letterSpacing: '0.05em' }}
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
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-2" style={{ color: '#374151' }}>
                    Tipo de recepción
                  </label>
                  <select
                    value={tipoRecepcion}
                    onChange={e => setTipoRecepcion(e.target.value as TipoRecepcion)}
                    className="text-sm rounded-lg border px-3 py-2.5"
                    style={{ borderColor: '#d1d5db' }}
                  >
                    <option value="Completa">Recepción completa</option>
                    <option value="Parcial">Recepción parcial</option>
                  </select>
                </div>
              </div>

              {/* 3 paneles de info + imagen de producto */}
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr 1fr 120px' }}>
                <InfoPanel title="Información del pedido">
                  <InfoField label="Número de pedido">{peticion.pedidoOrigen ? `#${peticion.pedidoOrigen}` : '—'}</InfoField>
                  <InfoField label="Número de papeleta">{peticion.noPapeleta}</InfoField>
                  <InfoField label="Tipo de pedido">
                    {TRASPASO_CATEGORIA_LABELS[peticion.categoria]}{peticion.subtipoCedis ? ` · ${peticion.subtipoCedis}` : ''}
                  </InfoField>
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: '#9ca3af' }}>
                    <input type="checkbox" checked={false} disabled />
                    Mercancía corporativa
                  </label>
                </InfoPanel>

                <InfoPanel title="Información de packing list">
                  <InfoField label="No. de caja activa">{cajaActiva}</InfoField>
                  <InfoField label="No. total de cajas">{peticion.cajasTotal}</InfoField>
                  <InfoField label="Cajas faltantes">{cajasFaltantes}</InfoField>
                </InfoPanel>

                <InfoPanel title="Información de producto escaneado">
                  <InfoField label="Código de barras">{lastScanCode ?? '—'}</InfoField>
                  <InfoField label="Descripción">{lastScanProducto?.name ?? '—'}</InfoField>
                  <InfoField label="Localización de origen">{lastScanCode ? localizacionMock(lastScanCode) : '—'}</InfoField>
                </InfoPanel>

                <div
                  className="rounded-lg flex items-center justify-center"
                  style={{ background: '#fff', border: '1px solid #e5e7eb' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#d1d5db' }}>
                    {lastScanCode ? 'inventory_2' : 'inventory'}
                  </span>
                </div>
              </div>

              {/* Tabla de piezas */}
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
                    {['No.', 'Producto', 'Código de producto SKU', 'Cantidad escaneada', 'Tipo de producto'].map(col => (
                      <th key={col} className="text-left px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {peticion.piezas.map((p, idx) => {
                    const prod = PRODUCT_CATALOG[p.code];
                    const rec = recibidas[p.code] ?? 0;
                    const color = rec >= p.qtySurtida ? '#16a34a' : rec > 0 ? '#d97706' : '#9ca3af';
                    return (
                      <tr key={p.code} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td className="px-3 py-2.5 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2.5" style={{ color: '#374151' }}>{prod?.name ?? p.code}</td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: '#1a2b6b' }}>{p.code}</td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color }}>{rec}/{p.qtySurtida}</td>
                        <td className="px-3 py-2.5" style={{ color: '#6b7280' }}>{prod?.category ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Confirmación de recepción parcial */}
              {tipoRecepcion === 'Parcial' && (
                <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#d97706' }}>Recepción parcial: confirma que no llegará el resto por ahora</p>
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
              {tipoRecepcion === 'Completa' && !isCompleta && hayAlgunaPositiva && (
                <p className="text-xs" style={{ color: '#d97706' }}>
                  Aún hay piezas sin escanear por completo. Cambia a "Recepción parcial" si no llegará el resto, o continúa escaneando.
                </p>
              )}
            </div>

            {/* Barra de acciones */}
            <div className="flex items-center gap-2 px-5 py-3 flex-wrap" style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
              <button
                onClick={handleRecepcionProveedor}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>local_shipping</span>
                Recepción de proveedor (F6)
              </button>
              <button
                onClick={handleImprimirEtiquetas}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>print</span>
                Imprimir Etiquetas (F5)
              </button>
              <button
                onClick={handleGuardarAvance}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>save</span>
                Guardar avance (F9)
              </button>
              <button
                onClick={handleTerminarPedido}
                className="ml-auto flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: '#16a34a', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                Terminar Pedido (F7)
              </button>
            </div>

            {/* Barra de estatus */}
            <div className="px-5 py-2 text-xs" style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb', flexShrink: 0 }}>
              Último avance guardado: {formatTimestamp(lastGuardado)} -{' '}
              <strong style={{ color: '#dc2626' }}>Restan 24:00 horas para cierre automático de traspaso de pedido.</strong>
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
