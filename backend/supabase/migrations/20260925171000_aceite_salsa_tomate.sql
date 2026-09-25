-- =============================================================================
-- Migración: aceite y salsa de tomate genéricos
-- Tras la 170000, match_food('aceite') devolvía "Atún en aceite" (244 kcal),
-- 'aceite de oliva' el atún en aceite de oliva y 'salsa de tomate' el atún con
-- salsa de tomate: el mismo problema que "agua" -> atún en agua. Sin fila
-- genérica, la palabra cae en el producto que la contiene. Con alias exacto la
-- fila genérica gana (1,0).
-- Aceites: USDA, 884 kcal / 100 g; 1 cucharada = 13,5 g.
-- Salsa de tomate: Pomarola Italiana Carozzi (Open Food Facts 7802575353047,
-- 3 fichas coinciden: 40 kcal, 1,3 prot, 8,4 carb, 0,1 grasa por 100 g; ODbL).
-- =============================================================================

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado) values
('Aceite vegetal', null, 'grasa',
 '{aceite,aceite vegetal,aceite de maravilla,aceite de girasol,aceite de canola,chorrito de aceite}',
 '1 cucharada (13,5 g)', 13.5, 119.3, 0, 0, 13.5, 'USDA', true),
('Aceite de oliva', null, 'grasa',
 '{aceite de oliva,aceite de oliva extra virgen,aceite oliva}',
 '1 cucharada (13,5 g)', 13.5, 119.3, 0, 0, 13.5, 'USDA', true),
('Salsa de tomate', 'Carozzi', 'preparado',
 '{salsa de tomate,pomarola,salsa pomodoro,salsa de tomates,salsa de tomate casera}',
 '2 cucharadas (40 g)', 40, 16.0, 0.5, 3.4, 0.0, 'Open Food Facts', false);
