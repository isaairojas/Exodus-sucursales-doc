// ============================================================
// APYMSA — ModalReasignarTraspaso
// Reasignación de una petición RECHAZADA (o con faltante). Se parece a la
// ventana de nueva solicitud, pero:
//   • El pedido origen ya viene seleccionado y NO se puede cambiar.
//   • Las piezas son el faltante de la petición (solo lectura).
//   • Muestra las opciones que calcula SMC 4.0 (excluye la sucursal que rechazó
//     y el destino). El usuario elige una.
//   • Si no se puede reasignar (sin intentos o sin sucursal elegible), se avisa.
// Design: Enterprise Precision
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoPeticion, PRODUCT_CATALOG, EXISTENCIA_POR_SUCURSAL, SUCURSAL_DISTANCIA_ORDEN,
} from '@/lib/data';
import { MAX_EVALUACIONES_PETICION } from '@/lib/traspasoConfig';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const NAVY = '#1a2b6b';

interface OpcionReasignacion {
  sucursal: string;
  cubre: boolean;      // cubre todo el faltante con su existencia
  mejor: boolean;      // primera opción que cubre (recomendada por SMC)
}

export default function ModalReasignarTraspaso({ peticion, onClose, showToast }: Props) {
  const { reasignarPeticionA } = useApp();

  // Faltante = lo solicitado que no se surtió.
  const faltante = useMemo(
    () => peticion.piezas
      .filter(p => p.qtySurtida < p.qtySolicitada)
      .map(p => ({ code: p.code, qty: p.qtySolicitada - p.qtySurtida })),
    [peticion]
  );

  // Sucursales excluidas: la que rechazó/surtió, el destino y las ya descartadas.
  const excluir = useMemo(
    () => Array.from(new Set([
      peticion.sucursalOrigen, peticion.sucursalDestino, ...(peticion.sucursalesExcluidas ?? []),
    ].filter(Boolean) as string[])),
    [peticion]
  );

  const sinIntentos = (peticion.intento ?? 1) >= MAX_EVALUACIONES_PETICION;

  // Opciones que "propone SMC 4.0": sucursales elegibles ordenadas por cercanía.
  const opciones = useMemo<OpcionReasignacion[]>(() => {
    const candidatos = SUCURSAL_DISTANCIA_ORDEN.filter(s => !excluir.includes(s));
    let mejorMarcada = false;
    return candidatos.slice(0, 3).map(suc => {
      const stock = EXISTENCIA_POR_SUCURSAL[suc] ?? {};
      const cubre = faltante.every(f => (stock[f.code] ?? 0) >= f.qty);
      const mejor = cubre && !mejorMarcada;
      if (mejor) mejorMarcada = true;
      return { sucursal: suc, cubre, mejor };
    });
  }, [excluir, faltante]);

  const noSePuede = sinIntentos || opciones.length === 0 || faltante.length === 0;

  const [calculando, setCalculando] = useState(true);
  const [elegida, setElegida] = useState<string | null>(null);

  useEffect(() => {
    if (noSePuede) { setCalculando(false); return; }
    const t = window.setTimeout(() => setCalculando(false), 1500);
    return () => window.clearTimeout(t);
  }, [noSePuede]);

  const handleConfirmar = () => {
    if (!elegida) return;
    const r = reasignarPeticionA(peticion.id, elegida);
    showToast(r.mensaje, r.ok ? 'success' : 'warning');
    if (r.ok) onClose();
  };

  const motivoNoSePuede = sinIntentos
    ? `Se agotó el máximo de ${MAX_EVALUACIONES_PETICION} evaluaciones para esta necesidad. La solicitud ya no puede reasignarse a otra sucursal.`
    : faltante.length === 0
      ? 'Esta petición no tiene mercancía pendiente por reasignar.'
      : 'SMC 4.0 no encontró otra sucursal elegible (todas están excluidas por ser el destino, la que rechazó o una descartada previamente).';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col bg-white rounded-xl overflow-hidden"
        style={{ width: 620, maxWidth: '96vw', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: NAVY, flexShrink: 0 }}>
          <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>alt_route</span>
          <span className="font-bold text-sm text-white">Reasignación de traspaso</span>
          <span className="ml-1 px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>#reasignación</span>
          <span className="ml-1 px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{peticion.id}</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
          {/* Pedido origen (fijo) + piezas del faltante (solo lectura) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: 'rgba(26,43,107,0.05)', border: '1px solid rgba(26,43,107,0.2)' }}>
              <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: '#9ca3af' }}>Pedido origen (no editable)</div>
              <div className="font-bold text-sm mt-0.5 flex items-center gap-1.5" style={{ color: NAVY }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>lock</span>
                {peticion.pedidoOrigen || 'Sin pedido'}
              </div>
            </div>
            <div className="rounded-lg p-3" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
              <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: '#9ca3af' }}>Sucursal que rechazó</div>
              <div className="font-bold text-sm mt-0.5" style={{ color: '#dc2626' }}>{peticion.sucursalOrigen ?? peticion.sucursalContraparte}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: NAVY }}>Piezas a reasignar (faltante)</div>
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              {faltante.map(f => (
                <div key={f.code} className="flex items-center justify-between px-3 py-2 text-xs" style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ color: '#374151' }}><strong style={{ color: NAVY }}>{f.code}</strong> — {PRODUCT_CATALOG[f.code]?.name}</span>
                  <span className="font-semibold" style={{ color: NAVY }}>x{f.qty}</span>
                </div>
              ))}
              {faltante.length === 0 && <div className="px-3 py-3 text-xs text-center" style={{ color: '#9ca3af' }}>Sin faltante</div>}
            </div>
          </div>

          {/* Opciones SMC 4.0 / bloqueo */}
          {noSePuede ? (
            <div className="rounded-lg p-4 flex items-start gap-2" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#dc2626' }}>block</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#b91c1c' }}>No se puede reasignar</p>
                <p className="text-xs mt-1" style={{ color: '#374151' }}>{motivoNoSePuede}</p>
              </div>
            </div>
          ) : calculando ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="animate-spin rounded-full" style={{ width: 50, height: 50, border: '4px solid #e5e7eb', borderTopColor: NAVY }} />
              <p className="text-sm font-bold" style={{ color: NAVY }}>SMC 4.0 está buscando otra sucursal…</p>
              <p className="text-xs" style={{ color: '#9ca3af' }}>Analizando cercanía, existencia y cobertura</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: '#6b7280' }}>
                SMC 4.0 propone estas sucursales (excluye la que rechazó y el destino). Elige una:
              </p>
              {opciones.map(op => {
                const sel = elegida === op.sucursal;
                return (
                  <button
                    key={op.sucursal}
                    onClick={() => setElegida(op.sucursal)}
                    className="text-left rounded-xl p-3 transition-all"
                    style={{
                      border: `2px solid ${sel ? NAVY : op.mejor ? 'rgba(22,163,74,0.55)' : '#e5e7eb'}`,
                      background: sel ? 'rgba(26,43,107,0.05)' : op.mejor ? 'rgba(22,163,74,0.04)' : '#fff',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-bold text-sm" style={{ color: NAVY }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: op.mejor ? '#16a34a' : '#6b7280' }}>{op.mejor ? 'star' : 'location_on'}</span>
                        {op.sucursal}
                        {op.mejor && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>Tu mejor opción</span>}
                      </span>
                      {sel && <span className="material-symbols-outlined" style={{ fontSize: 18, color: NAVY }}>check_circle</span>}
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: op.cubre ? '#16a34a' : '#b45309' }}>
                      {op.cubre ? 'Cubre todo el faltante con su existencia.' : 'Cobertura parcial — SMC recalculará el resto si hace falta.'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>
            {noSePuede ? 'Cerrar' : 'Cancelar'}
          </button>
          {!noSePuede && (
            <button
              onClick={handleConfirmar}
              disabled={!elegida}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: elegida ? '#16a34a' : '#9ca3af', cursor: elegida ? 'pointer' : 'not-allowed', boxShadow: elegida ? '0 2px 8px rgba(22,163,74,0.3)' : 'none' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>alt_route</span>
              Reasignar a {elegida ?? 'la sucursal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
