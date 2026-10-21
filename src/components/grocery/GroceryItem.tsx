'use client';

import { motion } from 'framer-motion';
import { Trash2, ShoppingCart, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { GroceryItem, ItemStatus } from '@/types/app.types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { CATEGORY_COLORS, ITEM_CATEGORIES, STATUS_LABELS } from '@/lib/constants';
import { timeAgo, cn } from '@/lib/utils';

interface GroceryItemCardProps {
  item: GroceryItem;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  isOrderingMode?: boolean;
}

const statusFlow: Record<ItemStatus, ItemStatus> = {
  pending: 'in_cart',
  in_cart: 'purchased',
  purchased: 'pending',
};

export function GroceryItemCard({
  item,
  onUpdateStatus,
  onDelete,
  isOrderingMode,
}: GroceryItemCardProps) {
  const catMeta = ITEM_CATEGORIES.find((c) => c.value === item.category);
  const statusMeta = STATUS_LABELS[item.status];

  function handleTap() {
    if (isOrderingMode) {
      onUpdateStatus(item.id, statusFlow[item.status]);
    }
  }

  const requesterName = item.requested_by?.name || 'Someone';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-2xl border transition-all',
        item.status === 'in_cart'
          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800',
        isOrderingMode && 'cursor-pointer active:scale-[0.98]'
      )}
      onClick={handleTap}
    >
      {/* Ordering mode checkbox */}
      {isOrderingMode && (
        <div className="flex-shrink-0 mt-0.5">
          <motion.div
            animate={{
              scale: item.status === 'in_cart' ? 1 : 0.9,
              backgroundColor: item.status === 'in_cart' ? '#10b981' : 'transparent',
            }}
            className={cn(
              'w-6 h-6 rounded-full border-2 flex items-center justify-center',
              item.status === 'in_cart' ? 'border-emerald-500' : 'border-zinc-300 dark:border-zinc-600'
            )}
          >
            {item.status === 'in_cart' && (
              <CheckCircle2 size={14} className="text-white" />
            )}
          </motion.div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={cn(
              'font-semibold text-sm text-zinc-900 dark:text-white',
              item.status === 'in_cart' && 'line-through text-zinc-400 dark:text-zinc-500'
            )}>
              {item.item_name}
            </p>
            {item.quantity && (
              <p className="text-xs text-zinc-400 mt-0.5">{item.quantity}</p>
            )}
            {item.note && (
              <p className="text-xs text-zinc-400 mt-0.5 italic">{item.note}</p>
            )}
          </div>

          {/* Delete button – only in normal mode */}
          {!isOrderingMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-300 dark:text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
              title="Remove item"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Metadata badges row */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Category badge */}
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            CATEGORY_COLORS[item.category]
          )}>
            {catMeta?.emoji} {catMeta?.label}
          </span>

          {/* Urgent */}
          {item.is_urgent && (
            <Badge variant="urgent">
              <AlertCircle size={10} /> Urgent
            </Badge>
          )}

          {/* Status */}
          {item.status === 'in_cart' && (
            <Badge className={statusMeta.color}>
              <ShoppingCart size={10} /> {statusMeta.label}
            </Badge>
          )}

          {/* For Person (if designated) */}
          {item.for_user && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <User size={10} /> For: {item.for_user}
            </span>
          )}
        </div>

        {/* Prominent Requester Attribution */}
        <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar name={requesterName} id={item.requested_by_id} size="sm" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate">
              {requesterName}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 flex-shrink-0">
            {timeAgo(item.created_at)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
