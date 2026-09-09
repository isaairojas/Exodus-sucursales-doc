// ============================================================
// APYMSA — ModalConfirmarRecepcion
// Confirmar que la sucursal YA RECIBIÓ la mercancía (recibido físicamente),
// SIN darle entrada al inventario (tablas digitales de producto).
//   • Entre sucursales: solo confirmación completa/parcial (modificable después;
//     queda registro de cada cambio).
//   • CEDIS: confirmación o escaneo de cajas para saber si faltó alguna.
// Design: Enterprise Precision
// ============================================================
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, formatFechaCorta } from '@/lib/data';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const NAVY = '#1a2b6b';

export default function ModalConfirmarRecepcion({ peticion, onClose, showToast }: Props) {
  const { confirmarRecepcion } = useApp();
  const esCedis = peticion.categoria === 'CEDIS';
  const yaConfirmado = peticion.status === 'Recibido' || peticion.status === 'Entregado';

  const [tipo, setTipo] = useState<'Completa' | 'Parcial'>(peticion.tipoRecepcion ?? 'Completa');
  const [nota, setNota] = useState('');
  const [cajas, setCajas] = useState<number>(esCedis ? (peticion.cajasRecibidas || peticion.cajasTotal) : 0);

  const cajasFaltan = esCedis ? Math.max(0, peticion.cajasTotal - cajas) : 0;
  const tipoEfectivo: 'Completa' | 'Parcial' = esCedis ? (cajasFaltan > 0 ? 'Parcial' : 'Completa') : tipo;

  const setCaja = (n: number) => setCajas(Math.max(0, Math.min(peticion.cajasTotal, n)));

  const handleConfirmar = () => {
    confirmarRecepcion(peticion.id, {
      tipo: tipoEfectivo,
      nota: nota.trim() || undefined,
      cajasRecibidas: esCedis ? cajas : undefined,
    });
    showToast(
      `Recepción confirmada (${tipoEfectivo.toLowerCase()})${esCedis && cajasFaltan > 0 ? ` — faltó(aron) ${cajasFaltan} caja(s)` : ''}. No implica entrada a inventario.`,
      tipoEfectivo === 'Parcial' ? 'warning' : 'success',
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white rounded-xl overflow-hidden" style={{ width: 480, maxWidth: '96vw', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: NAVY, flexShrink: 0 }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>how_to_reg</span>
          <span className="font-bold text-sm text-white">Confirmar recepción</span>
          <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>#{peticion.id}</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
          <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#2563eb' }}>info</span>
            <p className="text-xs" style={{ color: '#374151' }}>
              Confirmas que la sucursal <strong>ya recibió</strong> la mercancía. Esto <strong>no</strong> da entrada al inventario;
              es solo el aviso de recepción y queda registro de cada cambio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><div className="text-[10px] uppercase" style={{ color: '#9ca3af' }}>De</div><div className="font-semibold" style={{ color: NAVY }}>{peticion.sucursalOrigen ?? peticion.sucursalContraparte}</div></div>
            <div><div className="text-[10px] uppercase" style={{ color: '#9ca3af' }}>Papeleta</div><div className="font-semibold" style={{ color: NAVY }}>{peticion.noPapeleta}</div></div>
          </div>

          {esCedis ? (
            <div className="rounded-lg p-4 flex flex-col gap-3" style={{ border: '1px solid #e5e7eb' }}>
              <p className="text-sm font-semibold" style={{ color: NAVY }}>Escaneo / conteo de cajas</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #d7dbe6' }}>
                  <button onClick={() => setCaja(cajas - 1)} className="w-9 h-9 font-bold" style={{ background: '#f2f4f8', color: NAVY }}>−</button>
                  <span className="w-12 text-center text-base font-extrabold" style={{ color: '#1a1a2e' }}>{cajas}</span>
                  <button onClick={() => setCaja(cajas + 1)} className="w-9 h-9 font-bold" style={{ background: '#f2f4f8', color: NAVY }}>+</button>
                </div>
                <button onClick={() => setCaja(cajas + 1)} className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold text-white" style={{ background: '#16a34a' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>barcode_scanner</span>
                  Escanear caja
                </button>
                <span className="text-xs ml-auto" style={{ color: '#6b7280' }}>de <strong style={{ color: NAVY }}>{peticion.cajasTotal}</strong></span>
              </div>
              {cajasFaltan > 0 ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#dc2626' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>report</span>
                  Faltó(aron) {cajasFaltan} caja(s) — se registrará como recepción parcial.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#16a34a' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                  Todas las cajas recibidas — recepción completa.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg p-4 flex flex-col gap-3" style={{ border: '1px solid #e5e7eb' }}>
              <p className="text-sm font-semibold" style={{ color: NAVY }}>Tipo de recepción</p>
              <div className="grid grid-cols-2 gap-2">
                {(['Completa', 'Parcial'] as const).map(op => {
                  const active = tipo === op;
                  const color = op === 'Completa' ? '#16a34a' : '#d97706';
                  return (
                    <button key={op} onClick={() => setTipo(op)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all"
                      style={{ border: `1.5px solid ${active ? color : '#e5e7eb'}`, background: active ? `${color}10` : '#fff', color: active ? color : '#6b7280' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{op === 'Completa' ? 'check_circle' : 'splitscreen'}</span>
                      {op}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px]" style={{ color: '#9ca3af' }}>Puedes cambiarla después; cada cambio queda registrado.</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: '#374151' }}>Nota (opcional)</label>
            <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Observaciones de la recepción…" rows={2}
              className="w-full text-xs rounded border px-3 py-2 resize-none" style={{ borderColor: '#d1d5db', fontFamily: 'Roboto, sans-serif' }} />
          </div>

          {/* Historial de confirmaciones (queda registro) */}
          {peticion.recepcionLog && peticion.recepcionLog.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#6b7280' }}>Registro de recepciones</p>
              <div className="flex flex-col gap-1.5">
                {peticion.recepcionLog.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: '#374151' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: e.tipo === 'Completa' ? '#16a34a' : '#d97706' }}>{e.tipo === 'Completa' ? 'check_circle' : 'splitscreen'}</span>
                    <strong>{e.tipo}</strong>
                    {e.cajasRecibidas != null && <span>· {e.cajasRecibidas}/{e.cajasTotal} cajas</span>}
                    <span style={{ color: '#9ca3af' }}>· {formatFechaCorta(e.fecha)} · {e.usuario}</span>
                    {e.nota && <span style={{ color: '#6b7280' }}>· {e.nota}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>
            Cancelar
          </button>
          <button onClick={handleConfirmar} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: '#16a34a', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>how_to_reg</span>
            {yaConfirmado ? 'Actualizar recepción' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  );
}
