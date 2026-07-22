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
  | 'Documentado'
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
// - Urgencia: la sucursal lo solicitó, tiene pedido relacionado.
// - Reabasto: CEDIS lo envía por su cuenta para restocking, sin pedido.
export type TraspasoSubtipoCedis = 'Urgencia' | 'Reabasto';

export interface TraspasoPeticion {
  id: string;
  solicitudId: string;
  tipo: TraspasoTipo;           // CEDIS siempre usa 'Entrante' (solo se maneja la recepción)
  categoria: TraspasoCategoria;
  subtipoCedis?: TraspasoSubtipoCedis; // solo presente cuando categoria === 'CEDIS'
  sucursalContraparte: string;  // para CEDIS: fijo 'CEDIS'
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
  'CEDIS': 'AL1',
};

// Convierte 'YYYY-MM-DD HH:mm' a 'DD/MM/YY' para la vista unificada estilo almacén.
export function formatFechaCorta(fechaIso: string): string {
  const [y, m, d] = fechaIso.slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

export const SUCURSALES = [
  'Pelícano', 'Federalismo', 'Central Camionera', 'Adolf Horn',
  'Belisario Domínguez', 'Colón', 'Colonia Jalisco', 'Forum Tlaquepaque',
] as const;

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
};

// Orden de cercanía usado por el motor SMC (Sucursal Más Cercana) — mock.
export const SUCURSAL_DISTANCIA_ORDEN: string[] = [
  'Federalismo', 'Central Camionera', 'Colón', 'Adolf Horn',
  'Colonia Jalisco', 'Belisario Domínguez', 'Forum Tlaquepaque', 'Pelícano',
];

// Recomienda la sucursal más cercana (según el motor SMC) que pueda surtir
// completamente las piezas solicitadas; si ninguna puede, regresa la más
// cercana disponible marcando `suficiente: false`.
export function calcularSucursalRecomendada(
  piezas: { code: string; qty: number }[],
  excluir: string[] = []
): { sucursal: string; suficiente: boolean } | null {
  const candidatos = SUCURSAL_DISTANCIA_ORDEN.filter(s => !excluir.includes(s));
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
  'Documentado':{ bg: 'rgba(124,58,237,0.12)',  text: '#7c3aed', border: 'rgba(124,58,237,0.3)'  },
  'Enviado':    { bg: 'rgba(22,163,74,0.12)',   text: '#16a34a', border: 'rgba(22,163,74,0.3)'   },
  'Recibido':   { bg: 'rgba(26,43,107,0.12)',   text: '#1a2b6b', border: 'rgba(26,43,107,0.3)'   },
  'Entregado':  { bg: 'rgba(26,43,107,0.12)',   text: '#1a2b6b', border: 'rgba(26,43,107,0.3)'   },
};

export const CEDIS_SUBTIPO_COLORS: Record<TraspasoSubtipoCedis, { bg: string; text: string; border: string }> = {
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
];
