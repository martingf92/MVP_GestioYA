# GestioYA — Infraestructura y despliegue a producción

## Qué es este documento

Guía operativa de cómo pasar de "el código está en GitHub" a "el producto
está disponible para un usuario final real". Complementa a `CLAUDE.md` y
`GESTIOYA.md` (que son de producto/contexto) y a `NOTAS.md` (bitácora de
desarrollo) -- este documento es específicamente de infraestructura, deploy
y operación.

Como en el resto del proyecto: lo que no está decidido se marca
explícitamente como **decisión pendiente**, no se inventa.

---

## 1. Arquitectura real hoy (no la aspiracional del starter kit)

`GESTIOYA.md` documenta la arquitectura *conceptual* original del starter
kit (sección 9), que incluía Redis, n8n, Metabase, pgvector y pg_trgm desde
el día uno. Eso fue una decisión consciente de simplificación, no un olvido
(ver `CLAUDE.md`, "Decisiones de arquitectura ya tomadas"): **ninguna de
esas piezas está construida ni corriendo hoy**. Lo que existe y corre de
verdad, a la fecha de este documento:

```
Next.js (frontend, puerto 3001)
   ↓ REST/JSON
NestJS (backend/API, puerto 3000)
   ↓ Prisma
PostgreSQL 17 (una sola base, un solo esquema, aislamiento por empresaId)
```

Nada más. Sin Redis, sin n8n, sin Metabase, sin cola de jobs. El MVP entero
corre con estas tres piezas. Cuando se sumen notificaciones reales
(email/SMS/WhatsApp) va a hacer falta algo más (ver sección 7), pero
todavía no está construido.

---

## 2. Servicios necesarios para poner esto en producción

| Servicio | Para qué | Estado |
|---|---|---|
| Servidor (DonWeb Cloud Server) | Correr los contenedores | **Sin contratar** -- decisión pendiente (plan, vCPU/RAM) |
| Dominio | URL pública del sitio y de la API | **Sin definir** -- decisión pendiente |
| Certificado HTTPS | Tráfico cifrado | Se resuelve solo con Caddy (ver sección 6), no hace falta comprarlo aparte |
| PostgreSQL | Base de datos | Corre como contenedor Docker (ver `docker-compose.yml`), no como servicio nativo como en desarrollo |
| Correo transaccional (envío real) | Notificaciones de Tareas, recuperación de contraseña self-service | **Sin decidir proveedor** -- DonWeb ya se usa para el correo corporativo (`GESTIOYA.md` sección 33), evaluar si el mismo sirve para envío transaccional o hace falta uno dedicado (SendGrid, Resend, Amazon SES, etc.) |
| Backups | No perder datos | **Sin política definida** -- ver sección 8 |

---

## 3. Variables de entorno

Ver `.env.example` (raíz, backend) y `frontend/.env.example`. Resumen de
qué es cada una y de dónde sale:

| Variable | Dónde se usa | Cómo se obtiene |
|---|---|---|
| `DATABASE_URL` | Backend | Se arma con usuario/password/host de Postgres. En producción, host = `postgres` (nombre del servicio en `docker-compose.yml`) |
| `JWT_SECRET` | Backend | Generar uno **nuevo** por ambiente: `openssl rand -hex 32`. Nunca el mismo que en desarrollo |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_DAYS` | Backend | Ya tienen default razonable (45m / 30 días), no hace falta tocarlos |
| `CORS_ORIGIN` | Backend | La URL pública exacta del frontend (`https://tu-dominio.com`) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `docker-compose.yml` (arranque del contenedor de Postgres) | Elegir una password fuerte nueva, no reusar la de desarrollo local |
| `NEXT_PUBLIC_API_URL` | Frontend | La URL pública del backend (`https://api.tu-dominio.com` o el path que se defina) |

**Ninguna de estas variables se commitea.** El `.env` real vive solo en el
servidor de producción (o se inyecta vía el mecanismo de secrets que ofrezca
DonWeb), igual que hoy vive solo en esta máquina de desarrollo.

---

## 4. Paso a paso para desplegar

Esto asume que ya se contrató el servidor en DonWeb y se tiene acceso SSH.

1. **Instalar Docker y Docker Compose** en el servidor (DonWeb Cloud Server
   corre sobre una VM propia, no tiene las limitaciones de esta máquina de
   desarrollo -- acá se evitó Docker a propósito, en el servidor real es
   la base de todo, ver `CLAUDE.md`).
2. **Clonar el repo**: `git clone https://github.com/martingf92/MVP_GestioYA.git`
3. **Crear el `.env`** en la raíz del repo clonado, a partir de
   `.env.example`, con valores reales de producción (ver sección 3).
4. **Generar `JWT_SECRET` nuevo**: `openssl rand -hex 32` y pegarlo en el
   `.env`.
5. **Probar el build localmente primero** (en esta máquina o en cualquier
   entorno con Docker, antes de tocar el servidor real):
   ```
   docker compose build
   ```
   Esto es nuevo y no se probó todavía -- ver la nota al principio de
   `Dockerfile` y `docker-compose.yml`. Es el primer paso a validar antes
   de continuar.
6. **Levantar todo**:
   ```
   docker compose up -d
   ```
   El contenedor de `api` corre `prisma migrate deploy` automáticamente al
   arrancar (ver `CMD` en `Dockerfile`) -- no hace falta correr las
   migraciones a mano.
7. **Verificar**: `docker compose ps` (los tres servicios en estado
   `healthy`/`running`), y probar `curl http://127.0.0.1:3000/entidades`
   (debería dar 401, no un error de conexión -- significa que la API está
   arriba).
8. **Crear el primer usuario/empresa real**. Hoy esto se hace con un script
   de seed pensado para pruebas (`scripts/seed-test.ts`) -- antes de tener
   un cliente real hay que decidir el flujo de alta de la primera empresa
   (¿lo hacés vos a mano por ahora, o hace falta una pantalla de
   registro?). **Decisión pendiente**, no estaba en el alcance del MVP
   original.
9. **Conectar el dominio y HTTPS** (sección 6).

---

## 5. Build de las imágenes (qué hace cada Dockerfile)

- **`Dockerfile`** (backend): build en dos etapas. Instala dependencias,
  genera el cliente de Prisma, compila TypeScript a `dist/`. La imagen
  final corre `prisma migrate deploy` y después `node dist/main.js`.
  Necesita `openssl` instalado en la imagen (Prisma lo requiere en
  Debian) -- ya está resuelto en el Dockerfile.
- **`frontend/Dockerfile`**: usa el modo `standalone` de Next.js (ya
  activado en `next.config.ts`), que arma un bundle mínimo con solo el
  código y las dependencias que realmente se usan en runtime -- imagen
  mucho más liviana que copiar todo `node_modules`.

Ninguno de los dos se probó contra un Docker real todavía (esta máquina no
tiene Docker instalado, decisión consciente para el entorno de desarrollo,
ver `NOTAS.md` entrega 3). **Antes de usarlos en DonWeb, hay que probar el
build en cualquier máquina con Docker** (puede ser esta misma si se decide
instalar Docker Desktop más adelante, o cualquier otra).

---

## 6. Dominio y HTTPS

**Decisión pendiente**: todavía no hay dominio elegido para GestioYA (más
allá del institucional de Byte Ecosistemas, que es un tema aparte, ver
`GESTIOYA.md` sección 31).

Recomendación para cuando se defina: un reverse proxy con HTTPS automático
delante de `api`/`web`, en vez de exponerlos directo a internet. La opción
más simple de operar para un equipo chico es **Caddy** (un solo archivo de
configuración, renueva certificados Let's Encrypt solo, sin tocar nada a
mano):

```
# Caddyfile (ejemplo, ajustar dominios reales)
tu-dominio.com {
    reverse_proxy web:3001
}

api.tu-dominio.com {
    reverse_proxy api:3000
}
```

Se agregaría como un cuarto servicio en `docker-compose.yml` una vez que
haya dominio real para probarlo (no tiene sentido armarlo antes, sin DNS
apuntando a ningún lado no se puede validar).

Alternativa: Nginx + Certbot manual. Más piezas para mantener, más control
fino. Para el tamaño de equipo actual, Caddy es la recomendación.

---

## 7. Notificaciones reales (cuando se decida el proveedor)

Hoy `Notificacion.canal` soporta `email`/`sms`/`whatsapp` en el modelo de
datos, pero solo `app` efectivamente envía algo (se calcula al vuelo, ver
`NOTAS.md` entrega 11). Para que los otros canales manden de verdad hace
falta:

1. Elegir proveedor (ver tabla de la sección 2).
2. Un mecanismo que dispare el envío -- la recomendación ya charlada con
   Martín es un job con **BullMQ + Redis** corriendo dentro del propio
   backend (no n8n desde el día uno, ver la conversación de esta sesión),
   lo cual suma **Redis** como pieza nueva de infraestructura no
   contemplada en el `docker-compose.yml` actual.

No se construye nada de esto todavía -- decisión de producto pendiente
(qué proveedor), no solo técnica.

---

## 8. Backups

**Decisión pendiente** (política formal), pero como base para no arrancar
de cero cuando haya que decidirla: `docker exec` del contenedor de
Postgres con `pg_dump` en un cron diario, subido a algún storage aparte
del propio servidor (para que un desastre del servidor no se lleve puesto
también el backup). Falta definir:

- Frecuencia y retención (¿diario, cuántos días atrás?).
- Dónde se guardan (¿DonWeb tiene backup storage propio, o algo externo?).
- Quién los prueba (un backup nunca restaurado es, como dice `GESTIOYA.md`
  sección 39, "una esperanza con nombre de archivo").

---

## 9. Checklist antes de tener el primer cliente real

- [ ] `docker compose build` probado de punta a punta (ver sección 5).
- [ ] Servidor DonWeb contratado y con Docker instalado.
- [ ] `JWT_SECRET` de producción generado (nunca el de desarrollo).
- [ ] Dominio comprado y apuntando al servidor.
- [ ] HTTPS andando (Caddy u otro).
- [ ] Alta de la primera empresa/usuario resuelta (sección 4, paso 8).
- [ ] Backups configurados y **probados** (una restauración real, no solo
      el dump).
- [ ] Definido el flujo de recuperación de contraseña (hoy pausado a
      propósito hasta esta etapa, ver conversación de esta sesión).
- [ ] Refresh automático de sesión en el frontend (hoy hay que volver a
      loguearse cada 45 min -- tolerable en desarrollo, no para un cliente
      real).
- [ ] Revisar manejo de tokens en el frontend (hoy en `localStorage`, ver
      `NOTAS.md` entrega 5 -- pendiente de endurecer antes de un cliente
      real).
- [ ] Política de privacidad / términos y condiciones (Adrián, no es un
      tema técnico pero es requisito para operar comercialmente).

---

## 10. Qué NO está definido todavía (no asumir que sí)

- Plan/proveedor exacto de DonWeb (vCPU, RAM, precio).
- Dominio.
- Proveedor de email/SMS/WhatsApp transaccional.
- Política de backups formal.
- Flujo de alta de la primera empresa (self-service vs. manual).
- Si hace falta Redis antes de lo previsto (depende de cuándo se resuelvan
  las notificaciones reales).

Estas quedan como decisiones pendientes explícitas, mismo criterio que
`GESTIOYA.md` sección 50.
