-- =============================================================================
-- Migración 009: pechuga deshuesada Super Pollo (cruda), desde la etiqueta
-- Fuente: ficha de producto en jumbo.cl (bandeja 850 g), tabla nutricional por
-- 100 g: 97 kcal, 20,9 g proteína, 1,3 g grasa, 0,5 g carbohidratos, 111 mg
-- sodio. Sin sellos "ALTO EN".
-- Es peso CRUDO; "Pechuga de pollo sin piel" (164 kcal / 31 g) de la migración
-- 002 es cocida. Sin el alias genérico "pechuga" para que "pollo a la plancha"
-- siga devolviendo la cocida.
-- =============================================================================

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado) values
('Pechuga de pollo deshuesada cruda', 'Super Pollo', 'proteina',
 '{pechuga cruda,pechuga super pollo,pechuga deshuesada,pollo crudo}',
 '100 g', 100, 97, 20.9, 0.5, 1.3, 'etiqueta', true);
