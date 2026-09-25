-- =============================================================================
-- Migración: "pechuga de pollo" -> pechuga cocida
-- La 163000 dejó el alias "pechuga de pollo cruda" en la cruda, que le ganaba a
-- "pechuga de pollo". El nombre "Pechuga cruda Super Pollo" ya cubre
-- "pechuga de pollo cruda" (0,68); la cocida recibe el alias exacto.
-- =============================================================================

update foods set aliases = array_remove(aliases, 'pechuga de pollo cruda')
where nombre = 'Pechuga cruda Super Pollo' and marca = 'Super Pollo' and created_by is null;

update foods set aliases = aliases || '{pechuga de pollo}'::text[]
where nombre = 'Pechuga de pollo sin piel' and marca is null and created_by is null
  and not ('pechuga de pollo' = any(aliases));
