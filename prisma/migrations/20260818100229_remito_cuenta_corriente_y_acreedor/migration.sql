-- AlterTable
ALTER TABLE "Obligacion" ADD COLUMN     "direccion" TEXT NOT NULL DEFAULT 'a_cobrar',
ADD COLUMN     "remitoId" TEXT;

-- CreateTable
CREATE TABLE "Acreedor" (
    "entidadId" TEXT NOT NULL,
    "tipoDeuda" TEXT,
    "condicionPago" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "Acreedor_pkey" PRIMARY KEY ("entidadId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Obligacion_remitoId_key" ON "Obligacion"("remitoId");

-- AddForeignKey
ALTER TABLE "Acreedor" ADD CONSTRAINT "Acreedor_entidadId_fkey" FOREIGN KEY ("entidadId") REFERENCES "Entidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obligacion" ADD CONSTRAINT "Obligacion_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

