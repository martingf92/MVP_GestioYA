# GestioYA — contexto para Claude Code

## Qué es esto
ERP SaaS para PyMEs argentinas (Byte Ecosistemas). Multi-tenant. Backend NestJS +
Prisma + PostgreSQL, frontend Next.js. En la práctica lo llevan Martín + Claude
Code, sin más gente en el equipo — prioridad: validar mercado rápido, evitar
sobre-ingeniería. Objetivo: tener algo demostrable hacia fin de 2026.

## Principios de trabajo (no negociables)
- No inventar funcionalidades ni estructura de datos que no esté definida. Si algo
  es ambiguo, marcarlo como "decisión pendiente" y seguir con lo que sí está claro.
- Antes de un cambio de arquitectura (framework, DB, modelo multi-tenant, estructura
  del proyecto): explicar por qué + ventajas + desventajas + impacto, y esperar
  aprobación. No cambiar arquitectura de forma unilateral.
- Frontend/diseño visual: prioridad baja por ahora. Foco en backend, modelo de
  datos, funcionalidad.
- MVP = 5 módulos: Entidades, Productos, Remitos, Cuentas (incluye Obligaciones/
  Pagos/Cheques), Tareas. Facturación queda afuera del MVP a propósito, no por
  olvido.

## Decisiones de arquitectura ya tomadas (con su razón)
- **Multi-tenancy**: shared schema + `empresaId` en cada tabla operativa (no
  schema-por-tenant, no DB-por-tenant). Elegido por velocidad de desarrollo con
  equipo chico; se revisa si algún cliente grande lo exige más adelante.
- **Aislamiento de tenant**: Prisma Client Extension (`src/prisma/tenant.extension.ts`)
  inyecta `empresaId` en cada query automáticamente, leyendo un `AsyncLocalStorage`
  (`tenant-context.ts`) poblado por `TenantMiddleware`. Fail-closed: sin tenant en
  contexto, la query tira error en vez de devolver datos sin filtrar.
- **Por qué extensión y no `$use`**: el middleware clásico de Prisma (`$use`) fue
  removido en Prisma 6.14. No usarlo aunque aparezca en tutoriales viejos.
- **Hosting**: DonWeb Cloud Server (Docker Compose). Todavía sin contratar — la
  configuración exacta de vCPU/RAM se define cuando haya build corriendo local.
- **n8n y Metabase fuera del stack día 1**: n8n self-hosted es gratis (Sustainable
  Use License) pero no aporta al MVP, se suma en fase de integraciones. Metabase se
  reemplaza en el MVP por queries de agregación simples + Recharts en el propio
  Next.js (evita además el riesgo de licencia AGPL de embeber Metabase para
  clientes finales).
- **`Rol`**: catálogo global de roles, no por empresa.
- **`Usuario.email`**: único a nivel global, no por empresa. Trade-off deliberado
  para simplificar el login del MVP — revisar cuando se construya Auth.

## Estado actual
Repo publicado en `https://github.com/martingf92/MVP_GestioYA`. Backend NestJS
armado, con PostgreSQL 17 corriendo local (sin Docker, ver NOTAS.md entrega 3).
Auth (JWT + refresh token), Entidades (CRUD + cliente/proveedor), Unidades de
Medida, Productos, Remitos (con ciclo de vida borrador/emitido/anulado, y
descarga en PDF) y Cuentas (CuentaCorriente, Obligacion con entidadId
opcional, Pago con pagos parciales, Cheque) construidos y probados de punta a
punta contra la base real, incluyendo aislamiento entre empresas. Frontend en
`frontend/` (Next.js, sin diseño) con login y pantallas de Entidades,
Productos, Unidades de Medida y Remitos — Cuentas todavía sin pantalla — ver
`NOTAS.md` (entregas 1 a 10) para el detalle completo.

## Próximo paso
Módulo de Tareas (backend) — el último módulo del MVP. El frontend sigue en
segundo plano: se le suma pantalla a cada módulo nuevo a medida que el
backend lo soporta, sin invertir en diseño todavía (Cuentas quedó pendiente
de pantalla).

## Documentos de referencia
- `GESTIOYA.md` — contexto de producto completo, reglas del equipo, qué NO está
  definido todavía (sección 50).
- `NOTAS.md` — decisiones y pendientes de cada entrega.
- Repo: `https://github.com/martingf92/MVP_GestioYA`.
