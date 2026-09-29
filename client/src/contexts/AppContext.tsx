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
  EmbarqueTraspaso, EMBARQUES_TRASPASO_DB, generarIdEmbarque, tipoPaqueteriaDe, MotivoCancelacion,
  DocumentacionPorPedido, CotizacionPaqueteria, ShipmentStatus, EmbarqueEvento,
  SUCURSALES_EJERCICIO, MotivoEnvioCedis, calcularSucursalRecomendada, RecepcionLogEntry,
} from '@/lib/data';
import { TIEMPO_APROBACION_TOKEN_MS } from '@/lib/traspasoConfig';
import { mockGenerarGuiaEstafeta, mockSolicitarUber, mockSolicitarBlueGo } from '@/lib/paqueterias';

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
  finalizarSurtidoTraspaso: (petId: string, piezasSurtidas: TraspasoPiezaDetalle[], nota?: string) => string | null;
  finalizarRevisionTraspaso: (petId: string, piezasRevisadas: TraspasoPiezaDetalle[], nota?: string) => string | null;
  // `esRechazo=true` (default): la sucursal DONANTE rechaza el traspaso → resultado 'rechazada'
  //                              (la sucursal solicitante puede REASIGNARLO a otra sucursal).
  // `esRechazo=false`: cancelación (p. ej. Manual sin pedido o envío a CEDIS) → resultado 'cancelada'
  //                    (NO se puede reasignar; solo cierra la petición).
  negarTraspaso: (petId: string, motivo: string, esRechazo?: boolean) => string | null;
  reasignarPeticion: (petId: string) => { ok: boolean; mensaje: string; derivadaId?: string };
  reasignarPeticionA: (petId: string, donante: string) => { ok: boolean; mensaje: string; derivadaId?: string };
  cancelarSolicitud: (petId: string) => { ok: boolean; mensaje: string };
  generarSolicitudRestante: (petId: string) => { ok: boolean; mensaje: string; derivadaId?: string };
  revisarTraspaso: (petId: string, conIncidencias: boolean) => void;
  entregarTraspaso: (petId: string, piezasRecibidas?: TraspasoPiezaDetalle[]) => void;
  // Dar entrada al inventario: Recibido → Entregado (Finalizado). En el futuro
  // abrirá una ventana propia con el proceso completo de entrada a inventario;
  // por ahora solo mueve la petición a Finalizados.
  darEntradaInventario: (petId: string) => void;
  confirmarRecepcion: (petId: string, data: { tipo: 'Completa' | 'Parcial'; nota?: string; cajasRecibidas?: number }) => void;
  crearSolicitudTraspaso: (data: CrearSolicitudData) => string;
  crearSolicitudCedisUrgencia: (data: CrearSolicitudCedisData) => string;
  aprobarSolicitudCedisDraft: (petId: string) => void;
  crearEnvioCedis: (data: CrearEnvioCedisData) => string;
  // Estado compartido en tiempo real
  reiniciarEstadoCompartido: () => void;
  cancelarPeticiones: (ids: string[], motivo: MotivoCancelacion) => void;
  // Embarques de traspasos
  embarquesTraspaso: EmbarqueTraspaso[];
  embarcarTraspaso: (petId: string, data: EmbarcarTraspasoData) => string;
  // Flujo post-revisión: al finalizar revisión se ofrece crear/agregar
  // embarque. Estos handlers son atómicos y devuelven el id del embarque.
  crearEmbarqueParaTraspaso: (petId: string) => string;
  agregarTraspasoAEmbarque: (petId: string, embarqueId: string) => void;
  // Handlers del refactor de embarque (docs/flujo-embarque-cambios.md §4.1)
  guardarDocumentacionEmbarque: (embarqueId: string, doc: DocumentacionPorPedido[], cotizacion: CotizacionPaqueteria) => void;
  // Genera guía asincrónica (llamada MOCK a la paquetería WebService).
  // La guía queda ANOTADA pero el shipment NO transita a EntregadoAPaqueteria:
  // esa transición la dispara el logístico con confirmarEntregadoAPaqueteria().
  generarGuiaPaqueteria: (embarqueId: string) => Promise<string>;
  // Manual + WebService: el logístico confirma que ya entregó / la paquetería recolectó.
  confirmarEntregadoAPaqueteria: (embarqueId: string) => void;
  // Alias legacy (Manual únicamente) — se mantiene por compat con F6.
  confirmarEntregadoAPaqueteriaManual: (embarqueId: string) => void;
  // Uber / BlueGo — MOCK de la API que despacha una unidad.
  solicitarRepartoUber: (embarqueId: string) => Promise<string>;
  solicitarRepartoBlueGo: (embarqueId: string) => Promise<string>;
  confirmarRepartoFinalizado: (embarqueId: string) => void;
  // F27 — Notas/observaciones libres del embarque.
  actualizarObservacionesEmbarque: (embarqueId: string, texto: string) => void;
  // F30 — Duplicar un embarque (copia destino/paquetería, sin traspasos ni guía).
  duplicarEmbarque: (embarqueId: string) => string;
  // F33 — Cancelar embarque (solo cuando aún está Generado). Libera los traspasos.
  cancelarEmbarque: (embarqueId: string, motivo: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialAppState);
  const [sucursalActual, setSucursalActual] = useState<string>(SUCURSALES_EJERCICIO[0]);
  const [traspasos, setTraspasos] = useState<TraspasoPeticion[]>(() => {
    // Aplica la promoción de status (Revisado+embarqueId → Embarcado/Documentado)
    // sobre el seed también, para no depender del snapshot compartido.
    const byId = new Map(EMBARQUES_TRASPASO_DB.map(e => [e.id, e]));
    return TRASPASOS_DB.map(t => {
      if (!t.embarqueId) return t;
      const e = byId.get(t.embarqueId);
      if (!e) return t;
      const tieneDoc = !!e.paqueteriaSeleccionada;
      if (t.status === 'Revisado') return { ...t, status: (tieneDoc ? 'Documentado' : 'Embarcado') as TraspasoStatus };
      if (t.status === 'Embarcado' && tieneDoc) return { ...t, status: 'Documentado' as TraspasoStatus };
      return t;
    });
  });
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

  // Promueve el status del traspaso según el embarque al que pertenece:
  //   • Revisado + embarqueId → Embarcado (tiene embarque pero sin documentar)
  //   • Revisado/Embarcado + embarque con paqueteriaSeleccionada → Documentado
  // Data cargada (seed o snapshot compartido) con el viejo modelo colapsado
  // llegaba como "Revisado" con embarqueId, y por eso se veía en la card
  // "Pendiente de envío" en vez de "Embarcado".
  const migrarStatusTraspasos = (
    tr: TraspasoPeticion[], emb: EmbarqueTraspaso[],
  ): TraspasoPeticion[] => {
    const byId = new Map(emb.map(e => [e.id, e]));
    return tr.map(t => {
      if (!t.embarqueId) return t;
      const e = byId.get(t.embarqueId);
      if (!e) return t;
      const tieneDoc = !!e.paqueteriaSeleccionada;
      if (t.status === 'Revisado') {
        return { ...t, status: (tieneDoc ? 'Documentado' : 'Embarcado') as TraspasoStatus };
      }
      if (t.status === 'Embarcado' && tieneDoc) {
        return { ...t, status: 'Documentado' as TraspasoStatus };
      }
      return t;
    });
  };

  const aplicarSnapshot = (snap: any) => {
    if (!snap) return;
    // Migración silenciosa: 'En reparto' (legacy) → 'Entregado a paquetería'.
    // Aplica a shipments cargados del snapshot compartido. Ver §2.4 del md.
    const embarquesMigrados: EmbarqueTraspaso[] = (snap.embarquesTraspaso ?? []).map((e: EmbarqueTraspaso) =>
      (e as unknown as { status: string }).status === 'En reparto'
        ? { ...e, status: 'Entregado a paquetería' as ShipmentStatus }
        : e
    );
    const traspasosMigrados = migrarStatusTraspasos(snap.traspasos ?? [], embarquesMigrados);
    lastSyncedRef.current = buildSnapshotJson(traspasosMigrados, embarquesMigrados, snap.orderStatuses ?? {});
    setTraspasos(traspasosMigrados);
    setEmbarquesTraspaso(embarquesMigrados);
    setState(s => ({ ...s, orderStatuses: snap.orderStatuses ?? {} }));
  };

  const restablecerSemilla = () => {
    const traspasosMigrados = migrarStatusTraspasos(TRASPASOS_DB, EMBARQUES_TRASPASO_DB);
    lastSyncedRef.current = buildSnapshotJson(traspasosMigrados, EMBARQUES_TRASPASO_DB, initialAppState.orderStatuses);
    setTraspasos(traspasosMigrados);
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

  // Construye una petición AUTOMÁTICA derivada (recálculo SMC) que cubre el
  // faltante de una petición previa, eligiendo otra sucursal donante.
  const construirDerivada = (orig: TraspasoPeticion, faltante: TraspasoPiezaDetalle[], now: string, opts?: { nuevaSolicitud?: boolean; donante?: string }): TraspasoPeticion => {
    const pad7 = (n: number) => String(Math.abs(Math.trunc(n)) % 10_000_000).padStart(7, '0');
    // Reasignación = misma solicitud, intento+1. Nueva solicitud (por restante) = solicitud nueva, intento 1.
    const solicitudId = opts?.nuevaSolicitud ? `S${pad7(Date.now())}` : orig.solicitudId;
    const intento = opts?.nuevaSolicitud ? 1 : (orig.intento ?? 1) + 1;
    // Donantes ya descartados (la sucursal que no pudo surtir + rechazos previos).
    const rechazadas = Array.from(new Set([orig.sucursalOrigen, ...(orig.sucursalesExcluidas ?? [])].filter(Boolean) as string[]));
    // Para elegir el nuevo donante también se excluye la sucursal DESTINO (no se
    // trae mercancía de la misma sucursal que la recibe).
    const excluirSMC = Array.from(new Set([...rechazadas, orig.sucursalDestino].filter(Boolean) as string[]));
    // Si el usuario eligió una sucursal (opción SMC en el modal de reasignación),
    // se respeta; si no, el algoritmo la determina.
    const rec = opts?.donante ? null : calcularSucursalRecomendada(faltante.map(f => ({ code: f.code, qty: f.qtySolicitada })), excluirSMC);
    const donante = opts?.donante ?? rec?.sucursal ?? SUCURSALES_EJERCICIO.find(s => !excluirSMC.includes(s)) ?? SUCURSALES_EJERCICIO[0];
    const id = `TP${pad7(Date.now() + Math.floor(Math.random() * 1000))}`;
    return {
      id,
      solicitudId,
      tipo: 'Entrante',
      categoria: 'Automático',
      sucursalContraparte: donante,
      sucursalOrigen: donante,
      sucursalDestino: orig.sucursalDestino,
      status: 'Pendiente',
      fechaCreacion: now,
      fechaActualizacion: now,
      piezas: faltante.map(f => ({ ...f, qtySurtida: 0 })),
      pedidoOrigen: orig.pedidoOrigen,
      parcial: false,
      observaciones: 'Petición automática (recálculo SMC) por faltante del traspaso anterior.',
      usuarioCreador: 'SISTEMA_SMC',
      noPapeleta: String(400000 + Math.floor(Math.random() * 99999)),
      packingList: false,
      cajasTotal: 1,
      cajasRecibidas: 0,
      flujo: 'Automatico',
      intento,
      resultado: 'vigente',
      peticionAnteriorId: orig.id,
      sucursalesExcluidas: rechazadas,
    };
  };

  // Finaliza el surtido desde la HH: marca Surtido con las cantidades reales.
  // Si quedó faltante (parcial) NO se genera nada automáticamente: el recálculo
  // (reasignar / generar restante) es una decisión MANUAL de la sucursal solicitante
  // desde "Por recibir". Devuelve null (ya no hay petición derivada automática).
  const finalizarSurtidoTraspaso = useCallback((petId: string, piezasSurtidas: TraspasoPiezaDetalle[], nota?: string): string | null => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const notaLimpia = (nota ?? '').trim();
    setTraspasos(prev => {
      const orig = prev.find(t => t.id === petId);
      if (!orig || orig.status !== 'Pendiente') return prev;
      const parcial = piezasSurtidas.some(p => p.qtySurtida < p.qtySolicitada);
      return prev.map(t => t.id === petId
        ? { ...t, status: 'Surtido' as TraspasoStatus, fechaActualizacion: now, piezas: piezasSurtidas, parcial, resultado: (parcial ? 'surtida-parcial' : 'surtida') as TraspasoPeticion['resultado'], notaDonante: notaLimpia || t.notaDonante }
        : t);
    });
    return null;
  }, []);

  // Finaliza la REVISIÓN desde la HH: Surtido → Revisado con las cantidades
  // revisadas. Igual que el surtido: si quedó faltante NO se autogenera nada; el
  // recálculo lo decide manualmente la sucursal solicitante desde "Por recibir".
  const finalizarRevisionTraspaso = useCallback((petId: string, piezasRevisadas: TraspasoPiezaDetalle[], nota?: string): string | null => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const notaLimpia = (nota ?? '').trim();
    setTraspasos(prev => {
      const orig = prev.find(t => t.id === petId);
      if (!orig || orig.status !== 'Surtido') return prev;
      const parcial = piezasRevisadas.some(p => p.qtySurtida < p.qtySolicitada);
      return prev.map(t => t.id === petId
        ? { ...t, status: 'Revisado' as TraspasoStatus, fechaActualizacion: now, piezas: piezasRevisadas, parcial, resultado: (parcial ? 'surtida-parcial' : 'revisada') as TraspasoPeticion['resultado'], notaDonante: notaLimpia || t.notaDonante }
        : t);
    });
    return null;
  }, []);

  // Negar un traspaso completo desde la HH: lo marca Cancelado. Si es RECHAZO
  // (resultado='rechazada'), la sucursal solicitante puede reasignarlo. Si es
  // CANCELACIÓN (resultado='cancelada') solo cierra la petición.
  const negarTraspaso = useCallback((petId: string, motivo: string, esRechazo: boolean = true): string | null => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const resultado: TraspasoPeticion['resultado'] = esRechazo ? 'rechazada' : 'cancelada';
    setTraspasos(prev => prev.map(t => t.id === petId
      ? { ...t, status: 'Cancelado' as TraspasoStatus, fechaActualizacion: now, motivoRechazo: motivo, resultado }
      : t));
    return null;
  }, []);

  // Reasignación por SMC de una petición RECHAZADA: el algoritmo determina si
  // puede reasignarse a otra sucursal (sin reelegir la sucursal que rechazó ni
  // el destino). Sin cap de intentos: es una acción manual del solicitante y
  // puede repetirse mientras el pedido original no esté completado.
  const reasignarPeticion = useCallback((petId: string): { ok: boolean; mensaje: string; derivadaId?: string } => {
    const orig = traspasos.find(t => t.id === petId);
    if (!orig) return { ok: false, mensaje: 'Petición no encontrada.' };
    // Faltante: rechazo total → todo; parcial → solo el restante.
    const faltante = orig.piezas
      .filter(p => p.qtySurtida < p.qtySolicitada)
      .map(p => ({ code: p.code, qtySolicitada: p.qtySolicitada - p.qtySurtida, qtySurtida: 0 }));
    if (faltante.length === 0) return { ok: false, mensaje: 'No hay mercancía pendiente por reasignar.' };
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const derivada = construirDerivada(orig, faltante, now);
    // Si el algoritmo no encontró una sucursal elegible distinta, no reasigna.
    if (!derivada.sucursalOrigen || derivada.sucursalOrigen === orig.sucursalOrigen) {
      return { ok: false, mensaje: 'SMC no encontró otra sucursal elegible para reasignar la petición.' };
    }
    setTraspasos(prev => {
      let next = prev.map(t => t.id === petId ? { ...t, peticionSiguienteId: derivada.id } : t);
      next = [derivada, ...next];
      return next;
    });
    return { ok: true, mensaje: `Reasignada por SMC a ${derivada.sucursalOrigen}.`, derivadaId: derivada.id };
  }, [traspasos]);

  // Reasignación a una sucursal ESPECÍFICA (la que el usuario eligió entre las
  // opciones que propuso SMC 4.0 en el modal de reasignación). No permite reelegir
  // la sucursal que rechazó ni el destino. Sin cap de intentos.
  const reasignarPeticionA = useCallback((petId: string, donante: string): { ok: boolean; mensaje: string; derivadaId?: string } => {
    const orig = traspasos.find(t => t.id === petId);
    if (!orig) return { ok: false, mensaje: 'Petición no encontrada.' };
    if (donante === orig.sucursalOrigen || donante === orig.sucursalDestino) {
      return { ok: false, mensaje: 'No se puede reasignar a la sucursal que rechazó ni al destino.' };
    }
    const faltante = orig.piezas
      .filter(p => p.qtySurtida < p.qtySolicitada)
      .map(p => ({ code: p.code, qtySolicitada: p.qtySolicitada - p.qtySurtida, qtySurtida: 0 }));
    if (faltante.length === 0) return { ok: false, mensaje: 'No hay mercancía pendiente por reasignar.' };
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const derivada = construirDerivada(orig, faltante, now, { donante });
    setTraspasos(prev => {
      let next = prev.map(t => t.id === petId ? { ...t, peticionSiguienteId: derivada.id } : t);
      next = [derivada, ...next];
      return next;
    });
    return { ok: true, mensaje: `Reasignada a ${donante}.`, derivadaId: derivada.id };
  }, [traspasos]);

  // Genera una NUEVA SOLICITUD (SMC) por el RESTANTE de una petición surtida/
  // revisada parcialmente. A diferencia de reasignar, abre una solicitud nueva
  // (no continúa la misma cadena) para cubrir solo lo que faltó.
  const generarSolicitudRestante = useCallback((petId: string): { ok: boolean; mensaje: string; derivadaId?: string } => {
    const orig = traspasos.find(t => t.id === petId);
    if (!orig) return { ok: false, mensaje: 'Petición no encontrada.' };
    const faltante = orig.piezas
      .filter(p => p.qtySurtida < p.qtySolicitada)
      .map(p => ({ code: p.code, qtySolicitada: p.qtySolicitada - p.qtySurtida, qtySurtida: 0 }));
    if (faltante.length === 0) return { ok: false, mensaje: 'Esta petición no tiene restante pendiente.' };
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const derivada = construirDerivada(orig, faltante, now, { nuevaSolicitud: true });
    if (!derivada.sucursalOrigen || derivada.sucursalOrigen === orig.sucursalOrigen) {
      return { ok: false, mensaje: 'SMC no encontró otra sucursal elegible para el restante.' };
    }
    setTraspasos(prev => {
      let next = prev.map(t => t.id === petId ? { ...t, peticionSiguienteId: derivada.id } : t);
      next = [derivada, ...next];
      return next;
    });
    const totalRestante = faltante.reduce((s, f) => s + f.qtySolicitada, 0);
    return { ok: true, mensaje: `Nueva solicitud ${derivada.solicitudId} por el restante (${totalRestante} pzs) a ${derivada.sucursalOrigen}.`, derivadaId: derivada.id };
  }, [traspasos]);

  // Cancelación de la solicitud por la sucursal que la generó, ANTES de su revisión
  // (mientras sigue Pendiente o Surtido). No mueve inventario; si aún se necesita la
  // mercancía debe generarse una nueva solicitud.
  const cancelarSolicitud = useCallback((petId: string): { ok: boolean; mensaje: string } => {
    const orig = traspasos.find(t => t.id === petId);
    if (!orig) return { ok: false, mensaje: 'Petición no encontrada.' };
    if (orig.status !== 'Pendiente' && orig.status !== 'Surtido') {
      return { ok: false, mensaje: 'Solo se puede cancelar la solicitud antes de su revisión.' };
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setTraspasos(prev => prev.map(t => t.id === petId
      ? { ...t, status: 'Cancelado' as TraspasoStatus, resultado: 'cancelada' as TraspasoPeticion['resultado'],
          motivoCancelacion: 'solicitud-cancelada', motivoRechazo: 'Solicitud cancelada por la sucursal solicitante', fechaActualizacion: now }
      : t));
    return { ok: true, mensaje: 'Solicitud cancelada. No se movió inventario; genera una nueva solicitud si aún necesitas la mercancía.' };
  }, [traspasos]);

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

  // Placeholder — al hacer click en "Dar entrada" en Por recibir, mueve la
  // petición de Recibido (confirmado físicamente) a Entregado (finalizado con
  // entrada al inventario). Pronto abrirá una ventana dedicada al proceso.
  const darEntradaInventario = useCallback((petId: string) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setTraspasos(prev => prev.map(t => t.id === petId && t.status === 'Recibido'
      ? { ...t, status: 'Entregado' as TraspasoStatus, fechaActualizacion: now }
      : t));
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

  // Confirmación de recepción: la sucursal avisa que YA RECIBIÓ la mercancía
  // (recibido físicamente), sin darle entrada al inventario. Entre sucursales es
  // solo una confirmación completa/parcial (modificable después, queda registro);
  // CEDIS puede confirmar cajas recibidas. Marca Recibido y guarda el historial.
  const confirmarRecepcion = useCallback((
    petId: string,
    data: { tipo: 'Completa' | 'Parcial'; nota?: string; cajasRecibidas?: number },
  ) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setTraspasos(prev => prev.map(t => {
      if (t.id !== petId) return t;
      const entry: RecepcionLogEntry = {
        fecha: now, tipo: data.tipo, usuario: sucursalActual,
        nota: data.nota?.trim() || undefined,
        cajasRecibidas: data.cajasRecibidas, cajasTotal: t.categoria === 'CEDIS' ? t.cajasTotal : undefined,
      };
      return {
        ...t,
        status: 'Recibido' as TraspasoStatus,
        tipoRecepcion: data.tipo,
        parcial: data.tipo === 'Parcial' ? true : t.parcial,
        fechaActualizacion: now,
        cajasRecibidas: data.cajasRecibidas ?? t.cajasRecibidas,
        recepcionLog: [...(t.recepcionLog ?? []), entry],
      };
    }));
  }, [sucursalActual]);

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

  // Post-revisión: crea un embarque NUEVO para el traspaso — solo generado,
  // sin cambio de status del traspaso (queda en Revisado; el envío/tránsito
  // se dispara desde el flujo de embarques). Devuelve el id creado.
  const crearEmbarqueParaTraspaso = useCallback((petId: string): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const peticion = traspasos.find(t => t.id === petId);
    if (!peticion) return '';
    let embarqueId = '';
    setEmbarquesTraspaso(prev => {
      embarqueId = generarIdEmbarque(prev);
      const nuevo: EmbarqueTraspaso = {
        id: embarqueId,
        sucursalDestino: peticion.sucursalDestino ?? peticion.sucursalContraparte,
        paqueteria: '', // se define en la documentación posterior
        traspasos: [petId],
        status: 'Generado',
        fecha: now,
        usuario: sucursalActual,
      };
      return [nuevo, ...prev];
    });
    // Al vincular el traspaso al embarque recién creado, el status pasa a
    // 'Embarcado' (tiene embarque asignado pero aún sin documentar cajas +
    // método de envío). El paso a 'Documentado' se dispara en
    // guardarDocumentacionEmbarque cuando ambas piezas ya están.
    setTraspasos(prev => prev.map(t => t.id === petId
      ? { ...t, fechaActualizacion: now, embarqueId, status: 'Embarcado' as TraspasoStatus }
      : t));
    return embarqueId;
  }, [traspasos, sucursalActual]);

  // Post-revisión: agrega este traspaso a un embarque EXISTENTE compatible
  // (misma sucursal destino y aún en estado 'Generado').
  const agregarTraspasoAEmbarque = useCallback((petId: string, embarqueId: string) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setEmbarquesTraspaso(prev => prev.map(e => e.id === embarqueId
      ? { ...e, traspasos: e.traspasos.includes(petId) ? e.traspasos : [...e.traspasos, petId] }
      : e));
    setTraspasos(prev => prev.map(t => t.id === petId
      ? { ...t, fechaActualizacion: now, embarqueId, status: 'Embarcado' as TraspasoStatus }
      : t));
  }, []);

  // ── Handlers del refactor de embarque ────────────────────────
  // Ver docs/flujo-embarque-cambios.md §4.1

  // Helper F19: agrega un evento inmutable a la bitácora del embarque.
  const agregarEvento = (e: EmbarqueTraspaso, ev: EmbarqueEvento): EmbarqueTraspaso => ({
    ...e, eventos: [...(e.eventos ?? []), ev],
  });

  // Paso 2+3 (Pesado + Cotización): guarda la documentación de cajas y la
  // paquetería seleccionada, y mueve TODOS los traspasos del embarque a
  // status 'Documentado' (monitor 4 — Pesado de cajas finalizado).
  const guardarDocumentacionEmbarque = useCallback(
    (embarqueId: string, doc: DocumentacionPorPedido[], cotizacion: CotizacionPaqueteria) => {
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      let petIds: string[] = [];
      setEmbarquesTraspaso(prev => prev.map(e => {
        if (e.id !== embarqueId) return e;
        petIds = e.traspasos;
        const yaTenia = !!e.paqueteriaSeleccionada;
        // F39: si había una cotización anterior distinta, la archivamos.
        const previaDescartada = (yaTenia && e.paqueteriaSeleccionada !== cotizacion.paqueteria)
          ? [{ ts: now, paqueteria: e.paqueteriaSeleccionada!, costo: e.paqueteriaCosto ?? 0, motivo: 'Recotizada' }]
          : [];
        const actualizado: EmbarqueTraspaso = {
          ...e,
          paqueteria: cotizacion.paqueteria,
          paqueteriaSeleccionada: cotizacion.paqueteria,
          paqueteriaCosto: cotizacion.costo,
          paqueteriaDesglose: cotizacion.desglose,
          paqueteriaTiempoEntrega: cotizacion.tiempoEntregaDias,
          documentacion: doc,
          cotizacionesDescartadas: [...(e.cotizacionesDescartadas ?? []), ...previaDescartada],
        };
        return agregarEvento(actualizado, {
          ts: now, usuario: 'sistema',
          tipo: yaTenia ? 'recotizado' : 'cotizado',
          detalle: `${cotizacion.paqueteria} · $${cotizacion.costo.toFixed(2)} MXN`,
        });
      }));
      setTraspasos(prev => prev.map(t => petIds.includes(t.id)
        ? { ...t, status: 'Documentado' as TraspasoStatus, fechaActualizacion: now }
        : t));
    },
    [],
  );

  // GENERAR GUÍA (WebService) — MOCK de la API oficial de la paquetería.
  // Regla del cliente (sep-2026): la guía queda PENDIENTE hasta que el
  // logístico decide generarla; una vez generada, el status del shipment NO
  // cambia — solo se anota el guiaId. El paso a "Entregado a paquetería"
  // lo dispara aparte confirmarEntregadoAPaqueteria() cuando la mercancía
  // efectivamente sale de la sucursal.
  const generarGuiaPaqueteria = useCallback(async (embarqueId: string): Promise<string> => {
    const emb = embarquesTraspaso.find(e => e.id === embarqueId);
    if (!emb) return '';
    if (tipoPaqueteriaDe(emb.paqueteria) !== 'WebService') return '';
    // F52 — Guardarraíl anti-duplicación: si en el snapshot compartido ya
    // hay guía (otro operador la generó primero), no la re-solicites.
    if (emb.guiaId) return emb.guiaId;
    const { guiaId } = await mockGenerarGuiaEstafeta(embarqueId);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setEmbarquesTraspaso(prev => prev.map(e => e.id === embarqueId
      ? agregarEvento({ ...e, guiaId }, { ts: now, tipo: 'guiaGenerada', usuario: 'sistema', detalle: guiaId })
      : e));
    return guiaId;
  }, [embarquesTraspaso]);

  // ENTREGADO A PAQUETERÍA — Manual + WebService. Lo confirma el logístico
  // cuando la mercancía ya salió a manos de la paquetería. Es independiente
  // de si la guía WebService está o no generada (se puede subir después).
  const confirmarEntregadoAPaqueteria = useCallback((embarqueId: string) => {
    const emb = embarquesTraspaso.find(e => e.id === embarqueId);
    if (!emb) return;
    const tipo = tipoPaqueteriaDe(emb.paqueteria);
    if (tipo !== 'Manual' && tipo !== 'WebService') return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setEmbarquesTraspaso(prev => prev.map(e => e.id === embarqueId
      ? agregarEvento({ ...e, status: 'Entregado a paquetería' as ShipmentStatus, fechaEntregaAPaqueteria: now },
          { ts: now, tipo: 'entregado', usuario: 'sistema', detalle: emb.paqueteria })
      : e));
    setTraspasos(prev => prev.map(t => emb.traspasos.includes(t.id)
      ? { ...t, status: 'EntregadoAPaqueteria' as TraspasoStatus, fechaActualizacion: now }
      : t));
  }, [embarquesTraspaso]);

  // Alias legacy — mantenido para compat con los botones existentes de F6.
  const confirmarEntregadoAPaqueteriaManual = confirmarEntregadoAPaqueteria;

  // SOLICITAR REPARTO Uber — MOCK API. Marca el embarque en tránsito.
  const solicitarRepartoUber = useCallback(async (embarqueId: string): Promise<string> => {
    const emb = embarquesTraspaso.find(e => e.id === embarqueId);
    if (!emb) return '';
    if (tipoPaqueteriaDe(emb.paqueteria) !== 'Uber') return '';
    const { uberId } = await mockSolicitarUber(embarqueId, emb.sucursalDestino);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setEmbarquesTraspaso(prev => prev.map(e => e.id === embarqueId
      ? agregarEvento({ ...e, status: 'En tránsito' as ShipmentStatus, guiaId: uberId, fechaEntregaAPaqueteria: now },
          { ts: now, tipo: 'reparto', usuario: 'sistema', detalle: `Uber ${uberId}` })
      : e));
    setTraspasos(prev => prev.map(t => emb.traspasos.includes(t.id)
      ? { ...t, status: 'EntregadoAPaqueteria' as TraspasoStatus, fechaActualizacion: now }
      : t));
    return uberId;
  }, [embarquesTraspaso]);

  // SOLICITAR REPARTO BlueGo — MOCK API. Igual patrón que Uber.
  const solicitarRepartoBlueGo = useCallback(async (embarqueId: string): Promise<string> => {
    const emb = embarquesTraspaso.find(e => e.id === embarqueId);
    if (!emb) return '';
    if (tipoPaqueteriaDe(emb.paqueteria) !== 'BlueGo') return '';
    const { solicitudId } = await mockSolicitarBlueGo(embarqueId, emb.sucursalDestino);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setEmbarquesTraspaso(prev => prev.map(e => e.id === embarqueId
      ? agregarEvento({ ...e, status: 'En tránsito' as ShipmentStatus, guiaId: solicitudId, fechaEntregaAPaqueteria: now },
          { ts: now, tipo: 'reparto', usuario: 'sistema', detalle: `BlueGo ${solicitudId}` })
      : e));
    setTraspasos(prev => prev.map(t => emb.traspasos.includes(t.id)
      ? { ...t, status: 'EntregadoAPaqueteria' as TraspasoStatus, fechaActualizacion: now }
      : t));
    return solicitudId;
  }, [embarquesTraspaso]);

  // F27 — Notas del embarque (campo libre editable por el logístico).
  const actualizarObservacionesEmbarque = useCallback((embarqueId: string, texto: string) => {
    setEmbarquesTraspaso(prev => prev.map(e => e.id === embarqueId
      ? { ...e, observaciones: texto } : e));
  }, []);

  // F33 — Cancelar embarque. Solo permitido en 'Generado' o 'Embarcado'.
  // Los traspasos vuelven a Revisado y pierden su embarqueId.
  const cancelarEmbarque = useCallback((embarqueId: string, motivo: string) => {
    const emb = embarquesTraspaso.find(e => e.id === embarqueId);
    if (!emb) return;
    if (emb.status !== 'Generado') return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setEmbarquesTraspaso(prev => prev.filter(e => e.id !== embarqueId));
    setTraspasos(prev => prev.map(t => emb.traspasos.includes(t.id)
      ? { ...t, embarqueId: undefined, status: t.status === 'Embarcado' ? ('Revisado' as TraspasoStatus) : t.status,
          fechaActualizacion: now, observaciones: `[Embarque ${embarqueId} cancelado: ${motivo}] ${t.observaciones ?? ''}`.trim() }
      : t));
  }, [embarquesTraspaso]);

  // F30 — Duplicar embarque. Copia destino + paquetería seleccionada;
  // NO copia traspasos, guía, ni bitácora — arranca de cero como "Generado".
  const duplicarEmbarque = useCallback((embarqueId: string): string => {
    const src = embarquesTraspaso.find(e => e.id === embarqueId);
    if (!src) return '';
    const nuevoId = generarIdEmbarque(embarquesTraspaso);
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const nuevo: EmbarqueTraspaso = {
      id: nuevoId,
      sucursalDestino: src.sucursalDestino,
      paqueteria: src.paqueteria,
      traspasos: [],
      status: 'Generado',
      fecha: now,
      usuario: src.usuario,
      observaciones: src.observaciones ? `[Duplicado de ${src.id}] ${src.observaciones}` : `Duplicado de ${src.id}`,
    };
    setEmbarquesTraspaso(prev => [...prev, nuevo]);
    return nuevoId;
  }, [embarquesTraspaso]);

  // Monitor 6 (Manual + WebService): confirma que la paquetería finalizó el
  // reparto. Uber/BlueGo se actualiza vía webhook mock (no llega aquí).
  const confirmarRepartoFinalizado = useCallback((embarqueId: string) => {
    const emb = embarquesTraspaso.find(e => e.id === embarqueId);
    if (!emb) return;
    const tipo = tipoPaqueteriaDe(emb.paqueteria);
    if (tipo !== 'Manual' && tipo !== 'WebService') return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setEmbarquesTraspaso(prev => prev.map(e => e.id === embarqueId
      ? agregarEvento({ ...e, status: 'Entregado' as ShipmentStatus, fechaRepartoFinalizado: now },
          { ts: now, tipo: 'finalizado', usuario: 'sistema' })
      : e));
    setTraspasos(prev => prev.map(t => emb.traspasos.includes(t.id)
      ? { ...t, status: 'RepartoFinalizado' as TraspasoStatus, fechaActualizacion: now }
      : t));
  }, [embarquesTraspaso]);

  const crearSolicitudTraspaso = useCallback((data: CrearSolicitudData): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const ts = Date.now();
    const pad7 = (n: number) => String(Math.abs(Math.trunc(n)) % 10_000_000).padStart(7, '0');
    const solicitudId = `S${pad7(ts)}`;
    // Regla: TODO lo que crea este wizard es Manual (con o sin pedido). El
    // flujo Automático SMC real lo genera el sistema por otro path cuando un
    // pedido web no cabe en una sola sucursal — no por este modal.
    // `conPedido` se conserva porque más abajo se usa para el token de
    // autorización, pero no debe decidir categoría/flujo/prefijo del id.
    const conPedido = !!data.pedidoOrigen;
    const categoria: TraspasoPeticion['categoria'] = 'Manual';
    const flujo: TraspasoPeticion['flujo'] = 'Manual';
    const nuevas: TraspasoPeticion[] = data.sucursales.map((suc, i) => {
      const piezas = (data.piezasPorSucursal[suc] ?? []).map(p => ({ ...p, qtySurtida: 0 }));
      const totalQty = piezas.reduce((s, p) => s + p.qtySolicitada, 0);
      return {
        id: `TM${pad7(ts + i)}`,
        solicitudId,
        tipo: 'Entrante' as const,
        categoria,
        flujo,
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

  // Crea una solicitud a CEDIS en estado Draft (pendiente de aprobación de token).
  // Un aprobador externo la aprueba manualmente (simulado con un setTimeout de
  // TIEMPO_APROBACION_TOKEN_MS). Mientras dura el draft NO cuenta para el SLA.
  // Devuelve el id de la petición para que el modal pueda mostrar la espera.
  const crearSolicitudCedisUrgencia = useCallback((data: CrearSolicitudCedisData): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const ts = Date.now();
    const pad7 = (n: number) => String(Math.abs(Math.trunc(n)) % 10_000_000).padStart(7, '0');
    const solicitudId = `S${pad7(ts)}`;
    const petId = `TU${pad7(ts)}`;
    const piezas = data.piezas.map(p => ({ ...p, qtySurtida: 0 }));
    const totalQty = piezas.reduce((s, p) => s + p.qtySolicitada, 0);
    const nueva: TraspasoPeticion = {
      id: petId,
      solicitudId,
      tipo: 'Entrante',
      categoria: 'CEDIS',
      // Manual a CEDIS: CON pedido → Especial; SIN pedido → Urgencia (la valida CEDIS).
      subtipoCedis: data.pedidoOrigen ? 'Especial' : 'Urgencia',
      sucursalContraparte: 'CEDIS',
      // Recepción desde CEDIS hacia la sucursal actual (destino).
      sucursalDestino: sucursalActual,
      sucursalOrigen: 'CEDIS',
      status: 'Pendiente',
      esDraft: true,
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
    // Aprobación simulada por alguien más (queda esDraft=true hasta que fire).
    setTimeout(() => {
      const nowAprob = new Date().toISOString().slice(0, 16).replace('T', ' ');
      setTraspasos(prev => prev.map(t => t.id === petId && t.esDraft
        ? { ...t, esDraft: false, fechaActualizacion: nowAprob }
        : t));
    }, TIEMPO_APROBACION_TOKEN_MS);
    return petId;
  }, [sucursalActual]);

  // Aprobación manual (por si se necesita disparar sin esperar el timeout).
  const aprobarSolicitudCedisDraft = useCallback((petId: string) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    setTraspasos(prev => prev.map(t => t.id === petId && t.esDraft
      ? { ...t, esDraft: false, fechaActualizacion: now }
      : t));
  }, []);

  // Envío de mercancía de la sucursal HACIA CEDIS (devolución / garantía).
  // Sale de la sucursal actual (origen) con destino CEDIS. Como todo movimiento
  // hacia CEDIS requiere aprobación de token por parte de INVENTARIOS, el envío
  // se crea en estado Draft (esDraft=true, sin SLA) y alguien más lo aprueba
  // (simulado con setTimeout). Devuelve el id de la PETICIÓN para observarla.
  const crearEnvioCedis = useCallback((data: CrearEnvioCedisData): string => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const ts = Date.now();
    const pad7 = (n: number) => String(Math.abs(Math.trunc(n)) % 10_000_000).padStart(7, '0');
    const solicitudId = `S${pad7(ts)}`;
    const petId = `TM${pad7(ts)}`;
    const piezas = data.piezas.map(p => ({ ...p, qtySurtida: 0 }));
    const totalQty = piezas.reduce((s, p) => s + p.qtySolicitada, 0);
    const nueva: TraspasoPeticion = {
      id: petId,
      solicitudId,
      tipo: 'Saliente',
      categoria: 'Manual',
      sucursalContraparte: 'CEDIS',
      sucursalOrigen: sucursalActual,
      sucursalDestino: 'CEDIS',
      motivoEnvioCedis: data.motivo,
      status: 'Pendiente',
      esDraft: true,
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
    // Aprobación simulada por INVENTARIOS.
    setTimeout(() => {
      const nowAprob = new Date().toISOString().slice(0, 16).replace('T', ' ');
      setTraspasos(prev => prev.map(t => t.id === petId && t.esDraft
        ? { ...t, esDraft: false, fechaActualizacion: nowAprob }
        : t));
    }, TIEMPO_APROBACION_TOKEN_MS);
    return petId;
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
      traspasos, surtirTraspaso, finalizarSurtidoTraspaso, finalizarRevisionTraspaso, negarTraspaso, reasignarPeticion, reasignarPeticionA, generarSolicitudRestante, cancelarSolicitud, revisarTraspaso, entregarTraspaso, darEntradaInventario, confirmarRecepcion, crearSolicitudTraspaso, crearSolicitudCedisUrgencia, aprobarSolicitudCedisDraft, crearEnvioCedis, cancelarPeticiones,
      reiniciarEstadoCompartido,
      embarquesTraspaso, embarcarTraspaso, crearEmbarqueParaTraspaso, agregarTraspasoAEmbarque,
      guardarDocumentacionEmbarque, generarGuiaPaqueteria,
      confirmarEntregadoAPaqueteria, confirmarEntregadoAPaqueteriaManual,
      solicitarRepartoUber, solicitarRepartoBlueGo,
      confirmarRepartoFinalizado,
      actualizarObservacionesEmbarque, duplicarEmbarque, cancelarEmbarque,
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
