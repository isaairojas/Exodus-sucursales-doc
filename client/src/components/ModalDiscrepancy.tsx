// ============================================================
// APYMSA — Modal B: Discrepancias (Screen 4a)
// Design: Enterprise Precision
// Includes: re-scan confirmation for "Producto incorrecto"
// ============================================================
import { useState, useRef, useEffect } from 'react';

interface Discrepancy {
  code: string;
  name: string;
  req: number;
  conteo: number;
  diff: number;
  tipo: 'Sobrante' | 'Faltante' | 'Producto incorrecto';
}

interface Props {
  discrepancies: Discrepancy[];
  onConfirm: () => void;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function ModalDiscrepancy({ discrepancies, onConfirm, onBack, showToast }: Props) {
  // Track which "Producto incorrecto" rows have been confirmed via re-scan
  const [confirmedRemoval, setConfirmedRemoval] = useState<Record<string, boolean>>({});
  const [rescanValues, setRescanValues] = useState<Record<string, string>>({});
  // For normal discrepancies (Sobrante/Faltante) re-scan confirmation
  const [confirmedCount, setConfirmedCount] = useState<Record<string, boolean>>({});
  const [countRescan, setCountRescan] = useState<Record<string, string>>({});

  const incorrectRows = discrepancies.filter(d => d.tipo === 'Producto incorrecto');
  const allIncorrectConfirmed = incorrectRows.every(d => confirmedRemoval[d.code]);
  const canProceed = allIncorrectConfirmed;

  const TIPO_COLOR: Record<string, string> = {
    Sobrante: '#16a34a',
    Faltante: '#dc2626',
    'Producto incorrecto': '#d97706',
  };

  const handleRescanRemoval = (code: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = rescanValues[code]?.trim().toUpperCase();
      if (val === code) {
        setConfirmedRemoval(prev => ({ ...prev, [code]: true }));
        showToast(`Producto ${code} confirmado para retiro del pedido.`, 'success');
      } else if (val) {
        showToast(`Código incorrecto. Escanee: ${code}`, 'warning');
      }
      setRescanValues(prev => ({ ...prev, [code]: '' }));
    }
  };

  const handleRescanCount = (code: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = countRescan[code]?.trim().toUpperCase();
      if (val === code) {
        setConfirmedCount(prev => ({ ...prev, [code]: true }));
        showToast(`Conteo de ${code} re-confirmado.`, 'success');
      } else if (val) {
        showToast(`Código incorrecto. Escanee: ${code}`, 'warning');
      }
      setCountRescan(prev => ({ ...prev, [code]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', animation: 'screenFadeIn 0.2s ease' }}>
      <div className="bg-white rounded-xl flex flex-col"
        style={{ width: '92%', maxWidth: 960, maxHeight: '88vh', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'modalIn 0.25s ease' }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 22 }}>warning</span>
          <span className="font-bold text-base" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
            Se detectaron diferencias en el pedido
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">

          {/* Alert for unknown products */}
          {incorrectRows.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-lg mb-5"
              style={{ background: '#fffbeb', border: '1.5px solid #fbbf24' }}>
              <span className="material-symbols-outlined flex-shrink-0" style={{ color: '#d97706', fontSize: 22, marginTop: 1 }}>warning</span>
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: '#92400e' }}>
                  Productos ajenos al pedido detectados
                </p>
                <p className="text-xs" style={{ color: '#92400e' }}>
                  Los productos marcados como <strong>Producto incorrecto</strong> deben ser retirados físicamente del pedido.
                  Para confirmar el retiro, escanee el código de barras de cada producto en el campo correspondiente.
                  {!allIncorrectConfirmed && (
                    <span className="block mt-1 font-semibold">
                      ⚠ Debe confirmar todos los retiros antes de continuar.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Roboto, sans-serif' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['No. Producto', 'Descripción', 'Requerido', 'Conteo', 'Diferencia', 'Tipo', 'Acción requerida'].map(h => (
                    <th key={h} className="text-left px-3 py-2"
                      style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #d1d5db' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {discrepancies.map(d => {
                  const diffStr = d.req === 0 ? `+${d.conteo}` : d.diff > 0 ? `+${d.diff}` : `${d.diff}`;
                  const diffColor = d.diff > 0 ? '#16a34a' : '#dc2626';
                  const isIncorrect = d.tipo === 'Producto incorrecto';
                  const isRemovedConfirmed = confirmedRemoval[d.code];
                  const isCountConfirmed = confirmedCount[d.code];

                  return (
                    <tr key={d.code}
                      style={{ background: isRemovedConfirmed ? '#f0fdf4' : isIncorrect ? '#fffbeb' : 'transparent' }}>
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: isIncorrect ? '#d97706' : '#111827' }}>
                        {d.code}
                      </td>
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #f0f0f0', color: isIncorrect ? '#d97706' : '#374151' }}>
                        {d.name}
                      </td>
                      <td className="px-3 py-3 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#374151' }}>
                        {d.req === 0 ? '—' : d.req}
                      </td>
                      <td className="px-3 py-3 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#374151' }}>
                        {d.conteo}
                      </td>
                      <td className="px-3 py-3 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: isIncorrect ? '#d97706' : diffColor }}>
                        {diffStr}
                      </td>
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <span className="text-xs font-semibold" style={{ color: TIPO_COLOR[d.tipo] }}>{d.tipo}</span>
                      </td>

                      {/* Action column */}
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #f0f0f0', minWidth: 260 }}>
                        {isIncorrect ? (
                          isRemovedConfirmed ? (
                            /* Confirmed removal */
                            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#16a34a' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                              Retiro confirmado — separar del pedido
                            </div>
                          ) : (
                            /* Needs rescan to confirm removal */
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#92400e' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#d97706' }}>qr_code_scanner</span>
                                Escanee para confirmar retiro:
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={rescanValues[d.code] || ''}
                                  onChange={e => setRescanValues(prev => ({ ...prev, [d.code]: e.target.value }))}
                                  onKeyDown={e => handleRescanRemoval(d.code, e)}
                                  placeholder={`Escanear ${d.code}...`}
                                  className="flex-1 px-2 py-1.5 rounded border text-xs outline-none"
                                  style={{ border: '1.5px solid #fbbf24', fontFamily: 'Roboto, sans-serif', background: '#fffbeb' }}
                                  autoFocus={discrepancies.indexOf(d) === 0}
                                />
                              </div>
                              <p className="text-xs" style={{ color: '#9ca3af' }}>
                                Retire el producto físicamente y escanéelo para confirmar.
                              </p>
                            </div>
                          )
                        ) : (
                          /* Normal discrepancy: optional recount confirmation */
                          isCountConfirmed ? (
                            <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#16a34a' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                              Conteo re-confirmado
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={countRescan[d.code] || ''}
                                onChange={e => setCountRescan(prev => ({ ...prev, [d.code]: e.target.value }))}
                                onKeyDown={e => handleRescanCount(d.code, e)}
                                placeholder="Re-escanear (opcional)..."
                                className="flex-1 px-2 py-1.5 rounded border text-xs outline-none"
                                style={{ border: '1.5px solid #d1d5db', fontFamily: 'Roboto, sans-serif' }}
                              />
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <div>
            {!canProceed && incorrectRows.length > 0 && (
              <p className="text-xs" style={{ color: '#d97706' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>warning</span>
                {' '}Confirme el retiro de todos los productos incorrectos para continuar.
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
              style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              Regresar a revisión
            </button>
            <button
              onClick={canProceed ? onConfirm : () => showToast('Confirme el retiro de productos incorrectos primero.', 'warning')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{
                background: canProceed ? '#1a2b6b' : '#9ca3af',
                cursor: canProceed ? 'pointer' : 'not-allowed',
                fontFamily: 'Roboto, sans-serif',
              }}
              onMouseEnter={e => { if (canProceed) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
              onMouseLeave={e => { if (canProceed) (e.currentTarget as HTMLButtonElement).style.background = '#1a2b6b'; }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
              Confirmar y continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { Discrepancy };
