-- =============================================================================
-- Migración 007: marraqueta con valores de FatSecret Chile
-- Reemplaza la estimación de la migración 005. FatSecret (entrada genérica
-- "Marraqueta", porción 1 marraqueta): 245 kcal, 6,03 g proteína, 54,85 g
-- carbohidratos, 0,77 g grasa. FatSecret no da el peso; se mantiene 100 g,
-- coherente con los ~55 g de carbohidratos de un pan blanco.
-- =============================================================================

update foods
set kcal = 245, prot_g = 6.0, carb_g = 54.9, grasa_g = 0.8, fuente = 'FatSecret Chile'
where nombre = 'Marraqueta' and marca is null and created_by is null;
