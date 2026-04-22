/**
 * MobileMenu — Pantalla principal del menú de la app móvil APYMSA
 * Estilo: fondo gris oscuro, tarjetas azul navy, botón rojo Salir
 * Identidad industrial consistente con el sistema de tareas existente
 */
import { useLocation } from "wouter";

const menuItems = [
  {
    id: "revision",
    label: "Revisión de pedidos surtidos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    route: "/mobile/revision",
    badge: null,
  },
  {
    id: "tareas",
    label: "Tareas",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    route: null,
    badge: null,
  },
  {
    id: "consulta",
    label: "Consulta de tareas cargadas",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    route: null,
    badge: null,
  },
  {
    id: "descarga",
    label: "Descarga de mercancía",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    route: null,
    badge: null,
  },
  {
    id: "evidencias",
    label: "Evidencias de envíos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    route: null,
    badge: 5,
  },
];

export default function MobileMenu() {
  const [, navigate] = useLocation();

  const handleItem = (item: typeof menuItems[0]) => {
    if (item.route) {
      navigate(item.route);
    }
    // Other items are placeholders — no action
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#2a2a2e", fontFamily: "'Roboto', sans-serif" }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
          <span className="text-xs text-gray-400 uppercase tracking-widest">APYMSA</span>
        </div>
        <h1 className="text-white text-3xl font-bold">Menú</h1>
      </div>

      {/* Menu Items */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItem(item)}
            className="w-full text-left rounded-2xl px-5 py-5 flex items-center gap-4 transition-all active:scale-95"
            style={{
              background: item.id === "revision"
                ? "linear-gradient(135deg, #1a3a8f 0%, #1e4fc2 100%)"
                : "linear-gradient(135deg, #1e2d6b 0%, #243580 100%)",
              border: item.id === "revision" ? "1px solid rgba(100,160,255,0.3)" : "1px solid rgba(255,255,255,0.05)",
              boxShadow: item.id === "revision"
                ? "0 4px 20px rgba(30,79,194,0.4)"
                : "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <div className="text-white opacity-80 flex-shrink-0">{item.icon}</div>
            <span className="text-white font-semibold text-lg leading-tight flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                +{item.badge}
              </span>
            )}
            {item.id === "revision" && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5 opacity-60 flex-shrink-0">
                <path d="M9 18l6-6-6-6" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Salir button */}
      <div className="px-4 pb-8">
        <button
          className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #e53e3e 0%, #c53030 100%)", boxShadow: "0 4px 15px rgba(229,62,62,0.4)" }}
          onClick={() => navigate("/mobile")}
        >
          Salir
        </button>
      </div>
    </div>
  );
}
