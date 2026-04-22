/**
 * MobileSummary — Pantalla de resumen post-revisión (versión móvil)
 * Misma lógica de estado que ScreenSummary:
 *   removedFromCount → Correcto (diff 0)
 *   denied           → Producto negado
 *   diff === 0       → Correcto
 *   else             → Con diferencia
 * Los productos incorrectos retirados NO aparecen en el resumen.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { ORDERS_DB, PRODUCT_CATALOG, formatDateTime } from "@/lib/data";

export default function MobileSummary() {
  const [, navigate] = useLocation();
  const { state, resetReview } = useApp();
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const order = state.selectedOrderId ? ORDERS_DB[state.selectedOrderId] : null;

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1f3e" }}>
        <div className="text-center">
          <p className="text-white mb-4">No hay revisión activa</p>
          <button
            onClick={() => navigate("/mobile/revision")}
            className="px-6 py-3 rounded-xl text-white font-bold"
            style={{ background: "#1a2b6b" }}
          >
            Volver a selección
          </button>
        </div>
      </div>
    );
  }

  // Compute totals (same logic as ScreenSummary)
  let totalReq = 0;
  let totalCont = 0;
  let negados = 0;

  order.partidas.forEach((p) => {
    totalReq += p.qty;
    const item = state.scannedItems[p.code];
    const effectiveConteo = item?.removedFromCount ? p.qty : item?.conteo ?? 0;
    totalCont += effectiveConteo;
    if (item?.denied) negados++;
  });

  const hasIncidencias = order.partidas.some((p) => {
    const item = state.scannedItems[p.code];
    if (!item) return false;
    if (item.removedFromCount) return false;
    if (item.denied) return true;
    return item.conteo !== p.qty;
  });

  const handleClose = () => {
    resetReview();
    navigate("/mobile/revision");
  };

  // Build summary rows (exclude unknown products removed as "Producto incorrecto")
  const summaryRows = order.partidas.map((p) => {
    const item = state.scannedItems[p.code];
    const product = PRODUCT_CATALOG[p.code];
    const effectiveConteo = item?.removedFromCount ? p.qty : item?.conteo ?? 0;
    const diff = effectiveConteo - p.qty;

    let status: "correcto" | "negado" | "diferencia";
    let statusLabel: string;
    let statusColor: string;

    if (item?.removedFromCount) {
      status = "correcto";
      statusLabel = "Correcto";
      statusColor = "#4ade80";
    } else if (item?.denied) {
      status = "negado";
      statusLabel = `Producto negado — ${item.authMotivo}`;
      statusColor = "#f87171";
    } else if (diff === 0) {
      status = "correcto";
      statusLabel = "Correcto";
      statusColor = "#4ade80";
    } else {
      status = "diferencia";
      statusLabel = "Con diferencia";
      statusColor = "#fbbf24";
    }

    return { p, item, product, effectiveConteo, diff, status, statusLabel, statusColor };
  });

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#1a1f3e", fontFamily: "'Roboto', sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ background: "linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: hasIncidencias ? "rgba(217,119,6,0.3)" : "rgba(22,163,74,0.3)",
            border: hasIncidencias ? "2px solid rgba(217,119,6,0.6)" : "2px solid rgba(22,163,74,0.6)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={hasIncidencias ? "#fbbf24" : "#4ade80"} strokeWidth={2.5} className="w-5 h-5">
            {hasIncidencias ? (
              <>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </>
            ) : (
              <path d="M20 6L9 17l-5-5" />
            )}
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-xs text-blue-300 uppercase tracking-widest">Revisión completada</div>
          <h1 className="text-white font-bold text-lg leading-tight">Pedido #{order.id}</h1>
        </div>
        <span
          className="text-xs font-bold px-2 py-1 rounded-lg"
          style={
            hasIncidencias
              ? { background: "rgba(217,119,6,0.2)", color: "#fbbf24", border: "1px solid rgba(217,119,6,0.3)" }
              : { background: "rgba(22,163,74,0.2)", color: "#4ade80", border: "1px solid rgba(22,163,74,0.3)" }
          }
        >
          {hasIncidencias ? "Con incidencias" : "Sin incidencias"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Meta info */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Cliente", order.cliente],
              ["Revisor", "Isai"],
              ["Inicio", formatDateTime(state.reviewStartTime)],
              ["Fin", formatDateTime(state.reviewEndTime)],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                <div className="text-white font-medium text-xs">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Requerido", value: totalReq, color: "#93c5fd" },
            { label: "Contado", value: totalCont, color: totalCont === totalReq ? "#4ade80" : "#fbbf24" },
            { label: "Negados", value: negados, color: negados > 0 ? "#f87171" : "#4ade80" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl px-3 py-3 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="text-2xl font-black" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Partidas table */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-1">
            Detalle de partidas
          </div>
          <div className="flex flex-col gap-2">
            {summaryRows.map(({ p, product, effectiveConteo, diff, statusLabel, statusColor }) => (
              <div
                key={p.code}
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Status dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: statusColor }}
                />

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{p.code}</span>
                    <span className="text-xs text-gray-500">
                      {effectiveConteo}/{p.qty}
                    </span>
                    {diff !== 0 && (
                      <span className="text-xs font-semibold" style={{ color: statusColor }}>
                        ({diff > 0 ? "+" : ""}{diff})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {product?.name || "Producto no identificado"}
                  </div>
                </div>

                {/* Status label */}
                <div className="text-xs font-semibold flex-shrink-0 text-right" style={{ color: statusColor, maxWidth: 90 }}>
                  {statusLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unknown products note */}
        {state.unknownProducts.length > 0 && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}
          >
            <div className="text-xs text-amber-400 font-semibold mb-1">
              Productos retirados del pedido
            </div>
            <div className="text-xs text-gray-500">
              {state.unknownProducts.length} producto(s) no perteneciente(s) al pedido fueron retirados físicamente y no se incluyen en el resumen.
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="px-4 pb-8 pt-3 flex flex-col gap-2 flex-shrink-0"
        style={{ background: "rgba(26,31,62,0.95)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={handleClose}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)",
            boxShadow: "0 4px 15px rgba(30,79,194,0.4)",
          }}
        >
          Volver a selección de pedidos
        </button>
        <button
          onClick={() => navigate("/mobile/menu")}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Ir al menú principal
        </button>
      </div>
    </div>
  );
}
