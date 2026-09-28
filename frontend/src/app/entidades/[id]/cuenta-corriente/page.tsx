import { redirect } from 'next/navigation';

// La cuenta corriente pasó a la sección Cuentas (ver handoff de diseño,
// pantalla 5). Se mantiene esta ruta solo para no romper links viejos.
export default async function CuentaCorrienteRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/cuentas/corrientes/${id}`);
}
