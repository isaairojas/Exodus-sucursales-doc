// ============================================================
// APYMSA — ScreenTraspasosEntreSucursales
// Contenedor de traspasos entre sucursales: tabs Por enviar / Por recibir
// Design: Enterprise Precision
// ============================================================
import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoTipo, TraspasoStatus, TRASPASO_TIPO_LABELS, TRASPASO_TIPO_ICONS } from '@/lib/data';
import ScreenTraspasos from './ScreenTraspasos';
import ModalNuevaSolicitudTraspaso from './ModalNuevaSolicitudTraspaso';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const TABS: TraspasoTipo[] = ['Saliente', 'Entrante'];

export default function ScreenTraspasosEntreSucursales({ showToast }: Props) {
  const { traspasos } = useApp();
  const [activeTab, setActiveTab] = useState<TraspasoTipo>('Entrante');
  const [showNuevaSolicitud, setShowNuevaSolicitud] = useState(false);

  // Estatus que representa "pendiente de acción" en cada tab:
  // Por recibir (Entrante) → Enviado, esperando que demos entrada.
  // Por enviar (Saliente) → Pendiente, esperando que surtamos.
  const STATUS_ACCIONABLE: Record<TraspasoTipo, TraspasoStatus> = { Entrante: 'Enviado', Saliente: 'Pendiente' };

  const contadorPorTipo = useMemo(() => {
    const counts: Record<TraspasoTipo, number> = { Entrante: 0, Saliente: 0 };
    traspasos.forEach(t => {
      if (t.categoria === 'CEDIS') return;
      if (t.status === STATUS_ACCIONABLE[t.tipo]) counts[t.tipo]++;
    });
    return counts;
  }, [traspasos]);

  return (
    <div className="flex flex-col h-full" style={{ background: '#f4f6fa', fontFamily: 'Roboto, sans-serif' }}>

      {/* ── Breadcrumb ── */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swap_horiz</span>
          Traspasos
        </span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">Entre sucursales</span>
      </div>

      {/* ── Tabs (subrayado estilo Material) ── */}
      <div
        className="flex-shrink-0 flex items-center gap-8 px-6"
        style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}
      >
        {TABS.map(t => {
          const active = activeTab === t;
          const color = t === 'Entrante' ? '#2563eb' : '#7c3aed';
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="relative flex items-center gap-2 py-4 text-sm font-bold transition-colors"
              style={{ color: active ? '#1a2b6b' : '#9ca3af' }}
            >
              {TRASPASO_TIPO_LABELS[t]}
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: active ? color : '#9ca3af' }}>
                {TRASPASO_TIPO_ICONS[t]}
              </span>
              {contadorPorTipo[t] > 0 && (
                <span
                  className="flex items-center justify-center text-[11px] font-bold rounded-full"
                  style={{
                    minWidth: 20, height: 20, padding: '0 5px',
                    background: active ? 'rgba(26,43,107,0.1)' : 'rgba(107,114,128,0.1)',
                    color: active ? '#1a2b6b' : '#6b7280',
                  }}
                >
                  {contadorPorTipo[t]}
                </span>
              )}
              <span
                className="absolute left-0 right-0 bottom-0 rounded-t-full transition-all"
                style={{ height: 3, background: active ? '#1a2b6b' : 'transparent' }}
              />
            </button>
          );
        })}
      </div>

      {/* ── Contenido de la tab activa ── */}
      <div className="flex-1 overflow-hidden">
        <ScreenTraspasos
          key={activeTab}
          showToast={showToast}
          tipoFilter={activeTab}
          onNuevaSolicitud={activeTab === 'Entrante' ? () => setShowNuevaSolicitud(true) : undefined}
        />
      </div>

      {showNuevaSolicitud && (
        <ModalNuevaSolicitudTraspaso
          onClose={() => setShowNuevaSolicitud(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
