// ============================================================
// APYMSA — Home Page (State Machine Orchestrator)
// Design: Enterprise Precision
// Screens: auth → orders → review → summary | embarques | revision
// ============================================================
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/useToast';
import AppHeader from '@/components/AppHeader';
import ScreenAuth from '@/components/ScreenAuth';
import ScreenOrders from '@/components/ScreenOrders';
import ScreenReview from '@/components/ScreenReview';
import ScreenSummary from '@/components/ScreenSummary';
import ScreenEmbarques from '@/components/ScreenEmbarques';
import ScreenRevision from '@/components/ScreenRevision';
import ToastContainer from '@/components/ToastContainer';

type DesktopView = 'orders' | 'embarques' | 'revision';

export default function Home() {
  const { state } = useApp();
  const { toasts, showToast, removeToast } = useToast();
  const [desktopView, setDesktopView] = useState<DesktopView>('orders');
  const [preSelectedOrderId, setPreSelectedOrderId] = useState<string | null>(null);

  const handleNavigateToEmbarques = (orderId?: string) => {
    if (orderId) setPreSelectedOrderId(orderId);
    setDesktopView('embarques');
  };

  const handleNavigateToOrders = () => {
    setDesktopView('orders');
    setPreSelectedOrderId(null);
  };

  const handleNavigateToRevision = () => {
    setDesktopView('revision');
  };

  const isOrdersScreen = state.currentScreen === 'orders' || state.currentScreen === 'select';
  const isRevisionActive = desktopView === 'revision' && state.currentScreen !== 'auth';

  return (
    <div className="flex flex-col" style={{ height: '100vh', fontFamily: 'Roboto, sans-serif', overflow: 'hidden' }}>
      <AppHeader
        activeView={desktopView}
        onNavigateToEmbarques={() => handleNavigateToEmbarques()}
        onNavigateToOrders={handleNavigateToOrders}
        onNavigateToRevision={handleNavigateToRevision}
      />

      <main className="flex flex-col flex-1 overflow-hidden">
        {state.currentScreen === 'auth' && <ScreenAuth />}

        {/* Pedidos */}
        {isOrdersScreen && desktopView === 'orders' && (
          <ScreenOrders
            showToast={showToast}
            onNavigateToEmbarques={handleNavigateToEmbarques}
          />
        )}

        {/* Embarques */}
        {isOrdersScreen && desktopView === 'embarques' && (
          <ScreenEmbarques
            showToast={showToast}
            preSelectedOrderId={preSelectedOrderId}
            onBack={handleNavigateToOrders}
          />
        )}

        {/* Revisión — módulo de selección y escaneo de pedidos (maneja review/summary internamente) */}
        {isRevisionActive && <ScreenRevision showToast={showToast} />}

        {/* Flujo de revisión iniciado desde Pedidos (doble clic / botón Revisar) */}
        {!isRevisionActive && state.currentScreen === 'review'  && <ScreenReview showToast={showToast} />}
        {!isRevisionActive && state.currentScreen === 'summary' && <ScreenSummary showToast={showToast} />}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
