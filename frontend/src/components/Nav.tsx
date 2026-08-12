'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearSession, getUsuario, Usuario } from '@/lib/api';

const LINKS = [
  { href: '/entidades', label: 'Entidades' },
  { href: '/productos', label: 'Productos' },
  { href: '/unidades-medida', label: 'Unidades de medida' },
  { href: '/remitos', label: 'Remitos' },
];

export default function Nav() {
  const router = useRouter();
  // getUsuario() lee localStorage, que no existe en el render de servidor.
  // Arrancar en null y setearlo en un efecto evita que el HTML del server
  // (sin usuario) no coincida con el del cliente (con usuario) -- si se
  // lee directo en el render, React tira "Hydration failed" en cualquier
  // recarga o entrada directa por URL estando logueado.
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    setUsuario(getUsuario());
  }, []);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <nav className="mb-6 flex items-center justify-between border-b pb-3">
      <div className="flex gap-4 text-sm">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="underline">
            {link.label}
          </Link>
        ))}
      </div>
      <div className="text-sm text-gray-500">
        {usuario?.email}{' '}
        <button onClick={handleLogout} className="ml-2 underline">
          salir
        </button>
      </div>
    </nav>
  );
}
