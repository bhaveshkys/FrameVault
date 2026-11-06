export type FigmaSyncStatus = 'pending' | 'synced' | 'failed';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color: string | null;
  created_at: string;
  reference_count?: number;
}

export interface FigmaSyncRecord {
  id: string;
  reference_id: string;
  category_id: string;
  category_name?: string;
  figma_file_key: string | null;
  figma_node_id: string | null;
  status: FigmaSyncStatus;
  last_error: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reference {
  id: string;
  user_id: string;
  title: string;
  source_url: string | null;
  image_path: string;
  notes: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  categories: Category[];
  figma_sync?: FigmaSyncRecord[];
}

export interface ApiToken {
  id: string;
  user_id: string;
  name: string;
  token: string;
  last_used_at: string | null;
  created_at: string;
}

export interface FigmaPendingItem {
  reference_id: string;
  category_id: string;
  category_name: string;
  category_color: string | null;
  title: string;
  source_url: string | null;
  image_url: string;
  image_base64?: string | null;
  notes: string | null;
  existing_node_id: string | null;
  created_at: string;
}

export interface FigmaSyncRequest {
  reference_id: string;
  category_id: string;
  figma_file_key?: string | null;
  figma_node_id: string;
  status: FigmaSyncStatus;
  last_error?: string | null;
}
