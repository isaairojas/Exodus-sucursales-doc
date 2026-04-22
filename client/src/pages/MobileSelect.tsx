/**
 * MobileSelect — Selección de pedido para revisión (versión móvil)
 * Lista de pedidos en estado "Surtido" con buscador
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { ORDERS_DB, Order } from "@/lib/data";
import { useApp } from "@/contexts/AppContext";

export default function MobileSelect() {
  const [, navigate] = useLocation();
  const { state, loadOrder } = useApp();
  const allOrders: Order[] = Object.values(ORDERS_DB);
  const [search, setSearch] = useState("");

  const availableOrders = allOrders.filter(
    (o) => o.status === "Surtido" && !state.completedOrderIds.includes(o.id)
  ).filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (orderId: string) => {
    loadOrder(orderId);
    navigate("/mobile/revisar");
  };

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
        <button
          onClick={() => navigate("/mobile/menu")}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="text-xs text-blue-300 uppercase tracking-widest">APYMSA</div>
          <h1 className="text-white font-bold text-lg leading-tight">Revisión de pedidos</h1>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          I
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} className="w-5 h-5 flex-shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar pedido o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: "rgba(30,79,194,0.2)", border: "1px solid rgba(30,79,194,0.3)" }}
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-cyan-300 text-xs font-medium">
            {availableOrders.length} pedido{availableOrders.length !== 1 ? "s" : ""} pendiente{availableOrders.length !== 1 ? "s" : ""} de revisión
          </span>
        </div>
      </div>

      {/* Order list */}
      <div className="flex-1 px-4 pb-6 flex flex-col gap-3 overflow-y-auto">
        {availableOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} className="w-8 h-8">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm text-center">
              {search ? "No se encontraron pedidos" : "No hay pedidos pendientes"}
            </p>
          </div>
        ) : (
          availableOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => handleSelect(order.id)}
              className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #1e2d6b 0%, #243580 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}
            >
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-xs text-blue-300 uppercase tracking-widest mb-1">Pedido</div>
                    <div className="text-white font-black text-2xl">#{order.id}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-lg"
                      style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
                    >
                      {order.status}
                    </span>
                    <span className="text-gray-400 text-xs">{order.origen}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-white text-sm font-medium">{order.cliente}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-gray-400 text-xs">Partidas</div>
                      <div className="text-white font-bold text-lg">{order.partidas.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 text-xs">Unidades</div>
                      <div className="text-white font-bold text-lg">
                        {order.partidas.reduce((s: number, i: { qty: number }) => s + i.qty, 0)}
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(30,79,194,0.5)", border: "1px solid rgba(100,160,255,0.3)" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Bottom accent bar */}
              <div className="h-1" style={{ background: "linear-gradient(90deg, #1e4fc2, #06b6d4)" }} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
