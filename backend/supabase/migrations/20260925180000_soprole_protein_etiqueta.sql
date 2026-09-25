-- =============================================================================
-- Migración: Yogurt Protein+ Soprole con la etiqueta real (jumbo.cl, 25 sep 2026)
-- La semilla 002 decía 15 g de proteína por pote de 155 g; la etiqueta dice
-- 6,6 g / 100 g = 10,2 g por pote (las kcal, 105, sí estaban bien). Open Food
-- Facts ya lo había marcado (7802900002039: 6,6 g / 100 g).
-- Chirimoya, natural, vainilla, frutilla y maracuyá traen la misma tabla por
-- 100 g (68 kcal, 6,6 prot, 6,3 carb, 1,8 grasa; cuadra con los macros): una
-- fila con alias por sabor. Tropical (kiwi, plátano, manzana) es distinta.
-- =============================================================================

update foods set kcal = 105.4, prot_g = 10.2, carb_g = 9.8, grasa_g = 2.8, porcion_desc = '1 pote (155 g)',
  aliases = aliases || array(select a from unnest('{yogurt protein soprole,protein soprole chirimoya,protein soprole natural,protein soprole vainilla,protein soprole frutilla,protein soprole maracuya}'::text[]) a where not (a = any(aliases)))
where nombre = 'Yogurt Protein+' and marca = 'Soprole' and created_by is null;

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado) values
('Yogurt Protein+ tropical', 'Soprole', 'lacteo', '{protein soprole tropical,protein kiwi platano manzana,yogurt protein tropical}',
 '1 pote (155 g)', 155, 128.7, 10.1, 14.9, 2.3, 'etiqueta', true); -- 83 kcal, 6,5 prot, 9,6 carb, 1,5 grasa por 100 g
