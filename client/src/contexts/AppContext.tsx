// ============================================================
// APYMSA — AppContext
// Global state machine for the review module
// ============================================================
import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  AppState, AppScreen, ScannedItem, initialAppState,
  ORDERS_DB, PRODUCT_CATALOG,
} from '@/lib/data';

interface AppContextValue {
  state: AppState;
  goToScreen: (screen: AppScreen) => void;
  loadOrder: (orderId: string) => void;
  processScan: (code: string) => void;
  toggleAuthorize: (code: string, qty: number, motivo: string) => void;
  finalizeReview: () => void;
  resetReview: () => void;
  setPreSelectedOrder: (id: string | null) => void;
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

  const loadOrder = useCallback((orderId: string) => {
    const order = ORDERS_DB[orderId];
    if (!order) return;
    const scannedItems: Record<string, ScannedItem> = {};
    order.partidas.forEach(p => {
      scannedItems[p.code] = {
        conteo: 0, authorized: false, authMotivo: '', observacion: '', fromOrder: true,
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
        newItems[code] = { conteo: 0, authorized: false, authMotivo: '', observacion: '', fromOrder: isInOrder };
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

  const finalizeReview = useCallback(() => {
    setState(s => ({ ...s, reviewEndTime: new Date() }));
  }, []);

  const resetReview = useCallback(() => {
    setState({
      ...initialAppState,
      currentScreen: 'select',
    });
  }, []);

  return (
    <AppContext.Provider value={{
      state, goToScreen, loadOrder, processScan,
      toggleAuthorize, finalizeReview, resetReview, setPreSelectedOrder,
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
