# Exodus Handheld — Design System

Sistema de diseño para **Exodus Handheld**, la PWA operativa de sucursales de **APYMSA**
(Autopartes y Mayoreo). Pensada para dispositivos handheld **Zebra** en resolución móvil.

- **Tema:** claro
- **Primario:** Navy `#1B3892`
- **Tipografía:** Roboto (100–900)
- **Frame objetivo:** `360 px` de ancho (Zebra pantalla chica)
- **Fuente de verdad:** el prototipo real de Figma

## Contenido

| Archivo | Qué es |
|---|---|
| `tokens.css` | **Única fuente de verdad**: variables de color, tipografía, radios, espaciado, sombras y dimensiones. |
| `components.css` | Clases reutilizables (`.exo-btn`, `.exo-input`, `.exo-field`, `.exo-menu-card`, `.exo-toast`, …) construidas sobre los tokens. |
| `index.html` | Showcase documentado: paleta, escala tipográfica, componentes y pantallas dentro de un frame de 360 px. |
| `assets/` | Íconos SVG tomados del prototipo. |

## Cómo verlo

Abre `index.html` en cualquier navegador. Es estático: **no requiere instalación** ni servidor.

## Cómo usarlo en otro proyecto

```html
<link rel="stylesheet" href="tokens.css" />
<link rel="stylesheet" href="components.css" />

<div class="exo">
  <button class="exo-btn exo-btn--primary">Continuar</button>
</div>
```

Todo control debe ir dentro de un contenedor con la clase `exo` (aplica la familia
tipográfica y `box-sizing`).

## Paleta consolidada

| Rol | Token | Hex |
|---|---|---|
| Primario / navy | `--navy-700` | `#1B3892` |
| Hover / 2ª tarjeta | `--navy-500` | `#3651A7` |
| 3ª tarjeta | `--navy-300` | `#7991DC` |
| 4ª tarjeta | `--navy-200` | `#A7B9EF` |
| Éxito / confirmar | `--color-success` | `#2DAA81` |
| Peligro / error | `--color-danger` | `#E6002B` |
| Texto fuerte | `--color-text-strong` | `#343434` |
| Ícono | `--color-icon` | `#616161` |
| Deshabilitado | `--color-disabled` | `#BDBDBD` |
| Borde | `--color-border` | `#E1E1E1` |

## Nota sobre la implementación actual

La app `Exodus-sucursales-doc` se implementó en **tema oscuro** con un navy distinto
(`#1a2b6b`) y una paleta fragmentada (11+ tonos de azul, colores hardcodeados inline).
Este Design System corrige eso tomando como referencia el **prototipo de Figma**:
tema claro, navy `#1B3892` y tokens consolidados. Para alinear la app, mapea estos
tokens al bloque `@theme` de Tailwind v4 y reemplaza los hex sueltos por variables.

## Componentes incluidos

Botones (primario / éxito / peligro / deshabilitado), input con ícono, input de contraseña,
campo con etiqueta flotante, campo con prefijo navy, campo con encabezado, select/dropdown,
stepper, checkbox, badge/contador, header, tarjetas de menú apiladas, sheet, divisor,
toast y display de total.
