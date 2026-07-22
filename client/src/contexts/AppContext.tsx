// ============================================================
// APYMSA — AppContext
// Global state machine for the full order management module
// ============================================================
import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  AppState, AppScreen, ScannedItem, initialAppState,
  ORDERS_DB, OrderStatus,
  TraspasoPeticion, TraspasoPiezaDetalle, TraspasoStatus, TRASPASOS_DB,
  EmbarqueTraspaso, EMBARQUES_TRASPASO_DB,
} from '@/lib/data';

export interface DiscrepancyResolution {
  code: string;
  tipo: 'Sobrante' | 'Faltante' | 'Producto incorrecto';
  removedFromCount: boolean;
  denied: boolean;
  motivo: string;
}

export interface CrearSolicitudData {
  sucursales: string[];
  piezasPorSucursal: Record<string, TraspasoPiezaDetalle[]>;
  pedidoOrigen: string;
  observaciones?: string;
  autorizacionToken?: string; // requerido cuando no hay pedidoOrigen (Manual sin pedido)
}

export interface CrearSolicitudCedisData {
  piezas: TraspasoPiezaDetalle[];
  pedidoOrigen: string;
  observaciones?: string;
}

export interface EmbarcarTraspasoData {
  embarqueExistenteId?: string; // si se omite, se crea un embarque nuevo
  paqueteria: string;
  observaciones?: string;
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
  // Traspasos
  traspasos: TraspasoPeticion[];
  surtirTraspaso: (petId: string, piezasSurtidas: TraspasoPiezaDetalle[]) => void;
  entregarTraspaso: (petId: string, piezasRecibidas?: TraspasoPiezaDetalle[]) => void;
  crearSolicitudTraspaso: (data: CrearSolicitudData) => string;
  crearSolicitudCedisUrgencia: (data: CrearSolicitudCedisData) => string;
  // Embarques de traspasos
  embarquesTraspaso: EmbarqueTraspaso[];
  embarcarTraspaso: (petId: string, data: EmbarcarTraspasoData) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialAppState);
  const [traspasos, setTraspasos] = useState<TraspasoPeticion[]>(TRASPASOS_DB);
  const [embarquesTraspaso, setEmbarquesTraspaso] = useState<EmbarqueTraspaso[]>(EMBARQUES_TRASPASO_DB);

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

  const surtirTraspaso = useCallback((petId: string, piezasSurtidas: TraspasoPiezaDetalle[]) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setTraspasos(prev => prev.map(t => {
      if (t.id !== petId || t.status !== 'Pendiente') return t;
      const parcial = piezasSurtidas.some(p => p.qtySurtida < p.qtySolicitada);
      return { ...t, status: 'Surtido' as TraspasoStatus, fechaActualizacion: now, piezas: piezasSurtidas, parcial };
    }));
  }, []);

  const entregarTraspaso = useCallback((petId: string, piezasRecibidas?: TraspasoPiezaDetalle[]) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setTraspasos(prev => prev.map(t => {
      if (t.id !== petId || t.status !== 'Enviado') return t;
      // Las cajas llegan físicamente aunque falte alguna pieza dentro (discrepancia de contenido, no de cajas).
      if (!piezasRecibidas) {
        return { ...t, status: 'Recibido' as TraspasoStatus, fechaActualizacion: now, cajasRecibidas: t.cajasTotal };
      }
      const parcial = piezasRecibidas.some(p => p.qtySurtida < p.qtySolicitada);
      return { ...t, status: 'Recibido' as TraspasoStatus, fechaActualizacion: now, piezas: piezasRecibidas, parcial, cajasRecibidas: t.cajasTotal };
    }));
  }, []);

  const embarcarTraspaso = useCallback((petId: string, data: EmbarcarTraspasoData): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const peticion = traspasos.find(t => t.id === petId);
    if (!peticion || peticion.status !== 'Surtido') return '';

    const embarqueId = data.embarqueExistenteId ?? `887${String(Date.now()).slice(-2)}`;

    setEmbarquesTraspaso(prev => {
      const existente = prev.find(e => e.id === embarqueId);
      if (existente) {
        return prev.map(e => e.id === embarqueId
          ? { ...e, paqueteria: data.paqueteria, traspasos: [...e.traspasos, petId] }
          : e);
      }
      const nuevo: EmbarqueTraspaso = {
        id: embarqueId,
        sucursalDestino: peticion.sucursalContraparte,
        paqueteria: data.paqueteria,
        traspasos: [petId],
        status: 'Generado',
        fecha: now,
        observaciones: data.observaciones,
        usuario: 'JMORENO11',
      };
      return [nuevo, ...prev];
    });

    setTraspasos(prev => prev.map(t => t.id === petId
      ? { ...t, status: 'Enviado' as TraspasoStatus, fechaActualizacion: now, embarqueId, metodoEnvio: data.paqueteria }
      : t));

    return embarqueId;
  }, [traspasos]);

  const crearSolicitudTraspaso = useCallback((data: CrearSolicitudData): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const ts = Date.now();
    const solicitudId = `SOL-${String(ts).slice(-4)}`;
    const nuevas: TraspasoPeticion[] = data.sucursales.map((suc, i) => {
      const piezas = (data.piezasPorSucursal[suc] ?? []).map(p => ({ ...p, qtySurtida: 0 }));
      const totalQty = piezas.reduce((s, p) => s + p.qtySolicitada, 0);
      return {
        id: `PET-N${ts}-${i}`,
        solicitudId,
        tipo: 'Entrante' as const,
        categoria: 'Manual' as const,
        sucursalContraparte: suc,
        status: 'Pendiente' as TraspasoStatus,
        fechaCreacion: now,
        fechaActualizacion: now,
        piezas,
        pedidoOrigen: data.pedidoOrigen,
        parcial: false,
        observaciones: data.observaciones,
        autorizacionToken: data.pedidoOrigen ? undefined : data.autorizacionToken,
        usuarioCreador: 'JMORENO11',
        noPapeleta: String(400000 + Math.floor(Math.random() * 99999)),
        packingList: false,
        cajasTotal: Math.max(1, Math.min(12, Math.ceil((totalQty || 1) / 4))),
        cajasRecibidas: 0,
      };
    });
    setTraspasos(prev => [...nuevas, ...prev]);
    return solicitudId;
  }, []);

  const crearSolicitudCedisUrgencia = useCallback((data: CrearSolicitudCedisData): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const ts = Date.now();
    const solicitudId = `SOL-${String(ts).slice(-4)}`;
    const piezas = data.piezas.map(p => ({ ...p, qtySurtida: 0 }));
    const totalQty = piezas.reduce((s, p) => s + p.qtySolicitada, 0);
    const nueva: TraspasoPeticion = {
      id: `PET-N${ts}`,
      solicitudId,
      tipo: 'Entrante',
      categoria: 'CEDIS',
      subtipoCedis: 'Urgencia',
      sucursalContraparte: 'CEDIS',
      status: 'Pendiente',
      fechaCreacion: now,
      fechaActualizacion: now,
      piezas,
      pedidoOrigen: data.pedidoOrigen,
      parcial: false,
      observaciones: data.observaciones,
      usuarioCreador: 'JMORENO11',
      noPapeleta: String(400000 + Math.floor(Math.random() * 99999)),
      packingList: false,
      cajasTotal: Math.max(1, Math.min(12, Math.ceil((totalQty || 1) / 4))),
      cajasRecibidas: 0,
    };
    setTraspasos(prev => [nueva, ...prev]);
    return solicitudId;
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
      traspasos, surtirTraspaso, entregarTraspaso, crearSolicitudTraspaso, crearSolicitudCedisUrgencia,
      embarquesTraspaso, embarcarTraspaso,
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
