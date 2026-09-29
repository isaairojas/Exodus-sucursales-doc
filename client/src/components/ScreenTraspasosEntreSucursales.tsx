// ============================================================
// APYMSA — ScreenTraspasosEntreSucursales
// Contenedor de traspasos entre sucursales: tabs Por enviar / Por recibir
// Design: Enterprise Precision
// ============================================================
import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoTipo } from '@/lib/data';
import ScreenTraspasos from './ScreenTraspasos';
import ModalNuevaSolicitudTraspaso from './ModalNuevaSolicitudTraspaso';
import ModalSolicitarCedis from './ModalSolicitarCedis';
import ModalEnviarCedis from './ModalEnviarCedis';
import ModalReasignarTraspaso from './ModalReasignarTraspaso';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  // El header global manda la vista a abrir. Si cambia entre renders (el usuario
  // vuelve a hacer click en el header y elige la otra), se refleja aquí.
  initialTab?: TraspasoTipo;
  // Salta a la vista principal de pedidos con este pedido preseleccionado.
  onVerPedido?: (pedidoId: string) => void;
  // Salta a la ventana de Embarques con el embarque preseleccionado.
  onVerEmbarque?: (embarqueId: string) => void;
}

export default function ScreenTraspasosEntreSucursales({ showToast, initialTab, onVerPedido, onVerEmbarque }: Props) {
  const { traspasos } = useApp();
  const [activeTab, setActiveTab] = useState<TraspasoTipo>(initialTab ?? 'Entrante');
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  const [showNuevaSolicitud, setShowNuevaSolicitud] = useState(false);
  const [showSolicitarCedis, setShowSolicitarCedis] = useState(false);
  const [showEnviarCedis, setShowEnviarCedis] = useState(false);
  const [reasignarPetId, setReasignarPetId] = useState<string | null>(null);
  const peticionAReasignar = reasignarPetId ? traspasos.find(t => t.id === reasignarPetId) ?? null : null;

  return (
    <div className="flex flex-col h-full" style={{ background: '#f4f6fa', fontFamily: 'Roboto, sans-serif' }}>

      {/* Sin subheader interno: el selector "Por enviar / Por recibir" vive
          en el header global (AppHeader), incrustado en el propio botón ↔
          Traspasos. Aquí solo se renderiza la vista según activeTab. */}

      {/* ── Contenido de la tab activa ── */}
      <div className="flex-1 overflow-hidden">
        <ScreenTraspasos
          key={activeTab}
          showToast={showToast}
          tipoFilter={activeTab}
          onNuevaSolicitud={activeTab === 'Entrante' ? () => setShowNuevaSolicitud(true) : undefined}
          onSolicitarCedis={activeTab === 'Entrante' ? () => setShowSolicitarCedis(true) : undefined}
          onEnviarCedis={activeTab === 'Saliente' ? () => setShowEnviarCedis(true) : undefined}
          onReasignar={petId => setReasignarPetId(petId)}
          onVerPedido={onVerPedido}
          onVerEmbarque={onVerEmbarque}
        />
      </div>

      {showNuevaSolicitud && (
        <ModalNuevaSolicitudTraspaso
          onClose={() => setShowNuevaSolicitud(false)}
          showToast={showToast}
        />
      )}

      {showSolicitarCedis && (
        <ModalSolicitarCedis
          onClose={() => setShowSolicitarCedis(false)}
          showToast={showToast}
        />
      )}

      {showEnviarCedis && (
        <ModalEnviarCedis
          onClose={() => setShowEnviarCedis(false)}
          showToast={showToast}
        />
      )}

      {peticionAReasignar && (
        <ModalReasignarTraspaso
          peticion={peticionAReasignar}
          onClose={() => setReasignarPetId(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
