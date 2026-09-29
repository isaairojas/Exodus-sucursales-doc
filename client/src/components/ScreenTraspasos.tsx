// ============================================================
// APYMSA — ScreenTraspasos
// Gestión de traspasos de mercancía: vista unificada estilo almacén
// (entre sucursales + CEDIS en una sola tabla, por Tipo Pendiente/Recibir)
// Design: Enterprise Precision
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoTipo, TraspasoPeticion, TraspasoStatus, TRASPASO_CATEGORIA_LABELS,
  SUCURSAL_ALMACEN_CODIGOS, formatFechaCorta, CEDIS_SUBTIPO_COLORS, TRASPASO_CATEGORIA_COLORS,
  etapaTraspaso,
  TRASPASO_ETAPA_COLORS, perspectivaTraspaso, MOTIVO_ENVIO_CEDIS_COLORS,
  TRASPASO_ETAPA_TOOLTIP, TRASPASO_CATEGORIA_TOOLTIP, PRODUCT_CATALOG,
  esConsolidadorIntermedio, peticionesDependientesDe, peticionesDependientesPendientesDe, puedeSurtirPeticion,
  embarquesCompatiblesParaTraspaso, tipoPaqueteriaDe,
  DocumentacionPorPedido, SUCURSAL_COORDS,
  embarqueAtorado, horasSinMovimiento, cotizacionCaducada,
} from '@/lib/data';
import ModalDocumentacionCajas from './ModalDocumentacionCajas';
import ModalCotizador from './ModalCotizador';
import MiniMapaRuta from './MiniMapaRuta';
import { imprimirEmbarque } from '@/lib/printEmbarque';
import { exportarExcel } from '@/lib/exportExcel';
import { imprimirTraspaso } from '@/lib/printDoc';
import { TRASPASO_DIAS_VENCIDO_SURTIDO, TRASPASO_DIAS_VENCIDO_CEDIS } from '@/lib/traspasoConfig';
import ModalTraspasoDetail from './ModalTraspasoDetail';
import ModalSurtidoHH from './ModalSurtidoHH';
import ModalRevisionHH from './ModalRevisionHH';
import ModalConfirmarRecepcion from './ModalConfirmarRecepcion';
import ModalEmbarcarTraspaso from './ModalEmbarcarTraspaso';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  tipoFilter: TraspasoTipo;
  onNuevaSolicitud?: () => void;
  onSolicitarCedis?: () => void;
  onEnviarCedis?: () => void;
  onReasignar?: (petId: string) => void;
  onVerPedido?: (pedidoId: string) => void;
  // Navega a la ventana de Embarques con el embarque preseleccionado para
  // continuar con la documentación (flujo post-revisión).
  onVerEmbarque?: (embarqueId: string) => void;
}

const TODAY = new Date().toISOString().slice(0, 10);

// Rango por defecto: día actual hasta 1 mes atrás (los traspasos vigentes
// siempre están en esa ventana; los más antiguos son consultas puntuales).
const _now = new Date();
const _desde = new Date(_now.getTime() - 30 * 86_400_000);
const MONTH_START = `${_desde.getFullYear()}-${String(_desde.getMonth() + 1).padStart(2, '0')}-${String(_desde.getDate()).padStart(2, '0')}`;
const MONTH_END = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

type FilterTipo = 'ALL' | 'Automático' | 'Manual' | 'CEDIS-Reabasto' | 'CEDIS-Reabasto-Unificado' | 'CEDIS-Urgencia' | 'CEDIS-Especial' | 'Envio-Devolucion' | 'Envio-AjusteInventario';

// Paleta estable para agrupar visualmente las peticiones de una misma
// solicitud (comparten color de acento para leerse como un mismo grupo).
const GROUP_COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#db2777', '#0891b2', '#65a30d', '#9333ea'];

// ── SLA / control de tiempos ──
// Estatus previos a "Enviado": el retraso (vencido) se hereda mientras la
// petición no salga (pasa de Pendiente → Surtido → Revisado → Documentado
// conservando la marca de vencida hasta que se envía).
const PRE_ENVIADO_STATUS: TraspasoStatus[] = ['Pendiente', 'Surtido', 'Revisado', 'Documentado'];
// Estatus "surtido/revisado pero aún sin enviar" (pendientes por envío).
// Pendiente por envío = revisado/documentado sin enviar (documentación pendiente).
// Status que cuentan como "Pendiente de envío" cuando además el traspaso YA
// tiene embarque asignado (embarqueId presente). Ver card en buildCardDefs.
// 'Embarcado' entra aquí porque tiene embarque pero aún no completó
// documentación; 'Documentado' porque tiene todo listo pero aún no ha salido.
// 'Revisado' queda porque puede llegar con embarqueId de una unificación.
const PENDIENTE_ENVIO_STATUS: TraspasoStatus[] = ['Revisado', 'Embarcado', 'Documentado'];
function diasDesdeCreacion(fechaIso: string): number {
  const t = new Date(fechaIso.replace(' ', 'T')).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}
// Vencido: en traspasos entre sucursales, la petición sigue por surtir y pasó el
// parámetro (1 día). En CEDIS (recepción ciega) se mide con su propio parámetro:
// sigue sin recibirse y ya pasaron los días del SLA de CEDIS.
const CEDIS_NO_RECIBIDO: TraspasoStatus[] = ['Pendiente', 'Documentado', 'Enviado'];
function esVencidoSurtir(t: TraspasoPeticion): boolean {
  // Los drafts (pendientes de aprobación de token) no cuentan para SLA.
  if (t.esDraft) return false;
  if (t.categoria === 'CEDIS') {
    return CEDIS_NO_RECIBIDO.includes(t.status) && diasDesdeCreacion(t.fechaCreacion) >= TRASPASO_DIAS_VENCIDO_CEDIS;
  }
  // El "retraso" se hereda mientras la petición no se envíe (Pendiente → Surtido
  // → Revisado → Documentado). Al pasar a Enviado/Finalizados ya no aplica.
  return PRE_ENVIADO_STATUS.includes(t.status) && diasDesdeCreacion(t.fechaCreacion) >= TRASPASO_DIAS_VENCIDO_SURTIDO;
}
// Parcialidad activa: la petición está marcada como parcial y todavía en el
// pipeline (no en Finalizados/Entregado ni Cancelado). Se muestra como badge
// azul en las cards que la contengan (mismo esquema que el badge de vencidos).
function tieneParcialidadActiva(t: TraspasoPeticion): boolean {
  return !!t.parcial && t.status !== 'Entregado' && t.status !== 'Cancelado';
}
interface SlaTag { label: string; icon: string; color: string; }
// Etiquetas SLA de una petición (puede tener varias a la vez: p.ej. vencido +
// surtido parcial + revisado parcial). El "estado" queda aparte.
// Se muestran como iconos (mismos iconos que las cards) con tooltip.
// CEDIS es recepción ciega: solo se indica si está vencido (no parcialidades).
function slaTags(t: TraspasoPeticion): SlaTag[] {
  const tags: SlaTag[] = [];
  const dias = diasDesdeCreacion(t.fechaCreacion);
  if (esVencidoSurtir(t)) tags.push({ label: t.categoria === 'CEDIS' ? `Vencido (${dias} días · SLA CEDIS)` : `Vencido (${dias} día(s) por surtir)`, icon: 'event_busy', color: '#dc2626' });
  if (t.categoria === 'CEDIS') return tags;
  if (t.parcial && ['Surtido', 'Revisado', 'Documentado', 'Enviado', 'Recibido', 'Entregado'].includes(t.status)) tags.push({ label: 'Surtido con parcialidad', icon: 'splitscreen', color: '#1B3892' });
  if (t.parcial && ['Revisado', 'Documentado', 'Enviado', 'Recibido', 'Entregado'].includes(t.status)) tags.push({ label: 'Revisado con parcialidad', icon: 'fact_check', color: '#7c3aed' });
  if (t.status === 'Cancelado' && t.resultado === 'rechazada') tags.push({ label: 'Rechazado', icon: 'block', color: '#dc2626' });
  if (t.status === 'Cancelado' && t.resultado !== 'rechazada') tags.push({ label: 'Cancelado', icon: 'do_not_disturb_on', color: '#6b7280' });
  return tags;
}

// Cards de control = filtros. Cada una define su predicado; al hacer click filtra
// dentro de la respuesta ya filtrada. "Vencidos" ya no es una card: los vencidos
// se muestran como un indicador en las otras cards (badge rojo con conteo).
interface CardDef { key: string; label: string; sub: string; color: string; icon: string; match: (t: TraspasoPeticion) => boolean; }
// Etiquetas con salto de línea explícito para que las cards queden angostas.
// El div del label usa whiteSpace: 'pre-line' para respetar los "\n".
function buildCardDefs(tipo: TraspasoTipo): CardDef[] {
  const base: CardDef[] = [
    { key: 'pendientesSurtir', label: 'Pendientes\npor surtir', sub: 'aún sin surtir', color: '#d97706', icon: 'package_2',
      match: t => t.status === 'Pendiente' },
    { key: 'pendienteRevision', label: 'Pendiente\nrevisión', sub: 'surtido, por revisar', color: '#7c3aed', icon: 'fact_check',
      match: t => t.status === 'Surtido' },
    // Pendiente de embarque: cualquier traspaso que aún NO tiene embarque
    // asignado (embarqueId vacío) y ya pasó las etapas de surtir/revisar.
    // Es el estado justo antes de "Embarcar". Cubre principalmente Revisado
    // sin embarque, pero también Documentado/Embarcado sin embarqueId (caso
    // defensivo). Excluye Pendiente/Surtido (los cubren las cards previas)
    // y estados finales.
    { key: 'embarcadosSinDocumentar', label: 'Pendiente\nde embarque', sub: 'sin embarque asignado', color: '#ea580c', icon: 'inventory_2',
      match: t => !t.embarqueId
        && t.status !== 'Pendiente'
        && t.status !== 'Surtido'
        && t.status !== 'Cancelado'
        && t.status !== 'Enviado'
        && t.status !== 'EntregadoAPaqueteria'
        && t.status !== 'RepartoFinalizado'
        && t.status !== 'Recibido'
        && t.status !== 'Entregado' },
    // Pendiente de envío = ya tiene embarque asignado pero aún no ha salido.
    // (Revisado o Documentado + embarqueId presente, y no marcado Enviado.)
    { key: 'pendientesEnvio', label: 'Pendiente\nde envío', sub: 'con embarque, listo por salir', color: '#0d9488', icon: 'outbox',
      match: t => !!t.embarqueId && PENDIENTE_ENVIO_STATUS.includes(t.status) },
    { key: 'enviados', label: 'Entregados a\npaquetería', sub: 'en tránsito con la paquetería', color: '#2563eb', icon: 'local_shipping',
      match: t => t.status === 'Enviado' || t.status === 'EntregadoAPaqueteria' || t.status === 'RepartoFinalizado' },
  ];
  // "Confirmación de recepción" solo aplica en Por recibir: la sucursal ya
  // confirmó físicamente la recepción, falta darle entrada al inventario.
  if (tipo === 'Entrante') {
    base.push({ key: 'confirmacionRecepcion', label: 'Confirmación\nde recepción', sub: 'esperan dar entrada', color: '#0891b2', icon: 'how_to_reg',
      match: t => t.status === 'Recibido' });
  }
  base.push(
    { key: 'finalizados', label: 'Finalizados', sub: 'con entrada al inventario', color: '#16a34a', icon: 'inventory',
      match: t => t.status === 'Entregado' || (tipo === 'Saliente' && t.status === 'Recibido') },
    { key: 'rechazadosCancelados', label: 'Rechazados/\nCancelados', sub: 'para consulta', color: '#dc2626', icon: 'cancel',
      match: t => t.status === 'Cancelado' },
  );
  return base;
}

// Pipeline de una petición y su posición actual. Devuelve una barra segmentada
// para mostrar visualmente en qué etapa está el traspaso.
// Pipeline extendido a 8 pasos con Embarcado, EntregadoAPaqueteria y
// RepartoFinalizado como pasos intermedios entre Revisado y Recibido/Entregado.
const PIPELINE_SUCURSAL: TraspasoStatus[] = ['Pendiente', 'Surtido', 'Revisado', 'Embarcado', 'Documentado', 'EntregadoAPaqueteria', 'RepartoFinalizado', 'Recibido', 'Entregado'];
const PIPELINE_CEDIS:    TraspasoStatus[] = ['Pendiente', 'Documentado', 'EntregadoAPaqueteria', 'RepartoFinalizado', 'Recibido', 'Entregado'];
function pipelineDe(t: TraspasoPeticion): TraspasoStatus[] {
  return t.categoria === 'CEDIS' ? PIPELINE_CEDIS : PIPELINE_SUCURSAL;
}
function avanceDe(t: TraspasoPeticion): { step: number; total: number; pct: number } {
  const p = pipelineDe(t);
  // Normalización de legado: 'Enviado' se mapea a 'EntregadoAPaqueteria' para
  // que datos previos al refactor sigan encontrando su posición en el pipeline.
  const statusNorm: TraspasoStatus = t.status === 'Enviado' ? 'EntregadoAPaqueteria' : t.status;
  const idx = p.indexOf(statusNorm);
  const step = idx < 0 ? 0 : idx + 1;
  const total = p.length;
  return { step, total, pct: Math.round((step / total) * 100) };
}

function porcentajeColor(pct: number) {
  if (pct >= 100) return '#16a34a';
  if (pct >= 50) return '#d97706';
  if (pct > 0) return '#d97706';
  return '#9ca3af';
}

// Recibido/Enviado: CEDIS se cuenta por cajas, entre sucursales por piezas.
// `tipoEfectivo` es la perspectiva (Entrante/Saliente) de la sucursal actual.
function calcularRecibido(t: TraspasoPeticion, tipoEfectivo: TraspasoTipo) {
  const totalSolicitada = t.piezas.reduce((sum, p) => sum + p.qtySolicitada, 0);

  if (t.categoria === 'CEDIS') {
    const estatus: 'En camino' | 'Recibido' = t.cajasTotal > 0 && t.cajasRecibidas >= t.cajasTotal ? 'Recibido' : 'En camino';
    return { num: t.cajasRecibidas, den: t.cajasTotal, unidad: 'cajas' as const, estatus };
  }

  if (tipoEfectivo === 'Saliente') {
    // Aquí qtySurtida sí representa lo que esta sucursal ha surtido/enviado hasta ahora.
    const totalSurtida = t.piezas.reduce((sum, p) => sum + p.qtySurtida, 0);
    const estatus: 'En camino' | 'Recibido' = totalSolicitada > 0 && totalSurtida >= totalSolicitada ? 'Recibido' : 'En camino';
    return { num: totalSurtida, den: totalSolicitada, unidad: 'piezas' as const, estatus };
  }

  // Entrante entre sucursales: antes de "Dar entrada", qtySurtida es lo que la sucursal
  // donante ya surtió/envió (no lo que nosotros hemos recibido) — solo cuenta como
  // recibido una vez que el estatus avanzó a 'Recibido'.
  const yaRecibido = t.status === 'Recibido' || t.status === 'Entregado';
  const totalRecibida = yaRecibido ? t.piezas.reduce((sum, p) => sum + p.qtySurtida, 0) : 0;
  const estatus: 'En camino' | 'Recibido' = yaRecibido && totalSolicitada > 0 && totalRecibida >= totalSolicitada ? 'Recibido' : 'En camino';
  return { num: totalRecibida, den: totalSolicitada, unidad: 'piezas' as const, estatus };
}

export default function ScreenTraspasos({ showToast, tipoFilter, onNuevaSolicitud, onSolicitarCedis, onEnviarCedis, onReasignar, onVerPedido, onVerEmbarque }: Props) {
  const { traspasos, sucursalActual, reasignarPeticion, generarSolicitudRestante, darEntradaInventario, embarquesTraspaso, crearEmbarqueParaTraspaso, agregarTraspasoAEmbarque, guardarDocumentacionEmbarque, generarGuiaPaqueteria, confirmarEntregadoAPaqueteriaManual, confirmarRepartoFinalizado, cancelarEmbarque, duplicarEmbarque } = useApp();

  // Perspectiva desde la sucursal actual: un traspaso es "Por enviar"/"Por recibir"
  // según sea su origen o su destino. Solo se ven los que involucran a la sucursal.
  const traspasosDelTipo = useMemo(
    () => traspasos.filter(t => {
      const per = perspectivaTraspaso(t, sucursalActual);
      return per.visible && per.tipo === tipoFilter;
    }),
    [traspasos, tipoFilter, sucursalActual]
  );

  const sucursalPrefix = tipoFilter === 'Entrante' ? 'De: ' : 'A: ';

  // Etiquetas de columna: la tabla es una recepción (Entrante) o un envío (Saliente)
  const colFechaSegunda = tipoFilter === 'Entrante' ? 'Fecha Arribo' : 'Fecha Envío';
  // Antes "Enviado" (Saliente) / "Recibido" (Entrante). Unificado como "Piezas"
  // porque el valor mostrado es siempre el conteo de piezas (num/den unidad).
  const colRecibido = 'Piezas';
  // Columnas de la tabla. En "Por enviar" (Saliente) se ocultan "Solicitud"
  // y "Pedido cliente" — el donante consulta esa info desde el DETALLE.
  // En "Por recibir" (Entrante) se mantienen para trazabilidad del solicitante.
  const COLUMNS = tipoFilter === 'Saliente'
    ? ['Tipo', 'Petición ID', 'Almacén', 'No. Papeleta', 'Fecha traspaso', colFechaSegunda, colRecibido, 'Embarque', 'Estatus', 'SLA']
    : ['Tipo', 'Solicitud', 'Almacén', 'Pedido cliente', 'No. Papeleta', 'Fecha traspaso', colFechaSegunda, colRecibido, 'Embarque', 'Estatus', 'SLA'];

  // Filtros — al entrar: mes en curso y SIN filtros de estado/etapa
  // Estado aplicado al filtro (se actualiza SOLO cuando el usuario pulsa
  // "Filtrar"). Los inputs editan un `draft` — el filtro no se recalcula
  // hasta que el usuario confirme el cambio.
  const [fechaInicial, setFechaInicial] = useState(MONTH_START);
  const [fechaFinal, setFechaFinal] = useState(MONTH_END);
  const [fechaInicialDraft, setFechaInicialDraft] = useState(MONTH_START);
  const [fechaFinalDraft, setFechaFinalDraft] = useState(MONTH_END);
  const hayCambiosFecha = fechaInicial !== fechaInicialDraft || fechaFinal !== fechaFinalDraft;
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('ALL');
  const [searchText, setSearchText] = useState('');
  // Búsqueda dinámica: el usuario elige por qué campo buscar (papeleta por defecto).
  // F31 — Añadida búsqueda por embarque/guía.
  type CampoBusqueda = 'papeleta' | 'pedido' | 'peticion' | 'solicitud' | 'embarque' | 'guia';
  const [searchField, setSearchField] = useState<CampoBusqueda>('papeleta');
  // Sort manual por columna: null = default (agrupado por solicitud).
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (col: string) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    // asc → desc → null (limpia el sort y vuelve al agrupado por solicitud)
    setSortCol(null);
  };
  const [cardFilter, setCardFilter] = useState<string | null>(null); // card de control activa (filtra la respuesta)

  // Selección de fila
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modales
  const [detailPetId, setDetailPetId] = useState<string | null>(null);
  const [surtirPetId, setSurtirPetId] = useState<string | null>(null);
  // Bloqueo de surtido: aparece cuando el usuario intenta surtir una petición
  // consolidadora intermedia con dependencias aún no Entregadas.
  const [bloqueoSurtidoPetId, setBloqueoSurtidoPetId] = useState<string | null>(null);
  const [revisarPetId, setRevisarPetId] = useState<string | null>(null);
  const [recepcionPetId, setRecepcionPetId] = useState<string | null>(null);
  const [embarcarPetId, setEmbarcarPetId] = useState<string | null>(null);
  // F6/F7 — documentar embarque (abre modal de pesado + cotizador).
  const [documentarEmbarqueId, setDocumentarEmbarqueId] = useState<string | null>(null);
  // F50 — loading state para botón "Generar guía"
  const [generandoGuiaId, setGenerandoGuiaId] = useState<string | null>(null);
  // Estado de carga para el botón "Refrescar" (simula consulta al servidor).
  const [refrescando, setRefrescando] = useState(false);
  // Estados intermedios del flujo documentar → cotizar → aceptar.
  const [documentacionDraft, setDocumentacionDraft] = useState<DocumentacionPorPedido[] | null>(null);
  const [modoPesoDraft, setModoPesoDraft] = useState<'Consolidado' | 'CadaCajaSeparado'>('Consolidado');
  // Prompt de continuación del flujo continuo (surtido → revisión → embarque
  // en Por enviar; recepción → dar entrada en Por recibir).
  const [continueFlow, setContinueFlow] = useState<{ petId: string; next: 'revisar' | 'embarcar' | 'entrada'; origenManual?: boolean } | null>(null);
  // Sub-fases del flujo post-revisión (solo aplica cuando next === 'embarcar').
  type FaseEmb = 'inicio' | 'elegir' | 'confirmarCreacion' | 'exito';
  const [faseEmb, setFaseEmb] = useState<FaseEmb>('inicio');
  const [embarqueResultado, setEmbarqueResultado] = useState<{ id: string; unificado: boolean } | null>(null);

  const selectedPeticion = useMemo(
    () => traspasos.find(t => t.id === selectedId) ?? null,
    [traspasos, selectedId]
  );

  const detailPeticion = useMemo(
    () => traspasos.find(t => t.id === detailPetId) ?? null,
    [traspasos, detailPetId]
  );

  const surtirPeticion = useMemo(
    () => traspasos.find(t => t.id === surtirPetId) ?? null,
    [traspasos, surtirPetId]
  );

  const revisarPeticion = useMemo(
    () => traspasos.find(t => t.id === revisarPetId) ?? null,
    [traspasos, revisarPetId]
  );

  const recepcionPeticion = useMemo(
    () => traspasos.find(t => t.id === recepcionPetId) ?? null,
    [traspasos, recepcionPetId]
  );

  const embarcarPeticion = useMemo(
    () => traspasos.find(t => t.id === embarcarPetId) ?? null,
    [traspasos, embarcarPetId]
  );

  // Filtrado principal
  const filteredTraspasos = useMemo(() => {
    return traspasosDelTipo.filter(t => {
      if (filterTipo === 'CEDIS-Reabasto') {
        // Reabasto "puro" (sin mercancía unificada de un pedido).
        if (!(t.categoria === 'CEDIS' && t.subtipoCedis === 'Reabasto' && !t.reabastoUnifica?.length)) return false;
      } else if (filterTipo === 'CEDIS-Reabasto-Unificado') {
        if (!(t.categoria === 'CEDIS' && t.subtipoCedis === 'Reabasto' && !!t.reabastoUnifica?.length)) return false;
      } else if (filterTipo === 'CEDIS-Urgencia') {
        if (!(t.categoria === 'CEDIS' && t.subtipoCedis === 'Urgencia')) return false;
      } else if (filterTipo === 'CEDIS-Especial') {
        if (!(t.categoria === 'CEDIS' && t.subtipoCedis === 'Especial')) return false;
      } else if (filterTipo === 'Envio-Devolucion') {
        if (t.motivoEnvioCedis !== 'Devolución') return false;
      } else if (filterTipo === 'Envio-AjusteInventario') {
        if (t.motivoEnvioCedis !== 'Ajuste de inventario') return false;
      } else if (filterTipo === 'Manual') {
        // Manual "puro" — excluye envíos a CEDIS (que también son categoría Manual
        // pero llevan motivoEnvioCedis y tienen su propio filtro).
        if (t.categoria !== 'Manual' || !!t.motivoEnvioCedis) return false;
      } else if (filterTipo !== 'ALL' && t.categoria !== filterTipo) {
        return false;
      }
      const fechaDate = t.fechaCreacion.slice(0, 10);
      if (fechaInicial && fechaDate < fechaInicial) return false;
      if (fechaFinal && fechaDate > fechaFinal) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        // Búsqueda dinámica: se aplica SOLO al campo seleccionado por el usuario.
        const embarqueT = t.embarqueId ? embarquesTraspaso.find(e => e.id === t.embarqueId) : undefined;
        const field =
          searchField === 'papeleta'  ? t.noPapeleta :
          searchField === 'pedido'    ? (t.pedidoOrigen ?? '') :
          searchField === 'peticion'  ? t.id :
          searchField === 'embarque'  ? (t.embarqueId ?? '') :
          searchField === 'guia'      ? (embarqueT?.guiaId ?? '') :
          /* solicitud */               t.solicitudId;
        if (!field.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [traspasosDelTipo, filterTipo, fechaInicial, fechaFinal, searchText, searchField, sucursalActual, embarquesTraspaso]);

  // Cards del tab actual (Por enviar / Por recibir).
  const cardDefs = useMemo(() => buildCardDefs(tipoFilter), [tipoFilter]);

  // Conteo por card sobre la RESPUESTA ya filtrada (no el universo).
  const cardCounts = useMemo(() => {
    const c: Record<string, number> = {};
    cardDefs.forEach(def => { c[def.key] = filteredTraspasos.filter(def.match).length; });
    return c;
  }, [filteredTraspasos, cardDefs]);


  // Vencidos por card: indicador (badge rojo) que muestra cuántos de esa card
  // están vencidos. En "Finalizados" no aplica (ya salieron del pipeline).
  const vencidosPorCard = useMemo(() => {
    const v: Record<string, number> = {};
    cardDefs.forEach(def => {
      if (def.key === 'finalizados') { v[def.key] = 0; return; }
      v[def.key] = filteredTraspasos.filter(t => def.match(t) && esVencidoSurtir(t)).length;
    });
    return v;
  }, [filteredTraspasos, cardDefs]);
  // Parciales por card: indicador (badge azul) — reemplaza a la antigua card
  // "Surtido con parcialidad". Tampoco aplica en "Finalizados".
  const parcialesPorCard = useMemo(() => {
    const p: Record<string, number> = {};
    cardDefs.forEach(def => {
      if (def.key === 'finalizados') { p[def.key] = 0; return; }
      p[def.key] = filteredTraspasos.filter(t => def.match(t) && tieneParcialidadActiva(t)).length;
    });
    return p;
  }, [filteredTraspasos, cardDefs]);

  // Al activar una card/filtro, se filtra dentro de la respuesta ya filtrada.
  const filteredConCard = useMemo(() => {
    if (!cardFilter) return filteredTraspasos;
    const def = cardDefs.find(d => d.key === cardFilter);
    return def ? filteredTraspasos.filter(def.match) : filteredTraspasos;
  }, [filteredTraspasos, cardFilter, cardDefs]);

  // Agrupación por solicitud: las peticiones de una misma solicitud se ordenan
  // juntas y comparten un color de acento, para que siempre se vean como grupo.
  // Extractor de valor por columna para el sort manual.
  const sortValue = (t: TraspasoPeticion, col: string): string | number => {
    const per = perspectivaTraspaso(t, sucursalActual);
    switch (col) {
      case 'Tipo':           return t.motivoEnvioCedis ?? (t.categoria === 'CEDIS' && t.subtipoCedis ? t.subtipoCedis : t.categoria);
      case 'Solicitud':      return `${t.solicitudId}-${t.id}`;
      case 'Petición ID':    return t.id;
      case 'Almacén':        return per.contraparte;
      case 'Pedido cliente': return t.pedidoOrigen || 'zzz';
      case 'No. Papeleta':   return t.noPapeleta;
      case 'Fecha traspaso': return t.fechaCreacion;
      case 'Fecha Arribo':
      case 'Fecha Envío':    return t.fechaArribo ?? '';
      case 'Piezas':         return calcularRecibido(t, per.tipo).num;
      case 'Embarque':       return t.embarqueId || 'zzz';
      case 'Estatus':return avanceDe(t).step;
      case 'SLA':            return slaTags(t).length; // más tags = "menos en tiempo"
      default:               return '';
    }
  };

  const { rows, solCount, solColor } = useMemo(() => {
    // Sort por defecto: agrupado por solicitud. Si hay sort manual, se respeta.
    let arr: TraspasoPeticion[];
    if (sortCol) {
      arr = [...filteredConCard].sort((a, b) => {
        const va = sortValue(a, sortCol);
        const vb = sortValue(b, sortCol);
        let cmp = 0;
        if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
        else cmp = String(va).localeCompare(String(vb));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    } else {
      // F34 — Los embarques atorados suben al top.
      const atoradoDe = (t: TraspasoPeticion) => {
        const e = t.embarqueId ? embarquesTraspaso.find(x => x.id === t.embarqueId) : undefined;
        return e && embarqueAtorado(e);
      };
      arr = [...filteredConCard].sort((a, b) => {
        const aA = atoradoDe(a) ? 0 : 1;
        const bA = atoradoDe(b) ? 0 : 1;
        if (aA !== bA) return aA - bA;
        return a.solicitudId === b.solicitudId
          ? (a.intento ?? 0) - (b.intento ?? 0)
          : a.solicitudId.localeCompare(b.solicitudId);
      });
    }
    const count: Record<string, number> = {};
    arr.forEach(t => { count[t.solicitudId] = (count[t.solicitudId] ?? 0) + 1; });
    const color: Record<string, string> = {};
    let ci = 0;
    arr.forEach(t => {
      if (color[t.solicitudId] || count[t.solicitudId] <= 1) return;
      color[t.solicitudId] = GROUP_COLORS[ci % GROUP_COLORS.length];
      ci++;
    });
    return { rows: arr, solCount: count, solColor: color };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredConCard, sortCol, sortDir, sucursalActual]);

  const handleClearFilters = () => {
    setFechaInicial(MONTH_START);
    setFechaFinal(MONTH_END);
    setFechaInicialDraft(MONTH_START);
    setFechaFinalDraft(MONTH_END);
    setFilterTipo('ALL');
    setSearchText('');
    setCardFilter(null);
  };
  const aplicarFiltros = () => {
    setFechaInicial(fechaInicialDraft);
    setFechaFinal(fechaFinalDraft);
  };

  // Exporta a Excel lo que se ve en la tabla (filtrada) + el desglose de piezas.
  const handleExportExcel = () => {
    const tabla = rows.map(t => {
      const per = perspectivaTraspaso(t, sucursalActual);
      const { num, den, unidad } = calcularRecibido(t, per.tipo);
      const tipo = t.motivoEnvioCedis ?? (t.categoria === 'CEDIS' && t.subtipoCedis ? t.subtipoCedis : TRASPASO_CATEGORIA_LABELS[t.categoria]);
      return {
        Tipo: tipo,
        // El Excel conserva Solicitud y Pedido cliente para trazabilidad
        // aunque la tabla ya no los muestre — el detalle sigue teniéndolos.
        Solicitud: t.solicitudId,
        'Petición ID': t.id,
        Almacén: `${per.tipo === 'Entrante' ? 'De: ' : 'A: '}${per.contraparte}`,
        'Pedido cliente': t.pedidoOrigen || 'Sin pedido',
        'No. papeleta': t.noPapeleta,
        'Fecha traspaso': formatFechaCorta(t.fechaCreacion),
        [colRecibido]: `${num}/${den} ${unidad}`,
        Embarque: t.embarqueId || 'Sin embarque',
        Estado: etapaTraspaso(t.status),
        SLA: slaTags(t).map(s => s.label).join(', ') || 'En tiempo',
      };
    });
    const piezas = rows.flatMap(t => t.piezas.map(p => ({
      Traspaso: t.id,
      Solicitud: t.solicitudId,
      Código: p.code,
      Descripción: PRODUCT_CATALOG[p.code]?.name ?? p.code,
      Solicitado: p.qtySolicitada,
      Surtido: p.qtySurtida,
    })));
    exportarExcel(`traspasos_${tipoFilter === 'Entrante' ? 'por_recibir' : 'por_enviar'}_${sucursalActual}`, [
      { nombre: 'Traspasos', filas: tabla },
      { nombre: 'Piezas (detalle)', filas: piezas },
    ]);
    showToast(`Exportados ${rows.length} traspasos a Excel.`, 'success');
  };

  const handleRowClick = (id: string) => setSelectedId(prev => prev === id ? null : id);
  const handleRowDoubleClick = (id: string) => setDetailPetId(id);

  // Lógica de botones de acción
  const sel = selectedPeticion;
  const canVerDetalle = !!sel;
  // CEDIS es recepción CIEGA: la sucursal NO surte/revisa/embarca un traspaso de
  // CEDIS (lo hace CEDIS). El surtido y el recálculo SMC no aplican a CEDIS; aquí
  // la única acción es "Confirmar recepción".
  const noEsCedis = !!sel && sel.categoria !== 'CEDIS';
  // Regla de negocio: SURTIR solo aplica en esta plataforma para traspasos
  // MANUALES (entre sucursales o hacia CEDIS: devolución/ajuste). Los
  // Automáticos SMC se surten desde la HH (botón deshabilitado + leyenda azul).
  // REVISAR y EMBARCAR sí se pueden hacer aquí para automáticos también — la
  // revisión asume que el surtido ya fue concluido en HH.
  const surtidoEnHH = !!sel && sel.categoria === 'Automático';
  const esSurtibleEnPlataforma = noEsCedis && !surtidoEnHH;
  const canSurtir = esSurtibleEnPlataforma && sel!.status === 'Pendiente';
  const canRevisar = noEsCedis && sel!.status === 'Surtido';
  const canEmbarcar = noEsCedis && sel!.status === 'Revisado';
  // Botones nuevos del refactor de embarque:
  const canDocumentar = noEsCedis && sel!.status === 'Embarcado';
  // Recotizar: solo mientras esté Documentado y aún no se haya generado guía
  // ni entregado a paquetería (después ya no tiene sentido cambiar).
  const embarqueSel = sel?.embarqueId ? embarquesTraspaso.find(e => e.id === sel.embarqueId) : undefined;
  const canRecotizar = !!sel && sel.status === 'Documentado' && !embarqueSel?.guiaId;
  const canGenerarGuia = !!sel && sel.status === 'Documentado' && tipoPaqueteriaDe(sel.metodoEnvio) === 'WebService';
  // Regla sep-2026: aplica tanto a Manual como a WebService — el logístico
  // confirma manualmente la entrega física a la paquetería.
  const canEntregadoAPaqueteria = !!sel && sel.status === 'Documentado' &&
    (tipoPaqueteriaDe(sel.metodoEnvio) === 'Manual' || tipoPaqueteriaDe(sel.metodoEnvio) === 'WebService');
  const canSolicitarReparto = !!sel && sel.status === 'Documentado' && (tipoPaqueteriaDe(sel.metodoEnvio) === 'Uber' || tipoPaqueteriaDe(sel.metodoEnvio) === 'BlueGo');
  const canConfirmarReparto = !!sel && sel.status === 'EntregadoAPaqueteria' && (tipoPaqueteriaDe(sel.metodoEnvio) === 'Manual' || tipoPaqueteriaDe(sel.metodoEnvio) === 'WebService');
  // Escenarios de recálculo por la sucursal solicitante:
  // - RECHAZADA en su totalidad  → REASIGNAR (asignar toda la mercancía a otra sucursal).
  // - REVISADA parcialmente      → GENERAR SOLICITUD por la mercancía restante.
  //   El surtido parcial NO da opción: solo se muestra el indicador de SLA (splitscreen).
  const faltanteDe = (t: TraspasoPeticion) => t.piezas.reduce((s, p) => s + Math.max(0, p.qtySolicitada - p.qtySurtida), 0);
  const esRechazadaTotal = !!sel && sel.status === 'Cancelado' && sel.resultado === 'rechazada';
  const esRevisadoParcial = !!sel && sel.parcial === true && sel.status === 'Revisado' && faltanteDe(sel) > 0;
  // El recálculo (reasignar / generar restante) SOLO existe en "Por recibir": lo
  // decide la sucursal que SOLICITÓ. En "Por enviar" la sucursal que ve el traspaso
  // es la que rechazó/surtió, así que esas opciones no aplican.
  const esPorRecibir = tipoFilter === 'Entrante';
  const canReasignar = esPorRecibir && !!sel && !sel.peticionSiguienteId && esRechazadaTotal;
  const canGenerarRestante = esPorRecibir && !!sel && !sel.peticionSiguienteId && esRevisadoParcial;

  const handleReasignar = () => {
    if (!sel) return;
    // Abre el modal de reasignación (opciones SMC 4.0). Si el contenedor no lo
    // provee, cae al comportamiento directo (reasignación automática por SMC).
    if (onReasignar) { onReasignar(sel.id); return; }
    const r = reasignarPeticion(sel.id);
    showToast(r.mensaje, r.ok ? 'success' : 'warning');
    if (r.ok) setSelectedId(null);
  };

  const handleGenerarRestante = () => {
    if (!sel) return;
    const r = generarSolicitudRestante(sel.id);
    showToast(r.mensaje, r.ok ? 'success' : 'warning');
    if (r.ok) setSelectedId(null);
  };

  // Reabasto de CEDIS es de recepción ciega: sin modal de escaneo, entrada directa.
  // Confirmar recepción: disponible cuando ya fue Enviado (por confirmar) o ya
  // Recibido (para cambiar completa/parcial; queda registro).
  const canConfirmarRecepcion = !!sel && (sel.status === 'Enviado' || sel.status === 'EntregadoAPaqueteria' || sel.status === 'RepartoFinalizado' || sel.status === 'Recibido');
  // Dar entrada al inventario: disponible cuando la petición ya se confirmó
  // (Recibido) y falta darle entrada. Pronto abrirá una ventana propia; por
  // ahora solo mueve la petición a Entregado (Finalizados).
  const canDarEntrada = !!sel && sel.status === 'Recibido';

  const btnEnabled = (active: boolean, bg: string) =>
    active
      ? { background: bg, color: '#fff', cursor: 'pointer', boxShadow: `0 2px 8px ${bg}55`, opacity: 1 }
      : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed', boxShadow: 'none', opacity: 0.6 };

  const btnOutline = (active: boolean) =>
    active
      ? { border: '1.5px solid #1a2b6b', color: '#1a2b6b', background: 'white', cursor: 'pointer' }
      : { border: '1.5px solid #e5e7eb', color: '#9ca3af', background: 'white', cursor: 'not-allowed', opacity: 0.6 };

  return (
    <div className="flex flex-col h-full" style={{ background: '#f4f6fa', fontFamily: 'Roboto, sans-serif' }}>

      {/* ── Header de vista actual — arriba de todo, neutro y legible.
             Sin colores llamativos: fondo blanco, borde inferior sutil.
             Icono de la vista (flecha), título grande, chip de perspectiva
             con la flecha y color propio (azul/morado), sucursal a la derecha
             como contexto secundario. */}
      <div
        className="flex items-center gap-3 px-6 py-2.5"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#1a2b6b' }}>swap_horiz</span>
        <h1 className="text-base font-extrabold" style={{ color: '#1a2b6b', letterSpacing: '0.2px' }}>Traspasos</h1>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold"
          style={{
            background: tipoFilter === 'Entrante' ? 'rgba(37,99,235,0.10)' : 'rgba(124,58,237,0.10)',
            color: tipoFilter === 'Entrante' ? '#2563eb' : '#7c3aed',
            border: `1px solid ${tipoFilter === 'Entrante' ? 'rgba(37,99,235,0.28)' : 'rgba(124,58,237,0.28)'}`,
          }}
          title="Vista actual del módulo de Traspasos"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            {tipoFilter === 'Entrante' ? 'call_received' : 'call_made'}
          </span>
          {tipoFilter === 'Entrante' ? 'Por recibir' : 'Por enviar'}
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: '#6b7280' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>store</span>
          <span className="font-semibold" style={{ color: '#374151' }}>{sucursalActual}</span>
        </div>
      </div>

      {/* ── Cards de control (filtros sobre la respuesta) ──
          Cada card muestra su conteo. Si alguno de sus registros está VENCIDO,
          se muestra un badge rojo (event_busy + conteo) en la esquina superior
          derecha; ya no existe una card "Vencidos" independiente. */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto items-center" style={{ background: '#f4f6fa', flexShrink: 0 }}>
        {cardDefs.map(c => {
          const val = cardCounts[c.key] ?? 0;
          const venc = vencidosPorCard[c.key] ?? 0;
          const parc = parcialesPorCard[c.key] ?? 0;
          const activa = cardFilter === c.key;
          const tip = activa ? 'Quitar filtro' :
            `Filtrar: ${c.label.replace(/\n/g, ' ')}` +
            (venc > 0 ? ` · ${venc} vencido${venc !== 1 ? 's' : ''}` : '') +
            (parc > 0 ? ` · ${parc} con parcialidad` : '');
          return (
            <button
              key={c.key}
              onClick={() => { setCardFilter(activa ? null : c.key); setSelectedId(null); }}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 flex-shrink-0 transition-all text-left relative"
              title={tip}
              style={{ background: activa ? `${c.color}12` : '#fff', border: `1.5px solid ${activa ? c.color : '#e5e7eb'}`, width: 108, height: 62, cursor: 'pointer' }}
            >
              <div className="flex items-center justify-center rounded-md" style={{ width: 24, height: 24, background: `${c.color}14`, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: c.color }}>{c.icon}</span>
              </div>
              {/* Cards compactas — label de máx. 2 líneas sin sub para reducir alto. */}
              <div className="flex-1 min-w-0">
                <span className="block text-base font-extrabold leading-none" style={{ color: val > 0 ? c.color : '#9ca3af' }}>{val}</span>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: '1.1', height: '2.2em', overflow: 'hidden' }}>{c.label}</div>
              </div>
              {/* Indicadores superpuestos: rojo (vencidos) y azul (parcialidad). */}
              {(venc > 0 || parc > 0) && (
                <div className="absolute flex items-center gap-1" style={{ top: -6, right: -6 }}>
                  {parc > 0 && (
                    <span
                      className="flex items-center gap-0.5 rounded-full px-1.5"
                      title={`${parc} con parcialidad en esta card`}
                      style={{ background: '#1B3892', color: '#fff', height: 18, fontSize: 10, fontWeight: 800, boxShadow: '0 2px 6px rgba(27,56,146,0.35)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>splitscreen</span>
                      {parc}
                    </span>
                  )}
                  {venc > 0 && (
                    <span
                      className="flex items-center gap-0.5 rounded-full px-1.5"
                      title={`${venc} vencido${venc !== 1 ? 's' : ''} en esta card`}
                      style={{ background: '#dc2626', color: '#fff', height: 18, fontSize: 10, fontWeight: 800, boxShadow: '0 2px 6px rgba(220,38,38,0.35)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>event_busy</span>
                      {venc}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}

        {cardFilter && (
          <button onClick={() => { setCardFilter(null); setSelectedId(null); }} className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 px-2 py-1 rounded" style={{ color: '#6b7280' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
            Quitar filtro
          </button>
        )}

      </div>

      {/* ── Filter bar ── */}
      <div
        className="flex flex-col-reverse md:flex-row md:items-center gap-3 px-6 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Fecha inicial</label>
            <input
              type="date"
              value={fechaInicialDraft}
              onChange={e => setFechaInicialDraft(e.target.value)}
              className="text-xs rounded border px-2 py-1"
              style={{ borderColor: hayCambiosFecha ? '#d97706' : '#d1d5db', accentColor: '#1a2b6b' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Fecha final</label>
            <input
              type="date"
              value={fechaFinalDraft}
              onChange={e => setFechaFinalDraft(e.target.value)}
              className="text-xs rounded border px-2 py-1"
              style={{ borderColor: hayCambiosFecha ? '#d97706' : '#d1d5db', accentColor: '#1a2b6b' }}
            />
          </div>

          {/* Búsqueda DINÁMICA: el usuario elige por qué campo quiere buscar.
              Papeleta es el default. */}
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: '#d1d5db' }}>
            <select
              value={searchField}
              onChange={e => setSearchField(e.target.value as CampoBusqueda)}
              className="text-xs px-2 py-1 border-0 outline-none"
              style={{ background: '#f8f9fb', color: '#1a2b6b', accentColor: '#1a2b6b' }}
              title="Elige el campo por el que quieres buscar"
            >
              <option value="papeleta">Papeleta</option>
              {/* "Pedido ID" se oculta en la vista Saliente si el donante es
                  consolidador intermedio de al menos una petición (no debe
                  ver el linaje del pedido cliente). Se mantiene siempre en
                  Entrante (el solicitante final sí conoce su pedido). */}
              {(tipoFilter !== 'Saliente' || !traspasosDelTipo.some(t => esConsolidadorIntermedio(t, sucursalActual, traspasos))) && (
                <option value="pedido">Pedido ID</option>
              )}
              <option value="peticion">Petición</option>
              <option value="solicitud">Solicitud</option>
              <option value="embarque">Embarque</option>
              <option value="guia">Guía</option>
            </select>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2" style={{ fontSize: 15, color: '#9ca3af' }}>search</span>
              <input
                type="text"
                placeholder={`Buscar por ${searchField === 'papeleta' ? 'papeleta' : searchField === 'pedido' ? 'pedido' : searchField === 'peticion' ? 'petición' : 'solicitud'}…`}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="text-xs border-0 outline-none pl-7 pr-3 py-1"
                style={{ width: 210 }}
              />
            </div>
          </div>

          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value as FilterTipo)}
            className="text-xs rounded border px-2 py-1"
            style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
          >
            <option value="ALL">Todos los tipos</option>
            <option value="Automático">{TRASPASO_CATEGORIA_LABELS.Automático}</option>
            <option value="Manual">{TRASPASO_CATEGORIA_LABELS.Manual}</option>
            {/* En "Por enviar" la sucursal no recibe traspasos de CEDIS, así que los
                tipos CEDIS no aplican; en su lugar aparecen los envíos a CEDIS. */}
            {tipoFilter === 'Saliente' ? (
              <>
                <option value="Envio-Devolucion">Devolución</option>
                <option value="Envio-AjusteInventario">Ajuste de inventario</option>
              </>
            ) : (
              <>
                <option value="CEDIS-Reabasto">Reabasto</option>
                <option value="CEDIS-Reabasto-Unificado">Reabasto unificado</option>
                <option value="CEDIS-Urgencia">Urgencia CEDIS</option>
                <option value="CEDIS-Especial">Especial CEDIS</option>
              </>
            )}
          </select>

          {/* Refrescar / Filtrar — cuando hay cambios pendientes en las
              fechas (draft ≠ aplicado), el botón cambia a "Filtrar" en
              ámbar para invitar a confirmar el cambio. Al hacer click se
              aplican las fechas del draft y el botón vuelve a "Refrescar". */}
          <button
            disabled={refrescando}
            onClick={() => {
              if (hayCambiosFecha) {
                aplicarFiltros();
                return;
              }
              // Simulación de consulta al servidor: da feedback visual al
              // usuario durante ~700 ms antes de re-renderizar la vista.
              setRefrescando(true);
              showToast('Consultando cambios…', 'info');
              window.setTimeout(() => {
                setSearchText(searchText);
                setRefrescando(false);
                showToast('Vista actualizada.', 'success');
              }, 700);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
            style={
              refrescando
                ? { border: '1.5px solid #94a3b8', color: '#fff', background: '#94a3b8', cursor: 'wait' }
                : hayCambiosFecha
                ? { border: '1.5px solid #d97706', color: '#fff', background: '#d97706', boxShadow: '0 2px 6px rgba(217,119,6,0.35)' }
                : { border: '1.5px solid #1a2b6b', color: '#1a2b6b', background: 'white' }
            }
            title={refrescando ? 'Consultando…' : hayCambiosFecha ? 'Aplicar el nuevo rango de fechas' : 'Refrescar la vista'}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 14, animation: refrescando ? 'spin 0.9s linear infinite' : 'none' }}
            >
              {refrescando ? 'progress_activity' : hayCambiosFecha ? 'filter_alt' : 'refresh'}
            </span>
            {refrescando ? 'Consultando…' : hayCambiosFecha ? 'Filtrar' : 'Refrescar'}
          </button>

          <button
            onClick={handleClearFilters}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{ color: '#6b7280', background: 'transparent' }}
          >
            Limpiar filtros
          </button>
        </div>

        {/* Acciones — compactadas para caber en una sola fila (sobre todo
            en "Por recibir" donde conviven Excel + Solicitar CEDIS + Nueva
            solicitud). Padding y font reducidos; label queda visible. */}
        <div className="flex items-center gap-1.5 md:ml-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-all"
            style={{ border: '1.5px solid #16a34a', color: '#16a34a', background: 'white' }}
            title="Exportar a Excel la tabla filtrada y el desglose de piezas"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>table_view</span>
            Excel
          </button>
          {onEnviarCedis && (
            <button
              onClick={onEnviarCedis}
              className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-all"
              style={{ border: '1.5px solid #1a2b6b', color: '#1a2b6b', background: 'white' }}
              title="Enviar mercancía a CEDIS"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>local_shipping</span>
              Enviar a CEDIS
            </button>
          )}
          {onSolicitarCedis && (
            <button
              onClick={onSolicitarCedis}
              className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-all"
              style={{ border: '1.5px solid #1a2b6b', color: '#1a2b6b', background: 'white' }}
              title="Solicitar mercancía a CEDIS"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warehouse</span>
              Solicitar a CEDIS
            </button>
          )}
          {onNuevaSolicitud && (
            <button
              onClick={onNuevaSolicitud}
              className="flex items-center justify-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-white transition-all"
              style={{ background: '#1a2b6b', boxShadow: '0 2px 6px rgba(26,43,107,0.25)' }}
              title="Nueva solicitud de traspaso"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>add</span>
              Nueva solicitud
            </button>
          )}
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-auto" style={{ borderTop: '1px solid #e5e7eb' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
              {COLUMNS.map(col => {
                const active = sortCol === col;
                return (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: active ? '#1a2b6b' : '#6b7280', cursor: 'pointer', userSelect: 'none' }}
                    title={active
                      ? (sortDir === 'asc' ? 'Ordenado ascendente. Click para descendente.' : 'Ordenado descendente. Click para quitar orden.')
                      : `Ordenar por ${col}`}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col}
                      {active ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      ) : (
                        <span className="material-symbols-outlined opacity-30" style={{ fontSize: 14 }}>unfold_more</span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>
                  No hay traspasos que coincidan con los filtros
                </td>
              </tr>
            )}
            {rows.map((t, idx) => {
              const isSelected = t.id === selectedId;
              const enGrupo = solCount[t.solicitudId] > 1;
              const groupColor = solColor[t.solicitudId] ?? 'transparent';
              // Primera fila de cada grupo de solicitud: separa visualmente los bloques.
              const esInicioGrupo = idx > 0 && rows[idx - 1].solicitudId !== t.solicitudId;
              const per = perspectivaTraspaso(t, sucursalActual);
              const esCedis = t.categoria === 'CEDIS';
              const esUnificada = t.resultado === 'unificada';
              const esReabastoUnificado = esCedis && t.subtipoCedis === 'Reabasto' && !!t.reabastoUnifica?.length;
              // Nuevo tipo visual: "Aut. SMC Unificación" para peticiones
              // Automáticas que forman parte de una unificación (petición
              // consolidada dentro de un reabasto o marcada como unificada).
              // Sigue las mismas reglas que las Automáticas SMC.
              const esAutUnificacion = t.categoria === 'Automático' && (esUnificada || !!t.unificadaEnTraspaso);
              const tipoLabel = t.motivoEnvioCedis
                ? t.motivoEnvioCedis
                : esReabastoUnificado
                  ? 'Reabasto/unificado'
                  : esAutUnificacion
                    ? 'Aut. SMC Unificación'
                    : esCedis && t.subtipoCedis ? t.subtipoCedis : TRASPASO_CATEGORIA_LABELS[t.categoria];
              const tipoColor = t.motivoEnvioCedis
                ? MOTIVO_ENVIO_CEDIS_COLORS[t.motivoEnvioCedis]
                : t.categoria === 'CEDIS' && t.subtipoCedis
                ? CEDIS_SUBTIPO_COLORS[t.subtipoCedis]
                : TRASPASO_CATEGORIA_COLORS[t.categoria as 'Automático' | 'Manual'];
              const tipoTooltip = t.motivoEnvioCedis
                ? TRASPASO_CATEGORIA_TOOLTIP[t.motivoEnvioCedis]
                : esReabastoUnificado
                ? 'Reabasto generado por CEDIS que además trae mercancía unificada de una solicitud a CEDIS con pedido de cliente.'
                : esAutUnificacion
                ? 'Automático SMC — Unificación: petición unificada dentro de otro traspaso. Sigue las mismas reglas que Automático SMC.'
                : t.categoria === 'CEDIS' && t.subtipoCedis
                ? TRASPASO_CATEGORIA_TOOLTIP[t.subtipoCedis]
                : TRASPASO_CATEGORIA_TOOLTIP[t.categoria] ?? '';

              const { num: recibidoNum, den: recibidoDen, unidad: recibidoUnidad } = calcularRecibido(t, per.tipo);
              const etapa = etapaTraspaso(t.status);
              const etapaColor = TRASPASO_ETAPA_COLORS[etapa];
              // El estado es la etapa base; las parcialidades y el SLA (vencido/
              // demora) van en la columna SLA aparte.
              const tagsSla = slaTags(t);
              const pct = recibidoDen > 0 ? Math.round((recibidoNum / recibidoDen) * 100) : 0;

              // F64 — Fondo tenue rojo si el embarque está atorado.
              const embRow = t.embarqueId ? embarquesTraspaso.find(e => e.id === t.embarqueId) : undefined;
              const atorado = embRow && embarqueAtorado(embRow);
              return (
                <tr
                  key={t.id}
                  onClick={() => handleRowClick(t.id)}
                  onDoubleClick={() => handleRowDoubleClick(t.id)}
                  style={{
                    background: isSelected
                      ? 'rgba(26,43,107,0.08)'
                      : atorado
                      ? 'rgba(220,38,38,0.05)'
                      : '#fff',
                    borderLeft: `3px solid ${isSelected ? '#1a2b6b' : atorado ? '#dc2626' : (enGrupo ? groupColor : 'transparent')}`,
                    borderBottom: '1px solid #f3f4f6',
                    borderTop: esInicioGrupo ? '2px solid #e5e7eb' : undefined,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  ref={isSelected ? (el => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })) : undefined}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                        title={tipoTooltip}
                        style={{
                          background: tipoColor.bg,
                          color: tipoColor.text,
                          border: `1px solid ${tipoColor.border}`,
                          cursor: 'help',
                        }}
                      >
                        {tipoLabel}
                      </span>
                      {/* Sub-etiqueta "Consolidadora · N por recibir" cuando
                          esta petición Saliente requiere apoyo de otras
                          peticiones por recibir. Antes vivía en la celda de
                          Pedido cliente (ya no existe en Saliente). */}
                      {esConsolidadorIntermedio(t, sucursalActual, traspasos) && (() => {
                        const nPend = peticionesDependientesPendientesDe(t, traspasos).length;
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
                            title={`Consolidadora — ${nPend} traspaso(s) por recibir aún no entregados. No se puede surtir hasta completar.`}
                            style={{ background: '#7c3aed', color: '#fff' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>merge</span>
                            Consolidadora · {nPend}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {/* Celda "Petición" (Saliente) o "Solicitud - Petición"
                        (Entrante). En Saliente el donante SIEMPRE ve solo su
                        peticionId — la Solicitud y el Pedido se consultan en
                        el detalle. En Entrante se conserva el par para el
                        solicitante final que sí necesita agrupar. */}
                    {(() => {
                      if (tipoFilter === 'Saliente') {
                        return (
                          <span className="text-xs whitespace-nowrap font-semibold" style={{ color: '#374151' }} title={`Petición ${t.id} · Solicitud ${t.solicitudId} (consulta el detalle)`}>
                            {t.id}
                          </span>
                        );
                      }
                      return enGrupo ? (
                        <span
                          className="inline-flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap"
                          style={{ color: groupColor }}
                          title={`Solicitud ${t.solicitudId} — ${solCount[t.solicitudId]} peticiones relacionadas (se muestran juntas). Petición ${t.id}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>link</span>
                          {t.solicitudId} <span style={{ color: '#9ca3af' }}>–</span> {t.id}
                        </span>
                      ) : (
                        <span className="text-xs whitespace-nowrap" style={{ color: '#374151' }} title={`Solicitud ${t.solicitudId} · Petición ${t.id}`}>
                          {t.solicitudId} <span style={{ color: '#9ca3af' }}>–</span> {t.id}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>
                      <span style={{ color: '#9ca3af' }}>{sucursalPrefix}</span>
                      {per.contraparte} ({SUCURSAL_ALMACEN_CODIGOS[per.contraparte] ?? '—'})
                    </span>
                  </td>
                  {/* Celda "Pedido cliente" — SOLO en Entrante (Por recibir).
                      En Saliente se omite por regla de matriz cerrada. */}
                  {tipoFilter === 'Entrante' && (
                    <td className="px-3 py-2.5">
                      {t.pedidoOrigen ? (
                        <span
                          className="text-xs font-medium whitespace-nowrap"
                          style={{ color: '#166534' }}
                          title={`Ligado al pedido de cliente ${t.pedidoOrigen}`}
                        >
                          #{t.pedidoOrigen}
                        </span>
                      ) : (
                        <span
                          className="text-xs italic whitespace-nowrap"
                          style={{ color: '#9ca3af' }}
                          title="Sin pedido de cliente (reabasto / urgencia interna)"
                        >
                          Sin pedido
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>{t.noPapeleta}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs whitespace-nowrap" style={{ color: '#374151' }}>{formatFechaCorta(t.fechaCreacion)}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs whitespace-nowrap" style={{ color: '#374151' }}>
                      {t.fechaArribo ? formatFechaCorta(t.fechaArribo) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {/* CEDIS es recepción ciega por CAJAS: se muestra el número de cajas, nunca piezas. */}
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#374151' }}
                      title={esCedis ? 'Traspaso de CEDIS: recepción ciega. Solo se controla por número de cajas (sin piezas).' : undefined}>
                      {recibidoNum}/{recibidoDen} {recibidoUnidad}
                    </span>
                  </td>
                  {/* Columna EMBARQUE — todos los traspasos requieren embarque
                      para poder enviarse. Sin embarque = badge gris con leyenda.
                      Si el embarque es WebService y aún no tiene guía → badge
                      amarillo "guía pendiente" (regla sep-2026). */}
                  <td className="px-3 py-2.5">
                    {t.embarqueId ? (() => {
                      const emb = embarquesTraspaso.find(e => e.id === t.embarqueId);
                      const esWS = emb && tipoPaqueteriaDe(emb.paqueteria) === 'WebService';
                      const guiaPendiente = !!esWS && !emb!.guiaId && t.status === 'Documentado';
                      return (
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(t.embarqueId!).then(
                                () => showToast(`ID ${t.embarqueId} copiado`, 'success'),
                                () => {},
                              );
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                            style={{ background: 'rgba(37,99,235,0.08)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.30)' }}
                            title={`Click para copiar: ${t.embarqueId}\nPaquetería: ${emb?.paqueteria ?? '—'}\nDestino: ${emb?.sucursalDestino ?? '—'}\nTraspasos: ${emb?.traspasos.length ?? 0}\nEdad: ${emb ? Math.round(horasSinMovimiento(emb)) : 0}h`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>local_shipping</span>
                            {t.embarqueId}
                          </button>
                          {guiaPendiente && (
                            <>
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
                                style={{ background: 'rgba(234,179,8,0.15)', color: '#a16207', border: '1px solid rgba(234,179,8,0.40)' }}
                                title="Paquetería WebService · falta generar guía"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>pending</span>
                                Guía pendiente
                              </span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  showToast(`Solicitando guía ${emb!.paqueteria}…`, 'info');
                                  const g = await generarGuiaPaqueteria(emb!.id);
                                  if (g) showToast(`Guía ${g} generada.`, 'success');
                                }}
                                title="Generar la guía ahora (mock API)"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap text-white"
                                style={{ background: '#0891b2' }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>qr_code_2</span>
                                Generar
                              </button>
                            </>
                          )}
                          {emb?.guiaId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(emb.guiaId!).then(
                                  () => showToast(`Guía ${emb.guiaId} copiada al portapapeles`, 'success'),
                                  () => showToast('No se pudo copiar', 'error'),
                                );
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap cursor-pointer"
                              style={{ background: 'rgba(22,163,74,0.10)', color: '#166534', border: '1px solid rgba(22,163,74,0.30)' }}
                              title={`Click para copiar: ${emb.guiaId}`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>content_copy</span>
                              {emb.guiaId}
                            </button>
                          )}
                          {/* F86 — Aviso si la cotización aceptada tiene >24h (tarifas pueden haber cambiado) */}
                          {emb && cotizacionCaducada(emb) && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
                              style={{ background: 'rgba(124,58,237,0.12)', color: '#6d28d9', border: '1px solid rgba(124,58,237,0.40)' }}
                              title="Cotización con más de 24 h — considera recotizar"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>schedule</span>
                              Cotización caducada
                            </span>
                          )}
                          {/* F25 — Alerta si el embarque lleva > 24h sin avanzar */}
                          {emb && embarqueAtorado(emb) && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
                              style={{ background: 'rgba(220,38,38,0.12)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.45)' }}
                              title={`Sin movimiento hace ${Math.round(horasSinMovimiento(emb))} h`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>warning</span>
                              Atorado {Math.round(horasSinMovimiento(emb))}h
                            </span>
                          )}
                        </div>
                      );
                    })() : (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] italic whitespace-nowrap"
                        style={{ color: '#9ca3af' }}
                        title="Aún no tiene embarque. Se crea al finalizar la revisión."
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
                        Sin embarque
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5" style={{ minWidth: 128 }}>
                    {/* Estado + barra de avance del pipeline (N barritas
                        segmentadas de 6px cada una, a la derecha del badge).
                        Los estados especiales (Draft, Unificada, Cancelado)
                        reemplazan la barra por su badge propio. */}
                    {t.esDraft ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                        title="Solicitud a CEDIS en Draft: pendiente de aprobación de token. No cuenta para SLA."
                        style={{ background: 'rgba(107,114,128,0.14)', color: '#4b5563', border: '1px dashed rgba(107,114,128,0.5)', cursor: 'help' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>hourglass_empty</span>
                        Draft
                      </span>
                    ) : esUnificada ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                        title={`Solicitud a CEDIS unificada dentro del traspaso de reabasto ${t.unificadaEnTraspaso ?? ''}. Consulta el detalle de la petición.`}
                        style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)', cursor: 'help' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>merge</span>
                        Unificada
                      </span>
                    ) : t.status === 'Cancelado' ? (() => {
                      // Diferenciación visual: RECHAZADO (donante rechazó, el
                      // solicitante puede reasignarlo) vs CANCELADO (cerrado por
                      // el solicitante o cancelación sin opción de reasignar).
                      const esRechazado = t.resultado === 'rechazada';
                      const label = esRechazado ? 'Rechazado' : 'Cancelado';
                      const tip = esRechazado
                        ? 'Rechazado por la sucursal donante. El solicitante puede reasignarlo a otra sucursal.'
                        : 'Cancelado. La petición se cerró sin opción de reasignación.';
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                          title={tip}
                          style={
                            esRechazado
                              ? { background: 'rgba(220,38,38,0.12)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', cursor: 'help' }
                              : { background: 'rgba(107,114,128,0.14)', color: '#4b5563', border: '1px solid rgba(107,114,128,0.35)', cursor: 'help' }
                          }
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                            {esRechazado ? 'block' : 'do_not_disturb_on'}
                          </span>
                          {label}
                        </span>
                      );
                    })() : (() => {
                      const av = avanceDe(t);
                      const pipeline = pipelineDe(t);
                      return (
                        // Badge + barra en la MISMA línea (barra a la derecha
                        // del estado). En flex-row cada barrita necesita
                        // `width` fijo + `flex-shrink:0` (con `flex:1` en
                        // horizontal se colapsan a 0 sin un ancho asignado).
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap"
                            title={TRASPASO_ETAPA_TOOLTIP[etapa]}
                            style={{ background: etapaColor.bg, color: etapaColor.text, border: `1px solid ${etapaColor.border}`, cursor: 'help' }}
                          >
                            {etapa}
                          </span>
                          <div
                            className="flex items-center gap-0.5"
                            style={{ flexShrink: 0, maxWidth: 60 }}
                            title={`Paso ${av.step} de ${av.total} — ${pipeline[av.step - 1] ?? ''} (${av.pct}%)`}
                          >
                            {pipeline.map((_, i) => {
                              const alcanzado = i < av.step;
                              return (
                                <div key={i} style={{
                                  width: 4, height: 12, borderRadius: 3, flexShrink: 0,
                                  background: alcanzado ? etapaColor.text : '#e5e7eb',
                                  transition: 'background 0.2s',
                                }} />
                              );
                            })}
                            <span className="text-[9px] font-semibold ml-1" style={{ color: '#6b7280' }}>{av.pct}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2.5">
                    {tagsSla.length === 0 ? (
                      <span className="material-symbols-outlined" title="En tiempo" style={{ fontSize: 19, color: '#16a34a', cursor: 'help' }}>check_circle</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {tagsSla.map(tag => (
                          <span key={tag.label} className="material-symbols-outlined" title={tag.label} style={{ fontSize: 19, color: tag.color, cursor: 'help' }}>
                            {tag.icon}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Action bar ── */}
      <div
        className="flex items-center gap-2 px-6 py-3 flex-wrap"
        style={{ background: '#fff', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}
      >
        {/* Detalle (siempre) */}
        <button
          disabled={!canVerDetalle}
          onClick={() => sel && setDetailPetId(sel.id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
          style={btnOutline(canVerDetalle)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
          Ver detalle
        </button>

        {/* Imprimir (PDF por etapa) */}
        <button
          disabled={!canVerDetalle}
          onClick={() => sel && imprimirTraspaso(sel, sucursalActual)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
          style={btnOutline(canVerDetalle)}
          title="Simular impresión (PDF) según la etapa del traspaso"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>print</span>
          Imprimir
        </button>

        {/* Separador */}
        <span style={{ color: '#e5e7eb', margin: '0 4px', fontSize: 18 }}>|</span>

        {/* Sin selección: pista para el usuario. */}
        {!sel && (
          <span style={{ color: '#9ca3af', fontSize: 12, fontStyle: 'italic' }}>
            Selecciona un traspaso para ver las acciones disponibles.
          </span>
        )}

        {tipoFilter === 'Entrante' ? (
          <>
            {canConfirmarRecepcion && (
              <button
                onClick={() => { if (sel) setRecepcionPetId(sel.id); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#0891b2')}
                title="Confirmar que la sucursal ya recibió la mercancía (no da entrada al inventario)"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>how_to_reg</span>
                Confirmar recepción
              </button>
            )}
            {canDarEntrada && (
              <button
                onClick={() => {
                  if (!sel) return;
                  darEntradaInventario(sel.id);
                  showToast(`Traspaso ${sel.id} finalizado — entrada al inventario registrada.`, 'success');
                  setSelectedId(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#16a34a')}
                title="Dar entrada al inventario (Finalizado). Pronto abrirá una ventana dedicada."
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>inventory</span>
                Dar entrada
              </button>
            )}
          </>
        ) : (
          <>
            {canSurtir && (
              <button
                onClick={() => {
                  if (!sel) return;
                  if (!puedeSurtirPeticion(sel, traspasos)) {
                    setBloqueoSurtidoPetId(sel.id);
                    return;
                  }
                  setSurtirPetId(sel.id);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#7c3aed')}
                title={surtidoEnHH ? 'Los traspasos automáticos SMC se surten desde la aplicación HH.' : undefined}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>package_2</span>
                Surtir
              </button>
            )}

            {canRevisar && (
              <button
                onClick={() => { if (sel) setRevisarPetId(sel.id); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#2563eb')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>qr_code_scanner</span>
                Revisar
              </button>
            )}

            {canEmbarcar && (
              <button
                onClick={() => {
                  if (!sel) return;
                  if (sel.embarqueId) {
                    showToast(`Este traspaso ya pertenece al embarque ${sel.embarqueId}.`, 'info');
                    return;
                  }
                  // Wizard NUEVO unificado. Si hay compatibles muestra la
                  // pantalla "elegir" (unificar o crear); si no, pasa directo
                  // a la confirmación de creación.
                  const compat = embarquesCompatiblesParaTraspaso(sel, embarquesTraspaso);
                  setContinueFlow({ petId: sel.id, next: 'embarcar', origenManual: true });
                  setFaseEmb(compat.length > 0 ? 'elegir' : 'confirmarCreacion');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#d97706')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>local_shipping</span>
                Embarcar
              </button>
            )}

            {/* F37 — Cancelar embarque (solo Generado, aún sin documentar/guía) */}
            {sel?.embarqueId && embarqueSel?.status === 'Generado' && (
              <button
                onClick={() => {
                  const motivo = window.prompt(`Cancelar embarque ${sel.embarqueId}\n\n¿Motivo?`, '');
                  if (motivo == null || !motivo.trim()) return;
                  cancelarEmbarque(sel.embarqueId!, motivo.trim());
                  showToast(`Embarque ${sel.embarqueId} cancelado. Traspasos liberados.`, 'warning');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-white"
                style={{ background: '#dc2626' }}
                title="Cancelar el embarque y liberar sus traspasos"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cancel</span>
                Cancelar emb.
              </button>
            )}

            {/* F96 — Duplicar embarque (solo si ya tiene paquetería configurada) */}
            {sel?.embarqueId && embarqueSel?.paqueteriaSeleccionada && (
              <button
                onClick={() => {
                  const ok = window.confirm(`Duplicar embarque ${sel.embarqueId}\n\nSe creará un nuevo embarque en la misma sucursal destino y misma paquetería, sin traspasos. ¿Continuar?`);
                  if (!ok) return;
                  const nuevoId = duplicarEmbarque(sel.embarqueId!);
                  if (nuevoId) showToast(`Embarque ${nuevoId} creado (duplicado de ${sel.embarqueId}).`, 'success');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-white"
                style={{ background: '#8b5cf6' }}
                title="Crear un nuevo embarque copiando destino y paquetería"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>content_copy</span>
                Duplicar
              </button>
            )}

            {/* F24 — Imprimir embarque (disponible una vez documentado). */}
            {sel?.embarqueId && embarqueSel?.paqueteriaSeleccionada && (
              <button
                onClick={() => imprimirEmbarque(embarqueSel, sucursalActual)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-white"
                style={{ background: '#475569' }}
                title="Imprimir resumen del embarque con desglose y guía"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>print</span>
                Imprimir
              </button>
            )}

            {/* Recotizar — reabre el cotizador saltando directo al Paso 3
                (documentación ya guardada). Solo antes de generar guía. */}
            {canRecotizar && (
              <button
                onClick={() => {
                  if (!sel?.embarqueId || !embarqueSel?.documentacion) return;
                  // F58 — Aviso antes de reabrir el cotizador
                  const ok = window.confirm(
                    `Vas a recotizar el embarque ${sel.embarqueId}.\n\n` +
                    `La cotización actual (${embarqueSel.paqueteriaSeleccionada} · $${(embarqueSel.paqueteriaCosto ?? 0).toFixed(2)}) ` +
                    `se archivará en el histórico. ¿Continuar?`
                  );
                  if (!ok) return;
                  setDocumentarEmbarqueId(sel.embarqueId);
                  setDocumentacionDraft(embarqueSel.documentacion);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all text-white"
                style={{ background: '#7c3aed' }}
                title="Cambiar paquetería sin volver a pesar"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>compare_arrows</span>
                Recotizar
              </button>
            )}

            {canDocumentar && (
              <button
                onClick={() => { if (sel?.embarqueId) setDocumentarEmbarqueId(sel.embarqueId); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#ea580c')}
                title="Pesar cajas + seleccionar paquetería"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>scale</span>
                Documentar
              </button>
            )}

            {canGenerarGuia && (
              <button
                disabled={generandoGuiaId === sel?.embarqueId}
                onClick={async () => {
                  if (!sel?.embarqueId) return;
                  setGenerandoGuiaId(sel.embarqueId);
                  showToast('Solicitando guía a la paquetería…', 'info');
                  try {
                    const g = await generarGuiaPaqueteria(sel.embarqueId);
                    if (g) showToast(`Guía ${g} generada (pendiente entrega a paquetería).`, 'success');
                  } finally {
                    setGenerandoGuiaId(null);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(generandoGuiaId !== sel?.embarqueId, '#0891b2')}
                title="Genera la guía WebService (queda pendiente hasta entrega manual)"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  {generandoGuiaId === sel?.embarqueId ? 'progress_activity' : 'qr_code_2'}
                </span>
                {generandoGuiaId === sel?.embarqueId ? 'Generando…' : 'Generar guía'}
              </button>
            )}

            {canEntregadoAPaqueteria && (
              <button
                onClick={() => {
                  if (!sel?.embarqueId) return;
                  confirmarEntregadoAPaqueteriaManual(sel.embarqueId);
                  showToast(`Traspaso ${sel.id} entregado a la paquetería.`, 'success');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#0d9488')}
                title="Confirma que la mercancía se entregó a la paquetería/chofer"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>outbox</span>
                Entregado a paq.
              </button>
            )}

            {/* Solicitar reparto (Uber / BlueGo) — reutiliza el modal existente
                del módulo de embarques. Aquí solo redirigimos. */}
            {canSolicitarReparto && (
              <button
                onClick={() => { if (sel?.embarqueId && onVerEmbarque) onVerEmbarque(sel.embarqueId); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#2563eb')}
                title="Abre el embarque para solicitar el reparto"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>directions_car</span>
                Solicitar reparto
              </button>
            )}

            {canConfirmarReparto && (
              <button
                onClick={() => {
                  if (!sel?.embarqueId) return;
                  confirmarRepartoFinalizado(sel.embarqueId);
                  showToast(`Reparto finalizado para ${sel.id}.`, 'success');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#16a34a')}
                title="Confirma que la paquetería/chofer entregó al cliente"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>done_all</span>
                Reparto finalizado
              </button>
            )}

            {/* Leyenda cuando el traspaso seleccionado es Automático SMC y aún
                está PENDIENTE de surtir (una vez surtido no aplica). El SURTIDO
                se hace desde la HH; revisar/embarcar sí en esta plataforma. */}
            {surtidoEnHH && sel!.status === 'Pendiente' && (
              <span
                className="flex items-center gap-1 ml-2 text-xs font-semibold underline"
                title="El SURTIDO de los traspasos automáticos SMC solo se realiza desde la aplicación HH. La revisión y embarque sí se hacen en esta plataforma."
                style={{ color: '#2563eb', cursor: 'help' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                Este traspaso se surte desde la aplicación HH
              </span>
            )}
          </>
        )}

        {/* Recálculo por la sucursal solicitante, según el escenario de la petición */}
        {(canReasignar || canGenerarRestante) && (
          <>
            <span style={{ color: '#e5e7eb', margin: '0 4px', fontSize: 18 }}>|</span>
            {canGenerarRestante && (
              <button
                onClick={handleGenerarRestante}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#0d9488')}
                title="Surtida/revisada parcialmente: abre una nueva solicitud de traspaso solo por la mercancía restante"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>note_add</span>
                Generar solicitud de traspaso por la mercancía restante
              </button>
            )}
            {canReasignar && (
              <button
                onClick={handleReasignar}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={btnEnabled(true, '#2563eb')}
                title="Petición rechazada en su totalidad: SMC reasigna toda la mercancía a otra sucursal."
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>autorenew</span>
                Reasignar a otra sucursal
              </button>
            )}
          </>
        )}

        {sel && (
          <span className="ml-auto text-xs" style={{ color: '#6b7280' }}>
            Seleccionado: <strong style={{ color: '#1a2b6b' }}>#{sel.id}</strong>
          </span>
        )}
      </div>

      {/* ── Modales ── */}
      {detailPeticion && (
        <ModalTraspasoDetail
          peticion={detailPeticion}
          onClose={() => setDetailPetId(null)}
          showToast={showToast}
          onVerPedido={onVerPedido}
        />
      )}

      {/* Bloqueo de surtido — consolidador intermedio con dependencias no
          Entregadas. Similar en tono al aviso "no puedes surtir un pedido
          cliente con traspasos pendientes": muestra la tabla de dependencias
          y sus estados; solo permite Cerrar. */}
      {bloqueoSurtidoPetId && (() => {
        const p = traspasos.find(t => t.id === bloqueoSurtidoPetId);
        if (!p) return null;
        const deps = peticionesDependientesDe(p, traspasos);
        return (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={e => { if (e.target === e.currentTarget) setBloqueoSurtidoPetId(null); }}>
            <div className="w-full bg-white overflow-hidden flex flex-col" style={{ maxWidth: 560, maxHeight: '86vh', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex items-center gap-2 px-5 py-3.5" style={{ background: '#7c3aed' }}>
                <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>lock</span>
                <span className="font-bold text-sm text-white">No se puede surtir aún</span>
                <button onClick={() => setBloqueoSurtidoPetId(null)} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
                <p className="text-xs" style={{ color: '#374151' }}>
                  La petición <strong>{p.id}</strong> es <strong style={{ color: '#7c3aed' }}>consolidadora</strong>: depende de {deps.length} traspaso(s)
                  por recibir de sus sucursales locales. No se puede surtir hasta que <strong>todas</strong> estén <strong>Entregadas</strong>.
                </p>
                <div className="overflow-x-auto rounded-md" style={{ border: '1px solid #e5e7eb' }}>
                  <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                        <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Petición</th>
                        <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Sucursal donante</th>
                        <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Estado</th>
                        <th className="text-left px-2.5 py-1.5 font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Alerta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deps.map(d => {
                        const entregada = d.status === 'Entregado' || d.status === 'Recibido';
                        return (
                          <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td className="px-2.5 py-1.5 font-semibold" style={{ color: '#5b21b6' }}>{d.id}</td>
                            <td className="px-2.5 py-1.5" style={{ color: '#374151' }}>{d.sucursalOrigen ?? d.sucursalContraparte}</td>
                            <td className="px-2.5 py-1.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: entregada ? '#16a34a' : '#d97706' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{entregada ? 'check_circle' : 'schedule'}</span>
                                {d.status}
                              </span>
                            </td>
                            <td className="px-2.5 py-1.5 text-[11px]" style={{ color: entregada ? '#166534' : '#b45309' }}>
                              {entregada ? 'Lista para consolidar' : 'Pendiente por recibir'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] italic mt-1" style={{ color: '#6b7280' }}>
                  Cuando todas las dependencias estén Entregadas podrás surtir esta petición como un traspaso normal.
                </p>
              </div>
              <div className="flex justify-end px-5 py-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                <button onClick={() => setBloqueoSurtidoPetId(null)} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#7c3aed' }}>Entendido</button>
              </div>
            </div>
          </div>
        );
      })()}

      {surtirPeticion && (
        <ModalSurtidoHH
          peticion={surtirPeticion}
          onClose={() => setSurtirPetId(null)}
          showToast={showToast}
          onFinalizado={() => setContinueFlow({ petId: surtirPeticion.id, next: 'revisar' })}
        />
      )}

      {revisarPeticion && (
        <ModalRevisionHH
          peticion={revisarPeticion}
          onClose={() => { setRevisarPetId(null); setSelectedId(null); }}
          showToast={showToast}
          onFinalizado={() => setContinueFlow({ petId: revisarPeticion.id, next: 'embarcar' })}
        />
      )}

      {recepcionPeticion && (
        <ModalConfirmarRecepcion
          peticion={recepcionPeticion}
          onClose={() => { setRecepcionPetId(null); setSelectedId(null); }}
          showToast={showToast}
          onFinalizado={() => setContinueFlow({ petId: recepcionPeticion.id, next: 'entrada' })}
        />
      )}

      {embarcarPeticion && (
        <ModalEmbarcarTraspaso
          peticion={embarcarPeticion}
          onClose={() => { setEmbarcarPetId(null); setSelectedId(null); }}
          showToast={showToast}
        />
      )}

      {/* F4/F5 — Documentar embarque: modal de pesado → cotizador. */}
      {documentarEmbarqueId && !documentacionDraft && (() => {
        const emb = embarquesTraspaso.find(e => e.id === documentarEmbarqueId);
        if (!emb) return null;
        return (
          <ModalDocumentacionCajas
            embarque={emb}
            showToast={showToast}
            onClose={() => setDocumentarEmbarqueId(null)}
            onContinuar={(doc) => {
              setDocumentacionDraft(doc);
              // El modo se toma del primer pedido (el modal ya lo aplicó a todos).
              const md = doc[0]?.modoPeso ?? 'Consolidado';
              setModoPesoDraft(md);
            }}
          />
        );
      })()}

      {documentarEmbarqueId && documentacionDraft && (() => {
        const emb = embarquesTraspaso.find(e => e.id === documentarEmbarqueId);
        if (!emb) return null;
        return (
          <ModalCotizador
            embarque={emb}
            documentacion={documentacionDraft}
            origen={sucursalActual}
            modoPeso={modoPesoDraft}
            onClose={() => { setDocumentarEmbarqueId(null); setDocumentacionDraft(null); }}
            onRegresar={() => setDocumentacionDraft(null)}
            onSeleccionar={(cot) => {
              guardarDocumentacionEmbarque(emb.id, documentacionDraft, cot);
              // F65 — Toast positivo si eligió la opción MÁS BARATA / no cara.
              const mensaje = cot.muyCara
                ? `Embarque ${emb.id} documentado con ${cot.paqueteria} (marcada como "muy cara").`
                : `Embarque ${emb.id} documentado con ${cot.paqueteria} — mejor opción disponible.`;
              showToast(mensaje, cot.muyCara ? 'warning' : 'success');
              setDocumentarEmbarqueId(null);
              setDocumentacionDraft(null);
            }}
          />
        );
      })()}

      {/* Continuación del flujo: aparece tras cada paso exitoso ofreciendo la
          siguiente acción del pipeline. El usuario elige continuar o cerrar. */}
      {continueFlow && (() => {
        // Los flujos 'revisar' y 'entrada' conservan el modal simple; el
        // flujo 'embarcar' es un mini-wizard de 3 pasos con validación.
        const cerrarFlujo = () => {
          setContinueFlow(null);
          setFaseEmb('inicio');
          setEmbarqueResultado(null);
          setSelectedId(null);
        };
        // ── Flujos simples: revisar / entrada ──
        if (continueFlow.next !== 'embarcar') {
          const nextMeta = {
            revisar:  { titulo: '¡Surtido finalizado!',   siguiente: 'Continuar con la revisión', icono: 'fact_check', color: '#2563eb' },
            entrada:  { titulo: '¡Recepción confirmada!', siguiente: 'Dar entrada al inventario', icono: 'inventory',  color: '#16a34a' },
          }[continueFlow.next];
          const doContinue = () => {
            const { petId, next } = continueFlow;
            setContinueFlow(null);
            if (next === 'revisar') setRevisarPetId(petId);
            else if (next === 'entrada') {
              darEntradaInventario(petId);
              showToast(`Traspaso ${petId} finalizado — entrada al inventario registrada.`, 'success');
              setSelectedId(null);
            }
          };
          return (
            <div className="fixed inset-0 z-[85] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 380, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: 'Roboto, sans-serif' }}>
                <div className="flex flex-col items-center gap-3 pt-6 px-6">
                  <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(22,163,74,0.14)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#16a34a' }}>check_circle</span>
                  </div>
                  <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>{nextMeta.titulo}</div>
                </div>
                <p className="text-xs mt-3 px-6 text-center" style={{ color: '#555' }}>
                  Traspaso <strong>{continueFlow.petId}</strong>. ¿Quieres continuar con el siguiente paso?
                </p>
                <div className="flex gap-2 px-6 py-5 mt-2">
                  <button onClick={cerrarFlujo} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cerrar</button>
                  <button onClick={doContinue} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: nextMeta.color }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{nextMeta.icono}</span>
                    {nextMeta.siguiente}
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // ── Wizard EMBARQUE ──
        const peticion = traspasos.find(t => t.id === continueFlow.petId);
        if (!peticion) return null;
        const compatibles = embarquesCompatiblesParaTraspaso(peticion, embarquesTraspaso);
        const yaTeniaEmbarque = !!peticion.embarqueId;
        const iniciarValidacion = () => {
          if (yaTeniaEmbarque) {
            // Validación interna: ya tiene embarque, no debería llegar aquí.
            setEmbarqueResultado({ id: peticion.embarqueId!, unificado: true });
            setFaseEmb('exito');
            return;
          }
          if (compatibles.length > 0) setFaseEmb('elegir');
          else setFaseEmb('confirmarCreacion');
        };
        const crearNuevo = () => {
          // Flujo unificado (manual y post-revisión automático): crear el
          // embarque directamente y ofrecer continuar a documentación con el
          // wizard NUEVO. La paquetería y los detalles se definen en el
          // cotizador (Paso 3) tras documentar cajas.
          const id = crearEmbarqueParaTraspaso(peticion.id);
          if (!id) { showToast('No se pudo crear el embarque.', 'error'); cerrarFlujo(); return; }
          setEmbarqueResultado({ id, unificado: false });
          setFaseEmb('exito');
        };
        const agregarA = (embId: string) => {
          agregarTraspasoAEmbarque(peticion.id, embId);
          setEmbarqueResultado({ id: embId, unificado: true });
          setFaseEmb('exito');
        };
        // Regla: si el embarque es NUEVO (recién creado) → abrir el modal de
        // documentación (pesado + cotizador) aquí mismo en ScreenTraspasos.
        // Si el traspaso se UNIFICÓ a un embarque existente → sí navegar a
        // ScreenEmbarques para editar el embarque ya existente.
        const irADocumentacion = () => {
          if (!embarqueResultado) { cerrarFlujo(); return; }
          if (embarqueResultado.unificado) {
            if (onVerEmbarque) onVerEmbarque(embarqueResultado.id);
          } else {
            setDocumentarEmbarqueId(embarqueResultado.id);
          }
          cerrarFlujo();
        };

        // ── Paso 1: "¡Revisión finalizada!" con número de traspaso arriba ──
        if (faseEmb === 'inicio') {
          return (
            <div className="fixed inset-0 z-[85] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 380, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: 'Roboto, sans-serif' }}>
                <div className="flex flex-col items-center gap-2 pt-6 px-6">
                  {/* Traspaso ARRIBA (más prominente que antes). */}
                  <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#9ca3af' }}>Traspaso</div>
                  <div className="text-lg font-extrabold" style={{ color: '#1a2b6b' }}>{peticion.id}</div>
                  <div className="flex items-center justify-center rounded-full mt-1" style={{ width: 48, height: 48, background: 'rgba(22,163,74,0.14)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#16a34a' }}>check_circle</span>
                  </div>
                  <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>¡Revisión finalizada!</div>
                </div>
                <p className="text-xs mt-3 px-6 text-center" style={{ color: '#555' }}>
                  ¿Deseas continuar con la <strong>creación del embarque</strong>?
                </p>
                <div className="flex gap-2 px-6 py-5 mt-2">
                  <button onClick={cerrarFlujo} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Después</button>
                  <button onClick={iniciarValidacion} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#d97706' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>local_shipping</span>
                    Sí, continuar
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // ── Paso 2a: hay compatibles → elegir agregar o crear nuevo ──
        if (faseEmb === 'elegir') {
          const destinoLabel = peticion.sucursalDestino ?? peticion.sucursalContraparte;
          return (
            <div className="fixed inset-0 z-[85] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 440, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: 'Roboto, sans-serif' }}>
                <div className="flex flex-col items-center gap-2 pt-6 px-6">
                  <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#9ca3af' }}>Traspaso</div>
                  <div className="text-lg font-extrabold" style={{ color: '#1a2b6b' }}>{peticion.id}</div>
                  <div className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: 'rgba(37,99,235,0.14)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#2563eb' }}>local_shipping</span>
                  </div>
                  <div className="text-sm font-extrabold text-center" style={{ color: '#1a1a2e' }}>Embarques compatibles hacia {destinoLabel}</div>
                  <p className="text-xs text-center" style={{ color: '#555' }}>
                    Encontramos <strong>{compatibles.length}</strong> embarque(s) abiertos. ¿Agregar este traspaso a uno existente o generar uno nuevo?
                  </p>
                </div>
                <div className="px-5 mt-3 flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                  {compatibles.map(e => (
                    <button
                      key={e.id}
                      onClick={() => agregarA(e.id)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50"
                      style={{ border: '1px solid #d7dbe6', background: '#fff' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2563eb' }}>local_shipping</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold" style={{ color: '#1a1a2e' }}>{e.id}</div>
                        <div className="text-[10px]" style={{ color: '#6b7280' }}>
                          {e.traspasos.length} traspaso(s) · {e.paqueteria || 'Sin paquetería'} · {e.fecha}
                        </div>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#9ca3af' }}>arrow_forward</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 px-5 py-4 mt-2">
                  <button onClick={cerrarFlujo} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                  <button onClick={crearNuevo} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#1a2b6b' }}>Generar nuevo</button>
                </div>
              </div>
            </div>
          );
        }

        // ── Paso 2b: sin compatibles → confirmar creación ──
        if (faseEmb === 'confirmarCreacion') {
          const destinoLabel = peticion.sucursalDestino ?? peticion.sucursalContraparte;
          return (
            <div className="fixed inset-0 z-[85] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 380, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: 'Roboto, sans-serif' }}>
                <div className="flex flex-col items-center gap-2 pt-6 px-6">
                  <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#9ca3af' }}>Traspaso</div>
                  <div className="text-lg font-extrabold" style={{ color: '#1a2b6b' }}>{peticion.id}</div>
                  <div className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: 'rgba(37,99,235,0.14)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#2563eb' }}>add_box</span>
                  </div>
                  <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>Crear embarque</div>
                </div>
                <p className="text-xs mt-3 px-6 text-center" style={{ color: '#555' }}>
                  No hay embarques abiertos hacia <strong>{destinoLabel}</strong>. Se generará un <strong>embarque nuevo</strong> para apartar este traspaso.
                </p>
                <div className="flex gap-2 px-6 py-5 mt-2">
                  <button onClick={cerrarFlujo} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                  <button onClick={crearNuevo} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#2563eb' }}>Sí, crear</button>
                </div>
              </div>
            </div>
          );
        }

        // ── Paso 3: éxito — "Embarque creado" o "Traspaso unificado" ──
        if (faseEmb === 'exito' && embarqueResultado) {
          const emb = embarquesTraspaso.find(e => e.id === embarqueResultado.id);
          const traspasosDelEmbarque = emb?.traspasos ?? [];
          const titulo = embarqueResultado.unificado ? 'Traspaso unificado a embarque existente' : 'Embarque creado con éxito';
          const accionCTA = embarqueResultado.unificado ? 'Sí, editar' : 'Sí, documentar';
          const preguntaFlujo = embarqueResultado.unificado ? 'edición' : 'documentación';
          return (
            <div className="fixed inset-0 z-[85] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 440, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: 'Roboto, sans-serif' }}>
                {/* Header: embarque ID + lista de traspasos que contiene. */}
                <div className="px-6 pt-5 pb-4" style={{ background: 'rgba(37,99,235,0.06)', borderBottom: '1px solid rgba(37,99,235,0.15)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#6b7280' }}>Embarque</div>
                      <div className="text-lg font-extrabold" style={{ color: '#1a2b6b' }}>#{embarqueResultado.id}</div>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#2563eb' }}>local_shipping</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: '#6b7280' }}>
                      Traspasos ({traspasosDelEmbarque.length})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {traspasosDelEmbarque.map(tid => (
                        <span
                          key={tid}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{
                            background: tid === peticion.id ? 'rgba(22,163,74,0.14)' : 'rgba(37,99,235,0.10)',
                            color: tid === peticion.id ? '#16a34a' : '#1d4ed8',
                            border: tid === peticion.id ? '1px solid rgba(22,163,74,0.35)' : '1px solid rgba(37,99,235,0.25)',
                          }}
                        >
                          {tid}{tid === peticion.id ? ' (nuevo)' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 pt-4 px-6">
                  <div className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: 'rgba(22,163,74,0.14)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#16a34a' }}>check_circle</span>
                  </div>
                  <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>{titulo}</div>
                </div>
                <p className="text-xs mt-3 px-6 text-center" style={{ color: '#555' }}>
                  ¿Desea continuar con la <strong>{preguntaFlujo} del embarque</strong>?
                </p>
                <div className="flex gap-2 px-6 py-5 mt-2">
                  <button onClick={cerrarFlujo} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Después</button>
                  <button onClick={irADocumentacion} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#16a34a' }}>{accionCTA}</button>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

    </div>
  );
}
