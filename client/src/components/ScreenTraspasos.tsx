// ============================================================
// APYMSA — ScreenTraspasos
// Gestión de traspasos de mercancía: vista unificada estilo almacén
// (entre sucursales + CEDIS en una sola tabla, por Tipo Pendiente/Recibir)
// Design: Enterprise Precision
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoTipo, TraspasoPeticion, TRASPASO_CATEGORIA_LABELS,
  SUCURSAL_ALMACEN_CODIGOS, formatFechaCorta, CEDIS_SUBTIPO_COLORS, TRASPASO_CATEGORIA_COLORS,
} from '@/lib/data';
import ModalTraspasoDetail from './ModalTraspasoDetail';
import ModalSurtirTraspaso from './ModalSurtirTraspaso';
import ModalRecepcionTraspaso from './ModalRecepcionTraspaso';
import ModalEmbarcarTraspaso from './ModalEmbarcarTraspaso';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  tipoFilter: TraspasoTipo;
  onNuevaSolicitud?: () => void;
  onSolicitarCedis?: () => void;
}

const TODAY = new Date().toISOString().slice(0, 10);

type FilterTipo = 'ALL' | 'Automático' | 'Manual' | 'CEDIS-Reabasto' | 'CEDIS-Urgencia';

function porcentajeColor(pct: number) {
  if (pct >= 100) return '#16a34a';
  if (pct >= 50) return '#d97706';
  if (pct > 0) return '#d97706';
  return '#9ca3af';
}

// Recibido/Enviado: CEDIS se cuenta por cajas, entre sucursales por piezas.
function calcularRecibido(t: TraspasoPeticion) {
  const totalSolicitada = t.piezas.reduce((sum, p) => sum + p.qtySolicitada, 0);

  if (t.categoria === 'CEDIS') {
    const estatus: 'En camino' | 'Recibido' = t.cajasTotal > 0 && t.cajasRecibidas >= t.cajasTotal ? 'Recibido' : 'En camino';
    return { num: t.cajasRecibidas, den: t.cajasTotal, unidad: 'cajas' as const, estatus };
  }

  if (t.tipo === 'Saliente') {
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

export default function ScreenTraspasos({ showToast, tipoFilter, onNuevaSolicitud, onSolicitarCedis }: Props) {
  const { traspasos, entregarTraspaso } = useApp();

  const traspasosDelTipo = useMemo(
    () => traspasos.filter(t => t.tipo === tipoFilter),
    [traspasos, tipoFilter]
  );

  const sucursalPrefix = tipoFilter === 'Entrante' ? 'De: ' : 'A: ';

  // Etiquetas de columna: la tabla es una recepción (Entrante) o un envío (Saliente)
  const colFechaSegunda = tipoFilter === 'Entrante' ? 'Fecha Arribo' : 'Fecha Envío';
  const colRecibido = tipoFilter === 'Entrante' ? 'Recibido' : 'Enviado';
  const colPorcentaje = tipoFilter === 'Entrante' ? '% Recepción' : '% Enviado';
  const COLUMNS = [
    'Tipo', 'Almacén', 'No. de pedido', 'No. Papeleta',
    'Fecha traspaso', colFechaSegunda, colRecibido, colPorcentaje, 'Estatus',
  ];

  // Filtros
  const [fechaInicial, setFechaInicial] = useState(TODAY);
  const [fechaFinal, setFechaFinal] = useState(TODAY);
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('ALL');
  const [searchText, setSearchText] = useState('');

  // Selección de fila
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modales
  const [detailPetId, setDetailPetId] = useState<string | null>(null);
  const [surtirPetId, setSurtirPetId] = useState<string | null>(null);
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
      const fechaDate = t.fechaCreacion.slice(0, 10);
      if (fechaInicial && fechaDate < fechaInicial) return false;
      if (fechaFinal && fechaDate > fechaFinal) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const matchSol = t.solicitudId.toLowerCase().includes(q);
        const matchPet = t.id.toLowerCase().includes(q);
        const matchSuc = t.sucursalContraparte.toLowerCase().includes(q);
        const matchPapeleta = t.noPapeleta.toLowerCase().includes(q);
        const matchCode = t.piezas.some(p => p.code.toLowerCase().includes(q));
        if (!matchSol && !matchPet && !matchSuc && !matchPapeleta && !matchCode) return false;
      }
      return true;
    });
  }, [traspasosDelTipo, filterTipo, fechaInicial, fechaFinal, searchText]);

  const handleClearFilters = () => {
    setFechaInicial(TODAY);
    setFechaFinal(TODAY);
    setFilterTipo('ALL');
    setSearchText('');
  };

  const handleRowClick = (id: string) => setSelectedId(prev => prev === id ? null : id);
  const handleRowDoubleClick = (id: string) => setDetailPetId(id);

  // Lógica de botones de acción
  const sel = selectedPeticion;
  const canVerDetalle = !!sel;
  // Debe estar realmente en tránsito (Enviado) además de no estar ya recibido —
  // si no, se puede "dar entrada" a peticiones que ni siquiera se han surtido.
  const canDarEntrada = !!sel && sel.status === 'Enviado' && calcularRecibido(sel).estatus === 'En camino';
  const canSurtir = !!sel && sel.status === 'Pendiente';
  const canEmbarcar = !!sel && sel.status === 'Surtido';

  // Reabasto de CEDIS es de recepción ciega: sin modal de escaneo, entrada directa.
  const handleDarEntrada = () => {
    if (!sel) return;
    if (sel.categoria === 'CEDIS' && sel.subtipoCedis === 'Reabasto') {
      entregarTraspaso(sel.id);
      showToast(`Traspaso ${sel.id} marcado como recibido`, 'success');
      setSelectedId(null);
    } else {
      setRecepcionPetId(sel.id);
    }
  };

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
            {filteredTraspasos.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>
                  No hay traspasos que coincidan con los filtros
                </td>
              </tr>
            )}
            {filteredTraspasos.map(t => {
              const isSelected = t.id === selectedId;
              const pedidosLabel = t.pedidoOrigen ? `#${t.pedidoOrigen}` : '—';
              const tipoLabel = t.categoria === 'CEDIS' && t.subtipoCedis ? t.subtipoCedis : TRASPASO_CATEGORIA_LABELS[t.categoria];
              const tipoColor = t.categoria === 'CEDIS' && t.subtipoCedis
                ? CEDIS_SUBTIPO_COLORS[t.subtipoCedis]
                : TRASPASO_CATEGORIA_COLORS[t.categoria as 'Automático' | 'Manual'];

              const { num: recibidoNum, den: recibidoDen, unidad: recibidoUnidad, estatus: estatusRecibido } = calcularRecibido(t);
              const pct = recibidoDen > 0 ? Math.round((recibidoNum / recibidoDen) * 100) : 0;

              return (
                <tr
                  key={t.id}
                  onClick={() => handleRowClick(t.id)}
                  onDoubleClick={() => handleRowDoubleClick(t.id)}
                  style={{
                    background: isSelected ? 'rgba(26,43,107,0.08)' : '#fff',
                    borderLeft: `3px solid ${isSelected ? '#1a2b6b' : 'transparent'}`,
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                >
                  <td className="px-3 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                      style={{
                        background: tipoColor.bg,
                        color: tipoColor.text,
                        border: `1px solid ${tipoColor.border}`,
                      }}
                    >
                      {tipoLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>
                      <span style={{ color: '#9ca3af' }}>{sucursalPrefix}</span>
                      {t.sucursalContraparte} ({SUCURSAL_ALMACEN_CODIGOS[t.sucursalContraparte] ?? '—'})
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: '#6b7280' }}>{pedidosLabel}</span>
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
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#374151' }}>
                      {recibidoNum}/{recibidoDen} {recibidoUnidad}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-semibold" style={{ color: porcentajeColor(pct) }}>{pct}%</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
                      style={
                        estatusRecibido === 'Recibido'
                          ? { background: 'rgba(22,163,74,0.10)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)' }
                          : { background: 'rgba(217,119,6,0.10)', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }
                      }
                    >
                      {estatusRecibido}
                    </span>
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

        {/* Separador */}
        <span style={{ color: '#e5e7eb', margin: '0 4px', fontSize: 18 }}>|</span>

        {tipoFilter === 'Entrante' ? (
          <button
            disabled={!canDarEntrada}
            onClick={handleDarEntrada}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={btnEnabled(canDarEntrada, '#16a34a')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>inventory</span>
            Dar entrada
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
        />
      )}

      {surtirPeticion && (
        <ModalSurtirTraspaso
          peticion={surtirPeticion}
          onClose={() => setSurtirPetId(null)}
          showToast={showToast}
        />
      )}

      {recepcionPeticion && (
        <ModalRecepcionTraspaso
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
