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
  const { state, resetReview } = useApp();
  const { toasts, showToast, removeToast } = useToast();
  const [desktopView, setDesktopView] = useState<DesktopView>('orders');
  const [preSelectedOrderId, setPreSelectedOrderId] = useState<string | null>(null);
  const [preSelectedShipmentId, setPreSelectedShipmentId] = useState<string | null>(null);
  const [openCreateShipmentSignal, setOpenCreateShipmentSignal] = useState(0);
  const [postReviewOrderId, setPostReviewOrderId] = useState<string | null>(null);
  const [openFacturaOrderId, setOpenFacturaOrderId] = useState<string | null>(null);

  const handlePostReviewPrompt = (orderId: string) => {
    // 1) Cerrar modal de revisión
    resetReview();
    // 2) Mostrar modal de confirmación después de cerrar revisión
    setTimeout(() => setPostReviewOrderId(orderId), 120);
  };

  const handleNavigateToEmbarques = (target?: { orderId?: string; shipmentId?: string; openCreate?: boolean }) => {
    setPreSelectedOrderId(target?.orderId ?? null);
    setPreSelectedShipmentId(target?.shipmentId ?? null);
    if (target?.openCreate) {
      setOpenCreateShipmentSignal(s => s + 1);
    }
    setDesktopView('embarques');
  };

  const handleNavigateToOrders = () => {
    setDesktopView('orders');
    setPreSelectedOrderId(null);
    setPreSelectedShipmentId(null);
    setOpenCreateShipmentSignal(0);
  };

  const isReviewFlowOpen = state.currentScreen === 'review' || state.currentScreen === 'summary';
  const canShowMainPanels = state.currentScreen === 'orders' || state.currentScreen === 'select' || isReviewFlowOpen;

  return (
    <div className="flex flex-col" style={{ height: '100vh', fontFamily: 'Roboto, sans-serif', overflow: 'hidden' }}>
      <AppHeader
        activeView={desktopView}
        onNavigateToEmbarques={() => handleNavigateToEmbarques()}
        onNavigateToOrders={handleNavigateToOrders}
      />

      <main className="flex flex-col flex-1 overflow-hidden">
        {state.currentScreen === 'auth' && <ScreenAuth />}

        {/* Pedidos */}
        {canShowMainPanels && desktopView === 'orders' && (
          <ScreenOrders
            showToast={showToast}
            onNavigateToEmbarques={handleNavigateToEmbarques}
            openFacturaOrderId={openFacturaOrderId}
            onFacturaOrderHandled={() => setOpenFacturaOrderId(null)}
          />
        )}

        {/* Embarques */}
        {canShowMainPanels && desktopView === 'embarques' && (
          <ScreenEmbarques
            showToast={showToast}
            preSelectedOrderId={preSelectedOrderId}
            preSelectedShipmentId={preSelectedShipmentId}
            openCreateShipmentSignal={openCreateShipmentSignal}
            onBack={handleNavigateToOrders}
          />
        )}
      </main>

      {/* Flujo de revisión como modal encima de Pedidos */}
      {desktopView === 'orders' && isReviewFlowOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="w-[50vw] h-[92vh] min-w-[760px] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: '#fff', boxShadow: '0 24px 70px rgba(0,0,0,0.35)', animation: 'modalIn 0.22s ease' }}
          >
            {state.currentScreen === 'review'  && (
              <ScreenReview
                showToast={showToast}
                onPostReviewPrompt={handlePostReviewPrompt}
              />
            )}
            {state.currentScreen === 'summary' && <ScreenSummary showToast={showToast} />}
          </div>
        </div>
      )}

      {postReviewOrderId && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.52)', animation: 'screenFadeIn 0.2s ease' }}>
          <div className="bg-white rounded-xl flex flex-col" style={{ width: 520, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'modalIn 0.25s ease' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #e5e7eb', background: '#1a2b6b', borderRadius: '12px 12px 0 0' }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>help</span>
                <span className="font-bold text-sm text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
                  Confirmación posterior a revisión
                </span>
              </div>
              <span className="px-3 py-1 rounded text-xs font-bold text-white" style={{ background: '#2563eb' }}>
                Pedido #{postReviewOrderId}
              </span>
            </div>

            <div className="p-6">
              <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span className="material-symbols-outlined mt-0.5" style={{ fontSize: 18, color: '#2563eb' }}>receipt_long</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1a2b6b' }}>¿Desea facturar este pedido?</p>
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    La revisión se completó correctamente. Puede continuar con la facturación ahora o regresar a pedidos.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4" style={{ borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => setPostReviewOrderId(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                style={{ border: '1.5px solid #d1d5db', color: '#374151', background: 'white', fontFamily: 'Roboto, sans-serif' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                Regresar a pedidos
              </button>
              <button
                onClick={() => {
                  setOpenFacturaOrderId(postReviewOrderId);
                  setPostReviewOrderId(null);
                  setDesktopView('orders');
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: '#16a34a', fontFamily: 'Roboto, sans-serif' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                Facturar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
