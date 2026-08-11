import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next.js confunda la raíz del workspace: el backend (NestJS)
  // vive en el directorio padre y tiene su propio package-lock.json.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
