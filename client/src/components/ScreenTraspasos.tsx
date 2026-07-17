// ============================================================
// APYMSA — ScreenTraspasos
// Gestión de traspasos de mercancía entre sucursales
// Design: Enterprise Precision
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoStatus, TraspasoTipo, TRASPASO_STATUS_COLORS, TRASPASO_STATUS_POR_TIPO, TRASPASO_CATEGORIA_LABELS,
} from '@/lib/data';
import ModalTraspasoDetail from './ModalTraspasoDetail';
import ModalSurtirTraspaso from './ModalSurtirTraspaso';
import ModalRecepcionTraspaso from './ModalRecepcionTraspaso';
import ModalEmbarcarTraspaso from './ModalEmbarcarTraspaso';

interface Props {
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  tipoFilter: TraspasoTipo;
  onNuevaSolicitud?: () => void;
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

function CategoriaBadge({ categoria }: { categoria: 'Automático' | 'Manual' }) {
  const isAutomatico = categoria === 'Automático';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
      style={{
        background: isAutomatico ? 'rgba(107,114,128,0.10)' : 'rgba(217,119,6,0.10)',
        color: isAutomatico ? '#6b7280' : '#d97706',
        border: `1px solid ${isAutomatico ? 'rgba(107,114,128,0.25)' : 'rgba(217,119,6,0.25)'}`,
      }}
    >
      {TRASPASO_CATEGORIA_LABELS[categoria]}
    </span>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function ScreenTraspasos({ showToast, tipoFilter, onNuevaSolicitud }: Props) {
  const { traspasos } = useApp();

  const traspasosDelTipo = useMemo(
    () => traspasos.filter(t => t.tipo === tipoFilter && t.categoria !== 'CEDIS'),
    [traspasos, tipoFilter]
  );

  const sucursalPrefix = tipoFilter === 'Entrante' ? 'De: ' : 'A: ';

  // Filtros
  const [fechaInicial, setFechaInicial] = useState(TODAY);
  const [fechaFinal, setFechaFinal] = useState(TODAY);
  const [filterStatus, setFilterStatus] = useState<'ALL' | TraspasoStatus>('ALL');
  const [filterCategoria, setFilterCategoria] = useState<'ALL' | 'Automático' | 'Manual'>('ALL');
  const [searchText, setSearchText] = useState('');
  // Switch Pendiente / Finalizado (solo aplica a "Por recibir")
  const [vistaSwitch, setVistaSwitch] = useState<'Pendiente' | 'Finalizado'>('Pendiente');

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

  // Dashboard (solo "Por recibir" / Entrante) — métricas sobre el conjunto del tipo
  const esPorRecibir = tipoFilter === 'Entrante';
  const dashboard = useMemo(() => {
    const activos = traspasosDelTipo.filter(t => t.status !== 'Recibido');
    const finalizados = traspasosDelTipo.filter(t => t.status === 'Recibido');
    return {
      solicitudesActivas: new Set(activos.map(t => t.solicitudId)).size,
      peticionesActivas: activos.length,
      atendidas: traspasosDelTipo.filter(t => t.status === 'Surtido').length,
      enCamino: traspasosDelTipo.filter(t => t.status === 'Enviado').length,
      finalizadasSolicitudes: new Set(finalizados.map(t => t.solicitudId)).size,
      finalizadasPeticiones: finalizados.length,
    };
  }, [traspasosDelTipo]);

  // Filtrado principal
  const filteredTraspasos = useMemo(() => {
    return traspasosDelTipo.filter(t => {
      if (esPorRecibir) {
        if (vistaSwitch === 'Pendiente' && !(t.status === 'Pendiente' || t.status === 'Surtido' || t.status === 'Enviado')) return false;
        if (vistaSwitch === 'Finalizado' && t.status !== 'Recibido') return false;
      }
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
        const matchCode = t.piezas.some(p => p.code.toLowerCase().includes(q));
        if (!matchSol && !matchPet && !matchSuc && !matchCode) return false;
      }
      return true;
    });
  }, [traspasosDelTipo, esPorRecibir, vistaSwitch, filterStatus, filterCategoria, fechaInicial, fechaFinal, searchText]);

  const handleClearFilters = () => {
    setFechaInicial(TODAY);
    setFechaFinal(TODAY);
    setFilterStatus('ALL');
    setFilterCategoria('ALL');
    setSearchText('');
  };

  // Click en tarjeta del dashboard → filtra por ese estatus (toggle).
  // Ambos estatus (Surtido/Enviado) viven en la vista "Pendiente".
  const toggleDashFilter = (status: TraspasoStatus) => {
    if (filterStatus === status) {
      setFilterStatus('ALL');
    } else {
      setVistaSwitch('Pendiente');
      setFilterStatus(status);
    }
  };

  // Click en tarjeta "Finalizado" → cambia a la vista Finalizado (estatus Recibido).
  const toggleFinalizado = () => {
    if (vistaSwitch === 'Finalizado') {
      setVistaSwitch('Pendiente');
    } else {
      setFilterStatus('ALL');
      setVistaSwitch('Finalizado');
    }
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

          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value as 'ALL' | 'Automático' | 'Manual')}
            className="text-xs rounded border px-2 py-1"
            style={{ borderColor: '#d1d5db', accentColor: '#1a2b6b' }}
          >
            <option value="ALL">Todos los tipos</option>
            <option value="Automático">{TRASPASO_CATEGORIA_LABELS.Automático}</option>
            <option value="Manual">{TRASPASO_CATEGORIA_LABELS.Manual}</option>
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

        {onNuevaSolicitud && (
          <button
            onClick={onNuevaSolicitud}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold text-white md:ml-auto transition-all"
            style={{ background: '#1a2b6b', boxShadow: '0 2px 8px rgba(26,43,107,0.3)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
            Nueva solicitud
          </button>
        )}
      </div>

      {/* ── Dashboard + switch (solo "Por recibir") ── */}
      {esPorRecibir && (
        <div
          className="flex items-center gap-4 px-6 py-3 flex-wrap"
          style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}
        >
          {([
            { label: 'Solicitudes activas', value: dashboard.solicitudesActivas, icon: 'assignment', color: '#1a2b6b', status: null },
            { label: 'Peticiones activas', value: dashboard.peticionesActivas, icon: 'swap_horiz', color: '#0891b2', status: null },
            { label: 'Peticiones atendidas', value: dashboard.atendidas, icon: 'inventory_2', color: '#7c3aed', status: 'Surtido' as TraspasoStatus },
            { label: 'Peticiones en camino', value: dashboard.enCamino, icon: 'local_shipping', color: '#2563eb', status: 'Enviado' as TraspasoStatus },
          ] as const).map(card => {
            const clickable = card.status !== null;
            const active = clickable && filterStatus === card.status;
            return (
              <button
                key={card.label}
                type="button"
                onClick={clickable ? () => toggleDashFilter(card.status as TraspasoStatus) : undefined}
                aria-pressed={clickable ? active : undefined}
                title={clickable ? (active ? 'Quitar filtro' : `Filtrar por ${card.label.toLowerCase()}`) : undefined}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all"
                style={{
                  background: active ? `${card.color}0F` : '#fff',
                  border: `${active ? 2 : 1}px solid ${active ? card.color : '#e5e7eb'}`,
                  minWidth: 210,
                  cursor: clickable ? 'pointer' : 'default',
                  boxShadow: active ? `0 2px 8px ${card.color}33` : 'none',
                }}
              >
                <span
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 38, height: 38, background: `${card.color}14` }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: card.color }}>{card.icon}</span>
                </span>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold leading-none" style={{ color: card.color }}>{card.value}</span>
                  <span className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: '#6b7280' }}>
                    {card.label}
                    {active && <span className="material-symbols-outlined" style={{ fontSize: 13, color: card.color }}>filter_alt</span>}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Tarjeta Finalizado (estatus Recibido) */}
          {(() => {
            const color = '#16a34a';
            const active = vistaSwitch === 'Finalizado';
            return (
              <button
                type="button"
                onClick={toggleFinalizado}
                aria-pressed={active}
                title={active ? 'Ver activas' : 'Ver finalizadas (recibidas)'}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all"
                style={{
                  background: active ? `${color}0F` : '#fff',
                  border: `${active ? 2 : 1}px solid ${active ? color : '#e5e7eb'}`,
                  minWidth: 210,
                  cursor: 'pointer',
                  boxShadow: active ? `0 2px 8px ${color}33` : 'none',
                }}
              >
                <span className="flex items-center justify-center rounded-lg" style={{ width: 38, height: 38, background: `${color}14` }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color }}>task_alt</span>
                </span>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold leading-none" style={{ color }}>{dashboard.finalizadasPeticiones}</span>
                  <span className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: '#6b7280' }}>
                    Finalizado · {dashboard.finalizadasSolicitudes} sol.
                    {active && <span className="material-symbols-outlined" style={{ fontSize: 13, color }}>filter_alt</span>}
                  </span>
                </div>
              </button>
            );
          })()}

          {/* Switch Pendiente / Finalizado */}
          <div className="flex items-center gap-2 md:ml-auto">
            <span className="text-xs font-medium" style={{ color: '#6b7280' }}>Mostrar</span>
            <div className="inline-flex rounded-lg p-0.5" style={{ background: '#eef1f6', border: '1px solid #e5e7eb' }}>
              {(['Pendiente', 'Finalizado'] as const).map(v => {
                const active = vistaSwitch === v;
                return (
                  <button
                    key={v}
                    onClick={() => setVistaSwitch(v)}
                    className="px-4 py-1.5 rounded-md text-xs font-semibold transition-all"
                    style={active
                      ? { background: '#fff', color: '#1a2b6b', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                      : { background: 'transparent', color: '#9ca3af' }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="flex-1 overflow-auto" style={{ borderTop: '1px solid #e5e7eb' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr style={{ background: '#f8f9fb', borderBottom: '2px solid #e5e7eb' }}>
              {['Tipo','Pedido origen','Solicitud','Petición','Sucursal','Estatus','Fecha','Piezas'].map(col => (
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
                <td colSpan={8} className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>
                  No hay traspasos que coincidan con los filtros
                </td>
              </tr>
            )}
            {filteredTraspasos.map(t => {
              const isSelected = t.id === selectedId;
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
                    <CategoriaBadge categoria={t.categoria as 'Automático' | 'Manual'} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: '#6b7280' }}>{pedidosLabel}</span>
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
            onClick={() => { if (sel) setRecepcionPetId(sel.id); }}
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
