# Handoff: GestioYA — Frontend (dirección visual "Mostrador")

## Overview

GestioYA es un ERP SaaS multi-tenant para PyMEs, comercios y distribuidores argentinos (propiedad de Byte Ecosistemas). El backend ya existe. Este paquete define **el frontend completo del MVP**: sistema de diseño + 6 pantallas clave de los 5 módulos (Entidades, Productos, Remitos, Cuentas, Tareas).

La dirección visual elegida se llama **Mostrador**: cálida, espaciosa, tono de voz humano en castellano rioplatense, verde contable como acento, fondo tipo papel en vez de blanco clínico, serif para las cifras de dinero. Targets grandes (≥44px) porque el usuario típico es el dueño del comercio o su contador, a veces desde un iPad en el mostrador.

Stack objetivo: **Next.js 16 (App Router) + React 19 + Tailwind CSS v4**.

## About the Design Files

El archivo `Opcion-B-Mostrador.dc.html` de esta carpeta es una **referencia de diseño creada en HTML** — un prototipo que muestra el look y el comportamiento buscados. **No es código de producción para copiar y pegar.** La tarea es **recrear estos diseños en el codebase objetivo** (Next.js + React + Tailwind v4) usando componentes React idiomáticos, tokens de Tailwind v4 vía `@theme`, y los patrones establecidos del proyecto. Si el proyecto todavía no existe, arrancarlo desde cero con ese stack.

El HTML usa estilos inline y un canvas de 1360px por pantalla porque es una maqueta de presentación; en la implementación real todo debe ser responsive (ver "Responsive").

## Fidelity

**High-fidelity (hifi).** Colores, tipografías, escalas de espaciado, radios, copy y estados están definitivos. Recrear la UI con fidelidad alta a nivel visual. Los datos son de ejemplo (nombres de empresas, montos, fechas) — reemplazar por datos reales de la API.

---

## Design Tokens

### Paleta

| Rol | Token | Hex | Uso |
|---|---|---|---|
| Tinta principal | `ink` | `#23201C` | Texto principal, botón "segmented" activo, footer |
| Tinta secundaria | `ink-soft` | `#4E4740` | Texto de cuerpo, labels de campo |
| Texto atenuado | `muted` | `#8A7F70` | Metadatos, labels en mayúsculas, placeholders fuertes |
| Placeholder | `placeholder` | `#A79C8D` | Texto de placeholder real en inputs |
| Deshabilitado | `disabled-fg` | `#B0A695` | Texto de botón deshabilitado |
| Línea | `line` | `#E5DACA` | Bordes de tarjetas, headers, divisores fuertes |
| Línea suave | `line-soft` | `#F0E9DE` | Divisores entre filas de tabla |
| Borde de input | `input-border` | `#DCD1BF` | Bordes de inputs y botones secundarios |
| Fondo de app | `canvas` | `#F2EDE4` | Fondo general de la aplicación |
| Superficie | `paper` | `#FBF8F3` | Tarjetas, headers, sidebars, filas |
| Superficie hover | `paper-hover` | `#FDFBF7` | Hover de fila, footers de tabla |
| Blanco puro | `white` | `#FFFFFF` | Fondo de inputs y de tarjetas anidadas |

### Semánticos

| Rol | Hex | Soft (bg) | Borde soft | Texto sobre soft |
|---|---|---|---|---|
| Verde / acción / saldo a favor | `#1F5D4C` (hover `#164236`) | `#E7F0EA` | `#C6DCD0` | `#155744` |
| Rojo tierra / saldo en contra / error | `#9C3520` | `#FDF2EE` | `#EAC9BE` | `#8A2E1B` |
| Terracota / 2º acento (rol proveedor, avatares) | `#B45B33` | `#F5EAE4` | `#E3CDBF` | `#8A4426` |
| Ámbar / vencido / advertencia | `#8A6410` | `#FAF0D9` / banner `#FCF7E9` | `#E8D9AE` | `#7A5810`, título `#5F4409` |

Contraste: verde sobre `paper` ≈ 7.1:1; `ink` sobre `canvas` ≈ 13:1; todos los pares texto/fondo cumplen WCAG AA (mínimo medido 4.8:1).

### Tipografía

Google Fonts, cargadas con `next/font/google`, subset `latin-ext`.

- **Source Serif 4** — pesos 400 y 600. Títulos de pantalla y **todas las cifras de dinero**. `font-variant-numeric: tabular-nums` siempre en montos.
- **Public Sans** — pesos 400, 500, 600, 700. UI, tablas, botones, labels.

Escala:

| Uso | Fuente | Tamaño / peso | Extra |
|---|---|---|---|
| Saldo hero (cuenta corriente) | Serif | 58 / 600 | `letter-spacing:-.02em`, `line-height:1` |
| Título de pantalla grande | Serif | 32–34 / 600 | `letter-spacing:-.01em` |
| Total de remito (aside) | Serif | 36 / 600 | tabular |
| Título de tarjeta / sección | Serif | 18–19 / 600 | |
| Cifra en KPI card | Serif | 34 / 600 | tabular |
| Cifra en fila de tabla | Serif | 17–18 / 600 | tabular |
| Nombre de entidad en fila | Sans | 15 / 600 | |
| Cuerpo / celdas | Sans | 14–15 / 400 | `line-height:1.55` |
| Nav item | Sans | 14.5 / 500 (activo 600) | |
| Label de campo | Sans | 13 / 600 | color `ink-soft` |
| Metadato de fila | Sans | 12.5 / 400 | color `muted` |
| Label de columna / eyebrow | Sans | 12 / 700 | `letter-spacing:.10–.13em`, `uppercase`, color `muted` |

### Espaciado

Base **8**: `8, 16, 24, 32, 48, 64`. Se admiten 4, 12 y 20 como pasos intermedios en componentes densos (gaps internos de badges y filas).

Padding de referencia: pantalla `24–28px`; tarjeta `16–20px`; fila de tabla `14px 20px` (modo cómodo, es el default) o `9px 20px` (modo compacto opcional); input `12–13px 14–15px`.

### Radios

`8` (inputs anidados, chips pequeños), `10` (inputs, botones), `12` (tarjetas, banners), `16` (contenedores de pantalla / paneles grandes), `999px` (pills, avatares, chips de filtro).

### Sombras

- Tarjeta en reposo: sin sombra, solo `1px solid line`.
- Overlay / dropdown: `0 10px 30px rgba(35,32,28,.08)`.
- Tarjeta de login: `0 12px 40px rgba(35,32,28,.07)`.

### Focus ring

`border: 1.5px solid #1F5D4C` + `box-shadow: 0 0 0 4px rgba(31,93,76,.10)`. Nunca `outline:none` sin reemplazo.

---

## Component Patterns

### Botón primario
`bg #1F5D4C`, texto `#FFF` 15/600, sin borde, radio 10, padding `12px 20px`, hover `#164236`. Altura mínima 44px.

### Botón secundario
`bg #FFF`, borde `1px #DCD1BF`, texto `#23201C` 15/600, radio 10, padding `12px 20px`, hover `bg #F7F2E9`.

### Botón destructivo
`bg #FDF2EE`, borde `1px #EAC9BE`, texto `#9C3520` 15/600.

### Botón deshabilitado
`bg #F2EDE4`, borde `1px #E5DACA`, texto `#B0A695`, `cursor:not-allowed`.

### Botón fantasma
Sin fondo ni borde, texto `#4E4740` 14.5/600 (usado para "Descartar").

### Input
`bg #FFF`, borde `1px #DCD1BF`, radio 10, padding `13px 15px`, texto 15/400. Label arriba, 13/600 `#4E4740`, gap 7px.
- Foco: ver focus ring.
- Error: borde `1.5px #C98B78`, texto del valor `#9C3520`, mensaje debajo 12/400 `#9C3520` con prefijo `⚠` (ícono + texto, no solo color).

### Segmented control (Salida/Entrada)
Dos botones de igual ancho, gap 8, radio 10, altura 44. Activo: `bg #23201C`, texto blanco 14.5/600. Inactivo: `bg #FFF`, borde `1px #DCD1BF`, texto `#4E4740`.

### Chips de filtro
Pill (radio 999), padding `10px 16px`, 13.5/500-600. Activo: `bg #23201C` + texto blanco. Inactivo: `bg #FFF`, borde `1px #DCD1BF`, texto `#4E4740`. Cada chip lleva su contador (`Clientes 96`).

### Badge de estado
Pill, padding `6px 12px`, 13/600, con **glifo + palabra** (nunca solo color):

| Estado | Glifo | bg | borde | texto |
|---|---|---|---|---|
| Borrador | `✎` | `#F2EDE4` | `#DCD1BF` | `#4E4740` |
| Emitido | `✓` | `#E7F0EA` | `#C6DCD0` | `#155744` |
| Anulado | `⊘` | `#F2EDE4` | `#DCD1BF` | `#8A7F70` (+ `line-through` en el texto asociado) |
| Vencida | `⏱` | `#FAF0D9` | `#E8D9AE` | `#7A5810` |
| Parcial | `◐` | `#FDF2EE` | `#EAC9BE` | `#9C3520` |
| Cancelada | `✓` | `#E7F0EA` | `#C6DCD0` | `#155744` |
| Pendiente | `○` | `#F2EDE4` | `#DCD1BF` | `#4E4740` |

### Badge de rol de entidad
Pill, padding `4px 9px`, 12/600. Cliente → verde soft. Proveedor → terracota soft. Acreedor → ámbar soft. Los tres pueden coexistir en la misma entidad; se muestran en fila con `gap:6px` y `flex-wrap`. En entidad dada de baja, todos en gris (`#F2EDE4`/`#DCD1BF`/`#8A7F70`).

### Avatar de entidad
Círculo 36px (40px en listas del dashboard), iniciales 12.5/700. Color de fondo según saldo/rol: verde soft si a favor, terracota soft si proveedor, `canvas`/`muted` si neutro o de baja.

### Tarjeta / Card
`bg #FBF8F3`, borde `1px #E5DACA`, radio 12, padding 20. Variante "acentuada": suma `border-left: 4px solid` con el color semántico (verde a favor, rojo en contra).

### Banner de alerta (recordatorios)
`bg #FCF7E9`, borde `1px #E8D9AE`, radio 12, padding `14px 18px`, ícono `⏱` 17px `#8A6410` a la izquierda. Título 14.5/600 `#5F4409`, sub 13/400 `#7A5810`. A la derecha: botón secundario chico ("Ver tareas") + `✕` para descartar (descarte por sesión, vuelve a aparecer si sigue habiendo vencidos al día siguiente). No es modal, no bloquea.

### Tabla
Header de columnas: `bg` = superficie de la tarjeta, borde inferior `1px #E5DACA`, labels 12/700 uppercase `letter-spacing:.10em` `#8A7F70`. Filas: padding `14px 20px`, divisor `1px #F0E9DE`, hover `#FDFBF7`. Columnas numéricas alineadas a la derecha con serif tabular. Footer de tabla: `bg #FDFBF7`, borde superior `1px #E5DACA`, conteo a la izquierda + paginación a la derecha (botones secundarios "Anterior"/"Siguiente"). Fila de entidad de baja: `opacity:.55` + nombre con `line-through` + texto "Dada de baja el DD/MM/AA".

---

## Screens / Views

Todas las pantallas comparten el shell: **header superior fijo** (logo + selector de empresa + búsqueda + notificaciones + avatar) y **nav horizontal de 6 tabs** debajo (Inicio, Entidades, Productos, Remitos, Cuentas, Tareas). Nav activo: texto verde 600 + `border-bottom: 2.5px solid #1F5D4C`. Tareas lleva badge circular rojo con el número de vencidas.

### 1. Login (`/login`)

- **Propósito**: autenticar. Sin registro inline (link a "Crear cuenta").
- **Layout**: fondo `canvas`. Logo arriba a la izquierda (absolute, 28/32px). Tarjeta centrada de 1000px máximo, radio 16, `overflow:hidden`, dos columnas.
- **Columna izquierda** (`flex:1`, padding `52px 48px`): H1 serif 34/600 "Hola de nuevo"; sub 15/400 `#6D655B` "Entrá para ver cómo viene el mes."; campos Email y Contraseña; fila con checkbox "No cerrar sesión" (cuadrado 18px radio 5, verde cuando está activo) y link "Recuperar acceso"; botón primario full-width 16/600 "Entrar"; banner de error inline; pie "¿Tu empresa todavía no está? Crear cuenta".
- **Columna derecha** (400px fija, `bg #1F5D4C`, texto blanco, padding `48px 40px`, `justify-content:space-between`): claim serif 23/600 "Todo lo que te deben y todo lo que debés, en una sola pantalla."; abajo dos tarjetas `rgba(255,255,255,.10)` radio 12 con "Te deben $ 6.240.180" y "Debés $ 1.427.540" (serif 30/600); nota 13/400 `#A9C9BD` aclarando que son datos de ejemplo y que cada empresa ve solo su información.
- **Error**: banner rojo soft, `⚠` + "No coincide el email con la contraseña. Probá de nuevo — te quedan N intentos antes de bloquear la cuenta por 15 minutos."
- **Responsive**: por debajo de 900px la columna verde se oculta y la tarjeta pasa a una sola columna.

### 2. Inicio / Dashboard (`/`)

Pantalla nueva (no existe en el backend actual). Responde "¿qué querría ver primero el dueño al entrar?".

- **Saludo** (no un KPI): H1 serif 32/600 "Buen día, {nombre}" + frase 15.5/400: "Hoy te deben **$ 4.812.640** más de lo que debés. Hay **$ 812.400 vencidos** para reclamar." (el primer número en verde 600, el segundo en ámbar 600). A la derecha: botón secundario "Nueva entidad" + primario "Nuevo remito".
- **Banner de recordatorios** (si hay vencidos): patrón descrito arriba.
- **3 KPI cards** en grid `1fr 1fr 1fr`, gap 14:
  1. "Te deben" — borde izquierdo verde — `$ 6.240.180` — "42 obligaciones abiertas · $ 812.400 vencidos".
  2. "Debés" — borde izquierdo rojo — `$ 1.427.540` — "17 obligaciones · 3 vencen esta semana".
  3. "Movimiento del mes" — sin borde de color — "128 remitos" — "124 emitidos · **4 en borrador sin emitir**" (link).
- **Grid inferior** `1.5fr 1fr`, gap 16:
  - **"Para reclamar primero"**: lista de obligaciones priorizadas por vencimiento. Cada fila: avatar 40px, nombre 15/600, sub con el estado de vencimiento en ámbar/neutro, monto serif 20/600 verde a la derecha, botón "Cobrar" (secundario; deshabilitado si aún no vence). Link "Ver todas las obligaciones" en el header de la tarjeta.
  - **Columna derecha**: "Accesos rápidos" (grid 2×2 de tiles `bg #FFF` radio 10, hover borde verde: Cargar remito / Registrar pago / Nuevo cliente / Nueva tarea) y **"Tus tareas"** (checkbox cuadrado 20px radio 6, título 14/500, sub con vencimiento en rojo si venció; cumplidas con `opacity:.5` + `line-through`).
- **Empty state** (empresa nueva, sin datos): reemplazar KPIs y listas por una sola tarjeta centrada — "Todavía no hay nada cargado" + CTA "Cargar tu primer cliente" + link "o traer desde un Excel".

### 3. Entidades — listado (`/entidades`)

- **Header de página**: H1 serif 28/600 "Entidades" + sub "148 activas · 6 dadas de baja". Derecha: "Exportar" (secundario) + "Nueva entidad" (primario).
- **Barra de filtros**: buscador pill 260px con `⌕` y `✕` para limpiar; chips "Todas 148 / Clientes 96 / Proveedores 41 / Acreedores 11"; a la derecha "Ordenado por **saldo** ↓". Los filtros deben persistir en la URL (query params) y sobrevivir al refresh.
- **Tabla**, columnas `2.4fr 1.4fr 1.3fr 1.2fr 52px`:
  1. **Entidad**: avatar + nombre 15/600 + "CUIT · Localidad" 12.5/400 `muted`.
  2. **Roles**: badges de rol (pueden ser 1, 2 o 3, con wrap).
  3. **Saldo**: cifra serif 18/600 con signo explícito (`+ $` verde / `− $` rojo / `$ 0` gris) y **debajo la palabra** "te deben" / "le debés" / "sin saldo" 12/400 `muted`. El texto de apoyo es obligatorio: el signo y el color nunca van solos.
  4. **Último movimiento**: relativo en castellano ("hoy", "ayer", "hace 7 días", "—").
  5. Chevron `›` para abrir el detalle.
- **Footer**: "Mostrando 7 de 148" + Anterior/Siguiente.
- **Estados**: vacío = tarjeta centrada con ícono 44px, "Todavía no hay clientes cargados", sub "Cargá el primero y en dos minutos podés emitirle un remito.", CTA primario + link a importar Excel. Cargando = skeleton que respeta la grilla (círculo 36 + dos barras + barra de monto), colores `#F0E9DE` / `#F5F0E7`. Error = banner rojo soft con `⚠ No pudimos traer los datos`, "Se cortó la conexión con el servidor. Nada de lo que cargaste se perdió." + "Probar de nuevo" (primario rojo `#9C3520`) y "Avisar al soporte" (secundario).

### 4. Nuevo remito — líneas dinámicas (`/remitos/nuevo`)

Es el patrón "agregar/quitar filas" que se reutiliza en otros módulos: **cada línea es una tarjeta, no una fila de planilla**, para que sea cómoda de tocar en tablet.

- **Header** (72px): breadcrumb "Remitos › Nuevo" + título serif 22/600 "Remito de salida" + badge `✎ Borrador` + "Se guarda solo · 09:44". Derecha: "Descartar" (fantasma), "Guardar borrador" (secundario), "Emitir" (primario).
- **Cabecera del documento** (tarjeta, grid `2fr 1.2fr 1fr`): "¿A quién le entregás?" (combo con avatar + nombre, con foco visible), "Tipo de movimiento" (segmented Salida/Entrada), "Fecha".
- **Sección "Qué entregás"**: título serif 19/600 + contador "2 líneas · 165 unidades".
  - **Línea**: tarjeta `paper`, radio 12, padding 16, `display:flex; align-items:flex-end; gap:14px`: número de orden (círculo 26px gris), Producto (`flex:2.4`, autocomplete por nombre o SKU), Cantidad (`flex:.8`, con la unidad de medida del producto como sufijo dentro del input), Precio unitario (`flex:1`), Subtotal (`flex:1`, serif 21/600, calculado, no editable), botón `✕` de 40×40 radio 10 (hover borde `#C98B78` + texto rojo).
  - **Agregar línea**: bloque `border: 1.5px dashed #C4B69F` radio 12, con círculo verde soft `+` y "Agregar otro producto" / "Buscá por nombre o SKU". Hover: borde verde, `bg #F7FBF8`.
  - Al elegir producto se autocompletan unidad y precio (editables). Quitar la última línea deja el bloque vacío con el dashed visible.
- **Aside derecho (340px)**:
  - Subtotal + **Total del remito** serif 36/600.
  - **Tarjeta verde soft "Cuando toques 'Emitir'"**: explica que el remito queda cerrado (solo anulable) y que se le carga automáticamente el monto a la cuenta de la entidad. Dentro, tarjeta blanca con la transición del saldo: `$ 500.000 → $ 3.198.500`. Esto es clave: el usuario tiene que entender la conexión remito → obligación → cuenta corriente **antes** de emitir.
  - Banner ámbar si la entidad tiene deuda vencida: "Ojo: esta entidad ya tiene **$ 500.000 vencidos** hace 4 días. Podés emitir igual." (informativo, no bloqueante).
  - Campo "Observaciones" al pie.
- **Validación**: entidad, tipo y fecha obligatorios; cada línea requiere producto, cantidad > 0 y precio ≥ 0. "Emitir" deshabilitado hasta que sea válido, con el motivo en tooltip. "Guardar borrador" siempre habilitado.
- **Confirmación de emisión**: modal que repite el total y el impacto en la cuenta corriente ("Esto le va a cargar $X a la cuenta de Y y ya no vas a poder editar el remito"), con "Emitir" / "Volver".

### 5. Cuenta corriente de una entidad (`/cuentas/corrientes/[id]`)

El momento de mayor exigencia visual del producto: el saldo con signo tiene que leerse sin ambigüedad.

- **Header**: breadcrumb "Cuentas › Cuentas corrientes › **Ferretería Iglesias**". Derecha: "Resumen en PDF", "Nueva obligación" (secundarios), "Registrar cobro" (primario). El label del primario cambia según el signo: "Registrar cobro" si te deben, "Registrar pago" si le debés.
- **Hero del saldo** (`flex:1`, `bg #1F5D4C`, radio 16, padding `28px 32px`, texto blanco):
  1. Fila de identidad: avatar 40px translúcido, nombre 16/600, "CUIT · Cliente y proveedor" 12.5 `#A9C9BD`.
  2. **Frase primero**: serif 26/600 "Te deben $ 312.400,00" (o "Le debés $ …").
  3. **Número después**: serif 58/600 tabular con signo explícito `+ $ 312.400,00`.
  4. Fila de contexto: pill ámbar "⏱ Todo el saldo está vencido" + "La obligación más vieja venció hace 7 días".
  - Cuando el saldo es en contra, el hero usa `#9C3520` como fondo y la frase pasa a "Le debés $ …". Cuando es cero: fondo `paper` con borde, frase "Están al día", número en `ink`.
- **Columna derecha (300px)**: tres tarjetas — "Obligaciones abiertas" (3 · 1 vencida, 1 parcial, 1 pendiente), "Último cobro" ($ 150.000 · 14/08 · transferencia), "Cheques en cartera" (1 · $ 90.000 · vence 05/09 · Banco Galicia).
- **Tabs pill**: Movimientos 24 / Obligaciones 3 / Pagos y cheques 9 / Datos.
- **Tabla de movimientos**, columnas `1.1fr 2.6fr 1.1fr 1.2fr`:
  - Fecha en dos líneas ("18 ago" 14/600 + "2026" 12 `muted`).
  - Concepto: ícono cuadrado 32px radio 8 con color según tipo (remito neutro, cobro verde soft, cheque terracota soft, anulación gris, nota de crédito rojo soft) + título 14.5/500 + sub 12.5 `muted` que **explicita la conexión** ("Generó la obligación OB-0448 · ver remito").
  - Monto con signo y color (`+` verde si aumenta lo que te deben, `−` rojo si baja).
  - Saldo resultante, serif 17/600 tabular.
  - Movimiento anulado: `opacity:.55` + `line-through` + "no afecta el saldo".
- **Footer**: "6 de 24 movimientos" + "Ver más".

### 6. Navegación, tablet y estados

- **Desktop**: header + nav horizontal de tabs (descrito arriba). Sin sidebar.
- **Selector de empresa (multi-tenant)**: dropdown desde el pill del header. Panel blanco radio 12, sombra `0 10px 30px rgba(35,32,28,.08)`: label "TUS EMPRESAS", fila activa con `bg #F7FBF8` + check verde (avatar cuadrado terracota, nombre 14.5/600, "CUIT · rol"), y fila "Agregar otra empresa". El MVP maneja una empresa por usuario, pero el componente y el modelo mental ya deben existir.
- **Tablet (≤834px)**: la nav horizontal se transforma en **tab bar inferior** de 5 destinos (Inicio, Entidades, Remitos, Cuentas, Tareas — Productos pasa al menú "más"), altura 64px, ítems de 56px de ancho mínimo, ícono 16px + label 11px, activo en verde 700. El header se reduce a logo + título de sección + avatar. Las tablas de 4+ columnas se convierten en **tarjetas apiladas** con borde izquierdo de color según el saldo (ver ejemplo en el archivo).
- **Estados** (ya descritos por pantalla): vacío, cargando (skeletons que respetan la grilla real), error (banner rojo con acción de reintento), y normal con datos. Ninguna pantalla debe entregarse solo con el happy path.

---

## Interactions & Behavior

- **Navegación**: tabs = rutas del App Router. Cambio de tab conserva filtros por ruta.
- **Hovers**: fila de tabla → `#FDFBF7`; botón secundario → `#F7F2E9`; primario → `#164236`; tile de acceso rápido → borde verde; botón `✕` de línea → borde/color rojo. Transición `120ms ease-out` en `background-color` y `border-color` únicamente (nada de transforms).
- **Líneas dinámicas**: agregar hace foco automático en el campo Producto de la nueva línea. Quitar no pide confirmación (es reversible mientras sea borrador). Total y contador de unidades se recalculan en vivo.
- **Autosave del borrador**: debounce 2s, indicador textual "Se guarda solo · HH:MM" en el header. Nunca un spinner bloqueante.
- **Ciclo de vida del remito**: `borrador` (editable) → `emitido` (no editable, solo anulable) → `anulado` (final). La UI debe deshabilitar edición en emitido y mostrar el badge en todo momento (lista, detalle, PDF).
- **Banner de recordatorios**: aparece si hay tareas vencidas u obligaciones que vencen hoy. Descartable por sesión (`sessionStorage`), reaparece al día siguiente si la condición sigue.
- **Formularios**: validación en `blur` + al enviar, nunca en cada tecla. Mensajes en castellano, con ícono `⚠` además del color.
- **PDF de remito**: acción secundaria en el detalle; abre en pestaña nueva.
- **Accesibilidad**: targets ≥44px; foco visible siempre; estados comunicados con color + glifo + palabra; `aria-live="polite"` en el total del remito y en el saldo tras un pago; tablas con `<caption>` visualmente oculto y `scope` en los headers.

## State Management

- **Sesión / tenant**: usuario, empresa activa, roles. Contexto de React alimentado por el servidor; toda llamada a la API lleva el tenant.
- **Listados**: filtros (texto, rol, orden, página) en la URL como fuente de verdad; datos con la capa de fetching del proyecto (Server Components + `cache`, o React Query si el proyecto ya la usa). Estados `loading | empty | error | ready` explícitos por listado.
- **Formulario de remito**: estado local del documento `{ entidadId, tipo, fecha, observaciones, lineas: [{ id, productoId, unidad, cantidad, precio }] }` + derivados (`subtotal`, `total`, `unidades`). Mutaciones: `addLinea`, `removeLinea(id)`, `updateLinea(id, patch)`. Persistencia optimista del borrador.
- **Cuenta corriente**: saldo firmado del servidor (nunca calcular el signo en el cliente); derivar solo la presentación (`signo`, `color`, `frase`).
- **Banner de recordatorios**: contador vencidos del servidor + flag de descarte en `sessionStorage`.

## Responsive

Breakpoints: `≥1280` (layout completo), `1024–1279` (asides colapsan a acordeón bajo el contenido), `768–1023` (tablet: tab bar inferior, tablas → tarjetas, formulario de remito a una columna con el resumen fijo al pie), `<768` (funcional, una columna; no es prioridad pero no debe romperse).

## Assets

No hay imágenes ni logos definitivos. El logo es un placeholder: cuadrado radio 8 `bg #1F5D4C` con la letra "G" en Source Serif 4 600 blanca, junto al wordmark "GestioYA" en Source Serif 4 600. **Reemplazar por el logo real de Byte Ecosistemas cuando exista.**

Los íconos del prototipo son glifos Unicode y emoji de relleno (`⌕ ✎ ✓ ⊘ ⏱ ◐ ⚠ › 📄 💵 👤 📋 🧾 ↩ ⌂ 👥 ☑`). **En la implementación reemplazarlos por un set de íconos de línea consistente** (Lucide o Phosphor, stroke 1.5–1.75, 16–20px). Mantener el mapeo semántico: reloj = vencido, check = emitido/cumplido, prohibido = anulado, lápiz = borrador, medio círculo = parcial.

Ninguna fuente ni asset es propietario: Source Serif 4 y Public Sans son de Google Fonts (OFL).

## Files

- `Opcion-B-Mostrador.dc.html` — el prototipo completo: sistema de diseño (paleta, tipografía, escalas, componentes) + las 6 pantallas + estados. Abrilo en el navegador y usalo como referencia visual mientras implementás. Ignorá su estructura interna de archivo y sus estilos inline: son artefactos de la maqueta.
- Las otras dos direcciones exploradas (Ledger, Panel) fueron descartadas y no están incluidas.
