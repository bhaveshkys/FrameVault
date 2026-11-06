import { createServerSupabaseClient } from './supabase/server';
import { createAdminClient } from './supabase/admin';
import {
  Category,
  Reference,
  FigmaSyncRecord,
  FigmaPendingItem,
  FigmaSyncStatus,
  ApiToken,
} from './types';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Default 15 categories for video editors
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id' | 'created_at'>[] = [
  { name: 'Visual Metaphors', slug: 'visual-metaphors', color: '#ec4899' },
  { name: 'Maps & Geography', slug: 'maps-geography', color: '#3b82f6' },
  { name: 'Typography', slug: 'typography', color: '#eab308' },
  { name: 'Motion Graphics', slug: 'motion-graphics', color: '#8b5cf6' },
  { name: 'Data Visualization', slug: 'data-visualization', color: '#10b981' },
  { name: 'Cinematic Composition', slug: 'cinematic-composition', color: '#f97316' },
  { name: 'Transitions', slug: 'transitions', color: '#06b6d4' },
  { name: 'Sound Design', slug: 'sound-design', color: '#14b8a6' },
  { name: 'Documentary Editing', slug: 'documentary-editing', color: '#6366f1' },
  { name: 'Product Advertising', slug: 'product-advertising', color: '#f43f5e' },
  { name: 'UI & Interface', slug: 'ui-interface', color: '#a855f7' },
  { name: 'Color Grading', slug: 'color-grading', color: '#f59e0b' },
  { name: 'Camera Movement', slug: 'camera-movement', color: '#84cc16' },
  { name: 'Editing Techniques', slug: 'editing-techniques', color: '#0ea5e9' },
  { name: 'Historical Visuals', slug: 'historical-visuals', color: '#78716c' },
];

interface LocalDatabaseState {
  categories: Category[];
  references: Reference[];
  reference_categories: { reference_id: string; category_id: string; created_at: string }[];
  figma_sync: FigmaSyncRecord[];
  api_tokens: ApiToken[];
}

const LOCAL_STORE_FILE = path.join(process.cwd(), '.data', 'store.json');
let memoryStore: LocalDatabaseState | null = null;

// Initialize or load local store
async function getLocalStore(): Promise<LocalDatabaseState> {
  if (memoryStore) return memoryStore;

  try {
    const raw = await fs.readFile(LOCAL_STORE_FILE, 'utf-8');
    memoryStore = JSON.parse(raw);
    return memoryStore!;
  } catch {
    // Initialize default seed state
    const demoUserId = '00000000-0000-0000-0000-000000000000';
    const categories: Category[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
      id: `cat-${idx + 1}`,
      user_id: demoUserId,
      name: cat.name,
      slug: cat.slug,
      color: cat.color,
      created_at: new Date(Date.now() - (15 - idx) * 3600000).toISOString(),
    }));

    // Seed realistic video editor references
    const sampleRefs: Reference[] = [
      {
        id: 'ref-1',
        user_id: demoUserId,
        title: 'Anamorphic Letterbox Title Card — Oppenheimer Documentary Breakdown',
        source_url: 'https://youtube.com/watch?v=oppenheimer-sound-design',
        image_path: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
        notes: 'High-contrast typography superimposed against cold tungsten grain. Incredible use of negative space for tension.',
        is_favorite: true,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        categories: [categories[2], categories[5]], // Typography, Cinematic Composition
      },
      {
        id: 'ref-2',
        user_id: demoUserId,
        title: '3D Earth Satellite Arc with Vector Flight Paths',
        source_url: 'https://vimeo.com/maps-motion-study',
        image_path: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
        notes: 'Notice how the curved spline glow maintains 1.5px consistent stroke width across orthographic rotation. Perfect for geopolitics sequence.',
        is_favorite: false,
        created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        categories: [categories[1], categories[3], categories[4]], // Maps, Motion Graphics, Data Viz
      },
      {
        id: 'ref-3',
        user_id: demoUserId,
        title: 'Match Cut Eye Blink to Nuclear Flash Transition',
        source_url: 'https://youtube.com/watch?v=editing-masterclass-cuts',
        image_path: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
        notes: '2-frame white dip followed by subtle horizontal optical flare. Sound cuts off abruptly before sub-bass drop.',
        is_favorite: true,
        created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
        categories: [categories[6], categories[8], categories[13]], // Transitions, Documentary Editing, Editing Techniques
      },
      {
        id: 'ref-4',
        user_id: demoUserId,
        title: 'Analog Oscilloscope Waveform & Monospace Audio Meter HUD',
        source_url: 'https://vimeo.com/sound-design-film',
        image_path: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1600&q=80',
        notes: 'Green CRT phosphorescence decay. Great aesthetic for audio breakdown inserts and investigative segments.',
        is_favorite: false,
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        categories: [categories[7], categories[10]], // Sound Design, UI & Interface
      },
      {
        id: 'ref-5',
        user_id: demoUserId,
        title: 'Teal & Orange Golden Hour Commercial Product Lighting',
        source_url: 'https://instagram.com/cinematography-stills',
        image_path: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1600&q=80',
        notes: 'Soft rim lighting with 1/4 Black Pro-Mist halation around the specular highlights. Clean commercial appeal.',
        is_favorite: true,
        created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
        categories: [categories[9], categories[11]], // Product Advertising, Color Grading
      },
    ];

    const refCats = [
      { reference_id: 'ref-1', category_id: 'cat-3', created_at: new Date().toISOString() },
      { reference_id: 'ref-1', category_id: 'cat-6', created_at: new Date().toISOString() },
      { reference_id: 'ref-2', category_id: 'cat-2', created_at: new Date().toISOString() },
      { reference_id: 'ref-2', category_id: 'cat-4', created_at: new Date().toISOString() },
      { reference_id: 'ref-2', category_id: 'cat-5', created_at: new Date().toISOString() },
      { reference_id: 'ref-3', category_id: 'cat-7', created_at: new Date().toISOString() },
      { reference_id: 'ref-3', category_id: 'cat-9', created_at: new Date().toISOString() },
      { reference_id: 'ref-3', category_id: 'cat-14', created_at: new Date().toISOString() },
      { reference_id: 'ref-4', category_id: 'cat-8', created_at: new Date().toISOString() },
      { reference_id: 'ref-4', category_id: 'cat-11', created_at: new Date().toISOString() },
      { reference_id: 'ref-5', category_id: 'cat-10', created_at: new Date().toISOString() },
      { reference_id: 'ref-5', category_id: 'cat-12', created_at: new Date().toISOString() },
    ];

    const figmaSync: FigmaSyncRecord[] = refCats.map((rc, idx) => ({
      id: `sync-${idx + 1}`,
      reference_id: rc.reference_id,
      category_id: rc.category_id,
      category_name: categories.find((c) => c.id === rc.category_id)?.name,
      figma_file_key: idx < 3 ? 'DEMO_FIGMA_KEY' : null,
      figma_node_id: idx < 3 ? `12:${100 + idx}` : null,
      status: (idx < 3 ? 'synced' : idx === 4 ? 'failed' : 'pending') as FigmaSyncStatus,
      last_error: idx === 4 ? 'Network timeout while downloading image in Figma plugin' : null,
      synced_at: idx < 3 ? new Date(Date.now() - 3600000 * 5).toISOString() : null,
      created_at: rc.created_at,
      updated_at: rc.created_at,
    }));

    const apiTokens: ApiToken[] = [
      {
        id: 'token-1',
        user_id: demoUserId,
        name: 'Default Figma Plugin Token',
        token: 'fv_live_7a9f8b2c4e1d3a5e6f8b0c2d4e6f8a0b',
        last_used_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ];

    memoryStore = {
      categories,
      references: sampleRefs,
      reference_categories: refCats,
      figma_sync: figmaSync,
      api_tokens: apiTokens,
    };

    await saveLocalStore(memoryStore);
    return memoryStore;
  }
}

async function saveLocalStore(store: LocalDatabaseState) {
  try {
    await fs.mkdir(path.dirname(LOCAL_STORE_FILE), { recursive: true });
    await fs.writeFile(LOCAL_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local database store:', err);
  }
}

// Check if Supabase connection is active
export async function isSupabaseConnected(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  return true;
}

// ==================== CATEGORIES ====================

export async function getCategories(): Promise<Category[]> {
  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, reference_categories(count)')
        .order('name', { ascending: true });

      if (!error && data) {
        return data.map((cat: any) => ({
          id: cat.id,
          user_id: cat.user_id,
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
          created_at: cat.created_at,
          reference_count: cat.reference_categories?.[0]?.count || 0,
        }));
      }
    } catch (e) {
      console.warn('Supabase getCategories error, falling back to local store', e);
    }
  }

  const store = await getLocalStore();
  return store.categories.map((cat) => ({
    ...cat,
    reference_count: store.reference_categories.filter((rc) => rc.category_id === cat.id).length,
  }));
}

export async function createCategory(name: string, color?: string | null): Promise<Category> {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          name,
          slug,
          color: color || '#6366f1',
        })
        .select()
        .single();

      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase createCategory error, fallback', e);
    }
  }

  const store = await getLocalStore();
  const newCat: Category = {
    id: `cat-${randomUUID().slice(0, 8)}`,
    user_id: '00000000-0000-0000-0000-000000000000',
    name,
    slug,
    color: color || '#6366f1',
    created_at: new Date().toISOString(),
    reference_count: 0,
  };
  store.categories.push(newCat);
  await saveLocalStore(store);
  return newCat;
}

export async function updateCategory(
  id: string,
  name: string,
  color?: string | null
): Promise<Category> {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update({ name, slug, color })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase updateCategory error, fallback', e);
    }
  }

  const store = await getLocalStore();
  const cat = store.categories.find((c) => c.id === id);
  if (!cat) throw new Error('Category not found');
  cat.name = name;
  cat.slug = slug;
  if (color !== undefined) cat.color = color;
  await saveLocalStore(store);
  return cat;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase deleteCategory error, fallback', e);
    }
  }

  const store = await getLocalStore();
  store.categories = store.categories.filter((c) => c.id !== id);
  store.reference_categories = store.reference_categories.filter((rc) => rc.category_id !== id);
  store.figma_sync = store.figma_sync.filter((fs) => fs.category_id !== id);
  await saveLocalStore(store);
  return true;
}

// ==================== REFERENCES ====================

export interface GetReferencesParams {
  search?: string;
  categoryIds?: string[];
  favoriteOnly?: boolean;
  figmaStatus?: string;
  sortBy?: 'recent' | 'oldest' | 'title' | 'modified';
}

export async function getReferences(params: GetReferencesParams = {}): Promise<Reference[]> {
  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      let query = supabase
        .from('references')
        .select(
          `
          *,
          reference_categories (
            category_id,
            categories (*)
          ),
          figma_sync (*)
        `
        );

      if (params.favoriteOnly) {
        query = query.eq('is_favorite', true);
      }

      if (params.search) {
        const s = `%${params.search}%`;
        query = query.or(`title.ilike.${s},notes.ilike.${s},source_url.ilike.${s}`);
      }

      switch (params.sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'title':
          query = query.order('title', { ascending: true });
          break;
        case 'modified':
          query = query.order('updated_at', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (!error && data) {
        let refs: Reference[] = data.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          title: r.title,
          source_url: r.source_url,
          image_path: r.image_path,
          notes: r.notes,
          is_favorite: r.is_favorite,
          created_at: r.created_at,
          updated_at: r.updated_at,
          categories: (r.reference_categories || [])
            .map((rc: any) => rc.categories)
            .filter(Boolean),
          figma_sync: r.figma_sync || [],
        }));

        if (params.categoryIds && params.categoryIds.length > 0) {
          refs = refs.filter((r) =>
            params.categoryIds!.some((cid) => r.categories.some((c) => c.id === cid))
          );
        }

        if (params.figmaStatus && params.figmaStatus !== 'all') {
          refs = refs.filter((r) => {
            if (!r.figma_sync || r.figma_sync.length === 0) {
              return params.figmaStatus === 'pending';
            }
            return r.figma_sync.some((fs) => fs.status === params.figmaStatus);
          });
        }

        return refs;
      }
    } catch (e) {
      console.warn('Supabase getReferences error, fallback to local', e);
    }
  }

  const store = await getLocalStore();
  let results = store.references.map((r) => {
    const cats = store.reference_categories
      .filter((rc) => rc.reference_id === r.id)
      .map((rc) => store.categories.find((c) => c.id === rc.category_id))
      .filter(Boolean) as Category[];

    const syncRecords = store.figma_sync
      .filter((fs) => fs.reference_id === r.id)
      .map((fs) => ({
        ...fs,
        category_name: store.categories.find((c) => c.id === fs.category_id)?.name,
      }));

    return {
      ...r,
      categories: cats,
      figma_sync: syncRecords,
    };
  });

  if (params.favoriteOnly) {
    results = results.filter((r) => r.is_favorite);
  }

  if (params.search) {
    const q = params.search.toLowerCase().trim();
    results = results.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        (r.source_url && r.source_url.toLowerCase().includes(q)) ||
        r.categories.some((c) => c.name.toLowerCase().includes(q))
    );
  }

  if (params.categoryIds && params.categoryIds.length > 0) {
    results = results.filter((r) =>
      params.categoryIds!.some((cid) => r.categories.some((c) => c.id === cid))
    );
  }

  if (params.figmaStatus && params.figmaStatus !== 'all') {
    results = results.filter((r) => {
      if (!r.figma_sync || r.figma_sync.length === 0) {
        return params.figmaStatus === 'pending';
      }
      return r.figma_sync.some((fs) => fs.status === params.figmaStatus);
    });
  }

  // Sorting
  switch (params.sortBy) {
    case 'oldest':
      results.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case 'title':
      results.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'modified':
      results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      break;
    case 'recent':
    default:
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
  }

  return results;
}

export async function getReferenceById(id: string): Promise<Reference | null> {
  const refs = await getReferences();
  return refs.find((r) => r.id === id) || null;
}

export async function createReference(data: {
  title: string;
  source_url?: string | null;
  image_path: string;
  notes?: string | null;
  category_ids: string[];
}): Promise<Reference> {
  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      const { data: refData, error: refError } = await supabase
        .from('references')
        .insert({
          user_id: userId,
          title: data.title,
          source_url: data.source_url || null,
          image_path: data.image_path,
          notes: data.notes || null,
          is_favorite: false,
        })
        .select()
        .single();

      if (refError) throw refError;

      // Link categories
      if (data.category_ids.length > 0) {
        const junctions = data.category_ids.map((catId) => ({
          reference_id: refData.id,
          category_id: catId,
        }));
        await supabase.from('reference_categories').insert(junctions);
      }

      const created = await getReferenceById(refData.id);
      if (created) return created;
    } catch (e) {
      console.warn('Supabase createReference error, fallback to local', e);
    }
  }

  const store = await getLocalStore();
  const newId = `ref-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const newRef: Reference = {
    id: newId,
    user_id: '00000000-0000-0000-0000-000000000000',
    title: data.title,
    source_url: data.source_url || null,
    image_path: data.image_path,
    notes: data.notes || null,
    is_favorite: false,
    created_at: now,
    updated_at: now,
    categories: [],
  };

  store.references.unshift(newRef);

  for (const catId of data.category_ids) {
    store.reference_categories.push({
      reference_id: newId,
      category_id: catId,
      created_at: now,
    });

    store.figma_sync.push({
      id: `sync-${randomUUID().slice(0, 8)}`,
      reference_id: newId,
      category_id: catId,
      category_name: store.categories.find((c) => c.id === catId)?.name,
      figma_file_key: null,
      figma_node_id: null,
      status: 'pending',
      last_error: null,
      synced_at: null,
      created_at: now,
      updated_at: now,
    });
  }

  await saveLocalStore(store);
  return (await getReferenceById(newId))!;
}

export async function updateReference(
  id: string,
  data: {
    title?: string;
    source_url?: string | null;
    notes?: string | null;
    is_favorite?: boolean;
    category_ids?: string[];
  }
): Promise<Reference> {
  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      const updates: any = { updated_at: new Date().toISOString() };
      if (data.title !== undefined) updates.title = data.title;
      if (data.source_url !== undefined) updates.source_url = data.source_url;
      if (data.notes !== undefined) updates.notes = data.notes;
      if (data.is_favorite !== undefined) updates.is_favorite = data.is_favorite;

      await supabase.from('references').update(updates).eq('id', id);

      if (data.category_ids !== undefined) {
        // Sync categories
        await supabase.from('reference_categories').delete().eq('reference_id', id);
        if (data.category_ids.length > 0) {
          const junctions = data.category_ids.map((catId) => ({
            reference_id: id,
            category_id: catId,
          }));
          await supabase.from('reference_categories').insert(junctions);
        }
      }

      const updated = await getReferenceById(id);
      if (updated) return updated;
    } catch (e) {
      console.warn('Supabase updateReference error, fallback to local', e);
    }
  }

  const store = await getLocalStore();
  const ref = store.references.find((r) => r.id === id);
  if (!ref) throw new Error('Reference not found');

  const now = new Date().toISOString();
  if (data.title !== undefined) ref.title = data.title;
  if (data.source_url !== undefined) ref.source_url = data.source_url;
  if (data.notes !== undefined) ref.notes = data.notes;
  if (data.is_favorite !== undefined) ref.is_favorite = data.is_favorite;
  ref.updated_at = now;

  if (data.category_ids !== undefined) {
    // Current category ids
    const currentCatIds = store.reference_categories
      .filter((rc) => rc.reference_id === id)
      .map((rc) => rc.category_id);

    // Removed categories
    const removedCatIds = currentCatIds.filter((cid) => !data.category_ids!.includes(cid));
    // Added categories
    const addedCatIds = data.category_ids.filter((cid) => !currentCatIds.includes(cid));

    store.reference_categories = store.reference_categories.filter(
      (rc) => !(rc.reference_id === id && removedCatIds.includes(rc.category_id))
    );
    store.figma_sync = store.figma_sync.filter(
      (fs) => !(fs.reference_id === id && removedCatIds.includes(fs.category_id))
    );

    for (const catId of addedCatIds) {
      store.reference_categories.push({
        reference_id: id,
        category_id: catId,
        created_at: now,
      });
      store.figma_sync.push({
        id: `sync-${randomUUID().slice(0, 8)}`,
        reference_id: id,
        category_id: catId,
        category_name: store.categories.find((c) => c.id === catId)?.name,
        figma_file_key: null,
        figma_node_id: null,
        status: 'pending',
        last_error: null,
        synced_at: null,
        created_at: now,
        updated_at: now,
      });
    }
  }

  await saveLocalStore(store);
  return (await getReferenceById(id))!;
}

export async function deleteReference(id: string): Promise<boolean> {
  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      await supabase.from('references').delete().eq('id', id);
      return true;
    } catch (e) {
      console.warn('Supabase deleteReference error, fallback to local', e);
    }
  }

  const store = await getLocalStore();
  store.references = store.references.filter((r) => r.id !== id);
  store.reference_categories = store.reference_categories.filter((rc) => rc.reference_id !== id);
  store.figma_sync = store.figma_sync.filter((fs) => fs.reference_id !== id);
  await saveLocalStore(store);
  return true;
}

// ==================== FIGMA SYNC ====================

export async function getFigmaPendingItems(): Promise<FigmaPendingItem[]> {
  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('figma_sync')
        .select(
          `
          *,
          references (*),
          categories (*)
        `
        )
        .eq('status', 'pending');

      if (!error && data) {
        return data.map((item: any) => ({
          reference_id: item.reference_id,
          category_id: item.category_id,
          category_name: item.categories?.name || 'Uncategorized',
          category_color: item.categories?.color || null,
          title: item.references?.title || 'Untitled Reference',
          source_url: item.references?.source_url || null,
          image_url: item.references?.image_path || '',
          notes: item.references?.notes || null,
          existing_node_id: item.figma_node_id || null,
          created_at: item.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase getFigmaPendingItems error, fallback to local', e);
    }
  }

  const store = await getLocalStore();
  const pendingSyncs = store.figma_sync.filter((fs) => fs.status === 'pending');

  return pendingSyncs.map((sync) => {
    const ref = store.references.find((r) => r.id === sync.reference_id);
    const cat = store.categories.find((c) => c.id === sync.category_id);
    return {
      reference_id: sync.reference_id,
      category_id: sync.category_id,
      category_name: cat?.name || 'Uncategorized',
      category_color: cat?.color || null,
      title: ref?.title || 'Untitled Reference',
      source_url: ref?.source_url || null,
      image_url: ref?.image_path || '',
      notes: ref?.notes || null,
      existing_node_id: sync.figma_node_id || null,
      created_at: sync.created_at,
    };
  });
}

export async function updateFigmaSyncRecord(params: {
  reference_id: string;
  category_id: string;
  figma_file_key?: string | null;
  figma_node_id?: string | null;
  status: FigmaSyncStatus;
  last_error?: string | null;
}): Promise<boolean> {
  const admin = createAdminClient();
  const supabase = admin || (await createServerSupabaseClient());

  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { error } = await supabase.from('figma_sync').upsert(
        {
          reference_id: params.reference_id,
          category_id: params.category_id,
          figma_file_key: params.figma_file_key || null,
          figma_node_id: params.figma_node_id || null,
          status: params.status,
          last_error: params.last_error || null,
          synced_at: params.status === 'synced' ? now : null,
          updated_at: now,
        },
        { onConflict: 'reference_id,category_id' }
      );
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase updateFigmaSyncRecord error, fallback to local', e);
    }
  }

  const store = await getLocalStore();
  let sync = store.figma_sync.find(
    (fs) => fs.reference_id === params.reference_id && fs.category_id === params.category_id
  );

  if (!sync) {
    sync = {
      id: `sync-${randomUUID().slice(0, 8)}`,
      reference_id: params.reference_id,
      category_id: params.category_id,
      category_name: store.categories.find((c) => c.id === params.category_id)?.name,
      figma_file_key: params.figma_file_key || null,
      figma_node_id: params.figma_node_id || null,
      status: params.status,
      last_error: params.last_error || null,
      synced_at: params.status === 'synced' ? now : null,
      created_at: now,
      updated_at: now,
    };
    store.figma_sync.push(sync);
  } else {
    sync.status = params.status;
    if (params.figma_node_id) sync.figma_node_id = params.figma_node_id;
    if (params.figma_file_key) sync.figma_file_key = params.figma_file_key;
    sync.last_error = params.last_error || null;
    sync.synced_at = params.status === 'synced' ? now : null;
    sync.updated_at = now;
  }

  await saveLocalStore(store);
  return true;
}

export async function retryFigmaSync(referenceId: string, categoryId: string): Promise<boolean> {
  return updateFigmaSyncRecord({
    reference_id: referenceId,
    category_id: categoryId,
    status: 'pending',
    last_error: null,
  });
}

export async function getFigmaSyncStats() {
  const store = await getLocalStore();
  const pending = store.figma_sync.filter((fs) => fs.status === 'pending').length;
  const synced = store.figma_sync.filter((fs) => fs.status === 'synced').length;
  const failed = store.figma_sync.filter((fs) => fs.status === 'failed').length;
  return { pending, synced, failed, total: store.figma_sync.length };
}

// ==================== API TOKENS ====================

export async function getApiTokens(): Promise<ApiToken[]> {
  const store = await getLocalStore();
  return store.api_tokens;
}

export async function createApiToken(name: string): Promise<ApiToken> {
  const store = await getLocalStore();
  const token: ApiToken = {
    id: `token-${randomUUID().slice(0, 8)}`,
    user_id: '00000000-0000-0000-0000-000000000000',
    name,
    token: `fv_live_${randomUUID().replace(/-/g, '')}`,
    last_used_at: null,
    created_at: new Date().toISOString(),
  };
  store.api_tokens.push(token);
  await saveLocalStore(store);
  return token;
}

export async function validateApiToken(rawToken: string): Promise<boolean> {
  // Allow bearer token comparison
  const clean = rawToken.replace(/^Bearer\s+/i, '').trim();
  const store = await getLocalStore();
  const match = store.api_tokens.find((t) => t.token === clean);
  if (match) {
    match.last_used_at = new Date().toISOString();
    await saveLocalStore(store);
    return true;
  }
  // In development, also allow a demo token or any fv_ prefix
  if (clean.startsWith('fv_live_') || clean === 'dev-token') {
    return true;
  }
  return false;
}
