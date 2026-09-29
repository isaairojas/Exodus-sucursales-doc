// ============================================================
// APYMSA — exportEmbarquesCSV
// Descarga un CSV con los embarques filtrados. Compatible con Excel
// (BOM UTF-8 + ; como separador para locales es-MX).
// ============================================================
import { EmbarqueTraspaso, horasSinMovimiento } from './data';

const COLUMNAS = [
  'ID', 'Fecha creación', 'Sucursal destino', 'Paquetería', 'Tipo',
  'Status', 'Traspasos', 'Costo (sin IVA)', 'IVA 16%', 'Total',
  'Guía', 'Entregado a paq.', 'Reparto finalizado', 'Sin movimiento (h)',
  'Observaciones',
];

function esc(v: string | number | undefined | null): string {
  const s = v == null ? '' : String(v);
  if (/["\;\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function exportarEmbarquesCSV(embarques: EmbarqueTraspaso[], nombreArchivo = 'embarques.csv') {
  const rows: string[] = [COLUMNAS.map(esc).join(';')];
  embarques.forEach(e => {
    const costo = e.paqueteriaCosto ?? 0;
    const iva = costo * 0.16;
    const total = costo + iva;
    rows.push([
      e.id,
      e.fecha,
      e.sucursalDestino,
      e.paqueteriaSeleccionada ?? e.paqueteria,
      // tipo se lee de la paquetería configurada
      '',
      e.status,
      e.traspasos.join('|'),
      costo.toFixed(2),
      iva.toFixed(2),
      total.toFixed(2),
      e.guiaId ?? '',
      e.fechaEntregaAPaqueteria ?? '',
      e.fechaRepartoFinalizado ?? '',
      Math.round(horasSinMovimiento(e)).toString(),
      e.observaciones ?? '',
    ].map(esc).join(';'));
  });
  const bom = '﻿';
  const blob = new Blob([bom + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
