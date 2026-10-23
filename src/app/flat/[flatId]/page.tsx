'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { Plus, ShoppingCart, Search, X, Zap, CheckCircle2 } from 'lucide-react';
import { useFlat } from '@/hooks/useFlat';
import { useGroceryList } from '@/hooks/useGroceryList';
import { useOrderingStatus } from '@/hooks/useOrderingStatus';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { GroceryList } from '@/components/grocery/GroceryList';
import { CategoryFilter } from '@/components/grocery/CategoryFilter';
import { AddItemForm } from '@/components/grocery/AddItemForm';
import { EditItemDrawer } from '@/components/grocery/EditItemDrawer';
import { OrderingBanner } from '@/components/ordering/OrderingBanner';
import { StartOrderDrawer } from '@/components/ordering/StartOrderDrawer';
import { OrderChecklistView } from '@/components/ordering/OrderChecklistView';
import { Button } from '@/components/ui/Button';
import { GroceryItem } from '@/types/app.types';
import { findDuplicatePairs, mergeQuantities } from '@/lib/itemMatcher';
import { createClient } from '@/lib/supabase/client';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeUserToPush,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const routeParams = useParams();
  const router = useRouter();
  const routeFlatId = (routeParams?.flatId as string) || '';
  const { profile, userGroups, currentGroupId, setCurrentGroupId, selectedCategory, setSelectedCategory, isAddItemOpen, setIsAddItemOpen } = useAppStore();

  // Resolve effective group id (handling /list, /flat/current, or direct ID)
  const flatId = (routeFlatId && routeFlatId !== 'current' && routeFlatId !== 'list')
    ? routeFlatId
    : (currentGroupId || profile?.group_id || profile?.flat_id || (userGroups.length > 0 ? userGroups[0].id : ''));

  // Sync to store if direct ID provided
  useEffect(() => {
    if (flatId && flatId !== 'current' && flatId !== 'list' && flatId !== currentGroupId) {
      setCurrentGroupId(flatId);
    }
  }, [flatId, currentGroupId, setCurrentGroupId]);

  // Clean URL: Scrub `/flat/UUID` from browser address bar and display `/list`
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/flat/')) {
      window.history.replaceState(null, '', '/list');
    }
  }, []);

  // Protect route against unauthenticated public access
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      }
    }
    checkAuth();
  }, [router]);

  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);

  // Search and urgent filters
  const [searchQuery, setSearchQuery] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;
    const perm = getNotificationPermission();
    if (perm === 'granted' && flatId) {
      subscribeUserToPush(profile?.id, flatId);
    } else if (perm === 'default') {
      const dismissed = typeof window !== 'undefined' && localStorage.getItem('dismissed_notif_prompt') === 'true';
      if (!dismissed) {
        setShowNotifPrompt(true);
      }
    }
  }, [flatId, profile?.id]);

  const { flat } = useFlat(flatId);
  const {
    items,
    loading,
    isConnected,
    isOnline,
    addItem,
    addBatchItems,
    updateItem,
    updateStatus,
    batchUpdateStatus,
    deleteItem,
  } = useGroceryList(flatId);
  const { session, startOrdering, endOrdering } = useOrderingStatus(flatId);

  const isActiveSession = !!session;
  const iAmOrdering = session?.buyer_id === profile?.id;

  // Filter & sort items (Urgent items pinned to top)
  const processedItems = useMemo(() => {
    let result = items;

    // 1. Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((i) => i.category === selectedCategory);
    }

    // 2. Urgent only toggle
    if (urgentOnly) {
      result = result.filter((i) => i.is_urgent);
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((i) => {
        const nameMatch = i.item_name.toLowerCase().includes(q);
        const noteMatch = i.note?.toLowerCase().includes(q) ?? false;
        const forMatch = i.for_user?.toLowerCase().includes(q) ?? false;
        const requesterMatch = i.requested_by?.name?.toLowerCase().includes(q) ?? false;
        const catMatch = i.category.toLowerCase().includes(q);
        return nameMatch || noteMatch || forMatch || requesterMatch || catMatch;
      });
    }

    // 4. Sort: Urgent first, then newest first
    return [...result].sort((a, b) => {
      if (a.is_urgent && !b.is_urgent) return -1;
      if (!a.is_urgent && b.is_urgent) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [items, selectedCategory, urgentOnly, searchQuery]);

  const duplicatePairs = useMemo(() => findDuplicatePairs(items), [items]);

  async function handleMergeDuplicates() {
    const pairs = findDuplicatePairs(items);
    if (pairs.length === 0) return;

    for (const pair of pairs) {
      const newQty = mergeQuantities(pair.item1.quantity, pair.item2.quantity);
      await Promise.all([
        updateItem(pair.item1.id, { quantity: newQty }),
        deleteItem(pair.item2.id),
      ]);
    }
    toast.success(`Merged ${pairs.length} duplicate item${pairs.length === 1 ? '' : 's'}`);
  }

  const pendingInView = useMemo(
    () => processedItems.filter((i) => i.status === 'pending'),
    [processedItems]
  );
  const inCartInView = useMemo(
    () => processedItems.filter((i) => i.status === 'in_cart'),
    [processedItems]
  );

  async function handleToggleAllCart() {
    if (processedItems.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    const hasPending = pendingInView.length > 0;
    if (hasPending) {
      const ids = pendingInView.map((i) => i.id);
      await batchUpdateStatus(ids, 'in_cart');
      toast.success(`Moved ${ids.length} item${ids.length === 1 ? '' : 's'} to Cart 🛒`);
    } else {
      const ids = inCartInView.map((i) => i.id);
      await batchUpdateStatus(ids, 'pending');
      toast.success(`Moved ${ids.length} item${ids.length === 1 ? '' : 's'} back to Pending`);
    }
  }

  async function handleEndOrder(total?: number) {
    await endOrdering(total);
    toast.success('Order placed! Items moved to history');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header flat={flat} isConnected={isConnected} isOnline={isOnline} />

      {/* Main scrollable body with bottom clearance for floating island dock */}
      <main className="max-w-lg mx-auto space-y-3.5 pt-2 pb-28">
        {/* Ordering banner */}
        <OrderingBanner
          session={session}
          currentUserId={profile?.id}
          items={items}
          onViewChecklist={() => setIsChecklistOpen(true)}
          onQuickAdd={() => setIsAddItemOpen(true)}
        />

        {/* Lockscreen / Background Notification Activation Banner */}
        {showNotifPrompt && (
          <div className="mx-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl flex-shrink-0 animate-bounce">🔔</span>
              <div className="min-w-0">
                <p className="font-bold text-zinc-900 dark:text-white truncate">
                  Get Home Screen & Lockscreen Alerts
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                  Popups when group members order or add items even if GrocerySync is closed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  if (granted) {
                    await subscribeUserToPush(profile?.id, flatId);
                    toast.success('Home screen alerts enabled! 🔔');
                  }
                  setShowNotifPrompt(false);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                Enable
              </button>
              <button
                onClick={() => {
                  setShowNotifPrompt(false);
                  localStorage.setItem('dismissed_notif_prompt', 'true');
                }}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Duplicate Items Alert & Merge Banner */}
        {duplicatePairs.length > 0 && (
          <div className="mx-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2.5 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div className="min-w-0">
                <p className="font-bold text-amber-900 dark:text-amber-200 truncate">
                  {duplicatePairs.length} duplicate item{duplicatePairs.length === 1 ? '' : 's'} detected
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 truncate">
                  &quot;{duplicatePairs[0].item1.item_name}&quot; &amp; &quot;{duplicatePairs[0].item2.item_name}&quot;
                </p>
              </div>
            </div>
            <button
              onClick={handleMergeDuplicates}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs flex-shrink-0 transition-transform active:scale-95 cursor-pointer"
            >
              Merge All
            </button>
          </div>
        )}

        {/* Live Search Bar & Urgent Chip */}
        <div className="px-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search items, notes, requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setUrgentOnly(!urgentOnly)}
            className={cn(
              'flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 border',
              urgentOnly
                ? 'bg-red-500 text-white border-red-500 shadow-sm'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300'
            )}
            title="Filter urgent items"
          >
            <Zap size={13} className={urgentOnly ? 'fill-white' : 'text-red-500'} />
            Urgent
          </button>
        </div>

        {/* Category filter */}
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

        {/* Item count header & Bulk Select for Cart */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            {processedItems.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAllCart}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer select-none active:scale-95 transition-all"
              >
                <CheckCircle2 size={13} />
                {pendingInView.length > 0 ? `Select All for Cart (${pendingInView.length})` : 'Unselect All'}
              </button>
            )}
            {iAmOrdering && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                🛒 Ordering
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            {processedItems.length} {processedItems.length === 1 ? 'item' : 'items'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        {/* Main grocery list */}
        <GroceryList
          items={processedItems}
          loading={loading}
          isOrderingMode={iAmOrdering}
          onUpdateStatus={async (id, status) => {
            await updateStatus(id, status);
          }}
          onDelete={async (id) => {
            await deleteItem(id);
            toast.success('Item removed');
          }}
          onEdit={(item) => setEditingItem(item)}
          onUpdateItem={updateItem}
          onQuickAdd={addItem}
        />
      </main>

      {/* Drawers */}
      <AddItemForm
        open={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onAdd={async (payload) => {
          await addItem(payload);
          toast.success(`${payload.item_name} added to list!`);
        }}
        onAddBatch={addBatchItems}
        onUpdateItem={updateItem}
        existingItems={items}
      />

      <EditItemDrawer
        item={editingItem}
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={async (id, updates) => {
          await updateItem(id, updates);
          toast.success('Item updated!');
        }}
        onDelete={async (id) => {
          await deleteItem(id);
          toast.success('Item removed');
        }}
      />

      <StartOrderDrawer
        open={isOrderDrawerOpen}
        onClose={() => setIsOrderDrawerOpen(false)}
        onStartOrder={async (platform) => {
          await startOrdering(platform);
          toast.success(`You're now ordering on ${platform}! Group notified 🔔`);
          setIsChecklistOpen(true);
        }}
      />

      <OrderChecklistView
        open={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        items={items}
        platform={session?.platform}
        onUpdateStatus={updateStatus}
        onUpdateItem={updateItem}
        onEndOrder={handleEndOrder}
      />

      <BottomNav
        flatId={flatId}
        onAddItem={() => setIsAddItemOpen(true)}
        onStartOrder={() => setIsOrderDrawerOpen(true)}
        onViewChecklist={() => setIsChecklistOpen(true)}
        isOrderingActive={isActiveSession}
        inCartCount={items.filter((i) => i.status === 'in_cart').length}
        totalCount={items.length}
      />
    </div>
  );
}
