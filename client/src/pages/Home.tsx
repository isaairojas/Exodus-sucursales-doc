// ============================================================
// APYMSA — Home Page (State Machine Orchestrator)
// Design: Enterprise Precision
// ============================================================
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/useToast';
import AppHeader from '@/components/AppHeader';
import ScreenAuth from '@/components/ScreenAuth';
import ScreenSelect from '@/components/ScreenSelect';
import ScreenReview from '@/components/ScreenReview';
import ScreenSummary from '@/components/ScreenSummary';
import ToastContainer from '@/components/ToastContainer';

export default function Home() {
  const { state } = useApp();
  const { toasts, showToast, removeToast } = useToast();

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh', fontFamily: 'Roboto, sans-serif' }}>
      <AppHeader />

      <main className="flex flex-col flex-1 overflow-hidden">
        {state.currentScreen === 'auth'    && <ScreenAuth />}
        {state.currentScreen === 'select'  && <ScreenSelect showToast={showToast} />}
        {state.currentScreen === 'review'  && <ScreenReview showToast={showToast} />}
        {state.currentScreen === 'summary' && <ScreenSummary showToast={showToast} />}
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
