-- =============================================================================
-- Migración 007: suggest_target_weight, caso "subir" sobre el máximo saludable
-- Antes sugería el máximo, es decir, un peso MENOR que el actual para alguien
-- que quiere subir. Ahora sugiere mantener el actual, con nota, en simetría con
-- "bajar" bajo el mínimo. El resto de las reglas no cambia.
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
      case
        when p_peso_kg < v_min then v_min
        when p_peso_kg > v_max then p_peso_kg
        else least(p_peso_kg + 3, v_max)
      end
    else p_peso_kg  -- mantener
  end;

  if p_objetivo = 'bajar' and p_peso_kg < v_min then
    v_nota := 'Ya estás bajo el rango saludable; te sugerimos mantener';
  elsif p_objetivo = 'subir' and p_peso_kg > v_max then
    v_nota := 'Ya estás sobre el rango saludable; te sugerimos mantener';
  end if;

  return query select v_min::numeric(5,1), v_max::numeric(5,1), v_sug::numeric(5,1), v_nota;
end $$;
