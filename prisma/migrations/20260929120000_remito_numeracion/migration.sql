-- CreateTable
CREATE TABLE "Numerador" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipoComprobante" TEXT NOT NULL,
    "puntoVenta" INTEGER NOT NULL DEFAULT 1,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Numerador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Numerador_empresaId_tipoComprobante_puntoVenta_key" ON "Numerador"("empresaId", "tipoComprobante", "puntoVenta");

-- CreateIndex
CREATE UNIQUE INDEX "Remito_empresaId_numero_key" ON "Remito"("empresaId", "numero");

-- AddForeignKey
ALTER TABLE "Numerador" ADD CONSTRAINT "Numerador_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Numeración de los remitos existentes (agregado a mano). Se numeran los
-- emitidos y anulados de cada empresa por fecha, con punto de venta 0001.
-- Un anulado pudo haber sido emitido antes, y no hay forma de distinguirlo
-- de uno anulado como borrador, así que se numeran todos. Los borradores
-- quedan sin número: lo toman al emitirse.
WITH numerados AS (
    SELECT "id", "empresaId",
           ROW_NUMBER() OVER (PARTITION BY "empresaId" ORDER BY "fecha", "id") AS n
    FROM "Remito"
    WHERE "estado" IN ('emitido', 'anulado') AND "numero" IS NULL
)
UPDATE "Remito" r
SET "numero" = '0001-' || LPAD(numerados.n::text, 8, '0')
FROM numerados
WHERE r."id" = numerados."id";

-- El numerador de cada empresa arranca donde terminó la numeración de arriba.
INSERT INTO "Numerador" ("id", "empresaId", "tipoComprobante", "puntoVenta", "ultimoNumero")
SELECT gen_random_uuid()::text, "empresaId", 'remito', 1, COUNT(*)
FROM "Remito"
WHERE "numero" IS NOT NULL
GROUP BY "empresaId";
