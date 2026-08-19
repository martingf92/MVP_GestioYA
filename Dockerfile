# Backend (NestJS + Prisma). Ver DEPLOYMENT.md para el proceso completo de
# despliegue -- este Dockerfile no fue probado contra un Docker real todavía
# (esta máquina de desarrollo usa Postgres nativo a propósito, ver NOTAS.md
# entrega 3); probarlo es el primer paso antes de usarlo en DonWeb.

FROM node:22-slim AS base
WORKDIR /app
# Prisma necesita openssl para su motor de queries en imágenes Debian.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
# node_modules completo (incluye prisma CLI, una devDependency) porque el
# comando de arranque corre `prisma migrate deploy` antes de levantar la
# API -- más simple que separar dependencias de prod/dev acá.
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000

# Aplica migraciones pendientes y recién ahí levanta la API. Si las
# migraciones fallan, el contenedor no arranca -- señal visible en vez de
# quedar corriendo con un schema desactualizado.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
