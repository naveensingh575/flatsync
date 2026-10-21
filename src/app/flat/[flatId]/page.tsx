'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { OrderingBanner } from '@/components/ordering/OrderingBanner';
import { StartOrderDrawer } from '@/components/ordering/StartOrderDrawer';
import { OrderChecklistView } from '@/components/ordering/OrderChecklistView';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const routeParams = useParams();
  const flatId = (routeParams?.flatId as string) || '';
  const { profile, selectedCategory, setSelectedCategory, isAddItemOpen, setIsAddItemOpen } = useAppStore();
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  const { flat } = useFlat(flatId);
  const { items, loading, addItem, updateStatus, deleteItem } = useGroceryList(flatId);
  const { session, startOrdering, endOrdering } = useOrderingStatus(flatId);
  const { purchasedItems } = useHistory(flatId);

  const isActiveSession = !!session;
  const iAmOrdering = session?.buyer_id === profile?.id;

  // Filter items by selected category
  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((i) => i.category === selectedCategory);

  async function handleEndOrder(total?: number) {
    await endOrdering(total);
    toast.success('Order placed! Items moved to history 🎉');
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header flat={flat} />

      {/* Main scrollable body with ample bottom padding for docked buttons & bottom nav */}
      <main className="max-w-lg mx-auto space-y-4 pt-2 pb-40">
        {/* Ordering banner */}
        <OrderingBanner
          session={session}
          currentUserId={profile?.id}
          onViewChecklist={() => setIsChecklistOpen(true)}
        />

        {/* Category filter */}
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

        {/* Quick re-add chips */}
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
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </p>
          {iAmOrdering && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium animate-pulse">
              🛒 Ordering mode
            </span>
          )}
        </div>

        {/* Main grocery list */}
        <GroceryList
          items={filteredItems}
          loading={loading}
          isOrderingMode={iAmOrdering}
          onUpdateStatus={async (id, status) => {
            await updateStatus(id, status);
          }}
          onDelete={async (id) => {
            await deleteItem(id);
            toast.success('Item removed');
          }}
        />
      </main>

      {/* Mobile-First Action Bar: Docked above BottomNav with zero overlap */}
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
