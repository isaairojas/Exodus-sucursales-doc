// ============================================================
// APYMSA — ScreenEmbarques
// Pantalla de Documentación / Administración de Embarques
// Design: Enterprise Precision — two-panel split, light theme
// Carriers: Estafeta (web-service guía), BlueGo, Uber (solicitud)
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  ORDERS_DB, Order, OrderStatus, STATUS_COLORS,
  Shipment, ShipmentStatus, SHIPMENT_STATUS_COLORS, SHIPMENTS_DB_INITIAL,
} from '@/lib/data';

interface Props {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  preSelectedOrderId?: string | null;
  onBack: () => void;
}

function ShipmentBadge({ status }: { status: ShipmentStatus }) {
  const c = SHIPMENT_STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

function OrderBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS['Activo'];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {status}
    </span>
  );
}

// ── Modal Guía Estafeta (Documentación Automática) ────────────
interface ModalGuiaEstafetaProps {
  shipment: Shipment;
  onClose: () => void;
  onGuiaGenerada: (shipmentId: string, guia: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

function ModalGuiaEstafeta({ shipment, onClose, onGuiaGenerada, showToast }: ModalGuiaEstafetaProps) {
  const [generating, setGenerating] = useState(false);
  const [guia, setGuia] = useState('');
  const [generated, setGenerated] = useState(false);

  const order = shipment.pedidos[0] ? ORDERS_DB[shipment.pedidos[0]] : null;

  const handleGenerarGuia = () => {
    setGenerating(true);
    setTimeout(() => {
      const newGuia = `1Z${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
      setGuia(newGuia);
      setGenerated(true);
      setGenerating(false);
      onGuiaGenerada(shipment.id, newGuia);
      showToast(`Guía Estafeta generada: ${newGuia}`, 'success');
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget && !generating) onClose(); }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#fff', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #cc0000 0%, #990000 100%)' }}
        >
          <div className="flex items-center gap-4">
            {/* Estafeta logo simulation */}
            <div className="bg-white px-3 py-1 rounded-md">
              <span className="font-black text-red-600 text-sm tracking-tight">ESTAFETA</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Documentación Automática de Envíos</h2>
              <p className="text-red-200 text-xs mt-0.5">Embarque #{shipment.id} · {shipment.paqueteria}</p>
            </div>
          </div>
          {!generating && (
            <button onClick={onClose} className="text-red-200 hover:text-white transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Body — two columns like the real system */}
        <div className="flex-1 overflow-y-auto flex">
          {/* LEFT — Search + packages */}
          <div className="flex-1 px-5 py-5 flex flex-col gap-4" style={{ borderRight: '1px solid #e5e7eb' }}>
            {/* Criterio de búsqueda */}
            <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '10px 14px' }}>
              <div className="text-xs font-semibold text-gray-500 mb-2">Criterio de Búsqueda</div>
              <div className="flex items-center gap-4 mb-2">
                {['Embarque', 'Documento', 'Traspaso'].map(opt => (
                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="criterio" defaultChecked={opt === 'Embarque'} className="accent-red-600" />
                    <span className="text-xs text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 px-3 py-1.5 rounded text-sm font-semibold"
                  style={{ background: '#dbeafe', border: '1px solid #93c5fd', color: '#1d4ed8' }}
                >
                  {shipment.id}
                </div>
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" className="accent-red-600" /> Carta Porte
                </label>
              </div>
            </div>

            {/* Número de guía */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 whitespace-nowrap">Número de guía</span>
              <input
                type="text"
                value={guia}
                readOnly
                placeholder="Se generará automáticamente"
                className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50"
                style={guia ? { borderColor: '#16a34a', background: 'rgba(22,163,74,0.04)', color: '#15803d', fontWeight: 700 } : {}}
              />
            </div>

            {/* Información de paquetes */}
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2">Información de paquetes</div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                <div className="text-xs text-gray-500 text-center py-1 px-2" style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                  F4 - Limpiar Filtro, F5 - Filtros, Esc - Cancelar Acción
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: '#f0f4ff', borderBottom: '1px solid #e5e7eb' }}>
                      {['Número de paquete', 'Peso', '¿Paquete documentado?', 'Número de guía'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-gray-600 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: shipment.cajas }).map((_, i) => (
                      <tr
                        key={i}
                        style={{
                          background: i === 0 ? 'rgba(26,43,107,0.08)' : '#fff',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <td className="px-3 py-2 font-semibold">{i + 1}</td>
                        <td className="px-3 py-2">{(shipment.peso / shipment.cajas).toFixed(2)}</td>
                        <td className="px-3 py-2" style={{ color: generated ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                          {generated ? 'SÍ' : 'NO'}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs" style={{ color: '#1d4ed8' }}>{guia || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary footer */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Número de paquete', String(shipment.cajas)],
                ['Paquetes documentados', generated ? String(shipment.cajas) : '0'],
                ['Paquetes seleccionados', String(shipment.cajas)],
                ['Total de paquetes', String(shipment.cajas)],
                ['Paquetes sin documentar', generated ? '0' : String(shipment.cajas)],
                ['Peso de paquetes seleccionados', `${shipment.peso}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex-1">{label}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: '#f0f4ff', color: '#1a2b6b', minWidth: 32, textAlign: 'right' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Paquetería + Destinatario */}
          <div className="w-72 flex-shrink-0 px-5 py-5 flex flex-col gap-5">
            {/* Paquetería */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Paquetería</div>
              <div className="flex flex-col gap-2">
                {[
                  ['Paquetería', 'ESTAFETA'],
                  ['Tipo de servicio', 'Normal'],
                  ['Embalaje', 'Caja'],
                  ['Tipo de entrega', 'Entrega a domicilio'],
                  ['Sucursal Ocurre', ''],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
                    <div
                      className="flex-1 px-2 py-1 rounded text-xs font-semibold"
                      style={{ background: value ? '#dbeafe' : '#f3f4f6', color: value ? '#1d4ed8' : '#9ca3af', border: '1px solid #e5e7eb' }}
                    >
                      {value || '—'}
                    </div>
                  </div>
                ))}
                <label className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                  <input type="checkbox" className="accent-red-600" /> Guía por Caja
                </label>
              </div>
            </div>

            {/* Destinatario */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Destinatario</div>
              <div className="flex flex-col gap-2">
                {[
                  ['Nombre', order?.cliente ?? 'CLIENTE APYMSA'],
                  ['Calle', 'AV. INDUSTRIA 1234'],
                  ['Número', ''],
                  ['Colonia', 'ZONA INDUSTRIAL'],
                  ['Ciudad', 'GUADALAJARA'],
                  ['Estado', 'JALISCO'],
                  ['Código Postal', '44940'],
                  ['País', 'MÉXICO'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
                    <div
                      className="flex-1 px-2 py-1 rounded text-xs"
                      style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151' }}
                    >
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-3"
          style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb' }}
        >
          <span className="text-xs text-gray-400">Esc - Salir</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all border border-gray-200"
            >
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
              Salir
            </button>
            <button
              onClick={() => showToast('Imprimiendo guía...', 'info')}
              disabled={!generated}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all border"
              style={generated
                ? { background: '#fff', color: '#374151', borderColor: '#d1d5db' }
                : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed', borderColor: 'transparent' }
              }
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimir
            </button>
            <button
              onClick={handleGenerarGuia}
              disabled={generating || generated}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all"
              style={generated
                ? { background: '#16a34a', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }
                : generating
                  ? { background: '#9ca3af', cursor: 'not-allowed' }
                  : { background: '#cc0000', boxShadow: '0 2px 8px rgba(204,0,0,0.3)' }
              }
            >
              {generating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Generando...
                </>
              ) : generated ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
                  Guía generada
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14"/></svg>
                  Generar Guías
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal Seguimiento Uber Direct ─────────────────────────────
interface ModalUberTrackingProps {
  onClose: () => void;
}

const UBER_SOLICITUDES = [
  { embarqueId: '88516', uberId: '97415', estatus: 'En proceso de entre...', clienteId: '372895', direccion: 'AV NOGALES 205 A La Venta Del Ast...', fechaSolicitud: '22/04/2026 - 12:04:50 PM', fechaEstimada: '22/04/2026 - 12:45:21 PM', fechaRecoleccion: '22/04/2026 - 12:18:12 PM', fechaRealEntrega: '', tracking: 'https://www.uber.com/track/97415' },
  { embarqueId: '88517', uberId: '8A30D', estatus: 'En proceso de entre...', clienteId: '51849', direccion: 'VALLE DE TESISTAN 172 TESISTAN...', fechaSolicitud: '22/04/2026 - 12:13:25 PM', fechaEstimada: '22/04/2026 - 12:34:03 PM', fechaRecoleccion: '22/04/2026 - 12:20:38 PM', fechaRealEntrega: '', tracking: 'https://www.uber.com/track/8A30D' },
];

function ModalUberTracking({ onClose }: ModalUberTrackingProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tab, setTab] = useState<'activo' | 'historico'>('activo');
  const [fechaInicial, setFechaInicial] = useState('2026-04-20');
  const [fechaFinal, setFechaFinal] = useState('2026-04-22');

  const selected = UBER_SOLICITUDES[selectedIdx];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#fff', maxHeight: '88vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ background: '#111', color: '#fff' }}
        >
          <div className="flex items-center gap-3">
            <span className="font-black text-white text-lg tracking-tight">UBER</span>
            <span className="text-gray-400 text-sm">Solicitudes de Uber Direct</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 px-5 py-3" style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Fecha inicial</span>
            <input type="date" value={fechaInicial} onChange={e => setFechaInicial(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Fecha final</span>
            <input type="date" value={fechaFinal} onChange={e => setFechaFinal(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs" />
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            {(['activo', 'historico'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-1.5 text-xs font-semibold capitalize transition-all"
                style={tab === t ? { background: '#111', color: '#fff' } : { background: '#fff', color: '#6b7280' }}
              >
                {t === 'activo' ? 'Activo' : 'Histórico'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Hint */}
          <div className="text-xs text-gray-400 text-center py-1" style={{ background: '#f8f9fb', borderRadius: 4 }}>
            F4 - Limpiar Filtro, F5 - Filtros, Esc - Cancelar Acción
          </div>

          {/* Top table */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f0f4ff', borderBottom: '1px solid #e5e7eb' }}>
                  {['EmbarqueID', 'UberID', 'Estatus', 'ClienteID', 'Dirección', 'Fecha hora solicitud', 'Fecha hora estimada'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-600 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UBER_SOLICITUDES.map((s, i) => (
                  <tr
                    key={s.embarqueId}
                    onClick={() => setSelectedIdx(i)}
                    className="cursor-pointer transition-colors"
                    style={{
                      background: selectedIdx === i ? 'rgba(26,43,107,0.08)' : '#fff',
                      borderBottom: '1px solid #f0f0f0',
                      borderLeft: selectedIdx === i ? '3px solid #1a2b6b' : '3px solid transparent',
                    }}
                  >
                    <td className="px-3 py-2 font-semibold">{s.embarqueId}</td>
                    <td className="px-3 py-2 font-mono">{s.uberId}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                        {s.estatus}
                      </span>
                    </td>
                    <td className="px-3 py-2">{s.clienteId}</td>
                    <td className="px-3 py-2 max-w-[160px] truncate">{s.direccion}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{s.fechaSolicitud}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{s.fechaEstimada}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom detail table */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <div className="text-xs text-gray-400 text-center py-1" style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
              F4 - Limpiar Filtro, F5 - Filtros, Esc - Cancelar Acción
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f0f4ff', borderBottom: '1px solid #e5e7eb' }}>
                  {['Fecha hora estimada', 'Fecha hora recolección', 'Fecha hora real entrega', 'Tracking'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-600 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'rgba(26,43,107,0.08)', borderLeft: '3px solid #1a2b6b' }}>
                  <td className="px-3 py-2 whitespace-nowrap">{selected.fechaEstimada}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{selected.fechaRecoleccion}</td>
                  <td className="px-3 py-2">{selected.fechaRealEntrega || '—'}</td>
                  <td className="px-3 py-2">
                    <a
                      href={selected.tracking}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold hover:underline"
                      style={{ color: '#2563eb' }}
                    >
                      Consultar
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-end gap-3 px-5 py-3"
          style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb' }}
        >
          <button
            onClick={() => {}}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-all text-gray-600"
          >
            Cancelar Solicitud
          </button>
          <button
            onClick={() => {}}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
            style={{ background: '#1a2b6b', boxShadow: '0 2px 8px rgba(26,43,107,0.3)' }}
          >
            Solicitar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-all text-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Seguimiento BlueGo ──────────────────────────────────
interface ModalBlueGoTrackingProps {
  onClose: () => void;
}

const BLUEGO_SOLICITUDES = [
  { embarqueId: '83275', salidasVehiculosId: '', solicitudId: '1018062', estatusExodus: 'Buscando Repartidor', tiempoEstimado: '', tiempoTranscurrido: '', fechaInicio: '' },
];

function ModalBlueGoTracking({ onClose }: ModalBlueGoTrackingProps) {
  const [fechaInicial, setFechaInicial] = useState('2026-04-20');
  const [fechaFinal, setFechaFinal] = useState('2026-04-22');
  const [ofertaServicio, setOfertaServicio] = useState('');
  const [tab, setTab] = useState<'secuencia' | 'offline'>('secuencia');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#fff', maxHeight: '88vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ background: '#1a2b6b', color: '#fff' }}
        >
          <div className="flex items-center gap-3">
            <span className="font-black text-white text-lg tracking-tight">BlueGo</span>
            <span className="text-blue-200 text-sm">Servicios BlueGo</span>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: '2px solid #e5e7eb' }}>
          {(['secuencia', 'offline'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-6 py-2.5 text-sm font-semibold transition-all"
              style={tab === t
                ? { borderBottom: '2px solid #1a2b6b', color: '#1a2b6b', marginBottom: -2 }
                : { color: '#6b7280' }
              }
            >
              {t === 'secuencia' ? 'Secuencia de entregas' : 'Envíos Offline'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 px-5 py-3" style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Fecha Inicial</span>
            <input type="date" value={fechaInicial} onChange={e => setFechaInicial(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Fecha Final</span>
            <input type="date" value={fechaFinal} onChange={e => setFechaFinal(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">Oferta de servicio:</span>
            <span className="text-xs font-bold text-gray-700">0</span>
            <select value={ofertaServicio} onChange={e => setOfertaServicio(e.target.value)} className="border border-gray-200 rounded px-2 py-1 text-xs">
              <option value="">—</option>
            </select>
            <button className="px-3 py-1 rounded text-xs font-semibold text-white" style={{ background: '#1a2b6b' }}>Aceptar</button>
            <button className="px-3 py-1 rounded text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50">Rechazar</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#f0f4ff', borderBottom: '1px solid #e5e7eb' }}>
                  {['EmbarqueID', 'SalidasVehiculosID', 'SolicitudID', 'EstatusExodus', 'TiempoEstimado', 'TiempoTranscurrido', 'FechaInicio'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-600 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BLUEGO_SOLICITUDES.map((s, i) => (
                  <tr
                    key={s.embarqueId}
                    style={{
                      background: i === 0 ? 'rgba(26,43,107,0.08)' : '#fff',
                      borderBottom: '1px solid #f0f0f0',
                      borderLeft: i === 0 ? '3px solid #1a2b6b' : '3px solid transparent',
                    }}
                  >
                    <td className="px-3 py-2 font-semibold">{s.embarqueId}</td>
                    <td className="px-3 py-2">{s.salidasVehiculosId || '—'}</td>
                    <td className="px-3 py-2 font-mono">{s.solicitudId}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>
                        {s.estatusExodus}
                      </span>
                    </td>
                    <td className="px-3 py-2">{s.tiempoEstimado || '—'}</td>
                    <td className="px-3 py-2">{s.tiempoTranscurrido || '—'}</td>
                    <td className="px-3 py-2">{s.fechaInicio || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-end gap-3 px-5 py-3"
          style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb' }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-all text-gray-600"
          >
            <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
            Cerrar
          </button>
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
            style={{ background: '#1a2b6b', boxShadow: '0 2px 8px rgba(26,43,107,0.3)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Refrescar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Crear Embarque (multi-order) ────────────────────────
const PAQUETERIAS_FULL = ['Estafeta', 'BlueGo', 'Uber', 'Transporte Interno', 'MEXICO EXPRESS'];
const TIPOS_VEHICULO = ['Sedan', 'Van', 'Camioneta', 'Camión'];

interface ModalCrearEmbarqueProps {
  onClose: () => void;
  onCreated: (shipment: Shipment, orderIds: string[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  preOrderId?: string | null;
  orderStatuses: Record<string, OrderStatus>;
}

function ModalCrearEmbarque({ onClose, onCreated, showToast, preOrderId, orderStatuses }: ModalCrearEmbarqueProps) {
  const eligibleOrders = useMemo(() =>
    Object.values(ORDERS_DB).filter(o => {
      const st = orderStatuses[o.id] ?? o.status;
      return st === 'Revisado' || st === 'Revisado con incidencias';
    }),
    [orderStatuses]
  );

  const [selectedOrders, setSelectedOrders] = useState<string[]>(
    preOrderId && eligibleOrders.some(o => o.id === preOrderId) ? [preOrderId] : []
  );
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [paqueteria, setPaqueteria] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [cajas, setCajas] = useState('');
  const [peso, setPeso] = useState('');
  const [pesoSimulado, setPesoSimulado] = useState(false);
  const [pesoSimulando, setPesoSimulando] = useState(false);
  const [confirmSolicitud, setConfirmSolicitud] = useState(false);

  const dropdownOrders = eligibleOrders.filter(o =>
    !selectedOrders.includes(o.id) &&
    (o.id.includes(orderSearch) || o.cliente.toLowerCase().includes(orderSearch.toLowerCase()))
  );

  const addOrder = (id: string) => { setSelectedOrders(prev => [...prev, id]); setOrderSearch(''); setShowOrderDropdown(false); };
  const removeOrder = (id: string) => setSelectedOrders(prev => prev.filter(x => x !== id));

  const isUberOrBluego = paqueteria === 'BlueGo' || paqueteria === 'Uber';
  const canCreate = selectedOrders.length > 0 && paqueteria !== '' && cajas !== '' && parseInt(cajas) > 0 && peso !== '' && parseFloat(peso) > 0;

  const handleSimularBascula = () => {
    if (pesoSimulando || pesoSimulado) return;
    setPesoSimulando(true);
    setTimeout(() => {
      const w = (selectedOrders.length * 2.1 + Math.random() * 4).toFixed(1);
      setPeso(w); setPesoSimulado(true); setPesoSimulando(false);
      showToast(`Báscula: ${w} kg detectados`, 'success');
    }, 1500);
  };

  const handleCreate = () => {
    if (!canCreate) return;
    if (isUberOrBluego && !confirmSolicitud) { setConfirmSolicitud(true); return; }

    const newId = String(88516 + Math.floor(Math.random() * 900));
    const finalStatus: ShipmentStatus = isUberOrBluego ? 'Solicitado' : 'Generado';
    const newShipment: Shipment = { id: newId, paqueteria, pedidos: selectedOrders, observaciones, status: finalStatus, fecha: '2026-04-22', tipoVehiculo, cajas: parseInt(cajas), peso: parseFloat(peso), usuario: 'Cosme' };
    onCreated(newShipment, selectedOrders);
    if (isUberOrBluego) showToast(`Solicitud enviada automáticamente a ${paqueteria}`, 'success');
    showToast(`Embarque #${newId} creado correctamente`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col" style={{ background: '#fff', maxHeight: '90vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)' }}>
          <div><h2 className="text-white font-bold text-lg">Crear Embarque</h2><p className="text-blue-200 text-xs mt-0.5">EmbarqueID: Por asignar</p></div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors"><svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Pedidos */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">1</span>Pedidos a incluir</h3>
            <div className="relative mb-2">
              <input type="text" placeholder="Buscar pedido..." value={orderSearch} onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }} onFocus={() => setShowOrderDropdown(true)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              {showOrderDropdown && dropdownOrders.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                  {dropdownOrders.slice(0, 6).map(o => (
                    <button key={o.id} onClick={() => addOrder(o.id)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between">
                      <span><span className="font-semibold text-gray-800">#{o.id}</span><span className="text-gray-500 ml-2">{o.cliente}</span></span>
                      <span className="text-gray-500 font-medium">{o.total}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 min-h-8">
              {selectedOrders.map(id => { const o = ORDERS_DB[id]; return (<span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.2)' }}>#{id} — {o?.cliente}<button onClick={() => removeOrder(id)} className="hover:text-red-500 transition-colors ml-0.5">×</button></span>); })}
              {selectedOrders.length === 0 && <span className="text-xs text-gray-400 italic">Ningún pedido seleccionado</span>}
            </div>
          </div>

          {/* Config */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">2</span>Configuración</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Paquetería <span className="text-red-500">*</span></label>
                <select value={paqueteria} onChange={e => { setPaqueteria(e.target.value); setConfirmSolicitud(false); }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">Seleccionar...</option>
                  {PAQUETERIAS_FULL.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Tipo de vehículo</label>
                <select value={tipoVehiculo} onChange={e => setTipoVehiculo(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">Seleccionar...</option>
                  {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {paqueteria === 'Estafeta' && <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(204,0,0,0.06)', border: '1px solid rgba(204,0,0,0.2)', color: '#cc0000' }}><strong>Estafeta — Web service activo</strong> — Se generará la guía automáticamente</div>}
            {isUberOrBluego && !confirmSolicitud && <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb' }}><strong>{paqueteria} — Web service activo</strong> — solicitud automática al confirmar</div>}
            {isUberOrBluego && confirmSolicitud && (
              <div className="mt-3 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', color: '#d97706' }}>
                ¿Desea generar la solicitud a <strong>{paqueteria}</strong> ahora?
                <div className="flex gap-2 mt-2">
                  <button onClick={handleCreate} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#d97706' }}>Sí, generar solicitud</button>
                  <button onClick={() => setConfirmSolicitud(false)} className="px-4 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100">Cancelar</button>
                </div>
              </div>
            )}
            <div className="mt-3">
              <label className="block text-xs text-gray-500 font-medium mb-1">Observaciones</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Opcional..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
            </div>
          </div>

          {/* Empaque */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">3</span>Empaque</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Número de cajas <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={cajas} onChange={e => setCajas(e.target.value)} placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1 flex items-center gap-1.5">Peso total (kg) <span className="text-red-500">*</span>{pesoSimulado && <span className="text-green-600 text-xs font-semibold ml-1">✓ Báscula</span>}</label>
                <div className="flex gap-2">
                  <input type="number" min="0.1" step="0.1" value={peso} onChange={e => { setPeso(e.target.value); setPesoSimulado(false); }} placeholder="0.0" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" style={pesoSimulado ? { borderColor: '#16a34a', background: 'rgba(22,163,74,0.04)' } : {}} />
                  <button onClick={handleSimularBascula} disabled={pesoSimulando || pesoSimulado} title="Simular báscula" className="px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1" style={pesoSimulado ? { background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)' } : pesoSimulando ? { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' } : { background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.2)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{pesoSimulado ? 'check_circle' : pesoSimulando ? 'hourglass_top' : 'scale'}</span>
                    {pesoSimulando ? '...' : pesoSimulado ? 'OK' : 'Báscula'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {!confirmSolicitud && (
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb' }}>
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancelar</button>
            <button onClick={handleCreate} disabled={!canCreate} className="px-6 py-2 rounded-lg text-sm font-bold text-white transition-all" style={canCreate ? { background: 'linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)', boxShadow: '0 4px 14px rgba(26,43,107,0.3)' } : { background: '#d1d5db', color: '#9ca3af', cursor: 'not-allowed' }}>
              {isUberOrBluego ? `Solicitar ${paqueteria}` : 'Crear embarque'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ScreenEmbarques ──────────────────────────────────────
export default function ScreenEmbarques({ showToast, preSelectedOrderId, onBack }: Props) {
  const { state, updateOrderStatus } = useApp();

  const [shipments, setShipments] = useState<Shipment[]>(SHIPMENTS_DB_INITIAL);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showGuiaModal, setShowGuiaModal] = useState(false);
  const [showUberModal, setShowUberModal] = useState(false);
  const [showBlueGoModal, setShowBlueGoModal] = useState(false);
  const [guias, setGuias] = useState<Record<string, string>>({});

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId) ?? null;

  const handleCreated = (shipment: Shipment, orderIds: string[]) => {
    setShipments(prev => [shipment, ...prev]);
    orderIds.forEach(id => updateOrderStatus(id, 'Documentado'));
    setSelectedShipmentId(shipment.id);
  };

  const handleGuiaGenerada = (shipmentId: string, guia: string) => {
    setGuias(prev => ({ ...prev, [shipmentId]: guia }));
    setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'En tránsito' } : s));
  };

  const handleEnviarSolicitud = () => {
    if (!selectedShipment) return;
    const p = selectedShipment.paqueteria;
    if (p === 'Estafeta') {
      setShowGuiaModal(true);
    } else if (p === 'Uber') {
      setShowUberModal(true);
    } else if (p === 'BlueGo') {
      setShowBlueGoModal(true);
    } else {
      setShipments(prev => prev.map(s => s.id === selectedShipment.id ? { ...s, status: 'En tránsito' } : s));
      showToast(`Embarque #${selectedShipment.id} marcado En tránsito`, 'success');
    }
  };

  const canEnviar = selectedShipment !== null &&
    (selectedShipment.status === 'Generado' || selectedShipment.status === 'Solicitado') &&
    (selectedShipment.paqueteria === 'Estafeta' || selectedShipment.paqueteria === 'Uber' || selectedShipment.paqueteria === 'BlueGo');

  const shipmentTotal = selectedShipment
    ? selectedShipment.pedidos.reduce((sum, pid) => {
        const o = ORDERS_DB[pid];
        if (!o) return sum;
        const num = parseFloat(o.total.replace(/[$,]/g, ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0)
    : 0;

  const getEnviarLabel = () => {
    if (!selectedShipment) return 'Enviar solicitud';
    const p = selectedShipment.paqueteria;
    if (p === 'Estafeta') return 'Generar guía Estafeta';
    if (p === 'Uber') return 'Ver seguimiento Uber';
    if (p === 'BlueGo') return 'Ver seguimiento BlueGo';
    return 'Enviar solicitud';
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Roboto, sans-serif', background: '#f4f6fa' }}>

      {/* ── Sub-header ── */}
      <div className="flex-shrink-0 flex items-center gap-4 px-6 py-3" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-700 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M15 18l-6-6 6-6"/></svg>
          Pedidos
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">Administración de Embarques</span>

        {/* Quick access tracking buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowUberModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
            style={{ borderColor: '#111', color: '#111', background: '#fff' }}
          >
            UBER Direct
          </button>
          <button
            onClick={() => setShowBlueGoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all"
            style={{ borderColor: '#1a2b6b', color: '#1a2b6b', background: '#fff' }}
          >
            BlueGo
          </button>
        </div>
      </div>

      {/* ── Two-panel split ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL */}
        <div className="flex flex-col" style={{ width: '35%', borderRight: '1px solid #e5e7eb', background: '#fff' }}>
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-sm">Embarques</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(26,43,107,0.1)', color: '#1a2b6b' }}>{shipments.length}</span>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)', boxShadow: '0 2px 8px rgba(26,43,107,0.3)' }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
              Crear embarque
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {shipments.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedShipmentId(s.id)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  borderBottom: '1px solid #f0f0f0',
                  background: s.id === selectedShipmentId ? 'rgba(26,43,107,0.06)' : 'transparent',
                  borderLeft: s.id === selectedShipmentId ? '3px solid #1a2b6b' : '3px solid transparent',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800">#{s.id}</span>
                  <ShipmentBadge status={s.status} />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">{s.paqueteria}</span>
                  {(s.paqueteria === 'Estafeta' || s.paqueteria === 'Uber' || s.paqueteria === 'BlueGo') && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}>WS</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b' }}>
                    {s.pedidos.length} pedido{s.pedidos.length !== 1 ? 's' : ''}
                  </span>
                  {guias[s.id] && <span className="text-xs text-green-600 font-mono">✓ {guias[s.id].slice(0, 8)}...</span>}
                </div>
                <div className="text-xs text-gray-400 mt-1">{s.fecha}</div>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f8f9fb' }}>
          {!selectedShipment ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(26,43,107,0.08)' }}>
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">Selecciona un embarque para ver el detalle</p>
              <p className="text-gray-400 text-xs mt-1">O crea uno nuevo con el botón de arriba</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              {/* Detail header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black" style={{ color: '#1a2b6b' }}>Embarque #{selectedShipment.id}</h2>
                    <ShipmentBadge status={selectedShipment.status} />
                    {(selectedShipment.paqueteria === 'Estafeta' || selectedShipment.paqueteria === 'Uber' || selectedShipment.paqueteria === 'BlueGo') && (
                      <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }}>Web Service</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedShipment.paqueteria}
                    {selectedShipment.tipoVehiculo && ` · ${selectedShipment.tipoVehiculo}`}
                    {' · '}{selectedShipment.fecha}
                    {guias[selectedShipment.id] && <span className="ml-2 text-green-600 font-mono font-semibold">Guía: {guias[selectedShipment.id]}</span>}
                  </p>
                </div>
              </div>

              {/* Meta card */}
              <div className="rounded-xl px-5 py-4 grid grid-cols-3 gap-4" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                {[
                  ['Paquetería', selectedShipment.paqueteria],
                  ['Tipo vehículo', selectedShipment.tipoVehiculo || '—'],
                  ['Cajas', String(selectedShipment.cajas)],
                  ['Peso', `${selectedShipment.peso} kg`],
                  ['Usuario', selectedShipment.usuario],
                  ['Observaciones', selectedShipment.observaciones || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                    <div className="text-sm font-semibold text-gray-800">{value}</div>
                  </div>
                ))}
              </div>

              {/* Orders included */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Pedidos incluidos</h3>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb', background: '#fff' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
                        {['PedidoID', 'Cliente', 'Total', 'Status'].map(col => (
                          <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedShipment.pedidos.map((pid, idx) => {
                        const o: Order | undefined = ORDERS_DB[pid];
                        const st = (state.orderStatuses[pid] ?? o?.status ?? 'Activo') as OrderStatus;
                        return (
                          <tr key={pid} style={{ borderBottom: idx < selectedShipment.pedidos.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                            <td className="px-4 py-2.5 font-semibold text-gray-800">#{pid}</td>
                            <td className="px-4 py-2.5 text-gray-600">{o?.cliente ?? '—'}</td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800">{o?.total ?? '—'}</td>
                            <td className="px-4 py-2.5"><OrderBadge status={st} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-4 py-3" style={{ background: '#f8f9fb', borderTop: '1px solid #e5e7eb' }}>
                    <span className="text-xs text-gray-500">Total de pedidos: <strong className="text-gray-700">{selectedShipment.pedidos.length}</strong></span>
                    <span className="text-sm font-bold" style={{ color: '#1a2b6b' }}>Monto total: ${shipmentTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Action section */}
              <div className="rounded-xl px-5 py-4" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Acciones de envío</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleEnviarSolicitud}
                    disabled={!canEnviar}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={canEnviar
                      ? { background: selectedShipment.paqueteria === 'Estafeta' ? '#cc0000' : selectedShipment.paqueteria === 'Uber' ? '#111' : '#1a2b6b', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }
                      : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
                    }
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                    {getEnviarLabel()}
                  </button>

                  {selectedShipment.paqueteria === 'Uber' && (
                    <button onClick={() => setShowUberModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border-2 transition-all" style={{ borderColor: '#111', color: '#111', background: '#fff' }}>
                      Seguimiento UBER
                    </button>
                  )}
                  {selectedShipment.paqueteria === 'BlueGo' && (
                    <button onClick={() => setShowBlueGoModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border-2 transition-all" style={{ borderColor: '#1a2b6b', color: '#1a2b6b', background: '#fff' }}>
                      Seguimiento BlueGo
                    </button>
                  )}
                </div>
                {!canEnviar && selectedShipment && (
                  <p className="text-xs text-gray-400 mt-2">
                    {selectedShipment.paqueteria !== 'Estafeta' && selectedShipment.paqueteria !== 'Uber' && selectedShipment.paqueteria !== 'BlueGo'
                      ? 'Esta paquetería no tiene web service disponible'
                      : `Solo disponible para embarques en estado Generado o Solicitado`
                    }
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <ModalCrearEmbarque
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          showToast={showToast}
          preOrderId={preSelectedOrderId}
          orderStatuses={state.orderStatuses}
        />
      )}
      {showGuiaModal && selectedShipment && (
        <ModalGuiaEstafeta
          shipment={selectedShipment}
          onClose={() => setShowGuiaModal(false)}
          onGuiaGenerada={handleGuiaGenerada}
          showToast={showToast}
        />
      )}
      {showUberModal && <ModalUberTracking onClose={() => setShowUberModal(false)} />}
      {showBlueGoModal && <ModalBlueGoTracking onClose={() => setShowBlueGoModal(false)} />}
    </div>
  );
}
