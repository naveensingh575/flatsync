'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, ShoppingCart, CheckCircle2, AlertCircle, User, Pencil, X } from 'lucide-react';
import { GroceryItem, ItemStatus, AddItemPayload } from '@/types/app.types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { CATEGORY_COLORS, ITEM_CATEGORIES, STATUS_LABELS } from '@/lib/constants';
import { timeAgo, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface GroceryItemCardProps {
  item: GroceryItem;
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  onEdit?: (item: GroceryItem) => void;
  onUpdateItem?: (id: string, updates: Partial<AddItemPayload>) => Promise<void> | void;
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
  onEdit,
  onUpdateItem,
  isOrderingMode,
}: GroceryItemCardProps) {
  const catMeta = ITEM_CATEGORIES.find((c) => c.value === item.category);
  const statusMeta = STATUS_LABELS[item.status];
  const requesterName = item.requested_by?.name || 'Someone';

  const cleanNoteText = item.note ? item.note.replace(/\[[^\]]*\]/g, '').trim() : '';
  const storeTagMatch = item.note?.match(/\[(Blinkit|Zepto|Instamart|Apollo|Pharmacy|Local Mandi|Mandi|Licious|Meat)[^\]]*\]/i);
  const storeTagName = storeTagMatch ? storeTagMatch[0].replace(/[\[\]]/g, '') : null;

  const x = useMotionValue(0);

  // Background opacity transitions based on drag direction
  const rightRevealOpacity = useTransform(x, [10, 50], [0, 1]);
  const leftRevealOpacity = useTransform(x, [-10, -50], [0, 1]);

  function handleDragEnd(_: any, info: any) {
    const isSwipeRight = info.offset.x > 60 || info.velocity.x > 300;
    const isSwipeLeft = info.offset.x < -60 || info.velocity.x < -300;

    if (isSwipeRight) {
      // Swiped right -> toggle In Cart
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
      onUpdateStatus(item.id, item.status === 'in_cart' ? 'pending' : 'in_cart');
    } else if (isSwipeLeft) {
      // Swiped left -> Delete item
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
      onDelete(item.id);
    }
  }

  function handleTap() {
    if (isOrderingMode) {
      onUpdateStatus(item.id, statusFlow[item.status]);
    }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden select-none">
      {/* Background action reveal layers */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        {/* Swipe Right Reveal: In Cart */}
        <motion.div
          style={{ opacity: rightRevealOpacity }}
          className="absolute inset-0 bg-emerald-500 text-white flex items-center justify-start pl-5 gap-2.5"
        >
          <CheckCircle2 size={22} className="text-white" />
          <span className="text-xs font-bold tracking-wide">
            {item.status === 'in_cart' ? 'Mark Pending' : 'In Cart'}
          </span>
        </motion.div>

        {/* Swipe Left Reveal: Delete */}
        <motion.div
          style={{ opacity: leftRevealOpacity }}
          className="absolute inset-0 bg-rose-500 text-white flex items-center justify-end pr-5 gap-2.5"
        >
          <span className="text-xs font-bold tracking-wide">Delete</span>
          <Trash2 size={22} className="text-white" />
        </motion.div>
      </div>

      {/* Front draggable item card */}
      <motion.div
        layout
        drag="x"
        dragDirectionLock
        dragSnapToOrigin
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'pan-y' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -300, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className={cn(
          'relative flex items-start gap-3.5 p-4 rounded-2xl border transition-colors duration-150 shadow-xs hover:shadow-sm',
          item.status === 'in_cart'
            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/70 dark:border-emerald-800/50 opacity-95'
            : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80',
          isOrderingMode && 'cursor-pointer'
        )}
        onClick={handleTap}
      >
        {/* Checkbox / In-Cart Toggle Circle (Always visible, solid touch target) */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(15);
            }
            onUpdateStatus(item.id, item.status === 'in_cart' ? 'pending' : 'in_cart');
          }}
          className={cn(
            'flex-shrink-0 mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-90 touch-manipulation',
            item.status === 'in_cart'
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-emerald-400 bg-zinc-50 dark:bg-zinc-800/60'
          )}
          title={item.status === 'in_cart' ? 'Mark as Pending' : 'Mark as In Cart'}
        >
          {item.status === 'in_cart' && (
            <CheckCircle2 size={16} className="text-white fill-emerald-500" strokeWidth={2.5} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={cn(
                'font-semibold text-sm text-zinc-900 dark:text-white leading-snug',
                item.status === 'in_cart' && 'line-through text-zinc-400 dark:text-zinc-500'
              )}>
                {item.item_name}
              </p>
              {item.quantity && (
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">{item.quantity}</p>
              )}
              {cleanNoteText && (
                <p className="text-xs text-zinc-400 mt-0.5 italic">{cleanNoteText}</p>
              )}
            </div>

            {/* Edit and Delete buttons (with onPointerDown stopPropagation so drag never intercepts) */}
            {!isOrderingMode && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onEdit(item); }}
                    className="w-8 h-8 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer select-none active:scale-90 touch-manipulation"
                    title="Edit item"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="w-8 h-8 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/40 text-zinc-300 dark:text-zinc-600 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer select-none active:scale-90 touch-manipulation"
                  title="Remove item"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Metadata badges row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Category badge */}
            <span className={cn(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
              CATEGORY_COLORS[item.category]
            )}>
              {catMeta?.emoji} {catMeta?.label}
            </span>

            {/* Specialty Store / Merchant Tag */}
            {storeTagName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                🏷️ {storeTagName}
              </span>
            )}

            {/* Urgent */}
            {item.is_urgent && (
              <Badge variant="urgent">
                <AlertCircle size={10} /> Urgent
              </Badge>
            )}

            {/* Out of Stock Rollover Badge with 1-Tap Remove Option */}
            {item.note && item.note.includes('[OOS') && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <span>⚠️ {item.note.match(/\[OOS[^\]]*\]/)?.[0]?.replace(/[\[\]]/g, '') || 'OOS'}</span>
                {onUpdateItem && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const cleanNote = (item.note || '').replace(/\[OOS[^\]]*\]/g, '').trim();
                      onUpdateItem(item.id, { note: cleanNote || null });
                      toast.success(`Removed OOS tag from ${item.item_name}`);
                    }}
                    className="p-1 rounded-full hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer select-none touch-manipulation"
                    title="Remove Out of Stock tag"
                  >
                    <X size={12} strokeWidth={2.8} />
                  </button>
                )}
              </span>
            )}

            {/* Status / In Cart Toggle Button */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(15);
                }
                onUpdateStatus(item.id, item.status === 'in_cart' ? 'pending' : 'in_cart');
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer select-none transition-transform active:scale-95 touch-manipulation shadow-2xs',
                item.status === 'in_cart'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700'
              )}
              title={item.status === 'in_cart' ? 'Tap to mark as Pending' : 'Tap to mark as In Cart'}
            >
              <ShoppingCart size={11} />
              <span>{item.status === 'in_cart' ? 'In Cart ✅' : 'Pending'}</span>
            </button>

            {/* For Person */}
            {item.for_user && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                <User size={10} /> For: {item.for_user}
              </span>
            )}
          </div>

          {/* Prominent Requester Attribution & Editor Attribution */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <Avatar name={requesterName} id={item.requested_by_id} size="sm" />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 truncate">
                {requesterName}
              </span>
              {item.last_edited_by_id && item.last_edited_by_id !== item.requested_by_id && (
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
                  · edited by <span className="font-medium text-zinc-600 dark:text-zinc-300">{item.last_edited_by?.name || 'member'}</span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 flex-shrink-0">
              {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
