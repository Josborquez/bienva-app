-- =============================================================================
-- Migración: nombres y alias de las sopas Maggi para que no capturen platos
-- Tras la 160000, match_food('arroz con pollo') devolvía "Sopa de pollo con
-- arroz · Maggi" (0,67) y 'sopa de pollo' la de fideos (0,56): un almuerzo o una
-- cazuela quedaban como 48 kcal de sopa de sobre. Con "Sopa instantánea …" el
-- puntaje contra esos platos baja a 0,15–0,38 y se siguen encontrando por
-- "sopa instantánea" (0,55–0,57), "sopa maggi" o "sopa de sobre".
-- =============================================================================

update foods set nombre = 'Sopa instantánea pollo fideos',
  aliases = '{sopa maggi,sopa instantanea,sopa de sobre,maggi pollo fideos}'
where nombre = 'Sopa de pollo con fideos' and marca = 'Maggi' and created_by is null;

update foods set nombre = 'Sopa instantánea pollo arroz',
  aliases = '{maggi pollo arroz,sopa instantanea pollo arroz}'
where nombre = 'Sopa de pollo con arroz' and marca = 'Maggi' and created_by is null;

update foods set nombre = 'Sopa instantánea caracolitos',
  aliases = '{sopa caracolitos,maggi caracolitos}'
where nombre = 'Sopa de caracolitos' and marca = 'Maggi' and created_by is null;
