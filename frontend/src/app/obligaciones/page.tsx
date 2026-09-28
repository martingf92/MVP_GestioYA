import { redirect } from 'next/navigation';

// Obligaciones pasó a ser una pestaña de Cuentas. Se mantiene la ruta solo
// para no romper links viejos.
export default function ObligacionesRedirect() {
  redirect('/cuentas?tab=obligaciones');
}
