-- Migración 004: perfil de onboarding y cálculo de metas
-- Aplicada en producción el 25 sep 2026 fuera del repo (versión 20260925112545);
-- este archivo es copia exacta de lo aplicado, para que el historial local calce.
create type sexo_type as enum ('hombre', 'mujer');
create type actividad_type as enum ('sedentario', 'ligero', 'moderado', 'activo', 'muy_activo');
create type objetivo_type as enum ('bajar', 'mantener', 'subir');

alter table users
  add column sexo              sexo_type,
  add column fecha_nacimiento  date,
  add column altura_cm         numeric(5,1) check (altura_cm between 100 and 250),
  add column peso_kg           numeric(5,1) check (peso_kg between 30 and 300),
  add column peso_objetivo_kg  numeric(5,1) check (peso_objetivo_kg between 30 and 300),
  add column actividad         actividad_type,
  add column objetivo          objetivo_type,
  add column ritmo_kg_semana   numeric(3,2) default 0.5 check (ritmo_kg_semana between 0 and 1),
  add column onboarding_completo boolean not null default false;

-- Historial de peso (para tendencia semanal)
create table weights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  fecha      date not null default current_date,
  peso_kg    numeric(5,1) not null check (peso_kg between 30 and 300),
  created_at timestamptz not null default now(),
  unique (user_id, fecha)
);
create index weights_user_fecha on weights (user_id, fecha desc);
alter table weights enable row level security;
create policy "own weights" on weights
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cálculo de metas: Mifflin-St Jeor × actividad ± déficit/superávit
-- Devuelve rango kcal (±150 del objetivo) y proteína (1.6–2.2 g/kg, ajustado al peso objetivo si baja)
create or replace function compute_targets(
  p_sexo sexo_type, p_fecha_nac date, p_altura_cm numeric, p_peso_kg numeric,
  p_actividad actividad_type, p_objetivo objetivo_type, p_ritmo_kg_semana numeric default 0.5
)
returns table (bmr int, tdee int, kcal_objetivo int, kcal_min int, kcal_max int, prot_min int, prot_max int)
language plpgsql immutable as $$
declare
  v_edad  int := extract(year from age(p_fecha_nac));
  v_bmr   numeric;
  v_factor numeric := case p_actividad
    when 'sedentario' then 1.2 when 'ligero' then 1.375 when 'moderado' then 1.55
    when 'activo' then 1.725 else 1.9 end;
  v_ajuste numeric := case p_objetivo
    when 'bajar'  then -(p_ritmo_kg_semana * 7700 / 7)   -- 0.5 kg/sem ≈ -550 kcal/día
    when 'subir'  then  (p_ritmo_kg_semana * 7700 / 7) * 0.6
    else 0 end;
  v_obj numeric;
  v_peso_prot numeric := p_peso_kg;
begin
  v_bmr := 10 * p_peso_kg + 6.25 * p_altura_cm - 5 * v_edad + case when p_sexo = 'hombre' then 5 else -161 end;
  v_obj := greatest(v_bmr * v_factor + v_ajuste, case when p_sexo = 'hombre' then 1500 else 1200 end);
  return query select
    round(v_bmr)::int,
    round(v_bmr * v_factor)::int,
    round(v_obj)::int,
    round(v_obj - 150)::int,
    round(v_obj + 150)::int,
    round(v_peso_prot * 1.6)::int,
    round(v_peso_prot * 2.2)::int;
end $$;

-- Aplica el cálculo al usuario y guarda el peso en el historial
create or replace function complete_onboarding(
  p_sexo sexo_type, p_fecha_nac date, p_altura_cm numeric, p_peso_kg numeric,
  p_peso_objetivo_kg numeric, p_actividad actividad_type, p_objetivo objetivo_type,
  p_ritmo_kg_semana numeric, p_hora_registro time, p_nombre text
)
returns users language plpgsql security definer set search_path = public as $$
declare
  t record; u users;
begin
  select * into t from compute_targets(p_sexo, p_fecha_nac, p_altura_cm, p_peso_kg, p_actividad, p_objetivo, p_ritmo_kg_semana);
  update users set
    nombre = coalesce(p_nombre, nombre), sexo = p_sexo, fecha_nacimiento = p_fecha_nac,
    altura_cm = p_altura_cm, peso_kg = p_peso_kg, peso_objetivo_kg = p_peso_objetivo_kg,
    actividad = p_actividad, objetivo = p_objetivo, ritmo_kg_semana = p_ritmo_kg_semana,
    hora_habitual_registro = coalesce(p_hora_registro, hora_habitual_registro),
    meta_kcal_min = t.kcal_min, meta_kcal_max = t.kcal_max,
    meta_prot_min = t.prot_min, meta_prot_max = t.prot_max,
    onboarding_completo = true
  where id = auth.uid() returning * into u;
  insert into weights (user_id, peso_kg) values (auth.uid(), p_peso_kg)
    on conflict (user_id, fecha) do update set peso_kg = excluded.peso_kg;
  return u;
end $$;
