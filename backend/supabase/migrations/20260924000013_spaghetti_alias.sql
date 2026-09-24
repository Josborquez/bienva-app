-- =============================================================================
-- Migración 013: "spaghetti" debe devolver el tallarín común, no el integral
-- La 012 dejó los aliases genéricos "spaghetti" y "espagueti" en el integral.
-- =============================================================================

update foods set aliases = array_remove(array_remove(aliases, 'spaghetti'), 'espagueti')
where nombre = 'Spaghetti integral (crudo)' and marca = 'Lucchetti' and created_by is null;

update foods set aliases = aliases || '{spaghetti,espagueti}'::text[]
where nombre = 'Tallarines (crudo)' and marca = 'Carozzi' and created_by is null
  and not ('spaghetti' = any(aliases));
