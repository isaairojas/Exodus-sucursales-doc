// ============================================================
// APYMSA — printEmbarque
// Abre una ventana lista para imprimir con el resumen del embarque.
// F77: fallback a descarga HTML si el navegador bloquea window.open.
// ============================================================
import { EmbarqueTraspaso } from './data';

export function imprimirEmbarque(emb: EmbarqueTraspaso, origen: string) {
  // F123 — Confirmación si el embarque no tiene documentación (imprimirá sin cajas).
  if (!emb.documentacion || emb.documentacion.length === 0) {
    const ok = window.confirm(`El embarque ${emb.id} aún no tiene documentación de cajas. ¿Imprimir de todos modos?`);
    if (!ok) return;
  }
  const html = renderHtml(emb, origen);
  const w = window.open('', '_blank', 'width=800,height=1000');
  if (!w) {
    // F77 — Fallback en móviles / bloqueadores: descarga el HTML.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `embarque-${emb.id}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.write(html);
  w.document.close();
}

function renderHtml(emb: EmbarqueTraspaso, origen: string): string {
  const costo = emb.paqueteriaCosto ?? 0;
  const iva = costo * 0.16;
  const total = costo + iva;
  const desgloseRows = (emb.paqueteriaDesglose ?? []).map(d =>
    `<tr><td>${escapeHtml(d.concepto)}</td><td style="text-align:right">$${d.monto.toFixed(2)}</td></tr>`
  ).join('');
  const cajasRows = (emb.documentacion ?? []).flatMap(d => {
    if (d.tipoEnvio === 'Caja') {
      return d.cajas.map((c, i) => `
        <tr>
          <td>${escapeHtml(d.pedidoId)}-C${i + 1}</td>
          <td>${c.peso.toFixed(2)} kg</td>
          <td>${c.largo}×${c.ancho}×${c.alto} cm</td>
          <td>${(c.pesoFacturable ?? c.peso).toFixed(2)} kg</td>
        </tr>`);
    } else if (d.tarima) {
      const p = d.tarima.conocePesoTotal ? d.tarima.pesoTotal ?? 0
        : (d.tarima.cajasConteo ?? []).reduce((s, x) => s + x.peso, 0);
      return [`
        <tr>
          <td>${escapeHtml(d.pedidoId)}-Tarima</td>
          <td>${p.toFixed(2)} kg</td>
          <td>${d.tarima.largo}×${d.tarima.ancho}×${d.tarima.alto} cm</td>
          <td>—</td>
        </tr>`];
    }
    return [];
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Embarque ${escapeHtml(emb.id)} — APYMSA</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Roboto', Arial, sans-serif; color: #0f172a; padding: 24px; margin: 0; }
      h1 { color: #1a2b6b; margin: 0 0 6px; font-size: 22px; }
      .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
      .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
      .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; }
      .val { font-size: 14px; font-weight: 700; color: #0f172a; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
      th { background: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase; }
      .total { font-weight: 700; color: #1a2b6b; }
      .muted { color: #64748b; }
      .guia { font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #0891b2; }
      @media print { body { padding: 0; } .no-print { display: none; } }
    </style>
  </head><body>
    <h1>APYMSA · Embarque ${escapeHtml(emb.id)}</h1>
    <div class="sub">Impreso ${new Date().toLocaleString('es-MX')} · Origen ${escapeHtml(origen)} → Destino ${escapeHtml(emb.sucursalDestino)}</div>

    <div class="card">
      <div class="grid">
        <div><div class="lbl">Paquetería</div><div class="val">${escapeHtml(emb.paqueteriaSeleccionada ?? emb.paqueteria)}</div></div>
        <div><div class="lbl">Status</div><div class="val">${escapeHtml(emb.status)}</div></div>
        <div><div class="lbl">Guía</div><div class="guia">${escapeHtml(emb.guiaId ?? '— pendiente —')}</div></div>
        <div><div class="lbl">Fecha creación</div><div class="val">${escapeHtml(emb.fecha)}</div></div>
        <div><div class="lbl">Entregado a paq.</div><div class="val">${escapeHtml(emb.fechaEntregaAPaqueteria ?? '—')}</div></div>
        <div><div class="lbl">Traspasos</div><div class="val">${emb.traspasos.length}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="lbl" style="margin-bottom:6px">Desglose de costos (sin IVA)</div>
      <table>
        ${desgloseRows || `<tr><td class="muted">Sin desglose disponible</td><td style="text-align:right">$${costo.toFixed(2)}</td></tr>`}
        <tr><td class="muted">IVA 16%</td><td style="text-align:right" class="muted">$${iva.toFixed(2)}</td></tr>
        <tr class="total"><td>Total con IVA</td><td style="text-align:right">$${total.toFixed(2)} MXN</td></tr>
      </table>
    </div>

    ${cajasRows ? `
    <div class="card">
      <div class="lbl" style="margin-bottom:6px">Cajas / tarimas documentadas</div>
      <table>
        <thead><tr><th>ID</th><th>Peso real</th><th>Dimensiones</th><th>Peso facturable</th></tr></thead>
        <tbody>${cajasRows}</tbody>
      </table>
    </div>` : ''}

    <div class="no-print" style="text-align:center; margin-top:20px">
      <button onclick="window.print()" style="padding:10px 20px; background:#1a2b6b; color:white; border:0; border-radius:6px; font-weight:600; cursor:pointer">Imprimir</button>
    </div>
    <script>window.onload = () => setTimeout(() => window.print(), 250);<\/script>
  </body></html>`;
}

function escapeHtml(s: string | undefined | null): string {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}
