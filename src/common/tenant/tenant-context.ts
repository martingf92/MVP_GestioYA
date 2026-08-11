import { AsyncLocalStorage } from 'async_hooks';

interface TenantContextData {
  empresaId: string;
}

const storage = new AsyncLocalStorage<TenantContextData>();

/**
 * Contexto de tenant por request.
 *
 * Se inicializa en TenantMiddleware (después del guard de autenticación)
 * y lo lee la extensión de Prisma (tenant.extension.ts) para filtrar
 * automáticamente cada query por empresaId, sin que cada servicio tenga
 * que acordarse de pasarlo a mano.
 */
export const TenantContext = {
  run<T>(empresaId: string, callback: () => T): T {
    return storage.run({ empresaId }, callback);
  },

  getEmpresaId(): string | undefined {
    return storage.getStore()?.empresaId;
  },
};
