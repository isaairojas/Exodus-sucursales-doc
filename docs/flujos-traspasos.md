# Flujos de Traspasos — Exodus Sucursales

> Documentación funcional de **traspasos** y de **cómo se relacionan con los pedidos de cliente**.
> Cada flujo incluye un bloque **“Prompt de diagrama”** redactado para pegarse tal cual en un
> generador de diagramas de proceso simples (pasos + decisiones). Editable: ajusta los textos y
> luego solicita los cambios sobre la plataforma.

---

## 0. Conceptos base

- **Solicitud (`solicitudId`)**: la necesidad de traspaso. Puede resolverse con **una o varias peticiones** (p. ej. cuando la mercancía se reparte entre 2 sucursales).
- **Petición (`traspaso`)**: cada movimiento concreto de una sucursal **origen** (dona/surte/envía) hacia una sucursal **destino** (solicita/recibe).
- **Modelo de dos lados**: todo traspaso tiene `sucursalOrigen` y `sucursalDestino`. Según la **sucursal seleccionada** en el selector global, la misma petición se ve como:
  - **Por recibir (Entrante)** → la sucursal actual es el **destino**.
  - **Por enviar (Saliente)** → la sucursal actual es el **origen**.
- **Pedido de cliente (`pedidoOrigen`)**: pedido web que originó la necesidad. No todos los traspasos llevan pedido (ver tabla).
- **Recepción ciega**: en traspasos de **CEDIS** no se muestra la cantidad enviada/surtida; solo se controla por **cajas** y por **vencimiento (SLA)**.

### 0.1 Tipos de traspaso y relación con el pedido

| Tipo (chip) | ¿Lleva pedido de cliente? | Quién lo origina | Recepción | Notas |
|---|---|---|---|---|
| **Automático SMC** | **Siempre con pedido** | El sistema (SMC) cuando un pedido web no tiene stock completo en una sola sucursal | Normal (por piezas) | Reparte entre sucursales cercanas |
| **Manual** (con pedido) | Con pedido | La sucursal, a mano | Normal | Complementa/atiende un pedido |
| **Manual** (sin pedido) | Sin pedido | La sucursal, a mano | Normal | Requiere **token de autorización (0000)** |
| **CEDIS · Especial** | **Con pedido** | La sucursal solicita a CEDIS | **Ciega** | Manual a CEDIS ligado a un pedido; requiere token |
| **CEDIS · Urgencia** | **Sin pedido** | La sucursal solicita a CEDIS | **Ciega** | Manual a CEDIS sin pedido; la **valida CEDIS** con token, puede tardar más |
| **CEDIS · Reabasto** | Sin pedido | **CEDIS por su cuenta** | **Ciega por cajas** | La sucursal no hace nada; llega para restock |
| **CEDIS · Reabasto/unificado** | Trae mercancía de un pedido | CEDIS | Ciega por cajas | Reabasto que **absorbió (unificó)** una solicitud CEDIS con pedido |
| **Devolución / Garantía** | Sin pedido | La sucursal envía **a CEDIS** | — (salida) | Rompe la unidireccionalidad: la sucursal también envía a CEDIS |

### 0.2 Estados

- **Etapa (columna “Estado”)**: `Sin surtir → Surtido → Revisado → Embarcado → Enviado → Recibido` (o `Cancelado`). En CEDIS: `Sin surtir → Documentado → Enviado → Recibido`.
- **Estado alto** (segmentador): **Pendiente** / **Finalizado** (Recibido o Entregado) / **Cancelado**.
- **Estado especial “Unificada”**: solicitud CEDIS que CEDIS absorbió en un reabasto → pasa a **Finalizadas**.
- **Columna SLA** (iconos): **Vencido**, **Surtido con parcialidad**, **Revisado con parcialidad**, **Rechazado**, o “En tiempo”.
  - Vencido entre sucursales: pendiente por surtir ≥ **1 día**.
  - Vencido CEDIS: sin recibirse ≥ **3 días** (parámetro propio de CEDIS).

---

## Flujo 1 — Traspaso **Automático SMC** (con pedido)

**Propósito**: cubrir un pedido web cuando ninguna sucursal tiene el stock completo.
**Relación con pedido**: **siempre** lleva `pedidoOrigen`.
**Actores**: Sistema SMC, sucursal(es) origen (donantes), sucursal destino (solicitante).

**Pasos**
1. Llega un pedido web que no se puede surtir completo en una sola sucursal.
2. SMC calcula la(s) sucursal(es) más cercana(s) con existencia y genera la(s) petición(es) (Estado *Sin surtir*).
3. La sucursal origen **surte** la mercancía (Estado *Surtido*).
4. Se **revisa** la mercancía surtida (Estado *Revisado*).
5. Se **documenta / embarca** (Estado *Embarcado*).
6. Se **envía**; va en tránsito al destino (Estado *Enviado*).
7. La sucursal destino **confirma recepción** (Estado *Recibido*) y luego **da entrada** → **Finalizado**.

**Decisiones**
- ¿Una sucursal cubre todo? → **sí**: 1 petición · **no**: se reparte en varias peticiones de la misma solicitud.
- ¿Surtido/revisión completos? → **no** (parcial): ver **Flujo 9**.

**Prompt de diagrama**
> Diagrama de proceso: “Traspaso Automático SMC”. Inicio: Pedido web sin stock completo. Paso: SMC selecciona sucursal(es) cercana(s) y genera petición. Decisión: ¿una sola sucursal cubre todo? Si no → dividir en varias peticiones. Pasos secuenciales: Sin surtir → Surtido → Revisado → Embarcado → Enviado → Recibido. Paso final: dar entrada = Finalizado. Decisión intermedia: ¿surtido completo? Si no → generar traspaso por el faltante (recálculo SMC).

---

## Flujo 2 — Traspaso **Manual con pedido**

**Propósito**: la sucursal solicita a mano mercancía para atender/complementar un pedido.
**Relación con pedido**: con `pedidoOrigen`.

**Pasos**
1. El logístico abre **Nueva solicitud** y selecciona el **pedido**.
2. Se **precargan** los productos del pedido; si el total del pedido **≤ $2,000**, las **piezas recomendadas** (alta rotación) se agregan **automáticamente**; si supera, el usuario las agrega.
3. **SMC 4.0** propone opciones de sucursal (mejor opción / alternativa / reparto entre 2); el usuario **elige una**.
4. Se crea la petición (Estado *Sin surtir*) → sigue el mismo ciclo del Flujo 1 (Surtido → Revisado → Enviado → Recibido → Finalizado).

**Decisiones**
- ¿Pedido ≤ $2,000? → agregar recomendados automáticamente vs. manual.
- ¿Qué opción SMC? → 1 sucursal (mejor/alternativa) o reparto en 2.

**Prompt de diagrama**
> Diagrama de proceso: “Traspaso Manual con pedido”. Inicio: Nueva solicitud → seleccionar pedido. Paso: precargar productos del pedido. Decisión: ¿pedido ≤ $2,000? Si sí → agregar recomendados automáticamente; si no → el usuario los agrega. Paso: SMC 4.0 propone 3 opciones de sucursal. Decisión: elegir opción (mejor / alternativa / reparto). Paso: crear petición. Continúa: Sin surtir → Surtido → Revisado → Enviado → Recibido → Finalizado.

---

## Flujo 3 — Traspaso **Manual sin pedido** (con token)

**Propósito**: solicitar un traspaso entre sucursales sin un pedido de cliente detrás.
**Relación con pedido**: **sin** `pedidoOrigen`.

**Pasos**
1. En **Nueva solicitud**, el logístico **omite** el pedido.
2. Agrega las piezas del catálogo.
3. **SMC 4.0** propone opciones; el usuario elige una.
4. En la confirmación se exige **token de autorización (0000)**.
5. Se crea la petición (Manual) → sigue el ciclo normal.

**Decisiones**
- ¿Token válido? → **no**: no se puede confirmar.

**Prompt de diagrama**
> Diagrama de proceso: “Traspaso Manual sin pedido”. Inicio: Nueva solicitud → omitir pedido. Paso: agregar piezas del catálogo. Paso: SMC 4.0 propone opciones → elegir una. Decisión: ¿token 0000 válido? Si no → bloquear. Si sí → crear petición Manual. Continúa el ciclo estándar hasta Finalizado.

---

## Flujo 4 — **CEDIS · Especial** (manual a CEDIS **con pedido**)

**Propósito**: pedir mercancía a CEDIS ligada a un pedido de cliente.
**Relación con pedido**: **con** `pedidoOrigen`.
**Recepción**: **ciega** (no se ve la cantidad; solo cajas y SLA).

**Pasos**
1. **Solicitar a CEDIS** → seleccionar el **pedido**.
2. Se precargan los productos del pedido. Regla: **no se puede superar la existencia de CEDIS**; se muestran las columnas **existencia de la sucursal** y **existencia CEDIS**.
3. Confirmar con **token (0000)**.
4. CEDIS documenta y envía (Documentado → Enviado); la sucursal confirma recepción (ciega) → Finalizado.

**Prompt de diagrama**
> Diagrama de proceso: “CEDIS Especial (con pedido)”. Inicio: Solicitar a CEDIS → seleccionar pedido. Paso: precargar productos (tope = existencia CEDIS). Decisión: ¿token 0000? Paso: CEDIS documenta → envía. Paso: recepción ciega en sucursal → Finalizado.

---

## Flujo 5 — **CEDIS · Urgencia** (manual a CEDIS **sin pedido**)

**Propósito**: pedir mercancía a CEDIS sin un pedido de cliente.
**Relación con pedido**: **sin** `pedidoOrigen`.

**Pasos**
1. **Solicitar a CEDIS** → **“Solicitar sin pedido de cliente”**.
2. Agregar piezas del catálogo (tope = existencia CEDIS).
3. Confirmar con **token (0000)**. **La valida CEDIS** y **puede tardar más**.
4. CEDIS documenta → envía → recepción ciega → Finalizado.

**Prompt de diagrama**
> Diagrama de proceso: “CEDIS Urgencia (sin pedido)”. Inicio: Solicitar a CEDIS → sin pedido. Paso: agregar piezas (tope existencia CEDIS). Decisión: ¿token 0000? Paso: validación de CEDIS (puede tardar). Paso: documentar → enviar → recepción ciega → Finalizado.

---

## Flujo 6 — **CEDIS · Reabasto** (lo genera CEDIS)

**Propósito**: CEDIS reabastece la sucursal por su cuenta (restock), sin que la sucursal solicite nada.
**Relación con pedido**: **sin** pedido.
**Recepción**: **ciega por cajas** (se cuentan/escanean cajas; se detecta si falta alguna).

**Pasos**
1. CEDIS **genera** el traspaso de reabasto y lo envía (la sucursal no hace nada).
2. Aparece en **Por recibir** (Estado *Enviado*).
3. La sucursal **confirma recepción por cajas**; si falta una caja, se registra como parcial → Finalizado.

**Prompt de diagrama**
> Diagrama de proceso: “Reabasto CEDIS”. Inicio: CEDIS genera reabasto (sin intervención de la sucursal). Paso: envío → aparece en Por recibir. Paso: recepción ciega por cajas. Decisión: ¿faltan cajas? Si sí → registrar parcial. Fin: Finalizado.

---

## Flujo 7 — **Unificación** de una solicitud CEDIS con un reabasto

**Propósito**: CEDIS decide **absorber** una solicitud CEDIS (con pedido) dentro de un **reabasto** ya programado, para enviarla junta.
**Quién lo hace**: **CEDIS** (la sucursal solo lo ve reflejado).

**Pasos**
1. Existe una solicitud CEDIS (Especial, con pedido).
2. CEDIS la **unifica** dentro de un traspaso de **reabasto**.
3. La solicitud original pasa a **Finalizadas** con **Estado = “Unificada”** (tooltip explica que se unificó; el reabasto es consultable en el **detalle de la petición**).
4. El **reabasto** se muestra con tipo **“Reabasto/unificado”**; su **detalle** indica **qué mercancía corresponde a qué pedido N** (para saberlo sin abrir el traspaso).

**Prompt de diagrama**
> Diagrama de proceso: “Unificación con reabasto (la decide CEDIS)”. Inicio: solicitud CEDIS con pedido. Paso (actor CEDIS): unificar la solicitud dentro de un reabasto. Resultado A: la solicitud → Finalizada con estado “Unificada” (detalle enlaza al reabasto). Resultado B: el reabasto → tipo “Reabasto/unificado” y su detalle relaciona la mercancía con el pedido N.

---

## Flujo 8 — Envío de la sucursal **a CEDIS** (Devolución / Garantía)

**Propósito**: la sucursal regresa mercancía a CEDIS (exceso de inventario = **Devolución**; piezas defectuosas = **Garantía**).
**Relación con pedido**: sin pedido.
**Perspectiva**: aparece en **Por enviar** (la sucursal es el origen; destino = CEDIS).

**Pasos**
1. **Por enviar → Enviar a CEDIS**: elegir **motivo** (Devolución/Garantía) y piezas.
2. Sigue el pipeline de salida: *Pendiente → Surtido → Revisado → Enviado*.

**Prompt de diagrama**
> Diagrama de proceso: “Envío de sucursal a CEDIS”. Inicio: Por enviar → Enviar a CEDIS. Decisión: motivo (Devolución / Garantía). Paso: capturar piezas. Continúa: Pendiente → Surtido → Revisado → Enviado (destino CEDIS).

---

## Flujo 9 — **Surtido / revisión parcial** (recálculo)

**Propósito**: resolver el **faltante** cuando una petición se surtió o revisó solo en parte.
**Relación con pedido**: hereda el pedido de la petición original.

**Pasos**
1. La sucursal origen surte/revisa **parcialmente** (queda faltante). La parcialidad se muestra en la **columna SLA**, no en el Estado.
2. La sucursal solicitante (en **Por recibir**) decide:
   - **Generar solicitud de traspaso por la mercancía restante** (nueva solicitud por el faltante), o
   - **Reasignar** el faltante a otra sucursal (ver Flujo 10).

**Decisiones**
- ¿Cómo cubrir el faltante? → nueva solicitud por el restante **o** reasignar.

**Prompt de diagrama**
> Diagrama de proceso: “Surtido/revisión parcial”. Inicio: petición surtida/revisada parcial (queda faltante). Decisión (logístico de la sucursal solicitante): ¿generar solicitud por el restante o reasignar? Rama A: nueva solicitud por el faltante. Rama B: reasignar el faltante a otra sucursal (SMC). Límite: máximo 3 evaluaciones por necesidad.

---

## Flujo 10 — **Rechazo → Reasignación**

**Propósito**: recolocar una petición **rechazada en su totalidad** (o el faltante de una parcial) en otra sucursal.
**Escenarios de rechazo** (visibles con el chip **“Ver rechazados”**): Automático SMC (con pedido), Manual con pedido, Manual sin pedido.

**Pasos**
1. La sucursal origen **rechaza** la petición (Cancelado / rechazada). **No** se reasigna sola.
2. La sucursal solicitante abre **Reasignar** → se abre un modal **#reasignación** (similar a nueva solicitud) con:
   - **Pedido origen fijo** (no editable) y **piezas del faltante**.
   - Opciones de **SMC 4.0** que **excluyen** la sucursal que rechazó y el destino.
3. El usuario elige una sucursal → se crea la petición derivada (siguiente **intento**).

**Decisiones**
- ¿Hay sucursal elegible y quedan intentos (máx. 3)? → **no**: se avisa “no se puede reasignar”.

**Prompt de diagrama**
> Diagrama de proceso: “Rechazo y reasignación”. Inicio: la sucursal origen rechaza la petición (queda Cancelada/rechazada). Paso: la sucursal solicitante abre Reasignar (#reasignación, pedido fijo + faltante). Decisión: ¿SMC encuentra sucursal elegible y quedan intentos (≤3)? Si no → avisar “no se puede reasignar”. Si sí → elegir sucursal → crear petición del siguiente intento.

---

## Flujo 11 — **Confirmar recepción** (aviso, sin entrada a inventario)

**Propósito**: registrar que la sucursal **ya recibió** físicamente la mercancía, **sin** darle entrada al inventario todavía.
**Aplica**: a peticiones en Estado *Enviado* (o para actualizar una recepción ya hecha).

**Pasos**
1. Seleccionar la petición → **Confirmar recepción**.
2. Según el tipo:
   - **Entre sucursales**: confirmación **Completa** o **Parcial** (modificable después; queda registro de cada cambio).
   - **CEDIS**: confirmación o **escaneo de cajas** (detecta si faltó alguna).
3. La petición queda **Recibido** (aviso). Esto **no** da entrada al inventario.
4. Posteriormente, **dar entrada** a la mercancía = **Finalizado**.

**Decisiones**
- ¿Completa o parcial? · CEDIS: ¿faltan cajas?

**Prompt de diagrama**
> Diagrama de proceso: “Confirmar recepción”. Inicio: petición en Enviado. Decisión: ¿entre sucursales o CEDIS? Rama sucursales: confirmar Completa/Parcial (modificable, con registro). Rama CEDIS: confirmar o escanear cajas → detectar faltantes. Resultado: Recibido (no entra a inventario). Paso final: dar entrada = Finalizado.

---

## Anexo — Cómo se relacionan traspasos y pedidos

- Un **pedido** puede generar **una o varias solicitudes** de traspaso; cada solicitud, **una o varias peticiones**.
- El **detalle de la petición** y el **detalle del pedido** muestran el **Resumen de traspasos del pedido**: cobertura (% surtido), faltante y estado de cada petición ligada.
- Reglas de relación:
  - **Automático SMC** → siempre ligado a un pedido.
  - **Manual** → puede o no llevar pedido (sin pedido = token).
  - **CEDIS Especial** → con pedido; **CEDIS Urgencia** y **Reabasto** → sin pedido.
  - **Reabasto/unificado** → sin pedido propio, pero **transporta mercancía de un pedido** unificado.

**Prompt de diagrama (relación pedido ↔ traspaso)**
> Diagrama de relación: un “Pedido de cliente” se conecta a una o varias “Solicitudes”; cada Solicitud a una o varias “Peticiones (traspaso)”. Anota junto a cada tipo si lleva pedido: Automático SMC (siempre), Manual (opcional), CEDIS Especial (con pedido), CEDIS Urgencia/Reabasto (sin pedido), Reabasto/unificado (transporta mercancía de un pedido).
