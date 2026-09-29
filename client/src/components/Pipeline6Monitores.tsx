// ============================================================
// APYMSA — Pipeline6Monitores
// Visualiza los 6 monitores del embarque (ver docs/flujo-embarque-cambios.md §1):
//   1. Elaboración iniciado    2. Elaboración finalizado
//   3. Pesado iniciado         4. Pesado finalizado
//   5. Reparto iniciado        6. Reparto finalizado
// Recibe el índice del monitor actual (0-based, 5 = último completado).
// ============================================================

interface Props {
  monitorActual: number; // 0..5 — cuántos monitores están COMPLETADOS
  compact?: boolean;
}

const MONITORES = [
  { titulo: 'Elaboración', sub: 'iniciado',    icono: 'inventory_2' },
  { titulo: 'Elaboración', sub: 'finalizado',  icono: 'inventory' },
  { titulo: 'Pesado',      sub: 'iniciado',    icono: 'scale' },
  { titulo: 'Pesado',      sub: 'finalizado',  icono: 'balance' },
  { titulo: 'Reparto',     sub: 'iniciado',    icono: 'local_shipping' },
  { titulo: 'Reparto',     sub: 'finalizado',  icono: 'task_alt' },
] as const;

export default function Pipeline6Monitores({ monitorActual, compact = false }: Props) {
  const clamp = Math.max(0, Math.min(6, monitorActual));
  const size = compact ? 24 : 28;
  return (
    <div className="w-full flex items-center gap-1" style={{ fontFamily: 'Roboto, sans-serif' }}>
      {MONITORES.map((m, i) => {
        const completado = i < clamp;
        const actual = i === clamp;
        const color = completado ? '#16a34a' : actual ? '#1a2b6b' : '#cbd5e1';
        const bg = completado ? 'rgba(22,163,74,0.12)' : actual ? 'rgba(26,43,107,0.10)' : '#f1f5f9';
        return (
          <div key={i} className="flex items-center flex-1" title={`${m.titulo} ${m.sub}`}>
            <div className="flex flex-col items-center flex-1">
              <div
                className="rounded-full flex items-center justify-center"
                style={{ width: size, height: size, background: bg, border: `2px solid ${color}` }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: compact ? 14 : 16, color }}>
                  {completado ? 'check' : m.icono}
                </span>
              </div>
              {!compact && (
                <div className="text-center mt-1" style={{ fontSize: 10, lineHeight: 1.2, color: actual ? '#1a2b6b' : '#475569', fontWeight: actual ? 700 : 500 }}>
                  <div>{m.titulo}</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>{m.sub}</div>
                </div>
              )}
            </div>
            {i < MONITORES.length - 1 && (
              <div style={{ height: 3, flex: 1, background: i < clamp - 1 ? '#16a34a' : '#e2e8f0', margin: '0 2px', marginTop: compact ? 0 : -18 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper: mapea el status de un Shipment a un índice de monitor (0..6).
// Convención: N = número de monitores COMPLETADOS.
export function monitorDeShipmentStatus(status: string): number {
  switch (status) {
    case 'Generado':                return 2; // Elaboración terminada
    case 'Solicitado':              return 3; // Pesado iniciado (guía en trámite)
    case 'En tránsito':             return 4; // Pesado finalizado / reparto iniciado
    case 'Entregado a paquetería':  return 5; // Reparto iniciado (manual/webservice)
    case 'En reparto':              return 5; // legacy — mismo punto
    case 'Entregado':               return 6; // Reparto finalizado
    default:                        return 0;
  }
}
