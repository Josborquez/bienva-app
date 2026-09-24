-- =============================================================================
-- Migración 011: lácteos y panes de marcas comunes, desde Open Food Facts
-- Generado con tools/openfoodfacts.py (export del 24 sep 2026) y revisado a
-- mano. Datos de Open Food Facts (https://world.openfoodfacts.org), licencia
-- ODbL: la app debe atribuir "Datos de Open Food Facts, ODbL".
--
-- Criterios: solo fichas sin errores de calidad, con kcal que cuadran con los
-- macros y, cuando hay varias fichas del mismo producto, que coincidan entre sí.
-- Valores por 100 g/ml escalados a la porción del envase. Son datos de la
-- comunidad: verificado = false hasta contrastar con la etiqueta.
-- Aliases siempre con la marca, para no quitarle las búsquedas genéricas
-- ("leche", "pan", "queso", "pan de completo") a las filas genéricas.
-- Panes de molde: OFF da la porción de 2 rebanadas; se guarda 1 rebanada.
-- =============================================================================

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado) values
-- Leches (1 vaso = 200 ml)
('Leche semidescremada',               'Colun',   'lacteo', '{leche semidescremada colun,leche semi colun}',        '1 vaso (200 ml)', 200,  84.0,  6.4,  9.2, 2.4, 'Open Food Facts', false), -- 7802920000091
('Leche entera',                        'Colun',   'lacteo', '{leche entera colun}',                                  '1 vaso (200 ml)', 200, 118.0,  6.2,  9.2, 6.2, 'Open Food Facts', false), -- 7802920777542
('Leche descremada',                    'Colun',   'lacteo', '{leche descremada colun}',                              '1 vaso (200 ml)', 200,  68.0,  6.6,  9.4, 0.2, 'Open Food Facts', false), -- 7802920106168, 7802920000084, 7802920009339
('Leche semidescremada',               'Soprole', 'lacteo', '{leche semidescremada soprole,leche semi soprole}',    '1 vaso (200 ml)', 200,  90.0,  6.4,  9.2, 3.0, 'Open Food Facts', false), -- 7802900001292
('Leche descremada',                    'Soprole', 'lacteo', '{leche descremada soprole}',                            '1 vaso (200 ml)', 200,  64.0,  6.6,  9.2, 0.2, 'Open Food Facts', false), -- 7802900001346
('Leche semidescremada con chocolate', 'Colun',   'lacteo', '{leche chocolate colun,leche con chocolate colun}',    '1 vaso (200 ml)', 200, 156.0,  6.2, 25.6, 3.2, 'Open Food Facts', false), -- 7802920007182, 7802920007120

-- Yoghurts
('Yoghurt batido frutilla',             'Soprole', 'lacteo', '{yoghurt batido soprole,yogurt frutilla soprole}',     '1 pote (120 g)',  120, 100.8,  3.7, 15.5, 2.6, 'Open Food Facts', false), -- 7802900392024
('Yoghurt batido frutilla',             'Colun',   'lacteo', '{yoghurt batido colun,yogurt frutilla colun}',         '1 pote (125 g)',  125, 100.0,  4.4, 15.5, 2.3, 'Open Food Facts', false), -- 7802920000930, 7802920242514
('Yoghurt light batido',                'Colun',   'lacteo', '{yoghurt light colun,yogurt light colun}',             '1 pote (125 g)',  125,  66.0,  5.6, 10.6, 0.1, 'Open Food Facts', false), -- 7802920002736, 7802920000909
('Yoghurt Protein Plus natural endulzado', 'Colun', 'lacteo', '{protein plus natural,yogurt protein plus natural}',  '1 sachet (150 g)', 150,  84.0, 11.1,  8.4, 0.3, 'Open Food Facts', false), -- 7802920011400 (cuadra con etiqueta Jumbo)
('Yoghurt Protein Plus frutilla',       'Colun',   'lacteo', '{protein plus frutilla,yogurt protein plus frutilla}', '1 sachet (150 g)', 150, 120.0, 11.1, 17.9, 0.5, 'Open Food Facts', false), -- 7802920009391, 7802920009384
('Yoghurt griego light',                'Colun',   'lacteo', '{yogurt griego,yoghurt griego colun}',                 '1 pote (120 g)',  120,  82.0,  8.9, 12.1, 0.4, 'Open Food Facts', false), -- 7802920008172

-- Quesos y untables
('Quesillo',                            'Colun',   'lacteo', '{quesillo colun,mi quesillo}',                         '1 rebanada (30 g)', 30,  41.4,  3.9,  1.4, 2.3, 'Open Food Facts', false), -- 7802920002293 (la otra ficha trae 7,5 g prot y no cuadra con sus kcal)
('Queso gauda laminado',                'Colun',   'lacteo', '{queso gauda,gauda colun,queso laminado}',             '33 g',              33, 113.5,  7.6,  0.0, 9.2, 'Open Food Facts', false), -- 7802920777498
('Queso crema',                         'Colun',   'lacteo', '{queso crema,queso crema colun}',                      '1 cucharada (15 g)', 15,  45.8,  1.8,  0.6, 4.1, 'Open Food Facts', false), -- 7802920006529
('Mantequilla con sal',                 'Colun',   'lacteo', '{mantequilla,mantequilla colun}',                      '1 porción (7 g)',    7,  52.0,  0.0,  0.0, 5.7, 'Open Food Facts', false), -- 7802920001326

-- Panes Castaño
('Pan blanco de molde',                 'Castaño', 'cereal', '{pan blanco castaño,molde blanco castaño}',            '1 rebanada',      26.5,  72.1,  2.3, 13.0, 1.2, 'Open Food Facts', false), -- 7803468003483 (53 g = 2 rebanadas)
('Pan integral multigrano',             'Castaño', 'cereal', '{pan multigrano,multigrano castaño}',                  '1 rebanada',      25,    64.3,  3.0, 10.6, 1.3, 'Open Food Facts', false), -- 7803468001762 (50 g = 2 rebanadas)
('Pan hot dog',                         'Castaño', 'cereal', '{pan hot dog castaño,pan completo castaño}',           '1 unidad',        60,   160.0,  5.4, 30.2, 2.0, 'Open Food Facts', false), -- 7803468004756, 7803468001427
('Pan hamburguesa',                     'Castaño', 'cereal', '{pan hamburguesa castaño}',                            '1 unidad',        58,   158.0,  5.3, 28.3, 2.6, 'Open Food Facts', false), -- 7803468004640, 7803468002905
('Pan pita',                            'Castaño', 'cereal', '{pan pita,pita castaño}',                              '1 unidad',        38,    91.0,  3.4, 17.9, 0.4, 'Open Food Facts', false); -- 7803468002516
