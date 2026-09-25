-- =============================================================================
-- Migración: sopas Maggi y arroz / fideos COCIDOS
--
-- 1. Arroz y fideos cocidos (USDA): la gente registra el plato ya cocido y el
--    modelo entrega gramos cocidos. Los alias genéricos ("arroz", "fideos",
--    "spaghetti"...) apuntaban a filas en peso CRUDO (~3,3 kcal/g), así que
--    "un plato de arroz" (150 g) se contaba ~490 kcal en vez de ~195. Los alias
--    genéricos pasan a las filas cocidas; las crudas quedan con marca o "crudo".
--    USDA SR: arroz blanco cocido 130 kcal/100 g (2,7 prot, 28,2 carb, 0,3 grasa);
--    pasta cocida sin sal 158 kcal/100 g (5,8 prot, 30,9 carb, 0,9 grasa).
--
-- 2. Sopas Maggi (Open Food Facts, ODbL; verificado = false). OFF trae valores
--    por 100 g de POLVO; la porción de etiqueta es 1/5 de sobre + 200 ml de agua.
--    La fila guarda el PLATO PREPARADO (polvo + 200 ml) con las kcal del polvo de
--    esa porción: si se guardara el peso del polvo (14 g), analyze escalaría un
--    plato de 250 g por 18.
-- =============================================================================

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado) values
-- Cocidos (genéricos)
('Arroz blanco cocido', null, 'cereal',
 '{arroz,arroz cocido,arroz blanco,arroz blanco cocido,arroz graneado,plato de arroz}',
 '1 taza (160 g)', 160, 208.0, 4.3, 45.1, 0.5, 'USDA', true),
('Fideos cocidos', null, 'cereal',
 '{fideos,fideos cocidos,tallarines,tallarines cocidos,spaghetti,espagueti,pasta,pasta cocida,plato de fideos,plato de tallarines}',
 '1 taza (140 g)', 140, 221.2, 8.1, 43.3, 1.3, 'USDA', true),

-- Sopas Maggi: plato preparado (porción de polvo + 200 ml de agua)
('Sopa de pollo con fideos',  'Maggi', 'preparado', '{sopa maggi,sopa de pollo maggi,sopa pollo fideos maggi,sopa de sobre}',          '1 plato (200 ml)', 214, 48.0, 1.6,  9.0, 0.6, 'Open Food Facts', false), -- 7802950006612 (14 g polvo)
('Sopa de pollo con arroz',   'Maggi', 'preparado', '{sopa pollo arroz maggi,sopa de pollo con arroz maggi}',                         '1 plato (200 ml)', 214, 48.6, 1.0,  9.8, 0.6, 'Open Food Facts', false), -- 7802950006629 (14 g)
('Sopa de caracolitos',       'Maggi', 'preparado', '{sopa caracolitos,sopa de caracolitos maggi}',                                  '1 plato (200 ml)', 215, 52.1, 1.7, 10.2, 0.5, 'Open Food Facts', false), -- 7802950006636 (15 g)
('Crema de espárragos',       'Maggi', 'preparado', '{crema de esparragos,sopa crema,sopa crema maggi,crema maggi,crema de esparragos maggi}', '1 plato (200 ml)', 214, 49.0, 1.0, 9.2, 0.9, 'Open Food Facts', false), -- 7802950006735 (14 g)
('Crema sabor pollo',         'Maggi', 'preparado', '{crema de pollo,crema de pollo maggi}',                                         '1 plato (200 ml)', 214, 57.0, 1.2,  9.8, 1.4, 'Open Food Facts', false), -- 7802950006766 (14 g)
('Crema de choclo',           'Maggi', 'preparado', '{crema de choclo,crema de choclo maggi}',                                       '1 plato (200 ml)', 216, 63.0, 1.1, 12.3, 1.1, 'Open Food Facts', false), -- 7802950004571 (16 g)
('Crema de tomate',           'Maggi', 'preparado', '{crema de tomate,crema de tomate maggi}',                                       '1 plato (300 ml)', 300, 84.9, 2.7, 14.7, 1.8, 'Open Food Facts', false); -- 8445290846853 (lista para servir, 28,3 kcal/100 ml)

-- Alias genéricos fuera de las filas crudas
update foods set aliases = array(select a from unnest(aliases) a where a not in ('arroz', 'arroz blanco', 'arroz graneado'))
where nombre = 'Arroz blanco (crudo)' and marca = 'Tucapel' and created_by is null;
update foods set aliases = array(select a from unnest(aliases) a where a <> 'fideos')
where nombre = 'Fideos integrales (crudo)' and marca = 'Carozzi' and created_by is null;
update foods set aliases = array(select a from unnest(aliases) a where a not in ('spaghetti', 'espagueti'))
where nombre = 'Tallarines (crudo)' and marca = 'Carozzi' and created_by is null;
