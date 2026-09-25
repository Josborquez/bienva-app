-- =============================================================================
-- Migración 006: peso objetivo sugerido y validación en complete_onboarding
-- Rango saludable = IMC 18,5 a 24,9 sobre la estatura en metros al cuadrado.
-- Redondeo a 0,5 kg HACIA ADENTRO del rango (mínimo hacia arriba, máximo hacia
-- abajo) para que ambos extremos queden dentro de IMC 18,5–24,9: con 160 cm el
-- máximo exacto es 63,74 kg; 64,0 kg ya es IMC 25,0, así que el máximo es 63,5.
-- Nombre con hora 13:00 para quedar después de 20260925112545 y 20260925120811,
-- de las que depende (objetivo_type, complete_onboarding).
-- =============================================================================

create or replace function suggest_target_weight(
  p_altura_cm numeric, p_peso_kg numeric, p_objetivo objetivo_type
)
returns table (peso_min_saludable numeric(5,1), peso_max_saludable numeric(5,1), peso_sugerido numeric(5,1), nota text)
language plpgsql immutable set search_path = public as $$
declare
  v_m2  numeric;
  v_min numeric;
  v_max numeric;
  v_sug numeric;
  v_nota text := null;
begin
  if p_altura_cm is null then raise exception 'altura_cm requerida' using errcode = '22004'; end if;
  if p_peso_kg is null   then raise exception 'peso_kg requerido'   using errcode = '22004'; end if;
  if p_objetivo is null  then raise exception 'objetivo requerido'  using errcode = '22004'; end if;

  v_m2  := (p_altura_cm / 100) ^ 2;
  v_min := ceil(18.5 * v_m2 * 2) / 2;
  v_max := floor(24.9 * v_m2 * 2) / 2;

  v_sug := case p_objetivo
    when 'bajar' then
      case
        when p_peso_kg > v_max then v_max
        when p_peso_kg < v_min then p_peso_kg
        else greatest(p_peso_kg - 3, v_min)
      end
    when 'subir' then
      case when p_peso_kg < v_min then v_min else least(p_peso_kg + 3, v_max) end
    else p_peso_kg  -- mantener
  end;

  if p_objetivo = 'bajar' and p_peso_kg < v_min then
    v_nota := 'Ya estás bajo el rango saludable; te sugerimos mantener';
  end if;

  return query select v_min::numeric(5,1), v_max::numeric(5,1), v_sug::numeric(5,1), v_nota;
end $$;

revoke execute on function suggest_target_weight(numeric, numeric, objetivo_type) from public, anon;
grant  execute on function suggest_target_weight(numeric, numeric, objetivo_type) to authenticated, service_role;

-- complete_onboarding: igual a 20260925112545 + rechazo de peso objetivo bajo el
-- mínimo saludable. La validación va después de compute_targets, que ya exige
-- altura y peso. create or replace conserva los permisos de 20260925120811.
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

  if p_peso_objetivo_kg is not null
     and p_peso_objetivo_kg < (select s.peso_min_saludable from suggest_target_weight(p_altura_cm, p_peso_kg, p_objetivo) s) then
    raise exception 'peso objetivo bajo el rango saludable' using errcode = '22003';
  end if;

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
