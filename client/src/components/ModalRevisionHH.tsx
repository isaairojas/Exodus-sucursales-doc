// ============================================================
// APYMSA — ModalRevisionHH
// Ventana de REVISIÓN de un traspaso (portada al escritorio del flujo HH descrito
// en docs/revision-pedidos-HH.md — historias ERB-45802/45803/45804/45805/47582/
// 47583/51125). Se abre desde "Por enviar" cuando el traspaso está en estado
// Surtido. Reglas clave adaptadas al proyecto:
//   • Cabecera con barra de avance (sobre TOTAL DE PIEZAS del pedido) + id.
//   • Tabla ordenada: parcial → sin revisar → completo (y por código dentro).
//   • Indicador de color en "Revisado": amarillo (0), azul (parcial), verde (=surtido).
//   • Campo de escaneo fijo abajo con teclado (ingreso manual). Formatos: 18, 51/52+
//     y 7 (solo productos EXCEPCIÓN — abre modal simplificado). No-excepción con
//     7 dígitos se rechaza con toast.
//   • Detalle de producto al tocar renglón: sin excepción muestra conteo (cancelar
//     regresa a 0). Excepción abre stepper (cancelar conserva último valor).
//   • Finalización: AUTOMÁTICA al 100%, MANUAL desde ⋮.
//   • En manual con faltantes → Gestor de discrepancias (motivo negado obligatorio).
//   • Restricción de TRASPASOS: no se permite cierre con productos no revisados sin
//     negar; el gestor obliga a resolver cada discrepancia con motivo (ERB-51125).
// Design: HH APYMSA (navy #1B3892) — ancho ~480px para escritorio.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  TraspasoPeticion, TraspasoPiezaDetalle, PRODUCT_CATALOG,
  MotivoRechazoTipo, MOTIVOS_RECHAZO, TRASPASO_STATUS_POR_TIPO,
} from '@/lib/data';
import PipelineHH from './PipelineHH';

interface Props {
  peticion: TraspasoPeticion;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onFinalizado?: () => void;
}

const NAVY = '#1B3892';
const AMARILLO = '#f59e0b';
const AZUL = '#2563eb';
const VERDE = '#16a34a';

// Estado por-producto según el conteo revisado vs surtido.
type EstadoLinea = 'sin_revisar' | 'parcial' | 'completo';

interface NegadoEntry {
  code: string;
  cantidad: number;   // diferencia (surtido - revisado)
  motivo: string;     // "Producto dañado" | "Diferencia..." | "Otro — texto libre"
}

export default function ModalRevisionHH({ peticion, onClose, showToast, onFinalizado }: Props) {
  const { finalizarRevisionTraspaso } = useApp();

  // ── Estado de revisión por producto ──
  // Al abrir, ya trae lo que el HH surtió previamente (peticion.piezas[i].qtySurtida).
  // El "Revisado" empieza en 0 y se acumula con cada escaneo/confirmación.
  const solicitadoDe = (code: string) => peticion.piezas.find(p => p.code === code)?.qtySolicitada ?? 0;
  const surtidoDe = (code: string) => peticion.piezas.find(p => p.code === code)?.qtySurtida ?? 0;
  const esExcepcion = (code: string) => !!PRODUCT_CATALOG[code]?.esExcepcion;

  const [revisado, setRevisado] = useState<Record<string, number>>(() => {
    const r: Record<string, number> = {};
    peticion.piezas.forEach(p => { r[p.code] = 0; });
    return r;
  });
  // Negados guardados en memoria — solo se persisten al cierre exitoso.
  const [negados, setNegados] = useState<Map<string, NegadoEntry>>(new Map());

  // ── UI states ──
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const scanRef = useRef<HTMLInputElement | null>(null);
  const [detailCode, setDetailCode] = useState<string | null>(null);   // Detalle de producto
  // Trazabilidad del origen del registro por producto (traspasos):
  //  • revisadoManualSet: productos cuya revisión final se confirmó desde el
  //    stepper del detalle SIN escaneo previo (marca "R" en la card).
  //  • escaneadosRevSet:  productos cuya revisión final vino del escáner.
  const [revisadoManualSet, setRevisadoManualSet] = useState<Set<string>>(new Set());
  const [escaneadosRevSet, setEscaneadosRevSet] = useState<Set<string>>(new Set());
  const [detailQty, setDetailQty] = useState<number>(0);                // stepper local del detalle (solo excepción)
  const [simpleCode, setSimpleCode] = useState<string | null>(null);   // Modal simplificado (excepción)
  const [simpleQty, setSimpleQty] = useState<number>(0);
  const [confirmarCierreOk, setConfirmarCierreOk] = useState(false);   // "Revisión sin diferencias"
  const [discIdx, setDiscIdx] = useState<number | null>(null);         // Gestor de discrepancias (índice)
  const [motivoOpen, setMotivoOpen] = useState<{ code: string; diff: number } | null>(null);
  const [motivoTipo, setMotivoTipo] = useState<MotivoRechazoTipo>('Producto dañado');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [confirmCancelar, setConfirmCancelar] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);                         // Lightbox de imagen en detalle
  const [confirmRegresar, setConfirmRegresar] = useState(false);         // "¿Regresar a revisión?" con negados

  // ── Beep de error (audio HH) — Web Audio API, sin assets externos.
  const beepError = () => {
    try {
      const AC: typeof AudioContext | undefined =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 220;
      g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 180);
    } catch { /* silencio en entornos sin audio */ }
  };
  const toastError = (m: string) => { beepError(); showToast(m, 'error'); };

  // Foco persistente en el campo de escaneo (excepto cuando hay overlay).
  useEffect(() => {
    if (detailCode || simpleCode || confirmarCierreOk || discIdx != null || motivoOpen || confirmCancelar || menuOpen || imgOpen || confirmRegresar) return;
    scanRef.current?.focus();
  }, [detailCode, simpleCode, confirmarCierreOk, discIdx, motivoOpen, confirmCancelar, menuOpen, imgOpen, confirmRegresar, revisado]);

  // ── Cálculos ──
  const estadoDe = (code: string): EstadoLinea => {
    const r = revisado[code] ?? 0;
    const s = surtidoDe(code);
    if (r <= 0) return 'sin_revisar';
    if (r >= s) return 'completo';
    return 'parcial';
  };

  // Total de piezas del pedido = suma de surtidos (base del avance).
  const totalPiezas = useMemo(() => peticion.piezas.reduce((s, p) => s + p.qtySurtida, 0), [peticion.piezas]);
  const revisadasSum = useMemo(
    () => peticion.piezas.reduce((s, p) => s + Math.min(revisado[p.code] ?? 0, p.qtySurtida), 0),
    [revisado, peticion.piezas],
  );
  const pctAvance = totalPiezas > 0 ? Math.round((revisadasSum / totalPiezas) * 100) : 0;

  const contadores = useMemo(() => {
    const c = { completo: 0, parcial: 0, sin_revisar: 0 };
    peticion.piezas.forEach(p => { c[estadoDe(p.code)]++; });
    return c;
  }, [revisado, peticion.piezas]);

  // Tabla ordenada: parcial → sin revisar → completo; dentro, por código.
  const ordenEstado: Record<EstadoLinea, number> = { parcial: 0, sin_revisar: 1, completo: 2 };
  const rowsOrdenadas = useMemo(() => {
    return [...peticion.piezas].sort((a, b) => {
      const ea = ordenEstado[estadoDe(a.code)];
      const eb = ordenEstado[estadoDe(b.code)];
      return ea !== eb ? ea - eb : a.code.localeCompare(b.code);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revisado, peticion.piezas]);

  const hayFaltantes = revisadasSum < totalPiezas;
  const enPipelineAlCompletar100 = !hayFaltantes;

  // ── Modificadores de revisado ──
  const sumarRevisado = (code: string, n: number) => {
    setRevisado(prev => {
      const s = surtidoDe(code);
      const next = Math.max(0, Math.min(s, (prev[code] ?? 0) + n));
      return { ...prev, [code]: next };
    });
  };
  const setRevisadoValor = (code: string, n: number) => {
    setRevisado(prev => {
      const s = surtidoDe(code);
      return { ...prev, [code]: Math.max(0, Math.min(s, n)) };
    });
  };
  const resetRevisado = (code: string) => setRevisadoValor(code, 0);

  // ── Escaneo / entrada manual ──
  // Reglas:
  //   • 18 dígitos → código (1-7), cantidad (8-13).
  //   • ≥ 51 dígitos → mismo destripe de código + cantidad.
  //   • 7 dígitos → solo válido para productos EXCEPCIÓN (abre modal simplificado).
  //   • Cualquier otro → toast de error.
  const parsearEtiqueta = (raw: string): { code: string; qty: number | null } | null => {
    const s = raw.trim();
    if (!s) return null;
    if (s.length === 7 && /^\d+$/.test(s)) return { code: s, qty: null };
    if (s.length === 18 && /^\d+$/.test(s)) {
      return { code: s.slice(0, 7), qty: parseInt(s.slice(7, 13), 10) || 0 };
    }
    if (s.length >= 51 && /^\d+$/.test(s)) {
      return { code: s.slice(0, 7), qty: parseInt(s.slice(7, 13), 10) || 0 };
    }
    return null;
  };

  const procesarEscaneo = (raw: string) => {
    const parsed = parsearEtiqueta(raw);
    setScanValue('');
    // Validación 2 — Código inválido — formato no reconocido (no 7, 18 ni 51/52+ dígitos).
    if (!parsed) {
      toastError('Código inválido — Formato no reconocido.');
      return;
    }
    const { code, qty } = parsed;
    // Validación 3 — Producto no pertenece al pedido.
    const enPedido = peticion.piezas.some(p => p.code === code);
    if (!enPedido) {
      toastError(`Producto incorrecto — El código ${code} no pertenece a este pedido.`);
      return;
    }
    if (qty === null) {
      // 7 dígitos: solo válido para productos EXCEPCIÓN.
      // Validación 4 (ERB-45805) — Ingreso manual no permitido en productos sin restricción.
      if (!esExcepcion(code)) {
        toastError('Ingreso manual no permitido — Escanea la etiqueta de 18 dígitos.');
        return;
      }
      abrirSimplificado(code);
      return;
    }
    // Regla nueva: si el producto ya tenía revisión MANUAL (confirmada desde
    // el detalle sin escaneo), al re-escanearlo se CANCELA esa revisión previa
    // y se cuenta a partir de 0 con la nueva qty del escaneo. Permite corregir
    // conteos manuales previos sin acumular.
    const s = surtidoDe(code);
    let rAntes = revisado[code] ?? 0;
    if (revisadoManualSet.has(code)) {
      rAntes = 0;
      setRevisadoValor(code, 0);
      setRevisadoManualSet(prev => { const s2 = new Set(prev); s2.delete(code); return s2; });
      showToast(`${code}: revisión manual previa cancelada; se cuenta desde el escaneo.`, 'info');
    }
    // Validación 1 — Escaneo sobrante: acumulada revisada + qty > surtido.
    if (rAntes + qty > s) {
      toastError('Escaneo sobrante — La cantidad supera lo surtido para este producto.');
      return;
    }
    // 18 / 51-52 dígitos: si es EXCEPCIÓN abre el modal simplificado precargado; si
    // no, suma directo.
    if (esExcepcion(code)) {
      abrirSimplificado(code);
      return;
    }
    sumarRevisado(code, qty);
    setEscaneadosRevSet(prev => { const s2 = new Set(prev); s2.add(code); return s2; });
    const nuevoR = Math.min(s, rAntes + qty);
    if (nuevoR === s) showToast(`${code}: revisado completo (${s}/${s}).`, 'success');
    else showToast(`${code}: ${nuevoR}/${s}.`, 'info');
  };

  const abrirSimplificado = (code: string) => {
    const r = revisado[code] ?? 0;
    // Valor inicial del stepper: si aún no se ha revisado, precarga la cantidad
    // surtida (asume que el logístico tiene la mercancía).
    setSimpleQty(r > 0 ? r : surtidoDe(code));
    setSimpleCode(code);
  };
  const confirmarSimplificado = () => {
    if (!simpleCode) return;
    setRevisadoValor(simpleCode, simpleQty);
    // El modal simplificado se abre por ESCANEO (7-díg o 18-díg de excepción),
    // por lo que se registra como escaneado — evita que un futuro re-escaneo
    // cancele lo confirmado como si hubiera sido manual, y garantiza que
    // aparezca con badge "Escaneo" y sin la "R" de manual.
    setEscaneadosRevSet(prev => { const s = new Set(prev); s.add(simpleCode); return s; });
    setRevisadoManualSet(prev => { const s = new Set(prev); s.delete(simpleCode); return s; });
    setSimpleCode(null);
  };

  // ── Detalle de producto (tap sobre renglón) ──
  // El stepper es editable para AMBOS tipos (excepción y no-excepción). El
  // usuario puede indicar la cantidad a revisar sin necesidad de escanear.
  const abrirDetalle = (code: string) => {
    const rActual = revisado[code] ?? 0;
    // Precarga: si ya se había revisado (>0), respeta ese valor; si no y es
    // excepción, precarga con la cantidad surtida (asume mercancía presente);
    // si no y es no-excepción, empieza en 0.
    if (rActual > 0) setDetailQty(rActual);
    else if (esExcepcion(code)) setDetailQty(surtidoDe(code));
    else setDetailQty(0);
    setDetailCode(code);
  };
  // Botón único del detalle:
  //   • qty ≥ 1 → "Confirmar revisión" (verde): aplica cantidad; si no había
  //     escaneo previo, marca el producto con "R" (revisadoManualSet).
  //   • qty = 0 y REVISADO PREVIO > 0 → "Cancelar revisión" (rojo): deshace
  //     la revisión (resetea a 0 y quita del manual/escaneado sets).
  //   • qty = 0 y sin revisión previa → botón deshabilitado.
  const confirmarDetalle = () => {
    if (!detailCode) return;
    setRevisadoValor(detailCode, detailQty);
    if (detailQty > 0 && !escaneadosRevSet.has(detailCode)) {
      setRevisadoManualSet(prev => { const s = new Set(prev); s.add(detailCode); return s; });
    }
    (() => { setImgOpen(false); setDetailCode(null); })();
  };
  const cancelarRevisionProducto = () => {
    if (!detailCode) return;
    resetRevisado(detailCode);
    setRevisadoManualSet(prev => { const s = new Set(prev); s.delete(detailCode); return s; });
    setEscaneadosRevSet(prev => { const s = new Set(prev); s.delete(detailCode); return s; });
    (() => { setImgOpen(false); setDetailCode(null); })();
  };

  // ── Finalización ──
  const persistirYCerrar = () => {
    const piezasRevisadas: TraspasoPiezaDetalle[] = peticion.piezas.map(p => {
      const r = revisado[p.code] ?? 0;
      const surtido = p.qtySurtida;
      return { code: p.code, qtySolicitada: p.qtySolicitada, qtySurtida: Math.min(r, surtido) };
    });
    let nota: string | undefined;
    if (negados.size > 0) {
      const partes: string[] = [];
      negados.forEach(n => partes.push(`${n.code}: ${n.cantidad} — ${n.motivo}`));
      nota = 'Negados en revisión — ' + partes.join(' · ');
    }
    finalizarRevisionTraspaso(peticion.id, piezasRevisadas, nota);
    showToast('Revisión finalizada.', 'success');
    onClose();
    onFinalizado?.();
  };

  // Finalización automática al 100% sin discrepancias: dispara el modal de
  // confirmación "Revisión sin diferencias".
  useEffect(() => {
    if (enPipelineAlCompletar100 && !confirmarCierreOk) {
      // Auto-abre solo si aún no está abierto
      setConfirmarCierreOk(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enPipelineAlCompletar100]);

  // Camino manual: intenta cerrar; si hay faltantes → gestor de discrepancias.
  const intentarCerrarManual = () => {
    setMenuOpen(false);
    if (!hayFaltantes) { setConfirmarCierreOk(true); return; }
    // Restricción de traspasos: todos los faltantes deben estar negados con motivo.
    const productosConFaltante = peticion.piezas.filter(p => (revisado[p.code] ?? 0) < p.qtySurtida);
    const todosNegados = productosConFaltante.every(p => negados.has(p.code));
    if (todosNegados) {
      // Ya se resolvieron negados; permitir cierre.
      persistirYCerrar();
      return;
    }
    // Abrir gestor de discrepancias en el primer producto con faltante y sin negar.
    const primerIdx = productosConFaltante.findIndex(p => !negados.has(p.code));
    const idxEnPeticion = peticion.piezas.findIndex(p => p.code === productosConFaltante[primerIdx].code);
    setDiscIdx(idxEnPeticion);
  };

  // Confirma el negado del producto actual del gestor de discrepancias.
  const negarActual = () => {
    if (discIdx == null) return;
    const p = peticion.piezas[discIdx];
    const diff = Math.max(0, p.qtySurtida - (revisado[p.code] ?? 0));
    setMotivoOpen({ code: p.code, diff });
  };
  const guardarMotivo = () => {
    if (!motivoOpen) return;
    const motivoFinal = motivoTipo === 'Otro' ? (motivoOtro.trim() ? `Otro — ${motivoOtro.trim()}` : 'Otro') : (motivoTipo as string);
    if (motivoTipo === 'Otro' && !motivoOtro.trim()) {
      showToast('Describe el motivo del negado en "Otro".', 'warning');
      return;
    }
    setNegados(prev => new Map(prev).set(motivoOpen.code, { code: motivoOpen.code, cantidad: motivoOpen.diff, motivo: motivoFinal }));
    setMotivoOpen(null);
    setMotivoTipo('Producto dañado');
    setMotivoOtro('');
    // Buscar el siguiente producto con faltante y sin negar.
    const siguientes = peticion.piezas
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => i !== discIdx && (revisado[p.code] ?? 0) < p.qtySurtida && !negados.has(p.code) && p.code !== motivoOpen.code);
    if (siguientes.length > 0) setDiscIdx(siguientes[0].i);
    else {
      // No hay más faltantes por negar — el usuario debe presionar "Finalizar" de nuevo.
      setDiscIdx(null);
      showToast('Todos los faltantes tienen motivo. Presiona "Finalizar revisión" para cerrar.', 'info');
    }
  };

  const cancelarTareaEntera = () => { setConfirmCancelar(false); onClose(); };

  // ── Colores por estado ──
  const colorEstado = (e: EstadoLinea) => e === 'sin_revisar' ? AMARILLO : e === 'parcial' ? AZUL : VERDE;
  const iconoEstado = (e: EstadoLinea) => e === 'sin_revisar' ? 'radio_button_unchecked' : e === 'parcial' ? 'donut_large' : 'check_circle';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', animation: 'screenFadeIn 0.2s ease' }} onClick={e => { if (e.target === e.currentTarget) setConfirmCancelar(true); }}>
      <div className="flex flex-col bg-white overflow-hidden relative" style={{ width: 480, maxWidth: '96vw', height: '92vh', maxHeight: 820, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'modalIn 0.22s ease', fontFamily: 'Roboto, sans-serif' }}>

        {/* Header HH — navy con "← Menú" y ⋮ (círculo blanco).
            El botón "← Menú" y el click fuera del modal disparan el mismo
            confirm de "Cerrar sin guardar" que el menú ⋮ — para evitar que el
            usuario pierda el avance de la revisión por accidente. */}
        <div className="flex items-center gap-2 px-4" style={{ background: NAVY, height: 56, flexShrink: 0 }}>
          <button onClick={() => setConfirmCancelar(true)} className="flex items-center gap-1 text-white" title="Regresar al menú (pide confirmación)">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
            <span className="text-sm font-bold">Menú</span>
          </button>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'rgba(255,255,255,0.35)', margin: '0 auto' }}>assignment</span>
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: '#fff', color: NAVY }} title="Opciones">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 rounded-lg overflow-hidden" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 30, minWidth: 260 }}>
                <button onClick={intentarCerrarManual} className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-gray-50" style={{ color: NAVY }}>
                  Finalizar revisión
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setConfirmCancelar(true); }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                  style={{ color: '#e53935', borderTop: '1px solid #f0f0f0' }}
                  title="Cierra esta tarea de revisión sin guardar el avance. NO cancela la petición del traspaso — el rechazo/cancelación de la petición solo se puede hacer durante el surtido en HH."
                >
                  Cerrar sin guardar avance
                </button>
                {/* Aviso: la petición ya no puede rechazarse/cancelarse en revisión. */}
                <div className="px-4 py-2 text-[10px] leading-snug border-t" style={{ color: '#6b7280', background: '#f6f7fb', borderColor: '#f0f0f0' }}>
                  <span className="font-bold flex items-center gap-1 mb-0.5" style={{ color: '#374151' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>info</span>
                    Solo se puede revisar / negar
                  </span>
                  El rechazo o cancelación de la petición solo aplica durante el <strong>surtido</strong>. En revisión ya no puedes cancelar el traspaso — solo negar los productos con faltante desde el gestor de discrepancias.
                </div>
                <button onClick={() => setMenuOpen(false)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#6b7280', borderTop: '1px solid #f0f0f0' }}>
                  Cerrar menú
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Título centrado */}
        <div className="px-4 pt-3 pb-2" style={{ background: '#fff', flexShrink: 0 }}>
          <div className="text-center text-sm font-extrabold" style={{ color: '#1a1a2e' }}>Revisión de pedido</div>
        </div>

        <div className="px-4 pb-3" style={{ background: '#fff', flexShrink: 0 }}>
          <div className="rounded-xl p-3" style={{ background: NAVY }}>
            <div className="flex items-center justify-between text-white mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>fact_check</span>
                Avance de la revisión
              </span>
              <span className="text-xs font-bold">
                {peticion.pedidoOrigen ? `Pedido ${peticion.pedidoOrigen}` : `Traspaso ${peticion.id}`}
              </span>
            </div>
            <div className="relative rounded-full overflow-hidden" style={{ height: 22, background: 'rgba(255,255,255,0.25)' }}>
              <div
                className="absolute inset-y-0 left-0 flex items-center justify-end pr-3"
                style={{ width: `${Math.max(pctAvance, 12)}%`, background: 'linear-gradient(90deg,#0e1e5a,#3f5cc9)', transition: 'width 0.25s', borderRadius: 999 }}
              >
                <span className="text-xs font-extrabold text-white">{pctAvance}%</span>
              </div>
            </div>
            {/* Contadores compactos abajo */}
            <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] text-white">
              <div className="text-center"><strong>{contadores.completo}</strong> completo{contadores.completo!==1?'s':''}</div>
              <div className="text-center"><strong>{contadores.parcial}</strong> parcial{contadores.parcial!==1?'es':''}</div>
              <div className="text-center"><strong>{contadores.sin_revisar}</strong> sin revisar</div>
            </div>
          </div>
        </div>

        {/* Tabla de productos estilo HH */}
        <div className="flex-1 overflow-y-auto px-4 pb-3" style={{ background: '#fff' }}>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #d7dbe6' }}>
            {/* Header de tabla */}
            <div className="grid px-3 py-2 text-[11px] font-bold text-white uppercase tracking-wider" style={{ background: NAVY, gridTemplateColumns: '1fr 60px 68px' }}>
              <span>Producto</span>
              <span className="text-center">Surtido</span>
              <span className="text-center">Revisado</span>
            </div>
            {rowsOrdenadas.map((p, i) => {
              const est = estadoDe(p.code);
              const color = colorEstado(est);
              const r = revisado[p.code] ?? 0;
              const negado = negados.get(p.code);
              const prod = PRODUCT_CATALOG[p.code];
              const excepcion = !!prod?.esExcepcion;
              // Badge del "Revisado" con color según estado (spec 5.3).
              const bgRev = est === 'sin_revisar' ? 'rgba(245,158,11,0.15)' : est === 'parcial' ? 'rgba(37,99,235,0.15)' : 'rgba(22,163,74,0.15)';
              return (
                <button
                  key={p.code}
                  onClick={() => abrirDetalle(p.code)}
                  className="grid items-center px-3 py-2.5 text-left transition-colors hover:bg-gray-50 w-full"
                  style={{ gridTemplateColumns: '1fr 60px 68px', borderTop: i === 0 ? 'none' : '1px solid #eef0f4', cursor: 'pointer', background: '#fff' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Placeholder de imagen (no tenemos foto real) — cuadro con icono */}
                    <div className="flex items-center justify-center rounded flex-shrink-0" style={{ width: 42, height: 42, background: '#f2f4f8', border: '1px solid #e5e7eb' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#9ca3af' }}>photo</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold" style={{ color: '#1a1a2e' }}>{p.code}</span>
                        {excepcion && <span className="text-[8px] font-bold px-1 rounded" title="Producto excepción — modal simplificado" style={{ background: 'rgba(217,119,6,0.12)', color: '#b45309' }}>EXC</span>}
                        {/* Badge "R" — revisión confirmada manualmente (sin escaneo). */}
                        {revisadoManualSet.has(p.code) && (
                          <span
                            className="inline-flex items-center justify-center text-[9px] font-extrabold rounded-full"
                            style={{ width: 14, height: 14, background: '#b45309', color: '#fff' }}
                            title="Revisión confirmada manualmente (sin escaneo)"
                          >R</span>
                        )}
                        {negado && <span className="text-[8px] font-bold px-1 rounded" title={`Negado ${negado.cantidad}: ${negado.motivo}`} style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>NEG {negado.cantidad}</span>}
                      </div>
                      <div className="text-[10px] leading-tight line-clamp-2" style={{ color: '#555' }}>{prod?.name ?? p.code}</div>
                    </div>
                  </div>
                  <span className="text-center text-sm font-semibold" style={{ color: '#1a1a2e' }}>{p.qtySurtida}</span>
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center text-sm font-extrabold rounded-md" style={{ minWidth: 42, height: 26, background: bgRev, color }}>{r}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campo de escaneo fijo — botón de teclado a la IZQUIERDA (estilo HH) */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid #eef0f4', background: '#fff', flexShrink: 0 }}>
          <button
            onClick={() => scanRef.current?.focus()}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-white flex-shrink-0"
            style={{ background: NAVY }}
            title="Ingreso manual con teclado"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>keyboard</span>
          </button>
          <input
            ref={scanRef}
            type="text"
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') procesarEscaneo(scanValue); }}
            placeholder="Escanea o teclea (18 o 51/52 díg.)…"
            className="flex-1 text-sm rounded-lg border px-3 py-2.5"
            style={{ borderColor: '#d7dbe6', height: 44 }}
            autoFocus
          />
        </div>

        {/* ── OVERLAYS ── */}

        {/* Detalle de producto — con imagen grande, campos etiquetados en cajas
            navy y layout como el HH real. Excepción: stepper + Confirmar +
            Cancelar revisión. Sin excepción: solo lectura Surtido/Revisado. */}
        {detailCode && (() => {
          const p = peticion.piezas.find(x => x.code === detailCode)!;
          const prod = PRODUCT_CATALOG[detailCode];
          const excepcion = !!prod?.esExcepcion;
          const r = revisado[detailCode] ?? 0;
          // "Cancelar revisión" solo tiene sentido si hay revisión previa (r ≥ 1).
          // Aplica igual para excepción y no-excepción (el flujo se unificó).
          const puedeCancelar = r >= 1;
          const Row = ({ label, value, valueStyle }: { label: string; value: React.ReactNode; valueStyle?: React.CSSProperties }) => (
            <div className="flex items-stretch overflow-hidden" style={{ border: '1.5px solid ' + NAVY, borderRadius: 6 }}>
              <div className="px-3 py-1.5 text-xs font-bold text-white flex items-center" style={{ background: NAVY }}>{label}</div>
              <div className="flex-1 px-3 py-1.5 text-sm font-bold bg-white flex items-center justify-center" style={valueStyle}>{value}</div>
            </div>
          );
          return (
            <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={e => { if (e.target === e.currentTarget) (() => { setImgOpen(false); setDetailCode(null); })(); }}>
              <div className="flex flex-col bg-white overflow-hidden" style={{ width: 380, maxWidth: '96vw', maxHeight: '92vh', borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                {/* Header */}
                <div className="flex items-center px-4" style={{ background: NAVY, height: 48, flexShrink: 0 }}>
                  <button onClick={() => (() => { setImgOpen(false); setDetailCode(null); })()} className="text-white" title="Regresar">
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>arrow_back</span>
                  </button>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'rgba(255,255,255,0.35)', margin: '0 auto' }}>assignment</span>
                  <div style={{ width: 22 }} />
                </div>
                <div className="text-center text-sm font-extrabold py-2.5" style={{ color: '#1a1a2e', borderBottom: '1px solid #eef0f4' }}>Detalle del producto</div>

                <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3" style={{ background: '#fff' }}>
                  {/* Imagen del producto (click abre lightpanel — spec HH captura #1) */}
                  <button
                    onClick={() => setImgOpen(true)}
                    className="flex items-center justify-center rounded-lg"
                    style={{ height: 160, border: '2px solid ' + NAVY, background: '#fafbfc', cursor: 'zoom-in' }}
                    title="Toca para ampliar la imagen"
                  >
                    {prod?.img ? (
                      <img src={prod.img} alt={prod.name} style={{ maxHeight: '100%', maxWidth: '100%' }} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 82, color: '#c5cbd6' }}>photo</span>
                    )}
                  </button>

                  {/* Código */}
                  <Row label="Código" value={p.code} />
                  {/* Descripción (contenida) */}
                  <div className="text-xs text-center py-2 px-2 rounded" style={{ border: '1px solid #d7dbe6', color: '#374151' }}>
                    {prod?.name ?? p.code}
                  </div>

                  {/* Cajas Surtido + (referencia) Revisado actual */}
                  <div className="grid grid-cols-2 gap-3">
                    <Row label="Surtido" value={p.qtySurtida} />
                    <Row label="Revisado" value={r} valueStyle={{ color: colorEstado(estadoDe(detailCode)) }} />
                  </div>
                  {/* Stepper editable — permite indicar la cantidad a revisar
                      sin necesidad de escanear. Al confirmar sin escaneo, el
                      producto se marca con "R" en la card principal. */}
                  <div className="flex items-center gap-3 mt-1">
                    <label className="text-xs font-bold" style={{ color: '#1a1a2e' }}>Cantidad a revisar:</label>
                    <div className="flex items-center rounded-lg overflow-hidden ml-auto" style={{ border: '1.5px solid #d7dbe6' }}>
                      <button onClick={() => setDetailQty(q => Math.max(0, q - 1))} className="w-9 h-9 font-extrabold" style={{ background: '#eef0f4', color: '#6b7280' }}>−</button>
                      <span className="w-14 text-center text-base font-extrabold" style={{ color: '#1a1a2e' }}>{detailQty}</span>
                      <button onClick={() => setDetailQty(q => Math.min(p.qtySurtida, q + 1))} className="w-9 h-9 font-extrabold" style={{ background: '#eef0f4', color: '#6b7280' }}>+</button>
                    </div>
                  </div>
                  {detailQty > 0 && !escaneadosRevSet.has(detailCode) && (
                    <p className="text-[11px] italic text-center" style={{ color: '#b45309' }}>
                      Esta revisión se registrará como <strong>manual</strong> (sin escaneo). Se marcará con <strong>R</strong> en la lista.
                    </p>
                  )}
                  {!excepcion && detailQty === 0 && (
                    <p className="text-[11px] text-center" style={{ color: '#9ca3af' }}>
                      También puedes escanear (18 o 51/52 díg.) para contar automáticamente.
                    </p>
                  )}
                </div>

                {/* Footer — ÚNICO botón que cambia según el escenario.
                     • qty ≥ 1 → "Confirmar revisión" (verde) → aplica cantidad
                       y marca "R" si no hubo escaneo previo.
                     • qty = 0 con revisión previa → "Cancelar revisión" (rojo)
                       → deshace la revisión (resetea a 0). Cuando ya había
                       una confirmación de revisión, este botón la revierte.
                     • qty = 0 sin revisión previa → botón deshabilitado. */}
                <div className="flex gap-2 px-4 py-3" style={{ borderTop: '1px solid #eef0f4', flexShrink: 0 }}>
                  {detailQty > 0 ? (
                    <button
                      onClick={confirmarDetalle}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
                      style={{ background: VERDE }}
                    >
                      Confirmar revisión
                    </button>
                  ) : (
                    <button
                      onClick={cancelarRevisionProducto}
                      disabled={!puedeCancelar}
                      className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
                      style={{ background: puedeCancelar ? '#e53935' : '#c5cbd6', cursor: puedeCancelar ? 'pointer' : 'not-allowed' }}
                      title={puedeCancelar ? 'Deshace la revisión previa de este producto (regresa a 0).' : 'Sube la cantidad a ≥ 1 para confirmar la revisión o escanea el producto.'}
                    >
                      {puedeCancelar ? 'Cancelar revisión' : 'Confirmar revisión'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Modal simplificado (productos excepción) */}
        {simpleCode && (() => {
          const p = peticion.piezas.find(x => x.code === simpleCode)!;
          const rActual = revisado[simpleCode] ?? 0;
          return (
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="flex flex-col items-center gap-2 pt-6 px-5">
                  <div className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: 'rgba(217,119,6,0.12)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#d97706' }}>edit_note</span>
                  </div>
                  <div className="text-sm font-extrabold text-center" style={{ color: '#1a1a2e' }}>Revisión simplificada</div>
                  <div className="text-xs text-center" style={{ color: '#555' }}>
                    <strong style={{ color: NAVY }}>{simpleCode}</strong> — {PRODUCT_CATALOG[simpleCode]?.name}
                  </div>
                  {rActual > 0 && (
                    <p className="text-[11px] text-center" style={{ color: '#6b7280' }}>
                      Cantidad revisada previamente: <strong>{rActual}</strong>
                    </p>
                  )}
                </div>
                <div className="px-5 mt-3 flex items-center gap-3">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #d7dbe6' }}>
                    <button onClick={() => setSimpleQty(q => Math.max(0, q - 1))} className="w-9 h-9 font-bold" style={{ background: '#f2f4f8', color: NAVY }}>−</button>
                    <span className="w-12 text-center text-base font-extrabold" style={{ color: '#1a1a2e' }}>{simpleQty}</span>
                    <button onClick={() => setSimpleQty(q => Math.min(p.qtySurtida, q + 1))} className="w-9 h-9 font-bold" style={{ background: '#f2f4f8', color: NAVY }}>+</button>
                  </div>
                  <span className="text-[11px]" style={{ color: '#6b7280' }}>de <strong style={{ color: NAVY }}>{p.qtySurtida}</strong> surtidas</span>
                </div>
                <div className="flex gap-2 px-5 py-4 mt-3">
                  <button onClick={() => setSimpleCode(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                  <button onClick={confirmarSimplificado} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: NAVY }}>Confirmar</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Cierre sin diferencias (100% sin faltantes) */}
        {confirmarCierreOk && !hayFaltantes && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex flex-col items-center gap-3 pt-6 px-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(22,163,74,0.14)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: VERDE }}>check_circle</span>
                </div>
                <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>Revisión sin diferencias</div>
              </div>
              <p className="text-xs mt-3 px-6 text-center" style={{ color: '#555' }}>
                Se revisaron <strong>{revisadasSum}</strong> de <strong>{totalPiezas}</strong> piezas del traspaso <strong>{peticion.id}</strong>. ¿Deseas finalizar la revisión?
              </p>
              <div className="flex gap-2 px-6 py-5 mt-2">
                <button onClick={() => setConfirmarCierreOk(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                <button onClick={persistirYCerrar} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: VERDE }}>Finalizar revisión</button>
              </div>
            </div>
          </div>
        )}

        {/* Gestor de discrepancias */}
        {discIdx != null && (() => {
          const p = peticion.piezas[discIdx];
          const r = revisado[p.code] ?? 0;
          const diff = p.qtySurtida - r;
          return (
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 380, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div className="px-5 pt-5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#dc2626' }}>report</span>
                    <span className="text-sm font-extrabold" style={{ color: '#dc2626' }}>Faltante — {p.code}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#555' }}>{PRODUCT_CATALOG[p.code]?.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 px-5 mt-3 text-xs">
                  <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Surtido</div><div className="text-base font-bold" style={{ color: '#1a1a2e' }}>{p.qtySurtida}</div></div>
                  <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Revisado</div><div className="text-base font-bold" style={{ color: '#1a1a2e' }}>{r}</div></div>
                  <div><div className="text-[10px] uppercase font-semibold" style={{ color: '#9ca3af' }}>Diferencia</div><div className="text-base font-bold" style={{ color: '#dc2626' }}>−{diff}</div></div>
                </div>
                <p className="text-[11px] mt-3 px-5 text-center" style={{ color: '#6b7280' }}>
                  Los traspasos NO permiten cierre parcial sin resolver el faltante. Debes elegir un motivo de negado.
                </p>
                <div className="flex gap-2 px-5 py-5 mt-2">
                  <button
                    onClick={() => { if (negados.size > 0) setConfirmRegresar(true); else setDiscIdx(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: NAVY }}
                  >Regresar</button>
                  <button onClick={negarActual} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#e53935' }}>Negar producto</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Selección de motivo negado */}
        {motivoOpen && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="px-5 pt-5">
                <div className="text-sm font-extrabold" style={{ color: '#1a1a2e' }}>Motivo de negado</div>
                <div className="text-xs mt-1" style={{ color: '#555' }}>
                  <strong style={{ color: NAVY }}>{motivoOpen.code}</strong> · negando <strong>{motivoOpen.diff}</strong> pza(s)
                </div>
              </div>
              <div className="px-5 mt-3 flex flex-col gap-1.5">
                {MOTIVOS_RECHAZO.map(m => (
                  <label key={m} className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer" style={{
                    border: `1px solid ${motivoTipo === m ? '#e53935' : '#e5e7eb'}`,
                    background: motivoTipo === m ? 'rgba(229,57,53,0.06)' : '#fff',
                  }}>
                    <input type="radio" name="motNegRev" checked={motivoTipo === m} onChange={() => setMotivoTipo(m)} style={{ accentColor: '#e53935' }} />
                    <span className="text-xs font-semibold" style={{ color: motivoTipo === m ? '#e53935' : '#374151' }}>{m}</span>
                  </label>
                ))}
                {motivoTipo === 'Otro' && (
                  <textarea value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} placeholder="Escribe el motivo o razón…" rows={2}
                    className="text-xs rounded-lg px-3 py-2 mt-1 resize-none" style={{ border: '1px solid #d7dbe6', background: '#fafbfc' }} />
                )}
              </div>
              <div className="flex gap-2 px-5 py-4 mt-3">
                <button onClick={() => { setMotivoOpen(null); setMotivoTipo('Producto dañado'); setMotivoOtro(''); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Cancelar</button>
                <button onClick={guardarMotivo} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#e53935' }}>Confirmar negado</button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox de imagen del producto (spec HH captura #1) */}
        {imgOpen && detailCode && (() => {
          const prod = PRODUCT_CATALOG[detailCode];
          return (
            <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 40 }} onClick={() => setImgOpen(false)}>
              <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-center rounded-lg" style={{ maxWidth: '90vw', maxHeight: '70vh', minWidth: 260, minHeight: 260, background: '#fff' }}>
                  {prod?.img ? (
                    <img src={prod.img} alt={prod.name} style={{ maxHeight: '68vh', maxWidth: '88vw' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 160, color: '#c5cbd6' }}>photo</span>
                  )}
                </div>
                <button
                  onClick={() => setImgOpen(false)}
                  className="flex items-center justify-center rounded-lg text-white"
                  style={{ background: '#e53935', width: 72, height: 44 }}
                  title="Cerrar"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>close</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* "¿Regresar a revisión?" — advierte que los negados se restablecerán (captura #4) */}
        {confirmRegresar && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex flex-col items-center gap-3 pt-6 px-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(37,99,235,0.14)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: AZUL }}>help</span>
                </div>
                <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>¿Regresar a revisión?</div>
              </div>
              <p className="text-xs mt-3 px-6 text-center" style={{ color: '#555' }}>
                Al regresar a la pantalla de revisión, se <strong>restablecerán</strong> los productos que se negaron como faltantes. Tendrás que volver a negarlos al terminar.
              </p>
              <div className="flex gap-2 px-6 py-5 mt-2">
                <button onClick={() => setConfirmRegresar(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#e53935' }}>No, continuar</button>
                <button
                  onClick={() => { setNegados(new Map()); setDiscIdx(null); setConfirmRegresar(false); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: VERDE }}
                >Sí, regresar</button>
              </div>
            </div>
          </div>
        )}

        {/* Cerrar sin guardar avance (menú ⋮) */}
        {confirmCancelar && (
          <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full bg-white overflow-hidden" style={{ maxWidth: 360, borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex flex-col items-center gap-3 pt-6 px-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, background: 'rgba(229,57,53,0.12)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#e53935' }}>close</span>
                </div>
                <div className="text-base font-extrabold text-center" style={{ color: '#1a1a2e' }}>Cerrar sin guardar</div>
              </div>
              <p className="text-xs mt-3 px-6 text-center" style={{ color: '#555' }}>
                Se perderá el avance del proceso de revisión (conteos y negados en memoria). El traspaso <strong>NO</strong> se cancela; podrás retomar la revisión más adelante.
              </p>
              <div className="flex gap-2 px-6 py-5 mt-2">
                <button onClick={() => setConfirmCancelar(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#f2f4f8', color: '#6b7280' }}>Volver</button>
                <button onClick={cancelarTareaEntera} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#e53935' }}>Cerrar sin guardar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
