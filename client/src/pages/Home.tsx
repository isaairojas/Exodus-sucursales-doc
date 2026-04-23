// ============================================================
// APYMSA — Home Page (State Machine Orchestrator)
// Design: Enterprise Precision
// Screens: auth → orders → review → summary | embarques
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
import ToastContainer from '@/components/ToastContainer';

type DesktopView = 'orders' | 'embarques';

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

  return (
    <div className="flex flex-col" style={{ height: '100vh', fontFamily: 'Roboto, sans-serif', overflow: 'hidden' }}>
      <AppHeader activeView={desktopView} onNavigateToEmbarques={() => handleNavigateToEmbarques()} onNavigateToOrders={handleNavigateToOrders} />

      <main className="flex flex-col flex-1 overflow-hidden">
        {state.currentScreen === 'auth' && <ScreenAuth />}

        {(state.currentScreen === 'orders' || state.currentScreen === 'select') && desktopView === 'orders' && (
          <ScreenOrders
            showToast={showToast}
            onNavigateToEmbarques={() => handleNavigateToEmbarques()}
          />
        )}

        {state.currentScreen === 'orders' && desktopView === 'embarques' && (
          <ScreenEmbarques
            showToast={showToast}
            preSelectedOrderId={preSelectedOrderId}
            onBack={handleNavigateToOrders}
          />
        )}

        {state.currentScreen === 'review'  && <ScreenReview showToast={showToast} />}
        {state.currentScreen === 'summary' && <ScreenSummary showToast={showToast} />}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
