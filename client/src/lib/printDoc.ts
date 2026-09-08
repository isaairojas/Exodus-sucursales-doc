// ============================================================
// APYMSA — printDoc
// Simulación de impresión: abre una ventana con un documento imprimible y lanza
// el diálogo de impresión (el usuario puede "Guardar como PDF"). El contenido
// depende de la ETAPA del traspaso o del estado del pedido.
// ============================================================
import {
  TraspasoPeticion, Order, Shipment, PRODUCT_CATALOG,
  etapaTraspaso, perspectivaTraspaso, formatFechaCorta,
} from './data';

const NAVY = '#1a2b6b';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function abrirImpresion(titulo: string, cuerpo: string): void {
  const w = window.open('', '_blank', 'width=820,height=940');
  if (!w) { alert('Permite las ventanas emergentes para imprimir el documento.'); return; }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a2e; margin: 0; padding: 28px 32px; }
    .hd { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid ${NAVY}; padding-bottom:12px; margin-bottom:16px; }
    .brand { font-size:22px; font-weight:800; color:${NAVY}; letter-spacing:0.5px; }
    .doc { font-size:13px; color:#555; text-align:right; }
    .doc b { color:${NAVY}; font-size:15px; display:block; }
    h1 { font-size:16px; color:${NAVY}; margin:0 0 4px; }
    .meta { display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; font-size:12px; margin:14px 0 18px; }
    .meta div span { color:#888; }
    .meta div b { color:#1a1a2e; }
    table { width:100%; border-collapse:collapse; font-size:12px; margin-top:8px; }
    th { background:${NAVY}; color:#fff; text-align:left; padding:7px 9px; font-size:11px; text-transform:uppercase; letter-spacing:0.4px; }
    td { padding:7px 9px; border-bottom:1px solid #e5e7eb; }
    tfoot td { font-weight:700; border-top:2px solid ${NAVY}; }
    .tag { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; background:#eef1f8; color:${NAVY}; }
    .note { margin-top:18px; font-size:11px; color:#777; border-top:1px dashed #ccc; padding-top:10px; }
    .firmas { display:flex; gap:40px; margin-top:48px; font-size:11px; color:#555; }
    .firmas div { flex:1; text-align:center; border-top:1px solid #333; padding-top:6px; }
    @media print { body { padding:0; } @page { margin:16mm; } }
  </style></head><body>${cuerpo}
  <script>window.onload=function(){setTimeout(function(){window.print();},250);};</script>
  </body></html>`);
  w.document.close();
}

const filasPiezas = (peticion: TraspasoPeticion, mostrarSurtida: boolean) => `
  <table>
    <thead><tr><th>Código</th><th>Descripción</th><th>Solicitado</th>${mostrarSurtida ? '<th>Surtido</th>' : ''}</tr></thead>
    <tbody>
      ${peticion.piezas.map(p => `<tr>
        <td><b>${esc(p.code)}</b></td>
        <td>${esc(PRODUCT_CATALOG[p.code]?.name ?? p.code)}</td>
        <td>${p.qtySolicitada}</td>
        ${mostrarSurtida ? `<td>${p.qtySurtida}</td>` : ''}
      </tr>`).join('')}
    </tbody>
    <tfoot><tr><td colspan="2">Total piezas</td><td>${peticion.piezas.reduce((s, p) => s + p.qtySolicitada, 0)}</td>${mostrarSurtida ? `<td>${peticion.piezas.reduce((s, p) => s + p.qtySurtida, 0)}</td>` : ''}</tr></tfoot>
  </table>`;

// Documento por ETAPA para un traspaso, visto desde una sucursal.
export function imprimirTraspaso(peticion: TraspasoPeticion, sucursalActual: string): void {
  const per = perspectivaTraspaso(peticion, sucursalActual);
  const etapa = etapaTraspaso(peticion.status);
  const tipoDoc = ({
    'Sin surtir': 'Papeleta de surtido',
    'Surtido': 'Orden de revisión / empaque',
    'Revisado': 'Orden de embarque',
    'Embarcado': 'Guía de traspaso',
    'Enviado / En camino': 'Guía de traspaso (en tránsito)',
    'Recibido': 'Acuse de recepción',
    'Cancelado': 'Traspaso cancelado',
  } as Record<string, string>)[etapa] ?? 'Documento de traspaso';

  const mostrarSurtida = etapa !== 'Sin surtir';
  const embarque = ['Embarcado', 'Enviado / En camino', 'Recibido'].includes(etapa);

  const cuerpo = `
    <div class="hd">
      <div class="brand">APYMSA</div>
      <div class="doc"><b>${esc(tipoDoc)}</b>Traspaso ${esc(peticion.id)} · Solicitud ${esc(peticion.solicitudId)}</div>
    </div>
    <h1>${esc(tipoDoc)}</h1>
    <div class="meta">
      <div><span>Origen (surte/envía): </span><b>${esc(peticion.sucursalOrigen ?? per.contraparte)}</b></div>
      <div><span>Destino (recibe): </span><b>${esc(peticion.sucursalDestino ?? '—')}</b></div>
      <div><span>Tipo: </span><b>${esc(peticion.motivoEnvioCedis ?? (peticion.subtipoCedis ?? peticion.categoria))}</b></div>
      <div><span>Etapa: </span><span class="tag">${esc(etapa)}</span></div>
      <div><span>Pedido cliente: </span><b>${esc(peticion.pedidoOrigen || 'Sin pedido')}</b></div>
      <div><span>No. papeleta: </span><b>${esc(peticion.noPapeleta)}</b></div>
      <div><span>Fecha traspaso: </span><b>${esc(formatFechaCorta(peticion.fechaCreacion))}</b></div>
      ${embarque ? `<div><span>Embarque: </span><b>${esc(peticion.embarqueId ?? '—')} · ${esc(peticion.metodoEnvio ?? '')}</b></div>` : ''}
      ${embarque && peticion.fechaArribo ? `<div><span>Arribo estimado: </span><b>${esc(formatFechaCorta(peticion.fechaArribo))}</b></div>` : ''}
    </div>
    ${filasPiezas(peticion, mostrarSurtida)}
    ${peticion.observaciones ? `<p class="note"><b>Observaciones:</b> ${esc(peticion.observaciones)}</p>` : ''}
    <div class="firmas"><div>Surtió</div><div>Revisó</div><div>Recibió</div></div>
  `;
  abrirImpresion(`${tipoDoc} · ${peticion.id}`, cuerpo);
}

// Documento por ESTADO para un pedido de cliente (incluye guía si tiene embarque).
export function imprimirPedido(order: Order, embarque?: Shipment | null): void {
  const documentado = ['Documentado', 'Enviado', 'Facturado'].includes(order.status);
  const tipoDoc = order.status === 'Creado' ? 'Orden de surtido del pedido'
    : order.status === 'Surtido' ? 'Orden de revisión del pedido'
    : documentado && embarque ? 'Guía de envío del pedido'
    : 'Detalle del pedido';

  const cuerpo = `
    <div class="hd">
      <div class="brand">APYMSA</div>
      <div class="doc"><b>${esc(tipoDoc)}</b>Pedido ${esc(order.id)}</div>
    </div>
    <h1>${esc(tipoDoc)}</h1>
    <div class="meta">
      <div><span>Cliente: </span><b>${esc(order.cliente)} (${esc(order.clienteId)})</b></div>
      <div><span>Estatus: </span><span class="tag">${esc(order.status)}</span></div>
      <div><span>Origen: </span><b>${esc(order.origen)}</b></div>
      <div><span>Fecha captura: </span><b>${esc(order.fechaCaptura)}</b></div>
      <div><span>Tipo de envío: </span><b>${esc(order.tipoEnvio ?? '—')}</b></div>
      <div><span>Vendedor: </span><b>${esc(order.vendedor)}</b></div>
      ${embarque ? `<div><span>Embarque: </span><b>#${esc(embarque.id)}</b></div>` : ''}
      ${embarque ? `<div><span>Paquetería: </span><b>${esc(embarque.paqueteria)}</b></div>` : ''}
      ${embarque ? `<div><span>No. de guía: </span><b>${esc(embarque.guia ?? '—')}</b></div>` : ''}
    </div>
    <table>
      <thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th></tr></thead>
      <tbody>
        ${order.partidas.map(p => `<tr><td><b>${esc(p.code)}</b></td><td>${esc(PRODUCT_CATALOG[p.code]?.name ?? p.code)}</td><td>${p.qty}</td></tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="2">Total piezas</td><td>${order.partidas.reduce((s, p) => s + p.qty, 0)}</td></tr></tfoot>
    </table>
    ${order.observaciones ? `<p class="note"><b>Observaciones:</b> ${esc(order.observaciones)}</p>` : ''}
    <div class="firmas"><div>Preparó</div><div>Revisó</div><div>Entregó / Recibió</div></div>
  `;
  abrirImpresion(`${tipoDoc} · ${order.id}`, cuerpo);
}
