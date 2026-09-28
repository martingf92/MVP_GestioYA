import { redirect } from 'next/navigation';

// Pagos pasó a ser una pestaña de Cuentas. Se mantiene la ruta solo para
// no romper links viejos.
export default function PagosRedirect() {
  redirect('/cuentas?tab=pagos');
}
