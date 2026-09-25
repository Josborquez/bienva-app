-- Migración 005: validación de datos, piso aplicado al rango, stable y permisos
-- Aplicada en producción el 25 sep 2026 fuera del repo (versión 20260925120811);
-- este archivo es copia exacta de lo aplicado, para que el historial local calce.
create or replace function compute_targets(
  p_sexo sexo_type, p_fecha_nac date, p_altura_cm numeric, p_peso_kg numeric,
  p_actividad actividad_type, p_objetivo objetivo_type, p_ritmo_kg_semana numeric default 0.5
)
returns table (bmr int, tdee int, kcal_objetivo int, kcal_min int, kcal_max int, prot_min int, prot_max int)
language plpgsql stable as $$
declare
  v_edad   int;
  v_bmr    numeric;
  v_factor numeric;
  v_ajuste numeric;
  v_piso   numeric;
  v_obj    numeric;
  v_ritmo  numeric := coalesce(p_ritmo_kg_semana, 0.5);
begin
  if p_sexo is null       then raise exception 'sexo requerido'            using errcode = '22004'; end if;
  if p_fecha_nac is null  then raise exception 'fecha_nacimiento requerida' using errcode = '22004'; end if;
  if p_altura_cm is null  then raise exception 'altura_cm requerida'        using errcode = '22004'; end if;
  if p_peso_kg is null    then raise exception 'peso_kg requerido'          using errcode = '22004'; end if;
  if p_actividad is null  then raise exception 'actividad requerida'        using errcode = '22004'; end if;
  if p_objetivo is null   then raise exception 'objetivo requerido'         using errcode = '22004'; end if;

  v_edad := extract(year from age(current_date, p_fecha_nac));
  if v_edad < 16 or v_edad > 100 then
    raise exception 'edad fuera de rango (%)', v_edad using errcode = '22003';
  end if;
  if v_ritmo < 0 or v_ritmo > 1 then
    raise exception 'ritmo_kg_semana fuera de rango (0–1)' using errcode = '22003';
  end if;

  v_factor := case p_actividad
    when 'sedentario' then 1.2 when 'ligero' then 1.375 when 'moderado' then 1.55
    when 'activo' then 1.725 when 'muy_activo' then 1.9 end;
  v_ajuste := case p_objetivo
    when 'bajar'  then -(v_ritmo * 7700 / 7)
    when 'subir'  then  (v_ritmo * 7700 / 7) * 0.6
    else 0 end;
  v_piso := case p_sexo when 'hombre' then 1500 else 1200 end;

  v_bmr := 10 * p_peso_kg + 6.25 * p_altura_cm - 5 * v_edad
           + case p_sexo when 'hombre' then 5 else -161 end;
  v_obj := greatest(v_bmr * v_factor + v_ajuste, v_piso);

  return query select
    round(v_bmr)::int,
    round(v_bmr * v_factor)::int,
    round(v_obj)::int,
    round(greatest(v_obj - 150, v_piso))::int,   -- el piso también protege el mínimo del rango
    round(v_obj + 150)::int,
    round(p_peso_kg * 1.6)::int,
    round(p_peso_kg * 2.2)::int;
end $$;

-- Permisos: solo usuarios autenticados y backend
revoke execute on function compute_targets(sexo_type, date, numeric, numeric, actividad_type, objetivo_type, numeric) from public, anon;
grant  execute on function compute_targets(sexo_type, date, numeric, numeric, actividad_type, objetivo_type, numeric) to authenticated, service_role;

revoke execute on function complete_onboarding(sexo_type, date, numeric, numeric, numeric, actividad_type, objetivo_type, numeric, time, text) from public, anon;
grant  execute on function complete_onboarding(sexo_type, date, numeric, numeric, numeric, actividad_type, objetivo_type, numeric, time, text) to authenticated, service_role;

-- increment_ai_usage la llama solo la Edge Function con service_role
revoke execute on function increment_ai_usage(uuid, date, int, int) from public, anon, authenticated;
grant  execute on function increment_ai_usage(uuid, date, int, int) to service_role;
