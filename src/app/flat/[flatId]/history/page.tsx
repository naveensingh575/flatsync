'use client';


import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ChevronDown, Package } from 'lucide-react';
import { useHistory } from '@/hooks/useHistory';
import { useGroceryList } from '@/hooks/useGroceryList';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { OfflineState } from '@/components/ui/OfflineState';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ITEM_CATEGORIES, PLATFORMS } from '@/lib/constants';
import { formatINR, timeAgo } from '@/lib/utils';
import { Order } from '@/types/app.types';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const routeParams = useParams();
  const routeFlatId = (routeParams?.flatId as string) || '';
  const { currentGroupId, profile, userGroups } = useAppStore();
  const flatId = (routeFlatId && routeFlatId !== 'current' && routeFlatId !== 'list')
    ? routeFlatId
    : (currentGroupId || profile?.group_id || profile?.flat_id || (userGroups.length > 0 ? userGroups[0]?.id : ''));

  // Clean URL: Scrub `/flat/...` from browser address bar and display `/history`
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/flat/')) {
      window.history.replaceState(null, '', '/history');
    }
  }, []);

  const { isOnline } = useNetworkStatus();
  const { orders, purchasedItems, loading, isError, refetch } = useHistory(flatId);
  const { addItem, addBatchItems } = useGroceryList(flatId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      if (orders.length === 0) setTimedOut(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, [loading, orders.length]);

  async function quickReAdd(itemName: string, category: string) {
    await addItem({ item_name: itemName, category: category as any, is_urgent: false, quantity: null, note: null });
    toast.success(`${itemName} added back to list!`);
  }

  async function handleReAddEntireOrder(items: typeof purchasedItems) {
    if (!items.length) return;
    const payload = items.map((i) => ({
      item_name: i.item_name,
      category: i.category,
      quantity: i.quantity || null,
      note: i.note || null,
      is_urgent: false,
    }));
    await addBatchItems(payload);
    toast.success(`Re-added all ${items.length} items to your grocery list! 🛒`);
  }

  // 1. Immediately show OfflineState if offline or network error or timeout with no cached orders
  if (orders.length === 0 && (!isOnline || isError || timedOut)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <Header isOnline={isOnline} />
        <main className="max-w-lg mx-auto p-4 space-y-5 mt-2">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Order History</h2>
            <p className="text-sm text-zinc-400">Past orders and re-order</p>
          </div>
          <OfflineState
            title="You are Currently Offline"
            message={
              !isOnline
                ? "GrocerySync couldn't connect to load past orders. Check your internet connection and try again."
                : "Network connection timed out or is too weak to load orders. Please tap retry."
            }
            onRetry={async () => {
              setTimedOut(false);
              await refetch();
            }}
          />
        </main>
        <BottomNav flatId={flatId} />
      </div>
    );
  }

  // 2. Pulse Skeleton during initial loading
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <Header isOnline={isOnline} />
        <div className="max-w-lg mx-auto p-4 space-y-3 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
        <BottomNav flatId={flatId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <Header isOnline={isOnline} />

      <main className="max-w-lg mx-auto p-4 space-y-5 mt-2">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Order History</h2>
          <p className="text-sm text-zinc-400">Tap any order to see items & re-add</p>
        </div>

        {orders.length === 0 ? (
          !isOnline || isError ? (
            <OfflineState
              title="You are Currently Offline"
              message="GrocerySync couldn't load past orders. Check your internet connection and try again."
              onRetry={async () => {
                setTimedOut(false);
                await refetch();
              }}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Package size={40} className="text-zinc-300 dark:text-zinc-700" />
              <p className="text-zinc-400 dark:text-zinc-500">No orders yet</p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const platform = PLATFORMS.find((p) => p.value === order.platform);
              const isOpen = expanded === order.id;
              const orderItems = purchasedItems.filter((i) => i.order_id === order.id);

              return (
                <div key={order.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl ${platform?.bgColor} flex items-center justify-center`}>
                      <Package size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-white">
                        {platform?.label} order
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {order.buyer && (
                          <span className="text-xs text-zinc-400">by {order.buyer.name}</span>
                        )}
                        {order.total_amount && (
                          <Badge className="text-[10px]">{formatINR(order.total_amount)}</Badge>
                        )}
                        <span className="text-xs text-zinc-400">{timeAgo(order.created_at)}</span>
                      </div>
                    </div>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={18} className="text-zinc-400" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                      >
                        <div className="p-3 space-y-2">
                          {orderItems.length > 0 && (
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                              <span className="text-xs font-semibold text-zinc-500">
                                {orderItems.length} item{orderItems.length === 1 ? '' : 's'}
                              </span>
                              <button
                                onClick={() => handleReAddEntireOrder(orderItems)}
                                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                              >
                                <RotateCcw size={12} />
                                <span>Re-Add Entire Order</span>
                              </button>
                            </div>
                          )}
                          {orderItems.length === 0 && (
                            <p className="text-xs text-zinc-400 text-center py-2">No item details stored</p>
                          )}
                          {orderItems.map((item) => {
                            const cat = ITEM_CATEGORIES.find((c) => c.value === item.category);
                            return (
                              <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                                <span>{cat?.emoji}</span>
                                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{item.item_name}</span>
                                {item.quantity && <span className="text-xs text-zinc-400">{item.quantity}</span>}
                                <button
                                  onClick={() => quickReAdd(item.item_name, item.category)}
                                  className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 transition-colors"
                                  title="Re-add to list"
                                >
                                  <RotateCcw size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav flatId={flatId} />
    </div>
  );
}
