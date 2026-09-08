// ============================================================
// APYMSA — AppContext
// Global state machine for the full order management module
// ============================================================
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CLIENT_ID, fetchState, pushState, resetState, subscribe } from '@/lib/realtimeSync';
import {
  AppState, AppScreen, ScannedItem, initialAppState,
  ORDERS_DB, OrderStatus,
  TraspasoPeticion, TraspasoPiezaDetalle, TraspasoStatus, TRASPASOS_DB,
  EmbarqueTraspaso, EMBARQUES_TRASPASO_DB, MotivoCancelacion,
  SUCURSAL_LOCAL, MotivoEnvioCedis,
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

export interface CrearEnvioCedisData {
  piezas: TraspasoPiezaDetalle[];
  motivo: MotivoEnvioCedis;
  observaciones?: string;
}

export interface EmbarcarTraspasoData {
  embarqueExistenteId?: string; // si se omite, se crea un embarque nuevo
  paqueteria: string;
  observaciones?: string;
}

interface AppContextValue {
  state: AppState;
  // Sucursal actualmente seleccionada (selector global). Define la perspectiva
  // Entrante/Saliente de los traspasos y la existencia "local" en toda la app.
  sucursalActual: string;
  setSucursalActual: (sucursal: string) => void;
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
  revisarTraspaso: (petId: string, conIncidencias: boolean) => void;
  entregarTraspaso: (petId: string, piezasRecibidas?: TraspasoPiezaDetalle[]) => void;
  crearSolicitudTraspaso: (data: CrearSolicitudData) => string;
  crearSolicitudCedisUrgencia: (data: CrearSolicitudCedisData) => string;
  crearEnvioCedis: (data: CrearEnvioCedisData) => string;
  // Estado compartido en tiempo real
  reiniciarEstadoCompartido: () => void;
  cancelarPeticiones: (ids: string[], motivo: MotivoCancelacion) => void;
  // Embarques de traspasos
  embarquesTraspaso: EmbarqueTraspaso[];
  embarcarTraspaso: (petId: string, data: EmbarcarTraspasoData) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialAppState);
  const [sucursalActual, setSucursalActual] = useState<string>(SUCURSAL_LOCAL);
  const [traspasos, setTraspasos] = useState<TraspasoPeticion[]>(TRASPASOS_DB);
  const [embarquesTraspaso, setEmbarquesTraspaso] = useState<EmbarqueTraspaso[]>(EMBARQUES_TRASPASO_DB);

  // ── Estado compartido en tiempo real (multi-computadora) ──
  // El snapshot compartido = traspasos + embarques + estatus de pedidos. Se
  // hidrata del servidor al entrar, se propaga por SSE y se guarda hasta reiniciar.
  const hydratedRef = useRef(false);
  const lastSyncedRef = useRef<string>('');   // dedupe: evita reenviar el eco de lo recibido
  const lastVersionRef = useRef<number>(-1);
  const buildSnapshotJson = (
    tr: TraspasoPeticion[], emb: EmbarqueTraspaso[], os: Record<string, OrderStatus>,
  ) => JSON.stringify({ traspasos: tr, embarquesTraspaso: emb, orderStatuses: os });

  const aplicarSnapshot = (snap: any) => {
    if (!snap) return;
    lastSyncedRef.current = buildSnapshotJson(snap.traspasos ?? [], snap.embarquesTraspaso ?? [], snap.orderStatuses ?? {});
    setTraspasos(snap.traspasos ?? []);
    setEmbarquesTraspaso(snap.embarquesTraspaso ?? []);
    setState(s => ({ ...s, orderStatuses: snap.orderStatuses ?? {} }));
  };

  const restablecerSemilla = () => {
    lastSyncedRef.current = buildSnapshotJson(TRASPASOS_DB, EMBARQUES_TRASPASO_DB, initialAppState.orderStatuses);
    setTraspasos(TRASPASOS_DB);
    setEmbarquesTraspaso(EMBARQUES_TRASPASO_DB);
    setState(s => ({ ...s, orderStatuses: initialAppState.orderStatuses }));
  };

  // Hidratación inicial + suscripción SSE.
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const data = await fetchState();
      if (data && data.snapshot) {
        aplicarSnapshot(data.snapshot);
        lastVersionRef.current = data.version;
      } else {
        // Nadie ha compartido estado aún: publico la semilla local.
        lastSyncedRef.current = buildSnapshotJson(TRASPASOS_DB, EMBARQUES_TRASPASO_DB, initialAppState.orderStatuses);
        pushState({ traspasos: TRASPASOS_DB, embarquesTraspaso: EMBARQUES_TRASPASO_DB, orderStatuses: initialAppState.orderStatuses });
      }
      hydratedRef.current = true;
      unsub = subscribe(evt => {
        if (evt.type === 'reset') { lastVersionRef.current = evt.version; restablecerSemilla(); return; }
        if (evt.type === 'state') {
          if (evt.version <= lastVersionRef.current) return;
          lastVersionRef.current = evt.version;
          if (evt.senderId === CLIENT_ID) return; // eco de mis propios cambios
          if (evt.snapshot) aplicarSnapshot(evt.snapshot);
        }
      });
    })();
    return () => unsub();
  }, []);

  // Propaga los cambios locales al estado compartido (con dedupe y debounce).
  useEffect(() => {
    if (!hydratedRef.current) return;
    const json = buildSnapshotJson(traspasos, embarquesTraspaso, state.orderStatuses);
    if (json === lastSyncedRef.current) return;
    lastSyncedRef.current = json;
    const id = setTimeout(() => { pushState(JSON.parse(json)); }, 150);
    return () => clearTimeout(id);
  }, [traspasos, embarquesTraspaso, state.orderStatuses]);

  const reiniciarEstadoCompartido = useCallback(() => { resetState(); }, []);

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

  // Revisión de traspaso Saliente: Surtido → Revisado (parcial si hubo incidencias).
  const revisarTraspaso = useCallback((petId: string, conIncidencias: boolean) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setTraspasos(prev => prev.map(t => {
      if (t.id !== petId || t.status !== 'Surtido') return t;
      return {
        ...t,
        status: 'Revisado' as TraspasoStatus,
        fechaActualizacion: now,
        parcial: conIncidencias || t.parcial,
        resultado: conIncidencias ? 'surtida-parcial' : 'revisada',
      };
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

    const embarqueId = data.embarqueExistenteId ?? `EM${String(Date.now() % 10_000_000).padStart(7, '0')}`;

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
    const pad7 = (n: number) => String(Math.abs(Math.trunc(n)) % 10_000_000).padStart(7, '0');
    const solicitudId = `S${pad7(ts)}`;
    const nuevas: TraspasoPeticion[] = data.sucursales.map((suc, i) => {
      const piezas = (data.piezasPorSucursal[suc] ?? []).map(p => ({ ...p, qtySurtida: 0 }));
      const totalQty = piezas.reduce((s, p) => s + p.qtySolicitada, 0);
      return {
        id: `TM${pad7(ts + i)}`,
        solicitudId,
        tipo: 'Entrante' as const,
        categoria: 'Manual' as const,
        sucursalContraparte: suc,
        // Modelo de dos lados: la sucursal actual es la que recibe (destino);
        // la sucursal donante (suc) es el origen que surtirá y enviará.
        sucursalDestino: sucursalActual,
        sucursalOrigen: suc,
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
  }, [sucursalActual]);

  const crearSolicitudCedisUrgencia = useCallback((data: CrearSolicitudCedisData): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const ts = Date.now();
    const pad7 = (n: number) => String(Math.abs(Math.trunc(n)) % 10_000_000).padStart(7, '0');
    const solicitudId = `S${pad7(ts)}`;
    const piezas = data.piezas.map(p => ({ ...p, qtySurtida: 0 }));
    const totalQty = piezas.reduce((s, p) => s + p.qtySolicitada, 0);
    const nueva: TraspasoPeticion = {
      id: `TU${pad7(ts)}`,
      solicitudId,
      tipo: 'Entrante',
      categoria: 'CEDIS',
      subtipoCedis: 'Urgencia',
      sucursalContraparte: 'CEDIS',
      // Recepción desde CEDIS hacia la sucursal actual (destino).
      sucursalDestino: sucursalActual,
      sucursalOrigen: 'CEDIS',
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
  }, [sucursalActual]);

  // Envío de mercancía de la sucursal HACIA CEDIS (devolución / garantía).
  // Sale de la sucursal actual (origen) con destino CEDIS; sigue el pipeline
  // normal de "Por enviar" (Pendiente → Surtido → Revisado → Enviado).
  const crearEnvioCedis = useCallback((data: CrearEnvioCedisData): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const ts = Date.now();
    const pad7 = (n: number) => String(Math.abs(Math.trunc(n)) % 10_000_000).padStart(7, '0');
    const solicitudId = `S${pad7(ts)}`;
    const piezas = data.piezas.map(p => ({ ...p, qtySurtida: 0 }));
    const totalQty = piezas.reduce((s, p) => s + p.qtySolicitada, 0);
    const nueva: TraspasoPeticion = {
      id: `TM${pad7(ts)}`,
      solicitudId,
      tipo: 'Saliente',
      categoria: 'Manual',
      sucursalContraparte: 'CEDIS',
      sucursalOrigen: sucursalActual,
      sucursalDestino: 'CEDIS',
      motivoEnvioCedis: data.motivo,
      status: 'Pendiente',
      fechaCreacion: now,
      fechaActualizacion: now,
      piezas,
      pedidoOrigen: '',
      parcial: false,
      observaciones: data.observaciones,
      usuarioCreador: 'JMORENO11',
      noPapeleta: String(480000 + Math.floor(Math.random() * 99999)),
      packingList: false,
      cajasTotal: Math.max(1, Math.min(12, Math.ceil((totalQty || 1) / 4))),
      cajasRecibidas: 0,
      flujo: 'Manual',
      intento: 1,
    };
    setTraspasos(prev => [nueva, ...prev]);
    return solicitudId;
  }, [sucursalActual]);

  // Eliminación/ajuste de peticiones auto/semi cuando una urgencia CEDIS o un
  // movimiento manual sustituye su mercancía. NO toca las que ya están en tránsito.
  const cancelarPeticiones = useCallback((ids: string[], motivo: MotivoCancelacion) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const noModificable: TraspasoStatus[] = ['Enviado', 'Recibido', 'Entregado'];
    setTraspasos(prev => prev.map(t =>
      ids.includes(t.id) && !noModificable.includes(t.status)
        ? { ...t, status: 'Cancelado' as TraspasoStatus, fechaActualizacion: now, resultado: 'cancelada', motivoCancelacion: motivo }
        : t
    ));
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
      state, sucursalActual, setSucursalActual,
      goToScreen, loadOrder, processScan,
      toggleAuthorize, finalizeReview, resetReview,
      setPreSelectedOrder, updateOrderStatus,
      traspasos, surtirTraspaso, revisarTraspaso, entregarTraspaso, crearSolicitudTraspaso, crearSolicitudCedisUrgencia, crearEnvioCedis, cancelarPeticiones,
      reiniciarEstadoCompartido,
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
