import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white',
            'border-zinc-200 dark:border-zinc-700 placeholder:text-zinc-400',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            'transition-all duration-150 text-sm',
            error && 'border-red-400 focus:ring-red-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
