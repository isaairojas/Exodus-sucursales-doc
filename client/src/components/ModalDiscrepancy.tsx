// ============================================================
// APYMSA — Modal: Diferencias de Pedido
// Design: Enterprise Precision
//
// Logic per row type:
//   Sobrante    → rescan the product = confirmation of action taken
//   Faltante    → select motivo = resolved as good
//   Incorrecto  → rescan the product in THIS modal to confirm physical removal
//
// onConfirm receives resolution details for each discrepancy.
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { DiscrepancyResolution } from '@/contexts/AppContext';

export interface Discrepancy {
  code: string;
  name: string;
  req: number;
  conteo: number;
  diff: number;
  tipo: 'Sobrante' | 'Faltante' | 'Producto incorrecto';
}

interface RowState {
  resolved: boolean;
  authorized: boolean;
  motivo: string;
  removedPiece: boolean;
  rescanValue: string;
  rescanConfirmed: boolean;
}

const MOTIVOS = ['Etiqueta errónea', 'Error de surtido', 'Merma', 'Otro'];

interface Props {
  discrepancies: Discrepancy[];
  onConfirm: (resolutions: DiscrepancyResolution[]) => void;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function ModalDiscrepancy({ discrepancies, onConfirm, onBack, showToast }: Props) {
  const initRows = (): Record<string, RowState> => {
    const r: Record<string, RowState> = {};
    discrepancies.forEach(d => {
      r[d.code] = {
        resolved: false, authorized: false, motivo: '',
        removedPiece: false, rescanValue: '', rescanConfirmed: false,
      };
    });
    return r;
  };

  const [rows, setRows] = useState<Record<string, RowState>>(initRows);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { firstInputRef.current?.focus(); }, []);

  const update = (code: string, patch: Partial<RowState>) =>
    setRows(prev => ({ ...prev, [code]: { ...prev[code], ...patch } }));

  // ── SOBRANTE ──
  const handleSobranteRescan = (d: Discrepancy, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = rows[d.code].rescanValue.trim().toUpperCase();
    if (val === d.code) {
      update(d.code, { rescanConfirmed: true, rescanValue: '', resolved: true });
      showToast(`Sobrante de ${d.code} confirmado.`, 'success');
    } else if (val) {
      showToast(`Código incorrecto. Escanee: ${d.code}`, 'warning');
      update(d.code, { rescanValue: '' });
    }
  };

  // ── FALTANTE: seleccionar motivo lo marca como correcto ──
  const handleFaltanteMotivoChange = (d: Discrepancy, motivo: string) => {
    const resolved = motivo !== '';
    update(d.code, {
      motivo,
      resolved,
      removedPiece: resolved, // "correcto" en resumen
      authorized: false,
    });
    if (resolved) showToast(`Faltante de ${d.code} marcado como correcto.`, 'success');
  };

  // ── INCORRECTO ──
  const handleIncorrectoRescan = (d: Discrepancy, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = rows[d.code].rescanValue.trim().toUpperCase();
    if (val === d.code) {
      update(d.code, { rescanConfirmed: true, rescanValue: '', resolved: true });
      showToast(`Producto ${d.code} confirmado para retiro del pedido.`, 'success');
    } else if (val) {
      showToast(`Código incorrecto. Escanee: ${d.code}`, 'warning');
      update(d.code, { rescanValue: '' });
    }
  };

  const allResolved = discrepancies.every(d => rows[d.code]?.resolved);
  const confirmedCount = discrepancies.filter(d => rows[d.code]?.resolved).length;

  const handleConfirm = () => {
    const resolutions: DiscrepancyResolution[] = discrepancies.map(d => ({
      code: d.code,
      tipo: d.tipo,
      removedFromCount: rows[d.code]?.removedPiece ?? false,
      denied: rows[d.code]?.authorized ?? false,
      motivo: rows[d.code]?.motivo ?? '',
    }));
    onConfirm(resolutions);
  };

  const TIPO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
    Sobrante:              { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    Faltante:              { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    'Producto incorrecto': { bg: '#fffbeb', color: '#d97706', border: '#fbbf24' },
  };

  const firstUnresolvedIdx = discrepancies.findIndex(d => !rows[d.code]?.resolved);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.48)', animation: 'screenFadeIn 0.2s ease' }}>
      <div className="bg-white rounded-xl flex flex-col"
        style={{ width: '94%', maxWidth: 1020, maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.22)', animation: 'modalIn 0.25s ease' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 22 }}>warning</span>
            <span className="font-bold text-base" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
              Diferencias detectadas en el pedido
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
            <span className="font-semibold" style={{ color: allResolved ? '#16a34a' : '#374151' }}>
              {confirmedCount}/{discrepancies.length} resueltas
            </span>
            <div className="w-28 h-2 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(confirmedCount / discrepancies.length) * 100}%`, background: allResolved ? '#16a34a' : '#2563eb' }} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-start gap-3 p-3 rounded-lg mb-4"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <span className="material-symbols-outlined flex-shrink-0 mt-0.5" style={{ color: '#64748b', fontSize: 16 }}>info</span>
            <p className="text-xs" style={{ color: '#475569' }}>
              <strong>Sobrante:</strong> escanee la pieza para confirmar que fue retirada del pedido. &nbsp;
              <strong>Faltante:</strong> seleccione un motivo para marcarlo como correcto. &nbsp;
              <strong>Producto incorrecto:</strong> retírelo físicamente y escanéelo aquí para confirmar.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {discrepancies.map((d, idx) => {
              const row = rows[d.code];
              const style = TIPO_STYLE[d.tipo];
              const diffStr = d.req === 0 ? `+${d.conteo}` : d.diff > 0 ? `+${d.diff}` : `${d.diff}`;
              const isFirstUnresolved = idx === firstUnresolvedIdx;

              return (
                <div key={d.code} className="rounded-lg overflow-hidden"
                  style={{
                    border: row.resolved ? '1.5px solid #86efac' : `1.5px solid ${style.border}`,
                    background: row.resolved ? '#f0fdf4' : style.bg,
                    transition: 'all 0.3s',
                  }}>

                  {/* Row header */}
                  <div className="flex items-center gap-4 px-4 py-3 flex-wrap"
                    style={{ borderBottom: row.resolved ? '1px solid #bbf7d0' : '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
                      <span className="font-bold text-sm flex-shrink-0" style={{ color: '#111827', minWidth: 64 }}>{d.code}</span>
                      <span className="text-sm truncate" style={{ color: '#374151' }}>{d.name}</span>
                    </div>
                    <div className="flex items-center gap-5 text-sm flex-shrink-0">
                      {d.req > 0 && (
                        <div className="text-center">
                          <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Requerido</div>
                          <div className="font-bold" style={{ color: '#374151' }}>{d.req}</div>
                        </div>
                      )}
                      <div className="text-center">
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Conteo</div>
                        <div className="font-bold" style={{ color: '#374151' }}>{d.conteo}</div>
                      </div>
                      <div className="text-center">
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Diferencia</div>
                        <div className="font-bold" style={{ color: style.color }}>{diffStr}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: 'white', color: style.color, border: `1px solid ${style.border}` }}>
                        {d.tipo}
                      </span>
                      {row.resolved && (
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#16a34a' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                          Resuelto
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action area */}
                  {!row.resolved && (
                    <div className="px-4 py-3">

                      {/* SOBRANTE */}
                      {d.tipo === 'Sobrante' && (
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium" style={{ color: '#374151' }}>
                              Escanee la pieza sobrante para confirmar que fue retirada:
                            </label>
                            <input
                              ref={isFirstUnresolved ? firstInputRef : undefined}
                              type="text"
                              value={row.rescanValue}
                              onChange={e => update(d.code, { rescanValue: e.target.value })}
                              onKeyDown={e => handleSobranteRescan(d, e)}
                              placeholder={`Escanear ${d.code}...`}
                              className="px-3 py-2 rounded-lg border text-sm outline-none"
                              style={{ border: '1.5px solid #16a34a', width: 240, fontFamily: 'Roboto, sans-serif', background: 'white' }}
                            />
                            <p className="text-xs" style={{ color: '#9ca3af' }}>Presione Enter después de escanear</p>
                          </div>
                        </div>
                      )}

                      {/* FALTANTE */}
                      {d.tipo === 'Faltante' && (
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium" style={{ color: '#374151' }}>Motivo:</label>
                            <select
                              ref={isFirstUnresolved ? firstInputRef as any : undefined}
                              value={row.motivo}
                              onChange={e => handleFaltanteMotivoChange(d, e.target.value)}
                              className="px-2 py-2 rounded-lg border text-sm outline-none"
                              style={{ border: '1.5px solid #d1d5db', fontFamily: 'Roboto, sans-serif', minWidth: 210 }}>
                              <option value="">Seleccionar motivo...</option>
                              {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <p className="text-xs" style={{ color: '#9ca3af' }}>
                            Al seleccionar el motivo se marca automáticamente como correcto.
                          </p>
                        </div>
                      )}

                      {/* INCORRECTO */}
                      {d.tipo === 'Producto incorrecto' && (
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium" style={{ color: '#92400e' }}>
                              Retire el producto físicamente y escanéelo aquí para confirmar:
                            </label>
                            <input
                              ref={isFirstUnresolved ? firstInputRef : undefined}
                              type="text"
                              value={row.rescanValue}
                              onChange={e => update(d.code, { rescanValue: e.target.value })}
                              onKeyDown={e => handleIncorrectoRescan(d, e)}
                              placeholder={`Escanear ${d.code} para confirmar retiro...`}
                              className="px-3 py-2 rounded-lg border text-sm outline-none"
                              style={{ border: '1.5px solid #fbbf24', background: '#fffbeb', width: 320, fontFamily: 'Roboto, sans-serif' }}
                            />
                            <p className="text-xs" style={{ color: '#9ca3af' }}>Presione Enter después de escanear</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resolved summary */}
                  {row.resolved && (
                    <div className="px-4 py-2 text-xs" style={{ color: '#16a34a' }}>
                      {d.tipo === 'Sobrante' && '✓ Pieza sobrante escaneada y confirmada — retirada del pedido.'}
                      {d.tipo === 'Faltante' && `✓ Faltante marcado como correcto — Motivo: ${row.motivo}`}
                      {d.tipo === 'Producto incorrecto' && '✓ Producto retirado físicamente y confirmado por escaneo.'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <div>
            {!allResolved && (
              <p className="text-xs" style={{ color: '#d97706' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>warning</span>
                {' '}Resuelva todas las diferencias para continuar ({discrepancies.length - confirmedCount} pendientes).
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
              onClick={allResolved ? handleConfirm : () => showToast('Resuelva todas las diferencias primero.', 'warning')}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{
                background: allResolved ? '#16a34a' : '#9ca3af',
                cursor: allResolved ? 'pointer' : 'not-allowed',
                fontFamily: 'Roboto, sans-serif',
              }}
              onMouseEnter={e => { if (allResolved) (e.currentTarget as HTMLButtonElement).style.background = '#15803d'; }}
              onMouseLeave={e => { if (allResolved) (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
              Confirmar y continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
