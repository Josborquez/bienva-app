-- =============================================================================
-- Migración 014: "arroz" -> arroz blanco y "cereal" -> Corn Flakes
-- En Chile "arroz" es arroz blanco; el alias genérico estaba en el integral
-- desde la semilla 002. "cereal" caía en Trix por similitud de "cereal trix".
-- =============================================================================

update foods set aliases = array_remove(aliases, 'arroz')
where nombre = 'Arroz integral (crudo)' and marca is null and created_by is null;

update foods set aliases = aliases || '{arroz}'::text[]
where nombre = 'Arroz blanco (crudo)' and marca = 'Tucapel' and created_by is null
  and not ('arroz' = any(aliases));

update foods set aliases = aliases || '{cereal}'::text[]
where nombre = 'Corn Flakes' and marca = 'Kellogg''s' and created_by is null
  and not ('cereal' = any(aliases));
