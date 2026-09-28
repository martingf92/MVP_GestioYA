# GestioYA — Schema + aislamiento de tenant (entrega 1)

## Qué incluye esto

- `prisma/schema.prisma` — schema corregido y extendido.
- `src/common/tenant/tenant-context.ts` — contexto de tenant por request (AsyncLocalStorage).
- `src/common/tenant/tenant.middleware.ts` — puebla el contexto desde el usuario autenticado (preparado, no conectado todavía: falta el módulo de Auth).
- `src/prisma/tenant.extension.ts` — Prisma Client Extension que filtra automáticamente por `empresaId` en cada query.
- `src/prisma/prisma.service.ts` y `prisma.module.ts` — actualizados para usar la extensión.

## Bugs del material original que quedaron resueltos acá

1. Relaciones unidireccionales en `schema.prisma` (Remito↔Entidad, CuentaCorriente↔Entidad, MovimientoCuenta↔CuentaCorriente, DetalleRemito↔Producto, Notificacion↔Tarea) — no compilaban. Cerradas.
2. `Producto.sku` y `UnidadMedida.codigo` eran únicos a nivel global — rompía multi-tenancy (dos empresas no podrían usar el mismo SKU). Pasaron a únicos por empresa: `@@unique([empresaId, sku])`.
3. `Tarea.creadaPor` era un string libre en el starter kit. El MER extendido (documento `Erp_Mer_Extendido`, sección 2.6) ya especifica `usuarioResponsableId` y `creadaPorUsuarioId` como FK — se implementó tal cual dice el MER, no es una funcionalidad inventada.

## Decisiones tomadas (con su razón — para discutir si no cierran)

- **`empresaId` (no `tenantId`)** como nombre de campo: consistente con el término que ya usa GESTIOYA.md en la sección 19 ("Empresa A", "Empresa B").
- **`Usuario.email` único global, no por empresa**: simplifica el login del MVP (un solo formulario, sin selector de empresa previo). Trade-off: la misma persona no puede tener cuentas en dos empresas distintas con el mismo email. Revisar cuando armemos Auth.
- **`Rol` es catálogo global**, no por empresa. Si en algún momento cada empresa necesita roles custom, es un cambio de diseño a encarar aparte.
- **Prisma Client Extensions en vez de `$use` (middleware clásico)**: `$use` fue removido en Prisma 6.14. El starter kit original no podría haberlo usado en una instalación actual. Se implementó con la API vigente (`$extends`), disponible desde Prisma 4.16 y la soportada en la versión actual.
- **Aislamiento fail-closed**: si una query sobre un modelo tenant-scoped se ejecuta sin `empresaId` en contexto, tira error en vez de devolver datos sin filtrar o fallar en silencio. Es una elección deliberada de seguridad: preferible un 500 visible en desarrollo a una fuga de datos entre empresas en producción.
- **Factura / DetalleFactura / FacturaRemito quedaron afuera** del schema por ahora: el propio MER los marca "opcional, para crecer a futuro" y no están en la lista de módulos del MVP (GESTIOYA.md sección 25). No es un olvido.
- **Planes/Features/Limits no se modelan todavía**: sigue siendo decisión pendiente (sección 51 de GESTIOYA.md), no se inventó una estructura para no tener que rehacerla después.

## Pendiente / no resuelto en esta entrega

- El `TenantMiddleware` está escrito pero no conectado a nada real: depende de que exista autenticación (JWT) que deje `req.user.empresaId` disponible. Es el paso lógico siguiente.
- `package.json` del starter kit fija `"prisma": "^5.13.0"` — muy desactualizado respecto a la versión actual. Habría que subirlo cuando armemos el proyecto real (no lo toqué en esta entrega porque no es parte del schema).
- Validación real (`prisma generate` / `prisma migrate dev`) no se pudo correr en este entorno por falta de acceso a red para instalar dependencias. Antes de dar esto por cerrado, correlo vos localmente con `npx prisma validate` y `npx prisma generate` para confirmar que compila.

## Siguiente paso sugerido (cumplido en la entrega 2, ver abajo)

Auth: JWT + guard que setee `req.user.empresaId`, conectar `TenantMiddleware`, y ahí sí probar el aislamiento end-to-end con dos empresas de prueba.

---

# Entrega 2: proyecto NestJS armado + módulo de Auth

## Qué incluye esto

- Scaffold real del proyecto (`package.json`, `tsconfig.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`) — antes eran archivos sueltos sin `package.json` ni estructura.
- `prisma/schema.prisma` — se sumó el modelo `RefreshToken`.
- `src/common/auth/` — `auth.middleware.ts` (verifica el JWT y puebla `req.user`), `jwt-payload.ts`, `express.d.ts` (tipa `req.user`).
- `src/auth/` — `auth.module.ts`, `auth.service.ts`, `auth.controller.ts`, DTOs, `guards/jwt-auth.guard.ts`, `guards/admin.guard.ts`.
- `src/prisma/prisma.service.ts` — se agregó `raw` (cliente sin filtro de tenant) además de `db` (filtrado).

## Decisión de arquitectura corregida sobre la marcha

El diseño original de `tenant.middleware.ts` asumía que un Guard de auth corría antes y dejaba `req.user` listo. Eso no es posible: en NestJS el orden es Middleware → Guards, así que un Guard llega tarde para que `TenantContext.run()` (AsyncLocalStorage) envuelva el resto de la request. Se resolvió con `AuthMiddleware` (verifica el JWT) corriendo *antes* que `TenantMiddleware` en la misma cadena de middleware — ver `AppModule#configure()`. Los Guards (`JwtAuthGuard`, `AdminGuard`) sólo leen `req.user`, ya seteado, para decidir si bloquean la ruta.

## Decisiones tomadas en esta entrega (con su razón)

- **JWT con refresh token, no sesión con store (Redis)**: evita sumar una pieza de infraestructura nueva solo para esto. Access token corto (default 45min, configurable por env) + refresh token largo (default 30 días) guardado hasheado (SHA-256) en la tabla `RefreshToken`, con rotación en cada uso.
- **Sesión "larga sin sobresaltos"**: el refresh token renueva el access token en segundo plano; el usuario no ve pantalla de login mientras el refresh siga vigente. Cambiar la contraseña revoca todos los refresh tokens del usuario (cierra sesión en todos lados) — es el único punto de fricción intencional.
- **`RefreshToken` no lleva `empresaId` ni entra en el allowlist de `tenant.extension.ts`**: se consulta durante login/refresh, antes de que exista `empresaId` en contexto. El aislamiento viene transitivamente de `usuarioId -> Usuario.empresaId`.
- **`PrismaService.raw`**: el login necesita buscar `Usuario` por email sin saber todavía a qué empresa pertenece — el cliente filtrado (`db`) tira error fail-closed en ese caso porque no hay tenant en contexto. `raw` es el escape hatch explícito para ese bootstrap, documentado en el código para que no se use por costumbre en otros lados.
- **Recuperación de contraseña — solo por admin en este corte**: `PATCH /auth/usuarios/:id/password`, protegido con `AdminGuard` (chequea rol `admin` vía las tablas `Rol`/`UsuarioRol` que ya existían). El flujo self-service por email queda pendiente hasta que se defina el proveedor de correo (DonWeb u otro) — no se inventa antes.
- **`AdminGuard` es un chequeo mínimo de un solo rol**, no el sistema de RBAC granular de GESTIOYA.md sección 51 (sigue como decisión pendiente aparte).
- **MFA: fuera de este corte**, no está en los módulos del MVP.
- **`bcryptjs` en vez de `bcrypt`**: mismo hash, sin compilación nativa — evita el riesgo de que falle el build en Windows y corta de raíz 2 vulnerabilidades que traía la cadena de dependencias de `bcrypt` (node-pre-gyp/tar desactualizados).

## Pendiente / no resuelto en esta entrega

- `JWT_SECRET` en `.env` es un valor de desarrollo (`dev-secret-cambiar-en-produccion`) — hay que generar uno real antes de cualquier ambiente que no sea local.

## Probado end-to-end (ver entrega 3)

Se levantó PostgreSQL 17 local (sin Docker — ver entrega 3) y se corrió el flujo completo contra el servidor real: login → refresh (con rotación) → cambio de password admin → verificación de que el cambio de password revoca sesiones → logout → verificación de que el refresh token usado deja de servir. Los 9 pasos dieron el resultado esperado.

## Siguiente paso sugerido

Módulo de Entidades (clientes/proveedores).

---

# Entrega 3: Postgres local + prueba end-to-end de Auth

## Qué incluye esto

- PostgreSQL 17 instalado localmente (sin Docker, no estaba disponible en la máquina — ver decisión abajo).
- `prisma/migrations/20260811203243_init/` — primera migración, crea todas las tablas del schema.
- `scripts/seed-test.ts` — script de una sola vez para crear una empresa + usuario de prueba con rol `admin` (`test@gestioya.local` / `password123` originalmente, la contraseña quedó en `nuevaPassword456` después de probar el endpoint de cambio de password). Excluido del build de Nest (`tsconfig.build.json`) porque no es parte de la app.

## Decisión tomada en esta entrega

- **Postgres nativo en vez de Docker para desarrollo local**: no había Docker instalado, y meter Docker Desktop (WSL2, virtualización, reinicio probable) era más pesado que instalar Postgres directo solo para desarrollo. El hosting final (DonWeb, Docker Compose) es una decisión aparte que no cambia por esto — es una diferencia entre el entorno de desarrollo de esta máquina y el de producción, común y sin impacto real mientras el schema/las queries no dependan de nada específico de cómo está empaquetado Postgres.

## Pendiente

- Nada bloqueante para seguir. `JWT_SECRET` de desarrollo sigue pendiente de reemplazo antes de cualquier ambiente real (ver entrega 2).

---

# Entrega 4: repo en GitHub + módulo de Entidades

## Qué incluye esto

- Repo inicializado y publicado en `https://github.com/martingf92/MVP_GestioYA` (commit inicial con todo lo de las entregas 1-3).
- `prisma/schema.prisma` — se agregó `@@unique([empresaId, documentoNro])` en `Entidad`.
- `src/entidades/` — CRUD completo: `entidades.module.ts`, `entidades.controller.ts`, `entidades.service.ts`, DTOs (`create-entidad`, `update-entidad`, `create-cliente`, `create-proveedor`, `list-entidades-query`).
- `scripts/seed-test2.ts` — segunda empresa/usuario de prueba, usado para probar aislamiento entre tenants.

## Endpoints

```
POST   /entidades                  crear (nombre + datos base; cliente/proveedor opcionales anidados)
GET    /entidades                   listar (filtros: nombre, activo, tipo=cliente|proveedor; skip/take)
GET    /entidades/:id               detalle
PATCH  /entidades/:id               actualizar datos base
DELETE /entidades/:id               baja lógica (activo=false)
PUT    /entidades/:id/cliente       crear o actualizar datos de cliente
DELETE /entidades/:id/cliente
PUT    /entidades/:id/proveedor     crear o actualizar datos de proveedor
DELETE /entidades/:id/proveedor
```

Todas requieren `JwtAuthGuard` (usuario autenticado, cualquier rol).

## Decisiones tomadas en esta entrega

- **`documentoNro` único por empresa** (`@@unique([empresaId, documentoNro])`), confirmado explícitamente: una misma empresa no puede cargar dos entidades con el mismo número de documento. `documentoNro` nulo no colisiona con otro nulo (comportamiento estándar de Postgres en unique constraints) — una entidad sin documento cargado no bloquea a otra en la misma situación. String vacío se normaliza a `undefined` antes de guardar, para que no choque contra ese mismo constraint.
- **`DELETE /entidades/:id` es baja lógica** (`activo=false`), no borrado físico — ver razón en la propuesta original (FKs de Remito/CuentaCorriente/Obligacion/Pago/Tarea sin cascade, y no tiene sentido perder historial).
- **Gap real encontrado y cerrado**: `Cliente` y `Proveedor` no tienen `empresaId` propio y no están en el allowlist de `tenant.extension.ts` (no pueden estarlo, no tienen esa columna). Una query directa por `entidadId` en esos dos modelos no queda aislada por tenant sola. Se resolvió con un chequeo explícito (`assertEntidadExists`) que confirma, vía `db.entidad` (que sí es tenant-scoped), que la entidad pertenece a la empresa actual antes de tocar su cliente/proveedor. **Probado**: la empresa B no pudo ni leer ni modificar una entidad de la empresa A a través de estos sub-recursos (ver pruebas abajo).
- **Cast de tipos en `create()`**: el tipo generado por Prisma para `Entidad.create` exige `empresaId` o la relación `empresa`, porque no sabe que `tenant.extension.ts` lo inyecta en runtime. Se castea el `data` (mismo escape hatch que ya usa la extensión), documentado en el código.

## Probado end-to-end contra el servidor real y Postgres

Crear entidad con cliente anidado → crear duplicado con mismo `documentoNro` (rechazado, 409) → listar con filtro `tipo=cliente` → detalle → actualizar → agregar proveedor a la misma entidad → eliminar proveedor → baja lógica de la entidad (sigue existiendo, `activo=false`) → **aislamiento**: usuario de la empresa B no puede ver la entidad de la empresa A (404), no puede escribirle un `cliente` (404), y su propio listado da 0 resultados → sin token, 401. Los 10 pasos dieron el resultado esperado.

## Siguiente paso sugerido

Módulo de Productos.

---

# Entrega 5: frontend mínimo (Next.js) para pruebas manuales

## Qué incluye esto

- `frontend/` — proyecto Next.js aparte (App Router, TypeScript, Tailwind solo por conveniencia de armado rápido, sin inversión de diseño real) para que Martín pueda probar login y Entidades a mano en el navegador, no solo vía Postgres/curl.
- `frontend/src/lib/api.ts` — cliente HTTP mínimo: login, listar/crear/borrar entidades, tokens en `localStorage`.
- `frontend/src/app/login/page.tsx` — form de login.
- `frontend/src/app/entidades/page.tsx` — listado + alta + baja lógica.
- Backend: `app.enableCors()` en `main.ts` (origen configurable por `CORS_ORIGIN`, default `http://localhost:3001`).

## Cómo correrlo

Dos terminales:
```
npm run start:dev          # backend, puerto 3000
cd frontend && npm run dev # frontend, puerto 3001
```
Abrir `http://localhost:3001`. Sin sesión redirige a `/login`. Usuario de prueba: `test@gestioya.local` / `nuevaPassword456` (ver entregas 3-4 para el porqué de esa contraseña).

## Decisiones tomadas en esta entrega

- **Repo único, carpeta `frontend/` separada** (no monorepo con workspaces de npm, no repo aparte): más simple para un equipo de una persona, sin la fricción de manejar dos repos o configurar workspaces todavía. Se revisa si en algún momento hace falta desplegar por separado con pipelines distintos.
- **Tokens en `localStorage`, no httpOnly cookies**: es el frontend de prueba interno, no la versión que verían clientes reales. Antes de exponer esto a un cliente hay que revisar el manejo de tokens en el cliente (XSS, cookies httpOnly para el refresh token) — documentado como pendiente en el propio código (`api.ts`), no es un descuido.
- **Sin refresh automático todavía**: si el access token vence (45min), el usuario tiene que volver a loguearse a mano. No se armó lógica de refresh silencioso en el cliente para no invertir tiempo de frontend antes de tener más pantallas que lo justifiquen (ver `CLAUDE.md`: frontend es prioridad baja por ahora). Es la primera cosa a mejorar cuando se retome frontend en serio.
- **Sin RBAC en la UI**: cualquier usuario logueado ve el mismo botón de "dar de baja"; el backend ya exige `JwtAuthGuard` en todo el módulo de Entidades pero no hay controles de rol adicionales en Entidades (no aplica, no es admin-only). Consistente con el backend.

## Probado

Levantados ambos servidores, probado en el navegador real (Browser pane): login con el usuario de prueba → redirige a `/entidades` → lista los datos reales de la API → crear entidad nueva desde el form → aparece en la lista → dar de baja → queda `activo=no` → logout → vuelve a `/login` → acceso directo a `/entidades` sin sesión redirige a `/login`. Sin errores de CORS ni de consola.

## Pendiente

- Refresh automático de sesión en el cliente.
- Manejo de tokens más seguro antes de un entorno no-interno.
- El resto de los módulos del MVP no tienen pantalla todavía (solo Entidades).

---

# Entrega 6: módulo de Productos (+ Unidades de Medida)

## Qué incluye esto

- `src/unidades-medida/` — CRUD mínimo: crear, listar, eliminar.
- `src/productos/` — CRUD completo: crear, listar (filtros nombre/activo + paginado), detalle, actualizar, baja lógica.
- No hubo cambios de schema — `Producto` y `UnidadMedida` ya estaban completos desde la entrega 1.

## Endpoints

```
POST   /unidades-medida         crear
GET    /unidades-medida          listar
DELETE /unidades-medida/:id      eliminar (borrado físico, bloqueado si está en uso)

POST   /productos                crear (requiere unidadMedidaId válida y de la propia empresa)
GET    /productos                 listar (filtros: nombre, activo; paginado)
GET    /productos/:id             detalle (incluye unidadMedida)
PATCH  /productos/:id             actualizar
DELETE /productos/:id             baja lógica (activo=false)
```

## Decisiones tomadas en esta entrega

- **`UnidadMedida` no tiene `activo`** (no está en el schema, no se inventó): `DELETE` es borrado físico real. Si hay productos usándola, Postgres lo bloquea por la FK y se traduce a un 409 prolijo en vez de un error crudo de Postgres.
- **Mismo gap de aislamiento que en Entidades, encontrado antes de escribir código esta vez** (por el precedente de la entrega 4): `unidadMedidaId` viaja en el body de `POST/PATCH /productos`, así que nada impide de por sí mandar el id de una unidad de otra empresa. Se resolvió igual que con Cliente/Proveedor: `assertUnidadMedidaExists` valida vía `db.unidadMedida` (tenant-scoped) antes de crear o actualizar. Diferencia con el caso anterior: acá el error es `400 Bad Request` (el campo inválido va en el body), no `404` (no es el recurso de la URL).
- **`UnidadMedida` es un catálogo compartido por producto**, no un dato que cuelgue de cada producto individualmente — confirmado explícitamente con Martín (ejemplo: "Kg", "Unidad", "Docena" se cargan una vez por empresa y varios productos comparten la misma fila). Es el modelo que ya traía el schema original, no un cambio.
- **Alta de UnidadMedida "al vuelo" desde el form de producto: pospuesta**, queda para revisar la UX una vez haya un primer cliente real probando el MVP, no antes.

## Probado end-to-end contra el servidor real y Postgres

Crear unidad "KG" → duplicada (mismo código, 409) → crear producto con esa unidad → SKU duplicado (409) → `unidadMedidaId` inventado (400) → listado incluye la unidad anidada → actualizar precio → intentar borrar la unidad en uso (409, bloqueada por FK) → baja lógica del producto (`activo=false`) → **aislamiento**: la empresa B no puede crear un producto usando el `unidadMedidaId` de la empresa A (400) y su propio listado de unidades da 0. Los 10 pasos dieron el resultado esperado.

## Siguiente paso sugerido

Módulo de Remitos (depende de Entidad y Producto, ambos ya listos).

---

# Entrega 7: módulo de Remitos

## Qué incluye esto

- `src/remitos/` — CRUD con ciclo de vida (`borrador → emitido → anulado`), detalles anidados, DTOs.
- No hubo cambios de schema — `Remito`/`DetalleRemito` ya estaban completos desde la entrega 1.

## Endpoints

```
POST   /remitos                crea en estado "borrador" (con detalles anidados)
GET    /remitos                 lista (filtros: tipo, estado, entidadId; paginado)
GET    /remitos/:id             detalle (con líneas + producto + entidad)
PATCH  /remitos/:id             edita cabecera y/o reemplaza detalles -- solo si sigue en "borrador"
POST   /remitos/:id/emitir      borrador → emitido (a partir de ahí, ya no editable)
POST   /remitos/:id/anular      borrador o emitido → anulado (estado final)
```

Sin `DELETE` físico -- "anular" cumple ese rol sin perder trazabilidad, confirmado con Martín antes de programar.

## Decisiones tomadas en esta entrega (confirmadas antes de programar)

- **Ciclo de vida cerrado una vez "emitido"**: ni cabecera ni detalles se pueden tocar después de emitir -- solo queda disponible `anular`. Confirmado explícitamente, no asumido.
- **`subtotal` se calcula en el servidor** (`cantidad × precioUnitario`), nunca se toma del valor que mande el cliente aunque lo mande.
- **`usuarioId` se completa con el usuario autenticado** (`req.user.userId`), no es un campo que decida el cliente.
- **Sin movimientos de stock**: `GESTIOYA.md` marca "Stock" explícitamente como funcionalidad todavía sin definir (sección 14), y el schema no tiene ningún campo de stock en `Producto` (solo `stockMinimo`, que es un umbral). El Remito queda como documento que registra el movimiento, sin tocar ningún contador -- no se inventa uno.
- **`entidadId` (cabecera) y `productoId` (cada línea de detalle) llevan el mismo chequeo cross-tenant** que ya se armó en Entidades/Productos: si vienen de otra empresa, `400 Bad Request`.
- **Editar detalles en un remito "borrador" reemplaza el set completo** (se borran los anteriores y se crean los nuevos dentro de una transacción), en vez de diffear altas/bajas/cambios línea por línea -- más simple para el MVP, sin sub-ingeniería.
- **No se puede emitir un remito sin detalles** (chequeo mínimo de sanity, no pedido explícitamente pero evidente: un remito vacío no tiene sentido emitirlo).

## Bug encontrado y corregido durante las pruebas (no estaba en el plan original)

Al probar, se creó sin problema un remito usando un producto que ya estaba dado de baja (`activo=false`) de una prueba anterior -- nada lo impedía. Se corrigió: `assertProductosExist` y `assertEntidadExists` ahora exigen `activo=true` además de pertenecer a la empresa. Reprobado después del fix: un producto o entidad dado de baja queda bloqueado para remitos nuevos (400).

## Probado end-to-end contra el servidor real y Postgres

Crear remito de salida con una línea → editar cabecera en "borrador" → emitir → intentar editar ya emitido (409) → intentar emitir de nuevo (409) → anular → usar un producto dado de baja (400, tras el fix) → usar un producto de otra empresa (400, aislamiento) → crear remito válido con producto activo → listado. Todos los pasos dieron el resultado esperado.

## Siguiente paso sugerido

Módulo de Cuentas (incluye Obligaciones/Pagos/Cheques) -- el último del MVP backend.

---

# Entrega 8: frontend de Unidades de Medida, Productos y Remitos

## Qué incluye esto

- `frontend/src/components/Nav.tsx` — barra de navegación compartida entre todas las pantallas (Entidades, Productos, Unidades de medida, Remitos + usuario/salir), reemplaza el bloque de logout que estaba duplicado en cada página.
- `frontend/src/app/unidades-medida/page.tsx` — alta, listado, eliminación.
- `frontend/src/app/productos/page.tsx` — alta (con selector de unidad de medida), listado, baja lógica.
- `frontend/src/app/remitos/page.tsx` — listado.
- `frontend/src/app/remitos/nuevo/page.tsx` — alta con líneas de detalle dinámicas (agregar/quitar), selectores de entidad y producto poblados desde la API (solo activos).
- `frontend/src/app/remitos/[id]/page.tsx` — detalle: si está en "borrador" permite editar/agregar/quitar líneas y guardar (PATCH), botón "Emitir"; si está "emitido" o "anulado" el detalle queda de solo lectura; botón "Anular" disponible salvo que ya esté anulado.
- `frontend/src/lib/api.ts` — se agregaron tipos y funciones para `UnidadMedida`, `Producto`, `Remito`/`DetalleRemito`.

## Bug encontrado y corregido durante las pruebas (no estaba en el plan original)

Al navegar directo a `/remitos/[id]` (URL directa o recarga de página, no click interno), React tiraba `Hydration failed` en consola. Causa: `Nav.tsx` leía `localStorage` (vía `getUsuario()`) directo en el cuerpo del render -- el servidor no tiene `localStorage`, así que el HTML que arma el server (sin usuario) no coincidía con el que arma el cliente (con usuario). React se recuperaba solo (por eso no se veía roto en pantalla), pero es un error real que se iba a disparar en cualquier recarga o entrada por URL directa estando logueado. Se corrigió arrancando `usuario` en `null` y seteándolo recién en un `useEffect` (patrón estándar para evitar mismatches de hidratación con datos que solo existen en el cliente). Reprobado en una pestaña nueva (sin caché de JS vieja) contra el servidor reiniciado: sin errores de consola.

## Decisiones tomadas en esta entrega

- **Edición de líneas de un remito "borrador" se hace reemplazando el array completo** al guardar (mismo criterio que ya tiene el backend), no hay diff línea por línea en el cliente tampoco -- consistente, simple.
- **Los selectores de entidad/producto en el alta de remito solo muestran activos** (filtrados en el cliente después de traer la lista completa) -- no tiene sentido ofrecer para elegir algo que el backend va a rechazar.
- **Sin pantalla para Unidades de Medida "al vuelo" desde el form de Producto**: si no hay ninguna unidad cargada, la página de Productos muestra un aviso con link a Unidades de medida en vez de dejar crear el producto sin unidad -- consistente con la decisión ya tomada en la entrega 6.

## Probado end-to-end en el navegador real (Browser pane)

Login → Unidades de medida (ver la existente) → Productos (ver existentes + crear una nueva desde el form) → Remitos: crear con entidad y producto seleccionados desde los dropdowns → detalle en "borrador" con total correcto → Emitir (detalle pasa a solo lectura, solo queda "Anular") → Anular (sin acciones disponibles) → edición de líneas en un remito distinto que seguía en "borrador" (cambio de cantidad, "Guardar cambios", total actualizado) → navegación directa por URL sin errores de hidratación tras el fix. Sin errores de consola en ningún paso.

## Siguiente paso sugerido

Módulo de Cuentas (backend). El frontend queda con Entidades, Productos, Unidades de Medida y Remitos cubiertos.

---

# Entrega 9: PDF de Remitos

## Qué incluye esto

- `GET /remitos/:id/pdf` — genera el remito como PDF al vuelo (con `pdfkit`) y lo devuelve para descargar. No requirió tocar el schema, toda la info ya existía.
- `frontend`: botón "Descargar PDF" en el detalle de un remito (`lib/api.ts#downloadRemitoPdf`) — pide el PDF con el token de auth (un `<a href>` común no puede mandar ese header), arma un blob y dispara la descarga en el navegador.

## Decisión tomada

- **Librería `pdfkit`** en vez de renderizar HTML con un browser headless (Puppeteer): documento simple (encabezado + tabla + total), no hace falta el peso de meter un Chromium embebido solo para esto.
- **No se automatiza el envío por mail/WhatsApp** — se descarga el PDF y el envío queda manual desde ahí, tal como se habló. Automatizar el envío sería integración con esos servicios, otro alcance.

## Probado

`GET /remitos/:id/pdf` contra el servidor real devolvió un PDF válido (verificado el header `%PDF-` y el contenido visual: encabezado, entidad, tabla de productos con cantidad/precio/subtotal, total). Botón del frontend probado disparando el click real sobre el handler de React (no vía coordenadas del mouse, que en este momento no estaban llegando al panel del navegador por un problema del tooling, no del código): la request salió con el header de autenticación correcto y el backend respondió 200.

## Siguiente paso sugerido

Módulo de Cuentas (backend): `CuentaCorriente`, `Obligacion` (con `entidadId` opcional, ver aclaración de Martín) y `Pago` con pagos parciales (requiere agregar una tabla `AplicacionPago`, cambio de schema pendiente de implementar).

---

# Entrega 10: módulo de Cuentas (CuentaCorriente, Obligacion, Pago, Cheque)

## Qué incluye esto

- Cambio de schema: `Obligacion.entidadId` pasa a ser opcional; se agrega el modelo `AplicacionPago` (reemplaza la relación directa `Obligacion.pagoId` → `Pago`, que solo permitía un pago completo por obligación).
- `src/cuentas/` — `CuentasCorrientesService` (helper compartido: crea la cuenta al vuelo, registra movimientos), `ObligacionesService`/`Controller`, `PagosService`/`Controller` (con `Cheque` anidado), `CuentaCorrienteController`.

## Aclaración de concepto que cambió el diseño a mitad de camino

La primera versión de este módulo asumía que `Obligacion` siempre colgaba de una `Entidad` (proveedor/acreedor puntual, deuda comercial). Martín aclaró que también necesita trackear compromisos generales de la empresa sin entidad asociada (alquiler, servicios) con el mismo mecanismo de pagos parciales/vencimientos. Como el schema no distinguía dos conceptos separados, se resolvió haciendo `entidadId` opcional en la misma tabla, en vez de duplicar toda la lógica de pagos en un modelo nuevo — con entidad, afecta su `CuentaCorriente`; sin entidad, es solo un ítem a pagar.

## Endpoints

```
GET   /entidades/:id/cuenta-corriente      saldo + historial de movimientos (se crea sola al primer movimiento)

POST  /obligaciones                         crear (entidadId?, monto, tipo?, descripcion?, fechaVencimiento?)
GET   /obligaciones                          listar (filtros: entidadId, estado)
GET   /obligaciones/:id                      incluye montoPagado, saldo y vencida (todos calculados, no guardados)
POST  /obligaciones/:id/anular               solo si no tiene ningún pago aplicado

POST  /pagos                                 crear (entidadId?, monto, medio?, aplicaciones?: [{obligacionId, monto}], cheques?: [...])
GET   /pagos
GET   /pagos/:id
POST  /pagos/:id/anular                      revierte movimientos; las obligaciones afectadas vuelven a pendiente/parcial
```

## Decisiones tomadas (confirmadas con Martín antes de tocar el schema)

- **Saldo de `CuentaCorriente`**: positivo = la entidad le debe a la empresa; negativo = la empresa le debe a la entidad. Misma tabla para clientes y proveedores/acreedores.
- **Pagos parciales genéricos**: aplica igual a cualquier `Obligacion`, sin distinguir "deuda comercial" de "gasto operativo" — el schema no tiene (ni se agregó) un campo de categoría para diferenciarlas.
- **`montoPagado`/`saldo` no se guardan como campo fijo**: se calculan sumando `AplicacionPago` (filtrando pagos con estado `rechazado`, que no cuentan). Mismo criterio que ya se usó para no confiar en contadores que se puedan desincronizar del historial real.
- **`estado` de `Obligacion` sí se guarda** (a diferencia de montoPagado/saldo) y se recalcula transaccionalmente en cada aplicación o reversión de pago — necesario para poder filtrar `GET /obligaciones?estado=...` sin traer todo a memoria.
- **`vencida` no se guarda**: se calcula al mostrar (`fechaVencimiento` pasada + no cancelada/anulada). Guardarla como estado fijo necesitaría un proceso en segundo plano que no existe todavía.
- **Anular un `Pago` reutiliza el estado `rechazado`** (ya estaba en el enum original) en vez de agregar un estado nuevo. Anular una `Obligacion` sí suma un estado nuevo, `anulada` (no estaba en el comentario original del schema, que solo es un comentario, no un enum real de Postgres).
- **`CuentaCorriente` se crea sola** la primera vez que una entidad tiene una obligación o un pago — no al crear la `Entidad`.

## Bug encontrado y corregido durante las pruebas (afecta también a Remitos)

`class-validator`'s `@IsDateString()` acepta fechas sin horario (`"2020-01-01"`), pero Prisma exige un datetime ISO completo para campos `DateTime` y tira un 500 crudo si le llega solo la fecha. Se corrigió convirtiendo con `new Date(...)` antes de pasarle el valor a Prisma, en `Obligacion.fechaVencimiento`, `Cheque.fechaEmision`/`fechaCobro`, y de paso en `Remito.fecha` (mismo bug, latente ahí porque nunca se había probado mandando `fecha` explícita). Reprobado en los tres lugares tras el fix.

## Probado end-to-end contra el servidor real y Postgres

Obligación sin entidad (no toca cuenta corriente) → obligación con entidad (crea la cuenta, movimiento "debe") → pago parcial con cheque anidado (obligación pasa a "parcial", saldo baja) → intento de sobre-pago (400) → pago final (obligación "cancelada", saldo en 0) → anular el pago final (reversión completa: obligación vuelve a "parcial", saldo vuelve a como estaba) → anular el mismo pago de nuevo (409) → anular obligación con pagos aplicados (409) → crear y anular obligación sin pagos (funciona, no afecta otras cuentas) → **aislamiento**: otra empresa no puede pagar una obligación ajena (400), no puede ver la cuenta corriente ajena (404) ni la obligación ajena (404), su propio listado da 0 → flag `vencida` calculado bien → filtro por estado → sin token (401). Todos los pasos dieron el resultado esperado.

## Pendiente

- El frontend no tiene pantallas de Cuentas todavía (Obligaciones, Pagos, cuenta corriente).

## Siguiente paso sugerido

Módulo de Tareas (backend) — el último módulo del MVP.

---

# Entrega 11: módulo de Tareas (con recordatorios "app")

## Qué incluye esto

- `src/tareas/` — CRUD completo de `Tarea` (con `Notificacion` anidada al crear), más `GET /tareas/recordatorios`.

## Endpoints

```
POST   /tareas                 crear (titulo, descripcion?, entidadId?, fechaVencimiento?, prioridad?, usuarioResponsableId?, notificaciones?: [{canal, fechaProgramada}])
GET    /tareas                  listar (filtros: estado, entidadId, usuarioResponsableId)
GET    /tareas/recordatorios    notificaciones canal "app" ya vencidas y pendientes -- ver decisión abajo
GET    /tareas/:id
PATCH  /tareas/:id              editar (incluye cambiar estado: abierta → en_proceso → cumplida)
DELETE /tareas/:id              borrado físico real
```

## Decisión: recordatorios sin Redis/n8n, confirmada con Martín

Martín marcó que "no sirve de nada las tareas sin que tengan los recordatorios". `Notificacion.canal` puede ser `app | email | sms | whatsapp`; para `email`/`sms`/`whatsapp` hace falta un servicio externo enviando de verdad (Redis/n8n, fuera del stack por ahora según `CLAUDE.md`) -- esas notificaciones se guardan igual, quedan en `pendiente`, pero **no se envían** (decisión pendiente aparte, depende de qué proveedor se contrate).

Para `canal: "app"` no hace falta ningún motor de jobs: `GET /tareas/recordatorios` calcula al vuelo qué notificaciones ya llegaron a su `fechaProgramada` y siguen `pendiente` -- mismo criterio que ya se usa para `vencida` en Tarea/Obligacion (calculado al leer, no disparado por un proceso en background). Es lo que le da uso real al sistema de recordatorios hoy: se consulta al entrar a la app.

## Otras decisiones

- **`DELETE` es borrado físico real**, a diferencia de Entidad/Producto/Remito/Obligacion: una Tarea no es un registro financiero ni de negocio con valor de auditoría, no amerita baja lógica. `Notificacion` tiene `onDelete: Cascade`, se limpia sola.
- **`vencida` calculada, no guardada** (mismo criterio que Obligacion).
- **`entidadId` y `usuarioResponsableId` con el mismo chequeo cross-tenant** ya establecido en el resto de los módulos. `creadaPorUsuarioId` se completa solo con el usuario autenticado, no es un campo que mande el cliente.
- **`GET /tareas/recordatorios` se registra antes que `GET /tareas/:id`** en el controller -- si no, `:id` matchea "recordatorios" como si fuera un id.

## Probado end-to-end contra el servidor real y Postgres

Crear tarea con notificación `app` programada en el pasado → aparece en `GET /tareas/recordatorios` → marcar tarea como "cumplida" (`vencida` pasa a `false`) → filtrar listado por estado → borrado físico (404 después) → aislamiento: la empresa B no ve nada en su listado ni en sus recordatorios → sin token, 401. Todos los pasos dieron el resultado esperado.

## Con esto queda cerrado el backend del MVP

Los 5 módulos (Entidades, Productos, Remitos, Cuentas, Tareas) más Auth están construidos y probados de punta a punta, incluyendo aislamiento entre empresas en cada uno. Facturación sigue afuera a propósito (no por olvido, ver `CLAUDE.md`).

## Pendiente

- Envío real de notificaciones por email/SMS/WhatsApp (necesita decidir proveedor + Redis/n8n).
- El frontend no tiene pantallas de Cuentas ni de Tareas todavía.

## Siguiente paso sugerido

Frontend: sumar pantallas de Cuentas y Tareas para poder probar todo el MVP desde el navegador. El backend del MVP ya está completo.

---

# Entrega 12: frontend de Cuentas (Obligaciones, Pagos, cuenta corriente) y Tareas

## Qué incluye esto

- `frontend/src/app/obligaciones/page.tsx` — listado (con `montoPagado`, estado, `vencida`) + alta (entidad opcional) + anular (solo visible si `montoPagado === 0`, mismo criterio que el backend).
- `frontend/src/app/pagos/page.tsx` — listado + alta con líneas dinámicas de "aplicar a obligación" (selector con el saldo pendiente de cada una) + cheques + anular.
- `frontend/src/app/entidades/[id]/cuenta-corriente/page.tsx` — saldo actual (con leyenda de a quién le debe quién) + historial completo de movimientos. Accesible desde un link nuevo en cada fila de la tabla de Entidades.
- `frontend/src/app/tareas/page.tsx` — banner de "recordatorios pendientes" (consume `GET /tareas/recordatorios`) arriba de todo, listado con `vencida`, alta (con recordatorio "app" automático si se carga vencimiento), cambio de estado inline, eliminar.
- Con esto, **todos los módulos del MVP tienen pantalla** en el frontend.

## Bug encontrado y corregido durante las pruebas

El selector de "aplicar a obligación" en Pagos mostraba obligaciones con `estado: "anulada"` como opción válida (el filtro del frontend solo chequeaba `saldo > 0`, y una obligación anulada sin pagos tiene `saldo === monto`, o sea > 0). El backend ya la rechazaba correctamente (400), pero el usuario se hubiera encontrado con un error confuso en vez de no ver la opción. Se agregó `&& o.estado !== 'anulada'` al filtro.

## Probado en el navegador real (Browser pane) contra el backend real

Obligaciones: alta sin entidad y con entidad, botón "anular" respeta la regla de negocio. Pagos: alta aplicando a una obligación válida (el saldo bajó correctamente en la tabla), pago anulado no muestra botón de anular de nuevo. Cuenta corriente: el historial mostrado coincide exactamente con las pruebas hechas por API en la entrega 10 (mismo saldo, mismos movimientos, en el mismo orden). Tareas: alta con recordatorio automático → aparece en el banner → cambiar estado a "cumplida" saca el flag `vencida` → eliminar borra la tarea y su recordatorio (cascada). Sin errores de consola relevantes (solo WebSocket de HMR de una sesión de dev anterior, no del código).

## Con esto el frontend queda alineado 1:1 con el backend

Los 5 módulos del MVP (Entidades, Productos, Remitos, Cuentas, Tareas) tienen CRUD funcional en el navegador, sin diseño todavía (a propósito, ver `CLAUDE.md`).

## Siguiente paso sugerido

Diseño visual del frontend (cuando Martín defina la dirección), o seguir iterando funcionalidad si aparecen huecos al usar el MVP en la práctica.

---

# Entrega 13: Remitos conectados a Cuenta Corriente + dirección de deuda + Acreedor

## Qué incluye esto

Gap real encontrado por Martín usando el MVP: emitir un Remito no dejaba nada asentado en la Cuenta Corriente de la entidad -- había que cargar la Obligación a mano por separado. Al investigar salió a la luz algo más profundo: el módulo de Cuentas solo sabía modelar "la entidad nos debe" (`ObligacionesService.create` siempre registraba `'debe'` positivo); no existía la dirección inversa "nosotros le debemos a la entidad", necesaria para que una compra a un proveedor tuviera sentido.

- `prisma/schema.prisma` -- `Obligacion.direccion` (`'a_cobrar' | 'a_pagar'`, default `'a_cobrar'` para no romper nada existente), `Obligacion.remitoId` (FK opcional única a `Remito`), modelo `Acreedor` (mismo patrón que `Proveedor`, no excluyente con él).
- `src/cuentas/obligaciones.service.ts` -- `signoDireccion()` centraliza el signo (+1 a_cobrar, -1 a_pagar); `createWithinTx`/`anularWithinTx` son la lógica de siempre pero componible dentro de una transacción externa (la usa `RemitosService`).
- `src/cuentas/pagos.service.ts` -- aplicar/revertir un pago ahora invierte el signo según la dirección de la obligación que está pagando.
- `src/remitos/remitos.service.ts` -- `emitir()` genera automáticamente una Obligación si el remito tiene entidad (S=a_cobrar/venta, E=a_pagar/compra), todo en una sola transacción. `anular()` cascadea: anula la obligación generada si no tiene pagos aplicados, o bloquea la anulación si ya los tiene (409, mismo criterio que ya usaba `ObligacionesService.anular`).
- `src/entidades/` -- endpoints `PUT`/`DELETE /entidades/:id/acreedor`, filtro `?tipo=acreedor`.
- Frontend: selector de dirección en el alta manual de Obligaciones, columna "Dirección" en la tabla, checkboxes Cliente/Proveedor/Acreedor al crear una Entidad (antes el frontend no tenía forma de cargar ninguno de los tres), columna "Tipo" en Entidades, nota con link a la cuenta corriente en el detalle de un Remito emitido.

## Decisión de diseño

Reusar toda la maquinaria de `Obligacion` (pagos parciales, vencimiento, estado) para lo que genera el Remito, en vez de un movimiento suelto en `MovimientoCuenta` -- confirmado con Martín antes de tocar el schema (mismas tres preguntas: qué generar, si agregar la dirección inversa, cómo modelar Proveedor vs Acreedor).

## Probado end-to-end contra el servidor real y Postgres

Remito de salida a un cliente, emitido → genera Obligación `a_cobrar`, saldo +monto. Remito de entrada de un proveedor, emitido → genera Obligación `a_pagar`, saldo -monto (le debemos). Pago parcial sobre la obligación `a_pagar` → saldo sube hacia 0 (no baja). Anular el remito de salida sin pagos aplicados → cascada: obligación anulada, saldo vuelve a 0. Anular el remito de entrada con un pago ya aplicado → bloqueado (409). Alta de Acreedor sobre una entidad que ya era Proveedor → coexisten. Filtro `?tipo=acreedor`. Todo repetido en el navegador real contra el backend real, sin errores de consola.

## Pendiente

- No hay todavía una vista "comparativa" Proveedor vs Acreedor en el frontend (Martín lo mencionó como algo a futuro, no para ahora) -- el modelo de datos ya lo soporta (`Entidad.proveedor`/`Entidad.acreedor` independientes, `Obligacion.direccion` filtrable).
- Remitos sin `entidadId` (permitido por el schema) siguen sin generar nada en Cuentas -- no hay a quién asignarle el movimiento, comportamiento esperado.

## Siguiente paso sugerido

Diseño visual del frontend, o la vista comparativa Proveedor vs Acreedor si Martín la prioriza antes que el diseño.

---

# Entrega 14: Auditoría, logs de errores técnicos, y base de la comparativa Proveedor/Acreedor

## Qué incluye esto

- `prisma/schema.prisma` -- modelo `LogError` (errores técnicos 5xx, distinto de `LogAccion` que es auditoría de negocio). No entra en el allowlist de `tenant.extension.ts` a propósito: un error puede pasar antes de que exista `empresaId` en contexto, o justamente porque el contexto de tenant falló -- se escribe siempre vía `prisma.raw`.
- `src/common/audit/audit.interceptor.ts` -- interceptor global (`APP_INTERCEPTOR`) que audita cada `POST`/`PATCH`/`PUT`/`DELETE` exitoso de toda la app en `LogAccion`, sin tener que tocar cada service. Guarda "qué se pidió cambiar" (el body de la request), no un diff campo-por-campo real -- decisión tomada con Martín: cubre los 5 módulos + Auth de una sola vez, menos preciso si un `PATCH` cambia solo parte de los campos. Excluye rutas de sesión (`auth/login`, `auth/refresh`, `auth/logout`) y redacta `password`/`token`/`accessToken`/`refreshToken`/`secret` antes de guardar.
- `src/common/errors/error-log.filter.ts` -- filtro global (`APP_FILTER`, `@Catch()`) que reemplaza el manejo de excepciones default de Nest. Mantiene el mismo formato de respuesta de siempre (no rompe nada existente), pero persiste en `LogError` los errores 5xx reales con ruta, método, usuario, mensaje y stack trace. Un 400/404/409 (respuesta esperada del negocio) no se guarda -- decisión tomada con Martín para no ensuciar la tabla con "ruido".
- `src/common/audit/` -- `GET /auditoria` y `GET /logs-error` (ambos `AdminGuard`), de solo lectura -- sin esto los datos quedaban inaccesibles sin entrar directo a Postgres.
- `src/cuentas/obligaciones.service.ts` -- `GET /obligaciones` ahora acepta `?tipoEntidad=proveedor|acreedor` y `?orderDir=asc|desc`, e incluye los datos del remito de origen (número, fecha, tipo) cuando corresponde. Es la base de datos para la tabla comparativa Proveedor vs Acreedor que pidió Martín -- los gráficos quedan para la vuelta de diseño de UI.

## Probado

Alta/baja de una entidad quedaron auditadas con el body correcto. El cambio de password quedó auditado con el campo `password` redactado (`[REDACTADO]`, nunca en texto plano). Login/refresh/logout no generaron entradas de auditoría. Un error 400 esperado no generó `LogError`; un error forzado (probado invocando el filtro directamente, no fue posible provocar un 500 real de forma orgánica vía HTTP porque Nest ya normaliza correctamente los errores comunes a 4xx) sí quedó guardado completo con stack trace, y el cliente solo recibió "Internal server error" genérico, sin filtrar detalles internos. Filtro `tipoEntidad`, `orderDir` y el remito incluido en `GET /obligaciones`, probados los tres.

## Pendiente

- Sin pantalla en el frontend todavía para auditoría, logs de errores, ni la tabla comparativa Proveedor/Acreedor -- son datos de backend listos para cuando se encare la sección de "Reportes" en la UI.

## Siguiente paso sugerido

Diseño visual del frontend (incluyendo dónde va "Reportes" en la navegación), o seguir sumando funcionalidad de backend si aparecen más huecos al usar el MVP.

---

# Entrega 15: rediseño "Mostrador" — Login, Entidades e Inicio (dashboard)

## Qué incluye esto

Martín eligió una dirección visual con Claude Design ("Mostrador": cálida, fondo tipo papel, verde contable, serif para montos). El handoff completo (tokens, componentes, 6 pantallas con sus estados) está en `frontend/diseño/design_handoff_gestioya_mostrador/README.md` — es la fuente de verdad del diseño. Se implementa **pantalla por pantalla, mobile-first** (pedido explícito: muchos comerciantes solo tienen el celular), validando cada una en 375px / 768px / 1280px antes de seguir.

- Sistema de diseño: tokens en `@theme` de `globals.css`, fuentes Source Serif 4 + Public Sans (`next/font`), íconos Lucide, breakpoint propio `nav:` (835px) donde la tab bar inferior pasa a nav horizontal.
- `frontend/src/components/ui/` — primitivas propias (Button + `buttonClasses` para links, Input, Field, Checkbox, Card, AlertBanner, Chip, Avatar, RoleBadge, Segmented, Modal, EmptyState, Skeleton, ErrorState). Sin librería de componentes externa.
- `frontend/src/components/Shell.tsx` — header + nav compartido. Mobile/tablet: tab bar inferior de 5 destinos + "Más". Desktop: nav horizontal de 6 tabs. Obligaciones y Pagos no están en el nav a propósito: según el diseño viven dentro de "Cuentas" (pantalla todavía no construida; hoy "Cuentas" apunta a `/obligaciones`).
- **Login**: rediseñado. "No cerrar sesión" ahora es real (marcado = localStorage, sin marcar = sessionStorage). Los montos del panel verde se muestran tapados (`$ •••.•••`) — mostrar montos, aunque fueran de ejemplo, en una pantalla pública no tenía sentido (observación de Martín).
- **Entidades**: tarjetas en mobile, tabla en desktop, filtros (búsqueda + chips por rol) persistidos en la URL, orden por saldo, alta en modal, estados vacío/cargando/error. Backend: `GET /entidades` trae saldo + último movimiento en la misma consulta, con `orderBy=saldo`.
- **Inicio** (nueva, pasa a ser la pantalla de entrada después del login): saludo con resumen en una frase, KPIs (Te deben / Debés / Movimiento del mes), gráfico de ingresos vs egresos (diario 14 días / semanal 8 semanas / mensual 6 meses), "Para reclamar primero", accesos rápidos y tareas tildables. Backend nuevo: `src/dashboard/` con `GET /dashboard/resumen` y `GET /dashboard/flujo?periodo=`.

## Decisiones tomadas

- **Datos reales, no mocks**: el handoff sugería arrancar con datos mock; como el backend ya existía y estaba probado, se conectó directo a la API real y solo se construyó backend nuevo donde faltaba (dashboard, saldo en el listado de entidades).
- **Ingresos/egresos se cuentan por `AplicacionPago`**, no por `Pago.monto`: la aplicación es lo que dice hacia dónde fue la plata (obligación `a_cobrar` = ingreso, `a_pagar` = egreso). Un pago sin aplicaciones no suma a ninguno. Los períodos se arman en hora argentina (`America/Argentina/Buenos_Aires`), no en la del servidor.
- **Orden por saldo en memoria**: ordenar en Postgres a través de la relación dejaba primero las entidades sin cuenta corriente (NULLS FIRST en DESC). Se ordena en memoria tratando "sin movimientos" como 0 — correcto a la escala de una PyME; con mucho volumen convendría SQL crudo.
- **Gráfico con Recharts** (decisión ya tomada en `CLAUDE.md`). Colores de barras un paso más vivos que los de UI (`#23805C` / `#B4492C`): los tonos de UI no pasaban el piso de croma para marcas de datos — validado con el script de dataviz (croma, contraste y separación bajo daltonismo). Leyenda con muestra + texto, tooltip por barra y vista de tabla como alternativa accesible.
- Mensajes del mockup que no coinciden con el backend real no se copiaron: el login muestra el error real de la API (no existe bloqueo por N intentos); "Recuperar acceso" / "Crear cuenta" / selector de empresa / búsqueda global / notificaciones / "Exportar" están visualmente pero sin funcionalidad, porque dependen de cosas que no existen todavía.

## Pendiente

- Pantallas sin rediseñar todavía: Cuentas (Obligaciones + Pagos + cuenta corriente unificadas), Remitos (listado, nuevo con líneas dinámicas, detalle), Productos, Unidades de medida, Tareas.
- La obligación "mercadería semanal" ($50.000, gasto general) quedó como `a_cobrar` por default porque se cargó antes de que existiera `direccion` — suma a "Te deben" en el dashboard. Corregir anulándola y volviéndola a cargar como "Les debemos".
- Fecha de baja de una entidad: el diseño muestra "Dada de baja el DD/MM", pero el backend solo guarda `activo` (sin fecha).
- `npm audit` del frontend: Next.js 16.3.0 tiene un aviso crítico (se corrige con 16.3.6), preexistente — pendiente de actualizar con OK de Martín.

## Siguiente paso sugerido

Pantalla de Cuentas (la de "mayor exigencia visual" según el handoff: saldo con signo, movimientos, obligaciones y pagos en pestañas).
