/**
 * MobileRevision — Pantalla de revisión ciega (versión móvil)
 *
 * Diseño compacto para pantallas reales de celular (375×667+):
 *  - Header: 52px fijo
 *  - Barra de progreso: 3px
 *  - Zona de último escaneado: 56px fijo (compacta, sin ícono grande)
 *  - Lista de partidas: flex-1 con overflow-y-auto → ocupa todo el espacio restante
 *  - Barra inferior: 72px fijo (botones grandes táctiles)
 *
 * Interacción: toca una fila → suma 1 al conteo de esa partida (simula escaneo).
 * El input oculto permite escáner físico Bluetooth/USB.
 */
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useApp } from "@/contexts/AppContext";
import { ORDERS_DB, PRODUCT_CATALOG } from "@/lib/data";
import { DiscrepancyResolution } from "@/contexts/AppContext";
import MobileDiscrepancy, { Discrepancy } from "@/components/MobileDiscrepancy";

const UNKNOWN_CODE = "XX-999";

export default function MobileRevision() {
  const [, navigate] = useLocation();
  const { state, processScan, finalizeReview } = useApp();
  const [scanValue, setScanValue] = useState("");
  const [showDiscModal, setShowDiscModal] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [lastBump, setLastBump] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const order = state.selectedOrderId ? ORDERS_DB[state.selectedOrderId] : null;

  const refocusScanner = useCallback(() => {
    setTimeout(() => scanInputRef.current?.focus(), 80);
  }, []);

  const fireScan = useCallback(
    (code: string) => {
      processScan(code);
      setLastBump(code);
      setTimeout(() => setLastBump(null), 350);
    },
    [processScan]
  );

  const handleRowClick = (code: string) => {
    fireScan(code);
    refocusScanner();
  };

  const handleManualScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const code = scanValue.trim().toUpperCase();
      setScanValue("");
      if (!code) return;
      fireScan(code);
      refocusScanner();
    }
  };

  const handleFinalize = () => {
    if (!order) return;
    const discs: Discrepancy[] = [];
    order.partidas.forEach((p) => {
      const item = state.scannedItems[p.code];
      const diff = (item?.conteo ?? 0) - p.qty;
      if (diff !== 0 && !item?.authorized) {
        discs.push({
          code: p.code,
          name: PRODUCT_CATALOG[p.code]?.name || p.code,
          req: p.qty,
          conteo: item?.conteo ?? 0,
          diff,
          tipo: diff > 0 ? "Sobrante" : "Faltante",
        });
      }
    });
    state.unknownProducts.forEach((code) => {
      const item = state.scannedItems[code];
      if (!item?.authorized) {
        discs.push({
          code,
          name: PRODUCT_CATALOG[code]?.name || "Producto no identificado",
          req: 0,
          conteo: item?.conteo ?? 0,
          diff: item?.conteo ?? 0,
          tipo: "Producto incorrecto",
        });
      }
    });
    if (discs.length > 0) {
      setDiscrepancies(discs);
      setShowDiscModal(true);
    } else {
      finalizeReview();
      navigate("/mobile/resumen");
    }
  };

  const handleConfirmDisc = (resolutions: DiscrepancyResolution[]) => {
    setShowDiscModal(false);
    finalizeReview(resolutions);
    navigate("/mobile/resumen");
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1f3e" }}>
        <div className="text-center px-6">
          <p className="text-white mb-4 text-sm">No hay pedido seleccionado</p>
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

  const lastCode = state.lastScannedCode;
  const lastProduct = lastCode ? PRODUCT_CATALOG[lastCode] : null;
  const lastItem = lastCode ? state.scannedItems[lastCode] : null;

  let completedPartidas = 0;
  order.partidas.forEach((p) => {
    const item = state.scannedItems[p.code];
    if (item && item.conteo >= p.qty) completedPartidas++;
  });
  const totalPartidas = order.partidas.length;
  const progressPct = totalPartidas > 0 ? Math.round((completedPartidas / totalPartidas) * 100) : 0;

  if (showDiscModal) {
    return (
      <MobileDiscrepancy
        discrepancies={discrepancies}
        onConfirm={handleConfirmDisc}
        onBack={() => setShowDiscModal(false)}
      />
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{
        background: "#1a1f3e",
        fontFamily: "'Roboto', sans-serif",
        height: "100dvh",          // usa dvh para respetar barra de navegación del browser
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
        <button
          onClick={() => navigate("/mobile/revision")}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-4 h-4">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm leading-tight truncate">
            Pedido #{order.id}
          </div>
          <div className="text-blue-300 text-xs truncate">{order.cliente}</div>
        </div>
        {/* Progress badge */}
        <div
          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold"
          style={{
            background: progressPct === 100 ? "rgba(22,163,74,0.25)" : "rgba(255,255,255,0.1)",
            color: progressPct === 100 ? "#4ade80" : "white",
          }}
        >
          {completedPartidas}/{totalPartidas}
        </div>
      </div>

      {/* ── PROGRESS BAR (3px) ── */}
      <div className="flex-shrink-0" style={{ height: 3, background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${progressPct}%`,
            background: progressPct === 100
              ? "linear-gradient(90deg,#16a34a,#22c55e)"
              : "linear-gradient(90deg,#1e4fc2,#06b6d4)",
          }}
        />
      </div>

      {/* ── LAST SCANNED STRIP (48px) ── */}
      <div
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{
          height: 48,
          background: lastCode
            ? lastItem && !lastItem.fromOrder
              ? "rgba(217,119,6,0.18)"
              : "rgba(22,163,74,0.14)"
            : "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          transition: "background 0.3s",
        }}
      >
        {/* Scanner icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: lastCode
              ? lastItem && !lastItem.fromOrder ? "rgba(217,119,6,0.3)" : "rgba(22,163,74,0.3)"
              : "rgba(255,255,255,0.07)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={lastCode ? (lastItem && !lastItem.fromOrder ? "#f59e0b" : "#4ade80") : "rgba(255,255,255,0.25)"} strokeWidth={2} className="w-3.5 h-3.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" />
          </svg>
        </div>

        {/* Last scanned info */}
        <div className="flex-1 min-w-0">
          {lastCode ? (
            <div className="flex items-center gap-1.5">
              <span
                className="font-bold text-xs"
                style={{ color: lastItem && !lastItem.fromOrder ? "#f59e0b" : "#4ade80" }}
              >
                {lastCode}
              </span>
              <span className="text-gray-400 text-xs truncate">
                {lastProduct?.name || "Producto no identificado"}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 text-xs">Toca una partida para registrar</span>
          )}
        </div>

        {/* Count + scanner button */}
        {lastCode && lastItem ? (
          <div
            className="flex-shrink-0 font-black text-base"
            style={{
              color: lastItem && !lastItem.fromOrder ? "#f59e0b" : "#4ade80",
              animation: lastBump === lastCode ? "badgePop 0.3s ease" : "none",
            }}
          >
            ×{lastItem.conteo}
          </div>
        ) : (
          <button
            onClick={() => scanInputRef.current?.focus()}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
            style={{
              background: "rgba(6,182,212,0.12)",
              border: "1px dashed rgba(6,182,212,0.4)",
              color: "#06b6d4",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
            </svg>
            Escáner
          </button>
        )}
      </div>

      {/* Hidden scanner input */}
      <input
        ref={scanInputRef}
        type="text"
        value={scanValue}
        onChange={(e) => setScanValue(e.target.value)}
        onKeyDown={handleManualScan}
        style={{ position: "absolute", left: -9999, width: 0, height: 0, opacity: 0 }}
        autoFocus
      />

      {/* ── PARTIDAS LIST (flex-1, scrollable) ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* Section label */}
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 px-0.5">
          Partidas — toca para escanear
        </div>

        <div className="flex flex-col gap-1.5">
          {order.partidas.map((p) => {
            const item = state.scannedItems[p.code];
            const product = PRODUCT_CATALOG[p.code];
            const conteo = item?.conteo ?? 0;
            const isComplete = conteo >= p.qty;
            const isBumping = lastBump === p.code;

            return (
              <button
                key={p.code}
                onClick={() => handleRowClick(p.code)}
                className="w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all active:scale-98"
                style={{
                  background: isComplete
                    ? "rgba(22,163,74,0.1)"
                    : "rgba(255,255,255,0.04)",
                  border: isComplete
                    ? "1px solid rgba(22,163,74,0.3)"
                    : "1px solid rgba(255,255,255,0.07)",
                  transform: isBumping ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.15s, background 0.2s",
                }}
              >
                {/* Count badge */}
                <div
                  className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 font-black text-base leading-none"
                  style={{
                    background: isComplete
                      ? "rgba(22,163,74,0.2)"
                      : conteo > 0
                      ? "rgba(30,79,194,0.25)"
                      : "rgba(255,255,255,0.05)",
                    color: isComplete ? "#4ade80" : conteo > 0 ? "#93c5fd" : "rgba(255,255,255,0.25)",
                    animation: isBumping ? "badgePop 0.3s ease" : "none",
                  }}
                >
                  <span>{conteo}</span>
                  <span className="text-xs font-normal opacity-50">/{p.qty}</span>
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold text-sm leading-tight"
                    style={{ color: isComplete ? "#4ade80" : "white" }}
                  >
                    {p.code}
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {product?.name || "Producto no identificado"}
                  </div>
                </div>

                {/* Status */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background: isComplete ? "rgba(22,163,74,0.2)" : "rgba(255,255,255,0.05)",
                  }}
                >
                  {isComplete ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={3} className="w-3 h-3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2.5} className="w-3 h-3">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}

          {/* Unknown products */}
          {state.unknownProducts.length > 0 && (
            <>
              <div className="text-xs text-amber-400 uppercase tracking-widest mt-2 mb-1 px-0.5">
                Productos ajenos al pedido
              </div>
              {state.unknownProducts.map((code) => {
                const item = state.scannedItems[code];
                const product = PRODUCT_CATALOG[code];
                return (
                  <div
                    key={code}
                    className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                    style={{
                      background: "rgba(217,119,6,0.08)",
                      border: "1px solid rgba(217,119,6,0.25)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-base"
                      style={{ background: "rgba(217,119,6,0.18)", color: "#f59e0b" }}
                    >
                      {item?.conteo ?? 0}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-amber-400">{code}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {product?.name || "Producto no identificado"}
                      </div>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR (72px) ── */}
      <div
        className="flex gap-2 px-3 flex-shrink-0"
        style={{
          height: 72,
          alignItems: "center",
          background: "rgba(20,24,50,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <button
          onClick={() => navigate("/mobile/revision")}
          className="flex-1 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{
            height: 48,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleFinalize}
          className="flex-[2] rounded-xl text-sm font-bold text-white transition-all active:scale-95"
          style={{
            height: 48,
            background: "linear-gradient(135deg,#1a2b6b 0%,#1e4fc2 100%)",
            boxShadow: "0 4px 14px rgba(30,79,194,0.35)",
          }}
        >
          Finalizar revisión
        </button>
      </div>

      <style>{`
        @keyframes badgePop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
