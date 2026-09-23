-- =============================================================================
-- App de Alimentos — Esquema MVP (Supabase / Postgres)
-- Migración 001. Ejecutar en SQL Editor de Supabase o con `supabase db push`.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"  with schema extensions;   -- búsqueda difusa de alimentos
create extension if not exists "unaccent" with schema extensions;  -- "platano" encuentra "plátano"

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type meal_type   as enum ('desayuno', 'almuerzo', 'snack', 'cena');
create type meal_origin as enum ('foto', 'texto', 'voz', 'repetir', 'manual');
create type plan_type   as enum ('free', 'pro');
create type chat_role   as enum ('user', 'assistant');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Normaliza texto para búsqueda: minúsculas y sin tildes
create or replace function norm(text)
returns text language sql immutable parallel safe
set search_path = public, extensions as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, $1))
$$;

-- -----------------------------------------------------------------------------
-- users: perfil y metas (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table users (
  id                      uuid primary key references auth.users(id) on delete cascade,
  email                   text,
  nombre                  text,
  plan                    plan_type not null default 'free',
  meta_kcal_min           int  check (meta_kcal_min > 0),
  meta_kcal_max           int  check (meta_kcal_max >= meta_kcal_min),
  meta_prot_min           int  check (meta_prot_min > 0),
  meta_prot_max           int  check (meta_prot_max >= meta_prot_min),
  hora_habitual_registro  time,               -- se aprende del uso; base del recordatorio adaptativo
  recordatorio_activo     boolean not null default true,
  fotos_gratis_por_dia    int not null default 3,
  timezone                text not null default 'America/Santiago',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create trigger users_updated before update on users
  for each row execute function set_updated_at();

-- Crea la fila en users cuando se registra alguien en auth
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into users (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- foods: base de alimentos chilena. Valores POR PORCIÓN indicada.
-- La IA identifica el alimento y la porción; los números salen de aquí.
-- -----------------------------------------------------------------------------
create table foods (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  marca         text,
  categoria     text,                     -- proteina, lacteo, cereal, fruta, verdura, snack, bebida, preparado
  aliases       text[] not null default '{}',   -- otras formas de decirlo: {'pechuga','pollo a la plancha'}
  porcion_desc  text not null,            -- "1 lata", "100 g", "1 rebanada"
  porcion_g     numeric(7,1),             -- gramos de esa porción; null si no aplica (ml, unidad sin peso)
  kcal          numeric(7,1) not null check (kcal >= 0),
  prot_g        numeric(6,1) not null check (prot_g >= 0),
  carb_g        numeric(6,1),
  grasa_g       numeric(6,1),
  fuente        text,                     -- etiqueta, FatSecret Chile, USDA, estimación
  verificado    boolean not null default false,
  created_by    uuid references users(id) on delete set null,  -- null = semilla oficial
  usos          int not null default 0,   -- cuántas veces se registró; ordena resultados
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger foods_updated before update on foods
  for each row execute function set_updated_at();

-- Índices de búsqueda difusa (nombre + marca + aliases)
create index foods_nombre_trgm on foods using gin (norm(nombre) gin_trgm_ops);
create index foods_marca_trgm  on foods using gin (norm(coalesce(marca,'')) gin_trgm_ops);
create index foods_aliases_gin on foods using gin (aliases);
create index foods_usos_idx    on foods (usos desc);

-- Búsqueda: devuelve los N mejores por similitud y uso
create or replace function search_foods(q text, lim int default 10)
returns setof foods language sql stable
set search_path = public, extensions as $$
  select f.*
  from foods f
  where norm(f.nombre) % norm(q)
     or norm(coalesce(f.marca,'')) % norm(q)
     or exists (select 1 from unnest(f.aliases) a where norm(a) % norm(q))
  order by greatest(
             similarity(norm(f.nombre), norm(q)),
             similarity(norm(coalesce(f.marca,'')), norm(q))
           ) desc,
           f.verificado desc,
           f.usos desc
  limit lim
$$;

-- -----------------------------------------------------------------------------
-- meals + meal_items: lo que se comió
-- -----------------------------------------------------------------------------
create table meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  fecha       date not null,
  tipo        meal_type not null,
  origen      meal_origin not null default 'manual',
  es_borrador boolean not null default false,   -- registro a medias: se retoma sin perder nada
  foto_path   text,                              -- storage path si vino de foto
  nota        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger meals_updated before update on meals
  for each row execute function set_updated_at();
create index meals_user_fecha on meals (user_id, fecha desc);

create table meal_items (
  id                  uuid primary key default gen_random_uuid(),
  meal_id             uuid not null references meals(id) on delete cascade,
  food_id             uuid references foods(id) on delete set null,  -- null si la IA no encontró match
  nombre              text not null,           -- lo que el usuario ve (puede diferir de foods.nombre)
  cantidad            numeric(7,2) not null default 1,   -- multiplicador de la porción (2 huevos = 2)
  cantidad_g          numeric(7,1),            -- gramos reales si se conocen
  kcal                numeric(7,1) not null check (kcal >= 0),
  prot_g              numeric(6,1) not null check (prot_g >= 0),
  carb_g              numeric(6,1),
  grasa_g             numeric(6,1),
  confianza           numeric(3,2) check (confianza between 0 and 1),  -- de la IA; < 0.6 pide confirmar
  editado_por_usuario boolean not null default false,
  created_at          timestamptz not null default now()
);
create index meal_items_meal on meal_items (meal_id);
create index meal_items_food on meal_items (food_id);

-- Contador de usos del alimento (para ordenar búsquedas y "comidas frecuentes")
create or replace function bump_food_usos()
returns trigger language plpgsql as $$
begin
  if new.food_id is not null then
    update foods set usos = usos + 1 where id = new.food_id;
  end if;
  return new;
end $$;
create trigger meal_items_bump_usos after insert on meal_items
  for each row execute function bump_food_usos();

-- -----------------------------------------------------------------------------
-- pending_photos: captura rápida (foto guardada, análisis después)
-- -----------------------------------------------------------------------------
create table pending_photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  storage_path  text not null,
  tomada_en     timestamptz not null default now(),
  tipo_sugerido meal_type,                 -- inferido por hora local
  procesada     boolean not null default false,
  meal_id       uuid references meals(id) on delete set null,
  error         text,
  created_at    timestamptz not null default now()
);
create index pending_photos_user_pend on pending_photos (user_id) where not procesada;

-- -----------------------------------------------------------------------------
-- user_memory + messages: memoria del coach
-- -----------------------------------------------------------------------------
create table user_memory (
  user_id        uuid primary key references users(id) on delete cascade,
  perfil_texto   text not null default '',   -- ≤ 500 tokens, lo reescribe el modelo
  actualizado_en timestamptz not null default now()
);

create table messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  rol         chat_role not null,
  contenido   text not null,
  tokens_in   int,
  tokens_out  int,
  created_at  timestamptz not null default now()
);
create index messages_user_created on messages (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- ai_usage: contador de llamadas por usuario y día (tope del plan free)
-- -----------------------------------------------------------------------------
create table ai_usage (
  user_id    uuid not null references users(id) on delete cascade,
  fecha      date not null,
  fotos      int not null default 0,
  mensajes   int not null default 0,
  primary key (user_id, fecha)
);

create or replace function can_analyze_photo(p_user uuid)
returns boolean language plpgsql as $$
declare
  v_plan  plan_type;
  v_limit int;
  v_used  int;
begin
  select plan, fotos_gratis_por_dia into v_plan, v_limit from users where id = p_user;
  if v_plan = 'pro' then return true; end if;
  select coalesce(fotos, 0) into v_used
    from ai_usage where user_id = p_user and fecha = current_date;
  return coalesce(v_used, 0) < v_limit;
end $$;

-- -----------------------------------------------------------------------------
-- Vistas
-- -----------------------------------------------------------------------------

-- Totales por día; un día sin filas = "sin registro", nunca 0
create view daily_totals as
select
  m.user_id,
  m.fecha,
  count(distinct m.id)                as comidas,
  round(sum(mi.kcal))::int            as kcal,
  round(sum(mi.prot_g))::int          as prot_g,
  bool_or(m.es_borrador)              as tiene_borrador
from meals m
join meal_items mi on mi.meal_id = m.id
where not m.es_borrador
group by m.user_id, m.fecha;

-- Comidas frecuentes: ítems que el usuario registró 3+ veces, por tipo de comida
create view frequent_items as
select
  m.user_id,
  m.tipo,
  mi.food_id,
  mi.nombre,
  count(*)                      as veces,
  round(avg(mi.cantidad), 2)    as cantidad_tipica,
  round(avg(mi.kcal))::int      as kcal_tipico,
  round(avg(mi.prot_g))::int    as prot_tipico,
  max(m.fecha)                  as ultima_vez
from meals m
join meal_items mi on mi.meal_id = m.id
where not m.es_borrador
group by m.user_id, m.tipo, mi.food_id, mi.nombre
having count(*) >= 3;

-- -----------------------------------------------------------------------------
-- RLS: cada usuario ve solo lo suyo; foods es lectura pública
-- -----------------------------------------------------------------------------
alter table users          enable row level security;
alter table foods          enable row level security;
alter table meals          enable row level security;
alter table meal_items     enable row level security;
alter table pending_photos enable row level security;
alter table user_memory    enable row level security;
alter table messages       enable row level security;
alter table ai_usage       enable row level security;

create policy "own user"   on users
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "foods read" on foods
  for select using (true);
create policy "foods insert own" on foods
  for insert with check (created_by = auth.uid());
create policy "foods update own unverified" on foods
  for update using (created_by = auth.uid() and not verificado);

create policy "own meals" on meals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own meal_items" on meal_items
  for all using (exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid()))
  with check  (exists (select 1 from meals m where m.id = meal_id and m.user_id = auth.uid()));

create policy "own pending_photos" on pending_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own memory" on user_memory
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own messages" on messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own ai_usage read" on ai_usage
  for select using (user_id = auth.uid());
-- ai_usage lo escribe solo el backend (service role), no la app.

-- -----------------------------------------------------------------------------
-- Storage: bucket privado para fotos
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

drop policy if exists "own photos" on storage.objects;
create policy "own photos" on storage.objects
  for all using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check  (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
