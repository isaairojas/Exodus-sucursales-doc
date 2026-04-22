// ============================================================
// APYMSA — Modal: Diferencias de Pedido
// Design: Enterprise Precision
//
// Logic per row type:
//   Sobrante  → must rescan the extra unit to confirm it exists,
//               then authorize (or remove it to match qty)
//   Faltante  → can authorize the shortage (with motivo) OR
//               "remove" the missing piece from count (adjust down)
//   Incorrecto → must rescan the product in THIS modal to confirm
//                physical removal; then row is resolved
//
// Confirm button enabled only when ALL rows are resolved.
// ============================================================
import { useState, useRef, useEffect } from 'react';

export interface Discrepancy {
  code: string;
  name: string;
  req: number;
  conteo: number;
  diff: number;
  tipo: 'Sobrante' | 'Faltante' | 'Producto incorrecto';
}

interface RowState {
  // shared
  resolved: boolean;
  // authorization
  authorized: boolean;
  motivo: string;
  // rescan (sobrante / incorrecto)
  rescanValue: string;
  rescanConfirmed: boolean;
  // faltante: "remove piece" path
  removedPiece: boolean;
}

const MOTIVOS = ['Etiqueta errónea', 'Error de surtido', 'Merma', 'Otro'];

interface Props {
  discrepancies: Discrepancy[];
  onConfirm: () => void;
  onBack: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export default function ModalDiscrepancy({ discrepancies, onConfirm, onBack, showToast }: Props) {
  const initRows = (): Record<string, RowState> => {
    const r: Record<string, RowState> = {};
    discrepancies.forEach(d => {
      r[d.code] = { resolved: false, authorized: false, motivo: '', rescanValue: '', rescanConfirmed: false, removedPiece: false };
    });
    return r;
  };

  const [rows, setRows] = useState<Record<string, RowState>>(initRows);
  const firstRescanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRescanRef.current?.focus();
  }, []);

  const update = (code: string, patch: Partial<RowState>) => {
    setRows(prev => ({ ...prev, [code]: { ...prev[code], ...patch } }));
  };

  // ── Sobrante: rescan to confirm the extra unit, then authorize ──
  const handleSobranteRescan = (d: Discrepancy, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const val = rows[d.code].rescanValue.trim().toUpperCase();
    if (val === d.code) {
      update(d.code, { rescanConfirmed: true, rescanValue: '' });
      showToast(`Sobrante de ${d.code} confirmado. Puede autorizar.`, 'info');
    } else if (val) {
      showToast(`Código incorrecto. Escanee: ${d.code}`, 'warning');
      update(d.code, { rescanValue: '' });
    }
  };

  const handleSobranteAuthorize = (d: Discrepancy) => {
    if (!rows[d.code].motivo) { showToast('Seleccione un motivo antes de autorizar.', 'warning'); return; }
    update(d.code, { authorized: true, resolved: true });
    showToast(`Sobrante de ${d.code} autorizado.`, 'success');
  };

  // ── Faltante: authorize shortage OR remove piece ──
  const handleFaltanteAuthorize = (d: Discrepancy) => {
    if (!rows[d.code].motivo) { showToast('Seleccione un motivo antes de autorizar.', 'warning'); return; }
    update(d.code, { authorized: true, resolved: true });
    showToast(`Faltante de ${d.code} autorizado.`, 'success');
  };

  const handleFaltanteRemove = (d: Discrepancy) => {
    // "Remove" means we accept the lower count — resolves without authorization
    update(d.code, { removedPiece: true, resolved: true });
    showToast(`Pieza de ${d.code} retirada del conteo.`, 'success');
  };

  // ── Incorrecto: rescan in this modal to confirm physical removal ──
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

  const TIPO_COLOR: Record<string, string> = {
    Sobrante: '#16a34a',
    Faltante: '#dc2626',
    'Producto incorrecto': '#d97706',
  };

  const incorrectCount = discrepancies.filter(d => d.tipo === 'Producto incorrecto').length;
  const confirmedCount = discrepancies.filter(d => rows[d.code]?.resolved).length;

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
          <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
            <span className="font-semibold" style={{ color: confirmedCount === discrepancies.length ? '#16a34a' : '#374151' }}>
              {confirmedCount}/{discrepancies.length} resueltas
            </span>
            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(confirmedCount / discrepancies.length) * 100}%`, background: confirmedCount === discrepancies.length ? '#16a34a' : '#2563eb' }} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">

          {/* Info banner */}
          {incorrectCount > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg mb-4"
              style={{ background: '#fffbeb', border: '1.5px solid #fbbf24' }}>
              <span className="material-symbols-outlined flex-shrink-0 mt-0.5" style={{ color: '#d97706', fontSize: 18 }}>info</span>
              <p className="text-xs" style={{ color: '#92400e' }}>
                Los productos <strong>incorrectos</strong> deben retirarse físicamente y escanearse aquí para confirmar.
                Los <strong>sobrantes</strong> requieren re-escaneo y autorización.
                Los <strong>faltantes</strong> pueden autorizarse o retirarse del conteo.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {discrepancies.map((d, idx) => {
              const row = rows[d.code];
              const diffStr = d.req === 0 ? `+${d.conteo}` : d.diff > 0 ? `+${d.diff}` : `${d.diff}`;
              const diffColor = d.diff > 0 ? '#16a34a' : '#dc2626';

              return (
                <div key={d.code}
                  className="rounded-lg border overflow-hidden"
                  style={{
                    border: row.resolved ? '1.5px solid #86efac' : d.tipo === 'Producto incorrecto' ? '1.5px solid #fbbf24' : '1.5px solid #e5e7eb',
                    background: row.resolved ? '#f0fdf4' : d.tipo === 'Producto incorrecto' ? '#fffbeb' : 'white',
                    transition: 'all 0.3s',
                  }}>

                  {/* Row header */}
                  <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: row.resolved ? '1px solid #bbf7d0' : '1px solid #f0f0f0' }}>
                    <div className="flex-1 flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-sm" style={{ color: '#111827', minWidth: 70 }}>{d.code}</span>
                      <span className="text-sm" style={{ color: '#374151' }}>{d.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm flex-shrink-0">
                      <div className="text-center">
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Requerido</div>
                        <div className="font-bold" style={{ color: '#374151' }}>{d.req === 0 ? '—' : d.req}</div>
                      </div>
                      <div className="text-center">
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Conteo</div>
                        <div className="font-bold" style={{ color: '#374151' }}>{d.conteo}</div>
                      </div>
                      <div className="text-center">
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Diferencia</div>
                        <div className="font-bold" style={{ color: d.tipo === 'Producto incorrecto' ? '#d97706' : diffColor }}>{diffStr}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: d.tipo === 'Producto incorrecto' ? '#fef3c7' : d.tipo === 'Sobrante' ? '#dcfce7' : '#fee2e2', color: TIPO_COLOR[d.tipo] }}>
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

                  {/* Row action area */}
                  {!row.resolved && (
                    <div className="px-4 py-3">

                      {/* ── SOBRANTE ── */}
                      {d.tipo === 'Sobrante' && (
                        <div className="flex flex-wrap items-end gap-4">
                          {!row.rescanConfirmed ? (
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium" style={{ color: '#374151' }}>
                                1. Escanee la pieza sobrante para confirmar:
                              </label>
                              <input
                                ref={idx === 0 ? firstRescanRef : undefined}
                                type="text"
                                value={row.rescanValue}
                                onChange={e => update(d.code, { rescanValue: e.target.value })}
                                onKeyDown={e => handleSobranteRescan(d, e)}
                                placeholder={`Escanear ${d.code}...`}
                                className="px-3 py-2 rounded-lg border text-sm outline-none"
                                style={{ border: '1.5px solid #2563eb', width: 220, fontFamily: 'Roboto, sans-serif' }}
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#16a34a' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                                Pieza sobrante confirmada
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium" style={{ color: '#374151' }}>2. Motivo de autorización:</label>
                                <select
                                  value={row.motivo}
                                  onChange={e => update(d.code, { motivo: e.target.value })}
                                  className="px-2 py-2 rounded-lg border text-sm outline-none"
                                  style={{ border: '1.5px solid #d1d5db', fontFamily: 'Roboto, sans-serif', minWidth: 200 }}>
                                  <option value="">Seleccionar motivo...</option>
                                  {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </div>
                              <button
                                onClick={() => handleSobranteAuthorize(d)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                                style={{ background: row.motivo ? '#1a2b6b' : '#9ca3af', cursor: row.motivo ? 'pointer' : 'not-allowed', fontFamily: 'Roboto, sans-serif' }}
                                onMouseEnter={e => { if (row.motivo) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
                                onMouseLeave={e => { if (row.motivo) (e.currentTarget as HTMLButtonElement).style.background = '#1a2b6b'; }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                                Autorizar sobrante
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* ── FALTANTE ── */}
                      {d.tipo === 'Faltante' && (
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium" style={{ color: '#374151' }}>Motivo de autorización:</label>
                            <select
                              value={row.motivo}
                              onChange={e => update(d.code, { motivo: e.target.value })}
                              className="px-2 py-2 rounded-lg border text-sm outline-none"
                              style={{ border: '1.5px solid #d1d5db', fontFamily: 'Roboto, sans-serif', minWidth: 200 }}>
                              <option value="">Seleccionar motivo...</option>
                              {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <button
                            onClick={() => handleFaltanteAuthorize(d)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                            style={{ background: row.motivo ? '#1a2b6b' : '#9ca3af', cursor: row.motivo ? 'pointer' : 'not-allowed', fontFamily: 'Roboto, sans-serif' }}
                            onMouseEnter={e => { if (row.motivo) (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
                            onMouseLeave={e => { if (row.motivo) (e.currentTarget as HTMLButtonElement).style.background = '#1a2b6b'; }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                            Autorizar faltante
                          </button>
                          <div className="flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
                            <span>— o —</span>
                          </div>
                          <button
                            onClick={() => handleFaltanteRemove(d)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                            style={{ border: '1.5px solid #dc2626', color: '#dc2626', background: 'white', fontFamily: 'Roboto, sans-serif' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>remove_circle</span>
                            Retirar pieza del conteo
                          </button>
                        </div>
                      )}

                      {/* ── PRODUCTO INCORRECTO ── */}
                      {d.tipo === 'Producto incorrecto' && (
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium" style={{ color: '#92400e' }}>
                              Retire el producto físicamente y escanéelo aquí para confirmar:
                            </label>
                            <div className="flex gap-2">
                              <input
                                ref={idx === 0 ? firstRescanRef : undefined}
                                type="text"
                                value={row.rescanValue}
                                onChange={e => update(d.code, { rescanValue: e.target.value })}
                                onKeyDown={e => handleIncorrectoRescan(d, e)}
                                placeholder={`Escanear ${d.code} para confirmar retiro...`}
                                className="px-3 py-2 rounded-lg border text-sm outline-none"
                                style={{ border: '1.5px solid #fbbf24', background: '#fffbeb', width: 300, fontFamily: 'Roboto, sans-serif' }}
                              />
                            </div>
                            <p className="text-xs" style={{ color: '#9ca3af' }}>
                              Presione Enter después de escanear
                            </p>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Resolved summary */}
                  {row.resolved && (
                    <div className="px-4 py-2 text-xs" style={{ color: '#16a34a' }}>
                      {d.tipo === 'Producto incorrecto' && '✓ Producto retirado físicamente y confirmado por escaneo.'}
                      {d.tipo === 'Sobrante' && row.authorized && `✓ Sobrante autorizado — Motivo: ${row.motivo}`}
                      {d.tipo === 'Faltante' && row.authorized && `✓ Faltante autorizado — Motivo: ${row.motivo}`}
                      {d.tipo === 'Faltante' && row.removedPiece && '✓ Pieza retirada del conteo — diferencia eliminada.'}
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
              onClick={allResolved ? onConfirm : () => showToast('Resuelva todas las diferencias primero.', 'warning')}
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
