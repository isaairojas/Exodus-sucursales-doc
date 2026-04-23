// ============================================================
// APYMSA — Screen 1: Authentication
// Design: Enterprise Precision — fingerprint scan simulation
// ============================================================
import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ORDERS_DB } from '@/lib/data';

export default function ScreenAuth() {
  const { state, goToScreen, loadOrder } = useApp();
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'success'>('idle');

  useEffect(() => {
    // Check URL params for pre-selected order
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('pedido');
    if (orderId && ORDERS_DB[orderId] && ORDERS_DB[orderId].status === 'Surtido') {
      // Store in state via context would need setPreSelectedOrder
      // We'll handle it directly in the auth flow
      (window as any).__preSelectedOrder = orderId;
    }
  }, []);

  const handleActivate = () => {
    if (phase !== 'idle') return;
    setPhase('scanning');
    setTimeout(() => {
      setPhase('success');
      setTimeout(() => {
        const preSelected = (window as any).__preSelectedOrder;
        if (preSelected) {
          loadOrder(preSelected);
          goToScreen('review');
        } else {
          goToScreen('orders');
        }
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8edf8 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-12 flex flex-col items-center gap-6 w-full max-w-sm"
        style={{ boxShadow: '0 8px 32px rgba(26,43,107,0.12)', animation: 'screenFadeIn 0.3s ease' }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <div className="px-5 py-2 rounded-md text-white text-xl font-bold tracking-widest"
            style={{ background: '#1a2b6b', letterSpacing: '2px' }}>
            APYMSA
          </div>
          <div className="text-xs text-gray-400 tracking-wide">Autopartes y Mayoreo, S.A. de C.V.</div>
        </div>

        {/* Title */}
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: '#1a2b6b' }}>Módulo de Revisión</div>
          <div className="text-sm text-gray-400 mt-1">Autenticación requerida para continuar</div>
        </div>

        {/* Fingerprint */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Pulse rings */}
          {phase === 'idle' && (
            <>
              <div className="absolute w-32 h-32 rounded-full border-2"
                style={{ borderColor: '#2563eb', animation: 'fpPulse 2.5s ease-out infinite', opacity: 0 }} />
              <div className="absolute w-32 h-32 rounded-full border-2"
                style={{ borderColor: '#2563eb', animation: 'fpPulse 2.5s ease-out 0.8s infinite', opacity: 0 }} />
              <div className="absolute w-32 h-32 rounded-full border-2"
                style={{ borderColor: '#2563eb', animation: 'fpPulse 2.5s ease-out 1.6s infinite', opacity: 0 }} />
            </>
          )}

          {/* Icon */}
          <span
            className="material-symbols-outlined relative z-10 transition-all duration-300"
            style={{
              fontSize: 80,
              color: phase === 'success' ? '#16a34a' : phase === 'scanning' ? '#2563eb' : '#1a2b6b',
              fontVariationSettings: phase === 'success' ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48",
            }}>
            {phase === 'success' ? 'check_circle' : 'fingerprint'}
          </span>

          {/* Scan sweep */}
          {phase === 'scanning' && (
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-20">
              <div className="absolute left-0 right-0 h-1"
                style={{
                  background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
                  animation: 'scanSweep 0.6s linear infinite',
                }} />
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-sm font-medium text-center min-h-5"
          style={{ color: phase === 'success' ? '#16a34a' : '#6b7280' }}>
          {phase === 'idle' && 'Presione el botón para autenticarse'}
          {phase === 'scanning' && 'Escaneando huella...'}
          {phase === 'success' && 'Identidad confirmada — Cosme'}
        </div>

        {/* Button */}
        <button
          onClick={handleActivate}
          disabled={phase !== 'idle'}
          className="flex items-center gap-2 px-7 py-3 rounded-lg text-white font-medium text-sm transition-all duration-200"
          style={{
            background: phase !== 'idle' ? '#d1d5db' : '#1a2b6b',
            color: phase !== 'idle' ? '#9ca3af' : 'white',
            cursor: phase !== 'idle' ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (phase === 'idle') (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'; }}
          onMouseLeave={e => { if (phase === 'idle') (e.currentTarget as HTMLButtonElement).style.background = '#1a2b6b'; }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>fingerprint</span>
          Activar lector de huella
        </button>
      </div>
    </div>
  );
}
