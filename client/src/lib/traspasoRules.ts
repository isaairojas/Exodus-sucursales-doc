// ============================================================
// APYMSA — Servicio central de reglas de Traspasos (SMC)
// Fuente funcional: ERB-42439, ERB-51528, ERB-51529, ERB-51530, ERB-51531
//
// Funciones PURAS (sin React ni estado). Todas las reglas de negocio y los
// mensajes viven aquí para NO duplicarlas en componentes. La UI solo consume.
// ============================================================
import {
  TraspasoPeticion, TraspasoPiezaDetalle, TraspasoStatus,
  MotivoCancelacion, SUCURSAL_DISTANCIA_ORDEN,
} from './data';
import { MAX_EVALUACIONES_PETICION } from './traspasoConfig';

// ── Estado del pedido (derivado del OrderStatus del proyecto) ──────────────
export type EstadoPedido = 'activo' | 'facturado' | 'cancelado';

// ── Etapa operativa (para reglas de cancelación por etapa, ERB-51529) ──────
export type EtapaOperativa =
  | 'antes-movimientos'   // Pendiente: aún no se genera el movimiento del traspaso
  | 'movimientos'         // Surtido: movimientos generados, no documentado
  | 'documentado'         // Documentado/embarque, no enviado
  | 'enviado'             // Enviado / en tránsito
  | 'recibido';           // Recibido / Entregado (terminal)

export function etapaDeStatus(status: TraspasoStatus): EtapaOperativa {
  switch (status) {
    case 'Pendiente': return 'antes-movimientos';
    case 'Surtido':
    case 'Revisado': return 'movimientos';
    case 'Documentado': return 'documentado';
    case 'Enviado': return 'enviado';
    case 'Recibido':
    case 'Entregado':
    case 'Cancelado': return 'recibido';
  }
}

// ============================================================
// CATÁLOGO DE MENSAJES (textos funcionales exactos de Jira)
// ============================================================

// ERB-51529 — Revisión HH / Sucursales: mensajes al finalizar según motivo.
export const MENSAJES_REVISION: Record<MotivoCancelacion, string> = {
  'pedido-facturado':
    'No es posible continuar con esta petición. El pedido origen ya fue facturado y la mercancía dejó de ser necesaria para completar el pedido.',
  'pedido-cancelado':
    'No es posible continuar con esta petición. El pedido origen fue cancelado y la solicitud relacionada ya no se encuentra vigente.',
  'cubierta-otro-traspaso':
    'No es posible continuar con esta petición. La mercancía requerida ya fue cubierta mediante otro traspaso y esta petición dejó de ser necesaria.',
  'solicitud-cancelada':
    'No es posible continuar con esta petición. La solicitud relacionada ya fue cancelada y la necesidad dejó de estar vigente.',
  // Mercancía ya enviada: la necesidad se canceló pero el envío continúa hasta recepción.
  'urgencia-cedis':
    'La necesidad relacionada con este traspaso fue cancelada; sin embargo, la mercancía ya fue enviada. Continúa con el proceso de recepción correspondiente.',
  'manual-sustituye':
    'La necesidad relacionada con este traspaso fue cancelada; sin embargo, la mercancía ya fue enviada. Continúa con el proceso de recepción correspondiente.',
};

// Mensaje específico para "mercancía ya enviada" (ERB-51529, punto 4).
export const MENSAJE_MERCANCIA_ENVIADA =
  'La necesidad relacionada con este traspaso fue cancelada; sin embargo, la mercancía ya fue enviada. Continúa con el proceso de recepción correspondiente.';

// ERB-51531 — Traspasos manuales: mensajes de bloqueo/advertencia.
export const MENSAJES_MANUAL = {
  solicitudCancelada:
    'No es posible generar el traspaso. La solicitud relacionada ya fue cancelada y la necesidad dejó de estar vigente.',
  pedidoCancelado:
    'No es posible generar el traspaso. El pedido origen fue cancelado.',
  pedidoFacturado:
    'No es posible generar el traspaso. El pedido origen ya fue completado y la mercancía ya no es requerida para esta necesidad.',
  mercanciaEnTransito:
    'No es posible solicitar nuevamente esta mercancía. Existen piezas relacionadas con esta necesidad que ya se encuentran en tránsito.',
  sustituyePeticiones: (n: number) =>
    `Al continuar, este movimiento sustituirá mercancía asignada a peticiones existentes. Se cancelarán ${n} petición(es) y podrán existir ajustes parciales. ¿Deseas continuar?`,
} as const;

// Motivo de rechazo → texto legible (menú HH). ERB-51528.
export const MOTIVOS_RECHAZO_HH = [
  'Sin existencia física',
  'Mercancía dañada',
  'Diferencia con inventario',
  'Producto no localizado',
  'Otro',
] as const;

// ============================================================
// REGLAS PURAS
// ============================================================

export interface ReglaResultado {
  ok: boolean;                 // true = puede continuar
  bloqueado?: boolean;         // true = bloqueo duro
  advertencia?: boolean;       // true = solo advertencia (puede continuar tras confirmar)
  motivo?: MotivoCancelacion;
  mensaje?: string;
}

// ¿Puede continuar la petición al finalizar la revisión? (ERB-51529)
// Valida vigencia de la necesidad ANTES de generar/actualizar el traspaso.
export function canContinuePetition(ctx: {
  estadoPedido: EstadoPedido;
  necesidadCubiertaPorOtro?: boolean;
  solicitudCancelada?: boolean;
  yaEnviada?: boolean;   // la mercancía ya salió (Enviado/en tránsito)
}): ReglaResultado {
  // Mercancía ya enviada: no se cancela; continúa hasta recepción (solo advertencia).
  if (ctx.yaEnviada && (ctx.estadoPedido !== 'activo' || ctx.solicitudCancelada)) {
    return { ok: true, advertencia: true, motivo: 'manual-sustituye', mensaje: MENSAJE_MERCANCIA_ENVIADA };
  }
  if (ctx.estadoPedido === 'facturado') {
    return { ok: false, bloqueado: true, motivo: 'pedido-facturado', mensaje: MENSAJES_REVISION['pedido-facturado'] };
  }
  if (ctx.estadoPedido === 'cancelado') {
    return { ok: false, bloqueado: true, motivo: 'pedido-cancelado', mensaje: MENSAJES_REVISION['pedido-cancelado'] };
  }
  if (ctx.solicitudCancelada) {
    return { ok: false, bloqueado: true, motivo: 'solicitud-cancelada', mensaje: MENSAJES_REVISION['solicitud-cancelada'] };
  }
  if (ctx.necesidadCubiertaPorOtro) {
    return { ok: false, bloqueado: true, motivo: 'cubierta-otro-traspaso', mensaje: MENSAJES_REVISION['cubierta-otro-traspaso'] };
  }
  return { ok: true };
}

// Política de cancelación según la etapa operativa (ERB-51529).
export interface PoliticaEtapa {
  etapa: EtapaOperativa;
  bloquearContinuidad: boolean;   // impedir avanzar/crear el movimiento
  revertirMovimientos: boolean;   // los movimientos ya generados deben revertirse/cancelarse
  permitirRecepcion: boolean;     // ya enviado: continuar hasta recepción
  mensaje: string;
}

export function canCancelByStage(status: TraspasoStatus): PoliticaEtapa {
  const etapa = etapaDeStatus(status);
  switch (etapa) {
    case 'antes-movimientos':
      return { etapa, bloquearContinuidad: true, revertirMovimientos: false, permitirRecepcion: false,
        mensaje: 'La petición fue cancelada. No se generará el movimiento del traspaso.' };
    case 'movimientos':
      return { etapa, bloquearContinuidad: true, revertirMovimientos: true, permitirRecepcion: false,
        mensaje: 'La petición fue cancelada. Los movimientos ya generados deben revertirse/cancelarse.' };
    case 'documentado':
      return { etapa, bloquearContinuidad: true, revertirMovimientos: true, permitirRecepcion: false,
        mensaje: 'La petición fue cancelada. No es posible iniciar el envío/reparto; deben revertirse los movimientos.' };
    case 'enviado':
      return { etapa, bloquearContinuidad: false, revertirMovimientos: false, permitirRecepcion: true,
        mensaje: MENSAJE_MERCANCIA_ENVIADA };
    case 'recibido':
      return { etapa, bloquearContinuidad: false, revertirMovimientos: false, permitirRecepcion: false,
        mensaje: 'El traspaso ya fue recibido; el ciclo está cerrado.' };
  }
}

// Regla transversal 1: ¿se puede generar otra petición para la misma necesidad?
// Petición original + hasta 2 adicionales = máx. 3. Nunca una cuarta.
export function canCreateNextPetition(intentoActual: number): boolean {
  return intentoActual < MAX_EVALUACIONES_PETICION;
}

// Regla transversal 2: recálculo por surtido parcial → solo el faltante.
export function calcularFaltante(piezas: TraspasoPiezaDetalle[]): TraspasoPiezaDetalle[] {
  return piezas
    .map(p => ({ ...p, qtyFaltante: Math.max(0, p.qtySolicitada - p.qtySurtida) }))
    .filter(p => p.qtyFaltante > 0)
    .map(p => ({ code: p.code, qtySolicitada: p.qtyFaltante, qtySurtida: 0 }));
}

// Regla transversal 3: siguiente sucursal donante excluyendo las que ya rechazaron.
export function siguienteSucursalDonante(excluir: string[]): string | null {
  const cand = SUCURSAL_DISTANCIA_ORDEN.filter(s => !excluir.includes(s));
  return cand.length > 0 ? cand[0] : null;
}

// ── Impacto sobre peticiones existentes (Urgencia CEDIS / Manual) ──────────
// ERB-51530 / ERB-51531. Determina qué peticiones se cancelan (cobertura
// total), cuáles se ajustan (parcial) y cuáles NO se tocan por estar en
// tránsito. Comienza por la sucursal más lejana que todavía pueda modificarse.
const NO_MODIFICABLE: TraspasoStatus[] = ['Enviado', 'Recibido', 'Entregado'];
export function esModificable(status: TraspasoStatus): boolean {
  return !NO_MODIFICABLE.includes(status);
}
function distanciaIdx(sucursal: string): number {
  const i = SUCURSAL_DISTANCIA_ORDEN.indexOf(sucursal);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i; // índice mayor = más lejana
}

export interface ImpactoPeticiones {
  cancelar: string[];                                  // ids de peticiones a cancelar (cobertura total)
  ajustar: { id: string; nuevasPiezas: TraspasoPiezaDetalle[] }[]; // ajuste parcial
  enTransito: string[];                                // ids que NO se tocan (ya enviadas)
  restante: Record<string, number>;                    // mercancía no cubierta por sustitución
}

export function calcularImpactoPeticiones(
  peticiones: TraspasoPeticion[],
  codigos: { code: string; qty: number }[],
  sucursalOrigenNueva?: string,          // manual: si parte de una sucursal con petición, afectar esa primero
): ImpactoPeticiones {
  const restante: Record<string, number> = {};
  codigos.forEach(c => { restante[c.code] = (restante[c.code] ?? 0) + c.qty; });

  const cancelar: string[] = [];
  const ajustar: { id: string; nuevasPiezas: TraspasoPiezaDetalle[] }[] = [];
  const enTransito: string[] = [];

  // Peticiones relacionadas ya en tránsito → informativas, no se tocan.
  peticiones.filter(p => !esModificable(p.status)).forEach(p => {
    const relacionada = p.piezas.some(pz => (restante[pz.code] ?? 0) >= 0 && codigos.some(c => c.code === pz.code));
    if (relacionada) enTransito.push(p.id);
  });

  // Orden de afectación: primero la petición de la sucursal origen nueva (manual),
  // luego por sucursal más lejana modificable.
  const modificables = peticiones
    .filter(p => esModificable(p.status))
    .sort((a, b) => {
      if (sucursalOrigenNueva) {
        if (a.sucursalContraparte === sucursalOrigenNueva) return -1;
        if (b.sucursalContraparte === sucursalOrigenNueva) return 1;
      }
      return distanciaIdx(b.sucursalContraparte) - distanciaIdx(a.sucursalContraparte); // más lejana primero
    });

  for (const pet of modificables) {
    if (Object.values(restante).every(v => v <= 0)) break;
    let cubreAlgo = false;
    let cubreTodo = true;
    const nuevasPiezas: TraspasoPiezaDetalle[] = [];
    for (const pz of pet.piezas) {
      const disp = restante[pz.code] ?? 0;
      if (disp <= 0) { nuevasPiezas.push({ ...pz }); cubreTodo = pz.qtySolicitada === 0 ? cubreTodo : false; continue; }
      const cubierto = Math.min(disp, pz.qtySolicitada);
      if (cubierto > 0) cubreAlgo = true;
      restante[pz.code] = disp - cubierto;
      const nuevaCant = pz.qtySolicitada - cubierto;
      if (nuevaCant > 0) cubreTodo = false;
      nuevasPiezas.push({ ...pz, qtySolicitada: nuevaCant });
    }
    if (!cubreAlgo) continue;
    if (cubreTodo) cancelar.push(pet.id);
    else ajustar.push({ id: pet.id, nuevasPiezas: nuevasPiezas.filter(p => p.qtySolicitada > 0) });
  }

  return { cancelar, ajustar, enTransito, restante };
}

// ── Validación de traspaso MANUAL (ERB-51531) ──────────────────────────────
// El flujo manual NO se reemplaza: solo se integran validaciones y advertencias.
export interface ContextoManual {
  estadoPedido: EstadoPedido;
  solicitudCancelada?: boolean;
  codigosEnTransito: string[];               // códigos con piezas ya enviadas para esa necesidad
  peticionesModificables: TraspasoPeticion[]; // peticiones auto/semi activas para los mismos códigos
  codigosSolicitados: { code: string; qty: number }[];
}

export function validateManualTransfer(ctx: ContextoManual): ReglaResultado & { impacto?: ImpactoPeticiones } {
  if (ctx.solicitudCancelada)
    return { ok: false, bloqueado: true, motivo: 'solicitud-cancelada', mensaje: MENSAJES_MANUAL.solicitudCancelada };
  if (ctx.estadoPedido === 'cancelado')
    return { ok: false, bloqueado: true, motivo: 'pedido-cancelado', mensaje: MENSAJES_MANUAL.pedidoCancelado };
  if (ctx.estadoPedido === 'facturado')
    return { ok: false, bloqueado: true, motivo: 'pedido-facturado', mensaje: MENSAJES_MANUAL.pedidoFacturado };

  const codigosDuplicadosEnTransito = ctx.codigosSolicitados.filter(c => ctx.codigosEnTransito.includes(c.code));
  if (codigosDuplicadosEnTransito.length > 0)
    return { ok: false, bloqueado: true, motivo: 'manual-sustituye', mensaje: MENSAJES_MANUAL.mercanciaEnTransito };

  if (ctx.peticionesModificables.length > 0) {
    const impacto = calcularImpactoPeticiones(ctx.peticionesModificables, ctx.codigosSolicitados);
    const n = impacto.cancelar.length + impacto.ajustar.length;
    if (n > 0)
      return { ok: true, advertencia: true, motivo: 'manual-sustituye', mensaje: MENSAJES_MANUAL.sustituyePeticiones(n), impacto };
  }
  return { ok: true };
}

// ── Validación de Urgencia CEDIS (ERB-51530) ───────────────────────────────
export interface ContextoUrgenciaCedis {
  pedidoOrigen: string;                       // obligatorio
  estadoPedido: EstadoPedido;
  pedidoUsadoEnOtraUrgencia?: boolean;        // ya usado para otra urgencia de la misma necesidad
  urgenciaDuplicada?: boolean;                // ya existe otra urgencia igual
  codigosEnTransito: string[];
  peticionesRelacionadas: TraspasoPeticion[]; // auto/semi relacionadas
  codigosSolicitados: { code: string; qty: number }[];
}

export function validateUrgentCedis(ctx: ContextoUrgenciaCedis): ReglaResultado & { impacto?: ImpactoPeticiones } {
  if (!ctx.pedidoOrigen)
    return { ok: false, bloqueado: true, mensaje: 'El pedido origen es obligatorio para una urgencia a CEDIS.' };
  if (ctx.estadoPedido === 'cancelado')
    return { ok: false, bloqueado: true, motivo: 'pedido-cancelado', mensaje: MENSAJES_MANUAL.pedidoCancelado };
  if (ctx.estadoPedido === 'facturado')
    return { ok: false, bloqueado: true, motivo: 'pedido-facturado', mensaje: MENSAJES_MANUAL.pedidoFacturado };
  if (ctx.pedidoUsadoEnOtraUrgencia)
    return { ok: false, bloqueado: true, mensaje: 'Este pedido ya se utilizó previamente para otra urgencia de la misma necesidad.' };
  if (ctx.urgenciaDuplicada)
    return { ok: false, bloqueado: true, mensaje: 'Ya existe una urgencia a CEDIS con la misma mercancía; no se permite duplicar.' };

  const impacto = calcularImpactoPeticiones(ctx.peticionesRelacionadas, ctx.codigosSolicitados);
  const n = impacto.cancelar.length + impacto.ajustar.length;
  if (n > 0 || impacto.enTransito.length > 0) {
    return { ok: true, advertencia: true, motivo: 'urgencia-cedis',
      mensaje: `Al confirmar la urgencia: se cancelarán ${impacto.cancelar.length} petición(es), ${impacto.ajustar.length} con ajuste parcial y ${impacto.enTransito.length} movimiento(s) en tránsito continuarán.`,
      impacto };
  }
  return { ok: true, impacto };
}

// Validación al SELECCIONAR el pedido para una urgencia CEDIS (ERB-51530).
// Bloquea: entregado/facturado, cancelado, ya usado en urgencia previa, o
// fuera de vigencia (pedido viejo). El cálculo de vigencia usa horas reales
// para evitar falsos positivos con pedidos recientes.
export function validarSeleccionPedidoUrgencia(ctx: {
  estado: EstadoPedido;
  usadoEnUrgencia: boolean;
  horasDesdeCaptura: number;
  vigenciaHoras: number;
}): ReglaResultado {
  if (ctx.estado === 'facturado')
    return { ok: false, bloqueado: true, motivo: 'pedido-facturado',
      mensaje: 'No es posible seleccionar este pedido: ya fue entregado/completado y la mercancía ya no es requerida.' };
  if (ctx.estado === 'cancelado')
    return { ok: false, bloqueado: true, motivo: 'pedido-cancelado',
      mensaje: 'No es posible seleccionar este pedido: el pedido origen fue cancelado.' };
  if (ctx.usadoEnUrgencia)
    return { ok: false, bloqueado: true,
      mensaje: 'No es posible seleccionar este pedido: ya se utilizó previamente para otra urgencia a CEDIS.' };
  if (ctx.horasDesdeCaptura > ctx.vigenciaHoras)
    return { ok: false, bloqueado: true,
      mensaje: `No es posible seleccionar este pedido: excede la vigencia máxima para urgencia (${ctx.vigenciaHoras} h).` };
  return { ok: true };
}

// Helper: deriva EstadoPedido desde el OrderStatus del proyecto principal.
export function estadoPedidoDesdeOrderStatus(status: string | undefined): EstadoPedido {
  if (status === 'Cancelado') return 'cancelado';
  if (status === 'Facturado') return 'facturado';
  return 'activo';
}
