-- =============================================================================
-- Migración: atún Robinson Crusoe desde las etiquetas de jumbo.cl (25 sep 2026)
-- Leído con tools/etiquetas.ts. Porción: la lata DRENADA completa (la etiqueta
-- usa 1/2 lata, pero la gente registra "una lata"). Valores por 100 g × peso
-- drenado. Todas cuadran kcal vs macros salvo la ensalada con lentejas (dice
-- 80 kcal/100 g, sus macros suman ~144): queda fuera hasta ver la etiqueta.
-- =============================================================================

-- Semilla 002: 100 kcal / 22 g calzan con la lata drenada de 91 g, pero decía
-- 120 g, y analyze escala por gramos (una lata de 91 g salía ~76 kcal).
-- Etiqueta: 109 kcal, 25 g prot, 0,5 g grasa por 100 g; 140 g neto / 91 g drenado.
update foods set porcion_desc = '1 lata drenada (91 g)', porcion_g = 91,
  kcal = 99.2, prot_g = 22.8, carb_g = 0, grasa_g = 0.5
where nombre = 'Atún en agua' and marca = 'Robinson Crusoe' and created_by is null;

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado) values
('Atún en aceite',              'Robinson Crusoe', 'proteina', '{atún en aceite,atun en aceite,lomitos en aceite}',                 '1 lata drenada (91 g)',  91, 243.9, 20.0,  1.3, 17.3, 'etiqueta', true), -- 268/22/1,4/19 por 100 g
('Atún en aceite de oliva',     'Robinson Crusoe', 'proteina', '{atún en aceite de oliva,atun en aceite de oliva}',                 '1 lata drenada (104 g)', 104, 176.8, 27.0, 0,    7.3, 'etiqueta', true), -- 170/26/0/7
('Atún con salsa de tomate',    'Robinson Crusoe', 'proteina', '{atún con salsa de tomate,atún en salsa de tomate,atun con salsa de tomate}', '1 lata (91 g)', 91, 216.6, 20.0, 1.8, 15.5, 'etiqueta', true), -- 238/22/2/17
('Ensalada de atún primavera',  'Robinson Crusoe', 'preparado', '{ensalada de atún primavera,ensalada primavera robinson crusoe}',   '1 lata (160 g)', 160, 344.0, 15.2,  7.8, 27.7, 'etiqueta', true), -- 215/9,5/4,9/17,3
('Ensalada de atún mexicana',   'Robinson Crusoe', 'preparado', '{ensalada de atún mexicana,ensalada mexicana robinson crusoe}',     '1 lata (160 g)', 160, 281.6, 13.9,  7.7, 21.0, 'etiqueta', true), -- 176/8,7/4,8/13,1
('Ensalada de atún campesina',  'Robinson Crusoe', 'preparado', '{ensalada de atún campesina,ensalada campesina robinson crusoe}',   '1 lata (160 g)', 160, 270.4, 11.8, 13.4, 17.6, 'etiqueta', true), -- 169/7,4/8,4/11
('Ensalada de atún con quinoa', 'Robinson Crusoe', 'preparado', '{ensalada de atún con quinoa,ensalada quinoa robinson crusoe}',     '1 lata (160 g)', 160, 313.6, 16.0, 13.8, 20.8, 'etiqueta', true), -- 196/10/8,6/13
('Ensalada de atún mediterránea', 'Robinson Crusoe', 'preparado', '{ensalada de atún mediterránea,ensalada mediterranea robinson crusoe}', '1 lata (160 g)', 160, 254.4, 14.6, 11.8, 15.4, 'etiqueta', true); -- 159/9,1/7,4/9,6
