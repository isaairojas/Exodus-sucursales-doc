// ============================================================
// APYMSA — exportExcel
// Exporta información (tabla y/o detalle) a un archivo .xlsx real (SheetJS).
// Cada "hoja" es una pestaña del libro de Excel.
// ============================================================
import * as XLSX from 'xlsx';

export interface HojaExcel {
  nombre: string;
  filas: Record<string, string | number>[];
}

export function exportarExcel(nombreArchivo: string, hojas: HojaExcel[]): void {
  const wb = XLSX.utils.book_new();
  hojas.forEach((h, i) => {
    const data = h.filas.length ? h.filas : [{ '—': 'Sin datos' }];
    const ws = XLSX.utils.json_to_sheet(data);
    // Ancho de columnas automático (aprox. por longitud de contenido).
    const cols = Object.keys(data[0] ?? {}).map(k => ({
      wch: Math.min(48, Math.max(k.length + 2, ...data.map(r => String(r[k] ?? '').length + 2))),
    }));
    ws['!cols'] = cols;
    XLSX.utils.book_append_sheet(wb, ws, (h.nombre || `Hoja${i + 1}`).slice(0, 31));
  });
  const file = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  XLSX.writeFile(wb, file);
}
