// ============================================================
// APYMSA — AppContext
// Global state machine for the full order management module
// ============================================================
import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  AppState, AppScreen, ScannedItem, initialAppState,
  ORDERS_DB, OrderStatus,
} from '@/lib/data';

export interface DiscrepancyResolution {
  code: string;
  tipo: 'Sobrante' | 'Faltante' | 'Producto incorrecto';
  removedFromCount: boolean;
  denied: boolean;
  motivo: string;
}

interface AppContextValue {
  state: AppState;
  goToScreen: (screen: AppScreen) => void;
  loadOrder: (orderId: string) => void;
  processScan: (code: string) => void;
  toggleAuthorize: (code: string, qty: number, motivo: string) => void;
  finalizeReview: (resolutions?: DiscrepancyResolution[]) => void;
  resetReview: () => void;
  setPreSelectedOrder: (id: string | null) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialAppState);

  const goToScreen = useCallback((screen: AppScreen) => {
    setState(s => ({ ...s, currentScreen: screen }));
  }, []);

  const setPreSelectedOrder = useCallback((id: string | null) => {
    setState(s => ({ ...s, preSelectedOrderId: id }));
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setState(s => ({
      ...s,
      orderStatuses: { ...s.orderStatuses, [orderId]: status },
    }));
  }, []);

  const loadOrder = useCallback((orderId: string) => {
    const order = ORDERS_DB[orderId];
    if (!order) return;
    const scannedItems: Record<string, ScannedItem> = {};
    order.partidas.forEach(p => {
      scannedItems[p.code] = {
        conteo: 0, authorized: false, authMotivo: '', observacion: '',
        fromOrder: true, removedFromCount: false, denied: false,
      };
    });
    setState(s => ({
      ...s,
      selectedOrderId: orderId,
      scannedItems,
      unknownProducts: [],
      lastScannedCode: null,
      reviewStartTime: new Date(),
      reviewEndTime: null,
    }));
  }, []);

  const processScan = useCallback((code: string) => {
    setState(s => {
      if (!s.selectedOrderId) return s;
      const order = ORDERS_DB[s.selectedOrderId];
      const isInOrder = order.partidas.some(p => p.code === code);
      const newItems = { ...s.scannedItems };
      const newUnknown = [...s.unknownProducts];

      if (!newItems[code]) {
        newItems[code] = {
          conteo: 0, authorized: false, authMotivo: '', observacion: '',
          fromOrder: isInOrder, removedFromCount: false, denied: false,
        };
      }
      newItems[code] = { ...newItems[code], conteo: newItems[code].conteo + 1 };

      if (!isInOrder && !newUnknown.includes(code)) {
        newUnknown.push(code);
      }

      return { ...s, scannedItems: newItems, unknownProducts: newUnknown, lastScannedCode: code };
    });
  }, []);

  const toggleAuthorize = useCallback((code: string, _qty: number, motivo: string) => {
    setState(s => {
      const item = s.scannedItems[code];
      if (!item) return s;
      const newItems = { ...s.scannedItems };
      newItems[code] = { ...item, authorized: !item.authorized, authMotivo: item.authorized ? '' : motivo };
      return { ...s, scannedItems: newItems };
    });
  }, []);

  const finalizeReview = useCallback((resolutions?: DiscrepancyResolution[]) => {
    setState(s => {
      let newItems = { ...s.scannedItems };

      if (resolutions) {
        resolutions.forEach(r => {
          const item = newItems[r.code];
          if (!item) return;
          if (r.tipo === 'Faltante') {
            if (r.removedFromCount) {
              const order = s.selectedOrderId ? ORDERS_DB[s.selectedOrderId] : null;
              const partida = order?.partidas.find(p => p.code === r.code);
              const req = partida?.qty ?? item.conteo;
              newItems[r.code] = {
                ...item, conteo: req, removedFromCount: true,
                denied: false, authorized: false, authMotivo: '',
              };
            } else if (r.denied) {
              newItems[r.code] = {
                ...item, denied: true, authorized: true,
                authMotivo: r.motivo, removedFromCount: false,
              };
            }
          }
          if (r.tipo === 'Sobrante') {
            const order = s.selectedOrderId ? ORDERS_DB[s.selectedOrderId] : null;
            const partida = order?.partidas.find(p => p.code === r.code);
            const req = partida?.qty ?? item.conteo;
            newItems[r.code] = {
              ...item, conteo: req, removedFromCount: true,
              denied: false, authorized: false, authMotivo: '',
            };
          }
        });
      }

      // Determine new order status after review
      const hasIncidencias = s.selectedOrderId
        ? ORDERS_DB[s.selectedOrderId]?.partidas.some(p => {
            const item = newItems[p.code];
            if (!item) return false;
            if (item.removedFromCount) return false;
            if (item.denied) return true;
            return item.conteo !== p.qty;
          })
        : false;

      const newStatus: OrderStatus = hasIncidencias ? 'Revisado con incidencias' : 'Revisado';
      const newOrderStatuses = s.selectedOrderId
        ? { ...s.orderStatuses, [s.selectedOrderId]: newStatus }
        : s.orderStatuses;

      return { ...s, scannedItems: newItems, reviewEndTime: new Date(), orderStatuses: newOrderStatuses };
    });
  }, []);

  const resetReview = useCallback(() => {
    setState(s => ({
      ...initialAppState,
      currentScreen: 'orders',
      orderStatuses: s.orderStatuses,
      completedOrderIds: s.selectedOrderId
        ? [...s.completedOrderIds, s.selectedOrderId]
        : s.completedOrderIds,
    }));
  }, []);

  return (
    <AppContext.Provider value={{
      state, goToScreen, loadOrder, processScan,
      toggleAuthorize, finalizeReview, resetReview,
      setPreSelectedOrder, updateOrderStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
