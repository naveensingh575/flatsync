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

export interface ParsedQuantity {
  amount: number;
  unitType: 'weight' | 'volume' | 'count' | 'unknown';
  normalizedUnit: string;
  baseValue: number; // in grams for weight, ml for volume, count for count
  originalUnit: string;
}

/**
 * Parses any raw quantity string (e.g. "500g", "1.5 kg", "500 ml", "1 L", "2 packets", "3")
 */
export function parseQuantity(raw: string | null | undefined): ParsedQuantity | null {
  if (!raw || !raw.trim()) return null;
  const str = raw.trim().toLowerCase();

  const match = str.match(/^(\d+(?:\.\d+)?)\s*([a-z]*)$/i);
  if (!match) return null;

  const amount = parseFloat(match[1]);
  if (isNaN(amount) || amount <= 0) return null;
  const unit = match[2].trim();

  // Weight units -> baseValue in grams (g)
  if (/^(g|gm|gms|gram|grams)$/.test(unit)) {
    return { amount, unitType: 'weight', normalizedUnit: 'g', baseValue: amount, originalUnit: unit };
  }
  if (/^(kg|kgs|kilo|kilos|kilogram|kilograms)$/.test(unit)) {
    return { amount, unitType: 'weight', normalizedUnit: 'kg', baseValue: amount * 1000, originalUnit: unit };
  }
  if (/^(mg|mgs|milligram|milligrams)$/.test(unit)) {
    return { amount, unitType: 'weight', normalizedUnit: 'mg', baseValue: amount / 1000, originalUnit: unit };
  }

  // Volume units -> baseValue in milliliters (ml)
  if (/^(ml|mls|milliliter|milliliters|millilitre|millilitres)$/.test(unit)) {
    return { amount, unitType: 'volume', normalizedUnit: 'ml', baseValue: amount, originalUnit: unit };
  }
  if (/^(l|lt|ltr|ltrs|liter|liters|litre|litres)$/.test(unit)) {
    return { amount, unitType: 'volume', normalizedUnit: 'l', baseValue: amount * 1000, originalUnit: unit };
  }

  // Count / Container units
  if (/^(packet|packets|pkt|pkts|pack|packs)$/.test(unit)) {
    return { amount, unitType: 'count', normalizedUnit: 'pack', baseValue: amount, originalUnit: unit };
  }
  if (/^(piece|pieces|pc|pcs)$/.test(unit)) {
    return { amount, unitType: 'count', normalizedUnit: 'pc', baseValue: amount, originalUnit: unit };
  }
  if (/^(bottle|bottles|btl|btls)$/.test(unit)) {
    return { amount, unitType: 'count', normalizedUnit: 'bottle', baseValue: amount, originalUnit: unit };
  }
  if (/^(can|cans)$/.test(unit)) {
    return { amount, unitType: 'count', normalizedUnit: 'can', baseValue: amount, originalUnit: unit };
  }
  if (/^(box|boxes)$/.test(unit)) {
    return { amount, unitType: 'count', normalizedUnit: 'box', baseValue: amount, originalUnit: unit };
  }
  if (/^(bunch|bunches)$/.test(unit)) {
    return { amount, unitType: 'count', normalizedUnit: 'bunch', baseValue: amount, originalUnit: unit };
  }
  if (/^(dozen|dozens)$/.test(unit)) {
    return { amount, unitType: 'count', normalizedUnit: 'dozen', baseValue: amount * 12, originalUnit: unit };
  }

  // Bare number without unit (e.g. "2")
  if (unit === '') {
    return { amount, unitType: 'count', normalizedUnit: 'pc', baseValue: amount, originalUnit: '' };
  }

  // Unknown unit (e.g. "rolls", "slices")
  return { amount, unitType: 'unknown', normalizedUnit: unit, baseValue: amount, originalUnit: unit };
}

/**
 * Accurately merges two quantities handling units of weight (g, kg), volume (ml, L), and counts
 * Examples:
 *   "500ml" + "500ml" -> "1 L"
 *   "250ml" + "500ml" -> "750 ml"
 *   "1 L" + "500ml"   -> "1.5 L"
 *   "500g" + "500g"   -> "1 kg"
 *   "250g" + "500g"   -> "750 g"
 *   "1 kg" + "500g"   -> "1.5 kg"
 *   "2 packs" + "1"   -> "3 packs"
 */
export function mergeQuantities(
  qty1: string | null | undefined,
  qty2: string | null | undefined
): string {
  const p1 = parseQuantity(qty1);
  const p2 = parseQuantity(qty2);

  if (!p1 && !p2) return '2 pcs';
  if (p1 && !p2) return bumpItemQuantity(qty1);
  if (!p1 && p2) return qty2?.trim() || '1 pc';

  if (p1 && p2) {
    // 1. Both are Weight (g, kg, mg)
    if (p1.unitType === 'weight' && p2.unitType === 'weight') {
      const totalGrams = p1.baseValue + p2.baseValue;
      if (totalGrams >= 1000) {
        const kg = totalGrams / 1000;
        const formattedKg = Number.isInteger(kg) ? kg.toString() : parseFloat(kg.toFixed(2)).toString();
        return `${formattedKg} kg`;
      }
      return `${parseFloat(totalGrams.toFixed(1))} g`;
    }

    // 2. Both are Volume (ml, L)
    if (p1.unitType === 'volume' && p2.unitType === 'volume') {
      const totalMl = p1.baseValue + p2.baseValue;
      if (totalMl >= 1000) {
        const l = totalMl / 1000;
        const formattedL = Number.isInteger(l) ? l.toString() : parseFloat(l.toFixed(2)).toString();
        return `${formattedL} L`;
      }
      return `${parseFloat(totalMl.toFixed(1))} ml`;
    }

    // 3. Weight + Unit count (e.g. "500g" and "1", or "500g" and "2")
    if (p1.unitType === 'weight' && p2.unitType === 'count' && p2.originalUnit === '') {
      const totalGrams = p1.baseValue + (p2.amount * p1.baseValue);
      if (totalGrams >= 1000) {
        const kg = totalGrams / 1000;
        return `${Number.isInteger(kg) ? kg : parseFloat(kg.toFixed(2))} kg`;
      }
      return `${parseFloat(totalGrams.toFixed(1))} g`;
    }
    if (p1.unitType === 'count' && p1.originalUnit === '' && p2.unitType === 'weight') {
      const totalGrams = p2.baseValue + (p1.amount * p2.baseValue);
      if (totalGrams >= 1000) {
        const kg = totalGrams / 1000;
        return `${Number.isInteger(kg) ? kg : parseFloat(kg.toFixed(2))} kg`;
      }
      return `${parseFloat(totalGrams.toFixed(1))} g`;
    }

    // 4. Volume + Unit count (e.g. "500ml" and "1")
    if (p1.unitType === 'volume' && p2.unitType === 'count' && p2.originalUnit === '') {
      const totalMl = p1.baseValue + (p2.amount * p1.baseValue);
      if (totalMl >= 1000) {
        const l = totalMl / 1000;
        return `${Number.isInteger(l) ? l : parseFloat(l.toFixed(2))} L`;
      }
      return `${parseFloat(totalMl.toFixed(1))} ml`;
    }
    if (p1.unitType === 'count' && p1.originalUnit === '' && p2.unitType === 'volume') {
      const totalMl = p2.baseValue + (p1.amount * p2.baseValue);
      if (totalMl >= 1000) {
        const l = totalMl / 1000;
        return `${Number.isInteger(l) ? l : parseFloat(l.toFixed(2))} L`;
      }
      return `${parseFloat(totalMl.toFixed(1))} ml`;
    }

    // 5. Both are Count (packets, pcs, boxes, etc.)
    if (p1.unitType === 'count' && p2.unitType === 'count') {
      const total = p1.amount + p2.amount;
      const unit = p1.originalUnit || p2.originalUnit || 'pcs';
      if (/^pack(et)?s?$/i.test(unit)) {
        return `${total} ${total === 1 ? 'pack' : 'packs'}`;
      }
      if (/^p(ie)?ce?s?$/i.test(unit)) {
        return `${total} pcs`;
      }
      if (/^bottle?s?$/i.test(unit)) {
        return `${total} ${total === 1 ? 'bottle' : 'bottles'}`;
      }
      if (/^box(es)?$/i.test(unit)) {
        return `${total} ${total === 1 ? 'box' : 'boxes'}`;
      }
      if (/^dozen(s)?$/i.test(unit)) {
        return `${total} ${total === 1 ? 'dozen' : 'dozens'}`;
      }
      return `${total} ${unit}`;
    }

    // 6. Matching unknown units
    if (p1.originalUnit === p2.originalUnit) {
      const total = p1.amount + p2.amount;
      return `${total} ${p1.originalUnit}`.trim();
    }
  }

  const str1 = qty1?.trim() || '';
  const str2 = qty2?.trim() || '';
  return `${str1} + ${str2}`.trim();
}

/**
 * Intelligently increments a single quantity (e.g. 500ml -> 1 L, 500g -> 1 kg, 1 kg -> 2 kg, 2 packs -> 3 packs)
 */
export function bumpItemQuantity(currentQty: string | null | undefined): string {
  if (!currentQty || !currentQty.trim()) {
    return '2 pcs';
  }

  const p = parseQuantity(currentQty);
  if (!p) {
    const trimmed = currentQty.trim();
    const numberMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (numberMatch) {
      const num = parseFloat(numberMatch[1]) + 1;
      const u = numberMatch[2];
      return u ? `${num} ${u}` : `${num} pcs`;
    }
    return `${trimmed} (+1)`;
  }

  // Weight (e.g. 500g -> 1 kg, 1 kg -> 2 kg, 250g -> 500 g)
  if (p.unitType === 'weight') {
    const totalGrams = p.baseValue * 2;
    if (totalGrams >= 1000) {
      const kg = totalGrams / 1000;
      return `${Number.isInteger(kg) ? kg : parseFloat(kg.toFixed(2))} kg`;
    }
    return `${parseFloat(totalGrams.toFixed(1))} g`;
  }

  // Volume (e.g. 500ml -> 1 L, 1 L -> 2 L, 250ml -> 500 ml)
  if (p.unitType === 'volume') {
    const totalMl = p.baseValue * 2;
    if (totalMl >= 1000) {
      const l = totalMl / 1000;
      return `${Number.isInteger(l) ? l : parseFloat(l.toFixed(2))} L`;
    }
    return `${parseFloat(totalMl.toFixed(1))} ml`;
  }

  // Count (e.g. 1 pack -> 2 packs, 2 pcs -> 3 pcs)
  if (p.unitType === 'count') {
    const newAmount = p.amount + 1;
    const unit = p.originalUnit || 'pcs';
    if (/^pack(et)?s?$/i.test(unit)) {
      return `${newAmount} ${newAmount === 1 ? 'pack' : 'packs'}`;
    }
    if (/^p(ie)?ce?s?$/i.test(unit)) {
      return `${newAmount} pcs`;
    }
    return `${newAmount} ${unit}`;
  }

  const newNum = p.amount + 1;
  return `${newNum} ${p.originalUnit}`.trim();
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
