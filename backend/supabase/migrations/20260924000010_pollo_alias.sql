-- =============================================================================
-- Migración 010: "pollo" debe devolver la pechuga cocida, no la cruda
-- Tras la 009, search_foods('pollo') devolvía la pechuga cruda Super Pollo por
-- su alias "pollo crudo" y su marca. Lo que la gente registra es pollo cocido.
-- =============================================================================

update foods set aliases = array_remove(aliases, 'pollo crudo')
where nombre = 'Pechuga de pollo deshuesada cruda' and marca = 'Super Pollo' and created_by is null;

update foods set aliases = aliases || '{pollo}'::text[]
where nombre = 'Pechuga de pollo sin piel' and marca is null and created_by is null
  and not ('pollo' = any(aliases));
