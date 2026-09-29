// ============================================================
// APYMSA — Motor de tarifas de paqueterías (Paso 3 del flujo).
// Ver docs/flujo-embarque-cambios.md §6.
//
// Tarifas REALES tomadas del cotizador maestro APYMSA
// (Cotizador de Paqueterías.html, sep-2026). Todas SIN IVA (los tarifarios
// oficiales están sin IVA; el IVA se suma aparte al facturar). Se modelan
// las paqueterías más usadas por el ejercicio; el resto (Uruz, Nox, GME,
// Ruiz, Franffer, etc.) queda pendiente de portar si se necesitan.
//
// Regla del cliente (ago-2026): cualquier opción 25%+ más cara que la mejor
// se marca en rojo con advertencia — no debe usarse.
//
// Cada paquetería vive en una función encapsulada — se puede agregar / quitar
// sin afectar al resto.
// ============================================================
import { CotizacionPaqueteria, TipoPaqueteria, DocumentacionPorPedido, tipoPaqueteriaDe } from '@/lib/data';

export interface CotizadorInput {
  origen: string;
  destino: string;
  origenCoords: [number, number];
  destinoCoords: [number, number];
  distanciaKm: number;
  documentacion: DocumentacionPorPedido[];
  modoPeso: 'Consolidado' | 'CadaCajaSeparado';
  // F22 — CP de destino (opcional). Cuando existe, se aplica la cobertura
  // regional real de las paqueterías con ámbito local (Nox/GME/Ruiz/Salter/
  // Logex). Sin CP se usa la política de "cubre todo" que ya tenían.
  destinoCP?: string;
}

// ── F22: Cobertura por región (prefijos de CP) ──
// Cada paquetería regional se restringe por los primeros 2 dígitos del CP
// (aprox. estado). Este mapeo es CONSERVADOR — cuando no se pasa destinoCP
// no se filtra (retrocompatible). Sustituir por sets exhaustivos del HTML
// oficial cuando se necesite precisión municipio-por-municipio.
const CP_ESTADO = {
  BAJA_CALIFORNIA: ['21', '22', '23'], // BC + BCS
  CHIHUAHUA:       ['31', '32', '33'],
  GUERRERO:        ['39', '40', '41'],
  CHIAPAS:         ['29', '30'],
  QROO_YUCATAN:    ['77', '97'],
  PUEBLA_VER_OAX:  ['68', '69', '70', '71', '72', '73', '90', '91', '92', '93', '94', '95', '96'],
  MORELOS_GRO_OAX: ['62', '39', '40', '41', '68', '69', '70', '71'],
};

function prefijoCP(cp?: string): string | null {
  if (!cp) return null;
  const clean = cp.replace(/\D/g, '');
  return clean.length >= 2 ? clean.slice(0, 2) : null;
}

function coberturaEstado(cp: string | undefined, estados: string[]): boolean | null {
  const p = prefijoCP(cp);
  if (!p) return null; // sin CP no se puede afirmar; el caller decide
  return estados.includes(p);
}

// ── Helpers de peso / volumen ──

// Peso facturable total del embarque (max entre real y volumétrico).
function pesoTotalKg(input: CotizadorInput): number {
  let total = 0;
  input.documentacion.forEach(d => {
    if (d.tipoEnvio === 'Caja') {
      d.cajas.forEach(c => { total += c.pesoFacturable ?? c.peso; });
    } else if (d.tarima) {
      const p = d.tarima.conocePesoTotal ? d.tarima.pesoTotal ?? 0
        : (d.tarima.cajasConteo ?? []).reduce((s, x) => s + x.peso, 0);
      const vol = d.tarima.largo * d.tarima.ancho * d.tarima.alto;
      const pesoVol = (vol / 1_000_000) * d.factorVolumetrico;
      total += Math.max(p, pesoVol);
    }
  });
  return total;
}

function pesoRealTotalKg(input: CotizadorInput): number {
  let total = 0;
  input.documentacion.forEach(d => {
    if (d.tipoEnvio === 'Caja') d.cajas.forEach(c => { total += c.peso; });
    else if (d.tarima) {
      total += d.tarima.conocePesoTotal ? d.tarima.pesoTotal ?? 0
        : (d.tarima.cajasConteo ?? []).reduce((s, x) => s + x.peso, 0);
    }
  });
  return total;
}

function nCajas(input: CotizadorInput): number {
  let n = 0;
  input.documentacion.forEach(d => {
    if (d.tipoEnvio === 'Caja') n += d.cajas.length;
    else n += 1;
  });
  return n;
}

function tieneTarima(input: CotizadorInput): boolean {
  return input.documentacion.some(d => d.tipoEnvio === 'Tarima');
}

// ── Cotizadores individuales (tarifas REALES sin IVA) ──

// ESTAFETA — Terrestre, tarifario 2026 sin IVA. Zonas por km lineal.
// Ampara 30 kg; sobrepeso por kg redondeando arriba. Máx 70kg.
// Cargo $300 fijo cuando >31.5kg o dims >50×70×70cm.
function cotizarEstafeta(input: CotizadorInput): CotizacionPaqueteria {
  const km = input.distanciaKm;
  const kgFact = pesoTotalKg(input);
  const kgReal = pesoRealTotalKg(input);

  // Terrestre: base $166.69 (zonas 1-4, <=1600km), $172.87 (zonas 5-7)
  const base = km <= 1600 ? 166.69 : 172.87;
  const sobrekg = km <= 1600 ? 6.97 : 7.23;
  const pesoIncluido = 30;
  const extra = Math.max(0, Math.ceil(kgFact - pesoIncluido));
  let costo = base + extra * sobrekg;

  const desglose: { concepto: string; monto: number }[] = [
    { concepto: `Terrestre base (${pesoIncluido}kg incl.)`, monto: base },
  ];
  if (extra > 0) desglose.push({ concepto: `Sobrepeso ${extra} kg × $${sobrekg}`, monto: extra * sobrekg });

  // Cargo no manejable por banda ($300) cuando peso real >31.5kg.
  if (kgReal > 31.5) {
    costo += 300;
    desglose.push({ concepto: 'No manejable por banda', monto: 300 });
  }

  const cubierto = kgFact <= 70 && !tieneTarima(input);
  return {
    paqueteria: 'Estafeta', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '2-4 días hábiles',
    notas: cubierto
      ? [`Terrestre · ampara ${pesoIncluido}kg + $${sobrekg}/kg extra`, 'Tarifario oficial APYMSA 2026 (+ IVA)']
      : ['Fuera de cobertura: paquete > 70 kg o tarima (usar Estafeta LTL Pallet, no modelado aún)'],
    cubierto, desglose,
  };
}

// MÉXICO EXPRESS (ISG Global) — tarifario para APYMSA vigente ene-2026.
// $103.50 base ampara 30kg; sobrepeso $5/kg; +$300 tarima; +$300 pieza >100kg real.
function cotizarMexicoExpress(input: CotizadorInput): CotizacionPaqueteria {
  const kgFact = pesoTotalKg(input);
  const kgReal = pesoRealTotalKg(input);
  const base = 103.50;
  const cargoTarima = tieneTarima(input) ? 300 : 0;
  const cargoPesado = kgReal > 100 ? 300 : 0;
  const extra = Math.max(0, kgFact - 30);
  const costo = base + cargoTarima + cargoPesado + extra * 5;

  const desglose: { concepto: string; monto: number }[] = [
    { concepto: 'Base (30kg incl.)', monto: base },
  ];
  if (cargoTarima) desglose.push({ concepto: 'Cargo tarima', monto: 300 });
  if (extra > 0) desglose.push({ concepto: `Sobrepeso ${extra.toFixed(2)}kg × $5`, monto: extra * 5 });
  if (cargoPesado) desglose.push({ concepto: 'Cargo pieza pesada (>100kg)', monto: 300 });

  return {
    paqueteria: 'México Express', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '1-2 días hábiles',
    notas: ['Tarifario APYMSA 2026 (+ IVA)', kgFact > 1000 ? 'Excede 1,000kg/pieza' : 'Ampara hasta 1,000 kg/pieza'],
    cubierto: kgFact <= 1000,
    desglose,
  };
}

// MÁXIMA EXPRESS — convenio mar-2026 a feb-2027.
// $130 base ampara 40kg, $13/kg extra. Tarima $2,970 plana hasta 500kg (ocurre a ocurre).
function cotizarMaximaExpress(input: CotizadorInput): CotizacionPaqueteria {
  const kgFact = pesoTotalKg(input);
  if (tieneTarima(input)) {
    return {
      paqueteria: 'Máxima Express', tipo: 'WebService', costo: 2970, moneda: 'MXN',
      tiempoEntregaDias: '',
      notas: ['Tarima · ocurre a ocurre (mostrador a mostrador, NO a domicilio)', 'Máx 500kg · dims máx 1.10×1.10×1.60m (+ IVA)'],
      cubierto: kgFact <= 500,
      desglose: [{ concepto: 'Tarima plana (hasta 500kg)', monto: 2970 }],
    };
  }
  const base = 130;
  const extra = Math.max(0, kgFact - 40);
  const costo = base + extra * 13;
  return {
    paqueteria: 'Máxima Express', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Ampara 40kg + $13/kg sobrepeso (+ IVA)'],
    cubierto: true,
    desglose: [
      { concepto: 'Base (40kg incl.)', monto: base },
      ...(extra > 0 ? [{ concepto: `Sobrepeso ${extra.toFixed(2)}kg × $13`, monto: extra * 13 }] : []),
    ],
  };
}

// PAQUETEXPRESS — tarifario 7 rangos de KM × 6 tarifas de peso. Simplificado
// a la fila más común (Estándar, sin Zona Plus, RAD/EAD incluidos).
function cotizarPaquetexpress(input: CotizadorInput): CotizacionPaqueteria {
  const km = input.distanciaKm;
  const kg = pesoTotalKg(input);
  // Rango KM index [0..6] — límites en km: 250, 500, 1000, 1600, 2200, 2800, +∞
  const rango = km <= 250 ? 0 : km <= 500 ? 1 : km <= 1000 ? 2 : km <= 1600 ? 3
    : km <= 2200 ? 4 : km <= 2800 ? 5 : 6;
  // Tarifa T0-T6 (subtotales incluyen Zona Plus $303.63; se resta para Estándar) + RAD/EAD $20.13.
  const subtotales = [
    { max: 5,  s: [413.88, 419.13, 484.23, 498.93, 518.88, 550.38, 576.63] },  // T0
    { max: 10, s: [424.38, 445.38, 519.93, 541.98, 585.03, 637.53, 671.13] },  // T1
    { max: 20, s: [434.88, 461.13, 539.88, 597.63, 660.63, 718.38, 760.38] },  // T2
    { max: 30, s: [471.63, 503.13, 623.88, 676.38, 728.88, 786.63, 839.13] },  // T3
    { max: 40, s: [497.88, 524.13, 655.38, 692.13, 807.63, 883.23, 928.38] },  // T4
    { max: 50, s: [571.38, 608.13, 796.08, 871.68, 973.53, 1043.88, 1117.38] }, // T5
    { max: 60, s: [608.13, 653.28, 833.88, 897.93, 1033.38, 1164.63, 1238.13] },// T6
  ];
  const tarifa = subtotales.find(t => kg <= t.max) ?? subtotales[subtotales.length - 1];
  const ZONA_PLUS = 303.63;
  const RAD_EAD = 20.13;
  const costo = tarifa.s[rango] - ZONA_PLUS; // Estándar (sin Zona Plus)
  return {
    paqueteria: 'Paquetexpress', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '3-5 días',
    notas: [`Rango KM ${rango + 1}/7 · Tarifa por peso hasta ${tarifa.max}kg`, 'Cobertura Estándar (sin Zona Plus) + IVA'],
    cubierto: kg <= 60,
    desglose: [{ concepto: `Subtotal T (hasta ${tarifa.max}kg)`, monto: costo }, { concepto: 'RAD/EAD (incl.)', monto: RAD_EAD }],
  };
}

// AFIMEX — $142.84 base ampara 30kg, $20/kg extra, solo caja.
function cotizarAfimex(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  const base = 142.84;
  const extra = Math.max(0, kg - 30);
  const costo = base + extra * 20;
  return {
    paqueteria: 'Afimex', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Caja · ampara 30kg + $20/kg extra (+ IVA)'],
    cubierto: !tieneTarima(input),
    desglose: [{ concepto: 'Base (30kg incl.)', monto: base }, ...(extra > 0 ? [{ concepto: `Sobrepeso ${extra.toFixed(2)}kg × $20`, monto: extra * 20 }] : [])],
  };
}

// LA VOZ PACK — $110.34 tarifa plana, máx 30kg, solo caja.
function cotizarLaVoz(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  return {
    paqueteria: 'La Voz Pack', tipo: 'WebService', costo: 110.34, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Tarifa plana · máx 30kg por caja (+ IVA)'],
    cubierto: kg <= 30 && !tieneTarima(input),
    desglose: [{ concepto: 'Caja plana', monto: 110.34 }],
  };
}

// CORPORATIVA EXPRESS — $150.48 base + sobrepeso.
function cotizarCorporativa(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  const base = 150.48;
  const extra = Math.max(0, kg - 30);
  const costo = base + extra * 20;
  return {
    paqueteria: 'Corporativa Express', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Ampara 30kg + $20/kg extra (+ IVA)'],
    cubierto: !tieneTarima(input),
    desglose: [{ concepto: 'Base', monto: base }],
  };
}

// FRADEL — $115.31 plana.
function cotizarFradel(input: CotizadorInput): CotizacionPaqueteria {
  return {
    paqueteria: 'Fradel', tipo: 'WebService', costo: 115.31, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Tarifa plana (+ IVA)'],
    cubierto: !tieneTarima(input) && pesoTotalKg(input) <= 30,
    desglose: [{ concepto: 'Plana', monto: 115.31 }],
  };
}

// TRES GUERRAS — Caja: $/caja según km + cantidad (tarifa distinta 1-2 vs 3-100 cajas).
// Tarima: $/tarima según km (tope 4,800 km, hasta ~1000kg).
function cotizarTresGuerras(input: CotizadorInput): CotizacionPaqueteria {
  const km = input.distanciaKm;
  const kg = pesoTotalKg(input);
  if (tieneTarima(input)) {
    const tramos = [
      { max: 800,  precio: 1996.01 }, { max: 1200, precio: 2456.10 },
      { max: 1800, precio: 3224.06 }, { max: 2600, precio: 4144.23 },
      { max: 3600, precio: 5371.14 }, { max: 4800, precio: 6754.84 },
    ];
    const tramo = tramos.find(t => km <= t.max);
    return {
      paqueteria: 'Tres Guerras', tipo: 'WebService', costo: tramo?.precio ?? 0, moneda: 'MXN',
      tiempoEntregaDias: '',
      notas: [`Tarima 1×1.2×1.8m hasta 1,000kg · rango ${km}km (+ IVA)`],
      cubierto: !!tramo && kg <= 1000,
      desglose: tramo ? [{ concepto: 'Tarima plana', monto: tramo.precio }] : [],
    };
  }
  // Caja: rangos km × cantidad de cajas
  const tramos = [
    { max: 1000, p1a2: 176.99, p3a100: 164.07 },
    { max: 2000, p1a2: 178.46, p3a100: 165.23 },
    { max: 2600, p1a2: 181.40, p3a100: 167.53 },
    { max: Infinity, p1a2: 195.91, p3a100: 180.93 },
  ];
  const tramo = tramos.find(t => km <= t.max)!;
  const n = nCajas(input);
  const precioCaja = n <= 2 ? tramo.p1a2 : tramo.p3a100;
  const costo = precioCaja * n;
  return {
    paqueteria: 'Tres Guerras', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: [`Caja ${n <= 2 ? '(1-2)' : '(3-100)'} · ${km}km · $${precioCaja.toFixed(2)}/caja (+ IVA)`],
    cubierto: kg <= 40 * n,
    desglose: [{ concepto: `${n} caja(s) × $${precioCaja.toFixed(2)}`, monto: costo }],
  };
}

// GRAN CAÑÓN — Caja plana $125 hasta 40kg; Tarima $2,400 Ruta1 / $3,000 Ruta2 hasta 550kg.
// Ruta2 se aplica cuando km > 400 (heurística — la carta no lo especifica en zonas).
function cotizarGranCanon(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  if (tieneTarima(input)) {
    const ruta2 = input.distanciaKm > 400;
    const costo = ruta2 ? 3000 : 2400;
    return {
      paqueteria: 'Gran Cañón', tipo: 'WebService', costo, moneda: 'MXN',
      tiempoEntregaDias: '',
      notas: [`Tarima 100×120×170cm · hasta 550kg · Ruta ${ruta2 ? '2 (>400km)' : '1 (≤400km)'} (+ IVA)`],
      cubierto: kg <= 550,
      desglose: [{ concepto: `Tarima Ruta ${ruta2 ? '2' : '1'}`, monto: costo }],
    };
  }
  const costo = 125 * nCajas(input);
  return {
    paqueteria: 'Gran Cañón', tipo: 'WebService', costo, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Caja o atado hasta 40kg · $125/caja (+ IVA)'],
    cubierto: kg <= 40 * nCajas(input),
    desglose: [{ concepto: `${nCajas(input)} caja(s) × $125`, monto: costo }],
  };
}

// URUZ — Caja por rangos de peso (TA-TE) y km (0-400 o 401-2400). Simplificado
// a los dos rangos km × TA-TE plana; Tarifa H (>40kg) queda pendiente.
function cotizarUruz(input: CotizadorInput): CotizacionPaqueteria {
  const km = input.distanciaKm;
  const kg = pesoTotalKg(input);
  if (tieneTarima(input) || kg > 40) {
    return {
      paqueteria: 'Uruz', tipo: 'WebService', costo: 0, moneda: 'MXN',
      cubierto: false,
      notas: ['Tarima o >40kg requieren Tarifa H — pendiente de portar'],
    };
  }
  const tarifa = km <= 400 ? 74.04 : 101.38;
  const costo = tarifa * nCajas(input);
  return {
    paqueteria: 'Uruz', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: [`Caja hasta 40kg · rango ${km <= 400 ? '0-400' : '401-2400'} km · $${tarifa.toFixed(2)}/caja (+ IVA)`],
    cubierto: km <= 2400,
    desglose: [{ concepto: `${nCajas(input)} caja(s) × $${tarifa.toFixed(2)}`, monto: costo }],
  };
}

// SALDIMEX — $133.90 plana.
function cotizarSaldimex(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  return {
    paqueteria: 'Saldimex', tipo: 'WebService', costo: 133.90, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Tarifa plana por caja (+ IVA)'],
    cubierto: !tieneTarima(input) && kg <= 30,
    desglose: [{ concepto: 'Plana', monto: 133.90 }],
  };
}

// RUMPAQ — $112.65 plana hasta 30kg.
function cotizarRumpaq(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  return {
    paqueteria: 'Rumpaq', tipo: 'WebService', costo: 112.65, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Guía plana · máx 30kg (+ IVA)'],
    cubierto: kg <= 30 && !tieneTarima(input),
    desglose: [{ concepto: 'Guía plana', monto: 112.65 }],
  };
}

// NOX — Servicio Estatal $152.88 base (ampara 25kg, $7.40/kg extra), o Servicio
// Regional (BC-BCS-BC) $258.55 base ($14.10/kg). Solo Península de Baja California.
function cotizarNox(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  const pesoIncluido = 25;
  // Sin conocer zonas concretas de CP, ofrecemos el estatal como default.
  const base = 152.88;
  const perKg = 7.40;
  const extra = Math.max(0, kg - pesoIncluido);
  const costo = base + extra * perKg;
  return {
    paqueteria: 'Nox', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Servicio Estatal · ampara 25kg + $7.40/kg extra (+ IVA)', 'Solo Península de Baja California'],
    cubierto: !tieneTarima(input) && (coberturaEstado(input.destinoCP, CP_ESTADO.BAJA_CALIFORNIA) ?? true),
    desglose: [{ concepto: 'Base', monto: base }, ...(extra > 0 ? [{ concepto: `Sobrepeso ${extra.toFixed(2)}kg × $7.40`, monto: extra * perKg }] : [])],
  };
}

// FRANFFER — Local $153.70 misma zona; Cruzada $254.40 zona-a-zona. Ampara 30kg +$14.84/kg.
// Sin conocer zonas de CP, asumimos Local para distancias ≤300km, Cruzada más allá.
function cotizarFranffer(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  const cruzada = input.distanciaKm > 300;
  const base = cruzada ? 254.40 : 153.70;
  const extra = Math.max(0, kg - 30);
  const costo = base + extra * 14.84;
  return {
    paqueteria: 'Franffer', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: [`Zona ${cruzada ? 'Cruzada (>300km)' : 'Local (≤300km)'} · ampara 30kg + $14.84/kg (+ IVA)`],
    cubierto: !tieneTarima(input) && (coberturaEstado(input.destinoCP, CP_ESTADO.PUEBLA_VER_OAX) ?? true),
    desglose: [{ concepto: `Base ${cruzada ? 'Cruzada' : 'Local'}`, monto: base }],
  };
}

// MENSAJERÍA EXPRESS (GME) — Solo Chihuahua/Cd. Juárez. Base $120.69 (Normal) o
// $250 (Cd. Juárez), ampara 20kg + $5/kg extra.
function cotizarMensajeriaExpress(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  const base = 120.69;
  const extra = Math.max(0, kg - 20);
  const costo = base + extra * 5;
  return {
    paqueteria: 'Mensajería Express', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Solo Chihuahua · ampara 20kg + $5/kg (+ IVA)', 'Tarifa Cd. Juárez $250'],
    cubierto: !tieneTarima(input) && (coberturaEstado(input.destinoCP, CP_ESTADO.CHIHUAHUA) ?? true),
    desglose: [{ concepto: 'Base Chihuahua', monto: base }],
  };
}

// PAQUETERÍA RUIZ — Solo Guerrero. Tarifa plana $129.38 General, $410 Tlapa. Máx 30kg.
function cotizarPaqueteriaRuiz(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  return {
    paqueteria: 'Paquetería Ruiz', tipo: 'WebService', costo: 129.38, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Solo Guerrero (Costa Chica/Grande/Montaña) · plana hasta 30kg (+ IVA)', 'Tlapa $410'],
    cubierto: kg <= 30 && !tieneTarima(input) && (coberturaEstado(input.destinoCP, CP_ESTADO.GUERRERO) ?? true),
    desglose: [{ concepto: 'Plana General', monto: 129.38 }],
  };
}

// SALTER — Sur (Guerrero/Morelos/Oaxaca). Base varía por sucursal de origen
// ($137/$160/$185). Ampara 30kg + $9/kg extra sobre peso volumétrico (÷5000).
function cotizarSalter(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  const base = 160; // promedio como default
  const extra = Math.max(0, kg - 30);
  const costo = base + extra * 9;
  return {
    paqueteria: 'Salter', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Guerrero/Morelos/Oaxaca · $137-$185 según origen · ampara 30kg + $9/kg (+ IVA)'],
    cubierto: !tieneTarima(input) && (coberturaEstado(input.destinoCP, CP_ESTADO.MORELOS_GRO_OAX) ?? true),
    desglose: [{ concepto: 'Base (promedio origen)', monto: base }],
  };
}

// LOGEX — Chiapas ($106.88 plana, 35kg, $15/kg extra) o Cancún ($122.28 Z1 / $211.76 Z2 hasta 30kg).
function cotizarLogex(input: CotizadorInput): CotizacionPaqueteria {
  const kg = pesoTotalKg(input);
  const base = 106.88;
  const extra = Math.max(0, kg - 35);
  const costo = base + extra * 15;
  return {
    paqueteria: 'Logex', tipo: 'WebService', costo: Math.round(costo * 100) / 100, moneda: 'MXN',
    tiempoEntregaDias: '',
    notas: ['Zona Chiapas · ampara 35kg + $15/kg (+ IVA)', 'Cancún: $122.28 Z1 / $211.76 Z2 hasta 30kg'],
    cubierto: !tieneTarima(input) && (
      coberturaEstado(input.destinoCP, CP_ESTADO.CHIAPAS) ?? coberturaEstado(input.destinoCP, CP_ESTADO.QROO_YUCATAN) ?? true
    ),
    desglose: [{ concepto: 'Base Chiapas', monto: base }],
  };
}

// UBER — servicio local (≤50 km). No está en el tarifario oficial (es un
// servicio API). Estimación por distancia (mock — la API real de Uber Direct
// devuelve el precio en tiempo real; ver cotizador real con endpoint webservice).
function cotizarUber(input: CotizadorInput): CotizacionPaqueteria {
  const costo = Math.round((60 + input.distanciaKm * 10) * 100) / 100;
  const cubierto = input.distanciaKm <= 50;
  return {
    paqueteria: 'Uber', tipo: 'Uber', costo, moneda: 'MXN',
    tiempoEntregaDias: '2-4 horas',
    notas: cubierto
      ? ['Servicio API en tiempo real — MOCK (integración pendiente)', 'Tracking en tiempo real', 'Solo local (≤50 km)']
      : ['Fuera de cobertura Uber (>50 km)'],
    cubierto,
  };
}

// BLUEGO — igual que Uber (API), cobertura local ≤60 km.
function cotizarBlueGo(input: CotizadorInput): CotizacionPaqueteria {
  const costo = Math.round((50 + input.distanciaKm * 9) * 100) / 100;
  const cubierto = input.distanciaKm <= 60;
  return {
    paqueteria: 'BlueGo', tipo: 'BlueGo', costo, moneda: 'MXN',
    tiempoEntregaDias: '2-6 horas',
    notas: cubierto
      ? ['Servicio API — MOCK (integración pendiente)', 'Tracking en tiempo real', 'Solo local (≤60 km)']
      : ['Fuera de cobertura BlueGo (>60 km)'],
    cubierto,
  };
}

// TRANSPORTE INTERNO — flota propia APYMSA entre sucursales del ejercicio.
function cotizarTransporteInterno(_input: CotizadorInput): CotizacionPaqueteria {
  return {
    paqueteria: 'Transporte interno', tipo: 'Manual', costo: 100, moneda: 'MXN',
    tiempoEntregaDias: 'Siguiente día laboral',
    notas: ['Flota propia APYMSA · solo entre sucursales del ejercicio'],
    cubierto: true,
  };
}

const COTIZADORES = [
  cotizarEstafeta, cotizarMexicoExpress, cotizarMaximaExpress, cotizarPaquetexpress,
  cotizarTresGuerras, cotizarGranCanon, cotizarUruz, cotizarSaldimex,
  cotizarAfimex, cotizarLaVoz, cotizarCorporativa, cotizarFradel, cotizarRumpaq,
  cotizarNox, cotizarFranffer, cotizarMensajeriaExpress,
  cotizarPaqueteriaRuiz, cotizarSalter, cotizarLogex,
  cotizarUber, cotizarBlueGo, cotizarTransporteInterno,
];

// Ordena las paqueterías cubiertas de menor a mayor costo y aplica la regla
// APYMSA del 25%: cualquier opción 25%+ más cara que la mejor se marca "muy cara".
export function cotizarTodas(input: CotizadorInput): CotizacionPaqueteria[] {
  // F75: desempate por tiempo estimado (menor > mayor > desconocido).
  const scoreTiempo = (c: CotizacionPaqueteria): number => {
    const t = (c.tiempoEntregaDias ?? '').toLowerCase();
    if (t.includes('mismo día') || t.includes('horas')) return 0.5;
    const m = t.match(/(\d+)\s*-?\s*(\d+)?\s*días?/);
    if (m) return Number(m[2] ?? m[1]);
    return 99;
  };
  const cubiertas = COTIZADORES
    .map(fn => fn(input))
    .filter(c => c.cubierto)
    .sort((a, b) => a.costo === b.costo ? scoreTiempo(a) - scoreTiempo(b) : a.costo - b.costo);
  if (cubiertas.length === 0) return [];
  const mejor = cubiertas[0].costo;
  return cubiertas.map(c => {
    const ratio = mejor > 0 ? c.costo / mejor : 1;
    if (ratio >= 1.25) {
      return { ...c, muyCara: true, advertencia: `${Math.round((ratio - 1) * 100)}% más cara que la mejor opción — no recomendada` };
    }
    return c;
  });
}

export { tipoPaqueteriaDe };

// ── Helpers geográficos ──

export function distanciaHaversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RutaOsrm {
  distanciaKm: number;
  tiempoMin: number;
  coords: [number, number][];
}
export async function obtenerRutaOSRM(
  origen: [number, number],
  destino: [number, number],
): Promise<RutaOsrm> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origen[1]},${origen[0]};${destino[1]},${destino[0]}?overview=full&geometries=geojson`;
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('OSRM ' + r.status);
    const data = await r.json();
    const route = data.routes?.[0];
    if (!route) throw new Error('sin ruta');
    const coords: [number, number][] = (route.geometry.coordinates as [number, number][]).map(([lon, lat]) => [lat, lon]);
    return {
      distanciaKm: Number((route.distance / 1000).toFixed(1)),
      tiempoMin: Math.round(route.duration / 60),
      coords,
    };
  } catch {
    return {
      distanciaKm: Number(distanciaHaversineKm(origen, destino).toFixed(1)),
      tiempoMin: 0,
      coords: [origen, destino],
    };
  }
}

// ── Stubs mock API — Uber / BlueGo / Estafeta ──
// El usuario confirmó (sep-2026) que estas integraciones son MOCK: no hay
// credenciales/endpoints reales todavía. Simulamos la llamada devolviendo
// un id de trámite tras un delay corto. Cuando lleguen las credenciales,
// reemplazar el cuerpo por un fetch al endpoint real.

export async function mockGenerarGuiaEstafeta(embarqueId: string): Promise<{ guiaId: string }> {
  // TODO(prod): fetch POST a /estafeta/webservice/guias con auth Bearer
  console.log('[MOCK] Estafeta: solicitud de guía para embarque', embarqueId);
  await new Promise(r => setTimeout(r, 800));
  const folio = 'EST-' + Date.now().toString().slice(-10);
  return { guiaId: folio };
}

export async function mockSolicitarUber(embarqueId: string, destino: string): Promise<{ uberId: string }> {
  // TODO(prod): fetch POST a Uber Direct API con auth OAuth2
  console.log('[MOCK] Uber Direct: solicitud para', embarqueId, '→', destino);
  await new Promise(r => setTimeout(r, 600));
  return { uberId: 'UBR-' + Math.random().toString(36).slice(2, 10).toUpperCase() };
}

export async function mockSolicitarBlueGo(embarqueId: string, destino: string): Promise<{ solicitudId: string }> {
  // TODO(prod): fetch POST al webhook BlueGo con auth Basic
  console.log('[MOCK] BlueGo: solicitud para', embarqueId, '→', destino);
  await new Promise(r => setTimeout(r, 600));
  return { solicitudId: 'BLU-' + Math.random().toString(36).slice(2, 10).toUpperCase() };
}
