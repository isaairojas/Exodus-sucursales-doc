// ============================================================
// APYMSA — ModalHistorialTraspaso
// Línea de tiempo de estatus para la vista unificada de traspasos
// Design: Enterprise Precision
// ============================================================
import {
  TraspasoPeticion, TRASPASO_STATUS_POR_TIPO, TRASPASO_STATUS_CEDIS,
} from '@/lib/data';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
}

function interpolarFecha(inicio: string, fin: string, frac: number): string {
  const t0 = new Date(inicio.replace(' ', 'T')).getTime();
  const t1 = new Date(fin.replace(' ', 'T')).getTime();
  const t = t0 + (t1 - t0) * frac;
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ModalHistorialTraspaso({ peticion, onClose }: Props) {
  const isCedis = peticion.categoria === 'CEDIS';
  const pipeline = isCedis ? TRASPASO_STATUS_CEDIS : TRASPASO_STATUS_POR_TIPO[peticion.tipo];
  const currentIndex = pipeline.indexOf(peticion.status);

  const etapas = pipeline.map((status, i) => {
    let fecha: string | null = null;
    if (i === 0) fecha = peticion.fechaCreacion;
    else if (i === currentIndex) fecha = peticion.fechaActualizacion;
    else if (i < currentIndex && currentIndex > 0) {
      fecha = interpolarFecha(peticion.fechaCreacion, peticion.fechaActualizacion, i / currentIndex);
    }
    return { status, fecha, done: i <= currentIndex, current: i === currentIndex };
  });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 440, maxWidth: '94vw', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: '#1a2b6b', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>history</span>
          <span className="font-bold text-sm text-white">Historial — #{peticion.id}</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <div className="text-xs mb-4" style={{ color: '#6b7280' }}>
            No. Papeleta <strong style={{ color: '#1a2b6b' }}>{peticion.noPapeleta}</strong> · Solicitud <strong style={{ color: '#1a2b6b' }}>#{peticion.solicitudId}</strong>
          </div>

          <div className="flex flex-col">
            {etapas.map((e, i) => (
              <div key={e.status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{
                      width: 26, height: 26,
                      background: e.done ? (e.current ? '#1a2b6b' : '#16a34a') : '#f3f4f6',
                      border: e.done ? 'none' : '1.5px solid #d1d5db',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 15, color: e.done ? '#fff' : '#9ca3af', fontVariationSettings: e.done ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {e.done ? (e.current ? 'radio_button_checked' : 'check') : 'radio_button_unchecked'}
                    </span>
                  </div>
                  {i < etapas.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 28, background: e.done ? '#16a34a' : '#e5e7eb' }} />
                  )}
                </div>
                <div className="pb-6">
                  <div className="text-sm font-semibold" style={{ color: e.done ? '#1a2b6b' : '#9ca3af' }}>
                    {e.status}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                    {e.fecha ?? 'Pendiente'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
