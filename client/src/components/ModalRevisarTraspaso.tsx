// ============================================================
// APYMSA — ModalRevisarTraspaso
// Revisión ciega de un traspaso Saliente (réplica de la revisión de
// pedidos de cliente: escaneo, conteo por pieza, discrepancias).
// Flujo: Surtido → Revisar → Revisado (parcial si hubo incidencias).
// Design: Enterprise Precision
// ============================================================
import { useState, useRef, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, PRODUCT_CATALOG } from '@/lib/data';
import ModalDiscrepancy, { Discrepancy } from './ModalDiscrepancy';
import { DiscrepancyResolution } from '@/contexts/AppContext';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const UNKNOWN_CODE = 'XX-999';
const IMAGE_THEME: Record<string, { bg: string; accent: string }> = {
  'BP-001': { bg: '#eff6ff', accent: '#2563eb' }, 'FT-223': { bg: '#ecfeff', accent: '#0891b2' },
  'AM-445': { bg: '#f5f3ff', accent: '#7c3aed' }, 'BC-118': { bg: '#fff1f2', accent: '#e11d48' },
  'RD-772': { bg: '#f0fdfa', accent: '#0f766e' }, 'XX-999': { bg: '#fff7ed', accent: '#d97706' },
  'LT-334': { bg: '#f0f9ff', accent: '#0369a1' }, 'AC-201': { bg: '#f7fee7', accent: '#65a30d' },
  'BT-055': { bg: '#fef2f2', accent: '#dc2626' },
};
function getAdhocProductImage(code: string) {
  const t = IMAGE_THEME[code] ?? { bg: '#f3f4f6', accent: '#4b5563' };
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'><rect width='120' height='80' rx='10' fill='${t.bg}'/><rect x='10' y='12' width='100' height='56' rx='8' fill='white' stroke='${t.accent}' stroke-width='1.8'/><circle cx='28' cy='40' r='10' fill='${t.accent}' opacity='0.22'/><rect x='44' y='30' width='48' height='8' rx='3' fill='${t.accent}' opacity='0.28'/><rect x='44' y='44' width='38' height='6' rx='3' fill='${t.accent}' opacity='0.18'/><text x='60' y='72' text-anchor='middle' font-family='Roboto, Arial, sans-serif' font-size='11' fill='${t.accent}' font-weight='700'>${code}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function ModalRevisarTraspaso({ peticion, onClose, showToast }: Props) {
  const { revisarTraspaso } = useApp();

  // Cantidad a revisar por pieza = lo surtido (qtySurtida). Conteo ciego desde 0.
  const [conteo, setConteo] = useState<Record<string, number>>(
    Object.fromEntries(peticion.piezas.map(p => [p.code, 0]))
  );
  const [unknown, setUnknown] = useState<Record<string, number>>({});
  const [scanValue, setScanValue] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [lastBump, setLastBump] = useState<string | null>(null);
  const [unknownFired, setUnknownFired] = useState(false);
  const [showDisc, setShowDisc] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const scanRef = useRef<HTMLInputElement>(null);

  const refocus = useCallback(() => { setTimeout(() => scanRef.current?.focus(), 80); }, []);

  const fireScan = useCallback((code: string) => {
    const pieza = peticion.piezas.find(p => p.code === code);
    if (pieza) {
      setConteo(prev => ({ ...prev, [code]: (prev[code] ?? 0) + 1 }));
    } else {
      setUnknown(prev => ({ ...prev, [code]: (prev[code] ?? 0) + 1 }));
      showToast(`Producto ${code} no pertenece al traspaso — separar físicamente`, 'warning');
    }
    setLastScanned(code);
    setLastBump(code);
    setTimeout(() => setLastBump(null), 400);
  }, [peticion.piezas, showToast]);

  const handleRowClick = (code: string) => { fireScan(code); refocus(); };
  const handleInputClick = () => {
    if (!unknownFired) { setUnknownFired(true); fireScan(UNKNOWN_CODE); }
  };
  const handleManualScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const code = scanValue.trim().toUpperCase();
    setScanValue('');
    if (code) { fireScan(code); refocus(); }
  };

  const finalize = (conIncidencias: boolean) => {
    revisarTraspaso(peticion.id, conIncidencias);
    showToast(
      conIncidencias
        ? `Traspaso ${peticion.id} revisado con incidencias`
        : `Traspaso ${peticion.id} revisado correctamente`,
      conIncidencias ? 'warning' : 'success'
    );
    onClose();
  };

  const handleFinalize = () => {
    const discs: Discrepancy[] = [];
    peticion.piezas.forEach(p => {
      const c = conteo[p.code] ?? 0;
      const diff = c - p.qtySurtida;          // revisión contra lo surtido
      if (diff !== 0) {
        discs.push({
          code: p.code, name: PRODUCT_CATALOG[p.code]?.name || p.code,
          req: p.qtySurtida, conteo: c, diff,
          tipo: diff > 0 ? 'Sobrante' : 'Faltante',
        });
      }
    });
    Object.entries(unknown).forEach(([code, c]) => {
      discs.push({
        code, name: PRODUCT_CATALOG[code]?.name || 'Producto no identificado',
        req: 0, conteo: c, diff: c, tipo: 'Producto incorrecto',
      });
    });
    if (discs.length > 0) { setDiscrepancies(discs); setShowDisc(true); }
    else finalize(false);
  };

  const handleConfirmDisc = (_res: DiscrepancyResolution[]) => {
    setShowDisc(false);
    finalize(true); // hubo diferencias resueltas → revisado con incidencias (parcial)
  };

  const totalPartidas = Object.values(conteo).filter(c => c > 0).length + Object.keys(unknown).length;
  const totalUnidades = Object.values(conteo).reduce((s, c) => s + c, 0) + Object.values(unknown).reduce((s, c) => s + c, 0);

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="flex flex-col bg-white rounded-xl overflow-hidden"
          style={{ width: 780, maxWidth: '96vw', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', animation: 'modalIn 0.22s ease' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-4" style={{ background: '#1a2b6b', flexShrink: 0 }}>
            <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>qr_code_scanner</span>
            <span className="font-bold text-sm text-white">Revisión de Traspaso</span>
            <span className="ml-1 px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>#{peticion.id}</span>
            <span className="ml-1 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>→ {peticion.sucursalContraparte}</span>
            <span className="ml-2 text-xs text-white opacity-75">Modo ciego</span>
            <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4" style={{ background: '#f3f4f6' }}>
            {/* Scanner + stats */}
            <div className="bg-white rounded-lg p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#6b7280' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#2563eb' }}>barcode_scanner</span>
                    Campo de escaneo (activo)
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ fontSize: 20, color: '#2563eb' }}>qr_code_scanner</span>
                    <input
                      ref={scanRef} type="text" value={scanValue}
                      onChange={e => setScanValue(e.target.value)} onKeyDown={handleManualScan} onClick={handleInputClick}
                      placeholder="Escanea o captura el código del producto..." autoFocus autoComplete="off"
                      className="w-full pl-10 pr-4 py-3 rounded-lg text-sm outline-none"
                      style={{ border: '2px solid #2563eb', animation: 'scannerPulse 2s ease-in-out infinite' }}
                      onFocus={e => { e.target.style.animation = 'none'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.18)'; }}
                      onBlur={e => { e.target.style.animation = 'scannerPulse 2s ease-in-out infinite'; e.target.style.boxShadow = ''; }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>Clic en fila para escaneo rápido · Enter para confirmar código manual</p>
                </div>
                <div className="flex gap-5 lg:gap-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: '#6b7280' }}>Partidas escaneadas</p>
                    <p className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{totalPartidas}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide" style={{ color: '#6b7280' }}>Unidades totales</p>
                    <p className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>{totalUnidades}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de conteo */}
            <div className="bg-white rounded-lg overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>table_rows</span>
                <span className="font-bold text-sm" style={{ color: '#1a2b6b' }}>Registro de conteo</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Imagen', 'Cantidad a revisar', 'Conteo', 'No. Producto', 'Descripción'].map(h => (
                        <th key={h} className="text-left px-3 py-2" style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #d1d5db' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {peticion.piezas.map(p => {
                      const c = conteo[p.code] ?? 0;
                      const isLast = lastScanned === p.code;
                      const isBump = lastBump === p.code;
                      const isComplete = c >= p.qtySurtida && p.qtySurtida > 0;
                      return (
                        <tr key={p.code} onClick={() => handleRowClick(p.code)} title="Clic para simular escaneo"
                          style={{ background: isComplete ? '#f0fdf4' : isLast && c > 0 ? '#fffbeb' : 'transparent', transition: 'background 0.3s', cursor: 'pointer' }}>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <img src={getAdhocProductImage(p.code)} alt={p.code} className="w-[72px] h-[48px] rounded-md object-cover border" style={{ borderColor: '#e5e7eb' }} />
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold" style={{ borderBottom: '1px solid #f0f0f0', color: isComplete ? '#16a34a' : '#374151', borderLeft: isComplete ? '3px solid #16a34a' : isLast && c > 0 ? '3px solid #fbbf24' : '3px solid transparent' }}>{p.qtySurtida}</td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <span className="inline-flex items-center justify-center rounded-full text-white font-bold text-sm" style={{ minWidth: 28, height: 28, padding: '0 8px', background: isComplete ? '#16a34a' : isLast ? '#2563eb' : c > 0 ? '#1a2b6b' : '#d1d5db', animation: isBump ? 'badgePop 0.3s ease' : 'none', transition: 'background 0.3s' }}>{c}</span>
                          </td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#111827' }}>{p.code}</td>
                          <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', color: '#374151' }}>{PRODUCT_CATALOG[p.code]?.name || p.code}</td>
                        </tr>
                      );
                    })}
                    {Object.keys(unknown).length > 0 && (
                      <>
                        <tr>
                          <td colSpan={5} className="px-3 py-2" style={{ background: '#fff7ed', borderTop: '2px solid #fbbf24', borderBottom: '1px solid #fde68a' }}>
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#d97706' }}>warning</span>
                              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#92400e' }}>Productos no pertenecientes al traspaso — Separar físicamente</span>
                            </div>
                          </td>
                        </tr>
                        {Object.entries(unknown).map(([code, c]) => (
                          <tr key={code} style={{ background: '#fff7ed' }}>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a' }}>
                              <img src={getAdhocProductImage(code)} alt={code} className="w-[72px] h-[48px] rounded-md object-cover border" style={{ borderColor: '#fcd34d' }} />
                            </td>
                            <td className="px-3 py-2.5 text-center italic" style={{ borderBottom: '1px solid #fde68a', color: '#9ca3af', borderLeft: '3px solid #fbbf24' }}>—</td>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a' }}>
                              <span className="inline-flex items-center justify-center rounded-full text-white font-bold text-sm" style={{ minWidth: 28, height: 28, padding: '0 8px', background: '#d97706' }}>{c}</span>
                            </td>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a', fontWeight: 600, color: '#d97706' }}>{code}</td>
                            <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #fde68a', color: '#d97706' }}>{PRODUCT_CATALOG[code]?.name || 'Producto no identificado'}</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-5 py-4 flex-wrap" style={{ borderTop: '1px solid #e5e7eb', background: 'white' }}>
            <button onClick={() => showToast('Reimprimiendo etiquetas del traspaso...', 'info')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border" style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span>
              Reimprimir etiquetas
            </button>
            <div className="flex-1" />
            <button onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border" style={{ border: '1.5px solid #dc2626', color: '#dc2626', background: 'white' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span>
              Cancelar revisión
            </button>
            <button onClick={handleFinalize}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: '#16a34a' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
              Aceptar
            </button>
          </div>
        </div>
      </div>

      {showDisc && (
        <ModalDiscrepancy
          discrepancies={discrepancies}
          onConfirm={handleConfirmDisc}
          onBack={() => { setShowDisc(false); refocus(); }}
          showToast={showToast}
        />
      )}
    </>
  );
}
