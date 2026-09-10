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
  TraspasoEstadoAlto, TraspasoEtapa, estadoAltoTraspaso, etapaTraspaso,
  TRASPASO_ETAPAS, TRASPASO_ETAPA_COLORS, perspectivaTraspaso, MOTIVO_ENVIO_CEDIS_COLORS,
  TRASPASO_ETAPA_TOOLTIP, TRASPASO_CATEGORIA_TOOLTIP, PRODUCT_CATALOG,
} from '@/lib/data';
import { exportarExcel } from '@/lib/exportExcel';
import { imprimirTraspaso } from '@/lib/printDoc';
import { TRASPASO_DIAS_VENCIDO_SURTIDO, TRASPASO_DIAS_VENCIDO_CEDIS } from '@/lib/traspasoConfig';
import ModalTraspasoDetail from './ModalTraspasoDetail';
import ModalSurtidoHH from './ModalSurtidoHH';
import ModalConfirmarRecepcion from './ModalConfirmarRecepcion';
import ModalEmbarcarTraspaso from './ModalEmbarcarTraspaso';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  tipoFilter: TraspasoTipo;
  onNuevaSolicitud?: () => void;
  onSolicitarCedis?: () => void;
  onEnviarCedis?: () => void;
  onReasignar?: (petId: string) => void;
}

const TODAY = new Date().toISOString().slice(0, 10);

// Rango por defecto: ~30 días atrás hasta fin de mes, para incluir los traspasos
// vencidos (varios días de antigüedad) además de los recientes.
const _now = new Date();
const _desde = new Date(_now.getTime() - 30 * 86_400_000);
const MONTH_START = `${_desde.getFullYear()}-${String(_desde.getMonth() + 1).padStart(2, '0')}-${String(_desde.getDate()).padStart(2, '0')}`;
const _lastDay = new Date(_now.getFullYear(), _now.getMonth() + 1, 0);
const MONTH_END = `${_lastDay.getFullYear()}-${String(_lastDay.getMonth() + 1).padStart(2, '0')}-${String(_lastDay.getDate()).padStart(2, '0')}`;

type FilterTipo = 'ALL' | 'Automático' | 'Manual' | 'CEDIS-Reabasto' | 'CEDIS-Urgencia';

const ESTADOS_ALTO: TraspasoEstadoAlto[] = ['Pendiente', 'Finalizado', 'Cancelado'];

// Paleta estable para agrupar visualmente las peticiones de una misma
// solicitud (comparten color de acento para leerse como un mismo grupo).
const GROUP_COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#db2777', '#0891b2', '#65a30d', '#9333ea'];

// ── SLA / control de tiempos ──
// Estatus en los que la petición sigue PENDIENTE POR SURTIR (cuenta para vencido).
const PENDIENTE_SURTIR_STATUS: TraspasoStatus[] = ['Pendiente'];
// Estatus "surtido/revisado pero aún sin enviar" (pendientes por envío).
// Pendiente por envío = revisado/documentado sin enviar (documentación pendiente).
const PENDIENTE_ENVIO_STATUS: TraspasoStatus[] = ['Revisado', 'Documentado'];
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
  if (t.categoria === 'CEDIS') {
    return CEDIS_NO_RECIBIDO.includes(t.status) && diasDesdeCreacion(t.fechaCreacion) >= TRASPASO_DIAS_VENCIDO_CEDIS;
  }
  return PENDIENTE_SURTIR_STATUS.includes(t.status) && diasDesdeCreacion(t.fechaCreacion) >= TRASPASO_DIAS_VENCIDO_SURTIDO;
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
  if (t.status === 'Cancelado' && t.resultado === 'rechazada') tags.push({ label: 'Rechazado', icon: 'cancel', color: '#dc2626' });
  return tags;
}

// Cards de control = filtros. Cada una define su predicado; al hacer click filtra
// dentro de la respuesta ya filtrada (no del universo completo).
interface CardDef { key: string; label: string; sub: string; color: string; icon: string; match: (t: TraspasoPeticion) => boolean; }
const CARD_DEFS: CardDef[] = [
  { key: 'vencidos', label: 'Vencidos', sub: `+${TRASPASO_DIAS_VENCIDO_SURTIDO}d por surtir`, color: '#dc2626', icon: 'event_busy',
    match: esVencidoSurtir },
  { key: 'pendientesSurtir', label: 'Pendientes por surtir', sub: 'aún sin surtir', color: '#d97706', icon: 'package_2',
    match: t => t.status === 'Pendiente' },
  { key: 'pendienteRevision', label: 'Pendiente revisión', sub: 'surtido, por revisar', color: '#7c3aed', icon: 'fact_check',
    match: t => t.status === 'Surtido' },
  { key: 'pendientesEnvio', label: 'Pendientes por envío', sub: 'documentación pendiente', color: '#0d9488', icon: 'outbox',
    match: t => PENDIENTE_ENVIO_STATUS.includes(t.status) },
  { key: 'parciales', label: 'Surtido con parcialidad', sub: 'surtido/revisado parcial', color: '#1B3892', icon: 'splitscreen',
    match: t => !!t.parcial && (t.status === 'Surtido' || t.status === 'Revisado') },
  { key: 'enviados', label: 'Enviados', sub: 'en tránsito', color: '#2563eb', icon: 'local_shipping',
    match: t => t.status === 'Enviado' },
  { key: 'finalizados', label: 'Finalizado', sub: 'con entrada a mercancía', color: '#16a34a', icon: 'inventory',
    match: t => t.status === 'Recibido' || t.status === 'Entregado' },
];

// Filtros que NO se muestran como card (pero sí se pueden aplicar como chip).
// Rechazados: la sucursal que rechazó NO los reasigna, pero puede querer verlos.
const FILTER_ONLY_DEFS: CardDef[] = [
  { key: 'rechazados', label: 'Rechazados', sub: 'solo consulta', color: '#dc2626', icon: 'cancel',
    match: t => t.status === 'Cancelado' && t.resultado === 'rechazada' },
];
const ALL_FILTER_DEFS: CardDef[] = [...CARD_DEFS, ...FILTER_ONLY_DEFS];

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

export default function ScreenTraspasos({ showToast, tipoFilter, onNuevaSolicitud, onSolicitarCedis, onEnviarCedis, onReasignar }: Props) {
  const { traspasos, sucursalActual, reasignarPeticion, generarSolicitudRestante } = useApp();

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
  const colRecibido = tipoFilter === 'Entrante' ? 'Recibido' : 'Enviado';
  const colPorcentaje = tipoFilter === 'Entrante' ? '% Recepción' : '% Enviado';
  const COLUMNS = [
    'Tipo', 'Solicitud', 'Almacén', 'Pedido cliente', 'No. Papeleta',
    'Fecha traspaso', colFechaSegunda, colRecibido, colPorcentaje, 'Estado', 'SLA',
  ];

  // Filtros — al entrar: mes en curso y SIN filtros de estado/etapa
  const [fechaInicial, setFechaInicial] = useState(MONTH_START);
  const [fechaFinal, setFechaFinal] = useState(MONTH_END);
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('ALL');
  const [searchText, setSearchText] = useState('');
  // Estado alto (Pendiente/Finalizado/Cancelado). En "Por recibir" (Entrante)
  // se entra con "Pendiente" marcado por defecto; en "Por enviar" sin filtro.
  // Al entrar a la ventana (Por enviar o Por recibir) el filtro por defecto es "Pendiente".
  const [filterEstados, setFilterEstados] = useState<Set<TraspasoEstadoAlto>>(
    () => new Set<TraspasoEstadoAlto>(['Pendiente'])
  );
  const [filterEtapa, setFilterEtapa] = useState<'ALL' | TraspasoEtapa>('ALL');
  const [cardFilter, setCardFilter] = useState<string | null>(null); // card de control activa (filtra la respuesta)

  const toggleEstado = (e: TraspasoEstadoAlto) =>
    setFilterEstados(prev => {
      const next = new Set(prev);
      next.has(e) ? next.delete(e) : next.add(e);
      return next;
    });

  // Selección de fila
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modales
  const [detailPetId, setDetailPetId] = useState<string | null>(null);
  const [surtirPetId, setSurtirPetId] = useState<string | null>(null);
  const [revisarPetId, setRevisarPetId] = useState<string | null>(null);
  const [recepcionPetId, setRecepcionPetId] = useState<string | null>(null);
  const [embarcarPetId, setEmbarcarPetId] = useState<string | null>(null);

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
        if (!(t.categoria === 'CEDIS' && t.subtipoCedis === 'Reabasto')) return false;
      } else if (filterTipo === 'CEDIS-Urgencia') {
        if (!(t.categoria === 'CEDIS' && t.subtipoCedis === 'Urgencia')) return false;
      } else if (filterTipo !== 'ALL' && t.categoria !== filterTipo) {
        return false;
      }
      // Estado alto (Pendiente/Finalizado/Cancelado): vacío = todos
      if (filterEstados.size > 0 && !filterEstados.has(estadoAltoTraspaso(t.status))) return false;
      // Etapa operativa
      if (filterEtapa !== 'ALL' && etapaTraspaso(t.status) !== filterEtapa) return false;
      const fechaDate = t.fechaCreacion.slice(0, 10);
      if (fechaInicial && fechaDate < fechaInicial) return false;
      if (fechaFinal && fechaDate > fechaFinal) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const matchSol = t.solicitudId.toLowerCase().includes(q);
        const matchPet = t.id.toLowerCase().includes(q);
        const matchSuc = perspectivaTraspaso(t, sucursalActual).contraparte.toLowerCase().includes(q);
        const matchPapeleta = t.noPapeleta.toLowerCase().includes(q);
        const matchCode = t.piezas.some(p => p.code.toLowerCase().includes(q));
        if (!matchSol && !matchPet && !matchSuc && !matchPapeleta && !matchCode) return false;
      }
      return true;
    });
  }, [traspasosDelTipo, filterTipo, filterEstados, filterEtapa, fechaInicial, fechaFinal, searchText, sucursalActual]);

  // Conteo por card sobre la RESPUESTA ya filtrada (no el universo).
  const cardCounts = useMemo(() => {
    const c: Record<string, number> = {};
    ALL_FILTER_DEFS.forEach(def => { c[def.key] = filteredTraspasos.filter(def.match).length; });
    return c;
  }, [filteredTraspasos]);

  // Rechazados: se cuenta sobre TODO el universo del tab (no se ocultan por el
  // filtro de estado, que por defecto es "Pendiente"), para mostrar su cantidad real.
  const rechazadosUniverso = useMemo(
    () => traspasosDelTipo.filter(t => t.status === 'Cancelado' && t.resultado === 'rechazada').length,
    [traspasosDelTipo]
  );

  // Al activar una card/filtro, se filtra dentro de la respuesta ya filtrada.
  const filteredConCard = useMemo(() => {
    if (!cardFilter) return filteredTraspasos;
    const def = ALL_FILTER_DEFS.find(d => d.key === cardFilter);
    return def ? filteredTraspasos.filter(def.match) : filteredTraspasos;
  }, [filteredTraspasos, cardFilter]);

  // Agrupación por solicitud: las peticiones de una misma solicitud se ordenan
  // juntas y comparten un color de acento, para que siempre se vean como grupo.
  const { rows, solCount, solColor } = useMemo(() => {
    const arr = [...filteredConCard].sort((a, b) =>
      a.solicitudId === b.solicitudId
        ? (a.intento ?? 0) - (b.intento ?? 0)
        : a.solicitudId.localeCompare(b.solicitudId)
    );
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
  }, [filteredConCard]);

  // Rechazados: no es card, es un filtro de consulta. Como los rechazados están
  // en estado alto "Cancelado" (excluido por defecto), al activarlo forzamos ese
  // estado; al quitarlo restauramos el estado por defecto de la vista.
  const toggleRechazados = () => {
    if (cardFilter === 'rechazados') {
      setCardFilter(null);
      setFilterEstados(new Set<TraspasoEstadoAlto>(['Pendiente']));
    } else {
      setCardFilter('rechazados');
      setFilterEstados(new Set<TraspasoEstadoAlto>(['Cancelado']));
    }
  };

  const handleClearFilters = () => {
    setFechaInicial(MONTH_START);
    setFechaFinal(MONTH_END);
    setFilterTipo('ALL');
    setSearchText('');
    setFilterEstados(new Set<TraspasoEstadoAlto>(['Pendiente']));
    setFilterEtapa('ALL');
    setCardFilter(null);
  };

  // Exporta a Excel lo que se ve en la tabla (filtrada) + el desglose de piezas.
  const handleExportExcel = () => {
    const tabla = rows.map(t => {
      const per = perspectivaTraspaso(t, sucursalActual);
      const { num, den, unidad } = calcularRecibido(t, per.tipo);
      const tipo = t.motivoEnvioCedis ?? (t.categoria === 'CEDIS' && t.subtipoCedis ? t.subtipoCedis : TRASPASO_CATEGORIA_LABELS[t.categoria]);
      return {
        Tipo: tipo,
        Solicitud: t.solicitudId,
        Traspaso: t.id,
        Almacén: `${per.tipo === 'Entrante' ? 'De: ' : 'A: '}${per.contraparte}`,
        'Pedido cliente': t.pedidoOrigen || 'Sin pedido',
        'No. papeleta': t.noPapeleta,
        'Fecha traspaso': formatFechaCorta(t.fechaCreacion),
        [colRecibido]: `${num}/${den} ${unidad}`,
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
  const canSurtir = noEsCedis && sel!.status === 'Pendiente';
  const canRevisar = noEsCedis && sel!.status === 'Surtido';
  const canEmbarcar = noEsCedis && sel!.status === 'Revisado';
  // Escenarios de recálculo por la sucursal solicitante:
  // - Rechazada en su totalidad → reasignar (nueva petición por el faltante).
  // - Surtida/revisada parcialmente → nueva solicitud por el restante.
  const faltanteDe = (t: TraspasoPeticion) => t.piezas.reduce((s, p) => s + Math.max(0, p.qtySolicitada - p.qtySurtida), 0);
  const esRechazadaTotal = !!sel && sel.status === 'Cancelado' && sel.resultado === 'rechazada';
  const esParcial = !!sel && sel.parcial === true && sel.status !== 'Cancelado' && faltanteDe(sel) > 0;
  // El recálculo (reasignar / generar restante) SOLO existe en "Por recibir": lo
  // decide la sucursal que SOLICITÓ. En "Por enviar" la sucursal que ve el traspaso
  // es la que rechazó/surtió, así que esas opciones no aplican.
  const esPorRecibir = tipoFilter === 'Entrante';
  // Rechazo total → solo reasignar. Parcial → el logístico decide: reasignar o generar solicitud por el restante.
  const canReasignar = esPorRecibir && !!sel && !sel.peticionSiguienteId && (esRechazadaTotal || esParcial);
  const canGenerarRestante = esPorRecibir && !!sel && !sel.peticionSiguienteId && esParcial;

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
  const canConfirmarRecepcion = !!sel && (sel.status === 'Enviado' || sel.status === 'Recibido');

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

      {/* ── Cards de control (filtros sobre la respuesta) ── */}
      <div className="flex gap-2 px-6 py-3 overflow-x-auto items-center" style={{ background: '#f4f6fa', flexShrink: 0 }}>
        {CARD_DEFS.map(c => {
          const val = cardCounts[c.key] ?? 0;
          const activa = cardFilter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCardFilter(activa ? null : c.key)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 flex-shrink-0 transition-all text-left"
              title={activa ? 'Quitar filtro' : `Filtrar: ${c.label}`}
              style={{ background: activa ? `${c.color}12` : '#fff', border: `1.5px solid ${activa ? c.color : '#e5e7eb'}`, minWidth: 152, cursor: 'pointer' }}
            >
              <div className="flex items-center justify-center rounded-md" style={{ width: 30, height: 30, background: `${c.color}14`, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: c.color }}>{c.icon}</span>
              </div>
              <div>
                <span className="text-lg font-extrabold leading-none" style={{ color: val > 0 ? c.color : '#9ca3af' }}>{val}</span>
                <div className="text-[11px] font-semibold leading-tight whitespace-normal" style={{ color: '#374151' }}>{c.label}</div>
                <div className="text-[9px] leading-tight whitespace-normal" style={{ color: '#9ca3af' }}>{c.sub}</div>
              </div>
            </button>
          );
        })}

        {/* Rechazados: card con la cantidad real (universo del tab). La explicación
            depende de la perspectiva: en "Por recibir" los rechazó la sucursal
            donante; en "Por enviar" son los que rechazó esta sucursal. */}
        {(() => {
          const activa = cardFilter === 'rechazados';
          const sub = esPorRecibir ? 'los rechazó la sucursal donante' : 'los que rechazaste tú';
          const tip = esPorRecibir
            ? 'Peticiones que la sucursal donante rechazó. Como sucursal solicitante puedes reasignarlas a otra sucursal.'
            : 'Peticiones que tu sucursal rechazó como donante (no las surtiste).';
          return (
            <button
              onClick={toggleRechazados}
              className="flex items-center gap-2 rounded-lg px-3 py-2 flex-shrink-0 transition-all text-left"
              title={activa ? 'Quitar filtro de rechazados' : tip}
              style={{ background: activa ? 'rgba(220,38,38,0.12)' : '#fff', border: `1.5px solid ${activa ? '#dc2626' : '#e5e7eb'}`, minWidth: 152, cursor: 'pointer' }}
            >
              <div className="flex items-center justify-center rounded-md" style={{ width: 30, height: 30, background: 'rgba(220,38,38,0.14)', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#dc2626' }}>cancel</span>
              </div>
              <div>
                <span className="text-lg font-extrabold leading-none" style={{ color: rechazadosUniverso > 0 ? '#dc2626' : '#9ca3af' }}>{rechazadosUniverso}</span>
                <div className="text-[11px] font-semibold leading-tight whitespace-normal" style={{ color: '#374151' }}>Rechazados</div>
                <div className="text-[9px] leading-tight whitespace-normal" style={{ color: '#9ca3af' }}>{sub}</div>
              </div>
            </button>
          );
        })()}

        {cardFilter && cardFilter !== 'rechazados' && (
          <button onClick={() => setCardFilter(null)} className="flex items-center gap-1 text-xs font-semibold flex-shrink-0 px-2 py-1 rounded" style={{ color: '#6b7280' }}>
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
              value={fechaInicial}
              onChange={e => setFechaInicial(e.target.value)}
              className="text-xs rounded border px-2 py-1"
              style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Fecha final</label>
            <input
              type="date"
              value={fechaFinal}
              onChange={e => setFechaFinal(e.target.value)}
              className="text-xs rounded border px-2 py-1"
              style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
            />
          </div>

          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-2" style={{ fontSize: 15, color: '#9ca3af' }}>search</span>
            <input
              type="text"
              placeholder="Buscar solicitud, sucursal, papeleta, código…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="text-xs rounded border pl-7 pr-3 py-1"
              style={{ borderColor: '#d1d5db', width: 260 }}
            />
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
            <option value="CEDIS-Reabasto">CEDIS Reabasto</option>
            <option value="CEDIS-Urgencia">CEDIS Urgencia</option>
          </select>

          {/* Estado alto: Pendiente / Finalizado / Cancelado (vacío = todos) */}
          <div className="flex items-center gap-3 rounded-lg px-3 py-1.5" style={{ background: '#f8f9fb', border: '1px solid #e5e7eb' }}>
            {ESTADOS_ALTO.map(est => {
              const checked = filterEstados.has(est);
              const color = est === 'Cancelado' ? '#dc2626' : est === 'Finalizado' ? '#16a34a' : '#1a2b6b';
              return (
                <label key={est} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={checked} onChange={() => toggleEstado(est)}
                    className="w-3.5 h-3.5 rounded" style={{ accentColor: color }} />
                  <span className="text-xs font-medium" style={{ color: checked ? color : '#6b7280' }}>{est}</span>
                </label>
              );
            })}
          </div>

          {/* Etapa operativa */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Etapa</label>
            <select
              value={filterEtapa}
              onChange={e => setFilterEtapa(e.target.value as 'ALL' | TraspasoEtapa)}
              className="text-xs rounded border px-2 py-1"
              style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
            >
              <option value="ALL">Todas las etapas</option>
              {TRASPASO_ETAPAS.map(et => <option key={et} value={et}>{et}</option>)}
            </select>
          </div>

          <button
            onClick={() => setSearchText(searchText)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{ border: '1.5px solid #1a2b6b', color: '#1a2b6b', background: 'white' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
            Refrescar
          </button>

          <button
            onClick={handleClearFilters}
            className="text-xs px-3 py-1.5 rounded transition-all"
            style={{ color: '#6b7280', background: 'transparent' }}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="flex items-center gap-2 md:ml-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold transition-all"
            style={{ border: '1.5px solid #16a34a', color: '#16a34a', background: 'white' }}
            title="Exportar a Excel la tabla filtrada y el desglose de piezas"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>table_view</span>
            Exportar Excel
          </button>
          {onEnviarCedis && (
            <button
              onClick={onEnviarCedis}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold transition-all"
              style={{ border: '1.5px solid #1a2b6b', color: '#1a2b6b', background: 'white' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>local_shipping</span>
              Enviar a CEDIS
            </button>
          )}
          {onSolicitarCedis && (
            <button
              onClick={onSolicitarCedis}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold transition-all"
              style={{ border: '1.5px solid #1a2b6b', color: '#1a2b6b', background: 'white' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>warehouse</span>
              Solicitar a CEDIS
            </button>
          )}
          {onNuevaSolicitud && (
            <button
              onClick={onNuevaSolicitud}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white transition-all"
              style={{ background: '#1a2b6b', boxShadow: '0 2px 8px rgba(26,43,107,0.3)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
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
              {COLUMNS.map(col => (
                <th
                  key={col}
                  className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: '#6b7280' }}
                >
                  {col}
                </th>
              ))}
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
              const tipoLabel = t.motivoEnvioCedis
                ? t.motivoEnvioCedis
                : esReabastoUnificado
                  ? 'Reabasto/unificado'
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

              return (
                <tr
                  key={t.id}
                  onClick={() => handleRowClick(t.id)}
                  onDoubleClick={() => handleRowDoubleClick(t.id)}
                  style={{
                    background: isSelected ? 'rgba(26,43,107,0.08)' : '#fff',
                    borderLeft: `3px solid ${isSelected ? '#1a2b6b' : (enGrupo ? groupColor : 'transparent')}`,
                    borderBottom: '1px solid #f3f4f6',
                    borderTop: esInicioGrupo ? '2px solid #e5e7eb' : undefined,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                >
                  <td className="px-3 py-2.5">
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
                  </td>
                  <td className="px-3 py-2.5">
                    {/* Solicitud como texto plano; si agrupa varias peticiones, un icono pegado al texto. */}
                    {enGrupo ? (
                      <span
                        className="inline-flex items-center gap-0.5 text-xs font-semibold whitespace-nowrap"
                        style={{ color: groupColor }}
                        title={`Solicitud ${t.solicitudId} — ${solCount[t.solicitudId]} peticiones relacionadas (se muestran juntas)`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>link</span>
                        {t.solicitudId}
                        <span className="text-[10px] font-bold" style={{ opacity: 0.85 }}>· {solCount[t.solicitudId]}</span>
                      </span>
                    ) : (
                      <span className="text-xs whitespace-nowrap" style={{ color: '#374151' }} title={`Solicitud ${t.solicitudId}`}>
                        {t.solicitudId}
                      </span>
                    )}
                    {t.intento != null && t.intento > 1 && (
                      <span className="ml-1 text-[10px]" style={{ color: '#9ca3af' }}>int. {t.intento}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>
                      <span style={{ color: '#9ca3af' }}>{sucursalPrefix}</span>
                      {per.contraparte} ({SUCURSAL_ALMACEN_CODIGOS[per.contraparte] ?? '—'})
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {/* Pedido de cliente como texto plano; si no tiene, la leyenda "Sin pedido". */}
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
                  <td className="px-3 py-2.5">
                    {esCedis ? (
                      <span className="text-xs" style={{ color: '#9ca3af' }} title="Recepción ciega de CEDIS: sin porcentaje de piezas.">—</span>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: porcentajeColor(pct) }}>{pct}%</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {esUnificada ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                        title={`Solicitud a CEDIS unificada dentro del traspaso de reabasto ${t.unificadaEnTraspaso ?? ''}. Consulta el detalle de la petición.`}
                        style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)', cursor: 'help' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>merge</span>
                        Unificada
                      </span>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                        title={TRASPASO_ETAPA_TOOLTIP[etapa]}
                        style={{ background: etapaColor.bg, color: etapaColor.text, border: `1px solid ${etapaColor.border}`, cursor: 'help' }}
                      >
                        {etapa}
                      </span>
                    )}
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

        {tipoFilter === 'Entrante' ? (
          <button
            disabled={!canConfirmarRecepcion}
            onClick={() => { if (sel) setRecepcionPetId(sel.id); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={btnEnabled(canConfirmarRecepcion, '#16a34a')}
            title="Confirmar que la sucursal ya recibió la mercancía (no da entrada al inventario)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>how_to_reg</span>
            Confirmar recepción
          </button>
        ) : (
          <>
            <button
              disabled={!canSurtir}
              onClick={() => { if (sel) setSurtirPetId(sel.id); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={btnEnabled(canSurtir, '#7c3aed')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>package_2</span>
              Surtir
            </button>

            <button
              disabled={!canRevisar}
              onClick={() => { if (sel) setRevisarPetId(sel.id); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={btnEnabled(canRevisar, '#2563eb')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>qr_code_scanner</span>
              Revisar
            </button>

            <button
              disabled={!canEmbarcar}
              onClick={() => { if (sel) setEmbarcarPetId(sel.id); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={btnEnabled(canEmbarcar, '#d97706')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>local_shipping</span>
              Embarcar
            </button>
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
                title={esRechazadaTotal
                  ? 'Petición rechazada en su totalidad: SMC reasigna toda la mercancía a otra sucursal.'
                  : 'Reasigna la mercancía restante a otra sucursal (misma solicitud, siguiente intento).'}
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
        />
      )}

      {surtirPeticion && (
        <ModalSurtidoHH
          peticion={surtirPeticion}
          onClose={() => setSurtirPetId(null)}
          showToast={showToast}
        />
      )}

      {revisarPeticion && (
        <ModalSurtidoHH
          peticion={revisarPeticion}
          modo="revision"
          onClose={() => { setRevisarPetId(null); setSelectedId(null); }}
          showToast={showToast}
        />
      )}

      {recepcionPeticion && (
        <ModalConfirmarRecepcion
          peticion={recepcionPeticion}
          onClose={() => { setRecepcionPetId(null); setSelectedId(null); }}
          showToast={showToast}
        />
      )}

      {embarcarPeticion && (
        <ModalEmbarcarTraspaso
          peticion={embarcarPeticion}
          onClose={() => { setEmbarcarPetId(null); setSelectedId(null); }}
          showToast={showToast}
        />
      )}

    </div>
  );
}
