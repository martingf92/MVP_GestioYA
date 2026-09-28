import { HTMLAttributes } from 'react';

// `padded={false}` cuando la pantalla necesita su propio padding (p. ej.
// una tarjeta con header y lista a sangre): pasar `p-0` / `p-4` por
// className chocaría con el `p-5` base y ganaría el que Tailwind emita
// último en el CSS, no el que se pasó.
export function Card({
  className = '',
  padded = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-line bg-paper ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    />
  );
}
