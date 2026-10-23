export type ItemCategory =
  | 'dairy'
  | 'veggies'
  | 'fruits'
  | 'snacks'
  | 'beverages'
  | 'essentials'
  | 'personal_care'
  | 'other';

export type ItemStatus = 'pending' | 'in_cart' | 'purchased';
export type Platform = 'blinkit' | 'zepto' | 'instamart' | 'other';
export type GroupType = 'flat' | 'family' | 'friends' | 'colleagues' | 'trip' | 'other';

export interface Group {
  id: string;
  name: string;
  join_code: string;
  group_type?: GroupType;
  icon?: string;
  created_by?: string | null;
  created_at: string;
}

// Flat alias for semantic compatibility
export type Flat = Group;

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: Profile;
}

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  group_id: string | null;
  flat_id?: string | null;
  joined_at: string;
  email?: string | null;
  role?: 'admin' | 'member';
}

export interface GroceryItem {
  id: string;
  group_id: string;
  flat_id?: string;
  requested_by_id: string;
  requested_by?: Profile;
  last_edited_by_id?: string | null;
  last_edited_by?: Profile;
  for_user?: string | null;
  item_name: string;
  category: ItemCategory;
  is_urgent: boolean;
  quantity: string | null;
  note: string | null;
  status: ItemStatus;
  ordered_by_id: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderingSession {
  id: string;
  group_id: string;
  flat_id?: string;
  buyer_id: string;
  buyer?: Profile;
  platform: Platform;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface Order {
  id: string;
  group_id: string;
  flat_id?: string;
  buyer_id: string;
  buyer?: Profile;
  session_id: string | null;
  platform: Platform;
  total_amount: number | null;
  screenshot_url: string | null;
  items?: GroceryItem[];
  created_at: string;
}

export interface Settlement {
  id: string;
  order_id: string;
  group_id: string;
  flat_id?: string;
  ower_id: string;
  ower?: Profile;
  owed_to_id: string;
  owed_to?: Profile;
  amount: number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
}

export type AddItemPayload = Pick<
  GroceryItem,
  'item_name' | 'category' | 'is_urgent' | 'quantity' | 'note' | 'for_user'
> & {
  last_edited_by_id?: string | null;
};
