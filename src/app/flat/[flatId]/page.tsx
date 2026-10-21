'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { Plus, ShoppingCart, Search, X, Zap } from 'lucide-react';
import { useFlat } from '@/hooks/useFlat';
import { useGroceryList } from '@/hooks/useGroceryList';
import { useOrderingStatus } from '@/hooks/useOrderingStatus';
import { useHistory } from '@/hooks/useHistory';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { GroceryList } from '@/components/grocery/GroceryList';
import { CategoryFilter } from '@/components/grocery/CategoryFilter';
import { QuickAddChips } from '@/components/grocery/QuickAddChips';
import { AddItemForm } from '@/components/grocery/AddItemForm';
import { EditItemDrawer } from '@/components/grocery/EditItemDrawer';
import { OrderingBanner } from '@/components/ordering/OrderingBanner';
import { StartOrderDrawer } from '@/components/ordering/StartOrderDrawer';
import { OrderChecklistView } from '@/components/ordering/OrderChecklistView';
import { Button } from '@/components/ui/Button';
import { GroceryItem } from '@/types/app.types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const routeParams = useParams();
  const flatId = (routeParams?.flatId as string) || '';
  const { profile, selectedCategory, setSelectedCategory, isAddItemOpen, setIsAddItemOpen } = useAppStore();

  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);

  // Search and urgent filters
  const [searchQuery, setSearchQuery] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);

  const { flat } = useFlat(flatId);
  const { items, loading, addItem, updateItem, updateStatus, deleteItem } = useGroceryList(flatId);
  const { session, startOrdering, endOrdering } = useOrderingStatus(flatId);
  const { purchasedItems } = useHistory(flatId);

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

  async function handleEndOrder(total?: number) {
    await endOrdering(total);
    toast.success('Order placed! Items moved to history 🎉');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header flat={flat} />

      {/* Main scrollable body with bottom clearance for action dock */}
      <main className="max-w-lg mx-auto space-y-3.5 pt-2 pb-40">
        {/* Ordering banner */}
        <OrderingBanner
          session={session}
          currentUserId={profile?.id}
          onViewChecklist={() => setIsChecklistOpen(true)}
        />

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

        {/* Quick re-add chips from purchase history */}
        <QuickAddChips
          recentItems={purchasedItems}
          onQuickAdd={async (payload) => {
            await addItem(payload);
            toast.success(`${payload.item_name} added!`);
          }}
        />

        {/* Item count header */}
        <div className="flex items-center justify-between px-4">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            {processedItems.length} {processedItems.length === 1 ? 'item' : 'items'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          {iAmOrdering && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              🛒 Ordering mode
            </span>
          )}
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
        />
      </main>

      {/* Mobile Action Dock above BottomNav with zero overlap */}
      <div className="fixed bottom-16 left-0 right-0 z-20 px-4 py-2.5 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200/70 dark:border-zinc-800/70 shadow-lg">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <Button
            onClick={() => setIsAddItemOpen(true)}
            variant="primary"
            size="md"
            className="flex-1 shadow-sm font-semibold text-sm h-11"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Item to List
          </Button>

          {!isActiveSession ? (
            <Button
              onClick={() => setIsOrderDrawerOpen(true)}
              variant="secondary"
              size="md"
              className="flex-1 shadow-sm font-semibold text-sm h-11 bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-500 dark:hover:bg-amber-600 border-0"
            >
              <ShoppingCart size={17} />
              I&apos;m Ordering Now 🛒
            </Button>
          ) : (
            <Button
              onClick={() => setIsChecklistOpen(true)}
              variant="outline"
              size="md"
              className="flex-1 shadow-sm font-semibold text-xs h-11 border-emerald-500 text-emerald-600 dark:text-emerald-400"
            >
              📋 View Checklist
            </Button>
          )}
        </div>
      </div>

      {/* Drawers */}
      <AddItemForm
        open={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onAdd={async (payload) => {
          await addItem(payload);
          toast.success(`${payload.item_name} added to list!`);
        }}
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
          toast.success(`You're now ordering on ${platform}! Flatmates notified 🔔`);
          setIsChecklistOpen(true);
        }}
      />

      <OrderChecklistView
        open={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        items={items}
        onUpdateStatus={updateStatus}
        onEndOrder={handleEndOrder}
      />

      <BottomNav flatId={flatId} />
    </div>
  );
}
