'use client';

import { useRef, useState, useEffect } from 'react';
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

  const cardRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(360);
  const [swipeStage, setSwipeStage] = useState<'none' | 'right_pending' | 'right_ready' | 'left_pending' | 'left_ready'>('none');

  useEffect(() => {
    if (cardRef.current) {
      const w = cardRef.current.clientWidth;
      if (w > 0) setCardWidth(w);
    }
  }, []);

  // Option A: Ergonomic 40% sweet spot (38% for Cart, 42% for Delete)
  const rightThreshold = Math.max(120, Math.round(cardWidth * 0.38));
  const leftThreshold = Math.max(135, Math.round(cardWidth * 0.42));

  const x = useMotionValue(0);

  // Background opacity transitions based on drag direction
  const rightRevealOpacity = useTransform(x, [10, 50], [0, 1]);
  const leftRevealOpacity = useTransform(x, [-10, -50], [0, 1]);

  useEffect(() => {
    return x.on('change', (latest) => {
      if (latest >= rightThreshold) {
        setSwipeStage((prev) => {
          if (prev !== 'right_ready') {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
            return 'right_ready';
          }
          return prev;
        });
      } else if (latest > 12) {
        setSwipeStage('right_pending');
      } else if (latest <= -leftThreshold) {
        setSwipeStage((prev) => {
          if (prev !== 'left_ready') {
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
            return 'left_ready';
          }
          return prev;
        });
      } else if (latest < -12) {
        setSwipeStage('left_pending');
      } else {
        setSwipeStage('none');
      }
    });
  }, [x, rightThreshold, leftThreshold]);

  function handleDragEnd(_: any, info: any) {
    setSwipeStage('none');

    // Intentional drag (38% threshold or fast intentional flick >= 22%)
    const isRightCommitted =
      info.offset.x >= rightThreshold ||
      (info.velocity.x > 500 && info.offset.x >= cardWidth * 0.22);

    // Intentional drag (42% threshold or fast intentional flick <= -25%)
    const isLeftCommitted =
      info.offset.x <= -leftThreshold ||
      (info.velocity.x < -500 && info.offset.x <= -cardWidth * 0.25);

    if (isRightCommitted) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
      onUpdateStatus(item.id, item.status === 'in_cart' ? 'pending' : 'in_cart');
    } else if (isLeftCommitted) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
      onDelete(item.id);
    }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden select-none">
      {/* Background action reveal layers with clean labels (no percentages) */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        {/* Swipe Right Reveal: In Cart */}
        <motion.div
          style={{ opacity: rightRevealOpacity }}
          className={cn(
            'absolute inset-0 text-white flex items-center justify-start pl-5 pr-4 transition-colors duration-200',
            swipeStage === 'right_ready' ? 'bg-emerald-600' : 'bg-emerald-500/90'
          )}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2
              size={swipeStage === 'right_ready' ? 24 : 20}
              className={cn(
                'text-white transition-transform duration-150',
                swipeStage === 'right_ready' && 'scale-125'
              )}
            />
            {swipeStage === 'right_ready' ? (
              <span className="text-xs font-black tracking-wide uppercase px-2.5 py-1 rounded-lg bg-white/25 backdrop-blur-xs shadow-sm animate-pulse">
                Release for Cart ✓
              </span>
            ) : (
              <span className="text-xs font-bold tracking-wide opacity-90">
                Slide to Cart →
              </span>
            )}
          </div>
        </motion.div>

        {/* Swipe Left Reveal: Delete */}
        <motion.div
          style={{ opacity: leftRevealOpacity }}
          className={cn(
            'absolute inset-0 text-white flex items-center justify-end pr-5 pl-4 transition-colors duration-200',
            swipeStage === 'left_ready' ? 'bg-rose-600' : 'bg-rose-500/90'
          )}
        >
          <div className="flex items-center gap-2.5">
            {swipeStage === 'left_ready' ? (
              <span className="text-xs font-black tracking-wide uppercase px-2.5 py-1 rounded-lg bg-white/25 backdrop-blur-xs shadow-sm animate-pulse">
                Release to Delete 🗑️
              </span>
            ) : (
              <span className="text-xs font-bold tracking-wide opacity-90">
                ← Slide to Delete
              </span>
            )}
            <Trash2
              size={swipeStage === 'left_ready' ? 24 : 20}
              className={cn(
                'text-white transition-transform duration-150',
                swipeStage === 'left_ready' && 'scale-125'
              )}
            />
          </div>
        </motion.div>
      </div>

      {/* Front draggable item card with 1:1 finger tracking & auto-snap */}
      <motion.div
        ref={cardRef}
        layout
        drag="x"
        dragDirectionLock
        dragSnapToOrigin
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'pan-y' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -cardWidth, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={cn(
          'relative flex items-start gap-3.5 p-4 rounded-2xl border transition-colors duration-150 shadow-xs hover:shadow-sm',
          item.status === 'in_cart'
            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/70 dark:border-emerald-800/50 opacity-95'
            : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80'
        )}
      >
        {/* Left Circle Category & Status Indicator: Interactive toggle button */}
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
            'flex-shrink-0 mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-150 select-none cursor-pointer active:scale-90 touch-manipulation',
            item.status === 'in_cart'
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/60 hover:border-emerald-500 hover:bg-emerald-50/50'
          )}
          title={item.status === 'in_cart' ? 'Mark as pending' : 'Move to cart'}
        >
          {item.status === 'in_cart' ? (
            <CheckCircle2 size={16} className="text-white fill-emerald-500" strokeWidth={2.5} />
          ) : (
            <span className="text-xs">{catMeta?.emoji || '🛒'}</span>
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

            {/* Status / In Cart Indicator Badge (Disabled: tapping does not change status; status change is exclusively via left circle tap or slide) */}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none shadow-2xs pointer-events-none',
                item.status === 'in_cart'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700'
              )}
            >
              <ShoppingCart size={11} />
              <span>{item.status === 'in_cart' ? 'In Cart ✅' : 'Pending'}</span>
            </span>

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
