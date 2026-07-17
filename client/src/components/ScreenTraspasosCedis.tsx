// ============================================================
// APYMSA — ScreenTraspasosCedis
// Recepción de traspasos desde CEDIS (unidireccional, ciega)
// Design: Enterprise Precision
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoStatus, TraspasoSubtipoCedis, TRASPASO_STATUS_CEDIS,
  CEDIS_SUBTIPO_COLORS,
} from '@/lib/data';
import ModalTraspasoDetail from './ModalTraspasoDetail';
import ModalSolicitarCedis from './ModalSolicitarCedis';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

// Papeleta determinista de 6 dígitos derivada del folio de la petición.
function papeletaFor(id: string): string {
  const n = parseInt(id.replace(/\D/g, ''), 10) || 0;
  return String(400000 + (n * 6131) % 599999).padStart(6, '0');
}

// Porcentaje de avance según el estatus del pipeline CEDIS.
function cedisProgress(status: TraspasoStatus): number {
  switch (status) {
    case 'Pendiente':   return 0;
    case 'Documentado': return 50;
    case 'Enviado':     return 80;
    case 'Recibido':    return 100;
    default:            return 0;
  }
}

function CedisSubtipoBadge({ subtipo }: { subtipo: TraspasoSubtipoCedis }) {
  const c = CEDIS_SUBTIPO_COLORS[subtipo];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
        {subtipo === 'Urgencia' ? 'priority_high' : 'autorenew'}
      </span>
      {subtipo}
    </span>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function ScreenTraspasosCedis({ showToast }: Props) {
  const { traspasos, entregarTraspaso } = useApp();

  const traspasosCedis = useMemo(
    () => traspasos.filter(t => t.categoria === 'CEDIS'),
    [traspasos]
  );

  // Filtros
  const [fechaInicial, setFechaInicial] = useState(TODAY);
  const [fechaFinal, setFechaFinal] = useState(TODAY);
  const [filterStatus, setFilterStatus] = useState<'ALL' | TraspasoStatus>('ALL');
  const [filterSubtipo, setFilterSubtipo] = useState<'ALL' | TraspasoSubtipoCedis>('ALL');
  const [searchText, setSearchText] = useState('');

  // Selección de fila
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Modales
  const [detailPetId, setDetailPetId] = useState<string | null>(null);
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);

  const selectedPeticion = useMemo(
    () => traspasos.find(t => t.id === selectedId) ?? null,
    [traspasos, selectedId]
  );

  const detailPeticion = useMemo(
    () => traspasos.find(t => t.id === detailPetId) ?? null,
    [traspasos, detailPetId]
  );

  // Filtrado principal
  const filteredTraspasos = useMemo(() => {
    return traspasosCedis.filter(t => {
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (filterSubtipo !== 'ALL' && t.subtipoCedis !== filterSubtipo) return false;
      const fechaDate = t.fechaCreacion.slice(0, 10);
      if (fechaInicial && fechaDate < fechaInicial) return false;
      if (fechaFinal && fechaDate > fechaFinal) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const matchSol = t.solicitudId.toLowerCase().includes(q);
        const matchPet = t.id.toLowerCase().includes(q);
        if (!matchSol && !matchPet) return false;
      }
      return true;
    });
  }, [traspasosCedis, filterStatus, filterSubtipo, fechaInicial, fechaFinal, searchText]);

  const handleClearFilters = () => {
    setFechaInicial(TODAY);
    setFechaFinal(TODAY);
    setFilterStatus('ALL');
    setFilterSubtipo('ALL');
    setSearchText('');
  };

  const handleRowClick = (id: string) => setSelectedId(prev => prev === id ? null : id);
  const handleRowDoubleClick = (id: string) => setDetailPetId(id);

  // Lógica de botones de acción
  const sel = selectedPeticion;
  const canVerDetalle = !!sel;
  const canDarEntrada = !!sel && sel.status === 'Enviado';

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
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7c3aed' }}>warehouse</span>
          CEDIS
        </span>
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
              placeholder="Buscar solicitud o folio…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="text-xs rounded border pl-7 pr-3 py-1"
              style={{ borderColor: '#d1d5db', width: 220 }}
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'ALL' | TraspasoStatus)}
            className="text-xs rounded border px-2 py-1"
            style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
          >
            <option value="ALL">Todos los estatus</option>
            {TRASPASO_STATUS_CEDIS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filterSubtipo}
            onChange={e => setFilterSubtipo(e.target.value as 'ALL' | TraspasoSubtipoCedis)}
            className="text-xs rounded border px-2 py-1"
            style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
          >
            <option value="ALL">Todos los tipos</option>
            <option value="Urgencia">Urgencia</option>
            <option value="Reabasto">Reabasto</option>
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

        <button
          onClick={() => setShowSolicitarModal(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white md:ml-auto transition-all"
          style={{ background: '#1a2b6b', boxShadow: '0 2px 8px rgba(26,43,107,0.3)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
          Solicitar a CEDIS
        </button>
      </div>

      {/* ── Tabla (Reabasto no desglosa piezas — recepción ciega por caja) ── */}
      <div className="flex-1 overflow-auto" style={{ borderTop: '1px solid #e5e7eb' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
              {['Tipo','Folio','Papeleta','Origen','Pedido origen','Porcentaje de avance','Fecha creación','Fecha arribo','Cantidad'].map(col => (
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
                  No hay traspasos de CEDIS que coincidan con los filtros
                </td>
              </tr>
            )}
            {filteredTraspasos.map(t => {
              const isSelected = t.id === selectedId;
              const totalSol = t.piezas.reduce((s, p) => s + p.qtySolicitada, 0);
              const totalSurt = t.piezas.reduce((s, p) => s + p.qtySurtida, 0);
              const pct = cedisProgress(t.status);
              const pctColor = pct === 100 ? '#16a34a' : '#2563eb';
              const arribo = t.status === 'Recibido' ? t.fechaActualizacion : '—';

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
                    {t.subtipoCedis && <CedisSubtipoBadge subtipo={t.subtipoCedis} />}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-xs" style={{ color: '#1a2b6b' }}>#{t.id}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>{papeletaFor(t.id)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-sm" style={{ color: '#374151' }}>
                    <span style={{ color: '#9ca3af' }}>De: </span>
                    {t.sucursalContraparte}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: '#6b7280' }}>
                      {t.pedidoOrigen ? `#${t.pedidoOrigen}` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2" style={{ minWidth: 130 }}>
                      <div style={{ flex: 1, height: 6, background: '#eef1f6', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: pctColor, borderRadius: 999, transition: 'width 0.3s' }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: pctColor, minWidth: 34, textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs whitespace-nowrap" style={{ color: '#374151' }}>{t.fechaCreacion}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs whitespace-nowrap" style={{ color: arribo === '—' ? '#9ca3af' : '#374151' }}>{arribo}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium" style={{ color: '#374151' }}>
                      {t.subtipoCedis === 'Urgencia'
                        ? `${totalSurt} / ${totalSol} piezas`
                        : `${t.cajas ?? 0} caja${(t.cajas ?? 0) !== 1 ? 's' : ''}`}
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
        <button
          disabled={!canVerDetalle}
          onClick={() => sel && setDetailPetId(sel.id)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all"
          style={btnOutline(canVerDetalle)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
          Ver detalle
        </button>

        <span style={{ color: '#e5e7eb', margin: '0 4px', fontSize: 18 }}>|</span>

        <button
          disabled={!canDarEntrada}
          onClick={() => { if (sel) { entregarTraspaso(sel.id); showToast(`Traspaso ${sel.id} marcado como recibido`, 'success'); setSelectedId(null); } }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
          style={btnEnabled(canDarEntrada, '#16a34a')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>inventory</span>
          Dar entrada
        </button>

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

      {showSolicitarModal && (
        <ModalSolicitarCedis
          onClose={() => setShowSolicitarModal(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
