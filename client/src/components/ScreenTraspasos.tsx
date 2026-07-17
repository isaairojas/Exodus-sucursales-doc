// ============================================================
// APYMSA — ScreenTraspasos
// Gestión de traspasos de mercancía: vista unificada estilo almacén
// (entre sucursales + CEDIS en una sola tabla, por Tipo Pendiente/Recibir)
// Design: Enterprise Precision
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoStatus, TraspasoTipo, TRASPASO_STATUS_POR_TIPO, TRASPASO_CATEGORIA_LABELS,
  TraspasoCategoria, SUCURSAL_ALMACEN_CODIGOS, formatFechaCorta,
} from '@/lib/data';
import ModalTraspasoDetail from './ModalTraspasoDetail';
import ModalSurtirTraspaso from './ModalSurtirTraspaso';
import ModalRecepcionTraspaso from './ModalRecepcionTraspaso';
import ModalEmbarcarTraspaso from './ModalEmbarcarTraspaso';
import ModalHistorialTraspaso from './ModalHistorialTraspaso';
import ModalDetalleCajaTraspaso from './ModalDetalleCajaTraspaso';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  tipoFilter: TraspasoTipo;
  onNuevaSolicitud?: () => void;
  onSolicitarCedis?: () => void;
}

const TODAY = new Date().toISOString().slice(0, 10);

function porcentajeColor(pct: number) {
  if (pct >= 100) return '#16a34a';
  if (pct >= 50) return '#d97706';
  if (pct > 0) return '#d97706';
  return '#9ca3af';
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
  const colCajas = tipoFilter === 'Entrante' ? 'Cajas Recibidas' : 'Cajas Enviadas';
  const colPorcentaje = tipoFilter === 'Entrante' ? '% Recepción' : '% Enviado';
  const COLUMNS = [
    'No. de pedido', 'No. Papeleta', 'No. Almacén', 'Nombre Almacén',
    'Fecha traspaso', colFechaSegunda, 'Packing List', colCajas, colPorcentaje,
    'Historial', 'Detalle caja',
  ];

  // Filtros
  const [fechaInicial, setFechaInicial] = useState(TODAY);
  const [fechaFinal, setFechaFinal] = useState(TODAY);
  const [filterStatus, setFilterStatus] = useState<'ALL' | TraspasoStatus>('ALL');
  const [filterCategoria, setFilterCategoria] = useState<'ALL' | TraspasoCategoria>('ALL');
  const [searchText, setSearchText] = useState('');

  // Selección de fila
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modales
  const [detailPetId, setDetailPetId] = useState<string | null>(null);
  const [surtirPetId, setSurtirPetId] = useState<string | null>(null);
  const [recepcionPetId, setRecepcionPetId] = useState<string | null>(null);
  const [embarcarPetId, setEmbarcarPetId] = useState<string | null>(null);
  const [historialPetId, setHistorialPetId] = useState<string | null>(null);
  const [detalleCajaPetId, setDetalleCajaPetId] = useState<string | null>(null);

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

  const historialPeticion = useMemo(
    () => traspasos.find(t => t.id === historialPetId) ?? null,
    [traspasos, historialPetId]
  );

  const detalleCajaPeticion = useMemo(
    () => traspasos.find(t => t.id === detalleCajaPetId) ?? null,
    [traspasos, detalleCajaPetId]
  );

  // Filtrado principal
  const filteredTraspasos = useMemo(() => {
    return traspasosDelTipo.filter(t => {
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (filterCategoria !== 'ALL' && t.categoria !== filterCategoria) return false;
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
  }, [traspasosDelTipo, filterStatus, filterCategoria, fechaInicial, fechaFinal, searchText]);

  const handleClearFilters = () => {
    setFechaInicial(TODAY);
    setFechaFinal(TODAY);
    setFilterStatus('ALL');
    setFilterCategoria('ALL');
    setSearchText('');
  };

  const handleRowClick = (id: string) => setSelectedId(prev => prev === id ? null : id);
  const handleRowDoubleClick = (id: string) => setDetailPetId(id);

  // Lógica de botones de acción
  const sel = selectedPeticion;
  const canVerDetalle = !!sel;
  const canDarEntrada = !!sel && sel.status === 'Enviado';
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
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'ALL' | TraspasoStatus)}
            className="text-xs rounded border px-2 py-1"
            style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
          >
            <option value="ALL">Todos los estatus</option>
            {TRASPASO_STATUS_POR_TIPO[tipoFilter].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value as 'ALL' | TraspasoCategoria)}
            className="text-xs rounded border px-2 py-1"
            style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
          >
            <option value="ALL">Todos los tipos</option>
            <option value="Automático">{TRASPASO_CATEGORIA_LABELS.Automático}</option>
            <option value="Manual">{TRASPASO_CATEGORIA_LABELS.Manual}</option>
            <option value="CEDIS">{TRASPASO_CATEGORIA_LABELS.CEDIS}</option>
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
              const pct = t.cajasTotal > 0 ? Math.round((t.cajasRecibidas / t.cajasTotal) * 100) : 0;

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
                    <span className="text-xs" style={{ color: '#6b7280' }}>{pedidosLabel}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>{t.noPapeleta}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: '#6b7280' }}>
                      {SUCURSAL_ALMACEN_CODIGOS[t.sucursalContraparte] ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm" style={{ color: '#374151' }}>
                    <span style={{ color: '#9ca3af' }}>{sucursalPrefix}</span>
                    {t.sucursalContraparte}
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
                    <span className="text-xs font-medium" style={{ color: t.packingList ? '#16a34a' : '#9ca3af' }}>
                      {t.packingList ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>
                      {t.cajasRecibidas}/{t.cajasTotal}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-semibold" style={{ color: porcentajeColor(pct) }}>{pct}%</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={e => { e.stopPropagation(); setHistorialPetId(t.id); }}
                      className="text-xs font-medium underline"
                      style={{ color: '#2563eb' }}
                    >
                      Ver
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={e => { e.stopPropagation(); setDetalleCajaPetId(t.id); }}
                      className="text-xs font-medium underline"
                      style={{ color: '#2563eb' }}
                    >
                      Ver
                    </button>
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

      {historialPeticion && (
        <ModalHistorialTraspaso
          peticion={historialPeticion}
          onClose={() => setHistorialPetId(null)}
        />
      )}

      {detalleCajaPeticion && (
        <ModalDetalleCajaTraspaso
          peticion={detalleCajaPeticion}
          onClose={() => setDetalleCajaPetId(null)}
        />
      )}
    </div>
  );
}
