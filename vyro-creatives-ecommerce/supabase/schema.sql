-- Vyro Creatives ecommerce starter schema for Supabase/Postgres.
-- Review and test in a development project before production deployment.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');
create type public.order_status as enum (
  'new', 'awaiting_payment', 'paid', 'in_progress', 'preview_ready',
  'revision_requested', 'completed', 'cancelled', 'refunded'
);
create type public.payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded', 'manual_review');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  instagram_handle text,
  referral_code text unique,
  referred_by text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  price_paise integer not null check (price_paise >= 0),
  turnaround_days integer not null default 3 check (turnaround_days > 0),
  customization_options jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.referral_redemptions (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  referrer_id uuid references public.profiles(id) on delete set null,
  referred_user_id uuid references public.profiles(id) on delete set null,
  order_id uuid,
  discount_paise integer not null default 0 check (discount_paise >= 0),
  created_at timestamptz not null default now(),
  unique(referred_user_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  instagram_handle text,
  design_brief text not null,
  required_text text,
  preferred_style text,
  output_format text,
  deadline date,
  referral_code text,
  subtotal_paise integer not null check (subtotal_paise >= 0),
  discount_paise integer not null default 0 check (discount_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  status public.order_status not null default 'new',
  payment_status public.payment_status not null default 'pending',
  payment_method text,
  payment_reference text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.referral_redemptions
  add constraint referral_redemptions_order_id_fkey
  foreign key (order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0 and quantity <= 20),
  unit_price_paise integer not null check (unit_price_paise >= 0),
  customization jsonb not null default '{}'::jsonb
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text unique,
  provider_payment_id text unique,
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'pending',
  verified_at timestamptz,
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create table public.uploaded_assets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  created_at timestamptz not null default now()
);

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  notes text not null,
  status text not null default 'requested' check (status in ('requested','accepted','done','rejected')),
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders(customer_id);
create index orders_created_at_idx on public.orders(created_at desc);
create index order_items_order_id_idx on public.order_items(order_id);
create index payments_order_id_idx on public.payments(order_id);
create index products_active_idx on public.products(active, featured);

-- Admin check is evaluated using the protected profile role.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.referral_redemptions enable row level security;
alter table public.uploaded_assets enable row level security;
alter table public.revisions enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles read own or admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());
create policy "profiles update own or admin" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "public read active categories" on public.categories
for select using (active or public.is_admin());
create policy "admin manage categories" on public.categories
for all using (public.is_admin()) with check (public.is_admin());

create policy "public read active products" on public.products
for select using (active or public.is_admin());
create policy "admin manage products" on public.products
for all using (public.is_admin()) with check (public.is_admin());

create policy "customer read own orders or admin" on public.orders
for select using (customer_id = auth.uid() or public.is_admin());
-- Orders are created through trusted server/Edge Functions so clients cannot submit prices.
create policy "admin manage orders" on public.orders
for all using (public.is_admin()) with check (public.is_admin());

create policy "customer read own order items or admin" on public.order_items
for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin()))
);
create policy "admin manage order items" on public.order_items
for all using (public.is_admin()) with check (public.is_admin());

create policy "customer read own payments or admin" on public.payments
for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin()))
);
create policy "admin manage payments" on public.payments
for all using (public.is_admin()) with check (public.is_admin());

create policy "read own referral redemption or admin" on public.referral_redemptions
for select using (referred_user_id = auth.uid() or referrer_id = auth.uid() or public.is_admin());
create policy "admin manage referral redemptions" on public.referral_redemptions
for all using (public.is_admin()) with check (public.is_admin());

create policy "read own assets or admin" on public.uploaded_assets
for select using (owner_id = auth.uid() or public.is_admin());
create policy "admin manage assets" on public.uploaded_assets
for all using (public.is_admin()) with check (public.is_admin());

create policy "read own revisions or admin" on public.revisions
for select using (
  requested_by = auth.uid() or exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin()))
);
create policy "customers request revisions for own orders" on public.revisions
for insert with check (
  requested_by = auth.uid() and exists (
    select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()
  )
);
create policy "admin manage revisions" on public.revisions
for all using (public.is_admin()) with check (public.is_admin());

create policy "public read public settings only" on public.site_settings
for select using (key in ('public_contact','public_branding'));
create policy "admin manage settings" on public.site_settings
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin read audit events" on public.audit_events
for select using (public.is_admin());
create policy "server/admin insert audit events" on public.audit_events
for insert with check (public.is_admin());

-- Seed categories. Product seeds can be inserted from the admin dashboard.
insert into public.categories(name, slug) values
('Posters','posters'),
('Brochures','brochures'),
('Logo Designs','logo-designs'),
('Banners','banners'),
('Event Designs','event-designs'),
('Traditional','traditional'),
('Business','business'),
('Creator & Social Media','creator-social')
on conflict (slug) do nothing;
