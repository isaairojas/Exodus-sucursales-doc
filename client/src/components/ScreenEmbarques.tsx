// ============================================================
// APYMSA — ScreenEmbarques
// Pantalla de Documentación / Administración de Embarques
// Design: Enterprise Precision — two-panel split, light theme
// Carriers: Estafeta (web-service guía), BlueGo, Uber (solicitud)
// ============================================================
import { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  ORDERS_DB, Order, OrderStatus, STATUS_COLORS,
  Shipment, ShipmentStatus, SHIPMENT_STATUS_COLORS, SHIPMENTS_DB_INITIAL, BoxItem,
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

// ── PaqueteriaBadge — badge visual con color de marca ────────
function PaqueteriaBadge({ paqueteria }: { paqueteria: string }) {
  const configs: Record<string, { bg: string; text: string; border: string; label: string; icon?: string }> = {
    'Uber': {
      bg: '#000', text: '#fff', border: '#000',
      label: 'Uber',
      icon: 'U',
    },
    'BlueGo': {
      bg: '#1a2b6b', text: '#fff', border: '#1a2b6b',
      label: 'BlueGo',
      icon: 'B',
    },
    'Estafeta': {
      bg: '#cc0000', text: '#fff', border: '#cc0000',
      label: 'Estafeta',
      icon: 'E',
    },
    'Transporte Interno': {
      bg: 'rgba(124,58,237,0.12)', text: '#7c3aed', border: 'rgba(124,58,237,0.3)',
      label: 'Transporte Interno',
    },
    'MEXICO EXPRESS': {
      bg: 'rgba(22,163,74,0.1)', text: '#15803d', border: 'rgba(22,163,74,0.3)',
      label: 'MEXICO EXPRESS',
    },
  };
  const cfg = configs[paqueteria] ?? { bg: '#f3f4f6', text: '#374151', border: '#d1d5db', label: paqueteria };
  const isWS = paqueteria === 'Estafeta' || paqueteria === 'Uber' || paqueteria === 'BlueGo';
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-xs tracking-wide"
        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`, letterSpacing: '0.03em' }}
      >
        {cfg.icon && (
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-[9px] font-black" style={{ background: 'rgba(255,255,255,0.2)' }}>{cfg.icon}</span>
        )}
        {cfg.label}
      </span>
      {isWS && (
        <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.15)' }}>WS</span>
      )}
    </div>
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
  shipment?: Shipment | null;
}

const UBER_SOLICITUDES_DEMO = [
  { embarqueId: '88516', uberId: '97415', estatus: 'En proceso de entrega', clienteId: '85622', direccion: 'AV NOGALES 205 A La Venta Del Astillero, Zapopan', fechaSolicitud: '22/04/2026 - 12:04:50 PM', fechaEstimada: '22/04/2026 - 12:45:21 PM', fechaRecoleccion: '22/04/2026 - 12:18:12 PM', fechaRealEntrega: '', tracking: 'https://www.uber.com/track/97415' },
  { embarqueId: '88517', uberId: '8A30D', estatus: 'En proceso de entrega', clienteId: '51849', direccion: 'VALLE DE TESISTAN 172 TESISTAN...', fechaSolicitud: '22/04/2026 - 12:13:25 PM', fechaEstimada: '22/04/2026 - 12:34:03 PM', fechaRecoleccion: '22/04/2026 - 12:20:38 PM', fechaRealEntrega: '', tracking: 'https://www.uber.com/track/8A30D' },
];

function ModalUberTracking({ onClose, shipment }: ModalUberTrackingProps) {
  const [tab, setTab] = useState<'activo' | 'historico'>('activo');
  const [fechaInicial, setFechaInicial] = useState('2026-04-20');
  const [fechaFinal, setFechaFinal] = useState('2026-04-22');

  // Build list: if a specific shipment is passed, show it first; always include demo data
  const allSolicitudes = useMemo(() => {
    if (shipment?.uberData) {
      const ud = shipment.uberData;
      const fromShipment = {
        embarqueId: shipment.id,
        uberId: ud.uberId,
        estatus: ud.estatus,
        clienteId: ORDERS_DB[shipment.pedidos[0]]?.clienteId ?? '—',
        direccion: ud.direccion,
        fechaSolicitud: ud.fechaSolicitud,
        fechaEstimada: ud.fechaEstimada,
        fechaRecoleccion: ud.fechaRecoleccion,
        fechaRealEntrega: ud.fechaEntregaReal,
        tracking: `https://www.uber.com/track/${ud.uberId}`,
      };
      const rest = UBER_SOLICITUDES_DEMO.filter(s => s.embarqueId !== shipment.id);
      return [fromShipment, ...rest];
    }
    return UBER_SOLICITUDES_DEMO;
  }, [shipment]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = allSolicitudes[selectedIdx];

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
                {allSolicitudes.map((s, i) => (
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
  shipment?: Shipment | null;
}

const BLUEGO_SOLICITUDES_DEMO = [
  { embarqueId: '88517', salidasVehiculosId: '83275', solicitudId: '1018062', estatusExodus: 'En proceso de entrega', tiempoEstimado: '45 min', tiempoTranscurrido: '28 min', fechaInicio: '22/04/2026 - 12:13:25 PM' },
];

function ModalBlueGoTracking({ onClose, shipment }: ModalBlueGoTrackingProps) {
  // Build list: if a specific shipment is passed, show it first
  const allBluego = useMemo(() => {
    if (shipment?.blueGoData) {
      const bg = shipment.blueGoData;
      const fromShipment = {
        embarqueId: shipment.id,
        salidasVehiculosId: bg.salidasVehiculosId,
        solicitudId: bg.solicitudId,
        estatusExodus: bg.estatusExodus,
        tiempoEstimado: bg.tiempoEstimado,
        tiempoTranscurrido: bg.tiempoTranscurrido,
        fechaInicio: bg.fechaInicio,
      };
      const rest = BLUEGO_SOLICITUDES_DEMO.filter(s => s.embarqueId !== shipment.id);
      return [fromShipment, ...rest];
    }
    return BLUEGO_SOLICITUDES_DEMO;
  }, [shipment]);

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
                {allBluego.map((s, i) => (
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

// ── Modal Crear / Editar Embarque ────────────────────────────
const PAQUETERIAS_FULL = ['Estafeta', 'BlueGo', 'Uber', 'Transporte Interno', 'MEXICO EXPRESS'];
const TIPOS_VEHICULO = ['Motocicleta', 'Auto', 'Camioneta', 'Camión'];

interface ModalCrearEmbarqueProps {
  onClose: () => void;
  onCreated: (shipment: Shipment, orderIds: string[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  preOrderId?: string | null;
  orderStatuses: Record<string, OrderStatus>;
  editShipment?: Shipment | null;  // if provided, edit mode
}

// ── HuellaCrearModal — huella para confirmar creación/edición de embarque ──
function HuellaCrearModal({ isEdit, onConfirm, onCancel }: { isEdit: boolean; onConfirm: () => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'success'>('idle');
  const accentColor = '#1a2b6b';
  const handleScan = () => {
    if (phase !== 'idle') return;
    setPhase('scanning');
    setTimeout(() => {
      setPhase('success');
      setTimeout(onConfirm, 600);
    }, 1400);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: '#1a2b6b' }}>
          {isEdit ? 'Confirmar actualización' : 'Confirmar embarque'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Registre su huella para {isEdit ? 'guardar los cambios del embarque' : 'crear el embarque'}
        </p>
        <div className="relative flex flex-col items-center mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all"
            style={{ background: phase === 'success' ? 'rgba(22,163,74,0.1)' : phase === 'scanning' ? 'rgba(26,43,107,0.1)' : 'rgba(26,43,107,0.06)', border: `2px solid ${phase === 'success' ? '#16a34a' : phase === 'scanning' ? accentColor : '#d1d5db'}` }}
            onClick={handleScan}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: phase === 'success' ? '#16a34a' : phase === 'scanning' ? accentColor : '#1a2b6b' }}>
              {phase === 'success' ? 'check_circle' : 'fingerprint'}
            </span>
          </div>
          {phase === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full animate-ping" style={{ background: `${accentColor}22` }} />
            </div>
          )}
        </div>
        <p className="text-sm font-medium mb-6" style={{ color: phase === 'success' ? '#16a34a' : phase === 'scanning' ? accentColor : '#6b7280' }}>
          {phase === 'success' ? 'Identidad confirmada' : phase === 'scanning' ? 'Verificando...' : 'Toque el ícono para escanear'}
        </p>
        {phase === 'idle' && (
          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
        )}
      </div>
    </div>
  );
}

function ModalCrearEmbarque({ onClose, onCreated, showToast, preOrderId, orderStatuses, editShipment }: ModalCrearEmbarqueProps) {
  const [showHuellaCrear, setShowHuellaCrear] = useState(false);
  const [pendingShipment, setPendingShipment] = useState<{ shipment: Shipment; orderIds: string[] } | null>(null);
  const isEditMode = !!editShipment;

  // Eligible orders: Revisado/Revisado con incidencias + already in editShipment
  const eligibleOrders = useMemo(() => {
    const revisados = Object.values(ORDERS_DB).filter(o => {
      const st = orderStatuses[o.id] ?? o.status;
      return st === 'Revisado' || st === 'Revisado con incidencias';
    });
    if (isEditMode && editShipment) {
      const editIds = editShipment.pedidos;
      const extras = editIds.map(id => ORDERS_DB[id]).filter(Boolean);
      const combined = [...revisados];
      extras.forEach(o => { if (!combined.find(x => x.id === o.id)) combined.push(o); });
      return combined;
    }
    return revisados;
  }, [orderStatuses, isEditMode, editShipment]);

  // Initialize state — pre-load from editShipment if editing
  const initOrders = isEditMode && editShipment ? editShipment.pedidos : (preOrderId && eligibleOrders.some(o => o.id === preOrderId) ? [preOrderId] : []);
  const [selectedOrders, setSelectedOrders] = useState<string[]>(initOrders);
  const [orderSearch, setOrderSearch] = useState('');
  const [showOrderDropdown, setShowOrderDropdown] = useState(false);
  const [paqueteria, setPaqueteria] = useState(isEditMode && editShipment ? editShipment.paqueteria : '');
  const [tipoVehiculo, setTipoVehiculo] = useState(isEditMode && editShipment ? editShipment.tipoVehiculo : '');
  const [observaciones, setObservaciones] = useState(isEditMode && editShipment ? editShipment.observaciones : '');
  const [confirmSolicitud, setConfirmSolicitud] = useState(false);

  // Per-box state: each box has { id, pedidoId, peso, pesoSimulado, pesoSimulando, dims: {largo,ancho,alto} | null, showDims }
  type BoxState = { id: string; pedidoId: string; peso: string; pesoSimulado: boolean; pesoSimulando: boolean; dims: { largo: string; ancho: string; alto: string } | null; showDims: boolean };

  const initBoxes = (): BoxState[] => {
    if (isEditMode && editShipment?.boxes && editShipment.boxes.length > 0) {
      return editShipment.boxes.map(b => ({
        id: b.id,
        pedidoId: b.pedidoId,
        peso: String(b.peso),
        pesoSimulado: true,
        pesoSimulando: false,
        dims: b.largo ? { largo: String(b.largo), ancho: String(b.ancho ?? ''), alto: String(b.alto ?? '') } : null,
        showDims: !!b.largo,
      }));
    }
    const firstOrder = initOrders[0] ?? '';
    return [{ id: '1', pedidoId: firstOrder, peso: '', pesoSimulado: false, pesoSimulando: false, dims: null, showDims: false }];
  };

  const [boxes, setBoxes] = useState<BoxState[]>(initBoxes);

  const updateBox = (idx: number, partial: Partial<BoxState>) => {
    setBoxes(prev => prev.map((b, i) => i === idx ? { ...b, ...partial } : b));
  };

  const addBox = () => {
    setBoxes(prev => [...prev, { id: String(prev.length + 1), pedidoId: selectedOrders[0] ?? '', peso: '', pesoSimulado: false, pesoSimulando: false, dims: null, showDims: false }]);
  };

  const removeBox = (idx: number) => {
    setBoxes(prev => prev.filter((_, i) => i !== idx));
  };

  const simulateBoxScale = (idx: number) => {
    updateBox(idx, { pesoSimulando: true });
    setTimeout(() => {
      const w = (1.2 + Math.random() * 3.5).toFixed(1);
      updateBox(idx, { peso: w, pesoSimulado: true, pesoSimulando: false });
      showToast(`Báscula caja ${idx + 1}: ${w} kg`, 'success');
    }, 1200);
  };

  const dropdownOrders = eligibleOrders.filter(o =>
    !selectedOrders.includes(o.id) &&
    (o.id.includes(orderSearch) || o.cliente.toLowerCase().includes(orderSearch.toLowerCase()))
  );

  const addOrder = (id: string) => { setSelectedOrders(prev => [...prev, id]); setOrderSearch(''); setShowOrderDropdown(false); };
  const removeOrder = (id: string) => setSelectedOrders(prev => prev.filter(x => x !== id));

  const isUberOrBluego = paqueteria === 'BlueGo' || paqueteria === 'Uber';
  const totalPeso = boxes.reduce((sum, b) => sum + (parseFloat(b.peso) || 0), 0);
  const canCreate = selectedOrders.length > 0 && paqueteria !== '' && boxes.length > 0 && boxes.every(b => b.peso !== '' && parseFloat(b.peso) > 0 && b.pedidoId !== '');

  const handleCreate = () => {
    if (!canCreate) return;
    if (isUberOrBluego && !confirmSolicitud) { setConfirmSolicitud(true); return; }

    const finalBoxes: BoxItem[] = boxes.map((b, i) => ({
      id: b.id || String(i + 1),
      pedidoId: b.pedidoId,
      peso: parseFloat(b.peso),
      ...(b.dims ? { largo: parseFloat(b.dims.largo) || undefined, ancho: parseFloat(b.dims.ancho) || undefined, alto: parseFloat(b.dims.alto) || undefined } : {}),
    }));

    const newId = isEditMode && editShipment ? editShipment.id : String(88520 + Math.floor(Math.random() * 900));
    const finalStatus: ShipmentStatus = isEditMode ? (editShipment?.status ?? 'Generado') : (isUberOrBluego ? 'Solicitado' : 'Generado');
    const newShipment: Shipment = {
      id: newId,
      paqueteria,
      pedidos: selectedOrders,
      observaciones,
      status: finalStatus,
      fecha: '2026-04-22',
      tipoVehiculo,
      cajas: boxes.length,
      peso: totalPeso,
      usuario: 'JMORENO11',
      boxes: finalBoxes,
    };

    // Show fingerprint confirmation before saving
    setPendingShipment({ shipment: newShipment, orderIds: selectedOrders });
    setShowHuellaCrear(true);
  };

  const handleHuellaCrearConfirm = () => {
    if (!pendingShipment) return;
    const { shipment, orderIds } = pendingShipment;
    onCreated(shipment, orderIds);
    if (!isEditMode && isUberOrBluego) showToast(`Solicitud enviada automáticamente a ${paqueteria}`, 'success');
    showToast(isEditMode ? `Embarque #${shipment.id} actualizado` : `Embarque #${shipment.id} creado correctamente`, 'success');
    setShowHuellaCrear(false);
    setPendingShipment(null);
    onClose();
  };

  return (
    <>
    {showHuellaCrear && (
      <HuellaCrearModal
        isEdit={isEditMode}
        onConfirm={handleHuellaCrearConfirm}
        onCancel={() => { setShowHuellaCrear(false); setPendingShipment(null); }}
      />
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={e => { if (e.target === e.currentTarget && !showHuellaCrear) onClose(); }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col" style={{ background: '#fff', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)' }}>
          <div>
            <h2 className="text-white font-bold text-lg">{isEditMode ? `Editar Embarque #${editShipment?.id}` : 'Crear Embarque'}</h2>
            <p className="text-blue-200 text-xs mt-0.5">{isEditMode ? `Paquetería: ${editShipment?.paqueteria}` : 'EmbarqueID: Por asignar'}</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* STEP 1: Pedidos */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">1</span>
              Pedidos a incluir
            </h3>
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Buscar pedido..."
                value={orderSearch}
                onChange={e => { setOrderSearch(e.target.value); setShowOrderDropdown(true); }}
                onFocus={() => setShowOrderDropdown(true)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
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
              {selectedOrders.map(id => {
                const o = ORDERS_DB[id];
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.2)' }}>
                    #{id} — {o?.cliente}
                    <button onClick={() => removeOrder(id)} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                  </span>
                );
              })}
              {selectedOrders.length === 0 && <span className="text-xs text-gray-400 italic">Ningún pedido seleccionado</span>}
            </div>
          </div>

          {/* STEP 2: Configuración */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">2</span>
              Configuración
            </h3>
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
            {paqueteria === 'Estafeta' && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(204,0,0,0.06)', border: '1px solid rgba(204,0,0,0.2)', color: '#cc0000' }}>
                <strong>Estafeta — Web service activo</strong> — Se generará la guía automáticamente
              </div>
            )}
            {isUberOrBluego && !confirmSolicitud && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.2)', color: '#2563eb' }}>
                <strong>{paqueteria} — Web service activo</strong> — solicitud automática al confirmar
              </div>
            )}
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

          {/* STEP 3: Cajas individuales */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-700 text-white text-xs flex items-center justify-center font-bold">3</span>
                Cajas ({boxes.length})
                <span className="text-xs font-normal text-gray-400 ml-1">Peso total: <strong className="text-gray-700">{totalPeso.toFixed(1)} kg</strong></span>
              </h3>
              <button
                onClick={addBox}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.2)' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
                Agregar caja
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {boxes.map((box, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden" style={{ background: '#fafbff' }}>
                  {/* Box header */}
                  <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(26,43,107,0.06)', borderBottom: '1px solid #e5e7eb' }}>
                    <span className="text-xs font-bold text-gray-700">Caja {idx + 1}</span>
                    {boxes.length > 1 && (
                      <button onClick={() => removeBox(idx)} className="text-xs text-red-400 hover:text-red-600 transition-colors">× Eliminar</button>
                    )}
                  </div>

                  {/* Box fields */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-3">
                    {/* Pedido asignado */}
                    <div>
                      <label className="block text-xs text-gray-500 font-medium mb-1">Pedido <span className="text-red-500">*</span></label>
                      <select
                        value={box.pedidoId}
                        onChange={e => updateBox(idx, { pedidoId: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">Seleccionar...</option>
                        {selectedOrders.map(id => (
                          <option key={id} value={id}>#{id} — {ORDERS_DB[id]?.cliente}</option>
                        ))}
                      </select>
                    </div>

                    {/* Peso con báscula */}
                    <div>
                      <label className="block text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                        Peso (kg) <span className="text-red-500">*</span>
                        {box.pesoSimulado && <span className="text-green-600 font-semibold">✓</span>}
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="number" min="0.1" step="0.1"
                          value={box.peso}
                          onChange={e => updateBox(idx, { peso: e.target.value, pesoSimulado: false })}
                          placeholder="0.0"
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                          style={box.pesoSimulado ? { borderColor: '#16a34a', background: 'rgba(22,163,74,0.04)' } : {}}
                        />
                        <button
                          onClick={() => simulateBoxScale(idx)}
                          disabled={box.pesoSimulando || box.pesoSimulado}
                          title="Báscula"
                          className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={box.pesoSimulado ? { background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)' } : box.pesoSimulando ? { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' } : { background: 'rgba(26,43,107,0.08)', color: '#1a2b6b', border: '1px solid rgba(26,43,107,0.2)' }}
                        >
                          {box.pesoSimulando ? '...' : box.pesoSimulado ? '✓' : '⚖️'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dimensiones (opcional) */}
                  <div className="px-4 pb-3">
                    {!box.showDims ? (
                      <button
                        onClick={() => updateBox(idx, { showDims: true, dims: { largo: '', ancho: '', alto: '' } })}
                        className="text-xs text-blue-600 hover:text-blue-800 underline transition-colors"
                      >
                        + Agregar dimensiones (opcional)
                      </button>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-500">Dimensiones (cm)</span>
                          <button onClick={() => updateBox(idx, { showDims: false, dims: null })} className="text-xs text-gray-400 hover:text-red-500">× Quitar</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(['largo', 'ancho', 'alto'] as const).map(dim => (
                            <div key={dim}>
                              <label className="block text-xs text-gray-400 mb-0.5 capitalize">{dim}</label>
                              <input
                                type="number" min="1" step="1"
                                value={box.dims?.[dim] ?? ''}
                                onChange={e => updateBox(idx, { dims: { ...(box.dims ?? { largo: '', ancho: '', alto: '' }), [dim]: e.target.value } })}
                                placeholder="0"
                                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {!confirmSolicitud && (
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #e5e7eb', background: '#f8f9fb' }}>
            <span className="text-xs text-gray-400">{boxes.length} caja{boxes.length !== 1 ? 's' : ''} · {totalPeso.toFixed(1)} kg total</span>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={!canCreate}
                className="px-6 py-2 rounded-lg text-sm font-bold text-white transition-all"
                style={canCreate ? { background: 'linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)', boxShadow: '0 4px 14px rgba(26,43,107,0.3)' } : { background: '#d1d5db', color: '#9ca3af', cursor: 'not-allowed' }}
              >
                {isEditMode ? 'Guardar cambios' : isUberOrBluego ? `Solicitar ${paqueteria}` : 'Crear embarque'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ── HuellaConfirmModal ──────────────────────────────────────
function HuellaConfirmModal({ tipo, onConfirm, onCancel }: { tipo: 'salida' | 'entrega'; onConfirm: () => void; onCancel: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'success'>('idle');
  const isSalida = tipo === 'salida';
  const accentColor = isSalida ? '#7c3aed' : '#16a34a';
  const handleScan = () => {
    if (phase !== 'idle') return;
    setPhase('scanning');
    setTimeout(() => {
      setPhase('success');
      setTimeout(onConfirm, 600);
    }, 1400);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
        <h2 className="text-lg font-bold mb-1" style={{ color: '#1a2b6b' }}>
          {isSalida ? 'Confirmar salida a reparto' : 'Confirmar entrega al cliente'}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {isSalida ? 'Registre su huella para confirmar la salida del embarque' : 'Registre su huella para confirmar la entrega al cliente'}
        </p>
        <div className="relative flex flex-col items-center mb-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all"
            style={{ background: phase === 'success' ? 'rgba(22,163,74,0.1)' : phase === 'scanning' ? `rgba(${isSalida ? '124,58,237' : '37,99,235'},0.1)` : 'rgba(26,43,107,0.06)', border: `2px solid ${phase === 'success' ? '#16a34a' : phase === 'scanning' ? accentColor : '#d1d5db'}` }}
            onClick={handleScan}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: phase === 'success' ? '#16a34a' : phase === 'scanning' ? accentColor : '#1a2b6b' }}>
              {phase === 'success' ? 'check_circle' : 'fingerprint'}
            </span>
          </div>
          {phase === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full animate-ping" style={{ background: `${accentColor}22` }} />
            </div>
          )}
        </div>
        <p className="text-sm font-medium mb-6" style={{ color: phase === 'success' ? '#16a34a' : phase === 'scanning' ? accentColor : '#6b7280' }}>
          {phase === 'success' ? 'Identidad confirmada' : phase === 'scanning' ? 'Verificando...' : 'Toque el ícono para escanear'}
        </p>
        {phase === 'idle' && (
          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
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
  // Manual dispatch flow
  const [showConfirmEnvio, setShowConfirmEnvio] = useState(false);
  const [showHuellaModal, setShowHuellaModal] = useState<'salida' | 'entrega' | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Auto-select shipment when navigating from a specific order
  // Only selects the shipment in the list — does NOT auto-open any tracking/guide modal
  useEffect(() => {
    if (!preSelectedOrderId) return;
    const match = shipments.find(s => s.pedidos.includes(preSelectedOrderId));
    if (match) {
      setSelectedShipmentId(match.id);
      // No auto-open: user must manually click the action button to generate guide/solicitud
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSelectedOrderId]);

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId) ?? null;

  const handleCreated = (shipment: Shipment, orderIds: string[]) => {
    setShipments(prev => [shipment, ...prev]);
    orderIds.forEach(id => updateOrderStatus(id, 'Documentado'));
    setSelectedShipmentId(shipment.id);
  };

  const handleGuiaGenerada = (shipmentId: string, guia: string) => {
    setGuias(prev => ({ ...prev, [shipmentId]: guia }));
    // Estafeta: al generar guía cambia automáticamente a 'En tránsito' (reparto iniciado)
    setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'En tránsito' } : s));
    // También actualizar los pedidos incluidos
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) shipment.pedidos.forEach(pid => updateOrderStatus(pid, 'Enviado' as any));
  };

  const handleEnviarSolicitud = () => {
    if (!selectedShipment) return;
    const p = selectedShipment.paqueteria;
    const s = selectedShipment.status;

    if (p === 'Estafeta') {
      // Estafeta: solo generar guía (disponible en Generado/Solicitado)
      setShowGuiaModal(true);
    } else if (p === 'Uber') {
      // Uber: solo rastreo — no hay confirmación manual de entrega
      setShowUberModal(true);
    } else if (p === 'BlueGo') {
      // BlueGo: solo rastreo — no hay confirmación manual de entrega
      setShowBlueGoModal(true);
    } else {
      // Transporte Interno / MEXICO EXPRESS: flujo manual completo
      if (s === 'Generado') {
        // Paso 1: confirmar salida a reparto (con huella)
        setShowConfirmEnvio(true);
      } else if (s === 'En reparto') {
        // Paso 2: confirmar entrega al cliente (con huella)
        setShowHuellaModal('entrega');
      }
    }
  };
  const handleConfirmEnvio = () => {
    setShowConfirmEnvio(false);
    setShowHuellaModal('salida');
  };
  const handleHuellaConfirm = (tipo: 'salida' | 'entrega') => {
    if (!selectedShipment) return;
    if (tipo === 'salida') {
      setShipments(prev => prev.map(s =>
        s.id === selectedShipment.id ? { ...s, status: 'En reparto' } : s
      ));
      selectedShipment.pedidos.forEach(pid => updateOrderStatus(pid, 'En reparto' as any));
      showToast(`Embarque #${selectedShipment.id} — Salida a reparto confirmada`, 'success');
    } else {
      setShipments(prev => prev.map(s =>
        s.id === selectedShipment.id ? { ...s, status: 'Entregado' } : s
      ));
      selectedShipment.pedidos.forEach(pid => updateOrderStatus(pid, 'Entregado' as any));
      showToast(`Embarque #${selectedShipment.id} — Entrega confirmada`, 'success');
    }
    setShowHuellaModal(null);
  };

  const isManualPaqueteria = selectedShipment !== null &&
    (selectedShipment.paqueteria === 'Transporte Interno' || selectedShipment.paqueteria === 'MEXICO EXPRESS');
  const isUberOrBluego = selectedShipment !== null &&
    (selectedShipment.paqueteria === 'Uber' || selectedShipment.paqueteria === 'BlueGo');

  // Reglas de disponibilidad del botón de acción principal:
  // - Estafeta: solo si está en Generado o Solicitado (para generar guía)
  // - Uber/BlueGo: solo si está en Generado (para generar/ver solicitud); En tránsito solo rastreo
  // - Transporte Interno: disponible en Generado (confirmar salida) y En reparto (confirmar entrega)
  const canEnviar = selectedShipment !== null && (
    selectedShipment.paqueteria === 'Estafeta'
      ? (selectedShipment.status === 'Generado' || selectedShipment.status === 'Solicitado')
      : isUberOrBluego
      ? (selectedShipment.status === 'Generado' || selectedShipment.status === 'Solicitado' || selectedShipment.status === 'En tránsito')
      : isManualPaqueteria && (selectedShipment.status === 'Generado' || selectedShipment.status === 'En reparto')
  );

  // Edición solo disponible en estado Generado (antes de enviar por cualquier medio)
  const canEditar = selectedShipment !== null && selectedShipment.status === 'Generado';

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
    const s = selectedShipment.status;

    // Estafeta: siempre generar guía
    if (p === 'Estafeta') return 'Generar guía Estafeta';

    // Uber: generar solicitud (Generado) o rastrear (En tránsito)
    if (p === 'Uber') {
      if (s === 'En tránsito') return 'Rastrear Uber';
      if (selectedShipment.uberData) return 'Ver solicitud Uber';
      return 'Generar solicitud Uber';
    }

    // BlueGo: generar solicitud (Generado) o rastrear (En tránsito)
    if (p === 'BlueGo') {
      if (s === 'En tránsito') return 'Rastrear BlueGo';
      if (selectedShipment.blueGoData) return 'Ver solicitud BlueGo';
      return 'Generar solicitud BlueGo';
    }

    // Transporte Interno / MEXICO EXPRESS: flujo manual
    if (s === 'Generado') return 'Confirmar salida a reparto';
    if (s === 'En reparto') return 'Confirmar entrega al cliente';
    return 'Confirmar salida a reparto';
  };

  const getEnviarColor = () => {
    if (!selectedShipment) return '#6b7280';
    const p = selectedShipment.paqueteria;
    const s = selectedShipment.status;
    if (p === 'Estafeta') return '#cc0000';
    if (p === 'Uber') return '#111';
    if (p === 'BlueGo') return '#1a2b6b';
    // Transporte Interno
    if (s === 'En reparto') return '#16a34a'; // verde para confirmar entrega
    return '#7c3aed'; // morado para confirmar salida
  };

  // Texto de estado informativo para Uber/BlueGo en tránsito
  const getStatusInfoText = () => {
    if (!selectedShipment) return null;
    const p = selectedShipment.paqueteria;
    const s = selectedShipment.status;
    if ((p === 'Uber' || p === 'BlueGo') && s === 'En tránsito') {
      return `El estado se actualiza automáticamente desde ${p}. Use el botón para rastrear.`;
    }
    if ((p === 'Uber' || p === 'BlueGo') && s === 'Entregado') {
      return `Entrega confirmada automáticamente por ${p}.`;
    }
    if (p === 'Estafeta' && s === 'En tránsito') {
      return 'Guía generada. El reparto está en curso.';
    }
    return null;
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
                  <PaqueteriaBadge paqueteria={s.paqueteria} />
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

                {/* Info banner para Uber/BlueGo en tránsito o entregado */}
                {getStatusInfoText() && (
                  <div className="flex items-start gap-2 mb-3 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}>
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2563eb' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    <p className="text-xs" style={{ color: '#1d4ed8' }}>{getStatusInfoText()}</p>
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {canEnviar && (
                    <button
                      onClick={handleEnviarSolicitud}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
                      style={{ background: getEnviarColor(), color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                    >
                      {/* Ícono según tipo de acción */}
                      {(selectedShipment.paqueteria === 'Uber' || selectedShipment.paqueteria === 'BlueGo') && selectedShipment.status === 'En tránsito' ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      ) : selectedShipment.status === 'En reparto' ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>
                      )}
                      {getEnviarLabel()}
                    </button>
                  )}
                  {canEditar && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                      style={{ background: 'transparent', color: '#1a2b6b', border: '1.5px solid #1a2b6b' }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Editar embarque
                    </button>
                  )}
                  {!canEnviar && !canEditar && selectedShipment.status === 'Entregado' && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
                      <svg className="w-4 h-4" style={{ color: '#16a34a' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-sm font-semibold" style={{ color: '#15803d' }}>Embarque entregado</span>
                    </div>
                  )}
                </div>
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
      {showUberModal && <ModalUberTracking onClose={() => setShowUberModal(false)} shipment={selectedShipment} />}
      {showBlueGoModal && <ModalBlueGoTracking onClose={() => setShowBlueGoModal(false)} shipment={selectedShipment} />}

      {/* Confirm envio modal */}
      {showConfirmEnvio && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)' }}>
                <svg className="w-5 h-5" style={{ color: '#7c3aed' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#1a2b6b' }}>Confirmar envío</h2>
                <p className="text-xs text-gray-500">Embarque #{selectedShipment.id} — {selectedShipment.paqueteria}</p>
              </div>
            </div>
            <div className="rounded-xl p-4 mb-6" style={{ background: '#f4f6fa', border: '1px solid #e5e7eb' }}>
              <p className="text-sm text-gray-700 mb-2">Al confirmar, el embarque pasará a estado <strong>En reparto</strong> y se registrará la salida a reparto.</p>
              <div className="flex gap-6 mt-3">
                <div><p className="text-xs text-gray-500">Pedidos</p><p className="font-bold text-sm" style={{ color: '#1a2b6b' }}>{selectedShipment.pedidos.length}</p></div>
                <div><p className="text-xs text-gray-500">Cajas</p><p className="font-bold text-sm" style={{ color: '#1a2b6b' }}>{selectedShipment.cajas}</p></div>
                <div><p className="text-xs text-gray-500">Peso</p><p className="font-bold text-sm" style={{ color: '#1a2b6b' }}>{selectedShipment.peso} kg</p></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmEnvio(false)} className="flex-1 py-2.5 rounded-lg text-sm font-bold" style={{ background: '#f3f4f6', color: '#6b7280' }}>Cancelar</button>
              <button onClick={handleConfirmEnvio} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: '#7c3aed', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>Confirmar envío</button>
            </div>
          </div>
        </div>
      )}

      {/* Huella modal for salida/entrega */}
      {showHuellaModal && selectedShipment && (
        <HuellaConfirmModal
          tipo={showHuellaModal}
          onConfirm={() => handleHuellaConfirm(showHuellaModal!)}
          onCancel={() => setShowHuellaModal(null)}
        />
      )}

      {/* Edit embarque modal */}
      {showEditModal && selectedShipment && (
        <ModalCrearEmbarque
          onClose={() => setShowEditModal(false)}
          onCreated={(updated, _orderIds) => {
            setShipments(prev => prev.map(s => s.id === selectedShipment.id ? { ...updated, id: selectedShipment.id } : s));
            setSelectedShipmentId(selectedShipment.id);
            setShowEditModal(false);
            showToast(`Embarque #${selectedShipment.id} actualizado`, 'success');
          }}
          showToast={showToast}
          preOrderId={selectedShipment.pedidos[0]}
          orderStatuses={state.orderStatuses}
          editShipment={selectedShipment}
        />
      )}
    </div>
  );
}
