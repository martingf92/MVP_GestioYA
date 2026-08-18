-- CreateTable
CREATE TABLE "LogError" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "usuarioId" TEXT,
    "metodo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "mensaje" TEXT NOT NULL,
    "stack" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogError_fecha_idx" ON "LogError"("fecha");

-- CreateIndex
CREATE INDEX "LogError_empresaId_idx" ON "LogError"("empresaId");

-- AddForeignKey
ALTER TABLE "LogError" ADD CONSTRAINT "LogError_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

