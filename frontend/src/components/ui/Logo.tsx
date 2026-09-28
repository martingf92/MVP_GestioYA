// Placeholder hasta que exista el logo real de Byte Ecosistemas
// (ver README del handoff de diseño, sección "Assets").
export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-verde font-serif text-[15px] font-semibold text-white">
        G
      </div>
      {withWordmark && (
        <span className="font-serif text-[17px] font-semibold text-ink">GestioYA</span>
      )}
    </div>
  );
}
