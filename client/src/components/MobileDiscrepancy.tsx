/**
 * MobileDiscrepancy — Modal de resolución de diferencias (versión móvil)
 * Misma lógica que ModalDiscrepancy pero con UI optimizada para pantallas táctiles
 *
 * Sobrante    → re-escanear el producto para confirmar retiro
 * Faltante    → autorizar con motivo (negado) O retirar pieza del conteo
 * Incorrecto  → re-escanear para confirmar retiro físico
 */
import { useState, useRef, useEffect } from "react";
import { DiscrepancyResolution } from "@/contexts/AppContext";

export interface Discrepancy {
  code: string;
  name: string;
  req: number;
  conteo: number;
  diff: number;
  tipo: "Sobrante" | "Faltante" | "Producto incorrecto";
}

interface RowState {
  resolved: boolean;
  authorized: boolean;
  motivo: string;
  removedPiece: boolean;
  rescanValue: string;
  rescanConfirmed: boolean;
}

const MOTIVOS = ["Etiqueta errónea", "Error de surtido", "Merma", "Otro"];

interface Props {
  discrepancies: Discrepancy[];
  onConfirm: (resolutions: DiscrepancyResolution[]) => void;
  onBack: () => void;
}

export default function MobileDiscrepancy({ discrepancies, onConfirm, onBack }: Props) {
  const initRows = (): Record<string, RowState> => {
    const r: Record<string, RowState> = {};
    discrepancies.forEach((d) => {
      r[d.code] = {
        resolved: false,
        authorized: false,
        motivo: "",
        removedPiece: false,
        rescanValue: "",
        rescanConfirmed: false,
      };
    });
    return r;
  };

  const [rows, setRows] = useState<Record<string, RowState>>(initRows);
  const firstInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const update = (code: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [code]: { ...prev[code], ...patch } }));

  // ── SOBRANTE ──
  const handleSobranteRescan = (d: Discrepancy, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const val = rows[d.code].rescanValue.trim().toUpperCase();
    if (val === d.code) {
      update(d.code, { rescanConfirmed: true, rescanValue: "", resolved: true });
    } else if (val) {
      update(d.code, { rescanValue: "" });
    }
  };

  // ── FALTANTE: authorize (denied) ──
  const handleFaltanteAuthorize = (d: Discrepancy) => {
    if (!rows[d.code].motivo) return;
    update(d.code, { authorized: true, resolved: true });
  };

  // ── FALTANTE: remove piece from count ──
  const handleFaltanteRemove = (d: Discrepancy) => {
    update(d.code, { removedPiece: true, resolved: true });
  };

  // ── INCORRECTO ──
  const handleIncorrectoRescan = (d: Discrepancy, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const val = rows[d.code].rescanValue.trim().toUpperCase();
    if (val === d.code) {
      update(d.code, { rescanConfirmed: true, rescanValue: "", resolved: true });
    } else if (val) {
      update(d.code, { rescanValue: "" });
    }
  };

  const allResolved = discrepancies.every((d) => rows[d.code]?.resolved);

  const handleConfirm = () => {
    if (!allResolved) return;
    const resolutions: DiscrepancyResolution[] = discrepancies.map((d) => {
      const row = rows[d.code];
      return {
        code: d.code,
        tipo: d.tipo,
        motivo: row.motivo,
        removedFromCount: row.removedPiece,
        denied: row.authorized && !row.removedPiece,
      };
    });
    onConfirm(resolutions);
  };

  const typeColor = (tipo: string) => {
    if (tipo === "Sobrante") return { bg: "rgba(30,79,194,0.15)", border: "rgba(30,79,194,0.4)", text: "#93c5fd", badge: "rgba(30,79,194,0.3)" };
    if (tipo === "Faltante") return { bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.35)", text: "#f87171", badge: "rgba(220,38,38,0.25)" };
    return { bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.35)", text: "#fbbf24", badge: "rgba(217,119,6,0.25)" };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#1a1f3e", fontFamily: "'Roboto', sans-serif" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #1a2b6b 0%, #1e3a8a 100%)" }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="text-xs text-blue-300 uppercase tracking-widest">Revisión</div>
          <h1 className="text-white font-bold text-lg leading-tight">Diferencias detectadas</h1>
        </div>
        <div
          className="px-3 py-1 rounded-xl text-xs font-bold"
          style={{ background: "rgba(220,38,38,0.2)", color: "#f87171", border: "1px solid rgba(220,38,38,0.3)" }}
        >
          {discrepancies.length} diferencia{discrepancies.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Discrepancy cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {discrepancies.map((d, idx) => {
          const row = rows[d.code];
          const colors = typeColor(d.tipo);

          return (
            <div
              key={d.code}
              className="rounded-2xl overflow-hidden"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            >
              {/* Card header */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-black text-white text-lg">{d.code}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{d.name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-lg"
                      style={{ background: colors.badge, color: colors.text }}
                    >
                      {d.tipo}
                    </span>
                    {row.resolved && (
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-lg"
                        style={{ background: "rgba(22,163,74,0.2)", color: "#4ade80", border: "1px solid rgba(22,163,74,0.3)" }}
                      >
                        ✓ Resuelto
                      </span>
                    )}
                  </div>
                </div>

                {/* Diff info */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Requerido</div>
                    <div className="font-bold text-white">{d.req}</div>
                  </div>
                  <div className="text-gray-600">→</div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Contado</div>
                    <div className="font-bold text-white">{d.conteo}</div>
                  </div>
                  <div className="text-gray-600">→</div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Diferencia</div>
                    <div className="font-bold" style={{ color: colors.text }}>
                      {d.diff > 0 ? "+" : ""}{d.diff}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution area */}
              {!row.resolved && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="pt-3">
                    {/* SOBRANTE */}
                    {d.tipo === "Sobrante" && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-400">
                          Retire el excedente y re-escanee el producto para confirmar.
                        </p>
                        <input
                          ref={idx === 0 ? firstInputRef : undefined}
                          type="text"
                          placeholder={`Escanear ${d.code}...`}
                          value={row.rescanValue}
                          onChange={(e) => update(d.code, { rescanValue: e.target.value })}
                          onKeyDown={(e) => handleSobranteRescan(d, e)}
                          className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        />
                      </div>
                    )}

                    {/* FALTANTE */}
                    {d.tipo === "Faltante" && (
                      <div className="flex flex-col gap-3">
                        <p className="text-xs text-gray-400">
                          Seleccione una acción para resolver el faltante.
                        </p>
                        {/* Motivo selector */}
                        <select
                          value={row.motivo}
                          onChange={(e) => update(d.code, { motivo: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: row.motivo ? "white" : "rgba(255,255,255,0.4)",
                          }}
                        >
                          <option value="" style={{ background: "#1a1f3e" }}>— Seleccionar motivo —</option>
                          {MOTIVOS.map((m) => (
                            <option key={m} value={m} style={{ background: "#1a1f3e" }}>{m}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleFaltanteAuthorize(d)}
                            disabled={!row.motivo}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
                            style={{
                              background: "rgba(220,38,38,0.2)",
                              border: "1px solid rgba(220,38,38,0.4)",
                              color: "#f87171",
                            }}
                          >
                            Autorizar faltante
                          </button>
                          <button
                            onClick={() => handleFaltanteRemove(d)}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                            style={{
                              background: "rgba(22,163,74,0.15)",
                              border: "1px solid rgba(22,163,74,0.35)",
                              color: "#4ade80",
                            }}
                          >
                            Retirar pieza
                          </button>
                        </div>
                      </div>
                    )}

                    {/* PRODUCTO INCORRECTO */}
                    {d.tipo === "Producto incorrecto" && (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-400">
                          Retire el producto físicamente y re-escanee para confirmar.
                        </p>
                        <input
                          ref={idx === 0 ? firstInputRef : undefined}
                          type="text"
                          placeholder={`Escanear ${d.code}...`}
                          value={row.rescanValue}
                          onChange={(e) => update(d.code, { rescanValue: e.target.value })}
                          onKeyDown={(e) => handleIncorrectoRescan(d, e)}
                          className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resolved state */}
              {row.resolved && (
                <div
                  className="px-4 pb-4 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <div className="pt-3 text-sm" style={{ color: "#4ade80" }}>
                    {d.tipo === "Sobrante" && "✓ Sobrante confirmado — se ajustará el conteo"}
                    {d.tipo === "Faltante" && row.authorized && `✓ Faltante autorizado — motivo: ${row.motivo}`}
                    {d.tipo === "Faltante" && row.removedPiece && "✓ Pieza retirada del conteo"}
                    {d.tipo === "Producto incorrecto" && "✓ Producto retirado físicamente"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom confirm button */}
      <div
        className="px-4 pb-8 pt-3 flex-shrink-0"
        style={{ background: "rgba(26,31,62,0.95)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={handleConfirm}
          disabled={!allResolved}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: allResolved
              ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
              : "rgba(255,255,255,0.1)",
            boxShadow: allResolved ? "0 4px 15px rgba(22,163,74,0.4)" : "none",
          }}
        >
          {allResolved ? "Confirmar y continuar" : `Pendiente: ${discrepancies.filter((d) => !rows[d.code]?.resolved).length} diferencia(s)`}
        </button>
      </div>
    </div>
  );
}
