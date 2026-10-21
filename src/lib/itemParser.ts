import { AddItemPayload, ItemCategory } from '@/types/app.types';

const CATEGORY_KEYWORDS: Record<ItemCategory, string[]> = {
  dairy: [
    'milk', 'taaza', 'gold', 'curd', 'dahi', 'paneer', 'butter', 'cheese',
    'ghee', 'yogurt', 'egg', 'eggs', 'amul', 'nandini', 'cream', 'malai'
  ],
  veggies: [
    'onion', 'pyaz', 'tomato', 'tamatar', 'potato', 'aloo', 'chilli', 'mirch',
    'ginger', 'adrak', 'garlic', 'lehsun', 'coriander', 'dhaniya', 'lemon', 'nimbu',
    'bhindi', 'gajar', 'carrot', 'cucumber', 'kheera', 'capsicum', 'palak', 'spinach',
    'veggie', 'vegetable', 'beans', 'cabbage', 'cauliflower', 'gobi'
  ],
  fruits: [
    'banana', 'kela', 'apple', 'seb', 'orange', 'santra', 'mango', 'aam',
    'papaya', 'papita', 'watermelon', 'tarbooj', 'grapes', 'fruit', 'fruits',
    'pomegranate', 'anar', 'guava', 'melon'
  ],
  snacks: [
    'bread', 'maggi', 'noodles', 'chips', 'lays', 'kurkure', 'biscuit', 'biscuits',
    'cookie', 'cookies', 'oreo', 'bhujia', 'sev', 'mixture', 'snack', 'snacks',
    'chocolate', 'peanut butter', 'oats', 'namkeen', 'popcorn', 'toast', 'rusk'
  ],
  beverages: [
    'tea', 'chai', 'coffee', 'coke', 'coca-cola', 'thums up', 'pepsi', 'sprite',
    'red bull', 'energy drink', 'juice', 'coconut', 'water', 'drink', 'beverage',
    'soda', 'tonic', 'beer', 'cold drink'
  ],
  essentials: [
    'atta', 'flour', 'rice', 'chawal', 'dal', 'oil', 'tel', 'salt', 'namak',
    'sugar', 'chini', 'tissue', 'tissues', 'roll', 'toilet paper', 'detergent',
    'surf', 'vim', 'dishwash', 'scrub', 'sponge', 'foil', 'garbage bag', 'trash bag',
    'mop', 'broom', 'cleaner', 'harpic', 'colin'
  ],
  personal_care: [
    'shampoo', 'conditioner', 'toothpaste', 'brush', 'colgate', 'soap', 'body wash',
    'facewash', 'face wash', 'deodorant', 'deo', 'perfume', 'lotion', 'cream',
    'sanitizer', 'dettol', 'shaving', 'razor', 'pads'
  ],
  other: [],
};

/**
 * Parses natural language input (from voice transcription or typed text)
 * Example input: "2 packets Amul Gold milk urgent for Rahul"
 * Output:
 *   item_name: "Amul Gold milk"
 *   quantity: "2 packets"
 *   category: "dairy"
 *   is_urgent: true
 *   for_user: "Rahul"
 */
export function parseGroceryInput(text: string): Partial<AddItemPayload> {
  if (!text || !text.trim()) {
    return {};
  }

  let cleanText = text.trim();
  let is_urgent = false;
  let for_user: string | null = null;
  let quantity: string | null = null;
  let category: ItemCategory = 'other';

  // 1. Check for urgency keywords
  const urgentRegex = /\b(urgent|emergency|asap|jaldi|fast|priority|needed today)\b/gi;
  if (urgentRegex.test(cleanText)) {
    is_urgent = true;
    cleanText = cleanText.replace(urgentRegex, ' ');
  }

  // 2. Check for recipient ("for [Name]")
  const forRegex = /\bfor\s+([A-Za-z0-9_]{2,15})\b/i;
  const forMatch = cleanText.match(forRegex);
  if (forMatch && forMatch[1]) {
    const rawName = forMatch[1];
    // Capitalize recipient
    for_user = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    cleanText = cleanText.replace(forMatch[0], ' ');
  }

  // 3. Check for quantities (e.g. "2 packets", "500g", "1 kg", "3 pcs", "6 eggs", "2 packs")
  const qtyRegex = /\b(\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|ml|l|ltr|litres?|liters?|packets?|packs?|pcs|pieces?|bottles?|cans?|boxes?|crates?|rolls?|bunches?|cups?|slices?))\b/i;
  const qtyMatch = cleanText.match(qtyRegex);
  if (qtyMatch && qtyMatch[1]) {
    quantity = qtyMatch[1].trim();
    cleanText = cleanText.replace(qtyMatch[0], ' ');
  } else {
    // Check leading count, e.g. "2 Amul Milk"
    const leadingCountMatch = cleanText.match(/^(\d+)\s+([A-Za-z])/);
    if (leadingCountMatch) {
      quantity = `${leadingCountMatch[1]} pcs`;
      cleanText = cleanText.replace(new RegExp(`^${leadingCountMatch[1]}\\s+`), '');
    }
  }

  // 4. Normalize remaining item name
  let itemName = cleanText
    .replace(/[,\.\-\/\\_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If item name starts with "and", remove it
  itemName = itemName.replace(/^and\s+/i, '').trim();

  // 5. Detect category based on keywords
  const lowerName = itemName.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'other') continue;
    const match = keywords.some((kw) => {
      // match whole word or substring for distinctive brand names
      const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
      return kwRegex.test(lowerName) || lowerName.includes(kw);
    });
    if (match) {
      category = cat as ItemCategory;
      break;
    }
  }

  // Capitalize first letter of item name
  if (itemName.length > 0) {
    itemName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
  }

  return {
    item_name: itemName,
    quantity,
    category,
    is_urgent,
    for_user,
  };
}
