import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withTenantIsolation } from './tenant.extension';

/**
 * CAMBIO DE PATRÓN vs. el starter kit original:
 *
 * Antes: `class PrismaService extends PrismaClient` -- los servicios
 * usaban `this.prisma.usuario.findMany()` directamente.
 *
 * Ahora: PrismaService expone un cliente EXTENDIDO (`.db`) que aplica el
 * filtro de tenant en cada query. Es necesario porque `$extends()` no
 * devuelve una instancia de la misma clase (no se puede heredar y extender
 * a la vez), y necesitamos el aislamiento por tenant en cada query, no
 * solo en algunas.
 *
 * Los servicios de acá en adelante usan: `this.prisma.db.usuario.findMany()`
 *
 * `raw` (sin filtro) queda expuesto aparte para los pasos que necesariamente
 * corren ANTES de que exista empresaId en contexto -- típicamente el login:
 * se busca el Usuario por email cuando todavía no se sabe a qué empresa
 * pertenece. Fuera de ese tipo de caso (bootstrap de auth, tareas cross-tenant
 * de plataforma), usar siempre `db`.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly raw = new PrismaClient();

  readonly db = withTenantIsolation(this.raw);

  async onModuleInit() {
    await this.raw.$connect();
  }

  async onModuleDestroy() {
    await this.raw.$disconnect();
  }
}
