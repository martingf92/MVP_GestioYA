-- AlterTable
ALTER TABLE "Remito" ADD COLUMN     "observaciones" TEXT;


-- Textos guardados antes de la numeración (entrega 18) que nombran al remito
-- por el comienzo de su id ("Remito c197b07e"): se reemplaza por el número
-- ("Remito 0001-00000004"). Agregado a mano; en una base nueva no toca nada.
UPDATE "Obligacion" o
SET "descripcion" = replace(o."descripcion", 'Remito ' || left(r."id", 8), 'Remito ' || r."numero")
FROM "Remito" r
WHERE o."remitoId" = r."id"
  AND r."numero" IS NOT NULL
  AND o."descripcion" LIKE '%Remito ' || left(r."id", 8) || '%';

-- Los movimientos no apuntan al remito (solo guardan el texto), así que se
-- cruzan por el texto, siempre dentro de la misma empresa.
UPDATE "MovimientoCuenta" m
SET "concepto" = replace(m."concepto", 'Remito ' || left(r."id", 8), 'Remito ' || r."numero")
FROM "CuentaCorriente" c, "Remito" r
WHERE m."cuentaCorrienteId" = c."id"
  AND r."empresaId" = c."empresaId"
  AND r."numero" IS NOT NULL
  AND m."concepto" LIKE '%Remito ' || left(r."id", 8) || '%';
