/**
 * MobileSummary — Pantalla de resumen post-revisión (versión móvil)
 * Layout compacto: header 52px + contenido flex-1 scrollable + acciones 80px fijo
 */
import { useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { ORDERS_DB, PRODUCT_CATALOG, formatDateTime } from "@/lib/data";

export default function MobileSummary() {
  const [, navigate] = useLocation();
  const { state, resetReview } = useApp();

  const order = state.selectedOrderId ? ORDERS_DB[state.selectedOrderId] : null;

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1f3e" }}>
        <div className="text-center px-6">
          <p className="text-white mb-4 text-sm">No hay revisión activa</p>
          <button
            onClick={() => navigate("/mobile/revision")}
            className="px-6 py-3 rounded-xl text-white font-bold text-sm"
            style={{ background: "#1a2b6b" }}
          >
            Volver a selección
          </button>
        </div>
      </div>
    );
  }

  // Compute totals
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

  const summaryRows = order.partidas.map((p) => {
    const item = state.scannedItems[p.code];
    const product = PRODUCT_CATALOG[p.code];
    const effectiveConteo = item?.removedFromCount ? p.qty : item?.conteo ?? 0;
    const diff = effectiveConteo - p.qty;

    let statusLabel: string;
    let statusColor: string;

    if (item?.removedFromCount) {
      statusLabel = "Correcto";
      statusColor = "#4ade80";
    } else if (item?.denied) {
      statusLabel = `Negado — ${item.authMotivo}`;
      statusColor = "#f87171";
    } else if (diff === 0) {
      statusLabel = "Correcto";
      statusColor = "#4ade80";
    } else {
      statusLabel = "Con diferencia";
      statusColor = "#fbbf24";
    }

    return { p, product, effectiveConteo, diff, statusLabel, statusColor };
  });

  return (
    <div
      className="flex flex-col"
      style={{
        background: "#1a1f3e",
        fontFamily: "'Roboto', sans-serif",
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
      }}
    >
      {/* ── HEADER (52px) ── */}
      <div
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{
          height: 52,
          background: "linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)",
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: hasIncidencias ? "rgba(217,119,6,0.25)" : "rgba(22,163,74,0.25)",
            border: hasIncidencias ? "1px solid rgba(217,119,6,0.5)" : "1px solid rgba(22,163,74,0.5)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={hasIncidencias ? "#fbbf24" : "#4ade80"} strokeWidth={2.5} className="w-4 h-4">
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
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm leading-tight">Pedido #{order.id}</div>
          <div className="text-blue-300 text-xs">Revisión completada</div>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-md"
          style={
            hasIncidencias
              ? { background: "rgba(217,119,6,0.2)", color: "#fbbf24", border: "1px solid rgba(217,119,6,0.3)" }
              : { background: "rgba(22,163,74,0.2)", color: "#4ade80", border: "1px solid rgba(22,163,74,0.3)" }
          }
        >
          {hasIncidencias ? "Incidencias" : "Sin incidencias"}
        </span>
      </div>

      {/* ── CONTENT (flex-1, scrollable) ── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2.5"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Meta info */}
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {[
              ["Cliente", order.cliente],
              ["Revisor", "Isai"],
              ["Inicio", formatDateTime(state.reviewStartTime)],
              ["Fin", formatDateTime(state.reviewEndTime)],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-gray-500">{label}</div>
                <div className="text-white font-medium">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Requerido", value: totalReq, color: "#93c5fd" },
            { label: "Contado", value: totalCont, color: totalCont === totalReq ? "#4ade80" : "#fbbf24" },
            { label: "Negados", value: negados, color: negados > 0 ? "#f87171" : "#4ade80" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl px-2 py-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className="text-xl font-black" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Partidas */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">
            Detalle de partidas
          </div>
          <div className="flex flex-col gap-1.5">
            {summaryRows.map(({ p, product, effectiveConteo, diff, statusLabel, statusColor }) => (
              <div
                key={p.code}
                className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: statusColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">{p.code}</span>
                    <span className="text-xs text-gray-500">{effectiveConteo}/{p.qty}</span>
                    {diff !== 0 && (
                      <span className="text-xs font-semibold" style={{ color: statusColor }}>
                        ({diff > 0 ? "+" : ""}{diff})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {product?.name || "Producto no identificado"}
                  </div>
                </div>
                <div
                  className="text-xs font-semibold flex-shrink-0 text-right"
                  style={{ color: statusColor, maxWidth: 80 }}
                >
                  {statusLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unknown products note */}
        {state.unknownProducts.length > 0 && (
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)" }}
          >
            <div className="text-xs text-amber-400 font-semibold mb-0.5">
              Productos retirados del pedido
            </div>
            <div className="text-xs text-gray-500">
              {state.unknownProducts.length} producto(s) no perteneciente(s) al pedido fueron retirados físicamente.
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTIONS (80px) ── */}
      <div
        className="flex flex-col gap-1.5 px-3 flex-shrink-0"
        style={{
          paddingTop: 10,
          paddingBottom: 14,
          background: "rgba(20,24,50,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <button
          onClick={handleClose}
          className="w-full rounded-xl text-white font-bold text-sm transition-all active:scale-95"
          style={{
            height: 44,
            background: "linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)",
            boxShadow: "0 4px 14px rgba(30,79,194,0.35)",
          }}
        >
          Volver a selección de pedidos
        </button>
        <button
          onClick={() => navigate("/mobile/menu")}
          className="w-full rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            height: 36,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Ir al menú principal
        </button>
      </div>
    </div>
  );
}
