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
Repo publicado en `https://github.com/martingf92/MVP_GestioYA`. **Backend del
MVP completo**: Auth (JWT + refresh token), Entidades (CRUD + cliente/
proveedor), Unidades de Medida, Productos, Remitos (con ciclo de vida
borrador/emitido/anulado, y descarga en PDF), Cuentas (CuentaCorriente,
Obligacion con entidadId opcional, Pago con pagos parciales, Cheque) y Tareas
(con recordatorios "app" sin necesitar Redis/n8n) — todos construidos y
probados de punta a punta contra Postgres real (PostgreSQL 17 local, sin
Docker, ver NOTAS.md entrega 3), incluyendo aislamiento entre empresas.
Frontend en `frontend/` (Next.js) con login y pantallas de
Entidades, Productos, Unidades de Medida, Remitos, Obligaciones, Pagos (con
cuenta corriente por entidad) y Tareas (con recordatorios) — **el frontend
ya cubre los 5 módulos del MVP**, todo probado en el navegador contra el
backend real — ver `NOTAS.md` (entregas 1 a 12) para el detalle completo.

**Rediseño en curso** (dirección visual "Mostrador", ver
`frontend/diseño/design_handoff_gestioya_mostrador/README.md` y `NOTAS.md`
entrega 15): se hace pantalla por pantalla, **mobile-first** (muchos
comerciantes solo usan el celular), validando cada una en 375 / 768 / 1280px
y esperando el OK de Martín antes de pasar a la siguiente. Hechas: Login,
Entidades, Inicio (dashboard con gráfico de ingresos/egresos), Cuentas
(resumen + cuenta corriente por entidad, entregas 15 y 16). Datos siempre
reales de la API, no mocks. Pendientes de rediseño: Remitos, Productos,
Unidades de medida, Tareas (todavía con el estilo viejo y `components/Nav.tsx`).

Cómo se trabaja el rediseño (validado con Martín, mantenerlo):
- Una pantalla por vez; al terminar, probarla en el navegador en 375 / 768 /
  1280px, mostrarla y **esperar su OK** antes de la siguiente.
- Copy en castellano rioplatense (voseo). Estados vacío / cargando / error /
  normal en cada pantalla. Todo estado con glifo + palabra, no solo color.
- Primitivas en `frontend/src/components/ui/`, shell en `components/Shell.tsx`.
  Para gráficos, usar el skill de dataviz (validar paleta con su script).
- Commit/push solo cuando Martín lo pide.

Entorno local (Windows): Postgres 17 nativo (servicio de Windows, arranca
solo). En Git Bash hay que anteponer `export PATH="/c/Program Files/nodejs:$PATH"`.
Backend `npm run start:dev` (tarda ~25s en quedar arriba), frontend
`cd frontend && npm run dev` (puerto 3001). Usuario de prueba
`test@gestioya.local` / `password123`.

## Próximo paso
Seguir el rediseño con Remitos (listado, nuevo con líneas dinámicas, detalle),
después Productos, Unidades de medida y Tareas. Decisión pendiente de Martín:
subir Next.js 16.3.0 → 16.3.6 (aviso de seguridad crítico de `npm audit`).
Pendiente aparte, no bloqueante: envío real de notificaciones por
email/SMS/WhatsApp (necesita decidir proveedor). Ver NOTAS.md entrega 13
para lo último: Remitos ahora generan Obligación automática en Cuenta
Corriente al emitirse, con dirección a_cobrar/a_pagar, y Entidad distingue
Proveedor de Acreedor (no excluyentes). Ver entrega 14: auditoría de
negocio (LogAccion) y logs de errores técnicos (LogError) ya implementados
vía interceptor/filtro globales, `GET /obligaciones` ya soporta el filtro
por tipoEntidad para la comparativa Proveedor vs Acreedor. Falta la UI de
Reportes (auditoría, errores, comparativa) -- el backend ya está listo.

## Documentos de referencia
- `GESTIOYA.md` — contexto de producto completo, reglas del equipo, qué NO está
  definido todavía (sección 50).
- `NOTAS.md` — decisiones y pendientes de cada entrega.
- Repo: `https://github.com/martingf92/MVP_GestioYA`.
