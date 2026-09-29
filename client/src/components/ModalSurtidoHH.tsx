// ============================================================
// APYMSA — ModalSurtidoHH
// Simulación simplificada de la Hand Held (HH) para SURTIR o REVISAR un traspaso.
// Basado en el prototipo Revision-HH-v2, reducido a un modal:
//   • Se surte/revisa dando clic en "Surtir/Revisar" por producto.
//   • Puede ser PARCIAL (stepper por producto).
//   • El botón "Negar traspaso" (3 puntos) es para TODO (no surtir nada).
//   • Al finalizar con faltante se genera una petición automática (recálculo SMC).
// Mismo comportamiento en surtido y revisión (solo flujo de traspasos).
// Design: HH APYMSA (navy #1B3892)
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TraspasoPeticion, TraspasoPiezaDetalle, PRODUCT_CATALOG, EXISTENCIA_POR_SUCURSAL, MotivoRechazoTipo, MOTIVOS_RECHAZO, TRASPASO_STATUS_POR_TIPO, ubicacionDe, esCorporativo } from '@/lib/data';
import PipelineHH from './PipelineHH';

type Modo = 'surtido' | 'revision';

interface Props {
  peticion: TraspasoPeticion;
  modo?: Modo;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  // Se dispara SOLO cuando el surtido/revisión se finaliza con éxito (no en Negar).
  // Sirve para encadenar el flujo continuo (surtido → revisión → embarque).
  onFinalizado?: () => void;
}

const NAVY = '#1B3892';

export default function ModalSurtidoHH({ peticion, modo = 'surtido', onClose, showToast, onFinalizado }: Props) {
  const { finalizarSurtidoTraspaso, finalizarRevisionTraspaso, negarTraspaso, sucursalActual } = useApp();
  const stock = EXISTENCIA_POR_SUCURSAL[sucursalActual] ?? {};
  const esRevision = modo === 'revision';
  const verboMayus = esRevision ? 'Revisar' : 'Surtir';
  const tituloPantalla = esRevision ? 'Revisión de mercancía' : 'Surtido de órdenes';
  const accionFinal = esRevision ? 'Finalizar revisión' : 'Finalizar surtido';
  // ── Diferenciación Rechazado vs Cancelado ──
  // RECHAZABLE (donante rechaza → resultado 'rechazada' → solicitante puede
  // REASIGNAR): traspasos que van a la HH del donante y llevan pedido:
  //   • Automático SMC (siempre lleva pedido)
  //   • Manual CON pedido (entre sucursales)
  // NO rechazable (solo se puede CANCELAR → resultado 'cancelada' → no reasignable):
  //   • Manual SIN pedido
  //   • Envíos a CEDIS (devolución / ajuste de inventario)
  const esEnvioACedis = peticion.sucursalDestino === 'CEDIS' || !!peticion.motivoEnvioCedis;
  const esRechazable = !esEnvioACedis && (
    peticion.categoria === 'Automático' || (peticion.categoria === 'Manual' && !!peticion.pedidoOrigen)
  );
  const menuLabel = esRechazable ? 'Rechazar traspaso' : 'Cancelar traspaso';
  const confirmTitulo = esRechazable ? 'Rechazar traspaso' : 'Cancelar traspaso';

  // En revisión se parte de lo ya surtido; en surtido se parte de 0.
  const [qtyByCode, setQtyByCode] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    peticion.piezas.forEach(p => { init[p.code] = esRevision ? p.qtySurtida : 0; });
    return init;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmFaltante, setConfirmFaltante] = useState(false);
  const [confirmNegar, setConfirmNegar] = useState(false);
  // Finalización automática al 100% (aparece solo cuando todo está surtido).
  const [confirmAuto, setConfirmAuto] = useState(false);
  // Bloqueo corporativo con pendientes: pregunta "¿Sacar de la ronda?".
  const [bloqueoCorporativo, setBloqueoCorporativo] = useState(false);
  // Modo del modal "Rechazar traspaso": cuando es 'auto', se dispara porque
  // TODAS las partidas fueron negadas en el detalle (no se muestra selector
  // de motivo — el usuario ya dio motivo por producto).
  const [rechazoAuto, setRechazoAuto] = useState(false);
  // Nota que escribe el donante al finalizar surtido/revisión parcial.
  const [notaSurtido, setNotaSurtido] = useState('');
  // Motivo tipificado + comentario libre (solo si es "Otro") para el rechazo.
  const [motivoRechazo, setMotivoRechazo] = useState<MotivoRechazoTipo>('Producto dañado');
  const [motivoOtro, setMotivoOtro] = useState('');
  // ── Escaneo HH ──
  const [scanValue, setScanValue] = useState('');
  const scanRef = useRef<HTMLInputElement | null>(null);
  // Set de códigos que ya fueron NEGADOS en esta sesión; el parser los rechaza
  // (mensaje HH: "Producto negado — no se puede volver a agregar unidades").
  const [negadosSet, setNegadosSet] = useState<Set<string>>(new Set());
  // Motivo capturado por producto al negar (para persistir en piezas.motivoNegacion
  // y no perder trazabilidad al finalizar).
  const [negadosMotivos, setNegadosMotivos] = useState<Record<string, string>>({});
  // Modal "Ingresa la cantidad surtida en contenedor" — solo para códigos de
  // 7 dígitos (misceláneos / graneles).
  const [simpleCode, setSimpleCode] = useState<string | null>(null);
  const [simpleQty, setSimpleQty] = useState<number>(0);
  // Detalle del producto (click sobre fila).
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [detailQty, setDetailQty] = useState<number>(0);
  // Lightbox de imagen (dentro del detalle).
  const [imgOpen, setImgOpen] = useState(false);
  // Trazabilidad de origen del registro por producto:
  //  • escaneadosSet: códigos ingresados vía escáner (o modal simplificado tras
  //    escanear el 7-díg). Sirve como bandera "confirmado por escaneo".
  //  • manualesSet:  códigos cuyo registro final vino del stepper del detalle
  //    SIN haber escaneado (surtido manual). Ambos sets pueden coexistir; la
  //    UI muestra un badge "Manual" cuando aplica.
  const [escaneadosSet, setEscaneadosSet] = useState<Set<string>>(new Set());
  const [manualesSet, setManualesSet] = useState<Set<string>>(new Set());
  // Motivo de negado por producto.
  const [motivoNegOpen, setMotivoNegOpen] = useState(false);
  const [motivoNegSel, setMotivoNegSel] = useState<'Sin existencia' | MotivoRechazoTipo>('Sin existencia');
  const [motivoNegOtro, setMotivoNegOtro] = useState('');
  const esPedidoCorporativo = !!peticion.pedidoOrigen && esCorporativo(peticion.pedidoOrigen);

  // Beep de error + toast rojo (mismo patrón que ModalRevisionHH).
  const beepError = () => {
    try {
      const AC: typeof AudioContext | undefined =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square'; o.frequency.value = 220; g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 180);
    } catch { /* silencio si el entorno no tiene audio */ }
  };
  const toastError = (m: string) => { beepError(); showToast(m, 'error'); };

  const solicitadaDe = (code: string) => peticion.piezas.find(p => p.code === code)?.qtySolicitada ?? 0;
  const existenciaDe = (code: string) => stock[code] ?? 0;
  const esExcepcion = (code: string) => !!PRODUCT_CATALOG[code]?.esExcepcion;

  // ── Parser de etiqueta HH — mismas reglas que revisión, adaptadas a surtido.
  //  • 7 dígitos → misceláneo / granel → abre modal "cantidad manual".
  //  • 18 dígitos → cantidad automática (posiciones 8-14).
  //  • 51-99 dígitos → etiqueta única (cantidad en posiciones 8-14 igual).
  //  • Cualquier otro → toast rojo "Código inválido — formato no reconocido".
  const parsearEtiqueta = (raw: string): { code: string; qty: number | null } | null => {
    const s = raw.trim();
    if (!s || !/^\d+$/.test(s)) return null;
    if (s.length === 7)  return { code: s, qty: null };
    if (s.length === 18) return { code: s.slice(0, 7), qty: parseInt(s.slice(7, 13), 10) || 0 };
    if (s.length >= 51 && s.length <= 99) return { code: s.slice(0, 7), qty: parseInt(s.slice(7, 13), 10) || 0 };
    return null;
  };

  // Aplica una cantidad a una pieza validando: no exceder solicitada, no cero,
  // no exceder existencia. Devuelve true si se aplicó; false si se bloqueó.
  const aplicarCantidad = (code: string, cantidad: number, opts: { modo: 'suma' | 'set' }): boolean => {
    const sol = solicitadaDe(code);
    const ex = existenciaDe(code);
    const actual = qtyByCode[code] ?? 0;
    const objetivo = opts.modo === 'suma' ? actual + cantidad : cantidad;
    if (cantidad === 0 || objetivo <= 0) {
      toastError('Cantidad inválida — No se puede surtir con cantidad cero.');
      return false;
    }
    if (objetivo > sol) {
      toastError('Cantidad inválida — La cantidad supera la solicitada.');
      return false;
    }
    if (objetivo > ex) {
      toastError('Cantidad inválida — La cantidad supera la existencia actual.');
      return false;
    }
    setQtyByCode(prev => ({ ...prev, [code]: objetivo }));
    return true;
  };

  const procesarEscaneo = (raw: string) => {
    const parsed = parsearEtiqueta(raw);
    setScanValue('');
    if (!parsed) {
      toastError('Código inválido — Formato de código escaneado no válido.');
      return;
    }
    const { code, qty } = parsed;
    // Validación 1 — Producto ya negado en esta sesión.
    if (negadosSet.has(code)) {
      toastError('Producto negado — El código escaneado fue negado y no puede volver a agregarse.');
      return;
    }
    // Producto que no pertenece al traspaso.
    if (!peticion.piezas.some(p => p.code === code)) {
      toastError(`Producto incorrecto — El código ${code} no pertenece a este traspaso.`);
      return;
    }
    if (qty === null) {
      // 7 dígitos → misceláneo / granel: pedir cantidad manual.
      if (!esExcepcion(code)) {
        toastError('Ingreso manual no permitido — Escanea la etiqueta de 18 dígitos del producto.');
        return;
      }
      setSimpleQty(0);
      setSimpleCode(code);
      return;
    }
    // 18 / 51-99 dígitos → suma directa (con validaciones).
    if (aplicarCantidad(code, qty, { modo: 'suma' })) {
      setEscaneadosSet(prev => { const s = new Set(prev); s.add(code); return s; });
      const nuevo = Math.min(solicitadaDe(code), (qtyByCode[code] ?? 0) + qty);
      const sol = solicitadaDe(code);
      if (nuevo >= sol) showToast(`${code}: completado (${sol}/${sol}).`, 'success');
      else showToast(`${code}: ${nuevo}/${sol}.`, 'info');
    }
  };

  const confirmarSimplificado = () => {
    if (!simpleCode) return;
    if (aplicarCantidad(simpleCode, simpleQty, { modo: 'set' })) {
      setEscaneadosSet(prev => { const s = new Set(prev); s.add(simpleCode); return s; });
      setSimpleCode(null);
    }
  };

  // Detalle del producto (click sobre fila): precarga stepper con la cantidad
  // actual y lo bloquea si el código no ha sido escaneado en esta sesión.
  const abrirDetalle = (code: string) => {
    setDetailCode(code);
    setDetailQty(qtyByCode[code] ?? 0);
    setMotivoNegSel('Sin existencia');
    setMotivoNegOtro('');
    setMotivoNegOpen(false);
  };
  const cerrarDetalle = () => { setDetailCode(null); setMotivoNegOpen(false); setImgOpen(false); };
  const confirmarDetalle = () => {
    if (!detailCode) return;
    // Set directo (no suma) porque el stepper representa la cantidad total.
    if (aplicarCantidad(detailCode, detailQty, { modo: 'set' })) {
      // Si el producto NO se escaneó en esta sesión y aquí se confirmó una
      // cantidad > 0, se registra como surtido MANUAL para trazabilidad.
      if (!escaneadosSet.has(detailCode) && detailQty > 0) {
        setManualesSet(prev => { const s = new Set(prev); s.add(detailCode); return s; });
      }
      cerrarDetalle();
    }
  };
  // Regla HH: "Negar producto" solo si la cantidad surtida es 0. Además, los
  // pedidos corporativos NO permiten negar (obligan a surtir completo).
  const puedeNegarProducto = !!detailCode && (qtyByCode[detailCode] ?? 0) === 0 && !esPedidoCorporativo;
  const puedeConfirmarNegado = motivoNegSel !== 'Otro' || motivoNegOtro.trim().length > 0;
  const confirmarNegadoProducto = () => {
    if (!detailCode || !puedeConfirmarNegado) return;
    const motivo = motivoNegSel === 'Otro' ? `Otro — ${motivoNegOtro.trim()}` : motivoNegSel;
    setNegadosSet(prev => { const s = new Set(prev); s.add(detailCode); return s; });
    setNegadosMotivos(prev => ({ ...prev, [detailCode]: motivo }));
    // Resetea el selector para el próximo producto.
    setMotivoNegSel('Sin existencia');
    setMotivoNegOtro('');
    showToast(`${detailCode}: negado — ${motivo}.`, 'warning');
    cerrarDetalle();
  };

  // Foco persistente en el campo de escaneo (excepto cuando hay un overlay).
  useEffect(() => {
    if (menuOpen || confirmFaltante || confirmNegar || simpleCode || detailCode || imgOpen || motivoNegOpen) return;
    scanRef.current?.focus();
  }, [menuOpen, confirmFaltante, confirmNegar, simpleCode, detailCode, imgOpen, motivoNegOpen]);

  const estadoLinea = (code: string): 'completado' | 'parcial' | 'pendiente' => {
    const q = qtyByCode[code];
    if (q <= 0) return 'pendiente';
    if (q >= solicitadaDe(code)) return 'completado';
    return 'parcial';
  };

  const contadores = useMemo(() => {
    const c = { completado: 0, parcial: 0, pendiente: 0 };
    peticion.piezas.forEach(p => { c[estadoLinea(p.code)]++; });
    return c;
  }, [qtyByCode, peticion.piezas]);

  // Reordenamiento HH: parciales (en progreso) arriba → pendientes alfabético
  // → negados → completados abajo. Al llegar un producto al 100% se mueve al
  // fondo automáticamente; los negados quedan justo antes de los completados.
  const piezasOrdenadas = useMemo(() => {
    const orden = { parcial: 0, pendiente: 1, negado: 2, completado: 3 } as const;
    const bucket = (code: string): keyof typeof orden => {
      if (negadosSet.has(code)) return 'negado';
      return estadoLinea(code);
    };
    return [...peticion.piezas].sort((a, b) => {
      const oa = orden[bucket(a.code)];
      const ob = orden[bucket(b.code)];
      if (oa !== ob) return oa - ob;
      return a.code.localeCompare(b.code);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peticion.piezas, qtyByCode, negadosSet]);

  const setQty = (code: string, n: number) => {
    const tope = Math.min(solicitadaDe(code), existenciaDe(code));
    setQtyByCode(prev => ({ ...prev, [code]: Math.max(0, Math.min(n, tope)) }));
  };
  const surtirTodo = (code: string) => setQty(code, solicitadaDe(code));

  const hayFaltante = peticion.piezas.some(p => qtyByCode[p.code] < solicitadaDe(p.code));
  const totalSurtido = peticion.piezas.reduce((s, p) => s + (qtyByCode[p.code] ?? 0), 0);
  // Regla: se puede finalizar cuando haya al menos UNA DECISIÓN sobre el
  // traspaso — sea que se surtió algo (parcial o completo) o que algún
  // producto fue negado. Incluso si existe un único código y se niega, se
  // permite finalizar (el resultado será rechazo/cancelación total).
  const puedeFinalizar = totalSurtido > 0 || negadosSet.size > 0;

  const construirPiezas = (): TraspasoPiezaDetalle[] =>
    peticion.piezas.map(p => ({
      code: p.code,
      qtySolicitada: p.qtySolicitada,
      qtySurtida: qtyByCode[p.code],
      // Persiste el motivo individual del negado — antes se perdía.
      ...(negadosSet.has(p.code) ? { motivoNegacion: negadosMotivos[p.code] ?? 'Negado sin motivo' } : {}),
    }));

  const ejecutarFinalizar = () => {
    const piezas = construirPiezas();
    const nota = notaSurtido.trim() || undefined;
    if (esRevision) finalizarRevisionTraspaso(peticion.id, piezas, nota);
    else finalizarSurtidoTraspaso(peticion.id, piezas, nota);
    if (hayFaltante) {
      showToast(`${esRevision ? 'Revisión' : 'Surtido'} parcial registrado. La sucursal solicitante decidirá si reasigna o genera una nueva solicitud por el restante.`, 'warning');
    } else {
      showToast(`Traspaso ${peticion.id} ${esRevision ? 'revisado' : 'surtido'} completo.`, 'success');
    }
    onClose();
    onFinalizado?.();
  };

  const handleFinalizar = () => {
    if (!puedeFinalizar) {
      showToast(`No puedes finalizar ${esRevision ? 'la revisión' : 'el surtido'} en 0. ${esRevision ? 'Revisa' : 'Surte'} al menos una pieza o usa "Negar traspaso".`, 'warning');
      return;
    }
    // Regla nueva: si TODAS las partidas fueron negadas y no se surtió nada,
    // se considera rechazo total → abre el modal "Rechazar traspaso" en modo
    // automático (sin selector de motivo, motivo ya dado por producto).
    const todasNegadas = peticion.piezas.every(p => negadosSet.has(p.code));
    if (todasNegadas && totalSurtido === 0) {
      setRechazoAuto(true);
      setConfirmNegar(true);
      return;
    }
    // Regla HH pedido corporativo: NO permite finalizar con pendientes.
    if (hayFaltante && esPedidoCorporativo) { setBloqueoCorporativo(true); return; }
    if (hayFaltante) { setConfirmFaltante(true); return; }
    ejecutarFinalizar();
  };

  // Finalización AUTOMÁTICA cuando el surtido llega al 100% de cada pieza y
  // no queda nada por escanear. Dispara el modal "¿Deseas finalizar la ronda?".
  useEffect(() => {
    if (confirmAuto || confirmFaltante || confirmNegar || detailCode || simpleCode || motivoNegOpen) return;
    if (!puedeFinalizar || hayFaltante) return;
    setConfirmAuto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtyByCode]);

  // Motivo definitivo que se guarda en el traspaso: "Otro" concatena el comentario libre.
  const motivoFinal = () => {
    if (motivoRechazo === 'Otro') {
      const c = motivoOtro.trim();
      return c ? `Otro — ${c}` : 'Otro';
    }
    return motivoRechazo as string;
  };
  const puedeConfirmarRechazo = motivoRechazo !== 'Otro' || motivoOtro.trim().length > 0;

  const ejecutarNegar = () => {
    // Modo AUTO (todas las partidas negadas en el detalle): el motivo es la
    // suma consolidada de los negados individuales — no se pide selector.
    // El flag esRechazo respeta la regla de tipo (esRechazable) para no
    // convertir una "cancelación" en rechazo reasignable indebidamente.
    if (rechazoAuto) {
      const motivo = 'Rechazo total — todas las partidas negadas por producto';
      negarTraspaso(peticion.id, motivo, esRechazable);
      showToast(
        esRechazable
          ? 'Traspaso rechazado. La sucursal solicitante podrá reasignarlo desde "Por recibir".'
          : 'Traspaso cancelado. La petición se cerró sin opción de reasignación.',
        'warning',
      );
      onClose();
      return;
    }
    if (!puedeConfirmarRechazo) return;
    negarTraspaso(peticion.id, motivoFinal(), esRechazable);
    showToast(
      esEnvioACedis
        ? `Traspaso ${peticion.id} cancelado. Ya no será enviado a CEDIS.`
        : esRechazable
          ? 'Traspaso rechazado. La sucursal solicitante podrá reasignarlo desde "Por recibir".'
          : 'Traspaso cancelado. La petición se cerró sin opción de reasignación.',
      'warning',
    );
    onClose();
  };

  const pill = (estado: ReturnType<typeof estadoLinea>) => {
    const map = {
      completado: { t: 'Completado', bg: 'rgba(46,125,50,0.12)', c: '#2e7d32' },
      parcial: { t: 'Parcial', bg: 'rgba(27,56,146,0.1)', c: NAVY },
      pendiente: { t: esRevision ? 'Sin revisar' : 'Pendiente', bg: 'rgba(249,168,37,0.15)', c: '#b7791f' },
    }[estado];
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: map.bg, color: map.c }}>{map.t}</span>;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', animation: 'screenFadeIn 0.2s ease' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col bg-white overflow-hidden" style={{ width: 420, maxWidth: '96vw', height: '86vh', maxHeight: 760, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}>

        {/* Header HH */}
        <div className="flex items-center gap-2 px-4" style={{ background: NAVY, height: 52, flexShrink: 0 }}>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: '#fff' }} title="Cerrar">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#fff', margin: '0 auto' }}>{esRevision ? 'fact_check' : 'assignment'}</span>
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: '#fff' }} title="Opciones">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 20, minWidth: 260 }}>
                {/* Finalizar surtido — atajo desde el menú (equivalente al footer). */}
                <button
                  onClick={() => { setMenuOpen(false); handleFinalizar(); }}
                  className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-gray-50"
                  style={{ color: NAVY, borderBottom: '1px solid #f0f0f0' }}
                >
                  {accionFinal}
                </button>
                {/* Rechazar/Cancelar — OCULTO para pedidos corporativos (no
                    permiten rechazo; obligan a surtir completo o sacar de la
                    ronda desde el bloqueo de finalización). */}
                {!esPedidoCorporativo && (
                  <>
                    <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                      {esEnvioACedis
                        ? 'Cancela el envío completo a CEDIS'
                        : esRechazable
                          ? 'Rechaza el traspaso (el solicitante podrá reasignarlo)'
                          : 'Cancela el traspaso (no reasignable)'}
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmNegar(true); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-gray-50"
                      style={{ color: '#e53935' }}
                      title={
                        'IMPORTANTE: surte a conciencia. La cantidad SURTIDA es la que se podrá revisar (puede ser MENOR a lo solicitado). ' +
                        (esRechazable
                          ? 'Después de finalizar el surtido YA NO PODRÁS RECHAZAR el traspaso.'
                          : 'Después de finalizar el surtido YA NO PODRÁS CANCELAR el traspaso.')
                      }
                    >
                      {menuLabel}
                    </button>
                    {/* Aviso permanente dentro del menú (además del tooltip). */}
                    <div className="px-4 py-2 text-[10px] leading-snug border-t" style={{ color: '#b45309', background: 'rgba(217,119,6,0.06)', borderColor: '#f0f0f0' }}>
                      <span className="font-bold flex items-center gap-1 mb-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>info</span>
                        Solo durante el surtido
                      </span>
                      Surte a conciencia: la cantidad surtida = la que se podrá revisar (puede ser menor a lo solicitado).
                      Después de finalizar el surtido ya no podrás {esRechazable ? 'rechazar' : 'cancelar'} el traspaso.
                    </div>
                  </>
                )}
                {esPedidoCorporativo && (
                  <div className="px-4 py-2 text-[10px] leading-snug border-t" style={{ color: '#b45309', background: 'rgba(217,119,6,0.06)', borderColor: '#f0f0f0' }}>
                    <span className="font-bold flex items-center gap-1 mb-0.5">
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>info</span>
                      Pedido corporativo
                    </span>
                    Este pedido requiere surtido completo. No se pueden negar productos ni rechazar el traspaso; si no puedes surtirlo, sácalo de la ronda desde "Finalizar".
                  </div>
                )}
                <button onClick={() => setMenuOpen(false)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#6b7280', borderTop: '1px solid #f0f0f0' }}>
                  Cerrar menú
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Título */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid #eef0f4', flexShrink: 0 }}>
          <span className="text-sm font-extrabold" style={{ color: '#1a1a2e' }}>{tituloPantalla}</span>
          <span className="text-xs font-semibold" style={{ color: NAVY }}>Traspaso {peticion.id}</span>
        </div>

        {/* Pipeline (timeline) — muestra dónde está esta petición dentro del flujo. */}
        <PipelineHH status={esRevision ? 'Surtido' : peticion.status} pasos={TRASPASO_STATUS_POR_TIPO[peticion.tipo]} />


        {/* Avance */}
        <div className="grid grid-cols-3 gap-1 px-3 py-2.5" style={{ background: '#f6f7fb', flexShrink: 0 }}>
          {([['completado', 'Completado', '#2e7d32'], ['parcial', 'Parcial', NAVY], ['pendiente', esRevision ? 'Sin revisar' : 'Pendientes', '#f9a825']] as const).map(([k, label, color]) => (
            <div key={k} className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-extrabold" style={{ color: '#1a1a2e' }}>{contadores[k]}</span>
              <span className="text-[10px] font-medium text-center" style={{ color }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Lista de artículos — solo lectura, click abre el detalle.
            El stepper y el botón "Surtir" individual se removieron: el
            registro de cantidad se hace ÚNICAMENTE por escaneo (18/51-99) o
            desde el detalle del producto (7 díg. y misceláneos). */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ background: '#fafbfc' }}>
          {piezasOrdenadas.map(p => {
            const estado = estadoLinea(p.code);
            const sol = solicitadaDe(p.code);
            const ex = existenciaDe(p.code);
            const topeExistencia = ex < sol;
            const q = qtyByCode[p.code];
            const negado = negadosSet.has(p.code);
            return (
              <div
                key={p.code}
                onClick={() => abrirDetalle(p.code)}
                className="rounded-xl p-3 cursor-pointer transition-shadow hover:shadow-md"
                style={{ background: '#fff', border: `1.5px solid ${negado ? 'rgba(229,57,53,0.35)' : estado === 'pendiente' ? '#eef0f4' : estado === 'completado' ? 'rgba(46,125,50,0.35)' : 'rgba(27,56,146,0.35)'}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold" style={{ color: NAVY }}>{p.code}</div>
                    <div className="text-xs truncate" style={{ color: '#555' }}>{PRODUCT_CATALOG[p.code]?.name ?? p.code}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Badge "Manual" — registro sin escaneo (traceability). */}
                    {manualesSet.has(p.code) && !negado && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: 'rgba(217,119,6,0.12)', color: '#b45309', border: '1px solid rgba(217,119,6,0.35)' }}
                        title="Este surtido se confirmó de forma manual desde el detalle (sin escaneo)."
                      >
                        Manual
                      </span>
                    )}
                    {escaneadosSet.has(p.code) && !negado && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: 'rgba(37,99,235,0.10)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.30)' }}
                        title="Este producto se registró mediante escaneo."
                      >
                        Escaneo
                      </span>
                    )}
                    {negado ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: 'rgba(229,57,53,0.10)', color: '#e53935' }}>Negado</span>
                    ) : pill(estado)}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: '#6b7280' }}>
                  <span>Solicitado: <strong style={{ color: '#1a1a2e' }}>{sol}</strong></span>
                  <span title={`Existencia en ${sucursalActual}`}>Existencia: <strong style={{ color: topeExistencia ? '#e53935' : '#2e7d32' }}>{ex}</strong></span>
                  <span className="ml-auto text-[11px] font-bold" style={{ color: NAVY }}>{q}/{sol}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Campo de escaneo fijo — botón de teclado a la IZQUIERDA (estilo HH) */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderTop: '1px solid #eef0f4', background: '#fff', flexShrink: 0 }}>
          <button
            onClick={() => scanRef.current?.focus()}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-white flex-shrink-0"
            style={{ background: NAVY }}
            title="Ingreso manual con teclado"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>keyboard</span>
          </button>
          <input
            ref={scanRef}
            type="text"
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') procesarEscaneo(scanValue); }}
            placeholder="Escanea o teclea…"
            className="flex-1 text-sm rounded-lg border px-3 py-2"
            style={{ borderColor: '#d7dbe6', height: 40 }}
            autoFocus
          />
        </div>

        {/* Footer — mensaje "no puedes finalizar en 0" ahora vive como tooltip
            (title) del botón. Copy HH: si no hay nada que finalizar, orienta a
            escanear la mercancía existente y explica que para rechazar la
            solicitud hay que usar el menú ⋮ de esta ventana. */}
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid #eef0f4' }}>
          <button
            onClick={handleFinalizar}
            disabled={!puedeFinalizar}
            title={!puedeFinalizar
              ? 'Imposible finalizar el surtido — escanea únicamente la mercancía existente. Si quieres rechazar esta solicitud, hazlo desde el menú de esta ventana (⋮).'
              : undefined}
            className="w-full h-11 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2"
            style={{ background: puedeFinalizar ? NAVY : '#9ca3af', cursor: puedeFinalizar ? 'pointer' : 'not-allowed', letterSpacing: 0.3 }}
          >
            {accionFinal}
            {!puedeFinalizar && (
              <span className="material-symbols-outlined" style={{ fontSize: 16, opacity: 0.85 }} title="¿Por qué no puedo finalizar?">info</span>
            )}
          </button>
        </div>

        {/* Confirmar finalización con faltantes — separa PARCIALES (surtido
            incompleto sin motivo) de NEGADOS (con motivo capturado en el
            detalle) para no confundir al usuario. */}
        {confirmFaltante && (() => {
          const parciales = peticion.piezas
            .filter(p => !negadosSet.has(p.code) && qtyByCode[p.code] < solicitadaDe(p.code))
            .map(p => ({ code: p.code, name: PRODUCT_CATALOG[p.code]?.name ?? p.code, sol: p.qtySolicitada, sur: qtyByCode[p.code] }));
          const negados = peticion.piezas
            .filter(p => negadosSet.has(p.code))
            .map(p => ({ code: p.code, name: PRODUCT_CATALOG[p.code]?.name ?? p.code, sol: p.qtySolicitada, motivo: negadosMotivos[p.code] ?? 'Sin motivo' }));
          const hayParciales = parciales.length > 0;
          const hayNegados = negados.length > 0;
          const tituloModal = hayParciales && hayNegados
            ? 'Finalización con faltantes y negados'
            : hayNegados
              ? 'Finalización con productos negados'
              : 'Surtido parcial';
          return (
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 380, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="flex flex-col items-center gap-3 pt-6 px-5">
                  <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(27,56,146,0.12)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 28, color: NAVY }}>splitscreen</span>
                  </div>
                  <div className="text-sm font-extrabold text-center leading-snug" style={{ color: '#1a1a2e' }}>
                    {tituloModal}
                  </div>
                </div>

                {/* Sección PARCIALES (sin motivo — surtido incompleto). */}
                {hayParciales && (
                  <div className="px-5 mt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: NAVY }}>
                      Parciales ({parciales.length})
                    </div>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #eef0f4' }}>
                      <div className="grid grid-cols-[1fr_54px_54px] px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#f6f7fb', color: '#6b7280' }}>
                        <span>Artículo</span>
                        <span className="text-center">Sol.</span>
                        <span className="text-center">Surt.</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {parciales.map(p => (
                          <div key={p.code} className="grid grid-cols-[1fr_54px_54px] px-3 py-2 text-xs" style={{ borderTop: '1px solid #f0f0f0' }}>
                            <div className="min-w-0">
                              <div className="font-semibold truncate" style={{ color: NAVY }}>{p.code}</div>
                              <div className="text-[10px] truncate" style={{ color: '#6b7280' }}>{p.name}</div>
                            </div>
                            <span className="text-center font-semibold self-center" style={{ color: '#1a1a2e' }}>{p.sol}</span>
                            <span className="text-center font-bold self-center" style={{ color: NAVY }}>{p.sur}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sección NEGADOS (con motivo capturado por producto). */}
                {hayNegados && (
                  <div className="px-5 mt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#e53935' }}>
                      Negados con motivo ({negados.length})
                    </div>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(229,57,53,0.20)' }}>
                      <div className="grid grid-cols-[1fr_54px] px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(229,57,53,0.06)', color: '#dc2626' }}>
                        <span>Artículo · Motivo</span>
                        <span className="text-center">Sol.</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {negados.map(p => (
                          <div key={p.code} className="grid grid-cols-[1fr_54px] px-3 py-2 text-xs" style={{ borderTop: '1px solid #fdecea' }}>
                            <div className="min-w-0">
                              <div className="font-semibold truncate" style={{ color: '#e53935' }}>{p.code}</div>
                              <div className="text-[10px] truncate" style={{ color: '#9a3412' }}>{p.motivo}</div>
                            </div>
                            <span className="text-center font-semibold self-center" style={{ color: '#1a1a2e' }}>{p.sol}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Nota global opcional para el solicitante. */}
                <div className="px-5 mt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>Nota general (opcional)</label>
                  <textarea
                    value={notaSurtido}
                    onChange={e => setNotaSurtido(e.target.value)}
                    placeholder={`Nota para la sucursal solicitante…`}
                    rows={2}
                    className="w-full text-xs rounded-lg px-3 py-2 mt-1 resize-none"
                    style={{ border: '1px solid #d7dbe6', background: '#fafbfc', fontFamily: 'Roboto, sans-serif' }}
                  />
                </div>
                <p className="text-[11px] mt-2 px-5 text-center" style={{ color: '#6b7280' }}>
                  {hayNegados && hayParciales
                    ? 'Los negados llevan motivo por producto; los parciales quedan sin motivo.'
                    : hayNegados
                      ? 'Cada negado conserva su motivo capturado en el detalle.'
                      : 'Solo se registrarán los artículos surtidos.'}
                  {' '}¿Deseas continuar?
                </p>
                <div className="flex gap-2 px-5 py-5 mt-2">
                  <button onClick={() => setConfirmFaltante(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                  <button onClick={() => { setConfirmFaltante(false); ejecutarFinalizar(); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: NAVY }}>Continuar</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Finalización AUTOMÁTICA al 100% — HH: "Has surtido el total de
            productos solicitados ¿Deseas finalizar la ronda?" */}
        {confirmAuto && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 30 }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex flex-col items-center gap-3 pt-6 px-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(22,163,74,0.14)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#16a34a' }}>check_circle</span>
                </div>
                <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>{accionFinal}</div>
              </div>
              <p className="text-xs mt-3 px-6 text-center" style={{ color: '#555' }}>
                Haz surtido el total de productos solicitados. ¿Deseas finalizar la ronda?
              </p>
              <div className="flex gap-2 px-6 py-5 mt-2">
                <button onClick={() => setConfirmAuto(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#e53935' }}>Cancelar</button>
                <button onClick={() => { setConfirmAuto(false); ejecutarFinalizar(); }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#16a34a' }}>Finalizar</button>
              </div>
            </div>
          </div>
        )}

        {/* Bloqueo CORPORATIVO — con pendientes, no permite finalizar parcial.
            Ofrece "sacar el pedido de la ronda" (equivale a rechazar/cancelar). */}
        {bloqueoCorporativo && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)', zIndex: 30 }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 380, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex flex-col items-center gap-3 pt-6 px-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(229,57,53,0.12)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#e53935' }}>block</span>
                </div>
                <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>No es posible finalizar este pedido</div>
              </div>
              <p className="text-xs mt-3 px-6 text-center leading-relaxed" style={{ color: '#555' }}>
                Este es un <strong>pedido corporativo</strong> que requiere surtido completo. Actualmente hay productos sin surtir, por lo que no puede finalizarse.
                <br /><br />
                Aparta la mercancía ya surtida y repórtala para su validación. <strong>¿Deseas sacar el pedido de la ronda?</strong>
              </p>
              <div className="flex gap-2 px-6 py-5 mt-2">
                <button onClick={() => setBloqueoCorporativo(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#e53935' }}>No</button>
                <button
                  onClick={() => { setBloqueoCorporativo(false); negarTraspaso(peticion.id, 'Pedido corporativo sacado de la ronda (surtido incompleto)', false); showToast(`Pedido ${peticion.pedidoOrigen ?? peticion.id} sacado de la ronda.`, 'warning'); onClose(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: '#16a34a' }}
                >Sí, sacar de la ronda</button>
              </div>
            </div>
          </div>
        )}

        {/* Detalle del producto — spec HH: imagen, cajas navy con ubicación
            (si aplica), existencia, solicitado, stepper (bloqueado hasta que
            el código se haya escaneado), botones Aceptar y Negar producto. */}
        {detailCode && (() => {
          const p = peticion.piezas.find(x => x.code === detailCode)!;
          const prod = PRODUCT_CATALOG[detailCode];
          const sol = solicitadaDe(detailCode);
          const ex = existenciaDe(detailCode);
          const ubi = ubicacionDe(sucursalActual, detailCode);
          const yaEscaneado = escaneadosSet.has(detailCode);
          const tope = Math.min(sol, ex);
          const Box = ({ label, value, valueStyle }: { label: string; value: React.ReactNode; valueStyle?: React.CSSProperties }) => (
            <div className="flex items-stretch overflow-hidden" style={{ border: '1.5px solid ' + NAVY, borderRadius: 6 }}>
              <div className="px-3 py-1.5 text-[11px] font-bold text-white flex items-center" style={{ background: NAVY }}>{label}</div>
              <div className="flex-1 px-3 py-1.5 text-sm font-bold bg-white flex items-center justify-center" style={valueStyle}>{value}</div>
            </div>
          );
          return (
            <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) cerrarDetalle(); }}>
              <div className="flex flex-col bg-white overflow-hidden" style={{ width: 380, maxWidth: '96vw', maxHeight: '94vh', borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="flex items-center px-4" style={{ background: NAVY, height: 48, flexShrink: 0 }}>
                  <button onClick={cerrarDetalle} className="text-white" title="Regresar">
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
                  </button>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'rgba(255,255,255,0.35)', margin: '0 auto' }}>assignment</span>
                  <div style={{ width: 22 }} />
                </div>
                <div className="text-center text-sm font-extrabold py-2.5" style={{ color: '#1a1a2e', borderBottom: '1px solid #eef0f4' }}>Detalle del producto</div>
                <div className="overflow-y-auto flex-1 px-4 py-3 flex flex-col gap-2.5">
                  {/* Imagen — click para lightbox. */}
                  <button
                    onClick={() => setImgOpen(true)}
                    className="flex items-center justify-center rounded-lg"
                    style={{ height: 140, border: '2px solid ' + NAVY, background: '#fafbfc', cursor: 'zoom-in' }}
                  >
                    {prod?.img ? (
                      <img src={prod.img} alt={prod.name} style={{ maxHeight: '100%', maxWidth: '100%' }} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 72, color: '#c5cbd6' }}>photo</span>
                    )}
                  </button>
                  {/* Código + descripción. */}
                  <Box label="Código" value={p.code} />
                  <div className="text-xs text-center py-2 px-2 rounded" style={{ border: '1px solid #d7dbe6', color: '#374151' }}>
                    {prod?.name ?? p.code}
                  </div>
                  {/* Ubicación (solo si sucursal tiene el proyecto activado). */}
                  {ubi && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <Box label="Ubicación" value={ubi.planta} />
                        <Box label="Pasillo" value={ubi.pasillo} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Box label="Torre" value={ubi.torre} />
                        <Box label="Nivel" value={ubi.nivel} />
                      </div>
                    </>
                  )}
                  {/* Existencia + Solicitado. */}
                  <div className="grid grid-cols-2 gap-2">
                    <Box label="Existencia" value={ex} valueStyle={{ color: ex < sol ? '#e53935' : '#2e7d32' }} />
                    <Box label="Solicitado" value={sol} />
                  </div>
                  {/* Stepper — editable siempre. Si el producto no se escaneó,
                      la confirmación se registra como surtido MANUAL para
                      trazabilidad (badge en la card + toast informativo). */}
                  <div className="flex items-center justify-between mt-1">
                    <label className="text-xs font-bold" style={{ color: '#1a1a2e' }}>Cantidad surtida:</label>
                    <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1.5px solid #d7dbe6' }}>
                      <button
                        onClick={() => setDetailQty(q => Math.max(0, q - 1))}
                        className="w-9 h-9 font-extrabold"
                        style={{ background: '#eef0f4', color: '#6b7280' }}
                      >−</button>
                      <span className="w-14 text-center text-base font-extrabold" style={{ color: '#1a1a2e' }}>{detailQty}</span>
                      <button
                        onClick={() => setDetailQty(q => Math.min(tope, q + 1))}
                        className="w-9 h-9 font-extrabold"
                        style={{ background: '#eef0f4', color: '#6b7280' }}
                      >+</button>
                    </div>
                  </div>
                  {!yaEscaneado && detailQty > 0 && (
                    <p className="text-[11px] italic text-center" style={{ color: '#b45309' }}>
                      Este surtido se registrará como <strong>manual</strong> (sin escaneo).
                    </p>
                  )}
                </div>
                {/* Footer — ÚNICO botón que cambia según la cantidad del
                    stepper. El "Regresar" ya vive como flecha ← en el header.
                     • qty = 0 → "Negar producto" (rojo) → abre selector de
                       motivo. Si es corporativo, queda deshabilitado.
                     • qty ≥ 1 → "Confirmar surtido" (verde) → aplica cantidad. */}
                <div className="flex gap-2 px-4 py-3" style={{ borderTop: '1px solid #eef0f4', flexShrink: 0 }}>
                  {detailQty > 0 ? (
                    <button
                      onClick={confirmarDetalle}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
                      style={{ background: '#2e7d32' }}
                    >
                      Confirmar surtido
                    </button>
                  ) : (
                    <button
                      onClick={() => setMotivoNegOpen(true)}
                      disabled={!puedeNegarProducto}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
                      style={{ background: puedeNegarProducto ? '#e53935' : '#c5cbd6', cursor: puedeNegarProducto ? 'pointer' : 'not-allowed' }}
                      title={
                        esPedidoCorporativo ? 'Pedido corporativo: no permite negar productos.'
                        : 'Negar el producto (requiere motivo). Para surtirlo, sube la cantidad a ≥ 1.'
                      }
                    >
                      Negar producto
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Lightbox de la imagen del detalle. */}
        {imgOpen && detailCode && (() => {
          const prod = PRODUCT_CATALOG[detailCode];
          return (
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 40 }} onClick={() => setImgOpen(false)}>
              <div className="flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-center rounded-lg" style={{ maxWidth: '90vw', maxHeight: '70vh', minWidth: 260, minHeight: 260, background: '#fff' }}>
                  {prod?.img ? (
                    <img src={prod.img} alt={prod.name} style={{ maxHeight: '68vh', maxWidth: '88vw' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 160, color: '#c5cbd6' }}>photo</span>
                  )}
                </div>
                <button onClick={() => setImgOpen(false)} className="flex items-center justify-center rounded-lg text-white" style={{ background: '#e53935', width: 72, height: 40 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Selección de motivo negado — solo si se pulsó "Negar producto". */}
        {motivoNegOpen && detailCode && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)', zIndex: 45 }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="px-5 pt-5">
                <div className="text-sm font-extrabold" style={{ color: '#1a1a2e' }}>Selección de motivo negado</div>
                <div className="text-xs mt-1" style={{ color: '#555' }}>
                  <strong style={{ color: NAVY }}>{detailCode}</strong> — {PRODUCT_CATALOG[detailCode]?.name}
                </div>
              </div>
              <div className="px-5 mt-3">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>Motivo</label>
                <select
                  value={motivoNegSel}
                  onChange={e => setMotivoNegSel(e.target.value as 'Sin existencia' | MotivoRechazoTipo)}
                  className="w-full text-xs rounded-lg px-3 py-2 mt-1"
                  style={{ border: '1px solid #d7dbe6', background: '#fff', color: '#1a1a2e' }}
                >
                  <option value="Sin existencia">Sin existencia</option>
                  {MOTIVOS_RECHAZO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {motivoNegSel === 'Otro' && (
                  <textarea
                    value={motivoNegOtro}
                    onChange={e => setMotivoNegOtro(e.target.value)}
                    placeholder="Escribe el motivo…"
                    rows={2}
                    className="w-full text-xs rounded-lg px-3 py-2 mt-2 resize-none"
                    style={{ border: '1px solid #d7dbe6', background: '#fafbfc' }}
                  />
                )}
              </div>
              <div className="flex gap-2 px-5 py-4 mt-3">
                <button onClick={() => setMotivoNegOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#e53935' }}>Cancelar</button>
                <button
                  onClick={confirmarNegadoProducto}
                  disabled={!puedeConfirmarNegado}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: puedeConfirmarNegado ? '#2e7d32' : '#c5cbd6', cursor: puedeConfirmarNegado ? 'pointer' : 'not-allowed' }}
                >Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal simplificado — "Ingresa la cantidad a surtir" (etiqueta de 7
            dígitos: misceláneos / graneles). Muestra imagen del producto con
            click para ampliar, y su nombre + código. */}
        {simpleCode && (() => {
          const p = peticion.piezas.find(x => x.code === simpleCode)!;
          const prod = PRODUCT_CATALOG[simpleCode];
          const sol = solicitadaDe(simpleCode);
          const ex = existenciaDe(simpleCode);
          const tope = Math.min(sol, ex);
          return (
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) setSimpleCode(null); }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="flex flex-col items-center gap-2 pt-5 px-5">
                  <div className="text-sm font-extrabold text-center" style={{ color: '#1a1a2e' }}>Ingresa la cantidad a surtir</div>
                  {/* Imagen — click abre el lightbox. */}
                  <button
                    onClick={() => { setDetailCode(simpleCode); setImgOpen(true); }}
                    className="flex items-center justify-center rounded-lg mt-1"
                    style={{ height: 110, width: 110, border: '2px solid ' + NAVY, background: '#fafbfc', cursor: 'zoom-in' }}
                    title="Toca para ampliar la imagen"
                  >
                    {prod?.img ? (
                      <img src={prod.img} alt={prod.name} style={{ maxHeight: '100%', maxWidth: '100%' }} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 60, color: '#c5cbd6' }}>photo</span>
                    )}
                  </button>
                  <div className="text-xs text-center" style={{ color: '#555' }}>
                    <strong style={{ color: NAVY }}>{simpleCode}</strong> — {prod?.name}
                  </div>
                  <p className="text-[11px] text-center" style={{ color: '#6b7280' }}>
                    Solicitado: <strong>{sol}</strong> · Existencia: <strong style={{ color: ex < sol ? '#e53935' : '#2e7d32' }}>{ex}</strong>
                  </p>
                </div>
                <div className="px-5 mt-3 flex items-center justify-center gap-3">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #d7dbe6' }}>
                    <button onClick={() => setSimpleQty(q => Math.max(0, q - 1))} className="w-10 h-10 font-bold text-lg" style={{ background: '#f2f4f8', color: NAVY }}>−</button>
                    <span className="w-14 text-center text-lg font-extrabold" style={{ color: '#1a1a2e' }}>{simpleQty}</span>
                    <button onClick={() => setSimpleQty(q => Math.min(tope, q + 1))} className="w-10 h-10 font-bold text-lg" style={{ background: '#f2f4f8', color: NAVY }}>+</button>
                  </div>
                </div>
                <div className="flex gap-2 px-5 py-4 mt-3">
                  <button onClick={() => setSimpleCode(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#e53935' }}>Cancelar</button>
                  <button onClick={confirmarSimplificado} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: NAVY }}>Confirmar</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Confirmar rechazar/negar traspaso.
            Dos modos:
             • Manual (⋮ Rechazar/Cancelar): pide motivo tipificado.
             • Auto (rechazoAuto=true, disparado al finalizar cuando TODAS
               las partidas están negadas): sin selector — el motivo ya se
               dio a nivel de producto. Copy diferenciado. */}
        {confirmNegar && (() => {
          const titulo = rechazoAuto ? 'Rechazar traspaso' : confirmTitulo;
          const cerrar = () => { setConfirmNegar(false); setRechazoAuto(false); };
          return (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex flex-col items-center gap-3 pt-6 px-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(229,57,53,0.12)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#e53935' }}>block</span>
                </div>
                <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>{titulo}</div>
              </div>
              {rechazoAuto ? (
                <p className="text-xs mt-3 px-6 text-center leading-relaxed" style={{ color: '#555' }}>
                  Al negar <strong>todas las partidas</strong> de esta petición se considera como <strong>rechazada la petición</strong>. ¿Desea continuar?
                </p>
              ) : (
                <p className="text-xs mt-3 px-6 text-center leading-relaxed" style={{ color: '#555' }}>
                  ¿Estás seguro de {esRechazable ? 'rechazar' : 'cancelar'} el traspaso <strong style={{ color: '#1a1a2e' }}>{peticion.id}</strong>?<br />
                  Esta acción <strong>no puede ser deshecha</strong>. ¿Desea continuar?
                </p>
              )}
              {/* Selector de motivo solo en modo manual. */}
              {!rechazoAuto && (
                <div className="px-5 mt-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6b7280' }}>Motivo del {esRechazable ? 'rechazo' : 'cancelación'}</label>
                  <div className="flex flex-col gap-1.5 mt-1.5">
                    {MOTIVOS_RECHAZO.map(m => (
                      <label key={m} className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer" style={{
                        border: `1px solid ${motivoRechazo === m ? '#e53935' : '#e5e7eb'}`,
                        background: motivoRechazo === m ? 'rgba(229,57,53,0.06)' : '#fff',
                      }}>
                        <input type="radio" name="motivoRechazo" value={m} checked={motivoRechazo === m} onChange={() => setMotivoRechazo(m)} style={{ accentColor: '#e53935' }} />
                        <span className="text-xs font-semibold" style={{ color: motivoRechazo === m ? '#e53935' : '#374151' }}>{m}</span>
                      </label>
                    ))}
                  </div>
                  {motivoRechazo === 'Otro' && (
                    <textarea
                      value={motivoOtro}
                      onChange={e => setMotivoOtro(e.target.value)}
                      placeholder="Escribe el motivo o razón…"
                      rows={2}
                      className="w-full text-xs rounded-lg px-3 py-2 mt-2 resize-none"
                      style={{ border: '1px solid #d7dbe6', background: '#fafbfc', fontFamily: 'Roboto, sans-serif' }}
                    />
                  )}
                </div>
              )}
              {(!esEnvioACedis && (esRechazable || rechazoAuto)) && (
                <p className="text-[11px] mt-3 px-6 text-center" style={{ color: '#9ca3af' }}>
                  La sucursal solicitante podrá reasignarlo a otra sucursal desde "Por recibir".
                </p>
              )}
              <div className="flex gap-2 px-6 py-5 mt-2">
                <button onClick={cerrar} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                <button
                  onClick={ejecutarNegar}
                  disabled={!rechazoAuto && !puedeConfirmarRechazo}
                  title={!rechazoAuto && !puedeConfirmarRechazo ? 'Describe el motivo en "Otro" para continuar.' : undefined}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: (rechazoAuto || puedeConfirmarRechazo) ? '#e53935' : '#9ca3af', cursor: (rechazoAuto || puedeConfirmarRechazo) ? 'pointer' : 'not-allowed' }}
                >
                  {titulo}
                </button>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
