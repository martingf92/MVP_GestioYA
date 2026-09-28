# Prompt inicial para Claude Code

Pegá esto como primer mensaje en Claude Code, dentro de la carpeta del proyecto (con `README.md` y `Opcion-B-Mostrador.dc.html` presentes).

---

Vas a construir el frontend de **GestioYA**, un ERP SaaS multi-tenant para PyMEs argentinas. El backend ya existe; vos hacés solo el frontend.

Stack: **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4**.

Leé `README.md` completo antes de escribir código: contiene el sistema de diseño (paleta con hex, tipografía, escalas, radios, patrones de componente) y la especificación detallada de 6 pantallas con sus estados. Abrí `Opcion-B-Mostrador.dc.html` en el navegador como referencia visual — es una **maqueta**, no código para copiar: recreala con componentes React idiomáticos y utilidades de Tailwind, no con estilos inline.

Orden de trabajo:

1. Scaffold del proyecto + `app/globals.css` con el bloque `@theme` de tokens (está más abajo, ya traducido a Tailwind v4).
2. Fuentes con `next/font/google`: Source Serif 4 (400, 600) y Public Sans (400, 500, 600, 700), subset `latin-ext`, expuestas como `--font-serif` y `--font-sans`.
3. Primitivas de UI en `components/ui/`: `Button`, `Input`, `Field`, `Segmented`, `Chip`, `StatusBadge`, `RoleBadge`, `Avatar`, `Card`, `AlertBanner`, `DataTable`, `EmptyState`, `Skeleton`, `ErrorState`. Cada una con sus variantes según el README. Sin librería de componentes externa.
4. Shell de la app: header con selector de empresa + nav de 6 tabs, con la variante tablet (tab bar inferior ≤834px).
5. Las pantallas, en este orden: Login → Entidades (listado) → Cuenta corriente → Nuevo remito → Inicio.
6. Datos mock tipados en `lib/mock/` con la forma que espera la API, detrás de funciones `async` para que después se reemplacen por fetch real sin tocar los componentes.

Reglas no negociables:

- **Todo estado se comunica con color + glifo + palabra**, nunca con color solo (borrador/emitido/anulado, saldo a favor/en contra, vencido).
- **El saldo con signo es la pantalla más importante**: frase en castellano primero ("Te deben $X" / "Le debés $X"), número con signo explícito después. El signo viene del servidor, no se calcula en el cliente.
- Todos los montos con `font-variant-numeric: tabular-nums` y formato `es-AR` (`Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS' })`).
- **Cada pantalla se entrega con sus 4 estados**: vacío, cargando (skeleton que respeta la grilla real), error (con reintento) y normal. No solo el happy path.
- Targets táctiles ≥44px. Foco visible siempre (`ring` verde de 4px al 10%).
- Copy en castellano rioplatense, voseo, tono de persona — no de software. Los textos exactos están en el README; usalos tal cual.
- Íconos: Lucide, stroke 1.5, 16–20px. Reemplazan a los glifos Unicode de la maqueta manteniendo el mapeo semántico (reloj = vencido, check = emitido, prohibido = anulado, lápiz = borrador).
- Nada de gradientes, sombras dramáticas ni animaciones de entrada. Transiciones solo de `background-color` / `border-color`, 120ms.

## Tokens para `app/globals.css`

```css
@import "tailwindcss";

@theme {
  /* Neutrales cálidos */
  --color-ink: #23201C;
  --color-ink-soft: #4E4740;
  --color-muted: #8A7F70;
  --color-placeholder: #A79C8D;
  --color-disabled-fg: #B0A695;
  --color-line: #E5DACA;
  --color-line-soft: #F0E9DE;
  --color-input-border: #DCD1BF;
  --color-canvas: #F2EDE4;
  --color-paper: #FBF8F3;
  --color-paper-hover: #FDFBF7;

  /* Verde — acción y saldo a favor */
  --color-verde: #1F5D4C;
  --color-verde-hover: #164236;
  --color-verde-soft: #E7F0EA;
  --color-verde-soft-border: #C6DCD0;
  --color-verde-on-soft: #155744;

  /* Rojo tierra — saldo en contra y error */
  --color-neg: #9C3520;
  --color-neg-soft: #FDF2EE;
  --color-neg-soft-border: #EAC9BE;
  --color-neg-on-soft: #8A2E1B;
  --color-neg-input-border: #C98B78;

  /* Terracota — segundo acento (rol proveedor, avatares) */
  --color-terra: #B45B33;
  --color-terra-soft: #F5EAE4;
  --color-terra-soft-border: #E3CDBF;
  --color-terra-on-soft: #8A4426;

  /* Ámbar — vencido y advertencia */
  --color-warn: #8A6410;
  --color-warn-soft: #FAF0D9;
  --color-warn-banner: #FCF7E9;
  --color-warn-soft-border: #E8D9AE;
  --color-warn-on-soft: #7A5810;
  --color-warn-strong: #5F4409;

  /* Tipografía */
  --font-sans: var(--font-public-sans), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-source-serif), Georgia, serif;

  /* Radios */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Sombras */
  --shadow-pop: 0 10px 30px rgba(35, 32, 28, .08);
  --shadow-card: 0 12px 40px rgba(35, 32, 28, .07);
}

@layer base {
  body {
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--color-verde); font-weight: 500; text-decoration: none; }
  a:hover { color: var(--color-verde-hover); text-decoration: underline; }
  :focus-visible {
    outline: none;
    border-color: var(--color-verde);
    box-shadow: 0 0 0 4px rgb(31 93 76 / .10);
  }
  .tabular { font-variant-numeric: tabular-nums; }
}
```

Escala de espaciado: base 8 (`8, 16, 24, 32, 48, 64`), con 4, 12 y 20 como pasos intermedios permitidos. Usá las utilidades por defecto de Tailwind respetando esos múltiplos.

## Modelo de datos (para los mocks)

```ts
type Rol = 'cliente' | 'proveedor' | 'acreedor';

type Entidad = {
  id: string;
  razonSocial: string;
  cuit: string;
  localidad: string;
  roles: Rol[];              // uno, dos o los tres
  saldo: number;             // firmado: >0 = la entidad nos debe
  vencido: number;           // parte del saldo que está vencida
  ultimoMovimiento: string | null; // ISO
  activa: boolean;           // baja lógica
};

type UnidadMedida = { id: string; nombre: string; abreviatura: string };

type Producto = {
  id: string; nombre: string; sku: string;
  precio: number; unidadId: string; activo: boolean;
};

type EstadoRemito = 'borrador' | 'emitido' | 'anulado';

type LineaRemito = {
  id: string; productoId: string; unidadId: string;
  cantidad: number; precioUnitario: number;
};

type Remito = {
  id: string; numero: string;              // "R-0001294"
  entidadId: string; tipo: 'entrada' | 'salida';
  fecha: string; estado: EstadoRemito;
  observaciones: string | null;
  lineas: LineaRemito[];
  total: number;
  obligacionGeneradaId: string | null;     // link remito → cuenta corriente
};

type EstadoObligacion = 'pendiente' | 'parcial' | 'cancelada' | 'anulada';

type Obligacion = {
  id: string;                              // "OB-0448"
  entidadId: string; sentido: 'a_cobrar' | 'a_pagar';
  monto: number; saldoPendiente: number;
  vencimiento: string; estado: EstadoObligacion; vencida: boolean;
  origenRemitoId: string | null;           // generada automáticamente al emitir
};

type Cheque = {
  id: string; numero: string; banco: string;
  monto: number; vencimiento: string;
  estado: 'en_cartera' | 'depositado' | 'rechazado';
};

type Pago = {
  id: string; entidadId: string; fecha: string; monto: number;
  medio: 'transferencia' | 'efectivo' | 'cheque';
  aplicaciones: { obligacionId: string; monto: number }[]; // puede ser a varias
  chequeIds: string[];
};

type Movimiento = {
  id: string; fecha: string;
  tipo: 'remito' | 'pago' | 'cheque' | 'nota_credito' | 'anulacion';
  concepto: string; detalle: string | null;
  monto: number;              // firmado
  saldoResultante: number;
  refId: string | null;       // remito / obligación / pago referenciado
};

type Prioridad = 'baja' | 'media' | 'alta';

type Tarea = {
  id: string; titulo: string; vencimiento: string | null;
  prioridad: Prioridad; estado: 'abierta' | 'en_proceso' | 'cumplida';
};
```

Reglas de negocio que la UI tiene que respetar:

- Una Entidad puede tener perfil de cliente, proveedor y acreedor **simultáneamente**.
- Productos **no** manejan stock (decisión de producto: el foco es financiero).
- Remito: `borrador` es editable; `emitido` no se edita, solo se anula; `anulado` es final.
- Al emitir un remito se genera **automáticamente** una obligación, y eso tiene que verse en la UI (antes de emitir, en el aside del formulario; después, en el detalle del remito y en el movimiento de la cuenta corriente).
- Un pago puede aplicarse a **varias** obligaciones (pagos parciales) y llevar cheques asociados.
- Saldo de cuenta corriente firmado: positivo = la entidad nos debe; negativo = le debemos.

Cuando termines cada pantalla, mostrámela y esperá feedback antes de seguir con la próxima.
