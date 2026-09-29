import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';

/**
 * PDF del remito con la paleta "Mostrador" (ver el handoff de diseño).
 * Tipografías estándar de PDF para no embeber archivos: Times (serif) para
 * el número y los montos, como Source Serif en la app; Helvetica para el resto.
 */

export type RemitoParaPdf = Prisma.RemitoGetPayload<{
  include: {
    detalles: { include: { producto: { include: { unidadMedida: true } } } };
    entidad: true;
  };
}>;

export type EmpresaParaPdf = { nombre: string; cuit: string | null };

const C = {
  ink: '#23201C',
  inkSoft: '#4E4740',
  muted: '#8A7F70',
  line: '#E5DACA',
  lineSoft: '#F0E9DE',
  paper: '#FBF8F3',
  verde: '#1F5D4C',
  verdeSoft: '#E7F0EA',
  verdeOnSoft: '#155744',
  canvas: '#F2EDE4',
  neg: '#9C3520',
};

const F = {
  sans: 'Helvetica',
  sansBold: 'Helvetica-Bold',
  serif: 'Times-Roman',
  serifBold: 'Times-Bold',
};

const MARGEN = 48;
const ANCHO = 595.28; // A4
const ALTO = 841.89;
const CONTENIDO = ANCHO - MARGEN * 2;

// Columnas de la tabla (x relativo al margen izquierdo).
const COL = {
  orden: { x: 0, w: 22 },
  producto: { x: 26, w: 229 },
  cantidad: { x: 259, w: 80 },
  precio: { x: 343, w: 78 },
  subtotal: { x: 425, w: CONTENIDO - 425 },
};

const ESTADOS: Record<string, { label: string; fondo: string; texto: string }> = {
  borrador: { label: 'BORRADOR', fondo: C.canvas, texto: C.inkSoft },
  emitido: { label: 'EMITIDO', fondo: C.verdeSoft, texto: C.verdeOnSoft },
  anulado: { label: 'ANULADO', fondo: C.canvas, texto: C.muted },
};

function monto(n: number): string {
  const centavos = Math.round(n * 100) % 100 !== 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: centavos ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function cantidad(n: number): string {
  return n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
}

function fechaLarga(d: Date): string {
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function buildRemitoPdf(remito: RemitoParaPdf, empresa: EmpresaParaPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGEN,
      bufferPages: true, // para numerar las páginas al final
      info: { Title: `Remito ${remito.numero ?? 'borrador'}`, Author: empresa.nombre },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const salida = remito.tipo === 'S';
    const x0 = MARGEN;

    // ---------- Encabezado ----------
    // Empresa a la izquierda; número, fecha y estado a la derecha.
    doc.font(F.serifBold).fontSize(18).fillColor(C.ink).text(empresa.nombre, x0, MARGEN, { width: 300 });
    if (empresa.cuit) {
      doc.font(F.sans).fontSize(9).fillColor(C.muted).text(`CUIT ${empresa.cuit}`, x0, doc.y + 2);
    }
    const yFinEmpresa = doc.y;

    const xDer = x0 + CONTENIDO - 200;
    doc
      .font(F.sansBold)
      .fontSize(8)
      .fillColor(C.muted)
      .text(`REMITO DE ${salida ? 'SALIDA' : 'ENTRADA'}`, xDer, MARGEN, {
        width: 200,
        align: 'right',
        characterSpacing: 1.2,
      });
    doc
      .font(F.serifBold)
      .fontSize(20)
      .fillColor(C.ink)
      .text(remito.numero ? `N.º ${remito.numero}` : 'Sin número', xDer, doc.y + 3, { width: 200, align: 'right' });
    doc
      .font(F.sans)
      .fontSize(9.5)
      .fillColor(C.inkSoft)
      .text(fechaLarga(remito.fecha), xDer, doc.y + 2, { width: 200, align: 'right' });

    // Pastilla de estado.
    const est = ESTADOS[remito.estado] ?? ESTADOS.borrador;
    doc.font(F.sansBold).fontSize(8);
    const anchoPill = doc.widthOfString(est.label, { characterSpacing: 1 }) + 18;
    const yPill = doc.y + 6;
    doc.roundedRect(x0 + CONTENIDO - anchoPill, yPill, anchoPill, 17, 8.5).fill(est.fondo);
    doc
      .fillColor(est.texto)
      .text(est.label, x0 + CONTENIDO - anchoPill, yPill + 5, {
        width: anchoPill,
        align: 'center',
        characterSpacing: 1,
      });

    let y = Math.max(yFinEmpresa, yPill + 17) + 18;
    doc.moveTo(x0, y).lineTo(x0 + CONTENIDO, y).lineWidth(1).strokeColor(C.line).stroke();
    y += 16;

    // ---------- Entidad ----------
    doc
      .font(F.sansBold)
      .fontSize(8)
      .fillColor(C.muted)
      .text(salida ? 'ENTREGADO A' : 'RECIBIDO DE', x0, y, { characterSpacing: 1.2 });
    y = doc.y + 4;
    if (remito.entidad) {
      const e = remito.entidad;
      doc.font(F.sansBold).fontSize(12).fillColor(C.ink).text(e.nombre, x0, y, { width: CONTENIDO });
      const datos = [
        e.documentoNro ? `${e.documentoTipo ?? 'Doc.'} ${e.documentoNro}` : null,
        e.direccion,
        e.telefono ? `Tel. ${e.telefono}` : null,
        e.email,
      ].filter(Boolean);
      if (datos.length > 0) {
        doc.font(F.sans).fontSize(9.5).fillColor(C.inkSoft).text(datos.join('  ·  '), x0, doc.y + 2, {
          width: CONTENIDO,
        });
      }
    } else {
      doc.font(F.sans).fontSize(11).fillColor(C.muted).text('Sin entidad', x0, y);
    }
    y = doc.y + 20;

    // ---------- Tabla ----------
    const cabecera = (yCab: number) => {
      doc.rect(x0, yCab, CONTENIDO, 22).fill(C.paper);
      doc.font(F.sansBold).fontSize(7.5).fillColor(C.muted);
      const opts = (w: number, align: 'left' | 'right') => ({ width: w, align, characterSpacing: 0.8 });
      doc.text('PRODUCTO', x0 + COL.producto.x, yCab + 8, opts(COL.producto.w, 'left'));
      doc.text('CANTIDAD', x0 + COL.cantidad.x, yCab + 8, opts(COL.cantidad.w, 'right'));
      doc.text('PRECIO UNIT.', x0 + COL.precio.x, yCab + 8, opts(COL.precio.w, 'right'));
      doc.text('SUBTOTAL', x0 + COL.subtotal.x, yCab + 8, opts(COL.subtotal.w - 8, 'right'));
      doc
        .moveTo(x0, yCab + 22)
        .lineTo(x0 + CONTENIDO, yCab + 22)
        .lineWidth(1)
        .strokeColor(C.line)
        .stroke();
      return yCab + 22;
    };

    y = cabecera(y);
    // Hasta dónde se escribe contenido. El pie va dentro del margen inferior,
    // así que alcanza con un poco de aire sobre su línea.
    const LIMITE = ALTO - MARGEN - 16;
    let total = 0;

    remito.detalles.forEach((d, i) => {
      const nombre = d.producto.nombre;
      const sku = d.producto.sku ? `SKU ${d.producto.sku}` : null;
      doc.font(F.sans).fontSize(10);
      const altoNombre = doc.heightOfString(nombre, { width: COL.producto.w });
      const alto = Math.max(altoNombre + (sku ? 12 : 0), 12) + 18;

      if (y + alto > LIMITE) {
        doc.addPage();
        y = cabecera(MARGEN);
      }

      const yTexto = y + 9;
      doc.font(F.sans).fontSize(9).fillColor(C.muted).text(String(i + 1), x0 + COL.orden.x + 6, yTexto, {
        width: COL.orden.w,
      });
      doc.font(F.sans).fontSize(10).fillColor(C.ink).text(nombre, x0 + COL.producto.x, yTexto, {
        width: COL.producto.w,
      });
      if (sku) {
        doc.font(F.sans).fontSize(8).fillColor(C.muted).text(sku, x0 + COL.producto.x, doc.y + 1, {
          width: COL.producto.w,
        });
      }
      const unidad = d.producto.unidadMedida?.codigo ?? '';
      doc
        .font(F.sans)
        .fontSize(10)
        .fillColor(C.ink)
        .text(`${cantidad(d.cantidad.toNumber())} ${unidad}`.trim(), x0 + COL.cantidad.x, yTexto, {
          width: COL.cantidad.w,
          align: 'right',
        });
      doc.text(monto(d.precioUnitario.toNumber()), x0 + COL.precio.x, yTexto, {
        width: COL.precio.w,
        align: 'right',
      });
      doc
        .font(F.serifBold)
        .fontSize(11)
        .text(monto(d.subtotal.toNumber()), x0 + COL.subtotal.x, yTexto - 1, {
          width: COL.subtotal.w - 8,
          align: 'right',
        });

      total += d.subtotal.toNumber();
      y += alto;
      doc.moveTo(x0, y).lineTo(x0 + CONTENIDO, y).lineWidth(0.75).strokeColor(C.lineSoft).stroke();
    });

    // ---------- Total ----------
    // 14 de aire + ~26 del monto: si no entra, pasa a otra hoja.
    if (y + 40 > LIMITE) {
      doc.addPage();
      y = MARGEN;
    }
    y += 14;
    // El ancho del monto se mide: con un ancho fijo, "$ 914.764,50" se
    // partía en dos renglones.
    const textoTotal = monto(total);
    doc.font(F.serifBold).fontSize(22);
    const anchoTotal = doc.widthOfString(textoTotal);
    const xTotal = x0 + CONTENIDO - 8 - anchoTotal;
    doc.fillColor(C.ink).text(textoTotal, xTotal, y, { lineBreak: false });
    doc
      .font(F.sansBold)
      .fontSize(8)
      .fillColor(C.muted)
      .text('TOTAL DEL REMITO', xTotal - 12 - 120, y + 9, {
        width: 120,
        align: 'right',
        characterSpacing: 1.2,
      });
    y += 26 + 18;

    // ---------- Observaciones ----------
    if (remito.observaciones) {
      doc.font(F.sans).fontSize(9.5);
      const altoObs = doc.heightOfString(remito.observaciones, { width: CONTENIDO - 28 }) + 34;
      if (y + altoObs > LIMITE) {
        doc.addPage();
        y = MARGEN;
      }
      doc.roundedRect(x0, y, CONTENIDO, altoObs, 8).fill(C.paper);
      doc.roundedRect(x0, y, CONTENIDO, altoObs, 8).lineWidth(1).strokeColor(C.line).stroke();
      doc
        .font(F.sansBold)
        .fontSize(8)
        .fillColor(C.muted)
        .text('OBSERVACIONES', x0 + 14, y + 12, { characterSpacing: 1.2 });
      doc
        .font(F.sans)
        .fontSize(9.5)
        .fillColor(C.inkSoft)
        .text(remito.observaciones, x0 + 14, doc.y + 4, { width: CONTENIDO - 28 });
      y += altoObs + 18;
    }

    // ---------- Conformidad (quien recibe la mercadería) ----------
    // Solo en salidas: en una entrada quien recibe es la propia empresa.
    if (salida && remito.estado !== 'anulado') {
      if (y + 70 > LIMITE) {
        doc.addPage();
        y = MARGEN;
      }
      y = Math.max(y + 24, Math.min(LIMITE - 50, y + 60));
      const campos = ['Firma', 'Aclaración', 'DNI', 'Fecha de recepción'];
      const ancho = (CONTENIDO - 3 * 16) / 4;
      campos.forEach((campo, i) => {
        const x = x0 + i * (ancho + 16);
        doc.moveTo(x, y).lineTo(x + ancho, y).lineWidth(0.75).strokeColor(C.inkSoft).stroke();
        doc.font(F.sans).fontSize(8).fillColor(C.muted).text(campo, x, y + 5, { width: ancho });
      });
      doc
        .font(F.sans)
        .fontSize(8)
        .fillColor(C.muted)
        .text('Recibí conforme la mercadería detallada.', x0, y + 22, { width: CONTENIDO });
    }

    // ---------- Marca de agua y pie en cada página ----------
    const rango = doc.bufferedPageRange();
    for (let p = rango.start; p < rango.start + rango.count; p++) {
      doc.switchToPage(p);
      // El pie va dentro del margen inferior: sin esto, pdfkit agrega una
      // hoja nueva al escribir ahí.
      doc.page.margins.bottom = 0;

      if (remito.estado !== 'emitido') {
        doc.save();
        doc.rotate(-35, { origin: [ANCHO / 2, ALTO / 2] });
        doc
          .font(F.sansBold)
          .fontSize(92)
          .fillColor(remito.estado === 'anulado' ? C.neg : C.muted)
          .fillOpacity(0.08)
          .text(est.label, 0, ALTO / 2 - 46, { width: ANCHO, align: 'center', lineBreak: false });
        doc.restore();
        doc.fillOpacity(1);
      }

      const yPie = ALTO - MARGEN + 8;
      doc.moveTo(x0, yPie - 8).lineTo(x0 + CONTENIDO, yPie - 8).lineWidth(0.75).strokeColor(C.line).stroke();
      doc
        .font(F.sans)
        .fontSize(7.5)
        .fillColor(C.muted)
        .text('Documento no válido como factura.', x0, yPie, { width: CONTENIDO / 2, lineBreak: false });
      doc.text(`Página ${p - rango.start + 1} de ${rango.count}`, x0 + CONTENIDO / 2, yPie, {
        width: CONTENIDO / 2,
        align: 'right',
        lineBreak: false,
      });
    }

    doc.end();
  });
}
