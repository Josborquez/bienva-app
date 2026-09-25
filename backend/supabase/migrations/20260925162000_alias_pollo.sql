-- =============================================================================
-- Migración: alias que capturaban platos de pollo en match_food (umbral 0,5)
-- 'arroz con pollo' -> alias "maggi pollo arroz" de la sopa instantánea (0,55)
-- 'sopa de pollo'   -> alias "pata de pollo" de la pata asada (0,50)
-- =============================================================================

update foods set aliases = array_replace(aliases, 'maggi pollo arroz', 'sopa maggi pollo y arroz')
where nombre = 'Sopa instantánea pollo arroz' and marca = 'Maggi' and created_by is null;

update foods set aliases = array_replace(aliases, 'pata de pollo', 'pata de pollo asada')
where nombre = 'Pata de pollo asada con piel' and marca is null and created_by is null;
