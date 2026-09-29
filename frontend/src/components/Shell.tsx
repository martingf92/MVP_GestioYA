'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  Package,
  FileText,
  Wallet,
  CheckSquare,
  Search,
  Bell,
  ChevronDown,
  Check,
  MoreHorizontal,
  LogOut,
  LucideIcon,
} from 'lucide-react';
import { clearSession, getUsuario, Usuario } from '@/lib/api';
import { Logo } from './ui/Logo';
import { Avatar } from './ui/Avatar';

const TABS: { href: string; label: string; icon: LucideIcon; secciones?: string[] }[] = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/entidades', label: 'Entidades', icon: Users },
  { href: '/productos', label: 'Productos', icon: Package, secciones: ['/productos', '/unidades-medida'] },
  { href: '/remitos', label: 'Remitos', icon: FileText },
  // Obligaciones, Pagos y la cuenta corriente de cada entidad viven dentro
  // de Cuentas (no tienen tab propio, ver README del handoff).
  { href: '/cuentas', label: 'Cuentas', icon: Wallet, secciones: ['/cuentas', '/obligaciones', '/pagos'] },
  { href: '/tareas', label: 'Tareas', icon: CheckSquare },
];

// La tab bar inferior (mobile/tablet) tiene 5 destinos -- Productos pasa al
// menú "Más", ver README del handoff.
const TABS_MOBILES = TABS.filter((t) => t.href !== '/productos');
const TAB_MAS = TABS.find((t) => t.href === '/productos')!;

function useActiveTab(pathname: string) {
  if (pathname === '/') return '/';
  return TABS.find((t) =>
    (t.secciones ?? [t.href]).some((s) => s !== '/' && pathname.startsWith(s)),
  )?.href;
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = useActiveTab(pathname);
  const activeLabel = TABS.find((t) => t.href === activeHref)?.label ?? 'GestioYA';

  // getUsuario() lee storage, que no existe en el render de servidor --
  // arrancar en null y setear en efecto evita "Hydration failed" (mismo
  // patrón que ya usaba components/Nav.tsx).
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);
  const [empresaAbierta, setEmpresaAbierta] = useState(false);

  useEffect(() => {
    setUsuario(getUsuario());
  }, []);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 nav:px-7">
          <Logo withWordmark={false} />

          {/* Selector de empresa -- visual, el MVP maneja una sola empresa
              por usuario hoy, pero el componente ya tiene que existir (ver
              README del handoff). */}
          <div className="relative hidden nav:block">
            <button
              type="button"
              onClick={() => setEmpresaAbierta((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-input-border bg-white py-1.5 pr-3 pl-1.5 text-[13.5px] font-medium text-ink-soft hover:bg-[#F7F2E9]"
            >
              <Avatar nombre={usuario?.nombre ?? '?'} tono="terra" size={36} />
              <span className="max-w-[140px] truncate">{usuario?.nombre ?? 'Tu empresa'}</span>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
            {empresaAbierta && (
              <div className="absolute top-[calc(100%+8px)] left-0 w-72 rounded-xl border border-line bg-white p-2 shadow-[var(--shadow-pop)]">
                <p className="px-2.5 py-1.5 text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
                  Tus empresas
                </p>
                <div className="flex items-center gap-2.5 rounded-lg bg-[#F7FBF8] px-2.5 py-2">
                  <Avatar nombre={usuario?.nombre ?? '?'} tono="terra" size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-ink">
                      {usuario?.nombre ?? 'Tu empresa'}
                    </p>
                    <p className="truncate text-[12px] text-muted">{usuario?.email}</p>
                  </div>
                  <Check className="h-4 w-4 flex-shrink-0 text-verde" aria-hidden />
                </div>
                <button
                  type="button"
                  disabled
                  title="Todavía no disponible"
                  className="mt-1 w-full cursor-not-allowed rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium text-muted"
                >
                  + Agregar otra empresa
                </button>
              </div>
            )}
          </div>

          {/* Título de sección -- reemplaza al selector en mobile/tablet */}
          <p className="text-[15px] font-semibold text-ink nav:hidden">{activeLabel}</p>

          {/* Buscador global -- placeholder visual, todavía no busca nada
              real (la búsqueda funcional vive en el filtro de cada
              listado, ver pantalla de Entidades). */}
          <div className="ml-auto hidden max-w-[280px] flex-1 items-center gap-2 rounded-full border border-input-border bg-white px-3.5 py-2 nav:flex">
            <Search className="h-4 w-4 flex-shrink-0 text-placeholder" aria-hidden />
            <input
              type="search"
              placeholder="Buscar…"
              disabled
              className="w-full bg-transparent text-[13.5px] text-ink placeholder:text-placeholder focus-visible:outline-none disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="button"
            disabled
            title="Todavía no hay notificaciones"
            className="hidden cursor-not-allowed items-center justify-center rounded-full p-2 text-ink-soft nav:flex"
          >
            <Bell className="h-[18px] w-[18px]" aria-hidden />
          </button>

          <div className="relative ml-auto nav:ml-0">
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label="Cuenta"
              className="flex items-center"
            >
              <Avatar nombre={usuario?.nombre ?? '?'} tono="verde" size={36} />
            </button>
            {menuAbierto && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-56 rounded-xl border border-line bg-white p-2 shadow-[var(--shadow-pop)]">
                <p className="truncate px-2.5 py-1.5 text-[13px] text-muted">{usuario?.email}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium text-ink-soft hover:bg-[#F7F2E9]"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Nav horizontal -- solo desde el breakpoint "nav" (835px) */}
        <nav className="mx-auto hidden max-w-[1400px] gap-1 px-7 nav:flex">
          {TABS.map((tab) => {
            const activo = tab.href === activeHref;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-[2.5px] px-3 py-3 text-[14.5px] no-underline transition-colors duration-[120ms] ease-out
                  ${activo ? 'border-verde font-semibold text-verde' : 'border-transparent font-medium text-ink-soft hover:text-ink'}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 pb-24 nav:px-7 nav:pb-8">{children}</main>

      {/* Tab bar inferior -- mobile y tablet, hasta el breakpoint "nav" */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-line bg-paper nav:hidden">
        {TABS_MOBILES.map((tab) => {
          const activo = tab.href === activeHref;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-14 flex-1 flex-col items-center justify-center gap-1 no-underline
                ${activo ? 'font-semibold text-verde' : 'text-ink-soft'}`}
            >
              <Icon className="h-4 w-4" strokeWidth={activo ? 2 : 1.75} aria-hidden />
              <span className="text-[11px]">{tab.label}</span>
            </Link>
          );
        })}
        <div className="relative flex flex-1">
          <button
            type="button"
            onClick={() => setMasAbierto((v) => !v)}
            className={`flex w-full flex-col items-center justify-center gap-1 ${masAbierto ? 'font-semibold text-verde' : 'text-ink-soft'}`}
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={masAbierto ? 2 : 1.75} aria-hidden />
            <span className="text-[11px]">Más</span>
          </button>
          {masAbierto && (
            <div className="absolute right-2 bottom-[calc(100%+8px)] w-44 rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-pop)]">
              <Link
                href={TAB_MAS.href}
                onClick={() => setMasAbierto(false)}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-ink-soft no-underline hover:bg-[#F7F2E9]"
              >
                <TAB_MAS.icon className="h-4 w-4" aria-hidden />
                {TAB_MAS.label}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
