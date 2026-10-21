import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm',
        onClick && 'cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors',
        className
      )}
    >
      {children}
    </div>
  );
}
