// ============================================================
// APYMSA — Módulo de Revisión de Pedidos
// Data Layer: Product catalog, orders database, shipments
// ============================================================

export interface Product {
  code: string;
  name: string;
  category: string;
  img: string | null;
  price: number;
}

export interface OrderPartida {
  code: string;
  qty: number;
}

export type OrderStatus =
  | 'Creado'
  | 'Surtido'
  | 'Revisado'
  | 'Revisado con incidencias'
  | 'Documentado'
  | 'Enviado'
  | 'Facturado'
  | 'Cancelado';

// Tipo de envío del pedido (indica, entre otros, si requiere traspasos).
export type TipoEnvioPedido =
  | 'Envío a domicilio'
  | 'Pickup'
  | 'Envío a domicilio/TLC'
  | 'Envío a domicilio/Traspasos'
  | 'Envío a domicilio/División de facturas';

// Descripción de cada tipo de envío (tooltip al pasar el mouse).
export const TIPO_ENVIO_DESCRIPCIONES: Record<TipoEnvioPedido, string> = {
  'Envío a domicilio': 'El pedido se entrega en el domicilio del cliente.',
  'Pickup': 'El cliente recoge el pedido directamente en la sucursal.',
  'Envío a domicilio/TLC': 'Envío a domicilio bajo el programa TLC (Te Lo Consigo): la mercancía que no hay en existencia se consigue para el cliente.',
  'Envío a domicilio/Traspasos': 'Envío a domicilio que requiere traspasos de otras sucursales para completar la mercancía del pedido.',
  'Envío a domicilio/División de facturas': 'Envío a domicilio cuya mercancía se divide en más de una factura.',
};

export interface Order {
  id: string;
  clienteId: string;
  cliente: string;
  vendedorId: string;
  vendedor: string;
  plazo: string;
  total: string;
  status: OrderStatus;
  tipoEnvio?: TipoEnvioPedido;
  elaboro: string;
  origen: string;
  observaciones: string;
  fechaCaptura: string;   // 'YYYY-MM-DD HH:mm'
  fechaEntrega: string;
  horaEntrega: string;
  horaReparto: string;
  zona: string;
  local: boolean;
  horaInicioSurtido: string;
  horaFinSurtido: string;
  partidas: OrderPartida[];
}

export type ShipmentStatus = 'Generado' | 'Solicitado' | 'En tránsito' | 'En reparto' | 'Entregado';

export interface UberData {
  uberId: string;
  estatus: string;
  direccion: string;
  fechaSolicitud: string;
  fechaEstimada: string;
  fechaRecoleccion: string;
  fechaEntregaReal: string;
}

export interface BlueGoData {
  solicitudId: string;
  estatusExodus: string;
  tiempoEstimado: string;
  tiempoTranscurrido: string;
  fechaInicio: string;
  salidasVehiculosId: string;
}

export interface BoxItem {
  id: string;          // 'C1', 'C2', ...
  pedidoId: string;
  peso: number;        // kg
  largo?: number;      // cm
  ancho?: number;      // cm
  alto?: number;       // cm
}
export interface Shipment {
  id: string;
  paqueteria: string;
  pedidos: string[];
  observaciones: string;
  status: ShipmentStatus;
  fecha: string;
  tipoVehiculo: string;
  cajas: number;
  peso: number;
  usuario: string;
  guia?: string;
  boxes?: BoxItem[];
  uberData?: UberData;
  blueGoData?: BlueGoData;
}

// ── Product catalog ──────────────────────────────────────────
export const PRODUCT_CATALOG: Record<string, Product> = {
  'BP-001': { code: 'BP-001', name: 'Balata Delantera Toyota Corolla 2018-2022', category: 'Frenos',       img: null, price: 320 },
  'FT-223': { code: 'FT-223', name: 'Filtro de Aceite Honda Civic 1.5T',          category: 'Filtros',      img: null, price: 145 },
  'AM-445': { code: 'AM-445', name: 'Amortiguador Trasero Nissan Sentra 2020',     category: 'Suspensión',   img: null, price: 680 },
  'BC-118': { code: 'BC-118', name: 'Bobina de Encendido VW Jetta 2.5',            category: 'Encendido',    img: null, price: 540 },
  'RD-772': { code: 'RD-772', name: 'Radiador Completo Chevrolet Aveo 1.6',        category: 'Enfriamiento', img: null, price: 1850 },
  'XX-999': { code: 'XX-999', name: 'Cinta Aislante Negra 3M',                     category: 'Accesorios',   img: null, price: 45 },
  'LT-334': { code: 'LT-334', name: 'Llanta Michelin 185/65 R15',                  category: 'Llantas',      img: null, price: 1290 },
  'AC-201': { code: 'AC-201', name: 'Aceite Motor 5W-30 Castrol 4L',               category: 'Lubricantes',  img: null, price: 410 },
  'BT-055': { code: 'BT-055', name: 'Batería Bosch 12V 60Ah',                      category: 'Eléctrico',    img: null, price: 2150 },
};

// ── Orders database (8 real orders from system) ──────────────
export const ORDERS_DB: Record<string, Order> = {
  // Pedido demo para el resumen de traspasos con FALTANTE (recálculo con rechazo).
  '1065001': {
    id: '1065001', clienteId: '10260', cliente: 'AUTOPARTES DEMO SMC',
    vendedorId: '90', vendedor: 'MOSTRADOR PELICANO', plazo: '',
    total: '$3,120.00', status: 'Creado', tipoEnvio: 'Envío a domicilio/Traspasos',
    elaboro: 'Sistema SMC', origen: 'Exodus ERP', observaciones: 'Requiere traspasos para completar',
    fechaCaptura: '2026-04-22 08:30', fechaEntrega: '', horaEntrega: '', horaReparto: '', zona: '', local: false,
    horaInicioSurtido: '', horaFinSurtido: '',
    partidas: [
      { code: 'BP-001', qty: 10 },
    ],
  },
  '1064772': {
    id: '1064772', clienteId: '10241', cliente: 'AUTOPARTES COBIAN',
    vendedorId: '90', vendedor: 'MOSTRADOR PELICANO', plazo: '',
    total: '$1,837.12', status: 'Creado',
    elaboro: 'Ángel', origen: 'Exodus ERP', observaciones: '',
    fechaCaptura: '2026-04-22 09:50', fechaEntrega: '', horaEntrega: '', horaReparto: '', zona: '', local: false,
    horaInicioSurtido: '', horaFinSurtido: '',
    partidas: [
      { code: 'BP-001', qty: 3 },
      { code: 'FT-223', qty: 5 },
      { code: 'AM-445', qty: 2 },
    ],
  },
  '1064834': {
    id: '1064834', clienteId: '10242', cliente: 'AUTOPARTES BELTRAN',
    vendedorId: '90', vendedor: 'MOSTRADOR PELICANO', plazo: '',
    total: '$2,456.97', status: 'Surtido',
    elaboro: 'Ángel', origen: 'Exodus ERP', observaciones: '',
    fechaCaptura: '2026-04-22 14:05', fechaEntrega: '', horaEntrega: '', horaReparto: '', zona: '', local: false,
    horaInicioSurtido: '14:10', horaFinSurtido: '14:38',
    partidas: [
      { code: 'BC-118', qty: 4 },
      { code: 'LT-334', qty: 2 },
    ],
  },
  '1064838': {
    id: '1064838', clienteId: '10243', cliente: 'AUTOPARTES PENICHE',
    vendedorId: '90', vendedor: 'MOSTRADOR PELICANO', plazo: '',
    total: '$860.09', status: 'Revisado',
    elaboro: 'Ángel', origen: 'Exodus ERP', observaciones: '',
    fechaCaptura: '2026-04-22 14:13', fechaEntrega: '', horaEntrega: '', horaReparto: '', zona: '', local: false,
    horaInicioSurtido: '14:20', horaFinSurtido: '14:45',
    partidas: [
      { code: 'AC-201', qty: 6 },
      { code: 'FT-223', qty: 3 },
    ],
  },
  '1064844': {
    id: '1064844', clienteId: '10244', cliente: 'AUTOPARTES ISAI',
    vendedorId: '79076', vendedor: 'ND REFACCIONARIAS PELICANO', plazo: '',
    total: '$757.12', status: 'Documentado',
    elaboro: 'Ángel', origen: 'Epico', observaciones: '',

    fechaCaptura: '2026-04-22 14:32', fechaEntrega: '2026-04-22', horaEntrega: '14:32', horaReparto: '14:32', zona: '', local: false,
    horaInicioSurtido: '14:35', horaFinSurtido: '14:55',
    partidas: [
      { code: 'BT-055', qty: 1 },
      { code: 'BC-118', qty: 2 },
    ],
  },
  '1064847': {
    id: '1064847', clienteId: '10245', cliente: 'AUTOPARTES MARIO',
    vendedorId: '1786', vendedor: 'Razo Alvarez Luis', plazo: '30 días',
    total: '$1,937.82', status: 'Documentado',
    elaboro: 'Ángel', origen: 'Samsung', observaciones: '',
    fechaCaptura: '2026-04-22 15:12', fechaEntrega: '2026-04-24', horaEntrega: '17:22', horaReparto: '17:00', zona: 'Sur', local: false,
    horaInicioSurtido: '15:15', horaFinSurtido: '15:48',
    partidas: [
      { code: 'RD-772', qty: 1 },
      { code: 'AM-445', qty: 3 },
      { code: 'BP-001', qty: 4 },
    ],
  },
  '1064848': {
    id: '1064848', clienteId: '10246', cliente: 'AUTOPARTES MONTSERRAT',
    vendedorId: '1786', vendedor: 'Razo Alvarez Luis', plazo: '30 días',
    total: '$919.03', status: 'Documentado',
    elaboro: 'Ángel', origen: 'Samsung', observaciones: '',
    fechaCaptura: '2026-04-22 15:12', fechaEntrega: '2026-04-24', horaEntrega: '17:22', horaReparto: '17:00', zona: 'Sur', local: false,
    horaInicioSurtido: '', horaFinSurtido: '',
    partidas: [
      { code: 'FT-223', qty: 4 },
      { code: 'XX-999', qty: 2 },
    ],
  },
  '1064851': {
    id: '1064851', clienteId: '10247', cliente: 'AUTOPARTES RODRIGUEZ',
    vendedorId: '1786', vendedor: 'Razo Alvarez Luis', plazo: '',
    total: '$596.41', status: 'Enviado',
    elaboro: 'Ángel', origen: 'Samsung', observaciones: '',
    fechaCaptura: '2026-04-22 15:24', fechaEntrega: '2026-04-22', horaEntrega: '15:24', horaReparto: '15:22', zona: '', local: false,
    horaInicioSurtido: '15:26', horaFinSurtido: '15:40',
    partidas: [
      { code: 'AC-201', qty: 2 },
      { code: 'XX-999', qty: 5 },
    ],
  },
  '1064855': {
    id: '1064855', clienteId: '10249', cliente: 'AUTOPARTES GARCIA',
    vendedorId: '78265', vendedor: 'Directos Cedis Refaccionarias', plazo: '30 días',
    total: '$2,148.50', status: 'Revisado',
    elaboro: 'Ángel', origen: 'Epico', observaciones: '',
    fechaCaptura: '2026-04-22 15:55', fechaEntrega: '2026-04-23', horaEntrega: '10:00', horaReparto: '09:45', zona: 'Norte', local: false,
    horaInicioSurtido: '15:58', horaFinSurtido: '16:20',
    partidas: [
      { code: 'BP-001', qty: 6 },
      { code: 'BT-055', qty: 3 },
      { code: 'AM-445', qty: 2 },
    ],
  },
  '1064853': {
    id: '1064853', clienteId: '10248', cliente: 'AUTOPARTES GARCIA',
    vendedorId: '78265', vendedor: 'Directos Cedis Refaccionarias', plazo: '60 días',
    total: '$1,386.64', status: 'Facturado',
    elaboro: 'Ángel', origen: 'Epico', observaciones: '',
    fechaCaptura: '2026-04-22 15:29', fechaEntrega: '2026-04-22', horaEntrega: '16:59', horaReparto: '15:54', zona: 'Sureste', local: true,
    horaInicioSurtido: '15:30', horaFinSurtido: '15:50',
    partidas: [
      { code: 'LT-334', qty: 4 },
      { code: 'BT-055', qty: 2 },
      { code: 'RD-772', qty: 1 },
    ],
  },
};

// ── Shipments database ────────────────────────────────────────
export const SHIPMENTS_DB_INITIAL: Shipment[] = [
  {
    id: '88516', paqueteria: 'Uber', pedidos: ['1064847'], observaciones: 'zarate',
    status: 'En tránsito', fecha: '2026-04-22', tipoVehiculo: 'Auto', cajas: 2, peso: 6.5, usuario: 'JMORENO11',
    boxes: [
      { id: 'C1', pedidoId: '1064847', peso: 3.8 },
      { id: 'C2', pedidoId: '1064847', peso: 2.7 },
    ],
    uberData: {
      uberId: '97415', estatus: 'En proceso de entrega',
      direccion: 'AV NOGALES 205 A La Venta Del Astillero, Zapopan',
      fechaSolicitud: '2026-04-22 12:04:50 PM', fechaEstimada: '2026-04-22 12:45:21 PM',
      fechaRecoleccion: '2026-04-22 12:18:12 PM', fechaEntregaReal: '',
    },
  },
  {
    id: '88517', paqueteria: 'BlueGo', pedidos: ['1064851'], observaciones: 'quiroga',
    status: 'En tránsito', fecha: '2026-04-22', tipoVehiculo: 'Motocicleta', cajas: 1, peso: 3.2, usuario: 'JMORENO11',
    boxes: [
      { id: 'C1', pedidoId: '1064851', peso: 3.2 },
    ],
    blueGoData: {
      solicitudId: '1018062', estatusExodus: 'En proceso de entrega',
      tiempoEstimado: '45 min', tiempoTranscurrido: '28 min',
      fechaInicio: '2026-04-22 12:13:25 PM', salidasVehiculosId: '83275',
    },
  },
  {
    id: '88518', paqueteria: 'Estafeta', pedidos: ['1064844'], observaciones: 'mexico',
    status: 'Generado', fecha: '2026-04-22', tipoVehiculo: 'Camión', cajas: 3, peso: 18.0, usuario: 'JMORENO11',
    boxes: [
      { id: 'C1', pedidoId: '1064844', peso: 6.5 },
      { id: 'C2', pedidoId: '1064844', peso: 7.2, largo: 40, ancho: 30, alto: 25 },
      { id: 'C3', pedidoId: '1064844', peso: 4.3 },
    ],
  },
  {
    id: '88509', paqueteria: 'Transporte Interno', pedidos: ['1064838'], observaciones: 'alonzo',
    status: 'En reparto', fecha: '2026-04-22', tipoVehiculo: 'Camioneta', cajas: 5, peso: 28.0, usuario: 'JMORENO11',
    boxes: [
      { id: 'C1', pedidoId: '1064838', peso: 5.2 },
      { id: 'C2', pedidoId: '1064838', peso: 6.1, largo: 50, ancho: 40, alto: 30 },
      { id: 'C3', pedidoId: '1064838', peso: 5.8 },
      { id: 'C4', pedidoId: '1064838', peso: 6.4 },
      { id: 'C5', pedidoId: '1064838', peso: 4.5 },
    ],
  },
  { id: '88514', paqueteria: 'Transporte Interno', pedidos: ['1064853'], observaciones: 'borjas',  status: 'Entregado',   fecha: '2026-04-22', tipoVehiculo: 'Camión',    cajas: 8, peso: 45.2, usuario: 'JMORENO11' },
  {
    id: '88520', paqueteria: 'Uber', pedidos: ['1064847', '1064848'], observaciones: 'martinez',
    status: 'Generado', fecha: '2026-04-22', tipoVehiculo: 'Camioneta', cajas: 3, peso: 9.2, usuario: 'JMORENO11',
    boxes: [
      { id: 'C1', pedidoId: '1064847', peso: 4.1 },
      { id: 'C2', pedidoId: '1064848', peso: 3.2 },
      { id: 'C3', pedidoId: '1064848', peso: 1.9 },
    ],
  },
];

// Asigna un número de guía a los embarques que no lo traen (prefijo por paquetería).
(() => {
  const prefijo: Record<string, string> = {
    'Uber': 'UBR', 'BlueGo': 'BLG', 'Estafeta': 'EST', 'Transporte Interno': 'TIN', 'MEXICO EXPRESS': 'MEX',
  };
  SHIPMENTS_DB_INITIAL.forEach((s, i) => {
    if (s.guia) return;
    const pf = prefijo[s.paqueteria] ?? 'GUI';
    s.guia = `${pf}-${s.id}${String(1000 + i * 37).slice(-4)}`;
  });
})();

// ── App state types ───────────────────────────────────────────
export type AppScreen = 'auth' | 'orders' | 'select' | 'review' | 'summary';

export interface ScannedItem {
  conteo: number;
  authorized: boolean;
  authMotivo: string;
  observacion: string;
  fromOrder: boolean;
  removedFromCount: boolean;
  denied: boolean;
}

export interface AppState {
  currentScreen: AppScreen;
  selectedOrderId: string | null;
  preSelectedOrderId: string | null;
  reviewStartTime: Date | null;
  reviewEndTime: Date | null;
  scannedItems: Record<string, ScannedItem>;
  lastScannedCode: string | null;
  unknownProducts: string[];
  completedOrderIds: string[];
  // Mutable orders state (status changes propagate here)
  orderStatuses: Record<string, OrderStatus>;
}

export const initialAppState: AppState = {
  currentScreen: 'orders',
  selectedOrderId: null,
  preSelectedOrderId: null,
  reviewStartTime: null,
  reviewEndTime: null,
  scannedItems: {},
  lastScannedCode: null,
  unknownProducts: [],
  completedOrderIds: [],
  orderStatuses: Object.fromEntries(
    Object.values(ORDERS_DB).map(o => [o.id, o.status])
  ) as Record<string, OrderStatus>,
};

export function formatDateTime(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// Status badge color map (shared across screens)
export const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  'Creado':                  { bg: 'rgba(220,38,38,0.10)',   text: '#dc2626', border: 'rgba(220,38,38,0.35)'  },
  'Surtido':                 { bg: 'rgba(217,119,6,0.12)',   text: '#d97706', border: 'rgba(217,119,6,0.3)'   },
  'Revisado':                { bg: 'rgba(37,99,235,0.12)',   text: '#2563eb', border: 'rgba(37,99,235,0.3)'   },
  'Revisado con incidencias':{ bg: 'rgba(220,38,38,0.12)',   text: '#dc2626', border: 'rgba(220,38,38,0.3)'   },
  'Documentado':             { bg: 'rgba(124,58,237,0.12)',  text: '#7c3aed', border: 'rgba(124,58,237,0.3)'  },
  'Enviado':                 { bg: 'rgba(22,163,74,0.12)',   text: '#16a34a', border: 'rgba(22,163,74,0.3)'   },
  'Facturado':               { bg: 'rgba(26,43,107,0.12)',   text: '#1a2b6b', border: 'rgba(26,43,107,0.3)'   },
  'Cancelado':               { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', border: 'rgba(239,68,68,0.3)'   },
};

export const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, { bg: string; text: string; border: string }> = {
  'Generado':    { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' },
  'Solicitado':  { bg: 'rgba(217,119,6,0.12)',   text: '#d97706', border: 'rgba(217,119,6,0.3)'   },
  'En tránsito': { bg: 'rgba(37,99,235,0.12)',   text: '#2563eb', border: 'rgba(37,99,235,0.3)'   },
  'En reparto':  { bg: 'rgba(124,58,237,0.12)',  text: '#7c3aed', border: 'rgba(124,58,237,0.3)'  },
  'Entregado':   { bg: 'rgba(22,163,74,0.12)',   text: '#16a34a', border: 'rgba(22,163,74,0.3)'   },
};

// ============================================================
// APYMSA — Módulo de Traspasos entre Sucursales
// Tipos, mock data y helpers para transferencias de mercancía
// ============================================================

export type TraspasoStatus =
  | 'Pendiente'
  | 'Surtido'
  | 'Revisado'
  | 'Documentado'
  | 'Enviado'
  | 'Recibido'
  | 'Entregado'
  | 'Cancelado';

// ── Estado de alto nivel del traspaso (segmentador Pendiente/Finalizado/Cancelado) ──
// Pendiente = cualquier estatus distinto a Cancelado, Entregado o Recibido.
export type TraspasoEstadoAlto = 'Pendiente' | 'Finalizado' | 'Cancelado';
export function estadoAltoTraspaso(status: TraspasoStatus): TraspasoEstadoAlto {
  if (status === 'Cancelado') return 'Cancelado';
  if (status === 'Entregado' || status === 'Recibido') return 'Finalizado';
  return 'Pendiente';
}

// ── Etapa operativa visible del traspaso (filtro de etapa) ──
export type TraspasoEtapa =
  | 'Sin surtir'
  | 'Surtido'
  | 'Revisado'
  | 'Embarcado'
  | 'Enviado'
  | 'Recibido'
  | 'Cancelado';
export const TRASPASO_ETAPAS: TraspasoEtapa[] = [
  'Sin surtir', 'Surtido', 'Revisado', 'Embarcado', 'Enviado', 'Recibido', 'Cancelado',
];

// Descripciones (tooltips) para explicar cada etapa operativa del traspaso.
export const TRASPASO_ETAPA_TOOLTIP: Record<TraspasoEtapa, string> = {
  'Sin surtir': 'Pendiente de surtir: la sucursal origen aún no prepara la mercancía.',
  'Surtido': 'La mercancía ya fue surtida (preparada) en la sucursal origen.',
  'Revisado': 'La mercancía surtida fue revisada/validada antes de embarcar.',
  'Embarcado': 'Documentado y asignado a un embarque, listo para salir.',
  'Enviado': 'La mercancía salió de la sucursal origen y va en tránsito a la destino.',
  'Recibido': 'La sucursal destino ya dio entrada a la mercancía.',
  'Cancelado': 'El traspaso fue cancelado o negado; la necesidad se recalcula a otra sucursal.',
};

// Descripciones (tooltips) por categoría / subtipo de traspaso.
export const TRASPASO_CATEGORIA_TOOLTIP: Record<string, string> = {
  'Automático': 'Automático (SMC): lo genera el sistema cuando un pedido web no tiene todo el stock en una sola sucursal. Siempre lleva pedido.',
  'Manual': 'Manual: solicitado a mano por la sucursal. Puede o no llevar pedido de cliente; sin pedido requiere token de autorización.',
  'CEDIS': 'Movimiento con el Centro de Distribución (CEDIS).',
  'Especial': 'Especial CEDIS: solicitud manual a CEDIS CON pedido de cliente relacionado. Requiere token. Recepción ciega.',
  'Urgencia': 'Urgencia CEDIS: solicitud manual a CEDIS SIN pedido de cliente. La valida CEDIS con token y puede tardar más. Recepción ciega.',
  'Reabasto': 'Reabasto CEDIS: CEDIS envía por su cuenta para restock (sin pedido). Recepción ciega por cajas.',
  'Devolución': 'Devolución: la sucursal regresa mercancía a CEDIS (p. ej. exceso de inventario).',
  'Garantía': 'Garantía: la sucursal envía piezas defectuosas a CEDIS para su gestión de garantía.',
};
export function etapaTraspaso(status: TraspasoStatus): TraspasoEtapa {
  switch (status) {
    case 'Pendiente':   return 'Sin surtir';
    case 'Surtido':     return 'Surtido';
    case 'Revisado':    return 'Revisado';
    case 'Documentado': return 'Embarcado';
    case 'Enviado':     return 'Enviado';
    case 'Recibido':
    case 'Entregado':   return 'Recibido';
    case 'Cancelado':   return 'Cancelado';
  }
}
export const TRASPASO_ETAPA_COLORS: Record<TraspasoEtapa, { bg: string; text: string; border: string }> = {
  'Sin surtir':          { bg: 'rgba(217,119,6,0.10)',  text: '#d97706', border: 'rgba(217,119,6,0.3)'  },
  'Surtido':             { bg: 'rgba(124,58,237,0.10)', text: '#7c3aed', border: 'rgba(124,58,237,0.3)' },
  'Revisado':            { bg: 'rgba(37,99,235,0.10)',  text: '#2563eb', border: 'rgba(37,99,235,0.3)'  },
  'Embarcado':           { bg: 'rgba(13,148,136,0.10)', text: '#0d9488', border: 'rgba(13,148,136,0.3)' },
  'Enviado': { bg: 'rgba(22,163,74,0.10)',  text: '#16a34a', border: 'rgba(22,163,74,0.3)'  },
  'Recibido':            { bg: 'rgba(26,43,107,0.10)',  text: '#1a2b6b', border: 'rgba(26,43,107,0.3)'  },
  'Cancelado':           { bg: 'rgba(220,38,38,0.10)',  text: '#dc2626', border: 'rgba(220,38,38,0.3)'  },
};

export type TraspasoTipo = 'Entrante' | 'Saliente';

// Estatus válidos según el tipo de traspaso, en orden de flujo:
// Entrante: la sucursal donante surte y envía; nosotros damos entrada (Recibido).
// Saliente: nosotros surtimos y enviamos; la sucursal solicitante confirma (Entregado).
export const TRASPASO_STATUS_POR_TIPO: Record<TraspasoTipo, TraspasoStatus[]> = {
  Entrante: ['Pendiente', 'Surtido', 'Enviado', 'Recibido'],
  Saliente: ['Pendiente', 'Surtido', 'Enviado', 'Entregado'],
};

// Estatus válidos para traspasos categoria === 'CEDIS' (pipeline propio, distinto
// al de "Entre sucursales" aunque ambos usan tipo 'Entrante'):
// Pendiente → Documentado (CEDIS lo documenta/prepara) → Enviado → Recibido.
export const TRASPASO_STATUS_CEDIS: TraspasoStatus[] = ['Pendiente', 'Documentado', 'Enviado', 'Recibido'];

export const TRASPASO_TIPO_LABELS: Record<TraspasoTipo, string> = {
  Entrante: 'Por recibir',
  Saliente: 'Por enviar',
};

// Nombres de íconos Material Symbols; se muestran a la derecha del texto de la etiqueta
export const TRASPASO_TIPO_ICONS: Record<TraspasoTipo, string> = {
  Entrante: 'arrow_back',
  Saliente: 'arrow_forward',
};

export interface TraspasoPiezaDetalle {
  code: string;
  qtySolicitada: number;
  qtySurtida: number;
  motivoNegacion?: string;
}

// ── Trazabilidad del flujo automático / semiautomático (SMC) ──────────────
// Fuente funcional: ERB-42439, ERB-51528, ERB-51529, ERB-51530, ERB-51531.
// Clasificación del flujo de la petición. Complementa `categoria`:
// - 'Automatico'/'Semiautomatico': flujo SMC (recálculo, exclusión de sucursal, máx. 3).
// - 'Manual': flujo manual (solo validaciones/mensajes, NO recálculo).
// - 'CEDIS': proveniente de CEDIS.
export type TraspasoFlujo = 'Automatico' | 'Semiautomatico' | 'Manual' | 'CEDIS';

// Estado de la SOLICITUD (agrupa una o varias peticiones de una misma necesidad).
export type SolicitudEstado = 'activa' | 'en-progreso' | 'finalizada' | 'cancelada' | 'agotada';

// Resultado operativo de una PETICIÓN dentro del ciclo de la solicitud.
export type PeticionResultado =
  | 'vigente'
  | 'surtida'
  | 'surtida-parcial'
  | 'rechazada'
  | 'cancelada'
  | 'revisada'
  | 'documentada'
  | 'enviada'
  | 'recibida'
  | 'unificada';   // urgencia CEDIS unificada dentro de un traspaso de reabasto (la genera CEDIS)

// Causa registrada cuando una petición se cancela o ajusta.
export type MotivoCancelacion =
  | 'pedido-facturado'
  | 'pedido-cancelado'
  | 'cubierta-otro-traspaso'
  | 'urgencia-cedis'
  | 'manual-sustituye'
  | 'solicitud-cancelada';

// Categoría real del traspaso (contexto de negocio):
// - Automático: generado por el sistema cuando un pedido web no tiene todo el stock en una sola sucursal.
//   Siempre lleva un pedido origen relacionado.
// - Manual: solicitado a mano por la sucursal. Puede o no llevar pedido origen; si no lleva,
//   requiere autorización con token/PIN (ver `autorizacionToken`).
// - CEDIS: llega desde el centro de distribución. Unidireccional (solo recepción, la sucursal
//   nunca envía a CEDIS) y de recepción CIEGA (el operario no ve cantidades esperadas).
export type TraspasoCategoria = 'Automático' | 'Manual' | 'CEDIS';

// Etiqueta visible para cada categoría (el valor interno 'Automático' no cambia,
// solo cómo se muestra en pantalla).
export const TRASPASO_CATEGORIA_LABELS: Record<TraspasoCategoria, string> = {
  'Automático': 'Automático SMC',
  'Manual': 'Manual',
  'CEDIS': 'CEDIS',
};

// Subtipo exclusivo de categoria === 'CEDIS':
// - Especial: solicitud manual a CEDIS CON pedido de cliente relacionado.
// - Urgencia: solicitud manual a CEDIS SIN pedido (la valida CEDIS con token).
// - Reabasto: CEDIS lo envía por su cuenta para restocking, sin pedido.
export type TraspasoSubtipoCedis = 'Especial' | 'Urgencia' | 'Reabasto';

// Motivo de un ENVÍO de la sucursal hacia CEDIS. Rompe la unidireccionalidad
// histórica (la sucursal ahora también envía a CEDIS): devoluciones y garantías
// salen de la sucursal hacia el centro de distribución.
export type MotivoEnvioCedis = 'Devolución' | 'Garantía';

// Entrada del historial de confirmaciones de recepción (queda registro de cada
// confirmación o cambio: completa/parcial, cajas, quién y cuándo).
export interface RecepcionLogEntry {
  fecha: string;
  tipo: 'Completa' | 'Parcial';
  usuario: string;
  nota?: string;
  cajasRecibidas?: number; // solo CEDIS (escaneo de cajas)
  cajasTotal?: number;
}

export const MOTIVO_ENVIO_CEDIS_COLORS: Record<MotivoEnvioCedis, { bg: string; text: string; border: string }> = {
  'Devolución': { bg: 'rgba(217,119,6,0.1)', text: '#b45309', border: 'rgba(217,119,6,0.35)' },
  'Garantía':   { bg: 'rgba(37,99,235,0.1)', text: '#1d4ed8', border: 'rgba(37,99,235,0.35)' },
};

export interface TraspasoPeticion {
  id: string;
  solicitudId: string;
  tipo: TraspasoTipo;           // LEGACY/derivado: perspectiva de la sucursal local histórica.
                                // Con el selector global se calcula con perspectivaTraspaso().
  categoria: TraspasoCategoria;
  subtipoCedis?: TraspasoSubtipoCedis; // solo presente cuando categoria === 'CEDIS'
  sucursalContraparte: string;  // LEGACY: contraparte vista desde la sucursal local histórica.
  // ── Modelo de dos lados (fuente de verdad para el selector de sucursal) ──
  // Un traspaso siempre va de una sucursal ORIGEN (donante, quien surte/envía) a
  // una sucursal DESTINO (solicitante, quien recibe). La perspectiva Entrante/
  // Saliente se calcula según la sucursal actualmente seleccionada.
  // Envío a CEDIS (devolución/garantía): destino === 'CEDIS'. Recepción de CEDIS: origen === 'CEDIS'.
  sucursalOrigen?: string;      // quien surte y envía
  sucursalDestino?: string;     // quien recibe
  motivoEnvioCedis?: MotivoEnvioCedis; // solo envíos sucursal → CEDIS (devolución/garantía)
  // ── Confirmación de recepción (recibido físicamente, sin entrada a inventario) ──
  tipoRecepcion?: 'Completa' | 'Parcial'; // última confirmación de recepción
  recepcionLog?: RecepcionLogEntry[];     // historial de confirmaciones/cambios (queda registro)
  status: TraspasoStatus;
  fechaCreacion: string;       // 'YYYY-MM-DD HH:mm'
  fechaActualizacion: string;
  piezas: TraspasoPiezaDetalle[];
  pedidoOrigen: string;
  parcial: boolean;
  embarqueId?: string;
  metodoEnvio?: string;
  observaciones?: string;
  usuarioCreador: string;
  autorizacionToken?: string;   // solo Manual sin pedidoOrigen: token/PIN de autorización
  cajas?: number;               // solo CEDIS Reabasto: recepción ciega por caja, sin desglose de piezas
  noPapeleta: string;           // folio de papeleta física (vista unificada estilo almacén)
  fechaArribo?: string;         // fecha esperada de llegada; solo una vez enviado ('YYYY-MM-DD HH:mm')
  packingList: boolean;
  cajasTotal: number;
  cajasRecibidas: number;
  // ── Trazabilidad SMC (opcional, no rompe datos existentes) ──
  flujo?: TraspasoFlujo;             // clasificación del flujo (Automatico/Semiautomatico/Manual/CEDIS)
  intento?: number;                  // 1..MAX_EVALUACIONES_PETICION dentro de la misma solicitud
  resultado?: PeticionResultado;     // resultado operativo dentro del ciclo de la solicitud
  motivoRechazo?: string;            // motivo capturado al rechazar/cancelar
  motivoCancelacion?: MotivoCancelacion; // causa tipificada de cancelación/ajuste
  peticionAnteriorId?: string;       // eslabón previo en la cadena de recálculo
  peticionSiguienteId?: string;      // eslabón siguiente (petición derivada)
  sucursalesExcluidas?: string[];    // sucursales que ya rechazaron esta necesidad (no reelegibles)
  solicitudEstado?: SolicitudEstado; // estado de la solicitud origen
  // ── Unificación de urgencia CEDIS con un traspaso de reabasto (lo decide CEDIS) ──
  // En la urgencia unificada: id del traspaso de reabasto que la absorbió.
  unificadaEnTraspaso?: string;
  // En el traspaso de REABASTO: pedidos/urgencias cuya mercancía viaja unificada
  // (para que el usuario sepa que el reabasto trae mercancía de un pedido).
  reabastoUnifica?: { pedido: string; peticionId: string }[];
}

// Código interno de almacén por sucursal (vista unificada estilo almacén).
export const SUCURSAL_ALMACEN_CODIGOS: Record<string, string> = {
  'Pelícano': '9',
  'Federalismo': '1',
  'Central Camionera': '14',
  'Adolf Horn': '27',
  'Belisario Domínguez': '3',
  'Colón': '36',
  'Colonia Jalisco': '24',
  'Forum Tlaquepaque': '6',
  'Tesistán': '42',
  'CEDIS': 'AL1',
};

// Perspectiva de un traspaso vista desde una sucursal concreta (selector global).
// - Si la sucursal es el DESTINO → lo recibe → 'Entrante' (Por recibir), contraparte = origen.
// - Si la sucursal es el ORIGEN  → lo envía  → 'Saliente' (Por enviar),  contraparte = destino.
// - Si no participa → no visible en esa sucursal.
// Fallback: registros sin origen/destino se atribuyen a la sucursal local histórica.
export interface PerspectivaTraspaso { visible: boolean; tipo: TraspasoTipo; contraparte: string; }
export function perspectivaTraspaso(t: TraspasoPeticion, sucursal: string): PerspectivaTraspaso {
  const { sucursalOrigen: origen, sucursalDestino: destino } = t;
  if (origen && destino) {
    if (sucursal === destino) return { visible: true, tipo: 'Entrante', contraparte: origen };
    if (sucursal === origen) return { visible: true, tipo: 'Saliente', contraparte: destino };
    return { visible: false, tipo: t.tipo, contraparte: t.sucursalContraparte };
  }
  return { visible: sucursal === SUCURSAL_LOCAL, tipo: t.tipo, contraparte: t.sucursalContraparte };
}

// Convierte 'YYYY-MM-DD HH:mm' a 'DD/MM/YY' para la vista unificada estilo almacén.
export function formatFechaCorta(fechaIso: string): string {
  const [y, m, d] = fechaIso.slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export const SUCURSALES = [
  'Pelícano', 'Federalismo', 'Central Camionera', 'Adolf Horn',
  'Belisario Domínguez', 'Colón', 'Colonia Jalisco', 'Forum Tlaquepaque',
  'Tesistán',
] as const;

// Sucursal local por defecto (histórica). Con el selector global de sucursal
// la "sucursal actual" vive en AppContext; esta constante solo se usa como
// valor inicial y para retro-compatibilidad de datos que no traen origen/destino.
// Sucursal local histórica usada solo como atribución de la data LEGACY (sin
// origen/destino). Se fija en una sucursal FUERA del ejercicio para que el filtro
// de las 4 sucursales elimine por completo esos registros legacy (incluidos los
// legacy de CEDIS) y solo quede la demo curada.
export const SUCURSAL_LOCAL = 'Pelícano';

// Sucursales seleccionables en el ejercicio (dos lados de la demo en tiempo real).
// TODA la data (traspasos, existencias, recomendaciones SMC) queda restringida a
// estas 4 sucursales (+ CEDIS como nodo especial). Ver el filtro de TRASPASOS_DB
// y la restricción de calcularSucursalRecomendada.
export const SUCURSALES_EJERCICIO = ['Federalismo', 'Tesistán', 'Adolf Horn', 'Colón'] as const;

// Conjunto permitido para cualquier traspaso: las 4 del ejercicio + CEDIS.
export const SUCURSALES_PERMITIDAS = new Set<string>([...SUCURSALES_EJERCICIO, 'CEDIS']);

// Existencia disponible por sucursal y código de producto (mock).
export const EXISTENCIA_POR_SUCURSAL: Record<string, Record<string, number>> = {
  "Pelícano": { "BP-001": 25, "FT-223": 18, "AM-445": 1, "BC-118": 6, "RD-772": 25, "XX-999": 22, "LT-334": 24, "AC-201": 14, "BT-055": 0 },
  "Federalismo": { "BP-001": 14, "FT-223": 8, "AM-445": 20, "BC-118": 23, "RD-772": 12, "XX-999": 20, "LT-334": 5, "AC-201": 9, "BT-055": 16 },
  "Central Camionera": { "BP-001": 10, "FT-223": 0, "AM-445": 0, "BC-118": 20, "RD-772": 17, "XX-999": 0, "LT-334": 21, "AC-201": 0, "BT-055": 8 },
  "Adolf Horn": { "BP-001": 24, "FT-223": 13, "AM-445": 20, "BC-118": 0, "RD-772": 23, "XX-999": 19, "LT-334": 14, "AC-201": 25, "BT-055": 11 },
  "Belisario Domínguez": { "BP-001": 11, "FT-223": 0, "AM-445": 20, "BC-118": 0, "RD-772": 17, "XX-999": 0, "LT-334": 7, "AC-201": 7, "BT-055": 12 },
  "Colón": { "BP-001": 0, "FT-223": 7, "AM-445": 17, "BC-118": 13, "RD-772": 11, "XX-999": 3, "LT-334": 16, "AC-201": 15, "BT-055": 12 },
  "Colonia Jalisco": { "BP-001": 4, "FT-223": 16, "AM-445": 12, "BC-118": 13, "RD-772": 7, "XX-999": 0, "LT-334": 19, "AC-201": 0, "BT-055": 0 },
  "Forum Tlaquepaque": { "BP-001": 3, "FT-223": 6, "AM-445": 0, "BC-118": 2, "RD-772": 5, "XX-999": 9, "LT-334": 25, "AC-201": 7, "BT-055": 0 },
  "Tesistán": { "BP-001": 18, "FT-223": 22, "AM-445": 9, "BC-118": 7, "RD-772": 0, "XX-999": 14, "LT-334": 3, "AC-201": 20, "BT-055": 5 },
};

// Existencia disponible en CEDIS por código de producto (mock). Regla de negocio:
// nunca se puede solicitar a CEDIS más de lo que CEDIS tiene en existencia.
export const EXISTENCIA_CEDIS: Record<string, number> = {
  "BP-001": 40, "FT-223": 6, "AM-445": 30, "BC-118": 25, "RD-772": 15,
  "XX-999": 100, "LT-334": 12, "AC-201": 50, "BT-055": 8,
};

// Convierte un total con formato "$1,837.12" a número (1837.12).
export function parseMoney(total: string): number {
  const n = parseFloat(String(total).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Total monetario de un conjunto de partidas (precio × cantidad). Se usa para el
// umbral de auto-agregado de piezas recomendadas.
export function totalPartidas(partidas: { code: string; qty: number }[]): number {
  return partidas.reduce((s, p) => s + (PRODUCT_CATALOG[p.code]?.price ?? 0) * p.qty, 0);
}

// Orden de cercanía usado por el motor SMC (Sucursal Más Cercana) — mock.
export const SUCURSAL_DISTANCIA_ORDEN: string[] = [
  'Federalismo', 'Central Camionera', 'Colón', 'Adolf Horn',
  'Colonia Jalisco', 'Belisario Domínguez', 'Forum Tlaquepaque', 'Tesistán', 'Pelícano',
];

// Recomienda la sucursal más cercana (según el motor SMC) que pueda surtir
// completamente las piezas solicitadas; si ninguna puede, regresa la más
// cercana disponible marcando `suficiente: false`.
export function calcularSucursalRecomendada(
  piezas: { code: string; qty: number }[],
  excluir: string[] = []
): { sucursal: string; suficiente: boolean } | null {
  // Solo se recomiendan sucursales del ejercicio (las 4 permitidas).
  const candidatos = SUCURSAL_DISTANCIA_ORDEN.filter(
    s => (SUCURSALES_EJERCICIO as readonly string[]).includes(s) && !excluir.includes(s)
  );
  if (candidatos.length === 0) return null;
  if (piezas.length === 0) return { sucursal: candidatos[0], suficiente: true };

  for (const suc of candidatos) {
    const stock = EXISTENCIA_POR_SUCURSAL[suc] ?? {};
    const suficiente = piezas.every(p => (stock[p.code] ?? 0) >= p.qty);
    if (suficiente) return { sucursal: suc, suficiente: true };
  }
  return { sucursal: candidatos[0], suficiente: false };
}

export const TRASPASO_STATUS_COLORS: Record<TraspasoStatus, { bg: string; text: string; border: string }> = {
  'Pendiente':  { bg: 'rgba(217,119,6,0.12)',   text: '#d97706', border: 'rgba(217,119,6,0.3)'   },
  'Surtido':    { bg: 'rgba(124,58,237,0.12)',  text: '#7c3aed', border: 'rgba(124,58,237,0.3)'  },
  'Revisado':   { bg: 'rgba(37,99,235,0.12)',   text: '#2563eb', border: 'rgba(37,99,235,0.3)'   },
  'Documentado':{ bg: 'rgba(13,148,136,0.12)',  text: '#0d9488', border: 'rgba(13,148,136,0.3)'  },
  'Enviado':    { bg: 'rgba(22,163,74,0.12)',   text: '#16a34a', border: 'rgba(22,163,74,0.3)'   },
  'Recibido':   { bg: 'rgba(26,43,107,0.12)',   text: '#1a2b6b', border: 'rgba(26,43,107,0.3)'   },
  'Entregado':  { bg: 'rgba(26,43,107,0.12)',   text: '#1a2b6b', border: 'rgba(26,43,107,0.3)'   },
  'Cancelado':  { bg: 'rgba(220,38,38,0.12)',   text: '#dc2626', border: 'rgba(220,38,38,0.3)'   },
};

export const CEDIS_SUBTIPO_COLORS: Record<TraspasoSubtipoCedis, { bg: string; text: string; border: string }> = {
  'Especial': { bg: 'rgba(217,119,6,0.10)',  text: '#d97706', border: 'rgba(217,119,6,0.3)'  },
  'Urgencia': { bg: 'rgba(220,38,38,0.10)',  text: '#dc2626', border: 'rgba(220,38,38,0.3)'  },
  'Reabasto': { bg: 'rgba(37,99,235,0.10)',  text: '#2563eb', border: 'rgba(37,99,235,0.3)'  },
};

// Colores de chip para las categorías que se originan en sucursal (CEDIS usa CEDIS_SUBTIPO_COLORS).
export const TRASPASO_CATEGORIA_COLORS: Record<'Automático' | 'Manual', { bg: string; text: string; border: string }> = {
  'Automático': { bg: 'rgba(13,148,136,0.10)', text: '#0d9488', border: 'rgba(13,148,136,0.3)' },
  'Manual':     { bg: 'rgba(79,70,229,0.10)',  text: '#4f46e5', border: 'rgba(79,70,229,0.3)'  },
};

export const CEDIS_SUCURSAL_CONTRAPARTE = 'CEDIS';

// Paqueterías disponibles para embarcar traspasos entre sucursales.
export const TRASPASO_PAQUETERIAS = ['Transporte interno', 'BlueGo', 'Estafeta', 'DHL', 'Paquetexpress', 'Uber'];

// Productos más vendidos / de alta rotación (mock) — se recomiendan al armar
// una solicitud de traspaso entre sucursales.
export const PRODUCTOS_ALTA_ROTACION: string[] = ['AC-201', 'FT-223', 'BP-001', 'BT-055', 'LT-334'];

// Embarque que agrupa una o más peticiones de traspaso Saliente con el mismo
// destino (sucursalDestino), de forma análoga a los embarques de pedidos.
export interface EmbarqueTraspaso {
  id: string;
  sucursalDestino: string;
  paqueteria: string;
  traspasos: string[]; // ids de TraspasoPeticion (PET-...)
  status: 'Generado' | 'En tránsito' | 'Entregado';
  fecha: string;
  observaciones?: string;
  usuario: string;
}

export const EMBARQUES_TRASPASO_DB: EmbarqueTraspaso[] = [
  {
    id: '88739',
    sucursalDestino: 'Pelícano',
    paqueteria: 'Transporte interno',
    traspasos: ['PET-028'],
    status: 'Generado',
    fecha: '2026-07-26 20:40',
    usuario: 'MPENICHE07',
  },
];

export function tiempoTranscurrido(fechaIso: string): string {
  const [datePart, timePart] = fechaIso.split(' ');
  const fecha = new Date(`${datePart}T${timePart}:00`);
  const diffMs = Date.now() - fecha.getTime();
  if (diffMs < 0) return '0m';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const horas = Math.floor(mins / 60);
  const minRest = mins % 60;
  if (horas < 24) return minRest > 0 ? `${horas}h ${minRest}m` : `${horas}h`;
  const dias = Math.floor(horas / 24);
  const horaRest = horas % 24;
  return horaRest > 0 ? `${dias}d ${horaRest}h` : `${dias}d`;
}

export const TRASPASOS_DB: TraspasoPeticion[] = [
  // ══════════════════════════════════════════════════════════════
  // Escenarios variados por ETAPA (mes en curso) — Envío y Recepción
  // Cubren: Sin surtir, Surtido, En revisión, Embarcado, Enviado/En camino,
  // Recibido/Entregado (Finalizado) y Cancelado — para ambos tipos.
  // ══════════════════════════════════════════════════════════════

  // ── SALIENTE (Por enviar) ──
  { id: 'DEMO-S-PEN', solicitudId: 'SOL-D101', tipo: 'Saliente', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Federalismo', status: 'Pendiente', intento: 1, resultado: 'vigente',
    fechaCreacion: '2026-07-02 09:10', fechaActualizacion: '2026-07-02 09:10',
    piezas: [{ code: 'BP-001', qtySolicitada: 6, qtySurtida: 0 }, { code: 'FT-223', qtySolicitada: 3, qtySurtida: 0 }],
    pedidoOrigen: '1064772', parcial: false, usuarioCreador: 'JMORENO11', noPapeleta: '410101', packingList: false, cajasTotal: 2, cajasRecibidas: 0 },
  { id: 'DEMO-S-SUR', solicitudId: 'SOL-D102', tipo: 'Saliente', categoria: 'Automático', flujo: 'Semiautomatico',
    sucursalContraparte: 'Adolf Horn', status: 'Surtido', intento: 1, resultado: 'surtida',
    fechaCreacion: '2026-07-03 11:40', fechaActualizacion: '2026-07-03 12:20',
    piezas: [{ code: 'BC-118', qtySolicitada: 4, qtySurtida: 4 }], pedidoOrigen: '1064838', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '410102', packingList: true, cajasTotal: 1, cajasRecibidas: 0 },
  { id: 'DEMO-S-REV', solicitudId: 'SOL-D103', tipo: 'Saliente', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Colón', status: 'Revisado', intento: 1, resultado: 'revisada',
    fechaCreacion: '2026-07-05 08:15', fechaActualizacion: '2026-07-05 09:05',
    piezas: [{ code: 'AC-201', qtySolicitada: 5, qtySurtida: 5 }], pedidoOrigen: '1064847', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '410103', packingList: true, cajasTotal: 2, cajasRecibidas: 0 },
  { id: 'DEMO-S-DOC', solicitudId: 'SOL-D104', tipo: 'Saliente', categoria: 'Manual', flujo: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Documentado', resultado: 'documentada',
    fechaCreacion: '2026-07-07 14:00', fechaActualizacion: '2026-07-07 15:10',
    piezas: [{ code: 'LT-334', qtySolicitada: 3, qtySurtida: 3 }], pedidoOrigen: '1064901', parcial: false,
    embarqueId: '88750', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'JMORENO11', noPapeleta: '410104', packingList: true, cajasTotal: 2, cajasRecibidas: 0 },
  { id: 'DEMO-S-ENV', solicitudId: 'SOL-D105', tipo: 'Saliente', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Central Camionera', status: 'Enviado', resultado: 'enviada',
    fechaCreacion: '2026-07-09 10:30', fechaActualizacion: '2026-07-09 13:20', fechaArribo: '2026-07-10 11:00',
    piezas: [{ code: 'RD-772', qtySolicitada: 2, qtySurtida: 2 }, { code: 'XX-999', qtySolicitada: 6, qtySurtida: 6 }],
    pedidoOrigen: '1064853', parcial: false, embarqueId: '88751', metodoEnvio: 'Estafeta',
    usuarioCreador: 'JMORENO11', noPapeleta: '410105', packingList: true, cajasTotal: 3, cajasRecibidas: 0 },
  { id: 'DEMO-S-ENT', solicitudId: 'SOL-D106', tipo: 'Saliente', categoria: 'Automático', flujo: 'Semiautomatico',
    sucursalContraparte: 'Belisario Domínguez', status: 'Entregado', resultado: 'recibida',
    fechaCreacion: '2026-07-11 09:00', fechaActualizacion: '2026-07-12 16:45', fechaArribo: '2026-07-12 15:30',
    piezas: [{ code: 'BP-001', qtySolicitada: 5, qtySurtida: 5 }], pedidoOrigen: '1064798', parcial: false,
    embarqueId: '88752', metodoEnvio: 'DHL',
    usuarioCreador: 'JMORENO11', noPapeleta: '410106', packingList: true, cajasTotal: 2, cajasRecibidas: 2 },
  { id: 'DEMO-S-CAN', solicitudId: 'SOL-D107', tipo: 'Saliente', categoria: 'Manual', flujo: 'Manual',
    sucursalContraparte: 'Colonia Jalisco', status: 'Cancelado', resultado: 'cancelada', motivoCancelacion: 'pedido-cancelado',
    fechaCreacion: '2026-07-13 12:10', fechaActualizacion: '2026-07-13 17:40', motivoRechazo: 'Pedido origen cancelado',
    piezas: [{ code: 'AM-445', qtySolicitada: 3, qtySurtida: 0 }], pedidoOrigen: '1064835', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '410107', packingList: false, cajasTotal: 1, cajasRecibidas: 0 },

  // ── ENTRANTE (Por recibir) ──
  { id: 'DEMO-E-PEN', solicitudId: 'SOL-D201', tipo: 'Entrante', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Federalismo', status: 'Pendiente', intento: 1, resultado: 'vigente',
    fechaCreacion: '2026-07-02 10:00', fechaActualizacion: '2026-07-02 10:00',
    piezas: [{ code: 'FT-223', qtySolicitada: 4, qtySurtida: 0 }], pedidoOrigen: '1064772', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '420201', packingList: false, cajasTotal: 1, cajasRecibidas: 0 },
  { id: 'DEMO-E-SUR', solicitudId: 'SOL-D202', tipo: 'Entrante', categoria: 'Automático', flujo: 'Semiautomatico',
    sucursalContraparte: 'Adolf Horn', status: 'Surtido', intento: 1, resultado: 'surtida',
    fechaCreacion: '2026-07-04 09:30', fechaActualizacion: '2026-07-04 10:20',
    piezas: [{ code: 'BT-055', qtySolicitada: 3, qtySurtida: 3 }], pedidoOrigen: '1064953', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '420202', packingList: true, cajasTotal: 1, cajasRecibidas: 0 },
  { id: 'DEMO-E-REV', solicitudId: 'SOL-D203', tipo: 'Entrante', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Pelícano', status: 'Revisado', intento: 1, resultado: 'revisada',
    fechaCreacion: '2026-07-06 13:00', fechaActualizacion: '2026-07-06 13:45',
    piezas: [{ code: 'RD-772', qtySolicitada: 4, qtySurtida: 4 }], pedidoOrigen: '1064888', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '420203', packingList: true, cajasTotal: 2, cajasRecibidas: 0 },
  { id: 'DEMO-E-DOC', solicitudId: 'SOL-D204', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Urgencia',
    sucursalContraparte: 'CEDIS', status: 'Documentado', resultado: 'documentada',
    fechaCreacion: '2026-07-08 11:15', fechaActualizacion: '2026-07-08 12:30',
    piezas: [{ code: 'BC-118', qtySolicitada: 6, qtySurtida: 6 }], pedidoOrigen: '1064910', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '420204', packingList: true, cajasTotal: 2, cajasRecibidas: 0 },
  { id: 'DEMO-E-ENV', solicitudId: 'SOL-D205', tipo: 'Entrante', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Colón', status: 'Enviado', resultado: 'enviada',
    fechaCreacion: '2026-07-10 08:40', fechaActualizacion: '2026-07-10 12:10', fechaArribo: '2026-07-11 10:30',
    piezas: [{ code: 'LT-334', qtySolicitada: 2, qtySurtida: 2 }, { code: 'AC-201', qtySolicitada: 3, qtySurtida: 3 }],
    pedidoOrigen: '1064960', parcial: false, embarqueId: '88760', metodoEnvio: 'BlueGo',
    usuarioCreador: 'JMORENO11', noPapeleta: '420205', packingList: true, cajasTotal: 2, cajasRecibidas: 0 },
  { id: 'DEMO-E-REC', solicitudId: 'SOL-D206', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Recibido', resultado: 'recibida',
    fechaCreacion: '2026-07-12 09:20', fechaActualizacion: '2026-07-13 10:05', fechaArribo: '2026-07-13 09:40',
    piezas: [{ code: 'XX-999', qtySolicitada: 8, qtySurtida: 8 }], pedidoOrigen: '', parcial: false,
    embarqueId: '88761', metodoEnvio: 'Transporte interno', cajas: 3,
    usuarioCreador: 'JMORENO11', noPapeleta: '420206', packingList: true, cajasTotal: 3, cajasRecibidas: 3 },
  { id: 'DEMO-E-CAN', solicitudId: 'SOL-D207', tipo: 'Entrante', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Central Camionera', status: 'Cancelado', resultado: 'cancelada', motivoCancelacion: 'cubierta-otro-traspaso',
    fechaCreacion: '2026-07-14 15:00', fechaActualizacion: '2026-07-14 16:20', motivoRechazo: 'Necesidad cubierta por otro traspaso',
    piezas: [{ code: 'BP-001', qtySolicitada: 4, qtySurtida: 0 }], pedidoOrigen: '1064907', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '420207', packingList: false, cajasTotal: 1, cajasRecibidas: 0 },

  // ── Un mismo PEDIDO (#1064953) con VARIAS peticiones bajo la MISMA solicitud (SOL-D210):
  //    el motor SMC repartió la necesidad entre 3 sucursales donantes (cada una en distinta etapa).
  { id: 'DEMO-E-MP1', solicitudId: 'SOL-D210', tipo: 'Entrante', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Federalismo', status: 'Pendiente', intento: 1, resultado: 'vigente',
    fechaCreacion: '2026-07-15 09:00', fechaActualizacion: '2026-07-15 09:00',
    piezas: [{ code: 'BP-001', qtySolicitada: 4, qtySurtida: 0 }], pedidoOrigen: '1064953', parcial: false,
    usuarioCreador: 'JMORENO11', noPapeleta: '420210', packingList: false, cajasTotal: 1, cajasRecibidas: 0 },
  { id: 'DEMO-E-MP2', solicitudId: 'SOL-D210', tipo: 'Entrante', categoria: 'Automático', flujo: 'Semiautomatico',
    sucursalContraparte: 'Adolf Horn', status: 'Enviado', intento: 1, resultado: 'enviada',
    fechaCreacion: '2026-07-15 09:05', fechaActualizacion: '2026-07-15 12:30', fechaArribo: '2026-07-16 10:00',
    piezas: [{ code: 'FT-223', qtySolicitada: 3, qtySurtida: 3 }], pedidoOrigen: '1064953', parcial: false,
    embarqueId: '88770', metodoEnvio: 'BlueGo',
    usuarioCreador: 'JMORENO11', noPapeleta: '420211', packingList: true, cajasTotal: 1, cajasRecibidas: 0 },
  { id: 'DEMO-E-MP3', solicitudId: 'SOL-D210', tipo: 'Entrante', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Colón', status: 'Recibido', intento: 1, resultado: 'recibida',
    fechaCreacion: '2026-07-15 09:08', fechaActualizacion: '2026-07-16 11:20', fechaArribo: '2026-07-16 10:40',
    piezas: [{ code: 'AM-445', qtySolicitada: 2, qtySurtida: 2 }], pedidoOrigen: '1064953', parcial: false,
    embarqueId: '88771', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'JMORENO11', noPapeleta: '420212', packingList: true, cajasTotal: 1, cajasRecibidas: 1 },

  // ── Pedido #1065001 (10 pzs BP-001): cadena de recálculo con RECHAZO y FALTANTE.
  //    Intento 1 rechazado → intento 2 recibido (6) → intento 3 en camino (2) ⇒ faltan 2.
  { id: 'DEMO-E-R1', solicitudId: 'SOL-R30', tipo: 'Entrante', categoria: 'Automático', flujo: 'Automatico',
    sucursalContraparte: 'Federalismo', status: 'Cancelado', intento: 1, resultado: 'cancelada',
    motivoCancelacion: 'cubierta-otro-traspaso', motivoRechazo: 'Rechazada por la sucursal: sin existencia suficiente',
    fechaCreacion: '2026-07-15 08:30', fechaActualizacion: '2026-07-15 09:10',
    piezas: [{ code: 'BP-001', qtySolicitada: 10, qtySurtida: 0 }], pedidoOrigen: '1065001', parcial: false,
    peticionSiguienteId: 'DEMO-E-R2',
    usuarioCreador: 'JMORENO11', noPapeleta: '430001', packingList: false, cajasTotal: 1, cajasRecibidas: 0 },
  { id: 'DEMO-E-R2', solicitudId: 'SOL-R30', tipo: 'Entrante', categoria: 'Automático', flujo: 'Semiautomatico',
    sucursalContraparte: 'Adolf Horn', status: 'Recibido', intento: 2, resultado: 'recibida',
    fechaCreacion: '2026-07-15 09:15', fechaActualizacion: '2026-07-16 10:00', fechaArribo: '2026-07-16 09:30',
    piezas: [{ code: 'BP-001', qtySolicitada: 6, qtySurtida: 6 }], pedidoOrigen: '1065001', parcial: false,
    peticionAnteriorId: 'DEMO-E-R1', peticionSiguienteId: 'DEMO-E-R3',
    embarqueId: '88780', metodoEnvio: 'BlueGo',
    usuarioCreador: 'JMORENO11', noPapeleta: '430002', packingList: true, cajasTotal: 1, cajasRecibidas: 1 },
  { id: 'DEMO-E-R3', solicitudId: 'SOL-R30', tipo: 'Entrante', categoria: 'Automático', flujo: 'Semiautomatico',
    sucursalContraparte: 'Colón', status: 'Enviado', intento: 3, resultado: 'enviada',
    fechaCreacion: '2026-07-16 10:30', fechaActualizacion: '2026-07-16 14:00', fechaArribo: '2026-07-17 11:00',
    piezas: [{ code: 'BP-001', qtySolicitada: 2, qtySurtida: 2 }], pedidoOrigen: '1065001', parcial: false,
    peticionAnteriorId: 'DEMO-E-R2',
    embarqueId: '88781', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'JMORENO11', noPapeleta: '430003', packingList: true, cajasTotal: 1, cajasRecibidas: 0 },

  // SOL-2401: Entrante Automático Pendiente
  {
    id: 'PET-001', solicitudId: 'SOL-9001', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-07-14 10:25', fechaActualizacion: '2026-07-14 10:25',
    piezas: [
      { code: 'BP-001', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'FT-223', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064772', parcial: false,
    usuarioCreador: 'JMORENO11',
    noPapeleta: '400750', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2401: Entrante Manual Pendiente
  {
    id: 'PET-002', solicitudId: 'SOL-9001', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Central Camionera', status: 'Pendiente',
    fechaCreacion: '2026-07-15 10:25', fechaActualizacion: '2026-07-15 10:25',
    piezas: [
      { code: 'AM-445', qtySolicitada: 3, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064847', parcial: false,
    usuarioCreador: 'JMORENO11',
    noPapeleta: '401500', packingList: true,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2402: Entrante Automático Surtido
  {
    id: 'PET-003', solicitudId: 'SOL-9001', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Adolf Horn', status: 'Surtido',
    fechaCreacion: '2026-07-16 08:30', fechaActualizacion: '2026-07-16 09:15',
    piezas: [
      { code: 'BC-118', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'BT-055', qtySolicitada: 1, qtySurtida: 1 },
    ],
    pedidoOrigen: '1064838', parcial: false,
    usuarioCreador: 'AMORALES03',
    noPapeleta: '402250', packingList: true,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2403: Entrante Manual Enviado
  {
    id: 'PET-004', solicitudId: 'SOL-9002', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Belisario Domínguez', status: 'Enviado',
    fechaCreacion: '2026-07-17 16:40', fechaActualizacion: '2026-07-18 08:05',
    piezas: [
      { code: 'RD-772', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'AC-201', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064844', parcial: false,
    embarqueId: '88516', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'AMORALES03',
    noPapeleta: '403000', packingList: false,
    fechaArribo: '2026-07-19 16:40',
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2404: Entrante Automático Recibido
  {
    id: 'PET-005', solicitudId: 'SOL-9002', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Colón', status: 'Recibido',
    fechaCreacion: '2026-07-18 09:00', fechaActualizacion: '2026-07-18 17:30',
    piezas: [
      { code: 'LT-334', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064853', parcial: false,
    embarqueId: '88514', metodoEnvio: 'BlueGo',
    usuarioCreador: 'JMORENO11',
    noPapeleta: '403750', packingList: true,
    fechaArribo: '2026-07-20 09:00',
    cajasTotal: 1, cajasRecibidas: 1,
  },
  // SOL-2405: Entrante Automático Pendiente
  {
    id: 'PET-006', solicitudId: 'SOL-9003', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Colonia Jalisco', status: 'Pendiente',
    fechaCreacion: '2026-07-19 11:20', fechaActualizacion: '2026-07-19 11:20',
    piezas: [
      { code: 'XX-999', qtySolicitada: 10, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064848', parcial: false,
    usuarioCreador: 'JMORENO11',
    noPapeleta: '404409', packingList: true,
    cajasTotal: 3, cajasRecibidas: 0,
  },
  // SOL-2406: Entrante Manual Pendiente
  {
    id: 'PET-007', solicitudId: 'SOL-9003', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-07-20 04:30', fechaActualizacion: '2026-07-20 04:30',
    piezas: [
      { code: 'BP-001', qtySolicitada: 6, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '', parcial: false,
    autorizacionToken: 'PIN-1111',
    usuarioCreador: 'MPENICHE07',
    noPapeleta: '405159', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2407: Saliente Automático Pendiente
  {
    id: 'PET-008', solicitudId: 'SOL-2407', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Forum Tlaquepaque', status: 'Pendiente',
    fechaCreacion: '2026-07-21 10:10', fechaActualizacion: '2026-07-21 10:10',
    piezas: [
      { code: 'FT-223', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'AC-201', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064834', parcial: false,
    usuarioCreador: 'RGARCIA_PERI',
    noPapeleta: '405909', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2408: Saliente Manual Pendiente
  {
    id: 'PET-009', solicitudId: 'SOL-2408', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Central Camionera', status: 'Pendiente',
    fechaCreacion: '2026-07-22 08:00', fechaActualizacion: '2026-07-22 08:00',
    piezas: [
      { code: 'BC-118', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064844', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
    noPapeleta: '406659', packingList: true,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2409: Saliente Automático Surtido Parcial
  {
    id: 'PET-010', solicitudId: 'SOL-2409', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Adolf Horn', status: 'Surtido',
    fechaCreacion: '2026-07-23 14:00', fechaActualizacion: '2026-07-23 16:30',
    piezas: [
      { code: 'BT-055', qtySolicitada: 3, qtySurtida: 2 },
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064851', parcial: true,
    usuarioCreador: 'PLOPEZ_ZAP',
    noPapeleta: '407409', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2410: Saliente Automático Enviado
  {
    id: 'PET-011', solicitudId: 'SOL-2410', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Enviado',
    fechaCreacion: '2026-07-24 09:15', fechaActualizacion: '2026-07-24 14:20',
    piezas: [
      { code: 'LT-334', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'XX-999', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064853', parcial: false,
    embarqueId: '88509', metodoEnvio: 'Estafeta',
    usuarioCreador: 'HDIAZ_FED',
    noPapeleta: '408068', packingList: true,
    fechaArribo: '2026-07-26 09:15',
    cajasTotal: 3, cajasRecibidas: 1,
  },
  // SOL-2411: Saliente Manual Entregado
  {
    id: 'PET-012', solicitudId: 'SOL-2411', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Belisario Domínguez', status: 'Entregado',
    fechaCreacion: '2026-07-25 11:00', fechaActualizacion: '2026-07-25 16:45',
    piezas: [
      { code: 'BP-001', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'AM-445', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'FT-223', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064838', parcial: false,
    embarqueId: '88518', metodoEnvio: 'Uber',
    usuarioCreador: 'CVEGA_TLAQ',
    noPapeleta: '408818', packingList: true,
    fechaArribo: '2026-07-27 11:00',
    cajasTotal: 3, cajasRecibidas: 3,
  },
  // SOL-2412: Saliente Automático Pendiente
  {
    id: 'PET-013', solicitudId: 'SOL-2412', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Colón', status: 'Pendiente',
    fechaCreacion: '2026-07-26 10:30', fechaActualizacion: '2026-07-26 10:30',
    piezas: [
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064847', parcial: false,
    usuarioCreador: 'RGARCIA_PERI',
    noPapeleta: '409568', packingList: false,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2413: Saliente Manual Pendiente
  {
    id: 'PET-014', solicitudId: 'SOL-2413', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Colonia Jalisco', status: 'Pendiente',
    fechaCreacion: '2026-07-27 09:45', fechaActualizacion: '2026-07-27 09:45',
    piezas: [
      { code: 'AC-201', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'XX-999', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '', parcial: false,
    autorizacionToken: 'PIN-1222',
    usuarioCreador: 'PLOPEZ_ZAP',
    noPapeleta: '410318', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2414: Entrante Automático Surtido
  {
    id: 'PET-015', solicitudId: 'SOL-9004', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Forum Tlaquepaque', status: 'Surtido',
    fechaCreacion: '2026-07-28 15:45', fechaActualizacion: '2026-07-28 17:04',
    piezas: [
      { code: 'BP-001', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064901', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
    noPapeleta: '411068', packingList: true,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2415: Saliente Automático Surtido
  {
    id: 'PET-016', solicitudId: 'SOL-2415', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Central Camionera', status: 'Surtido',
    fechaCreacion: '2026-07-14 17:25', fechaActualizacion: '2026-07-14 18:47',
    piezas: [
      { code: 'BP-001', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'AC-201', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'BT-055', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064780', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
    noPapeleta: '411818', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2416: Entrante Manual Surtido
  {
    id: 'PET-017', solicitudId: 'SOL-9004', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Adolf Horn', status: 'Surtido',
    fechaCreacion: '2026-07-15 13:00', fechaActualizacion: '2026-07-15 17:07',
    piezas: [
      { code: 'LT-334', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'AC-201', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064953', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '412477', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2417: Saliente Automático Enviado
  {
    id: 'PET-018', solicitudId: 'SOL-2417', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Enviado',
    fechaCreacion: '2026-07-16 06:05', fechaActualizacion: '2026-07-16 09:12',
    piezas: [
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064942', parcial: false,
    embarqueId: '88772', metodoEnvio: 'DHL',
    usuarioCreador: 'DSOTO_PEL',
    noPapeleta: '413227', packingList: true,
    fechaArribo: '2026-07-18 06:05',
    cajasTotal: 2, cajasRecibidas: 1,
  },
  // SOL-2418: Entrante Manual Surtido
  {
    id: 'PET-019', solicitudId: 'SOL-9004', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Surtido',
    fechaCreacion: '2026-07-17 07:50', fechaActualizacion: '2026-07-17 08:12',
    piezas: [
      { code: 'FT-223', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'RD-772', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064888', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
    noPapeleta: '413977', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2419: Saliente Automático Entregado
  {
    id: 'PET-020', solicitudId: 'SOL-2419', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Belisario Domínguez', status: 'Entregado',
    fechaCreacion: '2026-07-18 17:10', fechaActualizacion: '2026-07-18 20:28',
    piezas: [
      { code: 'LT-334', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'XX-999', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064798', parcial: false,
    embarqueId: '88770', metodoEnvio: 'Estafeta',
    usuarioCreador: 'NTORRES_PERI',
    noPapeleta: '414727', packingList: true,
    fechaArribo: '2026-07-20 17:10',
    cajasTotal: 2, cajasRecibidas: 2,
  },
  // SOL-2420: Entrante Automático Surtido
  {
    id: 'PET-021', solicitudId: 'SOL-9005', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Surtido',
    fechaCreacion: '2026-07-19 17:35', fechaActualizacion: '2026-07-19 18:17',
    piezas: [
      { code: 'XX-999', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064960', parcial: false,
    usuarioCreador: 'DSOTO_PEL',
    noPapeleta: '415477', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2421: Saliente Manual Surtido
  {
    id: 'PET-022', solicitudId: 'SOL-2421', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Colón', status: 'Surtido',
    fechaCreacion: '2026-07-20 18:20', fechaActualizacion: '2026-07-20 20:07',
    piezas: [
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '', parcial: false,
    autorizacionToken: 'PIN-1333',
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '416136', packingList: false,
    cajasTotal: 3, cajasRecibidas: 0,
  },
  // SOL-2422: Entrante Automático Recibido
  {
    id: 'PET-023', solicitudId: 'SOL-9005', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Colonia Jalisco', status: 'Recibido',
    fechaCreacion: '2026-07-21 13:25', fechaActualizacion: '2026-07-21 15:14',
    piezas: [
      { code: 'BP-001', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064910', parcial: false,
    embarqueId: '88571', metodoEnvio: 'DHL',
    usuarioCreador: 'CVEGA_TLAQ',
    noPapeleta: '416886', packingList: true,
    fechaArribo: '2026-07-23 13:25',
    cajasTotal: 2, cajasRecibidas: 2,
  },
  // SOL-2423: Saliente Manual Entregado Parcial
  {
    id: 'PET-024', solicitudId: 'SOL-2423', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Entregado',
    fechaCreacion: '2026-07-22 13:45', fechaActualizacion: '2026-07-22 18:28',
    piezas: [
      { code: 'LT-334', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064835', parcial: true,
    embarqueId: '88563', metodoEnvio: 'DHL',
    usuarioCreador: 'JMORENO11',
    noPapeleta: '417636', packingList: true,
    fechaArribo: '2026-07-24 13:45',
    cajasTotal: 1, cajasRecibidas: 1,
  },
  // SOL-2424: Entrante Automático Pendiente
  {
    id: 'PET-025', solicitudId: 'SOL-9006', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-23 10:00', fechaActualizacion: '2026-07-23 10:00',
    piezas: [
      { code: 'BP-001', qtySolicitada: 2, qtySurtida: 0 },
      { code: 'LT-334', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064907', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
    noPapeleta: '418386', packingList: false,
    cajasTotal: 3, cajasRecibidas: 0,
  },
  // SOL-2425: Saliente Automático Enviado
  {
    id: 'PET-026', solicitudId: 'SOL-2425', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Forum Tlaquepaque', status: 'Enviado',
    fechaCreacion: '2026-07-24 14:45', fechaActualizacion: '2026-07-24 19:14',
    piezas: [
      { code: 'BP-001', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064959', parcial: false,
    embarqueId: '88592', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '419136', packingList: true,
    fechaArribo: '2026-07-26 14:45',
    cajasTotal: 3, cajasRecibidas: 1,
  },
  // SOL-2426: Entrante Manual Pendiente
  {
    id: 'PET-027', solicitudId: 'SOL-9006', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Central Camionera', status: 'Pendiente',
    fechaCreacion: '2026-07-25 17:40', fechaActualizacion: '2026-07-25 17:40',
    piezas: [
      { code: 'XX-999', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 0 },
      { code: 'FT-223', qtySolicitada: 1, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064752', parcial: false,
    usuarioCreador: 'PLOPEZ_ZAP',
    noPapeleta: '419795', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2427: Saliente Automático Enviado
  {
    id: 'PET-028', solicitudId: 'SOL-2427', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Enviado',
    fechaCreacion: '2026-07-26 16:20', fechaActualizacion: '2026-07-26 20:40',
    piezas: [
      { code: 'BC-118', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'LT-334', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'AC-201', qtySolicitada: 1, qtySurtida: 1 },
    ],
    pedidoOrigen: '1064806', parcial: false,
    embarqueId: '88739', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'MPENICHE07',
    noPapeleta: '420545', packingList: false,
    fechaArribo: '2026-07-28 16:20',
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2428: Entrante Manual Surtido Parcial
  {
    id: 'PET-029', solicitudId: 'SOL-9006', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Surtido',
    fechaCreacion: '2026-07-27 15:20', fechaActualizacion: '2026-07-27 18:38',
    piezas: [
      { code: 'LT-334', qtySolicitada: 6, qtySurtida: 6 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 4 },
    ],
    pedidoOrigen: '', parcial: true,
    autorizacionToken: 'PIN-1444',
    usuarioCreador: 'MPENICHE07',
    noPapeleta: '421295', packingList: false,
    cajasTotal: 3, cajasRecibidas: 0,
  },
  // SOL-2429: Saliente Automático Surtido
  {
    id: 'PET-030', solicitudId: 'SOL-2429', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Adolf Horn', status: 'Surtido',
    fechaCreacion: '2026-07-28 14:40', fechaActualizacion: '2026-07-28 17:27',
    piezas: [
      { code: 'BP-001', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064886', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
    noPapeleta: '422045', packingList: true,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2430: Entrante Automático Pendiente
  {
    id: 'PET-031', solicitudId: 'SOL-9007', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-07-14 11:10', fechaActualizacion: '2026-07-14 11:10',
    piezas: [
      { code: 'XX-999', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064958', parcial: false,
    usuarioCreador: 'PLOPEZ_ZAP',
    noPapeleta: '422795', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2431: Saliente Manual Entregado
  {
    id: 'PET-032', solicitudId: 'SOL-2431', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Belisario Domínguez', status: 'Entregado',
    fechaCreacion: '2026-07-15 11:05', fechaActualizacion: '2026-07-15 14:29',
    piezas: [
      { code: 'BT-055', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064891', parcial: false,
    embarqueId: '88694', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'NTORRES_PERI',
    noPapeleta: '423545', packingList: true,
    fechaArribo: '2026-07-17 11:05',
    cajasTotal: 2, cajasRecibidas: 2,
  },
  // SOL-2432: Entrante Automático Pendiente
  {
    id: 'PET-033', solicitudId: 'SOL-9007', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Colón', status: 'Pendiente',
    fechaCreacion: '2026-07-16 18:15', fechaActualizacion: '2026-07-16 18:15',
    piezas: [
      { code: 'XX-999', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'FT-223', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064973', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
    noPapeleta: '424204', packingList: true,
    cajasTotal: 4, cajasRecibidas: 0,
  },
  // SOL-2433: Saliente Manual Entregado
  {
    id: 'PET-034', solicitudId: 'SOL-2433', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Entregado',
    fechaCreacion: '2026-07-17 07:50', fechaActualizacion: '2026-07-17 09:31',
    piezas: [
      { code: 'BP-001', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064803', parcial: false,
    embarqueId: '88575', metodoEnvio: 'Estafeta',
    usuarioCreador: 'HDIAZ_FED',
    noPapeleta: '424954', packingList: false,
    fechaArribo: '2026-07-19 07:50',
    cajasTotal: 1, cajasRecibidas: 1,
  },
  // SOL-2434: Entrante Automático Pendiente
  {
    id: 'PET-035', solicitudId: 'SOL-9008', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-18 09:40', fechaActualizacion: '2026-07-18 09:40',
    piezas: [
      { code: 'AM-445', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064755', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
    noPapeleta: '425704', packingList: true,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2435: Saliente Automático Entregado
  {
    id: 'PET-036', solicitudId: 'SOL-2435', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Colonia Jalisco', status: 'Entregado',
    fechaCreacion: '2026-07-19 14:20', fechaActualizacion: '2026-07-19 16:49',
    piezas: [
      { code: 'AM-445', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'LT-334', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'BP-001', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064754', parcial: false,
    embarqueId: '88719', metodoEnvio: 'DHL',
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '426454', packingList: true,
    fechaArribo: '2026-07-21 14:20',
    cajasTotal: 3, cajasRecibidas: 3,
  },
  // SOL-2436: Entrante Manual Enviado
  {
    id: 'PET-037', solicitudId: 'SOL-9008', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Forum Tlaquepaque', status: 'Enviado',
    fechaCreacion: '2026-07-20 19:20', fechaActualizacion: '2026-07-20 20:11',
    piezas: [
      { code: 'BC-118', qtySolicitada: 6, qtySurtida: 6 },
      { code: 'RD-772', qtySolicitada: 1, qtySurtida: 1 },
    ],
    pedidoOrigen: '', parcial: false,
    embarqueId: '88654', metodoEnvio: 'Estafeta',
    autorizacionToken: 'PIN-1555',
    usuarioCreador: 'AMORALES03',
    noPapeleta: '427204', packingList: true,
    fechaArribo: '2026-07-22 19:20',
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2437: Saliente Automático Surtido Parcial
  {
    id: 'PET-038', solicitudId: 'SOL-2437', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Central Camionera', status: 'Surtido',
    fechaCreacion: '2026-07-21 14:50', fechaActualizacion: '2026-07-21 15:18',
    piezas: [
      { code: 'AC-201', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'FT-223', qtySolicitada: 3, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064957', parcial: true,
    usuarioCreador: 'NTORRES_PERI',
    noPapeleta: '427863', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2438: Entrante Manual Enviado
  {
    id: 'PET-039', solicitudId: 'SOL-9009', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Adolf Horn', status: 'Enviado',
    fechaCreacion: '2026-07-22 10:55', fechaActualizacion: '2026-07-22 11:12',
    piezas: [
      { code: 'RD-772', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'BC-118', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064824', parcial: false,
    embarqueId: '88623', metodoEnvio: 'Paquetexpress',
    usuarioCreador: 'PLOPEZ_ZAP',
    noPapeleta: '428613', packingList: true,
    fechaArribo: '2026-07-24 10:55',
    cajasTotal: 3, cajasRecibidas: 2,
  },
  // SOL-2439: Saliente Automático Surtido
  {
    id: 'PET-040', solicitudId: 'SOL-2439', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Surtido',
    fechaCreacion: '2026-07-23 19:45', fechaActualizacion: '2026-07-23 21:21',
    piezas: [
      { code: 'BC-118', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064989', parcial: false,
    usuarioCreador: 'DSOTO_PEL',
    noPapeleta: '429363', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2440: Entrante Automático Surtido
  {
    id: 'PET-041', solicitudId: 'SOL-9009', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Belisario Domínguez', status: 'Surtido',
    fechaCreacion: '2026-07-24 14:40', fechaActualizacion: '2026-07-24 18:35',
    piezas: [
      { code: 'BT-055', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064956', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
    noPapeleta: '430113', packingList: true,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2441: Saliente Manual Surtido
  {
    id: 'PET-042', solicitudId: 'SOL-2441', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Surtido',
    fechaCreacion: '2026-07-25 19:15', fechaActualizacion: '2026-07-26 00:01',
    piezas: [
      { code: 'BT-055', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064857', parcial: false,
    usuarioCreador: 'HDIAZ_FED',
    noPapeleta: '430863', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2442: Entrante Automático Enviado
  {
    id: 'PET-043', solicitudId: 'SOL-9009', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Enviado',
    fechaCreacion: '2026-07-26 07:25', fechaActualizacion: '2026-07-26 08:03',
    piezas: [
      { code: 'BC-118', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064953', parcial: false,
    embarqueId: '88840', metodoEnvio: 'DHL',
    usuarioCreador: 'PLOPEZ_ZAP',
    noPapeleta: '431522', packingList: false,
    fechaArribo: '2026-07-28 07:25',
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2443: Saliente Manual Enviado
  {
    id: 'PET-044', solicitudId: 'SOL-2443', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Enviado',
    fechaCreacion: '2026-07-27 11:50', fechaActualizacion: '2026-07-27 16:26',
    piezas: [
      { code: 'LT-334', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'AM-445', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'BT-055', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '', parcial: false,
    embarqueId: '88852', metodoEnvio: 'DHL',
    autorizacionToken: 'PIN-1666',
    usuarioCreador: 'HDIAZ_FED',
    noPapeleta: '432272', packingList: false,
    fechaArribo: '2026-07-29 11:50',
    cajasTotal: 4, cajasRecibidas: 2,
  },
  // SOL-2444: Entrante Automático Recibido Parcial
  {
    id: 'PET-045', solicitudId: 'SOL-9010', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Colón', status: 'Recibido',
    fechaCreacion: '2026-07-28 08:15', fechaActualizacion: '2026-07-28 10:41',
    piezas: [
      { code: 'FT-223', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'XX-999', qtySolicitada: 6, qtySurtida: 6 },
      { code: 'BP-001', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064971', parcial: true,
    embarqueId: '88655', metodoEnvio: 'Estafeta',
    usuarioCreador: 'DSOTO_PEL',
    noPapeleta: '433022', packingList: true,
    fechaArribo: '2026-07-30 08:15',
    cajasTotal: 4, cajasRecibidas: 4,
  },
  // SOL-2445: Saliente Automático Entregado
  {
    id: 'PET-046', solicitudId: 'SOL-2445', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Colonia Jalisco', status: 'Entregado',
    fechaCreacion: '2026-07-14 10:50', fechaActualizacion: '2026-07-14 13:36',
    piezas: [
      { code: 'LT-334', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'AC-201', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'XX-999', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064937', parcial: false,
    embarqueId: '88554', metodoEnvio: 'Uber',
    usuarioCreador: 'LGOMEZ_TONA',
    noPapeleta: '433772', packingList: false,
    fechaArribo: '2026-07-16 10:50',
    cajasTotal: 4, cajasRecibidas: 4,
  },
  // SOL-2446: Entrante Manual Recibido
  {
    id: 'PET-047', solicitudId: 'SOL-9010', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Forum Tlaquepaque', status: 'Recibido',
    fechaCreacion: '2026-07-15 19:05', fechaActualizacion: '2026-07-15 21:15',
    piezas: [
      { code: 'XX-999', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064989', parcial: false,
    embarqueId: '88775', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'JMORENO11',
    noPapeleta: '434522', packingList: true,
    fechaArribo: '2026-07-17 19:05',
    cajasTotal: 1, cajasRecibidas: 1,
  },
  // SOL-2447: Saliente Automático Entregado
  {
    id: 'PET-048', solicitudId: 'SOL-2447', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Central Camionera', status: 'Entregado',
    fechaCreacion: '2026-07-16 12:45', fechaActualizacion: '2026-07-16 13:52',
    piezas: [
      { code: 'FT-223', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'AM-445', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064861', parcial: false,
    embarqueId: '88703', metodoEnvio: 'DHL',
    usuarioCreador: 'CVEGA_TLAQ',
    noPapeleta: '435272', packingList: true,
    fechaArribo: '2026-07-18 12:45',
    cajasTotal: 2, cajasRecibidas: 2,
  },
  // SOL-2448: Entrante Manual Surtido
  {
    id: 'PET-049', solicitudId: 'SOL-9011', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Adolf Horn', status: 'Surtido',
    fechaCreacion: '2026-07-17 16:30', fechaActualizacion: '2026-07-17 19:32',
    piezas: [
      { code: 'AC-201', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'AM-445', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064785', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '435931', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2449: Saliente Automático Surtido
  {
    id: 'PET-050', solicitudId: 'SOL-2449', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Surtido',
    fechaCreacion: '2026-07-18 12:00', fechaActualizacion: '2026-07-18 14:54',
    piezas: [
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064701', parcial: false,
    usuarioCreador: 'HDIAZ_FED',
    noPapeleta: '436681', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2450: Entrante Automático Enviado
  {
    id: 'PET-051', solicitudId: 'SOL-9011', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Belisario Domínguez', status: 'Enviado',
    fechaCreacion: '2026-07-19 10:30', fechaActualizacion: '2026-07-19 12:40',
    piezas: [
      { code: 'LT-334', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064996', parcial: false,
    embarqueId: '88812', metodoEnvio: 'DHL',
    usuarioCreador: 'LGOMEZ_TONA',
    noPapeleta: '437431', packingList: true,
    fechaArribo: '2026-07-21 10:30',
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2451: Saliente Manual Enviado
  {
    id: 'PET-052', solicitudId: 'SOL-2451', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Colón', status: 'Enviado',
    fechaCreacion: '2026-07-20 17:40', fechaActualizacion: '2026-07-20 21:01',
    piezas: [
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 6 },
      { code: 'XX-999', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '', parcial: false,
    embarqueId: '88743', metodoEnvio: 'BlueGo',
    autorizacionToken: 'PIN-1777',
    usuarioCreador: 'RGARCIA_PERI',
    noPapeleta: '438181', packingList: false,
    fechaArribo: '2026-07-22 17:40',
    cajasTotal: 3, cajasRecibidas: 0,
  },
  // SOL-2452: Entrante Automático Recibido
  {
    id: 'PET-053', solicitudId: 'SOL-9011', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Colonia Jalisco', status: 'Recibido',
    fechaCreacion: '2026-07-21 09:45', fechaActualizacion: '2026-07-21 12:19',
    piezas: [
      { code: 'AM-445', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'BC-118', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'LT-334', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064716', parcial: false,
    embarqueId: '88733', metodoEnvio: 'DHL',
    usuarioCreador: 'JMORENO11',
    noPapeleta: '438931', packingList: true,
    fechaArribo: '2026-07-23 09:45',
    cajasTotal: 2, cajasRecibidas: 2,
  },
  // SOL-2453: Saliente Manual Surtido Parcial
  {
    id: 'PET-054', solicitudId: 'SOL-2453', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Surtido',
    fechaCreacion: '2026-07-22 13:15', fechaActualizacion: '2026-07-22 15:43',
    piezas: [
      { code: 'BT-055', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'XX-999', qtySolicitada: 3, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064734', parcial: true,
    usuarioCreador: 'MPENICHE07',
    noPapeleta: '439590', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2454: Entrante Automático Surtido
  {
    id: 'PET-055', solicitudId: 'SOL-9012', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Surtido',
    fechaCreacion: '2026-07-23 14:25', fechaActualizacion: '2026-07-23 17:25',
    piezas: [
      { code: 'RD-772', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064741', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '440340', packingList: false,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2455: Saliente Automático Entregado
  {
    id: 'PET-056', solicitudId: 'SOL-2455', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Entregado',
    fechaCreacion: '2026-07-24 12:50', fechaActualizacion: '2026-07-24 15:20',
    piezas: [
      { code: 'XX-999', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064818', parcial: false,
    embarqueId: '88807', metodoEnvio: 'Uber',
    usuarioCreador: 'DSOTO_PEL',
    noPapeleta: '441090', packingList: true,
    fechaArribo: '2026-07-26 12:50',
    cajasTotal: 2, cajasRecibidas: 2,
  },
  // SOL-2456: Entrante Manual Enviado
  {
    id: 'PET-057', solicitudId: 'SOL-9012', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Forum Tlaquepaque', status: 'Enviado',
    fechaCreacion: '2026-07-25 10:55', fechaActualizacion: '2026-07-25 15:01',
    piezas: [
      { code: 'BC-118', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064733', parcial: false,
    embarqueId: '88733', metodoEnvio: 'Estafeta',
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '441840', packingList: true,
    fechaArribo: '2026-07-27 10:55',
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2457: Saliente Automático Surtido
  {
    id: 'PET-058', solicitudId: 'SOL-2457', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Central Camionera', status: 'Surtido',
    fechaCreacion: '2026-07-26 07:45', fechaActualizacion: '2026-07-26 11:40',
    piezas: [
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064931', parcial: false,
    usuarioCreador: 'AMORALES03',
    noPapeleta: '442590', packingList: false,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2458: Entrante Manual Recibido
  {
    id: 'PET-059', solicitudId: 'SOL-9013', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Recibido',
    fechaCreacion: '2026-07-27 06:30', fechaActualizacion: '2026-07-27 06:45',
    piezas: [
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '', parcial: false,
    embarqueId: '88651', metodoEnvio: 'BlueGo',
    autorizacionToken: 'PIN-1888',
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '443249', packingList: true,
    fechaArribo: '2026-07-29 06:30',
    cajasTotal: 1, cajasRecibidas: 1,
  },
  // SOL-2459: Saliente Automático Enviado
  {
    id: 'PET-060', solicitudId: 'SOL-2459', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Adolf Horn', status: 'Enviado',
    fechaCreacion: '2026-07-28 11:20', fechaActualizacion: '2026-07-28 14:11',
    piezas: [
      { code: 'RD-772', qtySolicitada: 1, qtySurtida: 1 },
    ],
    pedidoOrigen: '1064728', parcial: false,
    embarqueId: '88715', metodoEnvio: 'DHL',
    usuarioCreador: 'RGARCIA_PERI',
    noPapeleta: '443999', packingList: true,
    fechaArribo: '2026-07-30 11:20',
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2460: Entrante Automático Recibido Parcial
  {
    id: 'PET-061', solicitudId: 'SOL-9013', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Belisario Domínguez', status: 'Recibido',
    fechaCreacion: '2026-07-14 11:40', fechaActualizacion: '2026-07-14 12:11',
    piezas: [
      { code: 'AC-201', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 4 },
      { code: 'BT-055', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064976', parcial: true,
    embarqueId: '88622', metodoEnvio: 'Estafeta',
    usuarioCreador: 'LGOMEZ_TONA',
    noPapeleta: '444749', packingList: false,
    fechaArribo: '2026-07-16 11:40',
    cajasTotal: 4, cajasRecibidas: 4,
  },
  // SOL-2461: Saliente Manual Surtido
  {
    id: 'PET-062', solicitudId: 'SOL-2461', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Colón', status: 'Surtido',
    fechaCreacion: '2026-07-15 10:05', fechaActualizacion: '2026-07-15 11:28',
    piezas: [
      { code: 'FT-223', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064851', parcial: false,
    usuarioCreador: 'AMORALES03',
    noPapeleta: '445499', packingList: true,
    cajasTotal: 1, cajasRecibidas: 0,
  },
  // SOL-2462: Entrante Automático Recibido
  {
    id: 'PET-063', solicitudId: 'SOL-9014', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Colonia Jalisco', status: 'Recibido',
    fechaCreacion: '2026-07-16 18:05', fechaActualizacion: '2026-07-16 22:37',
    piezas: [
      { code: 'BP-001', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'RD-772', qtySolicitada: 1, qtySurtida: 1 },
    ],
    pedidoOrigen: '1064927', parcial: false,
    embarqueId: '88887', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'JMORENO11',
    noPapeleta: '446249', packingList: true,
    fechaArribo: '2026-07-18 18:05',
    cajasTotal: 1, cajasRecibidas: 1,
  },
  // SOL-2463: Saliente Manual Entregado
  {
    id: 'PET-064', solicitudId: 'SOL-2463', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Entregado',
    fechaCreacion: '2026-07-17 16:45', fechaActualizacion: '2026-07-17 17:27',
    piezas: [
      { code: 'BT-055', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'AC-201', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064783', parcial: false,
    embarqueId: '88805', metodoEnvio: 'Paquetexpress',
    usuarioCreador: 'DSOTO_PEL',
    noPapeleta: '446999', packingList: false,
    fechaArribo: '2026-07-19 16:45',
    cajasTotal: 3, cajasRecibidas: 3,
  },
  // SOL-2464: Entrante CEDIS Reabasto Pendiente
  {
    id: 'PET-065', solicitudId: 'SOL-9014', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Pendiente',
    fechaCreacion: '2026-07-18 08:05', fechaActualizacion: '2026-07-18 08:05',
    piezas: [
      { code: 'RD-772', qtySolicitada: 7, qtySurtida: 0 },
      { code: 'AC-201', qtySolicitada: 6, qtySurtida: 0 },
      { code: 'XX-999', qtySolicitada: 6, qtySurtida: 0 },
    ],
    pedidoOrigen: '', parcial: false,
    cajas: 5,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '447658', packingList: false,
    cajasTotal: 5, cajasRecibidas: 0,
  },
  // SOL-2465: Entrante CEDIS Reabasto Documentado Parcial
  {
    id: 'PET-066', solicitudId: 'SOL-9014', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Documentado',
    fechaCreacion: '2026-07-19 08:55', fechaActualizacion: '2026-07-19 11:18',
    piezas: [
      { code: 'FT-223', qtySolicitada: 4, qtySurtida: 1 },
      { code: 'BC-118', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '', parcial: true,
    cajas: 9,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '448408', packingList: false,
    cajasTotal: 9, cajasRecibidas: 0,
  },
  // SOL-2466: Entrante CEDIS Reabasto Enviado Parcial
  {
    id: 'PET-067', solicitudId: 'SOL-9015', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Enviado',
    fechaCreacion: '2026-07-20 06:30', fechaActualizacion: '2026-07-20 09:58',
    piezas: [
      { code: 'LT-334', qtySolicitada: 2, qtySurtida: 1 },
      { code: 'BC-118', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '', parcial: true,
    embarqueId: '88810', metodoEnvio: 'BlueGo',
    cajas: 10,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '449158', packingList: false,
    fechaArribo: '2026-07-22 06:30',
    cajasTotal: 10, cajasRecibidas: 5,
  },
  // SOL-2467: Entrante CEDIS Reabasto Recibido Parcial
  {
    id: 'PET-068', solicitudId: 'SOL-9015', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Recibido',
    fechaCreacion: '2026-07-21 08:30', fechaActualizacion: '2026-07-21 11:20',
    piezas: [
      { code: 'LT-334', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'XX-999', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'BC-118', qtySolicitada: 3, qtySurtida: 0 },
    ],
    pedidoOrigen: '', parcial: true,
    embarqueId: '88811', metodoEnvio: 'Estafeta',
    cajas: 5,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '449908', packingList: true,
    fechaArribo: '2026-07-23 08:30',
    cajasTotal: 5, cajasRecibidas: 5,
  },
  // SOL-2468: Entrante CEDIS Reabasto Pendiente
  {
    id: 'PET-069', solicitudId: 'SOL-9016', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Pendiente',
    fechaCreacion: '2026-07-22 14:45', fechaActualizacion: '2026-07-22 14:45',
    piezas: [
      { code: 'AM-445', qtySolicitada: 8, qtySurtida: 0 },
      { code: 'RD-772', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '', parcial: false,
    cajas: 12,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '450658', packingList: false,
    cajasTotal: 12, cajasRecibidas: 0,
  },
  // SOL-2469: Entrante CEDIS Reabasto Documentado
  {
    id: 'PET-070', solicitudId: 'SOL-9016', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Documentado',
    fechaCreacion: '2026-07-23 17:25', fechaActualizacion: '2026-07-23 18:01',
    piezas: [
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'AC-201', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '', parcial: false,
    cajas: 6,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '451317', packingList: false,
    cajasTotal: 6, cajasRecibidas: 0,
  },
  // SOL-2470: Entrante CEDIS Reabasto Enviado Parcial
  {
    id: 'PET-071', solicitudId: 'SOL-9016', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Enviado',
    fechaCreacion: '2026-07-24 14:30', fechaActualizacion: '2026-07-24 16:24',
    piezas: [
      { code: 'BC-118', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'RD-772', qtySolicitada: 7, qtySurtida: 7 },
      { code: 'AC-201', qtySolicitada: 4, qtySurtida: 1 },
    ],
    pedidoOrigen: '', parcial: true,
    embarqueId: '88711', metodoEnvio: 'Uber',
    cajas: 6,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '452067', packingList: false,
    fechaArribo: '2026-07-26 14:30',
    cajasTotal: 6, cajasRecibidas: 4,
  },
  // SOL-2471: Entrante CEDIS Reabasto Recibido
  {
    id: 'PET-072', solicitudId: 'SOL-9017', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Recibido',
    fechaCreacion: '2026-07-25 15:20', fechaActualizacion: '2026-07-25 18:39',
    piezas: [
      { code: 'BC-118', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'RD-772', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '', parcial: false,
    embarqueId: '88770', metodoEnvio: 'DHL',
    cajas: 11,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '452817', packingList: false,
    fechaArribo: '2026-07-27 15:20',
    cajasTotal: 11, cajasRecibidas: 11,
  },
  // SOL-2472: Entrante CEDIS Reabasto Pendiente
  {
    id: 'PET-073', solicitudId: 'SOL-9017', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Pendiente',
    fechaCreacion: '2026-07-26 18:25', fechaActualizacion: '2026-07-26 18:25',
    piezas: [
      { code: 'BP-001', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'LT-334', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '', parcial: false,
    cajas: 9,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '453567', packingList: true,
    cajasTotal: 9, cajasRecibidas: 0,
  },
  // SOL-2473: Entrante CEDIS Reabasto Documentado Parcial
  {
    id: 'PET-074', solicitudId: 'SOL-9018', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Documentado',
    fechaCreacion: '2026-07-27 10:55', fechaActualizacion: '2026-07-27 11:33',
    piezas: [
      { code: 'RD-772', qtySolicitada: 7, qtySurtida: 7 },
      { code: 'XX-999', qtySolicitada: 7, qtySurtida: 6 },
      { code: 'AM-445', qtySolicitada: 7, qtySurtida: 0 },
    ],
    pedidoOrigen: '', parcial: true,
    cajas: 10,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '454317', packingList: false,
    cajasTotal: 10, cajasRecibidas: 0,
  },
  // SOL-2474: Entrante CEDIS Urgencia Enviado
  {
    id: 'PET-075', solicitudId: 'SOL-9018', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Urgencia',
    sucursalContraparte: 'CEDIS', status: 'Enviado',
    fechaCreacion: '2026-07-28 16:25', fechaActualizacion: '2026-07-28 19:11',
    piezas: [
      { code: 'LT-334', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'BP-001', qtySolicitada: 8, qtySurtida: 8 },
      { code: 'RD-772', qtySolicitada: 8, qtySurtida: 8 },
    ],
    pedidoOrigen: '1064944', parcial: false,
    embarqueId: '88855', metodoEnvio: 'Estafeta',
    usuarioCreador: 'PLOPEZ_ZAP',
    noPapeleta: '454976', packingList: true,
    fechaArribo: '2026-07-30 16:25',
    cajasTotal: 5, cajasRecibidas: 4,
  },
  // SOL-2475: Entrante CEDIS Reabasto Recibido
  {
    id: 'PET-076', solicitudId: 'SOL-9019', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Recibido',
    fechaCreacion: '2026-07-14 06:40', fechaActualizacion: '2026-07-14 08:41',
    piezas: [
      { code: 'RD-772', qtySolicitada: 7, qtySurtida: 7 },
    ],
    pedidoOrigen: '', parcial: false,
    embarqueId: '88731', metodoEnvio: 'Estafeta',
    cajas: 8,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '455726', packingList: false,
    fechaArribo: '2026-07-16 06:40',
    cajasTotal: 8, cajasRecibidas: 8,
  },
  // SOL-2476: Entrante CEDIS Urgencia Pendiente
  {
    id: 'PET-077', solicitudId: 'SOL-9019', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Urgencia',
    sucursalContraparte: 'CEDIS', status: 'Pendiente',
    fechaCreacion: '2026-07-15 13:30', fechaActualizacion: '2026-07-15 13:30',
    piezas: [
      { code: 'LT-334', qtySolicitada: 2, qtySurtida: 0 },
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 0 },
      { code: 'BC-118', qtySolicitada: 1, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064869', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
    noPapeleta: '456476', packingList: true,
    cajasTotal: 2, cajasRecibidas: 0,
  },
  // SOL-2477: Entrante CEDIS Reabasto Documentado Parcial
  {
    id: 'PET-078', solicitudId: 'SOL-9019', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Documentado',
    fechaCreacion: '2026-07-16 13:20', fechaActualizacion: '2026-07-16 13:41',
    piezas: [
      { code: 'XX-999', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'BP-001', qtySolicitada: 8, qtySurtida: 7 },
      { code: 'BC-118', qtySolicitada: 8, qtySurtida: 8 },
    ],
    pedidoOrigen: '', parcial: true,
    cajas: 3,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '457226', packingList: false,
    cajasTotal: 3, cajasRecibidas: 0,
  },
  // SOL-2478: Entrante CEDIS Urgencia Enviado Parcial
  {
    id: 'PET-079', solicitudId: 'SOL-9020', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Urgencia',
    sucursalContraparte: 'CEDIS', status: 'Enviado',
    fechaCreacion: '2026-07-17 07:05', fechaActualizacion: '2026-07-17 11:07',
    piezas: [
      { code: 'BC-118', qtySolicitada: 3, qtySurtida: 1 },
      { code: 'FT-223', qtySolicitada: 4, qtySurtida: 2 },
      { code: 'AM-445', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064721', parcial: true,
    embarqueId: '88740', metodoEnvio: 'Paquetexpress',
    usuarioCreador: 'CVEGA_TLAQ',
    noPapeleta: '457976', packingList: false,
    fechaArribo: '2026-07-19 07:05',
    cajasTotal: 3, cajasRecibidas: 0,
  },
  // SOL-2479: Entrante CEDIS Reabasto Recibido
  {
    id: 'PET-080', solicitudId: 'SOL-9020', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', status: 'Recibido',
    fechaCreacion: '2026-07-18 09:05', fechaActualizacion: '2026-07-18 12:53',
    piezas: [
      { code: 'FT-223', qtySolicitada: 8, qtySurtida: 8 },
    ],
    pedidoOrigen: '', parcial: false,
    embarqueId: '88803', metodoEnvio: 'Paquetexpress',
    cajas: 8,
    usuarioCreador: 'CEDIS_SISTEMA',
    noPapeleta: '458726', packingList: false,
    fechaArribo: '2026-07-20 09:05',
    cajasTotal: 8, cajasRecibidas: 8,
  },
  // ============================================================
  // ESCENARIO CURADO DEL EJERCICIO (Tesistán ↔ Federalismo)
  // Un ejemplo de cada tipo, una solicitud compartida entre peticiones y un
  // manual sin pedido de cliente (con token). Fechas se reubican a la última
  // semana por la IIFE del final. El mismo registro se ve como "Por enviar" en
  // la sucursal origen y "Por recibir" en la destino.
  // ============================================================
  // 1) AUTOMÁTICO con pedido — Tesistán surte para Federalismo (Pendiente).
  {
    id: 'DEMO-EJ-AUTO-1', solicitudId: 'DEMO-S-AUTO', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Pendiente',
    fechaCreacion: '2026-07-03 09:10', fechaActualizacion: '2026-07-03 09:10',
    piezas: [{ code: 'FT-223', qtySolicitada: 5, qtySurtida: 0 }],
    pedidoOrigen: 'P1064772', parcial: false,
    observaciones: 'Petición automática (SMC) por pedido web sin stock local.',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '470301', packingList: false, cajasTotal: 2, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1, resultado: 'vigente',
  },
  // 1b) MANUAL sobre el MISMO pedido (un pedido puede tener automáticas Y manuales).
  {
    id: 'DEMO-EJ-AUTO-1B', solicitudId: 'DEMO-S-AUTO1B', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Pendiente',
    fechaCreacion: '2026-07-03 10:00', fechaActualizacion: '2026-07-03 10:00',
    piezas: [
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: 'P1064772', parcial: false,
    observaciones: 'Traspaso manual adicional del mismo pedido (complementa a la petición automática).',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '470308', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
  // 2) MANUAL con pedido — Tesistán ya envió a Federalismo (Enviado / en camino).
  {
    id: 'DEMO-EJ-MAN-1', solicitudId: 'DEMO-S-MAN', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Enviado',
    fechaCreacion: '2026-07-04 11:20', fechaActualizacion: '2026-07-05 08:30',
    piezas: [{ code: 'AC-201', qtySolicitada: 4, qtySurtida: 4 }],
    pedidoOrigen: 'P1064851', parcial: false,
    embarqueId: '88820', metodoEnvio: 'Transporte Interno',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '470302', packingList: true, cajasTotal: 1, cajasRecibidas: 0,
    fechaArribo: '2026-07-06 10:00',
    flujo: 'Manual', intento: 1,
  },
  // 3) CEDIS ESPECIAL (manual CON pedido) — CEDIS envía a Federalismo (Enviado). Token 0000.
  {
    id: 'DEMO-EJ-CED-1', solicitudId: 'DEMO-S-CED', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Especial',
    sucursalContraparte: 'CEDIS', sucursalOrigen: 'CEDIS', sucursalDestino: 'Federalismo',
    status: 'Enviado',
    fechaCreacion: '2026-07-05 08:00', fechaActualizacion: '2026-07-06 09:15',
    piezas: [{ code: 'FT-223', qtySolicitada: 5, qtySurtida: 5 }],
    pedidoOrigen: 'P1064855', parcial: false,
    autorizacionToken: '0000',
    embarqueId: '88821', metodoEnvio: 'Paquetexpress',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '470304', packingList: true, cajasTotal: 3, cajasRecibidas: 0,
    fechaArribo: '2026-07-07 11:00',
    flujo: 'CEDIS', intento: 1,
  },
  // 4) SOLICITUD COMPARTIDA entre peticiones — un mismo pedido cubierto por dos
  //    peticiones (Tesistán + Adolf Horn) hacia Federalismo. Se ven agrupadas.
  {
    id: 'DEMO-EJ-SH-1', solicitudId: 'DEMO-S-SHARED', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Pendiente',
    fechaCreacion: '2026-07-06 10:00', fechaActualizacion: '2026-07-06 10:00',
    piezas: [{ code: 'BP-001', qtySolicitada: 4, qtySurtida: 0 }],
    pedidoOrigen: 'P1064844', parcial: false,
    observaciones: 'Petición 1 de 2 de la misma solicitud (parte cubierta por Tesistán).',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '470305', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1, resultado: 'vigente',
  },
  {
    id: 'DEMO-EJ-SH-2', solicitudId: 'DEMO-S-SHARED', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Adolf Horn', sucursalOrigen: 'Adolf Horn', sucursalDestino: 'Federalismo',
    status: 'Pendiente',
    fechaCreacion: '2026-07-06 10:00', fechaActualizacion: '2026-07-06 10:00',
    piezas: [{ code: 'RD-772', qtySolicitada: 3, qtySurtida: 0 }],
    pedidoOrigen: 'P1064844', parcial: false,
    observaciones: 'Petición 2 de 2 de la misma solicitud (parte cubierta por Adolf Horn).',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '470306', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1, resultado: 'vigente',
  },
  // 5) MANUAL SIN pedido de cliente — requiere token de autorización (0000).
  {
    id: 'DEMO-EJ-MANSP-1', solicitudId: 'DEMO-S-MANSP', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Pendiente',
    fechaCreacion: '2026-07-07 12:30', fechaActualizacion: '2026-07-07 12:30',
    piezas: [{ code: 'LT-334', qtySolicitada: 2, qtySurtida: 0 }],
    pedidoOrigen: '', parcial: false,
    autorizacionToken: '0000',
    observaciones: 'Traspaso manual sin pedido de cliente (autorizado con token).',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '470307', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
  // 6) ENVÍO a CEDIS (devolución) — Federalismo envía a CEDIS (Pendiente).
  {
    id: 'DEMO-EJ-DEV-1', solicitudId: 'DEMO-S-DEV', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'CEDIS', sucursalOrigen: 'Federalismo', sucursalDestino: 'CEDIS',
    motivoEnvioCedis: 'Devolución', status: 'Pendiente',
    fechaCreacion: '2026-07-08 10:15', fechaActualizacion: '2026-07-08 10:15',
    piezas: [{ code: 'AM-445', qtySolicitada: 2, qtySurtida: 0 }],
    pedidoOrigen: '', parcial: false,
    observaciones: 'Devolución a CEDIS por exceso de inventario.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '480701', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
  // 7) RECHAZADAS EN SU TOTALIDAD — 3 escenarios (Automático SMC siempre con
  //    pedido; Manual con o sin pedido). Federalismo (solicitante) puede REASIGNAR.
  //    (Aparecen con el filtro "Cancelado" / chip "Ver rechazados".)
  // 7a) Automático SMC (siempre con pedido).
  {
    id: 'DEMO-EJ-RECH-1', solicitudId: 'DEMO-S-RECH', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Cancelado', resultado: 'rechazada', motivoRechazo: 'Sin existencia en la sucursal',
    fechaCreacion: '2026-07-06 09:30', fechaActualizacion: '2026-07-06 11:00',
    piezas: [{ code: 'BC-118', qtySolicitada: 5, qtySurtida: 0 }],
    pedidoOrigen: 'P1064772', parcial: false,
    observaciones: 'Automático SMC rechazado en su totalidad (siempre lleva pedido).',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '470309', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1,
  },
  // 7b) Manual CON pedido.
  {
    id: 'DEMO-EJ-RECH-2', solicitudId: 'DEMO-S-RECH2', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Cancelado', resultado: 'rechazada', motivoRechazo: 'Mercancía dañada en sucursal',
    fechaCreacion: '2026-07-06 10:10', fechaActualizacion: '2026-07-06 12:00',
    piezas: [{ code: 'LT-334', qtySolicitada: 3, qtySurtida: 0 }],
    pedidoOrigen: 'P1064851', parcial: false,
    observaciones: 'Traspaso manual con pedido, rechazado en su totalidad.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '470312', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
  // 7c) Manual SIN pedido (fue autorizado con token 0000).
  {
    id: 'DEMO-EJ-RECH-3', solicitudId: 'DEMO-S-RECH3', tipo: 'Entrante', categoria: 'Manual',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Cancelado', resultado: 'rechazada', motivoRechazo: 'No autorizado por el donante',
    fechaCreacion: '2026-07-06 11:25', fechaActualizacion: '2026-07-06 13:00',
    piezas: [{ code: 'AM-445', qtySolicitada: 2, qtySurtida: 0 }],
    pedidoOrigen: '', parcial: false, autorizacionToken: '0000',
    observaciones: 'Traspaso manual sin pedido (token 0000), rechazado en su totalidad.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '470313', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
  // 8) REVISADA PARCIALMENTE — llegó una parte; Federalismo puede generar una
  //    NUEVA SOLICITUD por el restante. (Visible por defecto: etapa Revisado.)
  {
    id: 'DEMO-EJ-PARC-1', solicitudId: 'DEMO-S-PARC', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Revisado', resultado: 'surtida-parcial',
    fechaCreacion: '2026-07-07 08:20', fechaActualizacion: '2026-07-07 10:40',
    piezas: [{ code: 'XX-999', qtySolicitada: 5, qtySurtida: 2 }],
    pedidoOrigen: 'P1064848', parcial: true,
    observaciones: 'Revisada parcialmente: llegaron 2 de 5; falta el restante.',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '470310', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1,
  },
  // 9) SURTIDA PARCIALMENTE — la sucursal surtió solo una parte; el logístico
  //    decide: generar solicitud por el restante o reasignar a otra sucursal.
  {
    id: 'DEMO-EJ-SPARC-1', solicitudId: 'DEMO-S-SPARC', tipo: 'Entrante', categoria: 'Automático',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Tesistán', sucursalDestino: 'Federalismo',
    status: 'Surtido', resultado: 'surtida-parcial',
    fechaCreacion: '2026-07-07 09:00', fechaActualizacion: '2026-07-07 09:35',
    piezas: [{ code: 'AM-445', qtySolicitada: 6, qtySurtida: 2 }],
    pedidoOrigen: 'P1064847', parcial: true,
    observaciones: 'Surtida parcialmente: se surtieron 2 de 6; falta el restante.',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '470311', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1,
  },
  // 10) CEDIS URGENCIA UNIFICADA — CEDIS decidió unificar esta urgencia dentro de
  //     un traspaso de REABASTO. Pasa a Finalizadas con estado "Unificada".
  {
    id: 'DEMO-EJ-UNI-1', solicitudId: 'DEMO-S-UNI', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Especial',
    sucursalContraparte: 'CEDIS', sucursalOrigen: 'CEDIS', sucursalDestino: 'Federalismo',
    status: 'Entregado', resultado: 'unificada', unificadaEnTraspaso: 'DEMO-EJ-REAB-1',
    fechaCreacion: '2026-07-05 09:00', fechaActualizacion: '2026-07-06 09:00',
    piezas: [{ code: 'BT-055', qtySolicitada: 2, qtySurtida: 2 }],
    pedidoOrigen: 'P1064855', parcial: false, autorizacionToken: '0000',
    observaciones: 'Urgencia unificada por CEDIS dentro de un traspaso de reabasto.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '470314', packingList: false, cajasTotal: 2, cajasRecibidas: 0,
    flujo: 'CEDIS', intento: 1,
  },
  // 11) TRASPASO DE REABASTO (lo genera CEDIS solo; la sucursal no hace nada).
  //     Recepción CIEGA. Trae mercancía unificada de una urgencia con pedido:
  //     por eso el tipo se muestra como "Reabasto/unificado".
  {
    id: 'DEMO-EJ-REAB-1', solicitudId: 'DEMO-S-REAB', tipo: 'Entrante', categoria: 'CEDIS', subtipoCedis: 'Reabasto',
    sucursalContraparte: 'CEDIS', sucursalOrigen: 'CEDIS', sucursalDestino: 'Federalismo',
    status: 'Enviado',
    fechaCreacion: '2026-07-06 07:30', fechaActualizacion: '2026-07-06 08:00',
    piezas: [
      { code: 'BT-055', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'AC-201', qtySolicitada: 8, qtySurtida: 8 },
    ],
    pedidoOrigen: '', parcial: false,
    reabastoUnifica: [{ pedido: 'P1064855', peticionId: 'DEMO-EJ-UNI-1' }],
    observaciones: 'Reabasto generado por CEDIS. Incluye mercancía unificada de una urgencia con pedido.',
    usuarioCreador: 'SISTEMA_CEDIS',
    noPapeleta: '470315', packingList: true, cajasTotal: 4, cajasRecibidas: 0,
    fechaArribo: '2026-07-07 12:00',
    flujo: 'CEDIS', intento: 1,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // POR ENVIAR (Saliente) — Federalismo es el ORIGEN (dona/surte/envía).
  // Cubre todos los escenarios: Automático SMC, Manual con/sin pedido, y envío a
  // CEDIS (Devolución/Garantía), en distintas etapas del pipeline.
  // ══════════════════════════════════════════════════════════════════════════

  // S1) Automático SMC (con pedido) — Sin surtir (Pendiente). Federalismo debe surtir a Tesistán.
  {
    id: 'DEMO-EJ-SAL-A1', solicitudId: 'DEMO-S-SALA1', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Federalismo', sucursalDestino: 'Tesistán',
    status: 'Pendiente',
    fechaCreacion: '2026-07-03 09:10', fechaActualizacion: '2026-07-03 09:10',
    piezas: [{ code: 'BP-001', qtySolicitada: 4, qtySurtida: 0 }],
    pedidoOrigen: 'P1064834', parcial: false,
    observaciones: 'Automático SMC: Federalismo debe surtir a Tesistán por un pedido de Tesistán.',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '471001', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1, resultado: 'vigente',
  },
  // S2) Automático SMC (con pedido) — Surtido (por revisar).
  {
    id: 'DEMO-EJ-SAL-A2', solicitudId: 'DEMO-S-SALA2', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Adolf Horn', sucursalOrigen: 'Federalismo', sucursalDestino: 'Adolf Horn',
    status: 'Surtido',
    fechaCreacion: '2026-07-04 10:00', fechaActualizacion: '2026-07-04 11:30',
    piezas: [{ code: 'AC-201', qtySolicitada: 3, qtySurtida: 3 }],
    pedidoOrigen: 'P1064838', parcial: false,
    observaciones: 'Automático SMC surtido por Federalismo, pendiente de revisión.',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '471002', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1, resultado: 'surtida',
  },
  // S3) Automático SMC (con pedido) — Enviado (en tránsito al destino).
  {
    id: 'DEMO-EJ-SAL-A3', solicitudId: 'DEMO-S-SALA3', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Federalismo', sucursalDestino: 'Tesistán',
    status: 'Enviado',
    fechaCreacion: '2026-07-04 08:00', fechaActualizacion: '2026-07-05 09:00',
    piezas: [{ code: 'BP-001', qtySolicitada: 2, qtySurtida: 2 }],
    pedidoOrigen: 'P1064847', parcial: false,
    embarqueId: '88840', metodoEnvio: 'Transporte Interno', fechaArribo: '2026-07-06 10:00',
    observaciones: 'Automático SMC enviado por Federalismo, en tránsito a Tesistán.',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '471003', packingList: true, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1, resultado: 'enviada',
  },
  // S4) Automático SMC (con pedido) — Surtido PARCIAL (Federalismo solo pudo surtir una parte).
  {
    id: 'DEMO-EJ-SAL-A4', solicitudId: 'DEMO-S-SALA4', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Colón', sucursalOrigen: 'Federalismo', sucursalDestino: 'Colón',
    status: 'Surtido', resultado: 'surtida-parcial',
    fechaCreacion: '2026-07-05 12:00', fechaActualizacion: '2026-07-05 12:40',
    piezas: [{ code: 'FT-223', qtySolicitada: 4, qtySurtida: 2 }],
    pedidoOrigen: 'P1064848', parcial: true,
    observaciones: 'Surtido parcial: Federalismo surtió 2 de 4; el resto lo recalcula SMC.',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '471004', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Automatico', intento: 1,
  },
  // S5) Automático SMC (con pedido) — Entregado (Finalizado).
  {
    id: 'DEMO-EJ-SAL-A5', solicitudId: 'DEMO-S-SALA5', tipo: 'Saliente', categoria: 'Automático',
    sucursalContraparte: 'Adolf Horn', sucursalOrigen: 'Federalismo', sucursalDestino: 'Adolf Horn',
    status: 'Entregado',
    fechaCreacion: '2026-07-02 09:00', fechaActualizacion: '2026-07-03 15:00',
    piezas: [{ code: 'AM-445', qtySolicitada: 3, qtySurtida: 3 }],
    pedidoOrigen: 'P1064853', parcial: false,
    embarqueId: '88841', metodoEnvio: 'BlueGo', fechaArribo: '2026-07-03 14:00',
    observaciones: 'Automático SMC entregado y finalizado (el destino dio entrada).',
    usuarioCreador: 'SISTEMA_SMC',
    noPapeleta: '471005', packingList: true, cajasTotal: 1, cajasRecibidas: 1,
    flujo: 'Automatico', intento: 1, resultado: 'recibida',
  },
  // S6) Manual CON pedido — Revisado (listo para embarcar).
  {
    id: 'DEMO-EJ-SAL-M1', solicitudId: 'DEMO-S-SALM1', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Federalismo', sucursalDestino: 'Tesistán',
    status: 'Revisado',
    fechaCreacion: '2026-07-05 08:30', fechaActualizacion: '2026-07-05 10:10',
    piezas: [{ code: 'XX-999', qtySolicitada: 5, qtySurtida: 5 }],
    pedidoOrigen: 'P1064851', parcial: false,
    observaciones: 'Traspaso manual con pedido, revisado y listo para envío.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '471006', packingList: true, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1, resultado: 'revisada',
  },
  // S7) Manual SIN pedido — Sin surtir (autorizado con token 0000).
  {
    id: 'DEMO-EJ-SAL-M2', solicitudId: 'DEMO-S-SALM2', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Adolf Horn', sucursalOrigen: 'Federalismo', sucursalDestino: 'Adolf Horn',
    status: 'Pendiente',
    fechaCreacion: '2026-07-06 11:15', fechaActualizacion: '2026-07-06 11:15',
    piezas: [{ code: 'LT-334', qtySolicitada: 2, qtySurtida: 0 }],
    pedidoOrigen: '', parcial: false, autorizacionToken: '0000',
    observaciones: 'Traspaso manual sin pedido (token 0000), pendiente de surtir.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '471007', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
  // S8) Manual SIN pedido — Entregado (Finalizado).
  {
    id: 'DEMO-EJ-SAL-M3', solicitudId: 'DEMO-S-SALM3', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Colón', sucursalOrigen: 'Federalismo', sucursalDestino: 'Colón',
    status: 'Entregado',
    fechaCreacion: '2026-07-01 10:00', fechaActualizacion: '2026-07-02 12:00',
    piezas: [{ code: 'BC-118', qtySolicitada: 3, qtySurtida: 3 }],
    pedidoOrigen: '', parcial: false, autorizacionToken: '0000',
    observaciones: 'Traspaso manual sin pedido, entregado y finalizado.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '471008', packingList: true, cajasTotal: 1, cajasRecibidas: 1,
    flujo: 'Manual', intento: 1, resultado: 'recibida',
  },
  // S9) Manual CON pedido — Cancelado/rechazado (Federalismo no pudo surtir).
  {
    id: 'DEMO-EJ-SAL-M4', solicitudId: 'DEMO-S-SALM4', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'Tesistán', sucursalOrigen: 'Federalismo', sucursalDestino: 'Tesistán',
    status: 'Cancelado', resultado: 'rechazada', motivoRechazo: 'Sin existencia disponible en Federalismo',
    fechaCreacion: '2026-07-06 09:00', fechaActualizacion: '2026-07-06 10:30',
    piezas: [{ code: 'RD-772', qtySolicitada: 2, qtySurtida: 0 }],
    pedidoOrigen: 'P1064844', parcial: false,
    observaciones: 'Traspaso manual con pedido, rechazado por Federalismo (sin existencia).',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '471009', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
  // S10) Envío a CEDIS — GARANTÍA (Surtido).
  {
    id: 'DEMO-EJ-SAL-GAR-1', solicitudId: 'DEMO-S-SALGAR', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'CEDIS', sucursalOrigen: 'Federalismo', sucursalDestino: 'CEDIS',
    motivoEnvioCedis: 'Garantía', status: 'Surtido',
    fechaCreacion: '2026-07-07 09:20', fechaActualizacion: '2026-07-07 10:00',
    piezas: [{ code: 'RD-772', qtySolicitada: 1, qtySurtida: 1 }],
    pedidoOrigen: '', parcial: false,
    observaciones: 'Envío a CEDIS por garantía (pieza defectuosa), surtido.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '480702', packingList: false, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
  // S11) Envío a CEDIS — DEVOLUCIÓN (Enviado, en tránsito a CEDIS).
  {
    id: 'DEMO-EJ-SAL-DEV-2', solicitudId: 'DEMO-S-SALDEV2', tipo: 'Saliente', categoria: 'Manual',
    sucursalContraparte: 'CEDIS', sucursalOrigen: 'Federalismo', sucursalDestino: 'CEDIS',
    motivoEnvioCedis: 'Devolución', status: 'Enviado',
    fechaCreacion: '2026-07-05 09:00', fechaActualizacion: '2026-07-06 08:30',
    piezas: [{ code: 'BT-055', qtySolicitada: 2, qtySurtida: 2 }],
    pedidoOrigen: '', parcial: false,
    embarqueId: '88842', metodoEnvio: 'Transporte Interno', fechaArribo: '2026-07-07 11:00',
    observaciones: 'Devolución a CEDIS enviada, en tránsito.',
    usuarioCreador: 'FEDERALISMO_LOG',
    noPapeleta: '480703', packingList: true, cajasTotal: 1, cajasRecibidas: 0,
    flujo: 'Manual', intento: 1,
  },
];

// Reubica los escenarios DEMO-* al MES EN CURSO para que sean visibles por
// defecto (el filtro por defecto muestra el mes actual). Conserva día y hora.
(() => {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const shift = (f: string) => ym + f.slice(7); // 'YYYY-MM-DD HH:mm' → mes actual
  TRASPASOS_DB.forEach(t => {
    if (!t.id.startsWith('DEMO-')) return;
    t.fechaCreacion = shift(t.fechaCreacion);
    t.fechaActualizacion = shift(t.fechaActualizacion);
    if (t.fechaArribo) t.fechaArribo = shift(t.fechaArribo);
  });
})();

// Limpia el vínculo con pedido en los traspasos LEGACY (no DEMO-) — se ejecuta
// ANTES de normalizar los IDs, mientras aún conservan el prefijo 'DEMO-'. Así
// solo los escenarios curados quedan ligados a un pedido y los resúmenes por
// pedido son limpios (sin peticiones antiguas encimadas).
(() => {
  TRASPASOS_DB.forEach(t => {
    if (!t.id.startsWith('DEMO-EJ-')) t.pedidoOrigen = '';
  });
})();

// ── Normalización de IDs a la convención del proyecto (7 dígitos) ──
// P: pedidos de clientes · T: traspasos (CEDIS reabasto) · TP: peticiones de
// traspaso (auto/semi) · TU: urgencias · TM: manuales · S: solicitudes · EM: embarques.
(() => {
  const pad7 = (n: number) => String(Math.abs(Math.trunc(n)) % 10_000_000).padStart(7, '0');
  const soloDig = (s: string) => Number(s.replace(/\D/g, '')) || 0;
  const solMap = new Map<string, string>();
  const petMap = new Map<string, string>();
  const embMap = new Map<string, string>();
  let solSeq = 1;
  const petSeq: Record<'T' | 'TP' | 'TU' | 'TM', number> = { T: 1, TP: 1, TU: 1, TM: 1 };

  const petPrefix = (t: TraspasoPeticion): 'T' | 'TP' | 'TU' | 'TM' => {
    if (t.categoria === 'Manual') return 'TM';
    if (t.categoria === 'CEDIS') return t.subtipoCedis === 'Urgencia' ? 'TU' : 'T';
    return 'TP';
  };
  const prefijarPedido = (p: string) => (!p || /^P\d/.test(p)) ? p : 'P' + pad7(soloDig(p));
  const mapEmb = (id: string) => embMap.get(id) ?? (() => { const v = 'EM' + pad7(soloDig(id)); embMap.set(id, v); return v; })();

  EMBARQUES_TRASPASO_DB.forEach(e => mapEmb(e.id));
  TRASPASOS_DB.forEach(t => {
    if (!solMap.has(t.solicitudId)) solMap.set(t.solicitudId, 'S' + pad7(solSeq++));
    if (!petMap.has(t.id)) { const pre = petPrefix(t); petMap.set(t.id, pre + pad7(petSeq[pre]++)); }
    if (t.embarqueId) mapEmb(t.embarqueId);
  });
  TRASPASOS_DB.forEach(t => {
    t.id = petMap.get(t.id)!;
    t.solicitudId = solMap.get(t.solicitudId)!;
    t.pedidoOrigen = prefijarPedido(t.pedidoOrigen);
    if (t.embarqueId) t.embarqueId = embMap.get(t.embarqueId) ?? t.embarqueId;
    if (t.peticionAnteriorId) t.peticionAnteriorId = petMap.get(t.peticionAnteriorId) ?? t.peticionAnteriorId;
    if (t.peticionSiguienteId) t.peticionSiguienteId = petMap.get(t.peticionSiguienteId) ?? t.peticionSiguienteId;
    // Unificación de reabasto: remapea los ids cruzados a la convención normalizada.
    if (t.unificadaEnTraspaso) t.unificadaEnTraspaso = petMap.get(t.unificadaEnTraspaso) ?? t.unificadaEnTraspaso;
    if (t.reabastoUnifica) t.reabastoUnifica = t.reabastoUnifica.map(u => ({
      pedido: prefijarPedido(u.pedido),
      peticionId: petMap.get(u.peticionId) ?? u.peticionId,
    }));
  });
  EMBARQUES_TRASPASO_DB.forEach(e => {
    e.id = embMap.get(e.id) ?? e.id;
    e.traspasos = e.traspasos.map(id => petMap.get(id) ?? id);
  });
})();

// ── Identificador de producto: 7 dígitos sin letra ──
// Remapea los códigos SKU (BP-001, …) a códigos numéricos de 7 dígitos y
// actualiza todas las referencias (catálogo, existencias, pedidos, traspasos).
export const PRODUCT_CODE_MAP: Record<string, string> = {};
export function mapProductCode(code: string): string { return PRODUCT_CODE_MAP[code] ?? code; }
(() => {
  let seq = 1_000_001;
  Object.keys(PRODUCT_CATALOG).forEach(old => { PRODUCT_CODE_MAP[old] = String(seq++); });
  const m = (c: string) => PRODUCT_CODE_MAP[c] ?? c;

  // Catálogo: re-key + campo code.
  Object.keys(PRODUCT_CATALOG).forEach(old => {
    const nw = PRODUCT_CODE_MAP[old];
    if (!nw) return;
    const prod = PRODUCT_CATALOG[old];
    prod.code = nw;
    PRODUCT_CATALOG[nw] = prod;
    delete PRODUCT_CATALOG[old];
  });
  // Existencias por sucursal.
  Object.keys(EXISTENCIA_POR_SUCURSAL).forEach(suc => {
    const stock = EXISTENCIA_POR_SUCURSAL[suc];
    const nuevo: Record<string, number> = {};
    Object.keys(stock).forEach(c => { nuevo[m(c)] = stock[c]; });
    EXISTENCIA_POR_SUCURSAL[suc] = nuevo;
  });
  // Existencia CEDIS.
  {
    const nuevo: Record<string, number> = {};
    Object.keys(EXISTENCIA_CEDIS).forEach(c => { nuevo[m(c)] = EXISTENCIA_CEDIS[c]; });
    Object.keys(EXISTENCIA_CEDIS).forEach(c => delete EXISTENCIA_CEDIS[c]);
    Object.assign(EXISTENCIA_CEDIS, nuevo);
  }
  // Partidas de pedidos.
  Object.values(ORDERS_DB).forEach(o => o.partidas.forEach(p => { p.code = m(p.code); }));
  // Piezas de traspasos.
  TRASPASOS_DB.forEach(t => t.piezas.forEach(p => { p.code = m(p.code); }));
  // Productos de alta rotación.
  for (let i = 0; i < PRODUCTOS_ALTA_ROTACION.length; i++) PRODUCTOS_ALTA_ROTACION[i] = m(PRODUCTOS_ALTA_ROTACION[i]);
})();

// ── Tipo de envío por pedido ──
// Spread de los 5 tipos para la demo; "Envío a domicilio/Traspasos" se usa en
// pedidos que efectivamente tienen peticiones de traspaso relacionadas.
// Regla autoritativa: SOLO los pedidos que tienen peticiones de traspaso
// relacionadas son "Envío a domicilio/Traspasos"; el resto recibe otro tipo.
(() => {
  const conTraspaso = new Set(TRASPASOS_DB.map(t => t.pedidoOrigen).filter(Boolean));
  const otros: TipoEnvioPedido[] = ['Envío a domicilio', 'Pickup', 'Envío a domicilio/TLC', 'Envío a domicilio/División de facturas'];
  let i = 0;
  Object.values(ORDERS_DB).forEach(o => {
    const pref = `P${o.id.replace(/\D/g, '').padStart(7, '0')}`;
    o.tipoEnvio = conTraspaso.has(pref) ? 'Envío a domicilio/Traspasos' : otros[i++ % otros.length];
  });
})();

// ── Backfill del modelo de dos lados (origen/destino) ──
// Los registros históricos solo traían `tipo` + `sucursalContraparte` desde la
// perspectiva de la sucursal local. Se derivan origen/destino para que también
// sean visibles (con perspectiva opuesta) al seleccionar la sucursal contraparte.
// Los registros que ya definen origen/destino (escenarios de dos lados) se respetan.
(() => {
  TRASPASOS_DB.forEach(t => {
    if (t.sucursalOrigen && t.sucursalDestino) return;
    // La contraparte legacy que caiga en una sucursal del ejercicio se reubica a
    // una NO-ejercicio (Pelícano) para que el filtro posterior la elimine y no
    // ensucie la vista curada de las 4 sucursales del ejercicio.
    let contra = t.sucursalContraparte;
    if ((SUCURSALES_EJERCICIO as readonly string[]).includes(contra)) contra = 'Pelícano';
    if (t.tipo === 'Entrante') {
      t.sucursalDestino = SUCURSAL_LOCAL;
      t.sucursalOrigen = contra;
    } else {
      t.sucursalOrigen = SUCURSAL_LOCAL;
      t.sucursalDestino = contra;
    }
  });
})();

// ── Restricción del ejercicio: SOLO las 4 sucursales (+ CEDIS) ──
// Elimina cualquier traspaso cuyo origen o destino no sea una de las 4 sucursales
// del ejercicio (o CEDIS). Así toda la data visible en cualquier vista pertenece
// exclusivamente a esas 4 sucursales. Los registros legacy (atribuidos a la
// sucursal local histórica / contrapartes ajenas) quedan fuera.
(() => {
  for (let i = TRASPASOS_DB.length - 1; i >= 0; i--) {
    const t = TRASPASOS_DB[i];
    const ok = !!t.sucursalOrigen && !!t.sucursalDestino
      && SUCURSALES_PERMITIDAS.has(t.sucursalOrigen)
      && SUCURSALES_PERMITIDAS.has(t.sucursalDestino);
    if (!ok) TRASPASOS_DB.splice(i, 1);
  }
  // Limpia referencias colgantes en embarques de traspaso (ids ya eliminados).
  const idsVivos = new Set(TRASPASOS_DB.map(t => t.id));
  for (let i = EMBARQUES_TRASPASO_DB.length - 1; i >= 0; i--) {
    const e = EMBARQUES_TRASPASO_DB[i];
    e.traspasos = e.traspasos.filter(id => idsVivos.has(id));
    if (e.traspasos.length === 0) EMBARQUES_TRASPASO_DB.splice(i, 1);
  }
})();

// ── Fechas del ejercicio ──
// Reubica las fechas de los traspasos a los últimos ~13 días. El rango es más
// amplio que una semana a propósito, para que existan traspasos VENCIDOS
// (≥ N días sin enviarse), con demora y en tiempo, y así demostrar el SLA.
(() => {
  const hoy = new Date();
  const DAY = 86_400_000;
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  TRASPASOS_DB.forEach((t, i) => {
    const f = new Date(hoy.getTime() - (i % 13) * DAY);
    const dia = ymd(f);
    const hhCreacion = (t.fechaCreacion.slice(11) || '09:00').padEnd(5, '0');
    t.fechaCreacion = `${dia} ${hhCreacion}`;
    t.fechaActualizacion = `${dia} ${hhCreacion}`;
    if (t.fechaArribo) {
      const arr = new Date(f.getTime() + DAY);
      t.fechaArribo = `${ymd(arr)} ${(t.fechaArribo.slice(11) || '10:00').padEnd(5, '0')}`;
    }
  });
})();
