-- Supabase SQL schema for AiTravelPlanner

create table if not exists public.plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  destination text not null,
  startDate date not null,
  endDate date not null,
  partySize int not null,
  preferences jsonb not null default '[]',
  currency text not null default 'CNY',
  budget jsonb not null,
  itinerary jsonb not null,
  sourceInput jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  description text not null,
  category text not null,
  amount numeric not null,
  date date not null,
  currency text not null default 'CNY',
  budgetCap numeric,
  created_at timestamptz not null default now()
);

alter table public.plans enable row level security;
alter table public.expenses enable row level security;

create policy "Plans are viewable by owner" on public.plans for select using ( auth.uid() = user_id );
create policy "Plans are insertable by owner" on public.plans for insert with check ( auth.uid() = user_id );
create policy "Plans are updatable by owner" on public.plans for update using ( auth.uid() = user_id );
create policy "Plans are deletable by owner" on public.plans for delete using ( auth.uid() = user_id );

create policy "Expenses are viewable by owner" on public.expenses for select using ( auth.uid() = user_id );
create policy "Expenses are insertable by owner" on public.expenses for insert with check ( auth.uid() = user_id );
create policy "Expenses are updatable by owner" on public.expenses for update using ( auth.uid() = user_id );
create policy "Expenses are deletable by owner" on public.expenses for delete using ( auth.uid() = user_id );