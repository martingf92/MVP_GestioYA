-- DropForeignKey
ALTER TABLE "Obligacion" DROP CONSTRAINT "Obligacion_entidadId_fkey";

-- DropForeignKey
ALTER TABLE "Obligacion" DROP CONSTRAINT "Obligacion_pagoId_fkey";

-- AlterTable
ALTER TABLE "Obligacion" DROP COLUMN "pagoId",
ALTER COLUMN "entidadId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AplicacionPago" (
    "id" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "obligacionId" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "AplicacionPago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AplicacionPago_pagoId_idx" ON "AplicacionPago"("pagoId");

-- CreateIndex
CREATE INDEX "AplicacionPago_obligacionId_idx" ON "AplicacionPago"("obligacionId");

-- AddForeignKey
ALTER TABLE "Obligacion" ADD CONSTRAINT "Obligacion_entidadId_fkey" FOREIGN KEY ("entidadId") REFERENCES "Entidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionPago" ADD CONSTRAINT "AplicacionPago_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "Pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AplicacionPago" ADD CONSTRAINT "AplicacionPago_obligacionId_fkey" FOREIGN KEY ("obligacionId") REFERENCES "Obligacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
