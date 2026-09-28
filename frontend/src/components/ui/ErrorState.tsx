import { TriangleAlert } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({
  title = 'No pudimos traer los datos',
  description = 'Se cortó la conexión con el servidor. Nada de lo que cargaste se perdió.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-neg-soft-border bg-neg-soft p-5">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-neg" aria-hidden />
        <div>
          <p className="text-[14.5px] font-semibold text-neg-on-soft">{title}</p>
          <p className="mt-0.5 text-[13.5px] text-neg-on-soft">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="destructive" onClick={onRetry}>
          Probar de nuevo
        </Button>
        <Button variant="secondary">Avisar al soporte</Button>
      </div>
    </div>
  );
}
