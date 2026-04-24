import { useLocation } from "wouter";
import { useState } from "react";

type ModuleCard = {
  id: string;
  name: string;
  description: string;
  icon: "logistica" | "almacen" | "inventarios";
  available: boolean;
  route?: string;
};

function ModuleIcon({ icon }: { icon: ModuleCard["icon"] }) {
  if (icon === "logistica") {
    return (
      <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="1" y="3" width="14" height="11" rx="1.2" />
        <path d="M15 8h4l3 3v3h-7V8z" />
        <circle cx="5.5" cy="17.5" r="2.5" />
        <circle cx="18.5" cy="17.5" r="2.5" />
      </svg>
    );
  }
  if (icon === "almacen") {
    return (
      <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
        <path d="M9 22V12h6v10" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="4" y="3" width="16" height="5" rx="1" />
      <rect x="4" y="10" width="16" height="5" rx="1" />
      <rect x="4" y="17" width="16" height="4" rx="1" />
    </svg>
  );
}

export default function ModulesHome() {
  const [, navigate] = useLocation();
  const [isLeaving, setIsLeaving] = useState(false);

  const modules: ModuleCard[] = [
    {
      id: "logistica",
      name: "Logistica",
      description: "Gestión de pedidos, embarques y seguimiento de entregas.",
      icon: "logistica",
      available: true,
      route: "/logistica",
    },
    {
      id: "almacen",
      name: "Almacen",
      description: "Recepción, acomodo y salida de mercancía por sucursal.",
      icon: "almacen",
      available: false,
    },
    {
      id: "inventarios",
      name: "Inventarios",
      description: "Control de existencias, ajustes y conteos cíclicos.",
      icon: "inventarios",
      available: false,
    },
  ];

  const handleModuleSelect = (module: ModuleCard) => {
    if (!module.available || !module.route || isLeaving) return;
    setIsLeaving(true);
    window.setTimeout(() => navigate(module.route as string), 320);
  };

  return (
    <div
      className="min-h-screen w-full px-6 py-8 md:px-10 md:py-10"
      style={{
        background:
          "radial-gradient(circle at 8% 12%, rgba(255,255,255,0.12) 0%, transparent 26%), radial-gradient(circle at 92% 85%, rgba(255,255,255,0.08) 0%, transparent 24%), linear-gradient(155deg, #16265f 0%, #1a2b6b 48%, #21367d 100%)",
        fontFamily: "Roboto, sans-serif",
      }}
    >
      <div
        className="max-w-6xl mx-auto"
        style={{
          animation: isLeaving ? "homeLiftOut 320ms ease-in forwards" : "homeDropIn 420ms ease-out",
          pointerEvents: isLeaving ? "none" : "auto",
        }}
      >
        <div className="mb-8 md:mb-10">
          <img
            src="/apymsa-logo.png"
            alt="APYMSA"
            className="w-full max-w-[420px] md:max-w-[520px] h-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-white tracking-tight">Exodus Sucursales</h1>
          <p className="mt-2 text-sm md:text-base max-w-2xl" style={{ color: "rgba(255,255,255,0.84)" }}>
            Selecciona el módulo que deseas abrir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => handleModuleSelect(module)}
              disabled={!module.available}
              className="text-left rounded-xl p-5 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                boxShadow: "0 10px 22px rgba(8,17,43,0.2)",
                cursor: module.available ? "pointer" : "not-allowed",
                opacity: module.available ? 1 : 0.72,
              }}
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}>
                <ModuleIcon icon={module.icon} />
              </div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-white text-xl font-semibold">{module.name}</h2>
                {!module.available && (
                  <span
                    className="text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                    style={{
                      color: "rgba(255,255,255,0.95)",
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.22)",
                    }}
                  >
                    Próximamente
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>
                {module.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
