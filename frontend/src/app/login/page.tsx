'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { login, ApiError } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { AlertBanner } from '@/components/ui/AlertBanner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, remember);
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10 lg:p-0">
      <div className="mb-8 lg:hidden">
        <Logo />
      </div>
      <div className="absolute top-8 left-8 hidden lg:block">
        <Logo />
      </div>

      <div className="flex w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] lg:flex-row">
        {/* Columna del formulario */}
        <div className="flex-1 p-6 sm:p-10 lg:px-12 lg:py-[52px]">
          <h1 className="font-serif text-[28px] font-semibold text-ink sm:text-[32px] lg:text-[34px] lg:tracking-[-0.01em]">
            Hola de nuevo
          </h1>
          <p className="mt-2 text-[15px] text-[#6D655B]">Entrá para ver cómo viene el mes.</p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Contraseña" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Checkbox
                id="remember"
                checked={remember}
                onChange={setRemember}
                label="No cerrar sesión"
              />
              <button
                type="button"
                onClick={() => setShowRecovery((v) => !v)}
                className="text-[13.5px] font-medium text-verde hover:text-verde-hover hover:underline"
              >
                Recuperar acceso
              </button>
            </div>

            {showRecovery && (
              <AlertBanner variant="warn">
                Todavía no está disponible la recuperación de acceso por vos mismo — pedísela a
                un administrador de tu empresa.
              </AlertBanner>
            )}

            {error && <AlertBanner variant="error">{error}</AlertBanner>}

            <Button type="submit" disabled={loading} className="mt-1 w-full text-[16px]">
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-[14px] text-ink-soft">
            ¿Tu empresa todavía no está?{' '}
            <span className="cursor-not-allowed text-muted" title="Todavía no disponible">
              Crear cuenta
            </span>
          </p>
        </div>

        {/* Columna del claim (solo desktop) */}
        <div className="hidden w-[400px] flex-shrink-0 flex-col justify-between bg-verde p-10 text-white lg:flex">
          <p className="font-serif text-[23px] leading-[1.35] font-semibold">
            Todo lo que te deben y todo lo que debés, en una sola pantalla.
          </p>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-[13px] text-white/70">Te deben</p>
              <p className="font-serif text-[30px] font-semibold tabular">$ •••.•••</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-[13px] text-white/70">Debés</p>
              <p className="font-serif text-[30px] font-semibold tabular">$ •••.•••</p>
            </div>
            <p className="flex items-center gap-1.5 text-[13px] text-[#A9C9BD]">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              Iniciá sesión para ver tus montos reales — nadie más puede verlos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
