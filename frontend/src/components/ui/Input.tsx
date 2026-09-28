import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ error, className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full rounded-[10px] border bg-white px-[15px] py-[13px] text-[15px] text-ink
      placeholder:text-placeholder focus-visible:outline-none min-h-11
      ${error ? 'border-[1.5px] border-neg-input-border' : 'border-input-border'} ${className}`}
    {...props}
  />
));
Input.displayName = 'Input';
