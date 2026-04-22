// ============================================================
// APYMSA — Módulo de Revisión de Pedidos
// Data Layer: Product catalog and orders database
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

export interface Order {
  id: string;
  clienteId: string;
  cliente: string;
  vendedorId: string;
  vendedor: string;
  total: string;
  status: 'Activo' | 'Surtido' | 'Revisado' | 'Revisado con incidencias' | 'Facturado' | 'Cancelado';
  elaboro: string;
  origen: string;
  observaciones: string;
  fechaCaptura: string;
  horaInicioSurtido: string;
  horaFinSurtido: string;
  partidas: OrderPartida[];
}

export const PRODUCT_CATALOG: Record<string, Product> = {
  'BP-001': { code: 'BP-001', name: 'Balata Delantera Toyota Corolla 2018-2022', category: 'Frenos',       img: null },
  'FT-223': { code: 'FT-223', name: 'Filtro de Aceite Honda Civic 1.5T',          category: 'Filtros',      img: null },
  'AM-445': { code: 'AM-445', name: 'Amortiguador Trasero Nissan Sentra 2020',     category: 'Suspensión',   img: null },
  'BC-118': { code: 'BC-118', name: 'Bobina de Encendido VW Jetta 2.5',            category: 'Encendido',    img: null },
  'RD-772': { code: 'RD-772', name: 'Radiador Completo Chevrolet Aveo 1.6',        category: 'Enfriamiento', img: null },
};

export const ORDERS_DB: Record<string, Order> = {
  '1064772': {
    id: '1064772',
    clienteId: '1',
    cliente: 'CLIENTE MO',
    vendedorId: '90',
    vendedor: 'MOSTRADO',
    total: '$1,837.12',
    status: 'Surtido',
    elaboro: 'Ángel',
    origen: 'Ángel - Sistema',
    observaciones: '',
    fechaCaptura: '21/04/2026',
    horaInicioSurtido: '08:14',
    horaFinSurtido: '08:52',
    partidas: [
      { code: 'BP-001', qty: 3 },
      { code: 'FT-223', qty: 5 },
      { code: 'AM-445', qty: 2 },
    ],
  },
  '1064775': {
    id: '1064775',
    clienteId: '465598',
    cliente: 'SERGIO DEL',
    vendedorId: '1786',
    vendedor: 'Razo Alvarez',
    total: '$1,246.88',
    status: 'Surtido',
    elaboro: 'Ángel',
    origen: 'Ángel - Sistema',
    observaciones: 'Entregar antes de mediodía',
    fechaCaptura: '21/04/2026',
    horaInicioSurtido: '09:05',
    horaFinSurtido: '09:38',
    partidas: [
      { code: 'BC-118', qty: 4 },
      { code: 'RD-772', qty: 1 },
      { code: 'FT-223', qty: 6 },
    ],
  },
};

export type AppScreen = 'auth' | 'select' | 'review' | 'summary';

export interface ScannedItem {
  conteo: number;
  authorized: boolean;
  authMotivo: string;
  observacion: string;
  fromOrder: boolean;
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
}

export const initialAppState: AppState = {
  currentScreen: 'auth',
  selectedOrderId: null,
  preSelectedOrderId: null,
  reviewStartTime: null,
  reviewEndTime: null,
  scannedItems: {},
  lastScannedCode: null,
  unknownProducts: [],
};

export function formatDateTime(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}
