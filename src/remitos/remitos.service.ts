import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRemitoDto } from './dto/create-remito.dto';
import { UpdateRemitoDto } from './dto/update-remito.dto';
import { ListRemitosQueryDto } from './dto/list-remitos-query.dto';
import { CreateDetalleRemitoDto } from './dto/create-detalle-remito.dto';

const INCLUDE_DETALLE = {
  detalles: { include: { producto: { include: { unidadMedida: true } } } },
  entidad: true,
} as const;

@Injectable()
export class RemitosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRemitoDto, usuarioId: string) {
    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }
    await this.assertProductosExist(dto.detalles);

    return this.prisma.db.remito.create({
      // empresaId lo inyecta tenant.extension.ts en runtime, ver
      // entidades.service.ts para el mismo patrón.
      data: {
        numero: dto.numero,
        tipo: dto.tipo,
        fecha: dto.fecha,
        entidadId: dto.entidadId,
        estado: 'borrador',
        usuarioId,
        detalles: { create: dto.detalles.map(toDetalleData) },
      } as unknown as Prisma.RemitoCreateInput,
      include: INCLUDE_DETALLE,
    });
  }

  async findAll(query: ListRemitosQueryDto) {
    const where: Prisma.RemitoWhereInput = {
      tipo: query.tipo,
      estado: query.estado,
      entidadId: query.entidadId,
    };

    const [data, total] = await Promise.all([
      this.prisma.db.remito.findMany({
        where,
        include: { entidad: true },
        orderBy: { fecha: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.db.remito.count({ where }),
    ]);

    return { data, total, skip: query.skip, take: query.take };
  }

  async findOne(id: string) {
    const remito = await this.prisma.db.remito.findUnique({
      where: { id },
      include: INCLUDE_DETALLE,
    });

    if (!remito) {
      throw new NotFoundException('Remito no encontrado');
    }

    return remito;
  }

  async update(id: string, dto: UpdateRemitoDto) {
    const remito = await this.findOne(id);

    if (remito.estado !== 'borrador') {
      throw new ConflictException(
        'Solo se puede editar un remito en estado borrador',
      );
    }

    if (dto.entidadId) {
      await this.assertEntidadExists(dto.entidadId);
    }
    if (dto.detalles) {
      await this.assertProductosExist(dto.detalles);
    }

    await this.prisma.db.$transaction(async (tx) => {
      await tx.remito.update({
        where: { id },
        data: {
          numero: dto.numero,
          tipo: dto.tipo,
          fecha: dto.fecha,
          entidadId: dto.entidadId,
        },
      });

      if (dto.detalles) {
        await tx.detalleRemito.deleteMany({ where: { remitoId: id } });
        await tx.detalleRemito.createMany({
          data: dto.detalles.map((d) => ({ remitoId: id, ...toDetalleData(d) })),
        });
      }
    });

    return this.findOne(id);
  }

  async emitir(id: string) {
    const remito = await this.findOne(id);

    if (remito.estado !== 'borrador') {
      throw new ConflictException(
        'Solo se puede emitir un remito en estado borrador',
      );
    }
    if (remito.detalles.length === 0) {
      throw new BadRequestException('No se puede emitir un remito sin detalles');
    }

    return this.prisma.db.remito.update({
      where: { id },
      data: { estado: 'emitido' },
      include: INCLUDE_DETALLE,
    });
  }

  async anular(id: string) {
    const remito = await this.findOne(id);

    if (remito.estado === 'anulado') {
      throw new ConflictException('El remito ya está anulado');
    }

    return this.prisma.db.remito.update({
      where: { id },
      data: { estado: 'anulado' },
      include: INCLUDE_DETALLE,
    });
  }

  async generatePdf(id: string): Promise<Buffer> {
    const remito = await this.findOne(id);
    return buildRemitoPdf(remito);
  }

  private async assertEntidadExists(entidadId: string) {
    const entidad = await this.prisma.db.entidad.findUnique({
      where: { id: entidadId },
    });
    if (!entidad || !entidad.activo) {
      throw new BadRequestException(
        'entidadId inválido, dado de baja, o no pertenece a esta empresa',
      );
    }
  }

  /**
   * productoId viaja en el body (dentro de cada línea de detalle) -- mismo
   * gap potencial que unidadMedidaId en Productos: sin este chequeo, nada
   * impide referenciar un producto de otra empresa. También exige que esté
   * activo: un producto dado de baja no debería poder entrar en un remito
   * nuevo (se encontró probando -- no era el comportamiento esperado).
   */
  private async assertProductosExist(detalles: CreateDetalleRemitoDto[]) {
    const ids = [...new Set(detalles.map((d) => d.productoId))];
    const encontrados = await this.prisma.db.producto.findMany({
      where: { id: { in: ids }, activo: true },
      select: { id: true },
    });

    if (encontrados.length !== ids.length) {
      throw new BadRequestException(
        'Uno o más productoId son inválidos, están dados de baja, o no pertenecen a esta empresa',
      );
    }
  }
}

function toDetalleData(d: CreateDetalleRemitoDto) {
  return {
    productoId: d.productoId,
    cantidad: d.cantidad,
    precioUnitario: d.precioUnitario,
    subtotal: d.cantidad * d.precioUnitario,
  };
}

type RemitoConDetalle = Prisma.RemitoGetPayload<{ include: typeof INCLUDE_DETALLE }>;

const PDF_COLS = {
  producto: { x: 50, width: 220 },
  cantidad: { x: 270, width: 70 },
  precio: { x: 340, width: 80 },
  subtotal: { x: 420, width: 80 },
};

function buildRemitoPdf(remito: RemitoConDetalle): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Remito', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10);
    doc.text(
      `Tipo: ${remito.tipo === 'E' ? 'Entrada' : 'Salida'}    Número: ${remito.numero ?? remito.id.slice(0, 8)}`,
    );
    doc.text(
      `Fecha: ${remito.fecha.toLocaleDateString('es-AR')}    Estado: ${remito.estado}`,
    );
    if (remito.entidad) {
      const documento = remito.entidad.documentoNro
        ? ` (${remito.entidad.documentoTipo ?? 'Doc.'} ${remito.entidad.documentoNro})`
        : '';
      doc.text(`Entidad: ${remito.entidad.nombre}${documento}`);
    }
    doc.moveDown();

    let y = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Producto', PDF_COLS.producto.x, y, { width: PDF_COLS.producto.width });
    doc.text('Cantidad', PDF_COLS.cantidad.x, y, {
      width: PDF_COLS.cantidad.width,
      align: 'right',
    });
    doc.text('Precio unit.', PDF_COLS.precio.x, y, {
      width: PDF_COLS.precio.width,
      align: 'right',
    });
    doc.text('Subtotal', PDF_COLS.subtotal.x, y, {
      width: PDF_COLS.subtotal.width,
      align: 'right',
    });
    y += 18;
    doc.moveTo(50, y - 4).lineTo(500, y - 4).strokeColor('#cccccc').stroke();
    doc.font('Helvetica');

    let total = 0;
    for (const d of remito.detalles) {
      const unidad = d.producto.unidadMedida?.codigo ?? '';
      const cantidad = d.cantidad.toNumber();
      const precio = d.precioUnitario.toNumber();
      const subtotal = d.subtotal.toNumber();
      total += subtotal;

      doc.text(d.producto.nombre, PDF_COLS.producto.x, y, { width: PDF_COLS.producto.width });
      doc.text(`${cantidad} ${unidad}`.trim(), PDF_COLS.cantidad.x, y, {
        width: PDF_COLS.cantidad.width,
        align: 'right',
      });
      doc.text(precio.toFixed(2), PDF_COLS.precio.x, y, {
        width: PDF_COLS.precio.width,
        align: 'right',
      });
      doc.text(subtotal.toFixed(2), PDF_COLS.subtotal.x, y, {
        width: PDF_COLS.subtotal.width,
        align: 'right',
      });
      y += 18;
    }

    y += 8;
    doc.moveTo(50, y).lineTo(500, y).strokeColor('#cccccc').stroke();
    y += 10;
    doc.font('Helvetica-Bold');
    doc.text('Total', PDF_COLS.precio.x, y, { width: PDF_COLS.precio.width, align: 'right' });
    doc.text(total.toFixed(2), PDF_COLS.subtotal.x, y, {
      width: PDF_COLS.subtotal.width,
      align: 'right',
    });

    doc.end();
  });
}
