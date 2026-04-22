/**
 * MobileAuth — Autenticación biométrica para versión móvil APYMSA
 * Estilo: fondo oscuro navy, animación de huella, avance automático
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

type AuthState = "idle" | "scanning" | "success";

export default function MobileAuth() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<AuthState>("idle");

  const handleActivate = () => {
    setState("scanning");
    setTimeout(() => {
      setState("success");
      setTimeout(() => navigate("/mobile/menu"), 1200);
    }, 2000);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(160deg, #0f1b4d 0%, #1a2b6b 60%, #0d1540 100%)", fontFamily: "'Roboto', sans-serif" }}
    >
      {/* Top branding */}
      <div className="w-full px-6 pt-10 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
        >
          A
        </div>
        <div>
          <div className="text-white font-bold text-sm">APYMSA</div>
          <div className="text-blue-300 text-xs">Autopartes y Mayoreo, S.A. de C.V.</div>
        </div>
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center gap-8 px-8">
        <div className="text-center">
          <h1 className="text-white text-3xl font-bold mb-2">Revisión de Pedidos</h1>
          <p className="text-blue-300 text-sm">Autenticación requerida para continuar</p>
        </div>

        {/* Fingerprint */}
        <div className="relative flex items-center justify-center">
          {/* Pulse rings */}
          {state === "scanning" && (
            <>
              <div className="absolute w-36 h-36 rounded-full border-2 border-cyan-400 opacity-30 animate-ping" />
              <div className="absolute w-28 h-28 rounded-full border border-cyan-400 opacity-20 animate-ping" style={{ animationDelay: "0.3s" }} />
            </>
          )}
          {state === "success" && (
            <div className="absolute w-36 h-36 rounded-full border-2 border-green-400 opacity-40 animate-ping" />
          )}

          <div
            className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500"
            style={{
              background: state === "success"
                ? "rgba(34,197,94,0.2)"
                : state === "scanning"
                ? "rgba(6,182,212,0.2)"
                : "rgba(255,255,255,0.08)",
              border: state === "success"
                ? "2px solid rgba(34,197,94,0.6)"
                : state === "scanning"
                ? "2px solid rgba(6,182,212,0.6)"
                : "2px solid rgba(255,255,255,0.15)",
              boxShadow: state === "success"
                ? "0 0 30px rgba(34,197,94,0.3)"
                : state === "scanning"
                ? "0 0 30px rgba(6,182,212,0.3)"
                : "none",
            }}
          >
            {state === "success" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2.5} className="w-12 h-12">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12" stroke={state === "scanning" ? "#06b6d4" : "rgba(255,255,255,0.6)"} strokeWidth={1.5}>
                <path d="M12 1C8.5 1 5.5 3 4 6" />
                <path d="M20 6c-1.5-3-4.5-5-8-5" />
                <path d="M4 10c0-4.4 3.6-8 8-8" />
                <path d="M20 10c0-1.3-.3-2.6-.8-3.7" />
                <path d="M8 12c0-2.2 1.8-4 4-4s4 1.8 4 4" />
                <path d="M8 16c0 1.1.4 2.1 1 2.9" />
                <path d="M12 12v4" />
                <path d="M16 14c0 3-1.3 5.5-4 7" />
                <path d="M4 14c.5 3.5 2.5 6.5 5.5 8" />
              </svg>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center h-8">
          {state === "idle" && <p className="text-blue-300 text-sm">Presione el botón para autenticarse</p>}
          {state === "scanning" && <p className="text-cyan-400 text-sm animate-pulse">Escaneando huella...</p>}
          {state === "success" && (
            <p className="text-green-400 text-sm font-semibold">✓ Identidad confirmada — Isai</p>
          )}
        </div>
      </div>

      {/* Bottom button */}
      <div className="w-full px-6 pb-12">
        <button
          onClick={handleActivate}
          disabled={state !== "idle"}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: state === "idle"
              ? "linear-gradient(135deg, #1e4fc2 0%, #1a3a8f 100%)"
              : state === "scanning"
              ? "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)"
              : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            boxShadow: "0 4px 20px rgba(30,79,194,0.5)",
          }}
        >
          {state === "idle" && "Activar lector de huella"}
          {state === "scanning" && "Verificando..."}
          {state === "success" && "Acceso concedido"}
        </button>
      </div>
    </div>
  );
}
