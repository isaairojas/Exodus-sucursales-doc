// ============================================================
// APYMSA — Pedidos demo para Solicitud de Urgencia a CEDIS
// Fuente funcional: ERB-51530
//
// Datos controlados (mock) para demostrar la precarga de productos del pedido
// y las restricciones de selección: pedido ya usado en urgencia, pedido viejo
// (fuera de vigencia, sin falsos positivos), pedido entregado, y el flujo de
// eliminación de peticiones relacionadas.
// ============================================================
import { mapProductCode } from './data';

export interface PartidaDemo { code: string; qty: number; }

export interface PedidoUrgenciaDemo {
  id: string;
  cliente: string;
  estado: 'activo' | 'entregado' | 'cancelado';
  fechaCaptura: string;            // 'YYYY-MM-DD HH:mm'
  usadoEnUrgencia: boolean;        // ya se usó para otra urgencia
  partidas: PartidaDemo[];         // se precargan al seleccionar
  // Si está vinculado a un pedido real con peticiones auto/semi, al confirmar
  // la urgencia se calcula el impacto (eliminación/ajuste) sobre esas peticiones.
  pedidoRealVinculado?: string;
  etiquetaDemo?: string;           // texto corto que explica el caso
}

// Fechas dinámicas para que la vigencia sea real (sin falsos positivos):
// los recientes quedan dentro de la vigencia; el "viejo" claramente fuera.
const _n = new Date();
const _fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const _hace = (ms: number) => _fmt(new Date(_n.getTime() - ms));
const H = 3600_000, D = 24 * H;

export const PEDIDOS_URGENCIA_DEMO: PedidoUrgenciaDemo[] = [
  {
    id: 'P1071001', cliente: 'Refaccionaria del Norte', estado: 'activo',
    fechaCaptura: _hace(2 * H), usadoEnUrgencia: false,
    partidas: [{ code: 'BP-001', qty: 4 }, { code: 'FT-223', qty: 2 }],
    etiquetaDemo: 'Válido · precarga productos',
  },
  {
    id: 'P1071002', cliente: 'Autopartes del Sur', estado: 'activo',
    fechaCaptura: _hace(3 * H), usadoEnUrgencia: true,
    partidas: [{ code: 'BC-118', qty: 3 }],
    etiquetaDemo: 'R1 · ya usado en una urgencia previa',
  },
  {
    id: 'P1070500', cliente: 'Taller Mecánico Central', estado: 'activo',
    fechaCaptura: _hace(30 * D), usadoEnUrgencia: false,
    partidas: [{ code: 'AM-445', qty: 2 }],
    etiquetaDemo: 'R2 · pedido viejo (fuera de vigencia)',
  },
  {
    id: 'P1070900', cliente: 'Servicio Rápido Express', estado: 'entregado',
    fechaCaptura: _hace(5 * H), usadoEnUrgencia: false,
    partidas: [{ code: 'LT-334', qty: 2 }],
    etiquetaDemo: 'R3 · pedido ya entregado/completado',
  },
  {
    id: 'P1064953', cliente: 'Distribuidora Occidente', estado: 'activo',
    fechaCaptura: _hace(4 * H), usadoEnUrgencia: false,
    partidas: [{ code: 'BP-001', qty: 4 }, { code: 'FT-223', qty: 3 }],
    pedidoRealVinculado: 'P1064953',
    etiquetaDemo: 'Válido · sustituye peticiones (eliminación)',
  },
];

// Alinea los códigos de producto con la convención de 7 dígitos del catálogo.
PEDIDOS_URGENCIA_DEMO.forEach(p => p.partidas.forEach(x => { x.code = mapProductCode(x.code); }));

export function getPedidoUrgenciaDemo(id: string): PedidoUrgenciaDemo | undefined {
  return PEDIDOS_URGENCIA_DEMO.find(p => p.id === id);
}

// Horas transcurridas desde la captura del pedido (para la regla de vigencia).
export function horasDesdeCaptura(fechaCaptura: string): number {
  const [d, t] = fechaCaptura.split(' ');
  const fecha = new Date(`${d}T${(t || '00:00')}:00`);
  return Math.max(0, (Date.now() - fecha.getTime()) / H);
}
