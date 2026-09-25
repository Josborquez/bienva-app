-- =============================================================================
-- Migración: la pechuga cruda Super Pollo no debe capturar pollo cocido
-- En "arroz con pollo" el modelo devolvió una pechuga "deshuesada" y match_food
-- la cruzó con "Pechuga de pollo deshuesada cruda" (0,83): 116 kcal por 120 g
-- en vez de ~197 kcal de pechuga cocida. Con el nombre "Pechuga cruda Super
-- Pollo" baja a 0,39 contra "pechuga de pollo deshuesada" y 0,46 contra
-- "pechuga de pollo"; se sigue encontrando por "pechuga cruda" (0,56) y
-- "pechuga super pollo" (0,76). Los nombres comunes de pollo cocido pasan a la
-- pechuga cocida (164 kcal / 100 g).
-- =============================================================================

update foods set nombre = 'Pechuga cruda Super Pollo',
  aliases = '{pechuga cruda,pechuga super pollo,pechuga de pollo cruda}'
where nombre = 'Pechuga de pollo deshuesada cruda' and marca = 'Super Pollo' and created_by is null;

update foods set aliases = aliases || array(
  select a from unnest('{pechuga deshuesada,pechuga de pollo deshuesada,pollo deshuesado,pollo al horno,pollo desmenuzado,trozo de pollo}'::text[]) a
  where not (a = any(aliases)))
where nombre = 'Pechuga de pollo sin piel' and marca is null and created_by is null;
