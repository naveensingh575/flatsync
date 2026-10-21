import { GroceryItem } from '@/types/app.types';

// Stop words to ignore during similarity matching
const STOP_WORDS = new Set([
  'amul', 'nandini', 'mother', 'dairy', 'fresh', 'farm', 'packet', 'packets',
  'pack', 'packs', 'kg', 'g', 'gm', 'gms', 'ml', 'l', 'ltr', 'pcs', 'pieces',
  'box', 'bottle', 'toned', 'full', 'cream', 'white', 'brown', 'urgent',
  'and', 'for', 'the', 'with', 'shudh', 'chakki', 'original'
]);

/**
 * Tokenizes an item name into meaningful root keywords
 */
export function extractKeywords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Checks if two item names are likely referring to the same grocery item
 */
export function areItemsSimilar(name1: string, name2: string): boolean {
  const norm1 = name1.toLowerCase().trim();
  const norm2 = name2.toLowerCase().trim();

  // Exact match
  if (norm1 === norm2) return true;

  // Substring containment
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const tokens1 = extractKeywords(norm1);
  const tokens2 = extractKeywords(norm2);

  if (tokens1.length === 0 || tokens2.length === 0) {
    // If all words were stop words, compare normalized strings
    return norm1.slice(0, 4) === norm2.slice(0, 4);
  }

  // Check for shared meaningful root keywords (e.g. "milk", "eggs", "butter", "bread")
  const overlap = tokens1.filter((t) => tokens2.includes(t));
  return overlap.length > 0;
}

/**
 * Finds an existing pending/active item in the list that is similar to the given new item name
 */
export function findSimilarItem(
  newItemName: string,
  existingItems: GroceryItem[]
): GroceryItem | null {
  if (!newItemName || !newItemName.trim()) return null;

  const activeItems = existingItems.filter(
    (i) => i.status === 'pending' || i.status === 'in_cart'
  );

  for (const item of activeItems) {
    if (areItemsSimilar(newItemName, item.item_name)) {
      return item;
    }
  }

  return null;
}

/**
 * Intelligently increments a quantity string
 * e.g. "1 kg" -> "2 kg", "2 packets" -> "3 packets", "500ml" -> "500ml (+1)", null -> "2 pcs"
 */
export function bumpItemQuantity(currentQty: string | null | undefined): string {
  if (!currentQty || !currentQty.trim()) {
    return '2 pcs';
  }

  const trimmed = currentQty.trim();
  const numberMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);

  if (numberMatch) {
    const currentNum = parseFloat(numberMatch[1]);
    const unit = numberMatch[2];
    const newNum = currentNum + 1;
    return unit ? `${newNum} ${unit}` : `${newNum} pcs`;
  }

  // If complex like "1 pack + 500ml"
  return `${trimmed} (+1)`;
}

/**
 * Detects any duplicate pairs in the current pending list
 */
export function findDuplicatePairs(items: GroceryItem[]): { item1: GroceryItem; item2: GroceryItem }[] {
  const activeItems = items.filter((i) => i.status === 'pending');
  const pairs: { item1: GroceryItem; item2: GroceryItem }[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < activeItems.length; i++) {
    for (let j = i + 1; j < activeItems.length; j++) {
      const a = activeItems[i];
      const b = activeItems[j];
      if (visited.has(a.id) || visited.has(b.id)) continue;

      if (areItemsSimilar(a.item_name, b.item_name)) {
        pairs.push({ item1: a, item2: b });
        visited.add(a.id);
        visited.add(b.id);
      }
    }
  }

  return pairs;
}
