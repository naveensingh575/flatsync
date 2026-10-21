import { cn, getInitials, getAvatarColor } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string | null;
  id?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function Avatar({ name, src, id, size = 'md', className }: AvatarProps) {
  const colorClass = id ? getAvatarColor(id) : 'bg-emerald-500';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        sizes[size],
        colorClass,
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
