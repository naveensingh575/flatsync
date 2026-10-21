import { ItemCategory } from '@/types/app.types';

export interface GroceryCatalogItem {
  name: string;
  category: ItemCategory;
  defaultQty?: string;
  emoji: string;
}

export const COMMON_INDIAN_GROCERIES: GroceryCatalogItem[] = [
  // Dairy & Eggs
  { name: 'Amul Taaza Toned Milk', category: 'dairy', defaultQty: '500ml', emoji: '🥛' },
  { name: 'Amul Gold Full Cream Milk', category: 'dairy', defaultQty: '500ml', emoji: '🥛' },
  { name: 'Nandini GoodLife Milk', category: 'dairy', defaultQty: '1L', emoji: '🥛' },
  { name: 'Mother Dairy Milk', category: 'dairy', defaultQty: '500ml', emoji: '🥛' },
  { name: 'Amul Butter 500g', category: 'dairy', defaultQty: '500g', emoji: '🧈' },
  { name: 'Amul Salted Butter 100g', category: 'dairy', defaultQty: '100g', emoji: '🧈' },
  { name: 'Amul Masti Dahi / Curd', category: 'dairy', defaultQty: '400g', emoji: '🥣' },
  { name: 'Epigamia Greek Yogurt', category: 'dairy', defaultQty: '2 cups', emoji: '🥣' },
  { name: 'Fresh Malai Paneer', category: 'dairy', defaultQty: '200g', emoji: '🧀' },
  { name: 'Amul Cheese Slices', category: 'dairy', defaultQty: '10 slices', emoji: '🧀' },
  { name: 'Amul Processed Cheese Block', category: 'dairy', defaultQty: '200g', emoji: '🧀' },
  { name: 'Farm Fresh White Eggs (Pack of 6)', category: 'dairy', defaultQty: '6 pcs', emoji: '🥚' },
  { name: 'Farm Fresh White Eggs (Pack of 12)', category: 'dairy', defaultQty: '12 pcs', emoji: '🥚' },
  { name: 'Brown Eggs / Country Eggs', category: 'dairy', defaultQty: '6 pcs', emoji: '🥚' },

  // Veggies
  { name: 'Onions / Pyaz', category: 'veggies', defaultQty: '1 kg', emoji: '🧅' },
  { name: 'Tomatoes / Tamatar', category: 'veggies', defaultQty: '1 kg', emoji: '🍅' },
  { name: 'Potatoes / Aloo', category: 'veggies', defaultQty: '1 kg', emoji: '🥔' },
  { name: 'Ginger Garlic Paste / Adrak Lehsun', category: 'veggies', defaultQty: '100g', emoji: '🧄' },
  { name: 'Green Chillies / Hari Mirch', category: 'veggies', defaultQty: '100g', emoji: '🌶️' },
  { name: 'Fresh Coriander / Dhaniya', category: 'veggies', defaultQty: '1 bunch', emoji: '🌿' },
  { name: 'Fresh Mint / Pudina', category: 'veggies', defaultQty: '1 bunch', emoji: '🌿' },
  { name: 'Lemons / Nimbu', category: 'veggies', defaultQty: '4 pcs', emoji: '🍋' },
  { name: 'Lady Finger / Bhindi', category: 'veggies', defaultQty: '500g', emoji: '🥦' },
  { name: 'Capsicum / Green Shimla Mirch', category: 'veggies', defaultQty: '250g', emoji: '🫑' },
  { name: 'Carrots / Gajar', category: 'veggies', defaultQty: '500g', emoji: '🥕' },
  { name: 'Cucumbers / Kheera', category: 'veggies', defaultQty: '500g', emoji: '🥒' },

  // Fruits
  { name: 'Bananas / Kela (Robusta)', category: 'fruits', defaultQty: '6 pcs', emoji: '🍌' },
  { name: 'Apples / Seb (Shimla)', category: 'fruits', defaultQty: '4 pcs', emoji: '🍎' },
  { name: 'Oranges / Santra', category: 'fruits', defaultQty: '1 kg', emoji: '🍊' },
  { name: 'Pomegranate / Anar', category: 'fruits', defaultQty: '2 pcs', emoji: '🍎' },
  { name: 'Papaya / Papita', category: 'fruits', defaultQty: '1 pc', emoji: '🥭' },
  { name: 'Watermelon / Tarbooj', category: 'fruits', defaultQty: '1 pc', emoji: '🍉' },

  // Snacks & Bread
  { name: 'Britannia Brown Bread', category: 'snacks', defaultQty: '1 pack', emoji: '🍞' },
  { name: 'Britannia White Bread', category: 'snacks', defaultQty: '1 pack', emoji: '🍞' },
  { name: 'English Oven Multi-Grain Bread', category: 'snacks', defaultQty: '1 pack', emoji: '🍞' },
  { name: 'Maggi 2-Minute Noodles (Pack of 4)', category: 'snacks', defaultQty: '4 pack', emoji: '🍜' },
  { name: 'Lay\'s India\'s Magic Masala Chips', category: 'snacks', defaultQty: '1 big pack', emoji: '🥔' },
  { name: 'Kurkure Masala Munch', category: 'snacks', defaultQty: '1 pack', emoji: '🍿' },
  { name: 'Haldiram\'s Bhujia Sev', category: 'snacks', defaultQty: '400g', emoji: '🥨' },
  { name: 'Parle-G Gold Biscuits', category: 'snacks', defaultQty: '1 pack', emoji: '🍪' },
  { name: 'Oreo Original Vanilla Biscuits', category: 'snacks', defaultQty: '1 pack', emoji: '🍪' },
  { name: 'Britannia Good Day Butter Biscuits', category: 'snacks', defaultQty: '1 pack', emoji: '🍪' },
  { name: 'Pintola All Natural Peanut Butter', category: 'snacks', defaultQty: '350g', emoji: '🥜' },
  { name: 'Quaker Rolled Oats', category: 'snacks', defaultQty: '1 kg', emoji: '🥣' },

  // Beverages
  { name: 'Tata Tea Gold', category: 'beverages', defaultQty: '500g', emoji: '☕' },
  { name: 'Red Label Tea', category: 'beverages', defaultQty: '500g', emoji: '☕' },
  { name: 'Nescafé Classic Instant Coffee', category: 'beverages', defaultQty: '100g', emoji: '☕' },
  { name: 'Bru Instant Coffee', category: 'beverages', defaultQty: '100g', emoji: '☕' },
  { name: 'Coca-Cola Zero Sugar (750ml)', category: 'beverages', defaultQty: '750ml', emoji: '🥤' },
  { name: 'Thums Up (750ml)', category: 'beverages', defaultQty: '750ml', emoji: '🥤' },
  { name: 'Red Bull Energy Drink Can', category: 'beverages', defaultQty: '250ml', emoji: '⚡' },
  { name: 'Real Mixed Fruit Juice', category: 'beverages', defaultQty: '1L', emoji: '🧃' },
  { name: 'Fresh Tender Coconut Water', category: 'beverages', defaultQty: '1 pc', emoji: '🥥' },
  { name: 'Bisleri Drinking Water 5L / 20L', category: 'beverages', defaultQty: '5L', emoji: '💧' },

  // Essentials & Staples
  { name: 'Aashirvaad Shudh Chakki Atta', category: 'essentials', defaultQty: '5 kg', emoji: '🌾' },
  { name: 'Fortune Sunlite Sunflower Oil', category: 'essentials', defaultQty: '1L', emoji: '🛢️' },
  { name: 'Tata Salt Vaccum Evaporated', category: 'essentials', defaultQty: '1 kg', emoji: '🧂' },
  { name: 'Fortune Sona Masoori / Basmati Rice', category: 'essentials', defaultQty: '5 kg', emoji: '🍚' },
  { name: 'Tata Sampann Toor Dal', category: 'essentials', defaultQty: '1 kg', emoji: '🍲' },
  { name: 'Tata Sampann Moong Dal', category: 'essentials', defaultQty: '1 kg', emoji: '🍲' },
  { name: 'Kitchen Paper Towel / Tissues (Roll)', category: 'essentials', defaultQty: '2 rolls', emoji: '🧻' },
  { name: 'Toilet Paper Rolls (Pack of 4)', category: 'essentials', defaultQty: '4 rolls', emoji: '🧻' },
  { name: 'Vim Dishwash Gel Lemon', category: 'essentials', defaultQty: '500ml', emoji: '🧼' },
  { name: 'Surf Excel Matic Liquid Detergent', category: 'essentials', defaultQty: '1L', emoji: '🧺' },
  { name: 'Scotch-Brite Scrub Sponge', category: 'essentials', defaultQty: '3 pack', emoji: '🧽' },
  { name: 'Garbage Bags Medium 30 Pcs', category: 'essentials', defaultQty: '1 roll', emoji: '🗑️' },

  // Personal Care
  { name: 'Dettol Liquid Handwash Refill', category: 'personal_care', defaultQty: '675ml', emoji: '🧴' },
  { name: 'Colgate Total Toothpaste', category: 'personal_care', defaultQty: '150g', emoji: '🪥' },
  { name: 'Dove Cream Beauty Bar Soap', category: 'personal_care', defaultQty: '3 pack', emoji: '🧼' },
  { name: 'Head & Shoulders Cool Menthol Shampoo', category: 'personal_care', defaultQty: '340ml', emoji: '🧴' },
  { name: 'Nivea Men Deodorant', category: 'personal_care', defaultQty: '150ml', emoji: '✨' },
];

export const FREQUENT_STAPLES: GroceryCatalogItem[] = [
  { name: 'Amul Taaza Milk', category: 'dairy', defaultQty: '500ml', emoji: '🥛' },
  { name: 'Eggs (Pack of 6)', category: 'dairy', defaultQty: '6 pcs', emoji: '🥚' },
  { name: 'Brown Bread', category: 'snacks', defaultQty: '1 pack', emoji: '🍞' },
  { name: 'Curd / Dahi 400g', category: 'dairy', defaultQty: '400g', emoji: '🥣' },
  { name: 'Bananas (6 pcs)', category: 'fruits', defaultQty: '6 pcs', emoji: '🍌' },
  { name: 'Onions 1kg', category: 'veggies', defaultQty: '1 kg', emoji: '🧅' },
  { name: 'Drinking Water 5L', category: 'beverages', defaultQty: '5L', emoji: '💧' },
  { name: 'Garbage Bags', category: 'essentials', defaultQty: '1 roll', emoji: '🗑️' },
];
