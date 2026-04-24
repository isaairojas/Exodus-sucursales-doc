/**
 * MobileAuth — Acceso móvil sin huella
 */
import { useLocation } from "wouter";

export default function MobileAuth() {
  const [, navigate] = useLocation();

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
          <p className="text-blue-300 text-sm">Acceso directo al menú</p>
        </div>
      </div>

      {/* Bottom button */}
      <div className="w-full px-6 pb-12">
        <button
          onClick={() => navigate("/mobile/menu")}
          className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #1e4fc2 0%, #1a3a8f 100%)",
            boxShadow: "0 4px 20px rgba(30,79,194,0.5)",
          }}
        >
          Entrar al menú
        </button>
      </div>
    </div>
  );
}
