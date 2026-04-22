/**
 * MobileRevision — Pantalla de revisión ciega (versión móvil)
 * Lógica idéntica al escritorio: clic en fila = escaneo, clic en input = producto desconocido XX-999
 * Diseño: fondo oscuro navy, tarjetas con estado visual, botones táctiles grandes
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
  const { state, processScan, goToScreen, finalizeReview } = useApp();
  const [scanValue, setScanValue] = useState("");
  const [showDiscModal, setShowDiscModal] = useState(false);
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [lastBump, setLastBump] = useState<string | null>(null);
  const [unknownFired, setUnknownFired] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const order = state.selectedOrderId ? ORDERS_DB[state.selectedOrderId] : null;

  const refocusScanner = useCallback(() => {
    setTimeout(() => scanInputRef.current?.focus(), 80);
  }, []);

  const fireScan = useCallback(
    (code: string) => {
      processScan(code);
      setLastBump(code);
      setTimeout(() => setLastBump(null), 400);
    },
    [processScan]
  );

  const handleRowClick = (code: string) => {
    fireScan(code);
    refocusScanner();
  };

  const handleInputClick = () => {
    if (!unknownFired) {
      setUnknownFired(true);
      fireScan(UNKNOWN_CODE);
    }
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
      const diff = item.conteo - p.qty;
      if (diff !== 0 && !item.authorized) {
        discs.push({
          code: p.code,
          name: PRODUCT_CATALOG[p.code]?.name || p.code,
          req: p.qty,
          conteo: item.conteo,
          diff,
          tipo: diff > 0 ? "Sobrante" : "Faltante",
        });
      }
    });
    state.unknownProducts.forEach((code) => {
      const item = state.scannedItems[code];
      if (!item.authorized) {
        discs.push({
          code,
          name: PRODUCT_CATALOG[code]?.name || "Producto no identificado",
          req: 0,
          conteo: item.conteo,
          diff: item.conteo,
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
        <div className="text-center">
          <p className="text-white mb-4">No hay pedido seleccionado</p>
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

  const lastCode = state.lastScannedCode;
  const lastProduct = lastCode ? PRODUCT_CATALOG[lastCode] : null;
  const lastItem = lastCode ? state.scannedItems[lastCode] : null;

  // Compute progress
  let completedPartidas = 0;
  order.partidas.forEach((p) => {
    const item = state.scannedItems[p.code];
    if (item && item.conteo >= p.qty) completedPartidas++;
  });
  const totalPartidas = order.partidas.length;
  const progressPct = totalPartidas > 0 ? Math.round((completedPartidas / totalPartidas) * 100) : 0;

  return (
    <>
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "#1a1f3e", fontFamily: "'Roboto', sans-serif" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-4"
          style={{ background: "linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)" }}
        >
          <button
            onClick={() => navigate("/mobile/revision")}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="text-xs text-blue-300 uppercase tracking-widest">Revisión ciega</div>
            <h1 className="text-white font-bold text-lg leading-tight">Pedido #{order.id}</h1>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-300">Progreso</div>
            <div className="text-white font-bold text-sm">{completedPartidas}/{totalPartidas}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: progressPct === 100
                ? "linear-gradient(90deg, #16a34a, #22c55e)"
                : "linear-gradient(90deg, #1e4fc2, #06b6d4)",
            }}
          />
        </div>

        {/* Scanner input (hidden but focusable) */}
        <input
          ref={scanInputRef}
          type="text"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={handleManualScan}
          onClick={handleInputClick}
          className="opacity-0 absolute w-0 h-0"
          style={{ position: "absolute", left: -9999 }}
          autoFocus
        />

        {/* Last scanned product card */}
        <div className="px-4 pt-3 pb-2">
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-300"
            style={{
              background: lastCode
                ? lastItem && !lastItem.fromOrder
                  ? "rgba(217,119,6,0.15)"
                  : "rgba(22,163,74,0.15)"
                : "rgba(255,255,255,0.04)",
              border: lastCode
                ? lastItem && !lastItem.fromOrder
                  ? "1px solid rgba(217,119,6,0.4)"
                  : "1px solid rgba(22,163,74,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: lastCode
                  ? lastItem && !lastItem.fromOrder
                    ? "rgba(217,119,6,0.3)"
                    : "rgba(22,163,74,0.3)"
                  : "rgba(255,255,255,0.08)",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke={lastCode ? (lastItem && !lastItem.fromOrder ? "#f59e0b" : "#4ade80") : "rgba(255,255,255,0.3)"} strokeWidth={2} className="w-5 h-5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {lastCode ? (
                <>
                  <div className="font-bold text-sm" style={{ color: lastItem && !lastItem.fromOrder ? "#f59e0b" : "#4ade80" }}>
                    {lastCode}
                  </div>
                  <div className="text-xs text-gray-300 truncate">
                    {lastProduct?.name || "Producto no identificado"}
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-sm">Toca una fila para escanear</div>
              )}
            </div>
            {lastCode && lastItem && (
              <div
                className="text-lg font-black flex-shrink-0"
                style={{
                  color: lastItem && !lastItem.fromOrder ? "#f59e0b" : "#4ade80",
                  animation: lastBump === lastCode ? "badgePop 0.3s ease" : "none",
                }}
              >
                ×{lastItem.conteo}
              </div>
            )}
          </div>
        </div>

        {/* Tap to scan hint */}
        <div className="px-4 pb-2">
          <button
            onClick={() => scanInputRef.current?.click()}
            className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              background: "rgba(6,182,212,0.1)",
              border: "1px dashed rgba(6,182,212,0.4)",
              color: "#06b6d4",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <rect x="7" y="7" width="10" height="10" rx="1" />
            </svg>
            Activar escáner
          </button>
        </div>

        {/* Order partidas list */}
        <div className="flex-1 px-4 pb-4 flex flex-col gap-2 overflow-y-auto">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 px-1">
            Partidas del pedido — toca para escanear
          </div>

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
                className="w-full text-left rounded-2xl px-4 py-3 flex items-center gap-3 transition-all active:scale-95"
                style={{
                  background: isComplete
                    ? "rgba(22,163,74,0.12)"
                    : "rgba(255,255,255,0.04)",
                  border: isComplete
                    ? "1px solid rgba(22,163,74,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  transform: isBumping ? "scale(0.97)" : "scale(1)",
                }}
              >
                {/* Count badge */}
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-black text-lg"
                  style={{
                    background: isComplete
                      ? "rgba(22,163,74,0.25)"
                      : conteo > 0
                      ? "rgba(30,79,194,0.3)"
                      : "rgba(255,255,255,0.06)",
                    color: isComplete ? "#4ade80" : conteo > 0 ? "#93c5fd" : "rgba(255,255,255,0.3)",
                    animation: isBumping ? "badgePop 0.3s ease" : "none",
                  }}
                >
                  {conteo}
                  <div className="text-xs font-normal opacity-60">/{p.qty}</div>
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: isComplete ? "#4ade80" : "white" }}>
                    {p.code}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {product?.name || "Producto no identificado"}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: isComplete ? "#4ade80" : "rgba(255,255,255,0.3)" }}>
                    Req: {p.qty} unidades
                  </div>
                </div>

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {isComplete ? (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(22,163,74,0.25)" }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2.5} className="w-4 h-4">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} className="w-4 h-4">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Unknown products section */}
          {state.unknownProducts.length > 0 && (
            <>
              <div className="text-xs text-amber-400 uppercase tracking-widest mt-2 mb-1 px-1">
                Productos no pertenecientes al pedido
              </div>
              {state.unknownProducts.map((code) => {
                const item = state.scannedItems[code];
                const product = PRODUCT_CATALOG[code];
                return (
                  <div
                    key={code}
                    className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{
                      background: "rgba(217,119,6,0.1)",
                      border: "1px solid rgba(217,119,6,0.3)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-black text-lg"
                      style={{ background: "rgba(217,119,6,0.2)", color: "#f59e0b" }}
                    >
                      {item?.conteo ?? 0}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-amber-400">{code}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {product?.name || "Producto no identificado"}
                      </div>
                      <div className="text-xs mt-0.5 text-amber-500">No pertenece al pedido</div>
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(217,119,6,0.2)" }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} className="w-4 h-4">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          className="px-4 pb-8 pt-3 flex flex-col gap-2"
          style={{ background: "rgba(26,31,62,0.95)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/mobile/revision")}
              className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalize}
              className="flex-[2] py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #1a2b6b 0%, #1e4fc2 100%)",
                boxShadow: "0 4px 15px rgba(30,79,194,0.4)",
              }}
            >
              Finalizar revisión
            </button>
          </div>
        </div>
      </div>

      {/* Discrepancy modal */}
      {showDiscModal && (
        <MobileDiscrepancy
          discrepancies={discrepancies}
          onConfirm={handleConfirmDisc}
          onBack={() => {
            setShowDiscModal(false);
            refocusScanner();
          }}
        />
      )}

      <style>{`
        @keyframes badgePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
