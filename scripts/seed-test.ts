import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();

  const rol = await prisma.rol.upsert({
    where: { nombre: 'admin' },
    update: {},
    create: { nombre: 'admin' },
  });

  const empresa = await prisma.empresa.create({
    data: { nombre: 'Empresa Test' },
  });

  const hash = await bcrypt.hash('password123', 12);

  const usuario = await prisma.usuario.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Usuario Test',
      email: 'test@gestioya.local',
      password: hash,
      roles: { create: { rolId: rol.id } },
    },
  });

  console.log(
    JSON.stringify({
      empresaId: empresa.id,
      usuarioId: usuario.id,
      email: usuario.email,
    }),
  );

  await prisma.$disconnect();
}

main();
