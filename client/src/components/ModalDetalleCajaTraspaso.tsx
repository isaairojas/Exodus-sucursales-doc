// ============================================================
// APYMSA — ModalDetalleCajaTraspaso
// Desglose de cajas para la vista unificada de traspasos
// Design: Enterprise Precision
// ============================================================
import { TraspasoPeticion } from '@/lib/data';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
}

export default function ModalDetalleCajaTraspaso({ peticion, onClose }: Props) {
  const cajas = Array.from({ length: peticion.cajasTotal }, (_, i) => ({
    id: `C${i + 1}`,
    recibida: i < peticion.cajasRecibidas,
  }));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 480, maxWidth: '94vw', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>inventory_2</span>
          <span className="font-bold text-sm text-white">Detalle de caja — #{peticion.id}</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <div className="flex items-center gap-4 mb-5 text-xs" style={{ color: '#6b7280' }}>
            <span>No. Papeleta <strong style={{ color: '#1a2b6b' }}>{peticion.noPapeleta}</strong></span>
            <span>·</span>
            <span><strong style={{ color: '#16a34a' }}>{peticion.cajasRecibidas}</strong> / {peticion.cajasTotal} recibidas</span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {cajas.map(c => (
              <div
                key={c.id}
                className="flex flex-col items-center gap-1.5 rounded-lg py-3"
                style={{
                  background: c.recibida ? 'rgba(22,163,74,0.06)' : '#f9fafb',
                  border: `1px solid ${c.recibida ? 'rgba(22,163,74,0.3)' : '#e5e7eb'}`,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: c.recibida ? '#16a34a' : '#9ca3af' }}>
                  {c.recibida ? 'inventory_2' : 'inventory'}
                </span>
                <span className="text-xs font-semibold" style={{ color: c.recibida ? '#16a34a' : '#6b7280' }}>{c.id}</span>
                <span className="text-[10px]" style={{ color: c.recibida ? '#16a34a' : '#9ca3af' }}>
                  {c.recibida ? 'Recibida' : 'Pendiente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
