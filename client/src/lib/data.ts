// ============================================================
// APYMSA — Módulo de Revisión de Pedidos
// Data Layer: Product catalog, orders database, shipments
// ============================================================

export interface Product {
  code: string;
  name: string;
  category: string;
  img: string | null;
}

export interface OrderPartida {
  code: string;
  qty: number;
}

export type OrderStatus =
  | 'Activo'
  | 'Surtido'
  | 'Revisado'
  | 'Revisado con incidencias'
  | 'Documentado'
  | 'Enviado'
  | 'Facturado'
  | 'Cancelado';

export interface Order {
  id: string;
  clienteId: string;
  cliente: string;
  vendedorId: string;
  vendedor: string;
  plazo: string;
  total: string;
  status: OrderStatus;
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

export type ShipmentStatus = 'Generado' | 'Solicitado' | 'En tránsito' | 'Entregado';

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
  uberData?: UberData;
  blueGoData?: BlueGoData;
}

// ── Product catalog ──────────────────────────────────────────
export const PRODUCT_CATALOG: Record<string, Product> = {
  'BP-001': { code: 'BP-001', name: 'Balata Delantera Toyota Corolla 2018-2022', category: 'Frenos',       img: null },
  'FT-223': { code: 'FT-223', name: 'Filtro de Aceite Honda Civic 1.5T',          category: 'Filtros',      img: null },
  'AM-445': { code: 'AM-445', name: 'Amortiguador Trasero Nissan Sentra 2020',     category: 'Suspensión',   img: null },
  'BC-118': { code: 'BC-118', name: 'Bobina de Encendido VW Jetta 2.5',            category: 'Encendido',    img: null },
  'RD-772': { code: 'RD-772', name: 'Radiador Completo Chevrolet Aveo 1.6',        category: 'Enfriamiento', img: null },
  'XX-999': { code: 'XX-999', name: 'Cinta Aislante Negra 3M',                     category: 'Accesorios',   img: null },
  'LT-334': { code: 'LT-334', name: 'Llanta Michelin 185/65 R15',                  category: 'Llantas',      img: null },
  'AC-201': { code: 'AC-201', name: 'Aceite Motor 5W-30 Castrol 4L',               category: 'Lubricantes',  img: null },
  'BT-055': { code: 'BT-055', name: 'Batería Bosch 12V 60Ah',                      category: 'Eléctrico',    img: null },
};

// ── Orders database (8 real orders from system) ──────────────
export const ORDERS_DB: Record<string, Order> = {
  '1064772': {
    id: '1064772', clienteId: '1', cliente: 'CLIENTE MOSTRADOR',
    vendedorId: '90', vendedor: 'MOSTRADOR PELICANO', plazo: '',
    total: '$1,837.12', status: 'Activo',
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
    id: '1064834', clienteId: '1', cliente: 'CLIENTE MOSTRADOR',
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
    id: '1064838', clienteId: '1', cliente: 'CLIENTE MOSTRADOR',
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
    id: '1064844', clienteId: '713115', cliente: 'CLIENTE MOSTRADOR CONTACT CENTER',
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
    id: '1064847', clienteId: '85622', cliente: 'HUMBERTO NAVA ARIAS',
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
    id: '1064848', clienteId: '85622', cliente: 'HUMBERTO NAVA ARIAS',
    vendedorId: '1786', vendedor: 'Razo Alvarez Luis', plazo: '30 días',
    total: '$919.03', status: 'Activo',
    elaboro: 'Ángel', origen: 'Samsung', observaciones: '',
    fechaCaptura: '2026-04-22 15:12', fechaEntrega: '2026-04-24', horaEntrega: '17:22', horaReparto: '17:00', zona: 'Sur', local: false,
    horaInicioSurtido: '', horaFinSurtido: '',
    partidas: [
      { code: 'FT-223', qty: 4 },
      { code: 'XX-999', qty: 2 },
    ],
  },
  '1064851': {
    id: '1064851', clienteId: '644268', cliente: 'LUCIA GARCIA MORALES',
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
  '1064853': {
    id: '1064853', clienteId: '116127', cliente: 'SERVIELEX',
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
    blueGoData: {
      solicitudId: '1018062', estatusExodus: 'En proceso de entrega',
      tiempoEstimado: '45 min', tiempoTranscurrido: '28 min',
      fechaInicio: '2026-04-22 12:13:25 PM', salidasVehiculosId: '83275',
    },
  },
  {
    id: '88518', paqueteria: 'Estafeta', pedidos: ['1064844'], observaciones: 'mexico',
    status: 'Generado', fecha: '2026-04-22', tipoVehiculo: 'Camión', cajas: 3, peso: 18.0, usuario: 'JMORENO11',
  },
  { id: '88509', paqueteria: 'Transporte Interno', pedidos: ['1064838'], observaciones: 'alonzo', status: 'En tránsito', fecha: '2026-04-22', tipoVehiculo: 'Camioneta', cajas: 5, peso: 28.0, usuario: 'JMORENO11' },
  { id: '88514', paqueteria: 'Transporte Interno', pedidos: ['1064853'], observaciones: 'borjas',  status: 'Entregado',   fecha: '2026-04-22', tipoVehiculo: 'Camión',    cajas: 8, peso: 45.2, usuario: 'JMORENO11' },
];

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
  'Activo':                  { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' },
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
  'Entregado':   { bg: 'rgba(22,163,74,0.12)',   text: '#16a34a', border: 'rgba(22,163,74,0.3)'   },
};
