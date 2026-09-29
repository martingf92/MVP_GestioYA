import { Prisma, PrismaClient } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';

/**
 * Modelos que llevan empresaId y deben quedar aislados por tenant.
 *
 * Se mantiene como allowlist explícita en vez de "todos menos Rol/UsuarioRol"
 * a propósito: si alguien agrega un modelo nuevo al schema y se olvida de
 * sumarlo acá, ese modelo simplemente NO queda filtrado (bug visible, se
 * detecta rápido en QA) en lugar de que el filtro le pegue mal a un modelo
 * que no tiene empresaId (rompería todo silenciosamente).
 */
const TENANT_SCOPED_MODELS = new Set([
  'Usuario',
  'Entidad',
  'Producto',
  'UnidadMedida',
  'Remito',
  'Numerador',
  'CuentaCorriente',
  'Obligacion',
  'Pago',
  'Tarea',
  'LogAccion',
]);

const READ_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_OPERATIONS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

/**
 * Nota sobre la API: $use (middleware clásico de Prisma) fue removido en
 * Prisma 6.14 -- el starter kit original lo hubiera usado, pero esa API
 * ya no existe. Client Extensions ($extends) es el reemplazo oficial
 * desde Prisma 4.16 y es la forma soportada en la versión actual (v7).
 */
export function withTenantIsolation<T extends PrismaClient>(client: T) {
  return client.$extends({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model && TENANT_SCOPED_MODELS.has(model)) {
            const empresaId = TenantContext.getEmpresaId();

            if (!empresaId) {
              // Fail closed: sin tenant en contexto, no se ejecuta la query.
              throw new Error(
                `TenantContext sin empresaId al operar sobre "${model}" ` +
                  `(${operation}). Verificá que TenantMiddleware corrió ` +
                  `antes de esta operación.`,
              );
            }

            const a = args as any;

            if (READ_OPERATIONS.has(operation) || WRITE_OPERATIONS.has(operation)) {
              a.where = { ...a.where, empresaId };
            }

            if (operation === 'create') {
              a.data = { ...a.data, empresaId };
            }

            if (operation === 'createMany' && Array.isArray(a.data)) {
              a.data = a.data.map((d: any) => ({ ...d, empresaId }));
            }
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantAwarePrismaClient = ReturnType<typeof withTenantIsolation>;
