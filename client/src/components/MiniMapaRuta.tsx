// ============================================================
// APYMSA — MiniMapaRuta
// Mapa SVG mini que dibuja la ruta origen→destino usando OSRM (fallback
// Haversine). Reutilizable: se usa en ModalCotizador y en ScreenEmbarques
// para mostrar la ruta ya persistida del shipment.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { obtenerRutaOSRM, RutaOsrm } from '@/lib/paqueterias';

interface Props {
  origen: string;
  destino: string;
  origenCoords: [number, number];
  destinoCoords: [number, number];
  height?: number;
  compact?: boolean;
}

export default function MiniMapaRuta({ origen, destino, origenCoords, destinoCoords, height = 180, compact = false }: Props) {
  const [ruta, setRuta] = useState<RutaOsrm | null>(null);
  const [cargando, setCargando] = useState(true);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let cancel = false;
    setCargando(true);
    obtenerRutaOSRM(origenCoords, destinoCoords).then(r => {
      if (!cancel) { setRuta(r); setCargando(false); }
    });
    return () => { cancel = true; };
  }, [origenCoords[0], origenCoords[1], destinoCoords[0], destinoCoords[1], reintento]);

  // Detecta fallback (tiempoMin==0 significa que se usó Haversine).
  const usoFallback = ruta && ruta.tiempoMin === 0 && ruta.coords.length === 2;

  const viewBox = useMemo(() => {
    const coords = ruta?.coords?.length ? ruta.coords : [origenCoords, destinoCoords];
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const dLat = Math.max(maxLat - minLat, 0.005);
    const dLng = Math.max(maxLng - minLng, 0.005);
    const padX = dLng * 0.15, padY = dLat * 0.15;
    return { x0: minLng - padX, y0: minLat - padY, dLat: dLat + 2 * padY, dLng: dLng + 2 * padX };
  }, [ruta, origenCoords, destinoCoords]);

  const proj = (c: [number, number]): [number, number] => {
    const x = ((c[1] - viewBox.x0) / viewBox.dLng) * 500;
    const y = 300 - ((c[0] - viewBox.y0) / viewBox.dLat) * 300;
    return [x, y];
  };

  const polylineStr = ruta?.coords?.length
    ? ruta.coords.map(c => { const [x, y] = proj(c); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ')
    : '';
  const [ox, oy] = proj(origenCoords);
  const [dx, dy] = proj(destinoCoords);

  return (
    <div className="w-full rounded-lg overflow-hidden" style={{ background: '#eef4fb', border: '1px solid #e5e7eb' }}>
      {cargando ? (
        <div className="flex items-center justify-center" style={{ height, color: '#64748b', fontSize: 12 }}>
          <span className="material-symbols-outlined mr-1">progress_activity</span>
          Calculando ruta…
        </div>
      ) : (
        <svg viewBox="0 0 500 300" width="100%" style={{ height }} preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="500" height="300" fill="#eef4fb" />
          {polylineStr && (
            <polyline points={polylineStr} fill="none" stroke="#1a2b6b" strokeWidth={compact ? 2 : 3} strokeLinejoin="round" strokeLinecap="round" />
          )}
          <circle cx={ox} cy={oy} r={compact ? 6 : 8} fill="#16a34a" stroke="white" strokeWidth="2" />
          {!compact && <text x={ox + 12} y={oy + 4} fontSize="11" fill="#0f172a" fontWeight="600">{origen}</text>}
          <circle cx={dx} cy={dy} r={compact ? 6 : 8} fill="#dc2626" stroke="white" strokeWidth="2" />
          {!compact && <text x={dx + 12} y={dy + 4} fontSize="11" fill="#0f172a" fontWeight="600">{destino}</text>}
        </svg>
      )}
      {ruta && !cargando && (
        <div className="flex items-center justify-between px-3 py-1" style={{ background: 'white', fontSize: 11, color: '#475569' }}>
          <span><span className="material-symbols-outlined align-middle" style={{ fontSize: 12 }}>route</span> {ruta.distanciaKm} km {usoFallback && '(línea recta)'}</span>
          {ruta.tiempoMin > 0 && <span><span className="material-symbols-outlined align-middle" style={{ fontSize: 12 }}>schedule</span> ~{ruta.tiempoMin} min</span>}
          <a
            href={`https://www.google.com/maps/dir/${origenCoords[0]},${origenCoords[1]}/${destinoCoords[0]},${destinoCoords[1]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold"
            style={{ color: '#1a73e8', textDecoration: 'none' }}
            title="Abrir ruta en Google Maps"
          >
            <span className="material-symbols-outlined align-middle" style={{ fontSize: 12 }}>map</span> Maps
          </a>
          {usoFallback && (
            <button
              onClick={() => setReintento(r => r + 1)}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: '#eef4fb', color: '#1a2b6b', border: '1px solid #cbd5e1' }}
              title="La ruta actual usa distancia en línea recta; reintentar consulta a OSRM"
            >
              <span className="material-symbols-outlined align-middle" style={{ fontSize: 11 }}>refresh</span> Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
