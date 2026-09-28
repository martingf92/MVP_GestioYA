export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[#F0E9DE] ${className}`} />;
}

/** Fila de skeleton para un listado de entidades: avatar + 2 barras + monto. */
export function EntidadRowSkeleton({ variant = 'card' }: { variant?: 'card' | 'table' }) {
  if (variant === 'table') {
    return (
      <div className="flex items-center gap-4 border-b border-line-soft px-5 py-[14px]">
        <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full !bg-[#F5F0E7]" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4 !bg-[#F5F0E7]" />
        </div>
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-5 w-24 !bg-[#F5F0E7]" />
        <Skeleton className="h-3.5 w-16" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-4">
      <Skeleton className="h-9 w-9 flex-shrink-0 rounded-full !bg-[#F5F0E7]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3 !bg-[#F5F0E7]" />
      </div>
      <Skeleton className="h-5 w-20 !bg-[#F5F0E7]" />
    </div>
  );
}
