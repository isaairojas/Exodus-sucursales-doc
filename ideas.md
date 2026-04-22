# Ideas de Diseño — Módulo de Revisión APYMSA

<response>
<idea>
**Design Movement:** Enterprise Precision — Inspirado en herramientas industriales de alto rendimiento como SAP Fiori y Oracle Fusion, pero con la densidad visual de Bloomberg Terminal.

**Core Principles:**
1. Claridad funcional: cada píxel comunica información operativa, sin decoración superflua.
2. Jerarquía de datos: la información crítica (conteo, discrepancias) domina visualmente sobre metadatos.
3. Confianza institucional: el diseño transmite seriedad y robustez de sistema empresarial.
4. Eficiencia de almacén: optimizado para uso con escáner, teclado y pantallas de 1280px+.

**Color Philosophy:** Navy profundo (#1a2b6b) como color institucional dominante. Fondo gris muy claro (#f3f4f6) para reducir fatiga visual en turnos largos. Verde (#16a34a) y rojo (#dc2626) como señales de estado inequívocas. Ámbar (#d97706) para alertas que requieren atención sin urgencia crítica.

**Layout Paradigm:** Panel dividido asimétrico: columna izquierda estrecha (360px) para contexto del pedido + scanner; área derecha amplia para el contenido principal. Header sticky navy con identidad de marca. Action bar fija en la parte inferior.

**Signature Elements:**
1. Scanner input con animación de pulso azul — indica siempre que el sistema está listo para recibir.
2. Contador de conteo en tipografía grande (52px bold) — legible desde distancia en almacén.
3. Badges de estado con colores semánticos consistentes en toda la app.

**Interaction Philosophy:** Cada acción tiene feedback inmediato (toast, animación, cambio de color). El flujo es lineal y no permite ambigüedad. Los errores son visibles y accionables.

**Animation:** Transiciones suaves entre pantallas (fadeIn + translateY). Animación de pulso en fingerprint. Bump animation en contador al escanear. Modal con scale-in. Toast slide-in desde la derecha.

**Typography System:** Roboto como fuente única (Google Fonts). Títulos 22-24px Bold navy. Subtítulos 15-16px SemiBold gris oscuro. Texto de tabla 13px Regular. Labels 11-12px Medium gris medio. Contador de producto 52px Bold.
</idea>
<text>Enterprise Precision — Panel dividido asimétrico con navy institucional, scanner siempre activo y contador grande para uso en almacén.</text>
<probability>0.08</probability>
</response>

<response>
<idea>
**Design Movement:** Tactical Dark Mode — Inspirado en interfaces de control de operaciones (centros de distribución, dashboards de logística nocturna). Fondo oscuro con acentos de color vibrantes.

**Core Principles:**
1. Visibilidad en condiciones adversas de iluminación de almacén.
2. Contraste máximo para lectura rápida de datos.
3. Acentos de color neón para estados críticos.
4. Densidad de información alta sin sacrificar legibilidad.

**Color Philosophy:** Fondo #0f172a (slate-900), cards #1e293b, texto blanco/slate-200. Acentos: cyan #06b6d4 para acciones primarias, verde #22c55e para éxito, rojo #ef4444 para errores.

**Layout Paradigm:** Layout de tres columnas con sidebar colapsable. Modo oscuro por defecto.

**Signature Elements:**
1. Bordes de acento cyan en elementos activos.
2. Glow effects en el scanner input.
3. Números en tipografía monoespaciada para conteos.

**Interaction Philosophy:** Feedback visual intenso. Animaciones rápidas y precisas.

**Animation:** Glow pulse en elementos activos. Transiciones rápidas (150ms).

**Typography System:** Roboto Mono para números, Roboto para texto. Jerarquía por luminosidad.
</idea>
<text>Tactical Dark Mode — Fondo oscuro slate con acentos cyan, optimizado para ambientes de almacén con iluminación variable.</text>
<probability>0.05</probability>
</response>

<response>
<idea>
**Design Movement:** Clean Industrial — Inspirado en Notion + Linear, con la practicidad de herramientas de gestión de inventario modernas. Blanco puro, tipografía densa, bordes definidos.

**Core Principles:**
1. Máxima densidad de información sin ruido visual.
2. Bordes y separadores como herramienta de organización.
3. Color solo para semántica (verde/rojo/ámbar), no decoración.
4. Interacciones predecibles y consistentes.

**Color Philosophy:** Blanco puro como base. Grises para jerarquía. Color solo en estados y acciones.

**Layout Paradigm:** Grid estricto. Tablas como elemento central de la interfaz.

**Signature Elements:**
1. Tablas con hover states sutiles.
2. Inputs con underline style.
3. Badges minimalistas.

**Interaction Philosophy:** Sin animaciones innecesarias. Feedback directo y funcional.

**Animation:** Mínima. Solo transiciones de estado.

**Typography System:** Roboto 400/500/700. Escala tipográfica conservadora.
</idea>
<text>Clean Industrial — Blanco puro con grises y color semántico únicamente. Máxima densidad de información.</text>
<probability>0.04</probability>
</response>

---

## Decisión: Enterprise Precision (Respuesta 1)

Se elige el enfoque **Enterprise Precision** por su alineación directa con el design system de APYMSA (navy #1a2b6b), su optimización para uso en almacén con escáner físico, y su coherencia con la identidad institucional de la empresa. El layout asimétrico de panel dividido es el más adecuado para la pantalla de revisión ciega, que es el corazón de la aplicación.
