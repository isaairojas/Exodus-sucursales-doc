# Refactor del flujo de EMBARQUE — Especificación de cambios

> **Propósito**: consolidar en un único documento **toda la información necesaria**
> para reescribir el flujo de embarque, la documentación de cajas, el cotizador
> de paqueterías y los estados intermedios del traspaso.
> Este documento es la **fuente de verdad** durante la implementación. Toda
> ambigüedad debe resolverse aquí antes de tocar código.

---

## 0. Contexto

Hoy el traspaso pasa por: `Pendiente → Surtido → Revisado → Documentado → Enviado → Recibido/Entregado`.
Con el refactor se introduce un nivel más de granularidad (Embarcado, Entregado a paquetería, Reparto finalizado) y una separación por **tipo de paquetería** con reglas propias. Además, en el módulo de Embarques se agrega el flujo de **documentación de cajas + cotizador con mapa**.

Este refactor toca:
- `client/src/lib/data.ts` (modelo).
- `client/src/contexts/AppContext.tsx` (handlers).
- `client/src/components/ScreenTraspasos.tsx` (cards, columna Estatus, botones).
- `client/src/components/ScreenEmbarques.tsx` (columnas, botones, pipeline visual).
- Nuevos modales para: pesado de cajas, cotizador, mapa.
- Datos demo.
- Documento de referencia: `especificacion-flujo-embarque-paqueterias.md` (Downloads del usuario).

---

## 1. Decisiones tomadas por el usuario

1. **Mapa y ruteo**: **Opción B — Leaflet + OSRM** (OpenStreetMap público, sin API key).
2. **Cobertura y tarifas**: se usará la **información real del documento** de paqueterías. Cualquier dato faltante se levantará como duda al usuario.
3. **Estado `Embarcado`**: se maneja como **card separada** en `ScreenTraspasos` (nueva card entre "Pendiente revisión" y "Pendientes por envío" — ver §7).
4. **Solicitud de reparto (Uber/BlueGo)**: el módulo de embarques **ya** implementa modales específicos. **No** se cambia la solicitud; se **reutiliza**.
5. **Monitores/etapas del embarque** (6 en total, en orden estricto):
   1. **Elaboración de embarque iniciado**
   2. **Elaboración de embarque finalizado**
   3. **Pesado de cajas iniciado**
   4. **Pesado de cajas finalizado**
   5. **Reparto iniciado**
   6. **Reparto finalizado**
   → No se agregan más monitores. La UI decide qué mostrar según el flujo.
6. **UI de Embarques**: también se refactoriza (columnas, botones, pipeline).
7. **Documento .md** (este archivo): primera actividad **antes** de codificar.

---

## 2. Nueva máquina de estados del **Traspaso**

### 2.1 Estados por orden

```
Pendiente
  → Surtido
     → Revisado
        → Embarcado                (NUEVO — traspaso agregado a un embarque, sin pesado)
           → Documentado           (embarque con cajas pesadas y paquetería seleccionada)
              → Entregado a paquetería    (RENOMBRE: antes "Enviado" / "En reparto")
                 → Reparto finalizado     (NUEVO — la paquetería/chofer entregó al cliente)
                    → Recibido           (confirmación de recepción del destinatario)
```

### 2.2 Estados especiales
- `Cancelado`
- `Rechazado`
- `Draft` (solicitudes CEDIS pendientes de token)
- `Unificado` (solicitudes CEDIS absorbidas por Reabasto)

### 2.3 Regla de transición por tipo de paquetería

| Tipo de paquetería | Cómo pasa de "Documentado" a "Entregado a paquetería" | Cómo pasa a "Reparto finalizado" |
|---|---|---|
| **Uber / BlueGo** | Automático al *solicitar reparto* (reutiliza modal existente) | Automático desde webhook simulado (mock cambio de status del pedido) |
| **Web service** (Estafeta, DHL, FedEx…) | Automático al *generar guía* (nuevo paso en la ventana de embarque) | Manual — botón "Confirmar reparto finalizado" |
| **Manual** (Transporte interno) | Manual — botón "Entregado a paquetería" | Manual — botón "Confirmar reparto finalizado" |

### 2.4 Mapeo de estados actuales del `Shipment` con la nueva nomenclatura

| Antes (`ShipmentStatus`) | Ahora | Nota |
|---|---|---|
| `Generado` | `Generado` | Embarque creado, sin pesado |
| `Solicitado` | `Solicitado` | Uber/BlueGo — reparto solicitado, en espera de recolección |
| `En tránsito` | (Sin cambio conceptual) | Recolección hecha, en camino |
| **`En reparto`** | **`Entregado a paquetería`** | 🔴 RENOMBRE — hay que migrar todos los usos en código y UI. |
| `Entregado` | `Entregado` | Fin del ciclo |

**Migración**: en el reducer de carga del estado compartido, cualquier shipment con `status: 'En reparto'` se remapea silenciosamente a `'Entregado a paquetería'` para no romper la base existente.

### 2.5 Relación traspaso ↔ shipment ↔ monitores

Un traspaso individual va pasando por los monitores del embarque al que pertenece. Cuando el embarque llega al monitor N, todos sus traspasos avanzan al estado correspondiente:

| Monitor embarque | Traspaso avanza a | Se dispara por |
|---|---|---|
| 1. Elaboración embarque iniciado | `Embarcado` | Crear embarque desde el flujo post-revisión (ya implementado) |
| 2. Elaboración embarque finalizado | `Embarcado` (sigue) | Cerrar la configuración del embarque (pedidos ya asociados) |
| 3. Pesado de cajas iniciado | `Embarcado` (sigue) | Abrir modal de documentación de cajas por primera vez |
| 4. Pesado de cajas finalizado | `Documentado` | Aceptar cotización + guardar paquetería seleccionada |
| 5. Reparto iniciado | `Entregado a paquetería` | Según paquetería (ver §2.3) |
| 6. Reparto finalizado | `Reparto finalizado` | Según paquetería (ver §2.3) |

> Los monitores 1–4 se disparan casi automáticamente en el flujo actual; el foco visible del usuario está en Pesado (3–4) y Reparto (5–6).

---

## 3. Cambios en `client/src/lib/data.ts`

### 3.1 Tipo `TraspasoStatus`

**ANTES**:
```ts
export type TraspasoStatus =
  | 'Pendiente' | 'Surtido' | 'Revisado' | 'Documentado'
  | 'Enviado' | 'Recibido' | 'Entregado' | 'Cancelado';
```

**DESPUÉS**:
```ts
export type TraspasoStatus =
  | 'Pendiente'
  | 'Surtido'
  | 'Revisado'
  | 'Embarcado'              // NUEVO
  | 'Documentado'
  | 'EntregadoAPaqueteria'   // NUEVO (renombre lógico de 'Enviado' cuando ya llegó a la paquetería)
  | 'RepartoFinalizado'      // NUEVO
  | 'Recibido'
  | 'Entregado'
  | 'Cancelado';
```

- El status `'Enviado'` **se conserva** internamente por retro-compatibilidad de datos existentes, pero **no** aparece en la UI: al leer del snapshot, se remapea a `'EntregadoAPaqueteria'` si el shipment está en el estado equivalente.

### 3.2 `TRASPASO_STATUS_POR_TIPO`

Se amplía el arreglo por perspectiva:

```ts
export const TRASPASO_STATUS_POR_TIPO = {
  Entrante: ['Pendiente','Surtido','Revisado','Embarcado','Documentado','EntregadoAPaqueteria','RepartoFinalizado','Recibido'],
  Saliente: ['Pendiente','Surtido','Revisado','Embarcado','Documentado','EntregadoAPaqueteria','RepartoFinalizado','Entregado'],
};
```

- **Impacto**: el pipeline visual (barritas) crece de 5 → 8 pasos. Habrá que revisar el `maxWidth: 46` (que ahora se llenaba con 5 barras de 4px) para acomodar 8 barras — probablemente `maxWidth: 70` u optar por reducir el ancho de cada barra a 3px.

### 3.3 Tipo `ShipmentStatus`

**ANTES**:
```ts
export type ShipmentStatus = 'Generado' | 'Solicitado' | 'En tránsito' | 'En reparto' | 'Entregado';
```

**DESPUÉS**:
```ts
export type ShipmentStatus =
  | 'Generado'
  | 'Solicitado'
  | 'En tránsito'
  | 'Entregado a paquetería' // RENOMBRE (antes "En reparto")
  | 'Entregado';
```

### 3.4 Nuevo tipo `TipoPaqueteria`

```ts
export type TipoPaqueteria = 'Uber' | 'BlueGo' | 'WebService' | 'Manual';

// Mapa fijo entre nombre textual de paquetería y su tipo funcional.
export const PAQUETERIA_TIPO: Record<string, TipoPaqueteria> = {
  'Uber':               'Uber',
  'BlueGo':             'BlueGo',
  'Estafeta':           'WebService',
  'DHL':                'WebService',
  'FedEx':              'WebService',
  'Paquetexpress':      'WebService',
  'Transporte interno': 'Manual',
  '99 Minutos':         'WebService',
};

export function tipoPaqueteriaDe(nombre: string): TipoPaqueteria {
  return PAQUETERIA_TIPO[nombre] ?? 'Manual';
}
```

### 3.5 Ampliar `Shipment` con datos de pesado/cotización

```ts
// Extensión del modelo BoxItem existente.
export interface BoxItem {
  id: string;
  pedidoId: string;
  peso: number;   // kg (peso real)
  largo?: number; // cm
  ancho?: number; // cm
  alto?: number;  // cm
  // NUEVO
  volumen?: number;         // cm³ (calculado)
  pesoVolumetrico?: number; // kg (calculado)
  pesoFacturable?: number;  // kg (max(peso real, volumétrico))
}

// NUEVO: bloque de documentación por pedido dentro del shipment.
export interface DocumentacionPorPedido {
  pedidoId: string;
  tipoEnvio: 'Caja' | 'Tarima';
  cantidadCajas: number;                    // solo si tipoEnvio = Caja
  factorVolumetrico: number;                // kg/m³ (default 250 configurable)
  modoPeso: 'Consolidado' | 'CadaCajaSeparado';
  cajas: BoxItem[];                          // si tipoEnvio = Caja
  tarima?: {                                 // si tipoEnvio = Tarima
    conocePesoTotal: boolean;
    pesoTotal?: number;                      // si conocePesoTotal = true
    cajasConteo?: { peso: number }[];        // si conocePesoTotal = false
    largo: number; ancho: number; alto: number;
  };
}

// NUEVO: resultado del cotizador.
export interface CotizacionPaqueteria {
  paqueteria: string;
  tipo: TipoPaqueteria;
  costo: number;
  moneda: 'MXN';
  tiempoEntregaDias?: string;   // ej. "2-3 días"
  notas?: string[];              // p.ej. "Cargo por recolección incluido"
  cubierto: boolean;             // false → se filtra antes de mostrar
}

// Extensión del Shipment.
export interface Shipment {
  // …campos actuales…
  documentacion?: DocumentacionPorPedido[];   // NUEVO
  paqueteriaSeleccionada?: string;             // NUEVO (nombre)
  paqueteriaCosto?: number;                    // NUEVO
  guiaId?: string;                             // NUEVO — para Web Service
  fechaEntregaAPaqueteria?: string;             // NUEVO — timestamp del monitor 5
  fechaRepartoFinalizado?: string;              // NUEVO — timestamp del monitor 6
  // ruta/mapa (para persistir el mapa entre visitas)
  ruta?: {
    origenCoords: [number, number];
    destinoCoords: [number, number];
    distanciaKm: number;
    tiempoMin?: number;
  };
}
```

### 3.6 Coordenadas por sucursal (Fase 1)

Necesarias para el mapa. Se agrega un mapa fijo con las 4 sucursales + CEDIS.

```ts
export const SUCURSAL_COORDS: Record<string, [number, number]> = {
  'Federalismo':    [20.6800, -103.3500],
  'Tesistán':       [20.7333, -103.4333],
  'Adolf Horn':     [20.5844, -103.4675],
  'Colón':          [20.6500, -103.3800],
  'CEDIS':          [20.7100, -103.4400], // aproximado
};
```

---

## 4. Cambios en `client/src/contexts/AppContext.tsx`

### 4.1 Nuevos handlers

```ts
// Al aceptar el pesado + cotización:
guardarDocumentacionEmbarque(embarqueId: string, doc: DocumentacionPorPedido[], cotizacion: CotizacionPaqueteria): void
```
- Persiste `documentacion`, `paqueteriaSeleccionada`, `paqueteriaCosto`.
- Pasa el status del shipment a "Generado" → sigue igual (los monitores 3 y 4 se disparan aquí).
- Para cada traspaso del embarque: `status: 'Documentado'`.

```ts
generarGuiaPaqueteria(embarqueId: string): string
```
- Solo aplica si `tipoPaqueteriaDe(embarque.paqueteria) === 'WebService'`.
- Simula la generación de guía → asigna un `guiaId` random.
- Pasa el shipment a "Entregado a paquetería" y los traspasos a `EntregadoAPaqueteria`.
- Registra `fechaEntregaAPaqueteria`.

```ts
confirmarEntregadoAPaqueteriaManual(embarqueId: string): void
```
- Solo aplica si tipo es "Manual".
- Pasa el shipment a "Entregado a paquetería" y traspasos a `EntregadoAPaqueteria`.
- Registra `fechaEntregaAPaqueteria`.

```ts
confirmarRepartoFinalizado(embarqueId: string): void
```
- Aplica a `Manual` y `WebService` (Uber/BlueGo se actualiza vía webhook mock).
- Traspasos → `RepartoFinalizado`.
- Registra `fechaRepartoFinalizado`.

```ts
solicitarRepartoUber(embarqueId: string, data: UberData): void
solicitarRepartoBlueGo(embarqueId: string, data: BlueGoData): void
```
- REUTILIZAR los ya existentes (según el usuario).
- Al terminar → pasan a `EntregadoAPaqueteria` automáticamente.

### 4.2 Migración silenciosa

En el reducer que carga el snapshot compartido:

```ts
// Migrar shipments con estado antiguo.
newShipments = newShipments.map(s =>
  s.status === 'En reparto' ? { ...s, status: 'Entregado a paquetería' } : s
);
```

---

## 5. Modal nuevo: **Documentación de cajas / tarimas** (Paso 2 del md)

**Ubicación**: nueva ventana disparada desde la vista de embarques al hacer click en un embarque en estado "Generado" que aún no tiene documentación.

### 5.1 UI (por pedido dentro del embarque)

Para cada pedido asociado al embarque:
1. Selector **Tipo de envío**: `Caja` / `Tarima`.
2. Si `Caja`:
   - Input **Cantidad de cajas** (entero ≥ 1). Al cambiar, se generan/quitan filas.
   - Input **Factor volumétrico** (default 250, editable).
   - Tabla dinámica de N filas con: `Peso (kg)`, `Largo`, `Ancho`, `Alto` (todos numéricos ≥ 0).
   - Debajo, cálculo en vivo del peso volumétrico y peso facturable por caja.
3. Si `Tarima`:
   - Pregunta `¿Conoces el peso total de la tarima?` (radio Sí/No).
   - Si Sí → input `Peso total (kg)`.
   - Si No → tabla dinámica de cajas dentro de la tarima con solo peso; se suma.
   - Inputs `Largo`, `Ancho`, `Alto` de la tarima (obligatorios en ambos casos).

### 5.2 Modo de peso (aplica al embarque, no al pedido)

Si el embarque tiene más de un pedido/tarima:
- Radio `Peso consolidado` / `Cada caja por separado`.

### 5.3 Botón principal

`Continuar a cotización` → valida:
- Al menos un pedido con al menos una caja/tarima.
- Todos los pesos y dimensiones > 0.
- Modo separado → ninguna caja sin datos.

Si pasa → dispara Paso 3 (cotizador).

### 5.4 Fórmulas

```
volumen_cm3        = largo × ancho × alto
peso_volumetrico   = (volumen_cm3 / 1_000_000) × factor_volumetrico
peso_facturable    = max(peso_real, peso_volumetrico)
```

---

## 6. Modal nuevo: **Cotizador con mapa** (Paso 3 del md)

### 6.1 UI

**Layout de 2 columnas**:
- **Izquierda**: mapa (Leaflet) con marcadores origen/destino y polilínea de la ruta. Distancia (km) y tiempo estimado (min) debajo.
- **Derecha**: lista de paqueterías ordenada por costo ascendente. Cada tarjeta:
  - Nombre de la paquetería.
  - Costo total (MXN).
  - Tiempo de entrega estimado (si aplica).
  - Notas.
  - Botón **Seleccionar** (radio o botón individual).
- Botón principal `Aceptar cotización` (deshabilitado hasta que haya una seleccionada).

### 6.2 Motor de tarifas

Un módulo `client/src/lib/paqueterias/` con una función por paquetería:

```ts
// client/src/lib/paqueterias/estafeta.ts
export function cotizarEstafeta(input: CotizadorInput): CotizacionPaqueteria { … }

// client/src/lib/paqueterias/dhl.ts
export function cotizarDhl(input: CotizadorInput): CotizacionPaqueteria { … }

// index.ts
export const PAQUETERIAS_COTIZADORES = [cotizarEstafeta, cotizarDhl, cotizarUber, …];
```

- Cada función decide si cubre la ruta y calcula el costo.
- **Datos de tarifas**: los define el documento de referencia del usuario (`especificacion-flujo-embarque-paqueterias.md`). Si el documento no da tarifas exactas por paquetería, se pedirá al usuario (levantado en §11).

### 6.3 Recalculo sin recargar el mapa

Cuando el usuario cambia una opción que NO afecta al mapa (p. ej. cambia el modo de peso), se recalculan tarifas sin redibujar el mapa.

### 6.4 Librerías nuevas a instalar

- `leaflet` (mapa)
- `react-leaflet` (integración con React)
- Se usará **OSRM público** (`https://router.project-osrm.org/route/v1/driving/…`) para calcular la polilínea de la ruta.

---

## 7. Cambios en `client/src/components/ScreenTraspasos.tsx`

### 7.1 Cards (grupo superior)

**ANTES** (5 cards en Por enviar):
```
Pendientes por surtir · Pendiente revisión · Pendientes por envío · Enviados · Finalizados · Rechazados/Cancelados
```

**DESPUÉS** (agregar card "Embarcados sin documentar"):
```
Pendientes por surtir · Pendiente revisión · Pendientes por envío ·
[Embarcados sin documentar]  ← NUEVA
Enviados · Finalizados · Rechazados/Cancelados
```

- Filtro de la nueva card: `t.status === 'Embarcado'` (o `Documentado` sin `guiaId` / sin confirmación).
- Icono sugerido: `inventory_2` en naranja.

**Renombrar "Enviados"**: puede ser oportuno renombrarla a **"Entregados a paquetería"**. Confirmar (§11).

### 7.2 Columna "Estatus"

- Pipeline visual crece a **8 pasos** (ver §3.2).
- Ajustar el ancho del contenedor (`maxWidth: 46` era para 5) → `maxWidth: 70` o reducir cada barra de 4px a 3px.

### 7.3 Botón "Embarcar"

Ya tiene la validación de embarques compatibles (implementado). Se mantiene, pero al terminar el flujo el traspaso queda en `Embarcado` (no en `Documentado`).

### 7.4 Nuevos botones en la barra de acciones

Según el estatus del traspaso seleccionado:

| Status del traspaso | Botón habilitado |
|---|---|
| `Revisado` | Embarcar |
| `Embarcado` | Documentar (abre modal de pesado) |
| `Documentado` + tipo Uber/BlueGo | Solicitar reparto (reutiliza modal existente) |
| `Documentado` + tipo WebService | Generar guía |
| `Documentado` + tipo Manual | Entregado a paquetería |
| `EntregadoAPaqueteria` + tipo WebService/Manual | Confirmar reparto finalizado |
| `RepartoFinalizado` (Entrante) | Dar entrada al inventario |

### 7.5 Columna "Embarque" (ya implementada)

Sin cambios. La celda ya muestra el `#EM0000042` o "Sin embarque".

---

## 8. Cambios en `client/src/components/ScreenEmbarques.tsx`

⚠️ **Este archivo no lo he inspeccionado**. Antes de tocarlo, se revisará su estructura actual. Cambios previstos:

### 8.1 Pipeline visual del embarque

Mostrar los **6 monitores** (§1):
1. Elaboración iniciado
2. Elaboración finalizado
3. Pesado iniciado
4. Pesado finalizado
5. Reparto iniciado
6. Reparto finalizado

### 8.2 Botones por estado + tipo de paquetería

Los mismos criterios de §7.4, pero disparados desde el embarque (afecta a todos sus traspasos a la vez).

### 8.3 Botón "Documentar" dentro del embarque

Abre el modal §5 → §6 (documentación + cotizador).

### 8.4 Botón "Generar guía"

Solo cuando `tipo === 'WebService'`. Al pulsar, actualiza monitores 5 → 6 y refresca la tabla.

### 8.5 Botón "Entregado a paquetería" (manual)

Solo cuando `tipo === 'Manual'` y el shipment está en "Generado".

### 8.6 Botón "Reparto finalizado" (manual/WebService)

Cuando el shipment está en "Entregado a paquetería".

---

## 9. Datos demo

### 9.1 Coordenadas

Ya listadas en §3.6.

### 9.2 Tarifas mock por paquetería

Requiere el documento del usuario (§11 duda 1). Por ahora, arranco con:
- Estafeta: costo base 150 MXN + 20 MXN/kg.
- DHL: costo base 200 MXN + 25 MXN/kg.
- FedEx: costo base 220 MXN + 24 MXN/kg.
- Paquetexpress: costo base 130 MXN + 18 MXN/kg.
- 99 Minutos: costo base 90 MXN + 15 MXN/kg (solo entrega local <20 km).
- Uber: cobertura solo local <50 km, tarifa por distancia.
- BlueGo: idem.
- Transporte interno: 100 MXN fijo, solo entre sucursales del ejercicio.

Todos con nota "**Tarifa mock — pendiente de tabla real**".

### 9.3 Nuevos escenarios

- 1 traspaso `Embarcado` sin documentar (para probar la nueva card).
- 1 embarque `Manual` en "Entregado a paquetería" pendiente de confirmar finalización.
- 1 embarque `WebService` con guía generada.
- 1 embarque `Uber` en tránsito.

---

## 10. Fases de implementación

Orden recomendado, con verificación entre cada fase:

| # | Fase | Contenido | Riesgo |
|---|---|---|---|
| **F1** | Modelo | Nuevos tipos, migración `En reparto → Entregado a paquetería`, coordenadas, tipoPaqueteria | Bajo |
| **F2** | Card + columna Estatus en `ScreenTraspasos` | Card "Embarcados sin documentar", pipeline de 8 pasos | Bajo |
| **F3** | Handlers en `AppContext` | Los 4 nuevos + migración en reducer | Medio |
| **F4** | Modal de documentación de cajas | Pesado por pedido, modo consolidado/separado, validaciones | Medio |
| **F5** | Cotizador + mapa | Leaflet+OSRM, motor de tarifas, tarjetas ordenadas por costo | Alto |
| **F6** | Botones nuevos por status | Documentar, Generar guía, Entregado a paquetería, Reparto finalizado | Medio |
| **F7** | Refactor `ScreenEmbarques` | Pipeline de 6 monitores, botones por tipo de paquetería | Alto |
| **F8** | Datos demo + validación end-to-end | Escenarios de §9.3 | Bajo |

---

## 11. Dudas pendientes que el usuario debe resolver antes de la Fase 5

1. **Tarifas reales por paquetería**: ¿el usuario entrega la tabla de tarifas por peso y zona? Si no, ¿los valores mock del §9.2 son aceptables como punto de partida?
2. **Cobertura por paquetería**: ¿cada paquetería tiene una tabla de CPs/estados que cubre? Si no, se asume "cubre todo el ejercicio (las 4 sucursales)" excepto Uber/BlueGo (solo local <50 km).
3. **Recolección a domicilio**: ¿se contempla como opción togglable dentro del cotizador o siempre se asume "recolección en sucursal"?
4. **Multi-pedido en un embarque**: si el embarque tiene 3 pedidos y el modo es "cada caja por separado" pero solo 2 se documentan, ¿el usuario puede seguir avanzando? (Actual §5 dice que todos deben estar documentados.)
5. **Cancelación del embarque durante la documentación**: ¿se permite? ¿Cómo se refleja en los traspasos asociados?
6. **`solicitarRepartoUber`/`solicitarRepartoBlueGo`**: el usuario dice "reutilizar los ya existentes". Confirmar el nombre exacto del handler en `AppContext` para no crear duplicados.
7. **Card "Enviados" → ¿renombrar a "Entregados a paquetería"?**: consistencia semántica.
8. **Traspasos entrantes**: los estados `Embarcado / Documentado / EntregadoAPaqueteria / RepartoFinalizado / Recibido` — ¿en la vista Entrante también se ven todos, o algunos se colapsan? (P. ej. "En tránsito" en la vista del solicitante = "Entregado a paquetería" en la vista del donante).

---

## 12. Referencias

- Documento del usuario: `Downloads/especificacion-flujo-embarque-paqueterias.md` (leído en la sesión, no está en el repo).
- Documentación existente: `docs/flujos-traspasos.md` (base de la máquina de estados actual).
- Archivos afectados por el refactor:
  - `client/src/lib/data.ts`
  - `client/src/contexts/AppContext.tsx`
  - `client/src/components/ScreenTraspasos.tsx`
  - `client/src/components/ScreenEmbarques.tsx`
  - Nuevos: `client/src/components/ModalDocumentacionCajas.tsx`, `client/src/components/ModalCotizador.tsx`, `client/src/lib/paqueterias/*`.

---

## 13. Checklist de arranque (Fase 1)

- [ ] Ampliar `TraspasoStatus` con `Embarcado`, `EntregadoAPaqueteria`, `RepartoFinalizado`.
- [ ] Actualizar `TRASPASO_STATUS_POR_TIPO` (Entrante y Saliente).
- [ ] Ampliar `ShipmentStatus` con el rename.
- [ ] Agregar `TipoPaqueteria` y `PAQUETERIA_TIPO`.
- [ ] Extender `Shipment` con documentación/cotización/monitores.
- [ ] Agregar `SUCURSAL_COORDS`.
- [ ] Migración `En reparto → Entregado a paquetería` en el reducer.
- [ ] Type-check limpio.
- [ ] Verificar en `ScreenTraspasos` que el pipeline visual acomoda 8 pasos sin romperse.

Con estos 9 items cerrados, se abre la puerta a Fases F2-F8 sin bloqueos.
