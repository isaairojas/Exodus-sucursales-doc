// ============================================================
// APYMSA — Configuración central de reglas de Traspasos (SMC)
// Fuente funcional: ERB-42439, ERB-51528, ERB-51529, ERB-51530, ERB-51531
//
// Este archivo centraliza los parámetros y decisiones de negocio para
// evitar valores "mágicos" dispersos en componentes. Los puntos que Jira
// deja PENDIENTES se marcan explícitamente y se dejan fáciles de cambiar.
// ============================================================

// ── Regla transversal 1: máximo de evaluaciones por necesidad ──
// Petición original + hasta 2 adicionales = 3 en total. Nunca una cuarta.
export const MAX_EVALUACIONES_PETICION = 3;

// ── Token de autorización (pruebas) ──
// Los traspasos manuales SIN pedido de cliente y las solicitudes a CEDIS
// requieren un token/PIN de autorización. Para las pruebas siempre es "0000".
export const TOKEN_PRUEBA = '0000';
export const esTokenValido = (t: string) => t.trim() === TOKEN_PRUEBA;

// ── Umbral para agregar piezas recomendadas automáticamente ──
// Cuando el total del pedido NO supera este monto, las piezas recomendadas
// (alta rotación) se agregan al traspaso automáticamente, sin que el usuario
// las tenga que elegir. Si el pedido supera el monto, el usuario decide.
export const UMBRAL_AUTO_RECOMENDADOS = 2000;

// ── SLA de traspasos (control de tiempos) ──
// Un traspaso sin enviarse se considera "con demora" a partir de M días y
// "vencido" a partir de N días desde su creación. Parametrizable.
export const TRASPASO_DIAS_DEMORA = 5;   // M
export const TRASPASO_DIAS_VENCIDO = 10; // N (configurado de momento en 10)

// En "Traspasos por recibir" el vencido usa un parámetro más estricto: una
// petición que sigue PENDIENTE POR SURTIR se considera vencida a partir de este
// número de días desde su creación (básicamente 1 día).
export const TRASPASO_DIAS_VENCIDO_SURTIDO = 1;

// Los traspasos de CEDIS son de recepción CIEGA (no se ve la cantidad enviada);
// solo se mide si están vencidos con su propio parámetro (días desde creación
// sin que la sucursal les dé entrada).
export const TRASPASO_DIAS_VENCIDO_CEDIS = 3;

// ── PENDIENTE ERB-51528 ──
// Aún no está definido por negocio si el recálculo por surtido parcial se
// dispara al FINALIZAR SURTIDO o al FINALIZAR REVISIÓN. NO se oculta esta
// ambigüedad: se centraliza aquí para poder cambiarla en un solo lugar.
// Para la demostración solicitada, el resultado debe poder verse dentro del
// flujo de Traspasos tras una revisión exitosa; por eso el default es 'revision'.
export type DisparadorRecalculo = 'surtido' | 'revision';
export const DISPARADOR_RECALCULO_PARCIAL: DisparadorRecalculo = 'revision'; // TODO ERB-51528: confirmar con negocio

// ── PENDIENTE ERB-51530 ──
// La vigencia máxima del pedido para Urgencia CEDIS es parametrizable y su
// valor definitivo está pendiente. Se usa una constante identificada, no un
// valor mágico disperso.
export const PEDIDO_VIGENCIA_URGENCIA_HORAS = 72; // TODO ERB-51530: valor definitivo pendiente

// ── PENDIENTE ERB-51531 ──
// Si solo una parte de la mercancía está en tránsito, falta confirmar con
// negocio si el sistema ajusta automáticamente la cantidad disponible para el
// nuevo movimiento manual o si el usuario corrige manualmente la captura.
// No se cierra la decisión de forma irreversible: se expone como bandera.
export type AjusteParcialEnTransito = 'automatico' | 'manual';
export const AJUSTE_PARCIAL_EN_TRANSITO: AjusteParcialEnTransito = 'manual'; // TODO ERB-51531: confirmar con negocio

// Lista de TODOs de negocio pendientes (para el resumen entregable).
export const TODOS_NEGOCIO_PENDIENTES = [
  { jira: 'ERB-51528', tema: 'Disparador de recálculo por surtido parcial (surtido vs revisión)', config: 'DISPARADOR_RECALCULO_PARCIAL' },
  { jira: 'ERB-51530', tema: 'Vigencia máxima del pedido para Urgencia CEDIS', config: 'PEDIDO_VIGENCIA_URGENCIA_HORAS' },
  { jira: 'ERB-51531', tema: 'Ajuste automático vs manual cuando solo una parte está en tránsito', config: 'AJUSTE_PARCIAL_EN_TRANSITO' },
] as const;
