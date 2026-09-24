-- =============================================================================
-- Migración 006: search_foods ordena también por similitud de aliases
-- Antes filtraba por aliases pero ordenaba solo por nombre y marca: "pan"
-- devolvía "Pan lengua" aunque Marraqueta tiene el alias exacto "pan", y un
-- alias parecido de otro alimento podía ganarle al correcto.
-- Agrega también pan amasado, que faltaba en la migración 005.
-- =============================================================================

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
             similarity(norm(coalesce(f.marca,'')), norm(q)),
             coalesce((select max(similarity(norm(a), norm(q))) from unnest(f.aliases) a), 0)
           ) desc,
           f.verificado desc,
           f.usos desc
  limit lim
$$;

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, fuente, verificado) values
('Pan amasado', null, 'cereal', '{pan amasado,amasado,pan casero}', '1 unidad', 90, 279, 7.2, 'estimación', false);
