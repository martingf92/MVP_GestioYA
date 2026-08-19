# Frontend (Next.js). Ver DEPLOYMENT.md. Requiere `output: 'standalone'` en
# next.config.ts (ya está) -- sin eso, .next/standalone no existe y este
# build falla. No probado contra un Docker real todavía, ver Dockerfile del
# backend (mismo motivo).

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
# El frontend llama al backend en build-time solo si algo usa
# NEXT_PUBLIC_API_URL durante el build (hoy no es el caso, se lee en
# runtime en el navegador) -- no hace falta pasarlo acá.
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.js"]
