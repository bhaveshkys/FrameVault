-- FrameVault Database Schema Migration
-- Enables UUID generation and sets up tables, constraints, indexes, RLS, and storage.

create extension if not exists "uuid-ossp";

-- 1. References Table
create table if not exists public.references (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    source_url text,
    image_path text not null,
    notes text,
    is_favorite boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Categories Table
create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    slug text not null,
    color text default '#6366f1',
    created_at timestamptz not null default now(),
    unique(user_id, slug)
);

-- 3. Reference Categories (Many-to-Many Junction)
create table if not exists public.reference_categories (
    reference_id uuid not null references public.references(id) on delete cascade,
    category_id uuid not null references public.categories(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (reference_id, category_id)
);

-- 4. Figma Sync Table
create table if not exists public.figma_sync (
    id uuid primary key default gen_random_uuid(),
    reference_id uuid not null references public.references(id) on delete cascade,
    category_id uuid not null references public.categories(id) on delete cascade,
    figma_file_key text,
    figma_node_id text,
    status text not null default 'pending' check (status in ('pending', 'synced', 'failed')),
    last_error text,
    synced_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (reference_id, category_id)
);

-- 5. API Tokens for Figma Plugin Authentication
create table if not exists public.api_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null default 'Figma Plugin Token',
    token text not null unique,
    last_used_at timestamptz,
    created_at timestamptz not null default now()
);

-- Indexes for fast search and filtering
create index if not exists idx_references_user_id on public.references(user_id);
create index if not exists idx_references_created_at on public.references(created_at desc);
create index if not exists idx_references_is_favorite on public.references(is_favorite);
create index if not exists idx_references_title_trgm on public.references using gin (to_tsvector('english', title));
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_reference_categories_cat on public.reference_categories(category_id);
create index if not exists idx_figma_sync_status on public.figma_sync(status);
create index if not exists idx_figma_sync_ref_cat on public.figma_sync(reference_id, category_id);
create index if not exists idx_api_tokens_token on public.api_tokens(token);

-- Row Level Security (RLS)
alter table public.references enable row level security;
alter table public.categories enable row level security;
alter table public.reference_categories enable row level security;
alter table public.figma_sync enable row level security;
alter table public.api_tokens enable row level security;

-- Policies for references
create policy "Users can manage their own references"
    on public.references for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for categories
create policy "Users can manage their own categories"
    on public.categories for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Policies for reference_categories
create policy "Users can manage their reference category associations"
    on public.reference_categories for all
    using (
        exists (
            select 1 from public.references r
            where r.id = reference_categories.reference_id and r.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.references r
            where r.id = reference_categories.reference_id and r.user_id = auth.uid()
        )
    );

-- Policies for figma_sync
create policy "Users can manage their figma sync records"
    on public.figma_sync for all
    using (
        exists (
            select 1 from public.references r
            where r.id = figma_sync.reference_id and r.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.references r
            where r.id = figma_sync.reference_id and r.user_id = auth.uid()
        )
    );

-- Policies for api_tokens
create policy "Users can manage their api tokens"
    on public.api_tokens for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Storage bucket setup
insert into storage.buckets (id, name, public)
values ('framevault-references', 'framevault-references', true)
on conflict (id) do nothing;

create policy "Users can upload their reference images"
    on storage.objects for insert
    with check (bucket_id = 'framevault-references' and auth.role() = 'authenticated');

create policy "Public can view reference images"
    on storage.objects for select
    using (bucket_id = 'framevault-references');

create policy "Users can delete their reference images"
    on storage.objects for delete
    using (bucket_id = 'framevault-references' and auth.role() = 'authenticated');

-- Automatic Figma sync synchronization trigger on reference_categories change
create or replace function public.handle_reference_category_sync()
returns trigger as $$
begin
    if (TG_OP = 'INSERT') then
        insert into public.figma_sync (reference_id, category_id, status)
        values (NEW.reference_id, NEW.category_id, 'pending')
        on conflict (reference_id, category_id) do nothing;
        return NEW;
    elsif (TG_OP = 'DELETE') then
        delete from public.figma_sync
        where reference_id = OLD.reference_id and category_id = OLD.category_id;
        return OLD;
    end if;
    return null;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_ref_cat_figma_sync on public.reference_categories;
create trigger tr_ref_cat_figma_sync
    after insert or delete on public.reference_categories
    for each row execute function public.handle_reference_category_sync();

-- Automatic user seeding with default categories upon user creation
create or replace function public.seed_default_categories_for_user()
returns trigger as $$
begin
    insert into public.categories (user_id, name, slug, color) values
        (NEW.id, 'Visual Metaphors', 'visual-metaphors', '#ec4899'),
        (NEW.id, 'Maps & Geography', 'maps-geography', '#3b82f6'),
        (NEW.id, 'Typography', 'typography', '#eab308'),
        (NEW.id, 'Motion Graphics', 'motion-graphics', '#8b5cf6'),
        (NEW.id, 'Data Visualization', 'data-visualization', '#10b981'),
        (NEW.id, 'Cinematic Composition', 'cinematic-composition', '#f97316'),
        (NEW.id, 'Transitions', 'transitions', '#06b6d4'),
        (NEW.id, 'Sound Design', 'sound-design', '#14b8a6'),
        (NEW.id, 'Documentary Editing', 'documentary-editing', '#6366f1'),
        (NEW.id, 'Product Advertising', 'product-advertising', '#f43f5e'),
        (NEW.id, 'UI & Interface', 'ui-interface', '#a855f7'),
        (NEW.id, 'Color Grading', 'color-grading', '#f59e0b'),
        (NEW.id, 'Camera Movement', 'camera-movement', '#84cc16'),
        (NEW.id, 'Editing Techniques', 'editing-techniques', '#0ea5e9'),
        (NEW.id, 'Historical Visuals', 'historical-visuals', '#78716c')
    on conflict do nothing;
    return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_on_user_created_seed_categories on auth.users;
create trigger tr_on_user_created_seed_categories
    after insert on auth.users
    for each row execute function public.seed_default_categories_for_user();

