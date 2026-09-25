-- =============================================================================
-- Migración: match_food con puntaje mínimo + alimento "Agua"
-- Bug: analyze tomaba el primer resultado de search_foods (filtro pg_trgm 0,3).
-- "vaso de agua" -> el modelo devolvía "agua" -> search_foods lo cruzaba con
-- "Atún en agua" (puntaje 0,42) y lo escalaba a 250 g: 208 kcal por un vaso de
-- agua. Igual "sopa crema" -> "Queso crema" (0,35).
-- Medido sobre nombres reales del modelo: malos <= 0,42, buenos >= 0,57.
-- match_food exige puntaje >= 0,5; si no alcanza, analyze usa la estimación del
-- modelo (fuente "modelo"). search_foods no cambia: la app la usa para listar
-- opciones y ahí conviene que sea permisiva.
-- =============================================================================

create or replace function match_food(q text, min_score real default 0.5)
returns setof foods language sql stable
set search_path = public, extensions as $$
  select f.*
  from foods f
  cross join lateral (
    select greatest(
      similarity(norm(f.nombre), norm(q)),
      similarity(norm(coalesce(f.marca, '')), norm(q)),
      coalesce((select max(similarity(norm(a), norm(q))) from unnest(f.aliases) a), 0)
    ) as score
  ) s
  where s.score >= min_score
  order by s.score desc, f.verificado desc, f.usos desc
  limit 1
$$;

revoke execute on function match_food(text, real) from public, anon;
grant  execute on function match_food(text, real) to authenticated, service_role;

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado) values
('Agua', null, 'bebida', '{agua,vaso de agua,agua mineral,agua con gas,agua sin gas,agua purificada,agua de la llave}',
 '1 vaso (200 ml)', 200, 0, 0, 0, 0, 'referencia', true);
