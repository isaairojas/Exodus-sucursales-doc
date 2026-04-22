// ============================================================
// APYMSA — Modal A: Autorizar Partida
// Design: Enterprise Precision
// ============================================================
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB, PRODUCT_CATALOG } from '@/lib/data';

interface Props {
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const MOTIVOS = ['Etiqueta errónea', 'Error de surtido', 'Merma', 'Otro'];

export default function ModalAuthorize({ onClose, showToast }: Props) {
  const { state, toggleAuthorize } = useApp();
  const order = state.selectedOrderId ? ORDERS_DB[state.selectedOrderId] : null;
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  if (!order) return null;

  const handleAuthorize = (code: string, qty: number) => {
    const item = state.scannedItems[code];
    const diff = item.conteo - qty;
    const motivo = motivos[code] || '';
    if (!item.authorized && diff !== 0 && !motivo) {
      showToast('Seleccione un motivo antes de autorizar.', 'warning');
      return;
    }
    toggleAuthorize(code, qty, motivo);
    if (!item.authorized) {
      showToast(`Partida ${code} autorizada.`, 'success');
    }
  };

  const handleSave = () => {
    onClose();
    showToast('Autorizaciones guardadas correctamente.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', animation: 'screenFadeIn 0.2s ease' }}>
      <div className="bg-white rounded-xl flex flex-col"
        style={{ width: '90%', maxWidth: 860, maxHeight: '85vh', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'modalIn 0.25s ease' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: 22 }}>verified</span>
            <span className="font-bold text-base" style={{ color: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}>
              Autorizar Partidas
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#6b7280' }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          <p className="text-sm mb-4" style={{ color: '#6b7280', fontFamily: 'Roboto, sans-serif' }}>
            Puede pre-autorizar discrepancias conocidas. La cantidad requerida es visible en este modal. Se requiere seleccionar un motivo obligatoriamente.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13, fontFamily: 'Roboto, sans-serif' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['No. Producto', 'Descripción', 'Cant. requerida', 'Conteo actual', 'Diferencia', 'Motivo', 'Acción'].map(h => (
                    <th key={h} className="text-left px-3 py-2"
                      style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid #d1d5db' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.partidas.map(p => {
                  const item = state.scannedItems[p.code];
                  const diff = item.conteo - p.qty;
                  const isAuth = item.authorized;
                  const diffColor = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#6b7280';
                  const diffStr = diff === 0 ? '—' : diff > 0 ? `+${diff}` : `${diff}`;
                  return (
                    <tr key={p.code} style={{ background: isAuth ? '#f0fdf4' : 'transparent' }}>
                      <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#111827' }}>{p.code}</td>
                      <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0', color: '#374151' }}>
                        {PRODUCT_CATALOG[p.code]?.name || p.code}
                      </td>
                      <td className="px-3 py-2.5 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#374151' }}>{p.qty}</td>
                      <td className="px-3 py-2.5 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#374151' }}>{item.conteo}</td>
                      <td className="px-3 py-2.5 text-center" style={{ borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: diffColor }}>{diffStr}</td>
                      <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <select
                          value={motivos[p.code] || item.authMotivo || ''}
                          onChange={e => setMotivos(prev => ({ ...prev, [p.code]: e.target.value }))}
                          className="text-xs rounded px-2 py-1 border outline-none"
                          style={{ border: '1.5px solid #d1d5db', fontFamily: 'Roboto, sans-serif', cursor: 'pointer' }}>
                          <option value="">Seleccionar motivo...</option>
                          {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <button
                          onClick={() => handleAuthorize(p.code, p.qty)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all"
                          style={{
                            background: isAuth ? '#16a34a' : 'white',
                            color: isAuth ? 'white' : '#374151',
                            border: isAuth ? 'none' : '1.5px solid #d1d5db',
                          }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            {isAuth ? 'check' : 'verified'}
                          </span>
                          {isAuth ? 'Autorizado' : 'Autorizar'}
                        </button>
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
          <button onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
            style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
            Cancelar
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{ background: '#1a2b6b', fontFamily: 'Roboto, sans-serif' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a2b6b')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
            Guardar autorizaciones
          </button>
        </div>
      </div>
    </div>
  );
}
