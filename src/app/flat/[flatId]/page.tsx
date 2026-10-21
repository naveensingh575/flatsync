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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <Header flat={flat} />

      <main className="max-w-lg mx-auto space-y-4 pt-2">
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

      {/* FAB: Add Item */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsAddItemOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50 flex items-center justify-center z-30 transition-colors"
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>

      {/* Order Now button */}
      {!isActiveSession && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-30"
        >
          <Button
            className="w-full shadow-lg"
            size="lg"
            onClick={() => setIsOrderDrawerOpen(true)}
          >
            <ShoppingCart size={18} />
            I'm Ordering Now 🛒
          </Button>
        </motion.div>
      )}

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
