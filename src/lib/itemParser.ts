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
const EXPLICIT_CATEGORY_MAP: Record<ItemCategory, string[]> = {
  dairy: ['dairy', 'milk', 'doodh'],
  veggies: ['veggies', 'vegetables?', 'sabzi', 'veggie'],
  fruits: ['fruits?', 'phal'],
  snacks: ['snacks?', 'munchies'],
  beverages: ['beverages?', 'drinks?', 'cold drinks?'],
  essentials: ['essentials?', 'household', 'staples?'],
  personal_care: ['personal[ _-]?care', 'hygiene', 'toiletries'],
  other: [],
};

const STORE_MAP = [
  { name: 'Blinkit', pattern: /blinkit/i, tag: '[Blinkit]' },
  { name: 'Zepto', pattern: /zepto/i, tag: '[Zepto]' },
  { name: 'Instamart', pattern: /instamart/i, tag: '[Instamart]' },
  { name: 'Apollo', pattern: /(apollo|pharmacy|chemist|medplus)/i, tag: '[Apollo]' },
  { name: 'Local Mandi', pattern: /(local\s+mandi|mandi|sabzi\s+mandi|vendor|thela)/i, tag: '[Local Mandi]' },
  { name: 'Licious', pattern: /(licious|meat\s+shop|butcher)/i, tag: '[Licious]' },
];

/**
 * Parses natural language input (from voice transcription or typed text)
 * Supports both conversational phrasing ("2 packets Amul Gold milk urgent for Rahul from Blinkit")
 * and structured voice commands ("Item name Amul milk Category dairy Quantity 2 packets Note chilled Store Blinkit For person Rahul urgent").
 * Structural command words are never included in the parsed item_name.
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
  let note: string | null = null;
  let storeTag: string | null = null;

  // 1. Explicit Category parsing: e.g. "Category dairy", "Category is veggies", "Category: fruits"
  const catRegex = /\bcategory\s*(?:is|as|:)?\s*([a-zA-Z_]+(?:\s+[a-zA-Z_]+)?)/i;
  const catMatch = cleanText.match(catRegex);
  if (catMatch) {
    const rawCat = catMatch[1].trim().toLowerCase();
    cleanText = cleanText.replace(catMatch[0], ' ');
    let matchedCat: ItemCategory = 'other';
    for (const [key, patterns] of Object.entries(EXPLICIT_CATEGORY_MAP)) {
      if (patterns.some((p) => new RegExp(`^${p}$`, 'i').test(rawCat))) {
        matchedCat = key as ItemCategory;
        break;
      }
    }
    category = matchedCat;
  }

  // 2. Explicit Store / Merchant parsing: e.g. "Store Blinkit", "Merchant Zepto", "Store is Instamart"
  const storeRegex = /\b(?:store|merchant)\s*(?:is|as|from|:)?\s*([a-zA-Z0-9\s]+?)(?=\s+(?:item|category|quantity|notes?|for|person|urgent)|$)/i;
  const explicitStoreMatch = cleanText.match(storeRegex);
  if (explicitStoreMatch) {
    const rawStore = explicitStoreMatch[1].trim();
    cleanText = cleanText.replace(explicitStoreMatch[0], ' ');
    for (const s of STORE_MAP) {
      if (s.pattern.test(rawStore)) {
        storeTag = s.tag;
        break;
      }
    }
    // If store not recognized among listed apps, defaults to any/no specific store per user instructions
  } else {
    // Check implicit store mention e.g. "from blinkit"
    for (const s of STORE_MAP) {
      const impRegex = new RegExp(`\\b(from\\s+)?${s.pattern.source}\\b`, 'i');
      if (impRegex.test(cleanText)) {
        storeTag = s.tag;
        cleanText = cleanText.replace(impRegex, ' ');
        break;
      }
    }
  }

  // 3. Explicit Note / Notes parsing: e.g. "Note chilled", "Notes: please get organic"
  const noteRegex = /\b(?:notes?)\s*(?:is|as|that|:|-)?\s*([a-zA-Z0-9\s,\.\-]+?)(?=\s+(?:item\s+name|item|category|quantity|store|merchant|for|person|urgent|\d+\s+[A-Za-z])|$)/i;
  const noteMatch = cleanText.match(noteRegex);
  if (noteMatch) {
    note = noteMatch[1].trim();
    cleanText = cleanText.replace(noteMatch[0], ' ');
  }

  // 4. Quantity parsing: explicit "Quantity 2 packets" or natural unit "2 packets", "500g", "1 kg"
  const explicitQtyRegex = /\bquantity\s*(?:is|as|of|:)?\s*([0-9a-zA-Z\.\s]+?)(?=\s+(?:item|category|notes?|store|merchant|for|person|urgent)|$)/i;
  const explicitQtyMatch = cleanText.match(explicitQtyRegex);
  if (explicitQtyMatch) {
    quantity = explicitQtyMatch[1].trim();
    cleanText = cleanText.replace(explicitQtyMatch[0], ' ');
  } else {
    // Natural measurement units
    const qtyRegex = /\b(\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|ml|l|ltr|litres?|liters?|packets?|packs?|pcs|pieces?|bottles?|cans?|boxes?|crates?|rolls?|bunches?|cups?|slices?|dozens?|pouches?|tins?|bags?|bars?|tubs?))\b/i;
    const qtyMatch = cleanText.match(qtyRegex);
    if (qtyMatch && qtyMatch[1]) {
      quantity = qtyMatch[1].trim();
      cleanText = cleanText.replace(qtyMatch[0], ' ');
    } else {
      // Natural leading count (e.g. "6 eggs", "3 bananas", "2 Amul milk")
      const trimmedClean = cleanText.trim();
      const leadingCountMatch = trimmedClean.match(/^(\d+)\s+([A-Za-z])/);
      if (leadingCountMatch) {
        quantity = `${leadingCountMatch[1]} pcs`;
        cleanText = cleanText.replace(new RegExp(`\\b${leadingCountMatch[1]}\\b`), ' ');
      }
    }
  }

  // 5. Urgency keywords
  const urgentRegex = /\b(urgent|emergency|asap|jaldi|fast|priority|needed today)\b/gi;
  if (urgentRegex.test(cleanText)) {
    is_urgent = true;
    cleanText = cleanText.replace(urgentRegex, ' ');
  }

  // 6. Recipient ("for [Name]", "for person [Name]", "person [Name]")
  const NON_PERSON_WORDS = new Set([
    'me', 'us', 'today', 'tomorrow', 'morning', 'evening', 'breakfast', 'lunch',
    'dinner', 'home', 'office', 'room', 'flat', 'now', 'later', 'cooking', 'making',
    'all', 'everyone', 'tea', 'coffee'
  ]);
  const forRegex = /\b(?:for\s+person|for|person)\s*[:]?\s*([A-Za-z0-9_]{2,15})\b/i;
  const forMatch = cleanText.match(forRegex);
  if (forMatch && forMatch[1]) {
    const rawName = forMatch[1].trim();
    if (!NON_PERSON_WORDS.has(rawName.toLowerCase())) {
      for_user = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    }
    cleanText = cleanText.replace(forMatch[0], ' ');
  }

  // 7. Strip structural keyword labels so they never leak into item_name
  const structuralRegex = /\b(item\s+name|item|category|quantity|for\s+person|person|notes?|store|merchant|urgent)\b/gi;
  cleanText = cleanText.replace(structuralRegex, ' ');

  // Normalize remaining item name
  let itemName = cleanText
    .replace(/[:\-,\.\/\\_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If item name starts with "and", remove it
  itemName = itemName.replace(/^and\s+/i, '').trim();

  // 8. If category was not explicitly specified, auto-detect from keyword catalog
  if (category === 'other' && itemName) {
    const lowerName = itemName.toLowerCase();
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (cat === 'other') continue;
      const match = keywords.some((kw) => {
        const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
        return kwRegex.test(lowerName) || lowerName.includes(kw);
      });
      if (match) {
        category = cat as ItemCategory;
        break;
      }
    }
  }

  // Compose final note with store tag if present
  let finalNote: string | null = null;
  if (storeTag && note) {
    finalNote = `${storeTag} ${note}`;
  } else if (storeTag) {
    finalNote = storeTag;
  } else if (note) {
    finalNote = note;
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
    note: finalNote,
  };
}

/**
 * Parses multi-line or comma-separated lists copied from WhatsApp, Notes, or Slack
 */
export function parseBulkGroceryInput(rawText: string): AddItemPayload[] {
  if (!rawText || !rawText.trim()) return [];

  // Split lines
  let lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // If pasted as a single comma-separated line (e.g. "milk, eggs, brown bread")
  if (lines.length === 1 && lines[0].includes(',')) {
    lines = lines[0].split(',').map((l) => l.trim()).filter(Boolean);
  }

  // Filter out non-item introductory lines (e.g., "Grocery list:", "Items to buy:")
  const ignoredHeaderRegex = /^(grocery|shopping|items?|list|order|today|hey|plz|please|to buy|flat|room|blinkit|zepto|instamart)\b/i;

  const results: AddItemPayload[] = [];

  for (let line of lines) {
    // Strip leading bullets: "-", "*", "•", "–"
    line = line.replace(/^[\-\*•–\+]\s*/, '').trim();

    // Strip checkboxes: "[ ]", "[x]", "[X]"
    line = line.replace(/^\[[\sXx]?\]\s*/, '').trim();

    // Strip numbers with dot or paren: "1.", "1)", "1 -"
    line = line.replace(/^\d+[\.\)\-]\s*/, '').trim();

    if (!line || line.length < 2) continue;

    // Check if it's an introductory line
    if (line.endsWith(':') || ignoredHeaderRegex.test(line)) {
      if (line.endsWith(':') || line.split(' ').length <= 4) {
        continue;
      }
    }

    const parsed = parseGroceryInput(line);
    if (parsed.item_name && parsed.item_name.length > 0) {
      results.push({
        item_name: parsed.item_name,
        category: parsed.category || 'other',
        is_urgent: parsed.is_urgent || false,
        quantity: parsed.quantity || null,
        note: parsed.note || null,
        for_user: parsed.for_user || null,
      });
    }
  }

  return results;
}

