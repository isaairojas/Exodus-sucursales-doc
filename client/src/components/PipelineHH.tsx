// ============================================================
// PipelineHH — Timeline compacto del flujo del traspaso, para usar en las
// ventanas HH (surtido y revisión). Muestra las etapas (Pendiente, Surtido,
// Revisado, Enviado, Entregado/Recibido) con:
//   • gris (pendientes futuras)
//   • navy sólido (etapa actual — resaltada)
//   • verde con check (ya cumplidas)
// El paso "actual" corresponde a la actividad que está ocurriendo en el modal
// (p.ej. en ModalSurtidoHH se resalta "Surtido" aunque el status del registro
// aún sea "Pendiente"; en ModalRevisionHH se resalta "Revisado" aunque el
// status sea "Surtido"). El caller decide qué etapa marcar como actual.
// ============================================================
import type { TraspasoStatus } from '@/lib/data';

interface Props {
  /** Etapa "actual" en la que el usuario está trabajando (a resaltar). */
  status: TraspasoStatus;
  /** Etapas visibles en el orden del pipeline. */
  pasos: TraspasoStatus[];
}

const NAVY = '#1B3892';
const GRIS = '#cbd5e1';
const VERDE = '#16a34a';

export default function PipelineHH({ status, pasos }: Props) {
  const idxActual = pasos.indexOf(status);
  return (
    <div className="px-3 py-2.5 flex items-center gap-0" style={{ background: '#fff', borderBottom: '1px solid #eef0f4', flexShrink: 0 }}>
      {pasos.map((step, i) => {
        const cumplido = idxActual >= 0 && i < idxActual;
        const actual = i === idxActual;
        const color = actual ? NAVY : cumplido ? VERDE : GRIS;
        const labelColor = actual ? NAVY : cumplido ? VERDE : '#9ca3af';
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className="rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ width: 22, height: 22, background: color, color: '#fff', flexShrink: 0 }}
              >
                {cumplido ? (
                  <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check</span>
                ) : (
                  String(i + 1)
                )}
              </div>
              <span className="text-[9px] font-semibold text-center leading-tight mt-0.5" style={{ color: labelColor }}>
                {step}
              </span>
            </div>
            {i < pasos.length - 1 && (
              <div className="h-0.5 flex-1" style={{ background: cumplido ? VERDE : '#e5e7eb', minWidth: 10, marginBottom: 12 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
