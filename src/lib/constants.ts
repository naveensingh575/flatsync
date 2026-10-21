import { ItemCategory, Platform, GroupType } from '@/types/app.types';

export const ITEM_CATEGORIES: { value: ItemCategory; label: string; emoji: string }[] = [
  { value: 'dairy',         label: 'Dairy',         emoji: '🥛' },
  { value: 'veggies',       label: 'Veggies',       emoji: '🥦' },
  { value: 'fruits',        label: 'Fruits',         emoji: '🍎' },
  { value: 'snacks',        label: 'Snacks',         emoji: '🍿' },
  { value: 'beverages',     label: 'Beverages',      emoji: '🧃' },
  { value: 'essentials',    label: 'Essentials',     emoji: '🧻' },
  { value: 'personal_care', label: 'Personal Care',  emoji: '🧴' },
  { value: 'other',         label: 'Other',          emoji: '📦' },
];

export const GROUP_TYPES: { value: GroupType; label: string; emoji: string; description: string }[] = [
  { value: 'flat',       label: 'Flatmates',   emoji: '🏠', description: 'Apartment & room sync' },
  { value: 'family',     label: 'Family',      emoji: '👨‍👩‍👧', description: 'Household groceries' },
  { value: 'friends',    label: 'Friends',     emoji: '🎉', description: 'Parties, hangouts & get-togethers' },
  { value: 'colleagues', label: 'Colleagues',  emoji: '💼', description: 'Office snacks & essentials' },
  { value: 'trip',       label: 'Trip / Stay', emoji: '🏕️', description: 'Vacations & Airbnb groceries' },
  { value: 'other',      label: 'Other Group', emoji: '👥', description: 'Custom group' },
];

export const PLATFORMS: { value: Platform; label: string; color: string; bgColor: string }[] = [
  { value: 'blinkit',   label: 'Blinkit',   color: 'text-yellow-700', bgColor: 'bg-yellow-400' },
  { value: 'zepto',     label: 'Zepto',     color: 'text-purple-700', bgColor: 'bg-purple-500' },
  { value: 'instamart', label: 'Instamart', color: 'text-orange-700', bgColor: 'bg-orange-500' },
  { value: 'other',     label: 'Other',     color: 'text-gray-700',   bgColor: 'bg-gray-400'   },
];

export const STATUS_LABELS = {
  pending:   { label: 'Pending',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_cart:   { label: 'In Cart',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  purchased: { label: 'Purchased',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  dairy:         'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  veggies:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  fruits:        'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  snacks:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  beverages:     'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  essentials:    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  personal_care: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  other:         'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export const AVATAR_COLORS = [
  'bg-red-400',
  'bg-orange-400',
  'bg-amber-400',
  'bg-green-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
];
