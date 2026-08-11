import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();

  const empresa = await prisma.empresa.create({
    data: { nombre: 'Empresa Test B' },
  });

  const hash = await bcrypt.hash('password123', 12);

  const usuario = await prisma.usuario.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Usuario Test B',
      email: 'test-b@gestioya.local',
      password: hash,
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
