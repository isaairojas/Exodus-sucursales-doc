// ============================================================
// APYMSA — Escenarios / fixtures de demostración de Traspasos SMC
// Fuente funcional: ERB-42439, ERB-51528, ERB-51529, ERB-51530, ERB-51531
//
// Datos controlados para demostrar, sin backend, los escenarios A–M.
// Los mensajes NO dependen de if/else dispersos: usan traspasoRules.ts.
// ============================================================
import { TraspasoPeticion, TraspasoPiezaDetalle, TraspasoFlujo, TraspasoStatus, PeticionResultado } from './data';

const NOW = '2026-07-17 09:00';

function pieza(code: string, solicitada: number, surtida = 0, motivo?: string): TraspasoPiezaDetalle {
  return { code, qtySolicitada: solicitada, qtySurtida: surtida, motivoNegacion: motivo };
}

// Constructor de petición con defaults del proyecto principal.
function mkPeticion(p: Partial<TraspasoPeticion> & {
  id: string; solicitudId: string; sucursalContraparte: string; piezas: TraspasoPiezaDetalle[];
}): TraspasoPeticion {
  return {
    tipo: 'Saliente',
    categoria: 'Automático',
    flujo: 'Automatico',
    status: 'Pendiente',
    fechaCreacion: NOW,
    fechaActualizacion: NOW,
    pedidoOrigen: '',
    parcial: false,
    usuarioCreador: 'JMORENO11',
    noPapeleta: String(400000 + Math.floor(Math.random() * 99999)),
    packingList: false,
    cajasTotal: 1,
    cajasRecibidas: 0,
    intento: 1,
    resultado: 'vigente',
    ...p,
  };
}

export interface Escenario {
  id: string;                 // 'A'..'M'
  jira: string;
  titulo: string;
  descripcion: string;
  demo: 'hh-surtido' | 'hh-revision' | 'cedis-urgencia' | 'manual' | 'listado';
  // Datos controlados que la demo puede inyectar en el estado local.
  peticiones?: TraspasoPeticion[];
  pedidoOrigen?: string;
  estadoPedido?: 'activo' | 'facturado' | 'cancelado';
  nota?: string;
}

export const ESCENARIOS: Escenario[] = [
  {
    id: 'A', jira: 'ERB-51528/51529', titulo: 'Automático → surtido completo → revisión → traspaso visible',
    descripcion: 'Petición automática vigente, surtido completo, revisión exitosa y creación del traspaso en el flujo existente.',
    demo: 'hh-surtido', pedidoOrigen: '1064772', estadoPedido: 'activo',
    peticiones: [mkPeticion({ id: 'PET-A1', solicitudId: 'SOL-A1', sucursalContraparte: 'Federalismo', pedidoOrigen: '1064772', piezas: [pieza('BP-001', 4), pieza('FT-223', 2)] })],
  },
  {
    id: 'B', jira: 'ERB-51528', titulo: 'Semiautomático → rechazo total → nueva petición otra sucursal (intento 2)',
    descripcion: 'Rechazo total desde HH con motivo y confirmación; se genera nueva petición en otra sucursal bajo la misma solicitud.',
    demo: 'hh-surtido', pedidoOrigen: '1064847', estadoPedido: 'activo',
    peticiones: [mkPeticion({ id: 'PET-B1', solicitudId: 'SOL-B1', flujo: 'Semiautomatico', sucursalContraparte: 'Central Camionera', pedidoOrigen: '1064847', intento: 1, sucursalesExcluidas: [], piezas: [pieza('AM-445', 3)] })],
  },
  {
    id: 'C', jira: 'ERB-51528', titulo: 'Surtido parcial 7/10 → recálculo solo por 3',
    descripcion: 'Petición automática de 10 piezas, surtido 7, faltante 3; la siguiente evaluación es por 3, no por 10.',
    demo: 'hh-surtido', pedidoOrigen: '1064838', estadoPedido: 'activo',
    peticiones: [mkPeticion({ id: 'PET-C1', solicitudId: 'SOL-C1', sucursalContraparte: 'Adolf Horn', pedidoOrigen: '1064838', intento: 1, piezas: [pieza('BC-118', 10)] })],
  },
  {
    id: 'D', jira: 'ERB-51528/42439', titulo: 'Tercer intento agotado → no cuarta petición',
    descripcion: 'Petición en tercer intento; al rechazar no se genera una cuarta petición y la solicitud refleja agotamiento.',
    demo: 'hh-surtido', pedidoOrigen: '1064844', estadoPedido: 'activo',
    peticiones: [mkPeticion({ id: 'PET-D3', solicitudId: 'SOL-D1', sucursalContraparte: 'Colón', pedidoOrigen: '1064844', intento: 3, sucursalesExcluidas: ['Federalismo', 'Central Camionera'], peticionAnteriorId: 'PET-D2', piezas: [pieza('RD-772', 2)] })],
    nota: 'Al rechazar el intento 3, la solicitud pasa a estado "agotada".',
  },
  {
    id: 'E', jira: 'ERB-51529', titulo: 'Pedido facturado durante surtido → bloqueo al finalizar HH',
    descripcion: 'El pedido se factura durante el surtido; al finalizar HH se muestra el mensaje y se impide el cierre normal.',
    demo: 'hh-revision', pedidoOrigen: '1064853', estadoPedido: 'facturado',
    peticiones: [mkPeticion({ id: 'PET-E1', solicitudId: 'SOL-E1', status: 'Surtido', sucursalContraparte: 'Federalismo', pedidoOrigen: '1064853', piezas: [pieza('LT-334', 2, 2)] })],
  },
  {
    id: 'F', jira: 'ERB-51529', titulo: 'Pedido cancelado antes de revisión → no crear traspaso',
    descripcion: 'El pedido se cancela antes de finalizar la revisión; se muestra el mensaje y no se crea el movimiento/traspaso.',
    demo: 'hh-revision', pedidoOrigen: '1064844', estadoPedido: 'cancelado',
    peticiones: [mkPeticion({ id: 'PET-F1', solicitudId: 'SOL-F1', status: 'Surtido', sucursalContraparte: 'Adolf Horn', pedidoOrigen: '1064844', piezas: [pieza('AC-201', 4, 4)] })],
  },
  {
    id: 'G', jira: 'ERB-51529', titulo: 'Necesidad cubierta por otro traspaso → bloqueo en revisión',
    descripcion: 'La mercancía ya fue cubierta por otro traspaso; al finalizar la revisión se bloquea y se explica el motivo.',
    demo: 'hh-revision', pedidoOrigen: '1064848', estadoPedido: 'activo',
    peticiones: [mkPeticion({ id: 'PET-G1', solicitudId: 'SOL-G1', status: 'Surtido', sucursalContraparte: 'Colón', pedidoOrigen: '1064848', resultado: 'revisada', piezas: [pieza('XX-999', 5, 5)] })],
    nota: 'necesidadCubiertaPorOtro = true en el contexto de canContinuePetition.',
  },
  {
    id: 'H', jira: 'ERB-51529', titulo: 'Petición ya enviada → pedido se cancela → permitir recepción',
    descripcion: 'La petición ya fue enviada y el pedido origen se cancela; se permite la recepción mostrando la advertencia.',
    demo: 'listado', pedidoOrigen: '1064851', estadoPedido: 'cancelado',
    peticiones: [mkPeticion({ id: 'PET-H1', solicitudId: 'SOL-H1', tipo: 'Entrante', status: 'Enviado', sucursalContraparte: 'Belisario Domínguez', pedidoOrigen: '1064851', resultado: 'enviada', cajasTotal: 2, piezas: [pieza('BP-001', 3, 3)] })],
  },
  {
    id: 'I', jira: 'ERB-51530', titulo: 'Urgencia CEDIS → 2 peticiones modificables → "se cancelarán 2"',
    descripcion: 'Existen 2 peticiones modificables; la urgencia muestra "se cancelarán 2 peticiones", confirma y aplica cancelación/ajuste.',
    demo: 'cedis-urgencia', pedidoOrigen: '1064772', estadoPedido: 'activo',
    peticiones: [
      mkPeticion({ id: 'PET-I1', solicitudId: 'SOL-I1', sucursalContraparte: 'Forum Tlaquepaque', pedidoOrigen: '1064772', piezas: [pieza('BP-001', 4)] }),
      mkPeticion({ id: 'PET-I2', solicitudId: 'SOL-I1', sucursalContraparte: 'Pelícano', pedidoOrigen: '1064772', piezas: [pieza('FT-223', 2)] }),
    ],
  },
  {
    id: 'J', jira: 'ERB-51530', titulo: 'Urgencia CEDIS → mercancía en tránsito → no cancelar, evitar duplicidad',
    descripcion: 'La mercancía ya está en tránsito; no se cancela el movimiento en tránsito y se evita la duplicidad.',
    demo: 'cedis-urgencia', pedidoOrigen: '1064838', estadoPedido: 'activo',
    peticiones: [mkPeticion({ id: 'PET-J1', solicitudId: 'SOL-J1', tipo: 'Entrante', status: 'Enviado', sucursalContraparte: 'Adolf Horn', pedidoOrigen: '1064838', resultado: 'enviada', piezas: [pieza('BC-118', 4, 4)] })],
  },
  {
    id: 'K', jira: 'ERB-51531', titulo: 'Manual → pedido con peticiones automáticas → advertencia N peticiones',
    descripcion: 'El usuario selecciona un pedido con peticiones automáticas existentes; se muestra la advertencia con N peticiones (cancelar o confirmar).',
    demo: 'manual', pedidoOrigen: '1064772', estadoPedido: 'activo',
    peticiones: [
      mkPeticion({ id: 'PET-K1', solicitudId: 'SOL-K1', sucursalContraparte: 'Federalismo', pedidoOrigen: '1064772', piezas: [pieza('BP-001', 4)] }),
      mkPeticion({ id: 'PET-K2', solicitudId: 'SOL-K1', sucursalContraparte: 'Colonia Jalisco', pedidoOrigen: '1064772', piezas: [pieza('AM-445', 2)] }),
    ],
  },
  {
    id: 'L', jira: 'ERB-51531', titulo: 'Manual → pedido cancelado/facturado o solicitud cancelada → bloqueo',
    descripcion: 'Bloqueo de generación con mensaje específico según el motivo (pedido cancelado/facturado o solicitud cancelada).',
    demo: 'manual', pedidoOrigen: '1064844', estadoPedido: 'cancelado',
    peticiones: [],
  },
  {
    id: 'M', jira: 'ERB-51531', titulo: 'Manual → mercancía ya enviada/en tránsito → bloquear duplicado',
    descripcion: 'Existen piezas ya en tránsito para la necesidad; se bloquea la cantidad duplicada y se muestra el mensaje.',
    demo: 'manual', pedidoOrigen: '1064851', estadoPedido: 'activo',
    peticiones: [mkPeticion({ id: 'PET-M1', solicitudId: 'SOL-M1', tipo: 'Entrante', status: 'Enviado', sucursalContraparte: 'Belisario Domínguez', pedidoOrigen: '1064851', resultado: 'enviada', piezas: [pieza('LT-334', 3, 3)] })],
  },
];

export function getEscenario(id: string): Escenario | undefined {
  return ESCENARIOS.find(e => e.id === id.toUpperCase());
}

// Re-exports usados por la UI de demo.
export type { TraspasoFlujo, TraspasoStatus, PeticionResultado };
