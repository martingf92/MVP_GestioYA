import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold ' +
  'min-h-11 px-5 transition-colors duration-[120ms] ease-out disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  primary:
    'bg-verde text-white hover:bg-verde-hover ' +
    'disabled:bg-canvas disabled:text-disabled-fg disabled:border disabled:border-line',
  secondary:
    'bg-white border border-input-border text-ink hover:bg-[#F7F2E9] ' +
    'disabled:bg-canvas disabled:text-disabled-fg disabled:border-line',
  destructive: 'bg-neg-soft border border-neg-soft-border text-neg hover:bg-[#FBE7E0]',
  ghost: 'bg-transparent text-ink-soft text-[14.5px] font-semibold hover:underline px-2',
};

// Para links que se ven como botón (<Link className={buttonClasses()}>):
// anidar un <button> dentro de un <a> es HTML inválido y confunde a los
// lectores de pantalla. El color/decoración explícitos pisan el estilo base
// de <a> de globals.css.
const linkOverrides: Record<Variant, string> = {
  primary: 'no-underline hover:no-underline hover:text-white',
  secondary: 'no-underline hover:no-underline hover:text-ink',
  destructive: 'no-underline hover:no-underline hover:text-neg',
  ghost: 'no-underline hover:text-ink-soft',
};

export function buttonClasses(variant: Variant = 'primary', className = '') {
  return `${base} ${variants[variant]} ${linkOverrides[variant]} ${className}`;
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ variant = 'primary', className = '', ...props }, ref) => (
  <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props} />
));
Button.displayName = 'Button';
