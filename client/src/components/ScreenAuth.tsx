// ============================================================
// APYMSA — Screen 1: Authentication
// Design: Enterprise Precision — acceso directo sin biometría
// ============================================================
import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB } from '@/lib/data';

export default function ScreenAuth() {
  const { goToScreen, loadOrder } = useApp();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('pedido');
    if (orderId && ORDERS_DB[orderId] && ORDERS_DB[orderId].status === 'Surtido') {
      loadOrder(orderId);
      goToScreen('review');
      return;
    }
    goToScreen('orders');
  }, [goToScreen, loadOrder]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8edf8 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-10 text-center" style={{ boxShadow: '0 8px 32px rgba(26,43,107,0.12)' }}>
        <p className="text-sm text-gray-500">Ingresando al módulo...</p>
      </div>
    </div>
  );
}
