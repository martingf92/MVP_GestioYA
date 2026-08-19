import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next.js confunda la raíz del workspace: el backend (NestJS)
  // vive en el directorio padre y tiene su propio package-lock.json.
  turbopack: {
    root: path.join(__dirname),
  },
  // Genera un bundle standalone (server.js + solo los node_modules que
  // realmente se usan) -- lo que consume frontend/Dockerfile para la imagen
  // de producción, mucho más liviana que copiar todo node_modules. Ver
  // DEPLOYMENT.md.
  output: 'standalone',
};

export default nextConfig;
