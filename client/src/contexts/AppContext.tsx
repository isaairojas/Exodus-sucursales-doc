// ============================================================
// APYMSA — AppContext
// Global state machine for the review module
// ============================================================
import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  AppState, AppScreen, ScannedItem, initialAppState,
  ORDERS_DB, PRODUCT_CATALOG,
} from '@/lib/data';

// Resolution map passed from ModalDiscrepancy on confirm
export interface DiscrepancyResolution {
  code: string;
  tipo: 'Sobrante' | 'Faltante' | 'Producto incorrecto';
  removedFromCount: boolean; // Faltante: "Retirar pieza del conteo"
  denied: boolean;           // Faltante: "Autorizar faltante" with motivo
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

  // Apply discrepancy resolutions from ModalDiscrepancy before going to summary
  const finalizeReview = useCallback((resolutions?: DiscrepancyResolution[]) => {
    setState(s => {
      let newItems = { ...s.scannedItems };

      if (resolutions) {
        resolutions.forEach(r => {
          const item = newItems[r.code];
          if (!item) return;
          if (r.tipo === 'Faltante') {
            if (r.removedFromCount) {
              // Treat as if the right quantity was scanned — set conteo = req
              const order = s.selectedOrderId ? ORDERS_DB[s.selectedOrderId] : null;
              const partida = order?.partidas.find(p => p.code === r.code);
              const req = partida?.qty ?? item.conteo;
              newItems[r.code] = {
                ...item,
                conteo: req,
                removedFromCount: true,
                denied: false,
                authorized: false,
                authMotivo: '',
              };
            } else if (r.denied) {
              // Authorized faltante → mark as denied (status "Producto negado")
              newItems[r.code] = {
                ...item,
                denied: true,
                authorized: true,
                authMotivo: r.motivo,
                removedFromCount: false,
              };
            }
          }
          if (r.tipo === 'Sobrante') {
            // User physically removed the excess — adjust conteo down to required qty
            const order = s.selectedOrderId ? ORDERS_DB[s.selectedOrderId] : null;
            const partida = order?.partidas.find(p => p.code === r.code);
            const req = partida?.qty ?? item.conteo;
            newItems[r.code] = {
              ...item,
              conteo: req,
              removedFromCount: true,
              denied: false,
              authorized: false,
              authMotivo: '',
            };
          }
          // Incorrecto doesn't affect order partidas in the summary
        });
      }

      return { ...s, scannedItems: newItems, reviewEndTime: new Date() };
    });
  }, []);

  // Reset review but keep completedOrderIds so selection list hides reviewed orders
  const resetReview = useCallback(() => {
    setState(s => ({
      ...initialAppState,
      currentScreen: 'select',
      completedOrderIds: s.selectedOrderId
        ? [...s.completedOrderIds, s.selectedOrderId]
        : s.completedOrderIds,
    }));
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
