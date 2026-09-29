'use client';

import { ReactNode, Ref, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Minúsculas y sin acentos, para buscar "almacen" y encontrar "Almacén". */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const MAX_OPCIONES = 50;

/**
 * Campo con autocompletado: se escribe para filtrar y se elige con mouse,
 * dedo o teclado (flechas + Enter, Escape cierra). Mientras no está abierto
 * muestra el nombre de lo elegido.
 */
export function SearchCombo<T>({
  id,
  items,
  selected,
  getKey,
  getLabel,
  matches,
  renderOption,
  onSelect,
  placeholder,
  emptyText,
  error,
  inputRef,
  onBlur,
  describedBy,
}: {
  id: string;
  items: T[];
  selected: T | null;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  /** `q` ya viene normalizado (ver normalizar). */
  matches: (item: T, q: string) => boolean;
  renderOption: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  placeholder: string;
  emptyText: string;
  error?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onBlur?: () => void;
  describedBy?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const q = normalizar(query.trim());
  const opciones = (q ? items.filter((it) => matches(it, q)) : items).slice(0, MAX_OPCIONES);

  function elegir(item: T) {
    onSelect(item);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((a) => Math.min(a + 1, opciones.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (opciones[active]) elegir(opciones[active]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && opciones[active] ? `${listId}-${active}` : undefined}
        aria-invalid={error || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        // Lo elegido se muestra como placeholder (en color de texto), no como
        // valor: así lo que se escribe siempre arranca una búsqueda nueva, en
        // vez de pegarse al nombre anterior.
        placeholder={selected ? getLabel(selected) : placeholder}
        value={query}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery('');
          onBlur?.();
        }}
        onKeyDown={onKeyDown}
        className={`min-h-11 w-full rounded-[10px] border bg-white py-[12px] pr-10 pl-[15px] text-[15px] text-ink focus-visible:outline-none
          ${selected ? 'placeholder:text-ink' : 'placeholder:text-placeholder'}
          ${error ? 'border-[1.5px] border-neg-input-border' : 'border-input-border'}`}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          // z por encima de la barra fija del editor y de la tab bar (z-30).
          className="absolute top-[calc(100%+6px)] right-0 left-0 z-[35] max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[var(--shadow-pop)]"
        >
          {opciones.length === 0 ? (
            <li className="px-3 py-2.5 text-[13.5px] text-muted">{emptyText}</li>
          ) : (
            opciones.map((item, i) => (
              <li
                key={getKey(item)}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected ? getKey(selected) === getKey(item) : false}
                // mousedown (no click): el click llega después del blur del
                // input, que ya cerró la lista.
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(item);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? 'bg-[#F7FBF8]' : ''}`}
              >
                {renderOption(item)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
