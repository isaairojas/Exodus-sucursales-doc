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
  if (t.status === 'Cancelado' && t.resultado === 'rechazada') tags.push({ label: 'Rechazado', icon: 'cancel', color: '#dc2626' });
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
    // Pendientes por envío queda INMEDIATAMENTE antes de Enviados.
    // (La antigua card "Surtido con parcialidad" desaparece: ahora la parcialidad
    // se muestra como badge azul sobre las cards que contengan parciales.)
    { key: 'pendientesEnvio', label: 'Pendientes\npor envío', sub: 'documentación pendiente', color: '#0d9488', icon: 'outbox',
      match: t => PENDIENTE_ENVIO_STATUS.includes(t.status) },
    { key: 'enviados', label: 'Enviados', sub: 'en tránsito', color: '#2563eb', icon: 'local_shipping',
      match: t => t.status === 'Enviado' },
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
const PIPELINE_SUCURSAL: TraspasoStatus[] = ['Pendiente', 'Surtido', 'Revisado', 'Documentado', 'Enviado', 'Recibido', 'Entregado'];
const PIPELINE_CEDIS:    TraspasoStatus[] = ['Pendiente', 'Documentado', 'Enviado', 'Recibido', 'Entregado'];
function pipelineDe(t: TraspasoPeticion): TraspasoStatus[] {
  return t.categoria === 'CEDIS' ? PIPELINE_CEDIS : PIPELINE_SUCURSAL;
}
function avanceDe(t: TraspasoPeticion): { step: number; total: number; pct: number } {
  const p = pipelineDe(t);
  const idx = p.indexOf(t.status);
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

export default function ScreenTraspasos({ showToast, tipoFilter, onNuevaSolicitud, onSolicitarCedis, onEnviarCedis, onReasignar }: Props) {
  const { traspasos, sucursalActual, reasignarPeticion, generarSolicitudRestante, darEntradaInventario } = useApp();

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
  const COLUMNS = [
    'Tipo', 'Solicitud', 'Almacén', 'Pedido cliente', 'No. Papeleta',
    'Fecha traspaso', colFechaSegunda, colRecibido, 'Estado / Avance', 'SLA',
  ];

  // Filtros — al entrar: mes en curso y SIN filtros de estado/etapa
  const [fechaInicial, setFechaInicial] = useState(MONTH_START);
  const [fechaFinal, setFechaFinal] = useState(MONTH_END);
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('ALL');
  const [searchText, setSearchText] = useState('');
  // Búsqueda dinámica: el usuario elige por qué campo buscar (papeleta por defecto).
  type CampoBusqueda = 'papeleta' | 'pedido' | 'peticion' | 'solicitud';
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
  const [revisarPetId, setRevisarPetId] = useState<string | null>(null);
  const [recepcionPetId, setRecepcionPetId] = useState<string | null>(null);
  const [embarcarPetId, setEmbarcarPetId] = useState<string | null>(null);
  // Prompt de continuación del flujo continuo (surtido → revisión → embarque
  // en Por enviar; recepción → dar entrada en Por recibir).
  const [continueFlow, setContinueFlow] = useState<{ petId: string; next: 'revisar' | 'embarcar' | 'entrada' } | null>(null);

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
        const field =
          searchField === 'papeleta'  ? t.noPapeleta :
          searchField === 'pedido'    ? (t.pedidoOrigen ?? '') :
          searchField === 'peticion'  ? t.id :
          /* solicitud */               t.solicitudId;
        if (!field.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [traspasosDelTipo, filterTipo, fechaInicial, fechaFinal, searchText, searchField, sucursalActual]);

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
      case 'Almacén':        return per.contraparte;
      case 'Pedido cliente': return t.pedidoOrigen || 'zzz'; // "sin pedido" al final
      case 'No. Papeleta':   return t.noPapeleta;
      case 'Fecha traspaso': return t.fechaCreacion;
      case 'Fecha Arribo':
      case 'Fecha Envío':    return t.fechaArribo ?? '';
      case 'Recibido':
      case 'Enviado':        return calcularRecibido(t, per.tipo).num;
      case 'Estado / Avance':return avanceDe(t).step;
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
      arr = [...filteredConCard].sort((a, b) =>
        a.solicitudId === b.solicitudId
          ? (a.intento ?? 0) - (b.intento ?? 0)
          : a.solicitudId.localeCompare(b.solicitudId)
      );
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
    setFilterTipo('ALL');
    setSearchText('');
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
              onClick={() => setCardFilter(activa ? null : c.key)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 flex-shrink-0 transition-all text-left relative"
              title={tip}
              style={{ background: activa ? `${c.color}12` : '#fff', border: `1.5px solid ${activa ? c.color : '#e5e7eb'}`, width: 128, height: 78, cursor: 'pointer' }}
            >
              <div className="flex items-center justify-center rounded-md" style={{ width: 30, height: 30, background: `${c.color}14`, flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: c.color }}>{c.icon}</span>
              </div>
              {/* Reservamos altura fija para que labels de 1 o 2 líneas y subs de
                  1 o 2 líneas ocupen siempre el mismo espacio → cards uniformes. */}
              <div className="flex-1 min-w-0">
                <span className="block text-lg font-extrabold leading-none" style={{ color: val > 0 ? c.color : '#9ca3af' }}>{val}</span>
                <div className="text-[11px] font-semibold" style={{ color: '#374151', whiteSpace: 'pre-line', lineHeight: '1.15', height: '2.3em', overflow: 'hidden' }}>{c.label}</div>
                <div className="text-[9px]" style={{ color: '#9ca3af', lineHeight: '1.2', height: '2.4em', overflow: 'hidden' }}>{c.sub}</div>
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
              <option value="pedido">Pedido ID</option>
              <option value="peticion">Petición</option>
              <option value="solicitud">Solicitud</option>
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
                    {/* Solicitud + Petición separados por guión medio.
                        Si la solicitud agrupa varias peticiones, un icono de
                        enlace pegado al texto con el color del grupo. */}
                    {enGrupo ? (
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
                  <td className="px-3 py-2.5" style={{ minWidth: 160 }}>
                    {/* Estado + barra de avance del pipeline. La barra segmentada
                        muestra en qué etapa está el traspaso (paso N de M). Los
                        estados especiales (Draft, Unificada, Cancelado) reemplazan
                        la barra por su badge propio. */}
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
                    ) : t.status === 'Cancelado' ? (
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                        title={TRASPASO_ETAPA_TOOLTIP[etapa]}
                        style={{ background: etapaColor.bg, color: etapaColor.text, border: `1px solid ${etapaColor.border}`, cursor: 'help' }}
                      >
                        {etapa}
                      </span>
                    ) : (() => {
                      const av = avanceDe(t);
                      const pipeline = pipelineDe(t);
                      return (
                        <div className="flex flex-col gap-1" style={{ minWidth: 140 }}>
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap self-start"
                            title={TRASPASO_ETAPA_TOOLTIP[etapa]}
                            style={{ background: etapaColor.bg, color: etapaColor.text, border: `1px solid ${etapaColor.border}`, cursor: 'help' }}
                          >
                            {etapa}
                          </span>
                          <div
                            className="flex items-center gap-0.5"
                            title={`Paso ${av.step} de ${av.total} — ${pipeline[av.step - 1] ?? ''} (${av.pct}%)`}
                          >
                            {pipeline.map((_, i) => {
                              const alcanzado = i < av.step;
                              return (
                                <div key={i} style={{
                                  flex: 1, height: 5, borderRadius: 3,
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

        {tipoFilter === 'Entrante' ? (
          <>
            <button
              disabled={!canConfirmarRecepcion}
              onClick={() => { if (sel) setRecepcionPetId(sel.id); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={btnEnabled(canConfirmarRecepcion, '#0891b2')}
              title="Confirmar que la sucursal ya recibió la mercancía (no da entrada al inventario)"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>how_to_reg</span>
              Confirmar recepción
            </button>
            <button
              disabled={!canDarEntrada}
              onClick={() => {
                if (!sel) return;
                darEntradaInventario(sel.id);
                showToast(`Traspaso ${sel.id} finalizado — entrada al inventario registrada.`, 'success');
                setSelectedId(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={btnEnabled(canDarEntrada, '#16a34a')}
              title="Dar entrada al inventario (Finalizado). Pronto abrirá una ventana dedicada."
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>inventory</span>
              Dar entrada
            </button>
          </>
        ) : (
          <>
            <button
              disabled={!canSurtir}
              onClick={() => { if (sel) setSurtirPetId(sel.id); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={btnEnabled(canSurtir, '#7c3aed')}
              title={surtidoEnHH ? 'Los traspasos automáticos SMC se surten desde la aplicación HH.' : undefined}
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

            {/* Leyenda cuando el traspaso seleccionado es Automático SMC: sólo
                el SURTIDO se hace desde la HH (revisar/embarcar sí en esta app). */}
            {surtidoEnHH && (
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
          onFinalizado={() => setContinueFlow({ petId: surtirPeticion.id, next: 'revisar' })}
        />
      )}

      {revisarPeticion && (
        <ModalSurtidoHH
          peticion={revisarPeticion}
          modo="revision"
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

      {/* Continuación del flujo: aparece tras cada paso exitoso ofreciendo la
          siguiente acción del pipeline. El usuario elige continuar o cerrar. */}
      {continueFlow && (() => {
        const nextMeta = {
          revisar:  { titulo: '¡Surtido finalizado!',           siguiente: 'Continuar con la revisión',  icono: 'fact_check',  color: '#2563eb' },
          embarcar: { titulo: '¡Revisión finalizada!',          siguiente: 'Continuar con embarque',     icono: 'local_shipping', color: '#d97706' },
          entrada:  { titulo: '¡Recepción confirmada!',         siguiente: 'Dar entrada al inventario',  icono: 'inventory',   color: '#16a34a' },
        }[continueFlow.next];
        const doContinue = () => {
          const { petId, next } = continueFlow;
          setContinueFlow(null);
          if (next === 'revisar') setRevisarPetId(petId);
          else if (next === 'embarcar') setEmbarcarPetId(petId);
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
                <button onClick={() => { setContinueFlow(null); setSelectedId(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>
                  Cerrar
                </button>
                <button onClick={doContinue} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: nextMeta.color }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{nextMeta.icono}</span>
                  {nextMeta.siguiente}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
