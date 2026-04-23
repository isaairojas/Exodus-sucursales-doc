// ============================================================
// APYMSA — Modal: Facturación
// Simulates: invoice form → timbrado → success
// Props:
//   onFacturado  — called when invoice is confirmed (updates order status)
//   onClose      — called when user closes (returns to caller screen)
//   showToast    — toast notifications
//   origen       — 'pedidos' | 'revision' (controls post-success behavior)
// ============================================================
import { useState } from 'react';
import { Order } from '@/lib/data';
import ModalEmbarque from './ModalEmbarque';

interface Props {
  order: Order;
  onClose: () => void;
  onFacturado?: () => void;   // called after successful invoice to update order status
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

type Stage = 'form' | 'timbrado' | 'success';

// Simulated invoice data
const FACTURA_DATA = {
  documento: '358144',
  numPedido: (id: string) => id,
  cliente: (c: string) => c,
  clienteId: (id: string) => id,
  referencia: '80362',
  usuario: 'ISAI011',
  correo: 'cliente@ejemplo.com',
  total: (t: string) => t,
};

export default function ModalFacturacion({ order, onClose, onFacturado, showToast }: Props) {
  const [stage, setStage] = useState<Stage>('form');
  const [timbradoProgress, setTimbradoProgress] = useState(0);
  const [showEmbarque, setShowEmbarque] = useState(false);

  // Form state
  const [correo, setCorreo] = useState(FACTURA_DATA.correo);
  const [pagoContado, setPagoContado] = useState(false);
  const [pagoWebPay, setPagoWebPay] = useState(false);
  const [impOriginal, setImpOriginal] = useState(true);
  const [impCopia, setImpCopia] = useState(true);

  const handleAceptar = () => {
    setStage('timbrado');
    let prog = 0;
    const iv = setInterval(() => {
      prog += Math.random() * 18 + 8;
      if (prog >= 100) {
        prog = 100;
        clearInterval(iv);
        setTimeout(() => {
          setStage('success');
          // Notify parent to update order status to Facturado
          onFacturado?.();
        }, 400);
      }
      setTimbradoProgress(Math.min(prog, 100));
    }, 180);
  };

  // When user clicks "Cerrar" on success screen — just close, order already updated
  const handleCerrar = () => {
    showToast(`Pedido #${order.id} facturado correctamente`, 'success');
    onClose();
  };

  if (showEmbarque) {
    return (
      <ModalEmbarque
        order={order}
        onClose={onClose}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}>
      <div className="bg-white rounded-xl flex flex-col"
        style={{ width: 520, maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'modalIn 0.25s ease' }}>

        {/* ── FORM STAGE ── */}
        {stage === 'form' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #e5e7eb', background: '#1a2b6b', borderRadius: '12px 12px 0 0' }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>receipt_long</span>
                <span className="font-bold text-sm text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Agregar remisión-factura
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded text-xs font-bold text-white"
                  style={{ background: '#2563eb' }}>Factura</span>
                <span className="text-xs text-white opacity-75">Venta a crédito</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-3 overflow-auto">
              {/* Grid of fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: 'Documento', value: FACTURA_DATA.documento, readOnly: true },
                  { label: 'Núm. Pedido', value: FACTURA_DATA.numPedido(order.id), readOnly: true },
                  { label: 'Cliente', value: `${FACTURA_DATA.clienteId(order.clienteId)}  ${FACTURA_DATA.cliente(order.cliente)}`, readOnly: true, span: true },
                  { label: 'Referencia', value: FACTURA_DATA.referencia, readOnly: true },
                  { label: 'Usuario', value: FACTURA_DATA.usuario, readOnly: true },
                ].map(f => (
                  <div key={f.label} className={f.span ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>{f.label}</label>
                    <input
                      readOnly={f.readOnly}
                      defaultValue={f.value}
                      className="w-full px-2.5 py-1.5 rounded border text-sm outline-none"
                      style={{ border: '1px solid #d1d5db', background: f.readOnly ? '#f9fafb' : 'white', fontFamily: 'Roboto, sans-serif', color: '#111827' }}
                    />
                  </div>
                ))}

                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>
                    Correo para envío de factura electrónica
                  </label>
                  <input
                    type="email"
                    value={correo}
                    onChange={e => setCorreo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border text-sm outline-none"
                    style={{ border: '1.5px solid #2563eb', fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
              </div>

              {/* Impresión checkboxes */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium" style={{ color: '#374151' }}>Impresión:</span>
                {[
                  { label: 'Original', val: impOriginal, set: setImpOriginal },
                  { label: 'Copia', val: impCopia, set: setImpCopia },
                ].map(cb => (
                  <label key={cb.label} className="flex items-center gap-1.5 cursor-pointer text-sm" style={{ color: '#374151' }}>
                    <input type="checkbox" checked={cb.val} onChange={e => cb.set(e.target.checked)}
                      className="w-4 h-4 rounded" style={{ accentColor: '#1a2b6b' }} />
                    {cb.label}
                  </label>
                ))}
              </div>

              {/* Pago checkboxes */}
              <div className="flex items-center gap-4">
                {[
                  { label: 'Pago contado', val: pagoContado, set: setPagoContado },
                  { label: 'Pago WebPay', val: pagoWebPay, set: setPagoWebPay },
                ].map(cb => (
                  <label key={cb.label} className="flex items-center gap-1.5 cursor-pointer text-sm" style={{ color: '#374151' }}>
                    <input type="checkbox" checked={cb.val} onChange={e => cb.set(e.target.checked)}
                      className="w-4 h-4 rounded" style={{ accentColor: '#1a2b6b' }} />
                    {cb.label}
                  </label>
                ))}
              </div>

              {/* Address */}
              <div className="rounded-lg p-3 text-xs" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>location_on</span>
                Calle: SANTA ESTHER 227 Y 229, Colonia: STA. MARGARITA PRIMERA SECCIÓN, Ciudad: Zapopan, Estado: Jalisco
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium" style={{ color: '#374151' }}>Total</span>
                <span className="text-2xl font-bold" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>{order.total}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                style={{ border: '1.5px solid #dc2626', color: '#dc2626', background: 'white', fontFamily: 'Roboto, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
                Cancelar
              </button>
              <button onClick={handleAceptar}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: '#16a34a', fontFamily: 'Roboto, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#15803d')}
                onMouseLeave={e => (e.currentTarget.style.background = '#16a34a')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                Aceptar
              </button>
            </div>
          </>
        )}

        {/* ── TIMBRADO STAGE ── */}
        {stage === 'timbrado' && (
          <div className="flex flex-col items-center justify-center p-10 gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#eff6ff', animation: 'scannerPulse 1.2s ease-in-out infinite' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#2563eb', animation: 'spin 1.5s linear infinite' }}>
                sync
              </span>
            </div>
            <div className="text-base font-bold" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
              Timbrando factura...
            </div>
            <div className="w-full max-w-xs">
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#dbeafe' }}>
                <div className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${timbradoProgress}%`, background: '#2563eb' }} />
              </div>
              <p className="text-center text-xs mt-2" style={{ color: '#6b7280' }}>
                {Math.round(timbradoProgress)}% — Conectando con el SAT...
              </p>
            </div>
          </div>
        )}

        {/* ── SUCCESS STAGE ── */}
        {stage === 'success' && (
          <div className="flex flex-col items-center p-8 gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#dcfce7', animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#16a34a', fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold mb-1" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
                Factura generada con éxito
              </div>
              <div className="text-sm" style={{ color: '#6b7280' }}>
                Documento <strong>{FACTURA_DATA.documento}</strong> — Pedido <strong>{order.id}</strong>
              </div>
              <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                Factura enviada a: {correo}
              </div>
            </div>

            <div className="flex gap-3 mt-2 flex-wrap justify-center">
              {/* Reimprimir */}
              <button
                onClick={() => showToast('Reimprimiendo factura...', 'info')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
                Reimprimir
              </button>

              {/* Cerrar — regresa a la pantalla de origen */}
              <button
                onClick={handleCerrar}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
                style={{ border: '1.5px solid #6b7280', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                Cerrar
              </button>

              {/* Crear embarque — opcional */}
              <button
                onClick={() => setShowEmbarque(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
                onMouseLeave={e => (e.currentTarget.style.background = '#1a2b6b')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>local_shipping</span>
                Crear embarque
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
