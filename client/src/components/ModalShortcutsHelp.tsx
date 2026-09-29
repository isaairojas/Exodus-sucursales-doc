// ============================================================
// APYMSA — ModalShortcutsHelp
// Muestra los atajos disponibles. Se abre con la tecla "?" (F89).
// ============================================================
import { useEffect, useState } from 'react';

const ATAJOS: { tecla: string; descripcion: string }[] = [
  { tecla: 'Esc',      descripcion: 'Cerrar modal abierto' },
  { tecla: '?',        descripcion: 'Mostrar esta ayuda' },
  { tecla: 'F4',       descripcion: 'Ver detalle del pedido' },
  { tecla: 'F7',       descripcion: 'Surtir' },
  { tecla: 'F8',       descripcion: 'Revisar' },
  { tecla: 'F9',       descripcion: 'Facturar' },
  { tecla: 'F11',      descripcion: 'Cotizador' },
  { tecla: 'F12',      descripcion: 'Productos' },
  { tecla: 'Doble click', descripcion: 'Abrir detalle de una fila' },
];

export default function ModalShortcutsHelp() {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Solo abre si el usuario NO está tecleando en un input/textarea.
      const t = e.target as HTMLElement;
      const editable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (e.key === '?' && !editable) { setAbierto(true); e.preventDefault(); }
      if (e.key === 'Escape' && abierto) setAbierto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto]);
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) setAbierto(false); }}
    >
      <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 420, borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', fontFamily: 'Roboto, sans-serif' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: '#1a2b6b', color: 'white' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>keyboard</span>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Atajos disponibles</div>
          </div>
          <button onClick={() => setAbierto(false)} className="rounded-full p-1 hover:bg-white/10" aria-label="Cerrar">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="p-4">
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              {ATAJOS.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 4px' }}>
                    <kbd style={{ background: '#f1f5f9', color: '#1a2b6b', padding: '2px 8px', borderRadius: 4, fontFamily: 'Courier New', fontWeight: 700, fontSize: 12, border: '1px solid #cbd5e1' }}>{a.tecla}</kbd>
                  </td>
                  <td style={{ padding: '6px 4px', color: '#0f172a' }}>{a.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
