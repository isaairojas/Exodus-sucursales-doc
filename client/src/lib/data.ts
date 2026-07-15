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
  | 'Creado'
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
  | 'Enviado'
  | 'Recibido'
  | 'Entregado';

export type TraspasoTipo = 'Entrante' | 'Saliente';

// Estatus válidos según el tipo de traspaso, en orden de flujo:
// Entrante: la sucursal donante surte y envía; nosotros damos entrada (Recibido).
// Saliente: nosotros surtimos y enviamos; la sucursal solicitante confirma (Entregado).
export const TRASPASO_STATUS_POR_TIPO: Record<TraspasoTipo, TraspasoStatus[]> = {
  Entrante: ['Pendiente', 'Surtido', 'Enviado', 'Recibido'],
  Saliente: ['Pendiente', 'Surtido', 'Enviado', 'Entregado'],
};

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

export type TraspasoGeneracion = 'Automático' | 'Manual';

export interface TraspasoPeticion {
  id: string;
  solicitudId: string;
  tipo: TraspasoTipo;
  generacion: TraspasoGeneracion;
  sucursalContraparte: string;
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
}

export const SUCURSALES = ['Pelícano', 'Federalismo', 'Tlaquepaque', 'Zapopan', 'Periférico', 'Tonalá'] as const;

export const TRASPASO_STATUS_COLORS: Record<TraspasoStatus, { bg: string; text: string; border: string }> = {
  'Pendiente':  { bg: 'rgba(217,119,6,0.12)',   text: '#d97706', border: 'rgba(217,119,6,0.3)'   },
  'Surtido':    { bg: 'rgba(124,58,237,0.12)',  text: '#7c3aed', border: 'rgba(124,58,237,0.3)'  },
  'Enviado':    { bg: 'rgba(22,163,74,0.12)',   text: '#16a34a', border: 'rgba(22,163,74,0.3)'   },
  'Recibido':   { bg: 'rgba(26,43,107,0.12)',   text: '#1a2b6b', border: 'rgba(26,43,107,0.3)'   },
  'Entregado':  { bg: 'rgba(26,43,107,0.12)',   text: '#1a2b6b', border: 'rgba(26,43,107,0.3)'   },
};

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
  // SOL-2401: Entrante Pendiente
  {
    id: 'PET-001', solicitudId: 'SOL-2401', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-06-29 10:25', fechaActualizacion: '2026-06-29 10:25',
    piezas: [
      { code: 'BP-001', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'FT-223', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064772', parcial: false,
    usuarioCreador: 'JMORENO11',
  },
  // SOL-2401: Entrante Pendiente
  {
    id: 'PET-002', solicitudId: 'SOL-2401', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Tlaquepaque', status: 'Pendiente',
    fechaCreacion: '2026-06-30 10:25', fechaActualizacion: '2026-06-30 10:25',
    piezas: [
      { code: 'AM-445', qtySolicitada: 3, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064847', parcial: false,
    usuarioCreador: 'JMORENO11',
  },
  // SOL-2402: Entrante Surtido
  {
    id: 'PET-003', solicitudId: 'SOL-2402', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Zapopan', status: 'Surtido',
    fechaCreacion: '2026-07-01 08:30', fechaActualizacion: '2026-07-01 09:15',
    piezas: [
      { code: 'BC-118', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'BT-055', qtySolicitada: 1, qtySurtida: 1 },
    ],
    pedidoOrigen: '1064838', parcial: false,
    usuarioCreador: 'AMORALES03',
  },
  // SOL-2403: Entrante Enviado
  {
    id: 'PET-004', solicitudId: 'SOL-2403', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Periférico', status: 'Enviado',
    fechaCreacion: '2026-07-02 16:40', fechaActualizacion: '2026-07-03 08:05',
    piezas: [
      { code: 'RD-772', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'AC-201', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064844', parcial: false,
    embarqueId: '88516', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'AMORALES03',
  },
  // SOL-2404: Entrante Recibido
  {
    id: 'PET-005', solicitudId: 'SOL-2404', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Tonalá', status: 'Recibido',
    fechaCreacion: '2026-07-03 09:00', fechaActualizacion: '2026-07-03 17:30',
    piezas: [
      { code: 'LT-334', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064853', parcial: false,
    embarqueId: '88514', metodoEnvio: 'BlueGo',
    usuarioCreador: 'JMORENO11',
  },
  // SOL-2405: Entrante Pendiente
  {
    id: 'PET-006', solicitudId: 'SOL-2405', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Zapopan', status: 'Pendiente',
    fechaCreacion: '2026-06-29 11:20', fechaActualizacion: '2026-06-29 11:20',
    piezas: [
      { code: 'XX-999', qtySolicitada: 10, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064848', parcial: false,
    usuarioCreador: 'JMORENO11',
  },
  // SOL-2406: Entrante Pendiente
  {
    id: 'PET-007', solicitudId: 'SOL-2406', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-06-30 04:30', fechaActualizacion: '2026-06-30 04:30',
    piezas: [
      { code: 'BP-001', qtySolicitada: 6, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064855', parcial: false,
    usuarioCreador: 'MPENICHE07',
  },
  // SOL-2407: Saliente Pendiente
  {
    id: 'PET-008', solicitudId: 'SOL-2407', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Pendiente',
    fechaCreacion: '2026-07-01 10:10', fechaActualizacion: '2026-07-01 10:10',
    piezas: [
      { code: 'FT-223', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'AC-201', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064834', parcial: false,
    usuarioCreador: 'RGARCIA_PERI',
  },
  // SOL-2408: Saliente Pendiente
  {
    id: 'PET-009', solicitudId: 'SOL-2408', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Tonalá', status: 'Pendiente',
    fechaCreacion: '2026-07-02 08:00', fechaActualizacion: '2026-07-02 08:00',
    piezas: [
      { code: 'BC-118', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064844', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
  },
  // SOL-2409: Saliente Surtido Parcial
  {
    id: 'PET-010', solicitudId: 'SOL-2409', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Zapopan', status: 'Surtido',
    fechaCreacion: '2026-07-03 14:00', fechaActualizacion: '2026-07-03 16:30',
    piezas: [
      { code: 'BT-055', qtySolicitada: 3, qtySurtida: 2 },
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064851', parcial: true,
    usuarioCreador: 'PLOPEZ_ZAP',
  },
  // SOL-2410: Saliente Enviado
  {
    id: 'PET-011', solicitudId: 'SOL-2410', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Enviado',
    fechaCreacion: '2026-06-29 09:15', fechaActualizacion: '2026-06-29 14:20',
    piezas: [
      { code: 'LT-334', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'XX-999', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064853', parcial: false,
    embarqueId: '88509', metodoEnvio: 'Estafeta',
    usuarioCreador: 'HDIAZ_FED',
  },
  // SOL-2411: Saliente Entregado
  {
    id: 'PET-012', solicitudId: 'SOL-2411', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Tlaquepaque', status: 'Entregado',
    fechaCreacion: '2026-06-30 11:00', fechaActualizacion: '2026-06-30 16:45',
    piezas: [
      { code: 'BP-001', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'AM-445', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'FT-223', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064838', parcial: false,
    embarqueId: '88518', metodoEnvio: 'Uber',
    usuarioCreador: 'CVEGA_TLAQ',
  },
  // SOL-2412: Saliente Pendiente
  {
    id: 'PET-013', solicitudId: 'SOL-2412', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Pendiente',
    fechaCreacion: '2026-07-01 10:30', fechaActualizacion: '2026-07-01 10:30',
    piezas: [
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064847', parcial: false,
    usuarioCreador: 'RGARCIA_PERI',
  },
  // SOL-2413: Saliente Pendiente
  {
    id: 'PET-014', solicitudId: 'SOL-2413', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Zapopan', status: 'Pendiente',
    fechaCreacion: '2026-07-02 09:45', fechaActualizacion: '2026-07-02 09:45',
    piezas: [
      { code: 'AC-201', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'XX-999', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064848', parcial: false,
    usuarioCreador: 'PLOPEZ_ZAP',
  },
  // SOL-2414: Entrante Surtido
  {
    id: 'PET-015', solicitudId: 'SOL-2414', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Zapopan', status: 'Surtido',
    fechaCreacion: '2026-07-03 15:45', fechaActualizacion: '2026-07-03 17:04',
    piezas: [
      { code: 'BP-001', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064901', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
  },
  // SOL-2415: Saliente Pendiente
  {
    id: 'PET-016', solicitudId: 'SOL-2415', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Tonalá', status: 'Pendiente',
    fechaCreacion: '2026-06-29 17:25', fechaActualizacion: '2026-06-29 17:25',
    piezas: [
      { code: 'BP-001', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'AC-201', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'BT-055', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064780', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
  },
  // SOL-2416: Entrante Surtido
  {
    id: 'PET-017', solicitudId: 'SOL-2416', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Periférico', status: 'Surtido',
    fechaCreacion: '2026-06-30 13:00', fechaActualizacion: '2026-06-30 17:07',
    piezas: [
      { code: 'LT-334', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'AC-201', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064953', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
  },
  // SOL-2417: Saliente Pendiente
  {
    id: 'PET-018', solicitudId: 'SOL-2417', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-01 06:05', fechaActualizacion: '2026-07-01 06:05',
    piezas: [
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064942', parcial: false,
    usuarioCreador: 'DSOTO_PEL',
  },
  // SOL-2418: Entrante Surtido
  {
    id: 'PET-019', solicitudId: 'SOL-2418', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Surtido',
    fechaCreacion: '2026-07-02 07:50', fechaActualizacion: '2026-07-02 08:12',
    piezas: [
      { code: 'FT-223', qtySolicitada: 1, qtySurtida: 1 },
      { code: 'RD-772', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064888', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
  },
  // SOL-2419: Saliente Pendiente
  {
    id: 'PET-020', solicitudId: 'SOL-2419', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Pendiente',
    fechaCreacion: '2026-07-03 17:10', fechaActualizacion: '2026-07-03 17:10',
    piezas: [
      { code: 'LT-334', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'XX-999', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064798', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
  },
  // SOL-2420: Entrante Surtido
  {
    id: 'PET-021', solicitudId: 'SOL-2420', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Surtido',
    fechaCreacion: '2026-06-29 17:35', fechaActualizacion: '2026-06-29 18:17',
    piezas: [
      { code: 'XX-999', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 3 },
    ],
    pedidoOrigen: '1064960', parcial: false,
    usuarioCreador: 'DSOTO_PEL',
  },
  // SOL-2421: Saliente Pendiente
  {
    id: 'PET-022', solicitudId: 'SOL-2421', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Tlaquepaque', status: 'Pendiente',
    fechaCreacion: '2026-06-30 18:20', fechaActualizacion: '2026-06-30 18:20',
    piezas: [
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064984', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
  },
  // SOL-2422: Entrante Recibido
  {
    id: 'PET-023', solicitudId: 'SOL-2422', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Zapopan', status: 'Recibido',
    fechaCreacion: '2026-07-01 13:25', fechaActualizacion: '2026-07-01 15:14',
    piezas: [
      { code: 'BP-001', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064910', parcial: false,
    embarqueId: '88571', metodoEnvio: 'DHL',
    usuarioCreador: 'CVEGA_TLAQ',
  },
  // SOL-2423: Saliente Entregado Parcial
  {
    id: 'PET-024', solicitudId: 'SOL-2423', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Entregado',
    fechaCreacion: '2026-07-02 13:45', fechaActualizacion: '2026-07-02 18:28',
    piezas: [
      { code: 'LT-334', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064835', parcial: true,
    embarqueId: '88563', metodoEnvio: 'DHL',
    usuarioCreador: 'JMORENO11',
  },
  // SOL-2424: Entrante Pendiente
  {
    id: 'PET-025', solicitudId: 'SOL-2424', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-03 10:00', fechaActualizacion: '2026-07-03 10:00',
    piezas: [
      { code: 'BP-001', qtySolicitada: 2, qtySurtida: 0 },
      { code: 'LT-334', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064907', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
  },
  // SOL-2425: Saliente Enviado
  {
    id: 'PET-026', solicitudId: 'SOL-2425', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Tlaquepaque', status: 'Enviado',
    fechaCreacion: '2026-06-29 14:45', fechaActualizacion: '2026-06-29 19:14',
    piezas: [
      { code: 'BP-001', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 6 },
    ],
    pedidoOrigen: '1064959', parcial: false,
    embarqueId: '88592', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'RSILVA_TLAQ',
  },
  // SOL-2426: Entrante Pendiente
  {
    id: 'PET-027', solicitudId: 'SOL-2426', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Periférico', status: 'Pendiente',
    fechaCreacion: '2026-06-30 17:40', fechaActualizacion: '2026-06-30 17:40',
    piezas: [
      { code: 'XX-999', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 0 },
      { code: 'FT-223', qtySolicitada: 1, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064752', parcial: false,
    usuarioCreador: 'PLOPEZ_ZAP',
  },
  // SOL-2427: Saliente Pendiente
  {
    id: 'PET-028', solicitudId: 'SOL-2427', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-01 16:20', fechaActualizacion: '2026-07-01 16:20',
    piezas: [
      { code: 'BC-118', qtySolicitada: 3, qtySurtida: 0 },
      { code: 'LT-334', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'AC-201', qtySolicitada: 1, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064806', parcial: false,
    usuarioCreador: 'MPENICHE07',
  },
  // SOL-2428: Entrante Surtido Parcial
  {
    id: 'PET-029', solicitudId: 'SOL-2428', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Surtido',
    fechaCreacion: '2026-07-02 15:20', fechaActualizacion: '2026-07-02 18:38',
    piezas: [
      { code: 'LT-334', qtySolicitada: 6, qtySurtida: 6 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064991', parcial: true,
    usuarioCreador: 'MPENICHE07',
  },
  // SOL-2429: Saliente Surtido
  {
    id: 'PET-030', solicitudId: 'SOL-2429', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Surtido',
    fechaCreacion: '2026-07-03 14:40', fechaActualizacion: '2026-07-03 17:27',
    piezas: [
      { code: 'BP-001', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064886', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
  },
  // SOL-2430: Entrante Pendiente
  {
    id: 'PET-031', solicitudId: 'SOL-2430', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-06-29 11:10', fechaActualizacion: '2026-06-29 11:10',
    piezas: [
      { code: 'XX-999', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064958', parcial: false,
    usuarioCreador: 'PLOPEZ_ZAP',
  },
  // SOL-2431: Saliente Entregado
  {
    id: 'PET-032', solicitudId: 'SOL-2431', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Periférico', status: 'Entregado',
    fechaCreacion: '2026-06-30 11:05', fechaActualizacion: '2026-06-30 14:29',
    piezas: [
      { code: 'BT-055', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064891', parcial: false,
    embarqueId: '88694', metodoEnvio: 'Transporte interno',
    usuarioCreador: 'NTORRES_PERI',
  },
  // SOL-2432: Entrante Pendiente
  {
    id: 'PET-033', solicitudId: 'SOL-2432', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Zapopan', status: 'Pendiente',
    fechaCreacion: '2026-07-01 18:15', fechaActualizacion: '2026-07-01 18:15',
    piezas: [
      { code: 'XX-999', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'FT-223', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064973', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
  },
  // SOL-2433: Saliente Entregado
  {
    id: 'PET-034', solicitudId: 'SOL-2433', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Entregado',
    fechaCreacion: '2026-07-02 07:50', fechaActualizacion: '2026-07-02 09:31',
    piezas: [
      { code: 'BP-001', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064803', parcial: false,
    embarqueId: '88575', metodoEnvio: 'Estafeta',
    usuarioCreador: 'HDIAZ_FED',
  },
  // SOL-2434: Entrante Pendiente
  {
    id: 'PET-035', solicitudId: 'SOL-2434', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-03 09:40', fechaActualizacion: '2026-07-03 09:40',
    piezas: [
      { code: 'AM-445', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064755', parcial: false,
    usuarioCreador: 'NTORRES_PERI',
  },
  // SOL-2435: Saliente Pendiente
  {
    id: 'PET-036', solicitudId: 'SOL-2435', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Tlaquepaque', status: 'Pendiente',
    fechaCreacion: '2026-06-29 14:20', fechaActualizacion: '2026-06-29 14:20',
    piezas: [
      { code: 'AM-445', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'LT-334', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'BP-001', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064754', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
  },
  // SOL-2436: Entrante Enviado
  {
    id: 'PET-037', solicitudId: 'SOL-2436', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Tonalá', status: 'Enviado',
    fechaCreacion: '2026-06-30 19:20', fechaActualizacion: '2026-06-30 20:11',
    piezas: [
      { code: 'BC-118', qtySolicitada: 6, qtySurtida: 6 },
      { code: 'RD-772', qtySolicitada: 1, qtySurtida: 1 },
    ],
    pedidoOrigen: '1064758', parcial: false,
    embarqueId: '88654', metodoEnvio: 'Estafeta',
    usuarioCreador: 'AMORALES03',
  },
  // SOL-2437: Saliente Surtido Parcial
  {
    id: 'PET-038', solicitudId: 'SOL-2437', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Surtido',
    fechaCreacion: '2026-07-01 14:50', fechaActualizacion: '2026-07-01 15:18',
    piezas: [
      { code: 'AC-201', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'FT-223', qtySolicitada: 3, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064957', parcial: true,
    usuarioCreador: 'NTORRES_PERI',
  },
  // SOL-2438: Entrante Enviado
  {
    id: 'PET-039', solicitudId: 'SOL-2438', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Tonalá', status: 'Enviado',
    fechaCreacion: '2026-07-02 10:55', fechaActualizacion: '2026-07-02 11:12',
    piezas: [
      { code: 'RD-772', qtySolicitada: 4, qtySurtida: 4 },
      { code: 'BC-118', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'AM-445', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064824', parcial: false,
    embarqueId: '88623', metodoEnvio: 'Paquetexpress',
    usuarioCreador: 'PLOPEZ_ZAP',
  },
  // SOL-2439: Saliente Pendiente
  {
    id: 'PET-040', solicitudId: 'SOL-2439', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-03 19:45', fechaActualizacion: '2026-07-03 19:45',
    piezas: [
      { code: 'BC-118', qtySolicitada: 6, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064989', parcial: false,
    usuarioCreador: 'DSOTO_PEL',
  },
  // SOL-2440: Entrante Pendiente
  {
    id: 'PET-041', solicitudId: 'SOL-2440', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Tlaquepaque', status: 'Pendiente',
    fechaCreacion: '2026-06-29 14:40', fechaActualizacion: '2026-06-29 14:40',
    piezas: [
      { code: 'BT-055', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064956', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
  },
  // SOL-2441: Saliente Surtido
  {
    id: 'PET-042', solicitudId: 'SOL-2441', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Surtido',
    fechaCreacion: '2026-06-30 19:15', fechaActualizacion: '2026-07-01 00:01',
    piezas: [
      { code: 'BT-055', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064857', parcial: false,
    usuarioCreador: 'HDIAZ_FED',
  },
  // SOL-2442: Entrante Pendiente
  {
    id: 'PET-043', solicitudId: 'SOL-2442', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-07-01 07:25', fechaActualizacion: '2026-07-01 07:25',
    piezas: [
      { code: 'BC-118', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064953', parcial: false,
    usuarioCreador: 'PLOPEZ_ZAP',
  },
  // SOL-2443: Saliente Pendiente
  {
    id: 'PET-044', solicitudId: 'SOL-2443', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-07-02 11:50', fechaActualizacion: '2026-07-02 11:50',
    piezas: [
      { code: 'LT-334', qtySolicitada: 5, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'BT-055', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064965', parcial: false,
    usuarioCreador: 'HDIAZ_FED',
  },
  // SOL-2444: Entrante Recibido Parcial
  {
    id: 'PET-045', solicitudId: 'SOL-2444', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Recibido',
    fechaCreacion: '2026-07-03 08:15', fechaActualizacion: '2026-07-03 10:41',
    piezas: [
      { code: 'FT-223', qtySolicitada: 2, qtySurtida: 2 },
      { code: 'XX-999', qtySolicitada: 6, qtySurtida: 6 },
      { code: 'BP-001', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064971', parcial: true,
    embarqueId: '88655', metodoEnvio: 'Estafeta',
    usuarioCreador: 'DSOTO_PEL',
  },
  // SOL-2445: Saliente Entregado
  {
    id: 'PET-046', solicitudId: 'SOL-2445', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Tonalá', status: 'Entregado',
    fechaCreacion: '2026-06-29 10:50', fechaActualizacion: '2026-06-29 13:36',
    piezas: [
      { code: 'LT-334', qtySolicitada: 3, qtySurtida: 3 },
      { code: 'AC-201', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'XX-999', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064937', parcial: false,
    embarqueId: '88554', metodoEnvio: 'Uber',
    usuarioCreador: 'LGOMEZ_TONA',
  },
  // SOL-2446: Entrante Pendiente
  {
    id: 'PET-047', solicitudId: 'SOL-2446', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Tonalá', status: 'Pendiente',
    fechaCreacion: '2026-06-30 19:05', fechaActualizacion: '2026-06-30 19:05',
    piezas: [
      { code: 'XX-999', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064989', parcial: false,
    usuarioCreador: 'JMORENO11',
  },
  // SOL-2447: Saliente Pendiente
  {
    id: 'PET-048', solicitudId: 'SOL-2447', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Tlaquepaque', status: 'Pendiente',
    fechaCreacion: '2026-07-01 12:45', fechaActualizacion: '2026-07-01 12:45',
    piezas: [
      { code: 'FT-223', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 4, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064861', parcial: false,
    usuarioCreador: 'CVEGA_TLAQ',
  },
  // SOL-2448: Entrante Pendiente
  {
    id: 'PET-049', solicitudId: 'SOL-2448', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Periférico', status: 'Pendiente',
    fechaCreacion: '2026-07-02 16:30', fechaActualizacion: '2026-07-02 16:30',
    piezas: [
      { code: 'AC-201', qtySolicitada: 5, qtySurtida: 0 },
      { code: 'AM-445', qtySolicitada: 3, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064785', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
  },
  // SOL-2449: Saliente Pendiente
  {
    id: 'PET-050', solicitudId: 'SOL-2449', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Federalismo', status: 'Pendiente',
    fechaCreacion: '2026-07-03 12:00', fechaActualizacion: '2026-07-03 12:00',
    piezas: [
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064701', parcial: false,
    usuarioCreador: 'HDIAZ_FED',
  },
  // SOL-2450: Entrante Pendiente
  {
    id: 'PET-051', solicitudId: 'SOL-2450', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Tlaquepaque', status: 'Pendiente',
    fechaCreacion: '2026-06-29 10:30', fechaActualizacion: '2026-06-29 10:30',
    piezas: [
      { code: 'LT-334', qtySolicitada: 4, qtySurtida: 0 },
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064996', parcial: false,
    usuarioCreador: 'LGOMEZ_TONA',
  },
  // SOL-2451: Saliente Pendiente
  {
    id: 'PET-052', solicitudId: 'SOL-2451', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Periférico', status: 'Pendiente',
    fechaCreacion: '2026-06-30 17:40', fechaActualizacion: '2026-06-30 17:40',
    piezas: [
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 0 },
      { code: 'XX-999', qtySolicitada: 3, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064855', parcial: false,
    usuarioCreador: 'RGARCIA_PERI',
  },
  // SOL-2452: Entrante Pendiente
  {
    id: 'PET-053', solicitudId: 'SOL-2452', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Zapopan', status: 'Pendiente',
    fechaCreacion: '2026-07-01 09:45', fechaActualizacion: '2026-07-01 09:45',
    piezas: [
      { code: 'AM-445', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'BC-118', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'LT-334', qtySolicitada: 5, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064716', parcial: false,
    usuarioCreador: 'JMORENO11',
  },
  // SOL-2453: Saliente Surtido Parcial
  {
    id: 'PET-054', solicitudId: 'SOL-2453', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Surtido',
    fechaCreacion: '2026-07-02 13:15', fechaActualizacion: '2026-07-02 15:43',
    piezas: [
      { code: 'BT-055', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'XX-999', qtySolicitada: 3, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064734', parcial: true,
    usuarioCreador: 'MPENICHE07',
  },
  // SOL-2454: Entrante Pendiente
  {
    id: 'PET-055', solicitudId: 'SOL-2454', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-03 14:25', fechaActualizacion: '2026-07-03 14:25',
    piezas: [
      { code: 'RD-772', qtySolicitada: 6, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064741', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
  },
  // SOL-2455: Saliente Pendiente
  {
    id: 'PET-056', solicitudId: 'SOL-2455', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-06-29 12:50', fechaActualizacion: '2026-06-29 12:50',
    piezas: [
      { code: 'XX-999', qtySolicitada: 6, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064818', parcial: false,
    usuarioCreador: 'DSOTO_PEL',
  },
  // SOL-2456: Entrante Pendiente
  {
    id: 'PET-057', solicitudId: 'SOL-2456', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Tonalá', status: 'Pendiente',
    fechaCreacion: '2026-06-30 10:55', fechaActualizacion: '2026-06-30 10:55',
    piezas: [
      { code: 'BC-118', qtySolicitada: 2, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064733', parcial: false,
    usuarioCreador: 'RSILVA_TLAQ',
  },
  // SOL-2457: Saliente Pendiente
  {
    id: 'PET-058', solicitudId: 'SOL-2457', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Zapopan', status: 'Pendiente',
    fechaCreacion: '2026-07-01 07:45', fechaActualizacion: '2026-07-01 07:45',
    piezas: [
      { code: 'BP-001', qtySolicitada: 3, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064931', parcial: false,
    usuarioCreador: 'AMORALES03',
  },
  // SOL-2458: Entrante Recibido
  {
    id: 'PET-059', solicitudId: 'SOL-2458', tipo: 'Entrante', generacion: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Recibido',
    fechaCreacion: '2026-07-02 06:30', fechaActualizacion: '2026-07-02 06:45',
    piezas: [
      { code: 'RD-772', qtySolicitada: 2, qtySurtida: 2 },
    ],
    pedidoOrigen: '1064799', parcial: false,
    embarqueId: '88651', metodoEnvio: 'BlueGo',
    usuarioCreador: 'RSILVA_TLAQ',
  },
  // SOL-2459: Saliente Pendiente
  {
    id: 'PET-060', solicitudId: 'SOL-2459', tipo: 'Saliente', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Pendiente',
    fechaCreacion: '2026-07-03 11:20', fechaActualizacion: '2026-07-03 11:20',
    piezas: [
      { code: 'RD-772', qtySolicitada: 1, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064728', parcial: false,
    usuarioCreador: 'RGARCIA_PERI',
  },
  // SOL-2460: Entrante Recibido Parcial
  {
    id: 'PET-061', solicitudId: 'SOL-2460', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Recibido',
    fechaCreacion: '2026-06-29 11:40', fechaActualizacion: '2026-06-29 12:11',
    piezas: [
      { code: 'AC-201', qtySolicitada: 5, qtySurtida: 5 },
      { code: 'FT-223', qtySolicitada: 6, qtySurtida: 4 },
      { code: 'BT-055', qtySolicitada: 5, qtySurtida: 5 },
    ],
    pedidoOrigen: '1064976', parcial: true,
    embarqueId: '88622', metodoEnvio: 'Estafeta',
    usuarioCreador: 'LGOMEZ_TONA',
  },
  // SOL-2461: Saliente Surtido
  {
    id: 'PET-062', solicitudId: 'SOL-2461', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Zapopan', status: 'Surtido',
    fechaCreacion: '2026-06-30 10:05', fechaActualizacion: '2026-06-30 11:28',
    piezas: [
      { code: 'FT-223', qtySolicitada: 4, qtySurtida: 4 },
    ],
    pedidoOrigen: '1064851', parcial: false,
    usuarioCreador: 'AMORALES03',
  },
  // SOL-2462: Entrante Pendiente
  {
    id: 'PET-063', solicitudId: 'SOL-2462', tipo: 'Entrante', generacion: 'Automático',
    sucursalContraparte: 'Periférico', status: 'Pendiente',
    fechaCreacion: '2026-07-01 18:05', fechaActualizacion: '2026-07-01 18:05',
    piezas: [
      { code: 'BP-001', qtySolicitada: 1, qtySurtida: 0 },
      { code: 'RD-772', qtySolicitada: 1, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064927', parcial: false,
    usuarioCreador: 'JMORENO11',
  },
  // SOL-2463: Saliente Pendiente
  {
    id: 'PET-064', solicitudId: 'SOL-2463', tipo: 'Saliente', generacion: 'Manual',
    sucursalContraparte: 'Pelícano', status: 'Pendiente',
    fechaCreacion: '2026-07-02 16:45', fechaActualizacion: '2026-07-02 16:45',
    piezas: [
      { code: 'BT-055', qtySolicitada: 5, qtySurtida: 0 },
      { code: 'AC-201', qtySolicitada: 6, qtySurtida: 0 },
    ],
    pedidoOrigen: '1064783', parcial: false,
    usuarioCreador: 'DSOTO_PEL',
  },
];
