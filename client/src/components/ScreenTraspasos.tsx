// ============================================================
// APYMSA — ScreenTraspasos
// Gestión de traspasos de mercancía entre sucursales
// Design: Enterprise Precision
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoPeticion, TraspasoStatus, TraspasoTipo, TRASPASO_STATUS_COLORS, TRASPASO_STATUS_POR_TIPO,
  TRASPASO_TIPO_LABELS, TRASPASO_TIPO_ICONS, tiempoTranscurrido,
} from '@/lib/data';
import ModalTraspasoDetail from './ModalTraspasoDetail';
import ModalSurtirTraspaso from './ModalSurtirTraspaso';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  tipoFilter: TraspasoTipo;
}

function TraspasoStatusBadge({ status }: { status: TraspasoStatus }) {
  const c = TRASPASO_STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

function GeneracionBadge({ generacion }: { generacion: 'Automático' | 'Manual' }) {
  const isAutomatico = generacion === 'Automático';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
      style={{
        background: isAutomatico ? 'rgba(107,114,128,0.10)' : 'rgba(217,119,6,0.10)',
        color: isAutomatico ? '#6b7280' : '#d97706',
        border: `1px solid ${isAutomatico ? 'rgba(107,114,128,0.25)' : 'rgba(217,119,6,0.25)'}`,
      }}
    >
      {generacion}
    </span>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function ScreenTraspasos({ showToast, tipoFilter }: Props) {
  const { traspasos, entregarTraspaso } = useApp();

  const traspasosDelTipo = useMemo(
    () => traspasos.filter(t => t.tipo === tipoFilter),
    [traspasos, tipoFilter]
  );

  const sucursalPrefix = tipoFilter === 'Entrante' ? 'De: ' : 'A: ';

  // Filtros
  const [fechaInicial, setFechaInicial] = useState(TODAY);
  const [fechaFinal, setFechaFinal] = useState(TODAY);
  const [filterStatus, setFilterStatus] = useState<'ALL' | TraspasoStatus>('ALL');
  const [searchText, setSearchText] = useState('');

  // Selección de fila
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modales
  const [detailPetId, setDetailPetId] = useState<string | null>(null);
  const [surtirPetId, setSurtirPetId] = useState<string | null>(null);

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

  // Filtrado principal
  const filteredTraspasos = useMemo(() => {
    return traspasosDelTipo.filter(t => {
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      const fechaDate = t.fechaCreacion.slice(0, 10);
      if (fechaInicial && fechaDate < fechaInicial) return false;
      if (fechaFinal && fechaDate > fechaFinal) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const matchSol = t.solicitudId.toLowerCase().includes(q);
        const matchPet = t.id.toLowerCase().includes(q);
        const matchSuc = t.sucursalContraparte.toLowerCase().includes(q);
        const matchCode = t.piezas.some(p => p.code.toLowerCase().includes(q));
        if (!matchSol && !matchPet && !matchSuc && !matchCode) return false;
      }
      return true;
    });
  }, [traspasosDelTipo, filterStatus, fechaInicial, fechaFinal, searchText]);

  const handleClearFilters = () => {
    setFechaInicial(TODAY);
    setFechaFinal(TODAY);
    setFilterStatus('ALL');
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

  const btnEnabled = (active: boolean, bg: string) =>
    active
      ? { background: bg, color: '#fff', cursor: 'pointer', boxShadow: `0 2px 8px ${bg}55`, opacity: 1 }
      : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed', boxShadow: 'none', opacity: 0.6 };

  const btnOutline = (active: boolean) =>
    active
      ? { border: '1.5px solid #1a2b6b', color: '#1a2b6b', background: 'white', cursor: 'pointer' }
      : { border: '1.5px solid #e5e7eb', color: '#9ca3af', background: 'white', cursor: 'not-allowed', opacity: 0.6 };

  // Helpers de tiempo y colores
  const getTiempoStyle = (t: TraspasoPeticion) => {
    const txt = tiempoTranscurrido(t.fechaCreacion);
    const isLate = t.status === 'Pendiente' && (
      txt.includes('d') ||
      (txt.includes('h') && parseInt(txt) >= 4)
    );
    return { text: txt, color: isLate ? '#dc2626' : '#6b7280', showIcon: isLate };
  };

  return (
    <div className="flex flex-col h-full" style={{ background: '#f4f6fa', fontFamily: 'Roboto, sans-serif' }}>

      {/* ── Breadcrumb ── */}
      <div
        className="flex-shrink-0 flex items-center gap-4 px-6 py-3"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swap_horiz</span>
          Traspasos
        </span>
        <span className="text-gray-300">/</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          {TRASPASO_TIPO_LABELS[tipoFilter]}
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: tipoFilter === 'Entrante' ? '#2563eb' : '#7c3aed' }}>
            {TRASPASO_TIPO_ICONS[tipoFilter]}
          </span>
        </span>
      </div>

      {/* ── Filter bar ── */}
      <div
        className="flex items-center gap-3 px-6 py-3 flex-wrap"
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}
      >
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
            placeholder="Buscar solicitud, sucursal, código…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="text-xs rounded border pl-7 pr-3 py-1"
            style={{ borderColor: '#d1d5db', width: 240 }}
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

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-auto" style={{ borderTop: '1px solid #e5e7eb' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
              {['Tipo','Solicitud','Petición','Sucursal','Estatus','Fecha','Tiempo','Pedido origen','Piezas'].map(col => (
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
                <td colSpan={9} className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>
                  No hay traspasos que coincidan con los filtros
                </td>
              </tr>
            )}
            {filteredTraspasos.map(t => {
              const isSelected = t.id === selectedId;
              const { text: tiempoTxt, color: tiempoColor, showIcon: tiempoIcon } = getTiempoStyle(t);
              const totalSol = t.piezas.reduce((s, p) => s + p.qtySolicitada, 0);
              const totalSurt = t.piezas.reduce((s, p) => s + p.qtySurtida, 0);
              const pedidosLabel = t.pedidoOrigen ? `#${t.pedidoOrigen}` : '—';

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
                    <GeneracionBadge generacion={t.generacion} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: '#9ca3af' }}>#{t.solicitudId}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-xs" style={{ color: '#1a2b6b' }}>#{t.id}</span>
                  </td>
                  <td className="px-3 py-2.5 text-sm" style={{ color: '#374151' }}>
                    <span style={{ color: '#9ca3af' }}>{sucursalPrefix}</span>
                    {t.sucursalContraparte}
                  </td>
                  <td className="px-3 py-2.5">
                    <TraspasoStatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs whitespace-nowrap" style={{ color: '#374151' }}>{t.fechaCreacion}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1 text-xs" style={{ color: tiempoColor }}>
                      {tiempoIcon && (
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                      )}
                      {tiempoTxt}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: '#6b7280' }}>{pedidosLabel}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>
                      {totalSurt} / {totalSol}
                    </span>
                    {t.parcial && (
                      <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(217,119,6,0.12)', color: '#d97706', border: '1px solid rgba(217,119,6,0.3)' }}>
                        Parcial
                      </span>
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

        {/* Separador */}
        <span style={{ color: '#e5e7eb', margin: '0 4px', fontSize: 18 }}>|</span>

        {tipoFilter === 'Entrante' ? (
          <button
            disabled={!canDarEntrada}
            onClick={() => { if (sel) { entregarTraspaso(sel.id); showToast(`Traspaso ${sel.id} marcado como recibido`, 'success'); setSelectedId(null); } }}
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
              onClick={() => { if (sel) showToast('Funcionalidad de embarque en desarrollo', 'info'); }}
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
    </div>
  );
}
