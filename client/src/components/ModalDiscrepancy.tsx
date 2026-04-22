// ============================================================
// APYMSA — Modal B: Discrepancias (Screen 4a)
// Design: Enterprise Precision
// ============================================================
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB, PRODUCT_CATALOG } from '@/lib/data';

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
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [rescanValues, setRescanValues] = useState<Record<string, string>>({});

  const handleRescan = (code: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = rescanValues[code]?.trim().toUpperCase();
      if (val === code) {
        setConfirmed(prev => ({ ...prev, [code]: true }));
        showToast(`Conteo de ${code} confirmado.`, 'success');
      } else if (val) {
        showToast(`Código incorrecto. Esperando: ${code}`, 'warning');
      }
      setRescanValues(prev => ({ ...prev, [code]: '' }));
    }
  };

  const TIPO_COLOR: Record<string, string> = {
    Sobrante: '#16a34a',
    Faltante: '#dc2626',
    'Producto incorrecto': '#d97706',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', animation: 'screenFadeIn 0.2s ease' }}>
      <div className="bg-white rounded-xl flex flex-col"
        style={{ width: '90%', maxWidth: 900, maxHeight: '85vh', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'modalIn 0.25s ease' }}>

        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 22 }}>warning</span>
          <span className="font-bold text-base" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
            Se detectaron diferencias
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          <p className="text-sm mb-4" style={{ color: '#6b7280', fontFamily: 'Roboto, sans-serif' }}>
            Los siguientes productos presentan diferencias entre la cantidad requerida y el conteo realizado. Puede re-escanear para confirmar o regresar a la revisión.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Roboto, sans-serif' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['No. Producto', 'Descripción', 'Requerido', 'Conteo', 'Diferencia', 'Tipo', 'Acción'].map(h => (
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
                  const isConfirmed = confirmed[d.code];
                  return (
                    <tr key={d.code}>
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#111827' }}>{d.code}</td>
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #f0f0f0', color: '#374151' }}>{d.name}</td>
                      <td className="px-3 py-3 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#374151' }}>
                        {d.req === 0 ? '—' : d.req}
                      </td>
                      <td className="px-3 py-3 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#374151' }}>{d.conteo}</td>
                      <td className="px-3 py-3 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: diffColor }}>{diffStr}</td>
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <span className="text-xs font-semibold" style={{ color: TIPO_COLOR[d.tipo] }}>{d.tipo}</span>
                      </td>
                      <td className="px-3 py-3" style={{ borderBottom: '1px solid #f0f0f0', minWidth: 200 }}>
                        {d.tipo === 'Producto incorrecto' ? (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                            style={{ background: '#fffbeb', border: '1.5px solid #fbbf24', color: '#92400e' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#d97706' }}>warning</span>
                            Separar físicamente
                          </div>
                        ) : isConfirmed ? (
                          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#16a34a' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                            Conteo confirmado
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={rescanValues[d.code] || ''}
                              onChange={e => setRescanValues(prev => ({ ...prev, [d.code]: e.target.value }))}
                              onKeyDown={e => handleRescan(d.code, e)}
                              placeholder="Re-escanear..."
                              className="flex-1 px-2 py-1.5 rounded border text-xs outline-none"
                              style={{ border: '1.5px solid #2563eb', fontFamily: 'Roboto, sans-serif' }}
                            />
                            <button
                              onClick={() => {
                                const inp = document.querySelector(`input[placeholder="Re-escanear..."]`) as HTMLInputElement;
                                if (inp) inp.focus();
                              }}
                              className="px-2 py-1.5 rounded border text-xs transition-all"
                              style={{ border: '1.5px solid #d1d5db', color: '#374151' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>qr_code_scanner</span>
                            </button>
                          </div>
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
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            Regresar a revisión
          </button>
          <button onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a2b6b')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
            Confirmar y continuar
          </button>
        </div>
      </div>
    </div>
  );
}

export type { Discrepancy };
