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
