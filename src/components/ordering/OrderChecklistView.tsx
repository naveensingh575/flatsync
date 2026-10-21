'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingCart, Package, User } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { GroceryItem, ItemStatus } from '@/types/app.types';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface OrderChecklistViewProps {
  open: boolean;
  onClose: () => void;
  items: GroceryItem[];
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onEndOrder: (total?: number) => Promise<void>;
}

export function OrderChecklistView({
  open,
  onClose,
  items,
  onUpdateStatus,
  onEndOrder,
}: OrderChecklistViewProps) {
  const [totalAmount, setTotalAmount] = useState('');
  const [ending, setEnding] = useState(false);

  const inCartCount = items.filter((i) => i.status === 'in_cart').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  async function handleEnd() {
    setEnding(true);
    await onEndOrder(totalAmount ? parseFloat(totalAmount) : undefined);
    setEnding(false);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Order Checklist 📋" className="max-h-[95vh]">
      <div className="p-4 space-y-4">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>{inCartCount} in cart</span>
            <span>{pendingCount} pending</span>
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              animate={{ width: `${items.length ? (inCartCount / items.length) * 100 : 0}%` }}
              transition={{ type: 'spring', stiffness: 200 }}
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((item) => {
              const catMeta = ITEM_CATEGORIES.find((c) => c.value === item.category);
              const isInCart = item.status === 'in_cart';
              const requester = item.requested_by?.name || 'Someone';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    isInCart
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  )}
                >
                  <button
                    onClick={() =>
                      onUpdateStatus(item.id, isInCart ? 'pending' : 'in_cart')
                    }
                    className="flex-shrink-0"
                  >
                    <motion.div
                      animate={{ scale: isInCart ? 1 : 0.9 }}
                      className={cn(
                        'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors',
                        isInCart
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-300 dark:border-zinc-600'
                      )}
                    >
                      {isInCart && <CheckCircle2 size={16} className="text-white" fill="white" />}
                    </motion.div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium text-sm',
                      isInCart ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-white'
                    )}>
                      {item.item_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs">{catMeta?.emoji}</span>
                      {item.quantity && (
                        <span className="text-xs text-zinc-400">{item.quantity}</span>
                      )}
                      {item.is_urgent && (
                        <Badge variant="urgent" className="text-[10px] px-1.5 py-0">Urgent</Badge>
                      )}
                      {item.for_user && (
                        <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                          For: {item.for_user}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Avatar name={requester} id={item.requested_by_id} size="sm" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[70px] truncate">
                      {requester}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Order total */}
        <div className="space-y-1">
          <Input
            label="Total Amount (optional)"
            type="number"
            placeholder="e.g. 845"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
          <p className="text-xs text-zinc-400 px-1">Used for split-bill tracking</p>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleEnd}
          loading={ending}
          disabled={inCartCount === 0}
        >
          <Package size={18} />
          Mark Order as Placed ({inCartCount} items)
        </Button>
      </div>
    </Drawer>
  );
}
