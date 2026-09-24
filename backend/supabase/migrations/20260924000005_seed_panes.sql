-- =============================================================================
-- Migración 005: panes clásicos de Chile
-- Lista tomada de la panadería de Tomás Moro (delivery.tomasmoro.cl, sep 2026).
-- La página no publica información nutricional: kcal y proteína son valores
-- típicos por 100 g de cada tipo de pan, escalados al peso habitual de la
-- unidad. Por eso fuente = 'estimación' y verificado = false hasta contrastar
-- con etiqueta.
-- =============================================================================

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, fuente, verificado) values
('Marraqueta',            null, 'cereal', '{marraqueta,pan batido,pan francés,dobladita,pan}',  '1 unidad',   100, 270, 8.5, 'estimación', false),
('Hallulla',              null, 'cereal', '{hallulla,hayulla,hallullita,pan hallulla}',         '1 unidad',    90, 270, 7.2, 'estimación', false),
('Hallulla integral',     null, 'cereal', '{hallulla integral,hallullita integral}',            '1 unidad',    90, 257, 8.6, 'estimación', false),
('Frica chica',           null, 'cereal', '{frica,pan frica,pan de hamburguesa chico}',         '1 unidad',    45, 128, 3.8, 'estimación', false),
('Frica grande',          null, 'cereal', '{frica grande,pan de hamburguesa,pan de completo}', '1 unidad',    80, 228, 6.8, 'estimación', false),
('Pan italiano',          null, 'cereal', '{italiano,pan italiano}',                            '1 unidad',    70, 189, 6.3, 'estimación', false),
('Pan lengua',            null, 'cereal', '{lengua,pan lengua,pan de lengua}',                  '1 unidad',    70, 196, 6.0, 'estimación', false),
('Cachito',               null, 'cereal', '{cachito,cachitos,medialuna}',                       '1 unidad',    60, 240, 4.5, 'estimación', false),
('Pan de molde blanco',   null, 'cereal', '{pan de molde,molde blanco,pan blanco de molde}',   '1 rebanada',  25,  66, 2.1, 'estimación', false),
('Pan de molde integral', null, 'cereal', '{molde integral,pan de molde integral}',            '1 rebanada',  28,  70, 2.8, 'estimación', false),
('Pan canapé',            null, 'cereal', '{canapé,pan de canapé,pan canape}',                  '1 rebanada',  12,  32, 1.0, 'estimación', false);
