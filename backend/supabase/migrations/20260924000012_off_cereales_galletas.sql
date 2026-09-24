-- =============================================================================
-- Migración 012: cereales, avena, arroz, fideos y galletas desde Open Food Facts
-- Generado con tools/openfoodfacts.py (export del 24 sep 2026) y revisado a
-- mano. Datos de Open Food Facts (https://world.openfoodfacts.org), ODbL.
-- Mismos criterios que la 011: sin errores de calidad, kcal que cuadran con los
-- macros, fichas repetidas que coinciden; aliases con marca; verificado = false.
-- Arroz y fideos van en peso CRUDO, como las filas genéricas que ya existen.
-- =============================================================================

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, carb_g, grasa_g, fuente, verificado) values
-- Cereales de desayuno (porción de etiqueta: 3/4 taza = 30 g)
('Corn Flakes',                    'Kellogg''s', 'cereal', '{corn flakes,corn flakes kelloggs,cereal corn flakes}', '3/4 taza (30 g)',  30, 111.6, 1.9, 25.2, 0.3, 'Open Food Facts', false), -- 7702103059451
('Zucaritas',                      'Kellogg''s', 'cereal', '{zucaritas,cereal zucaritas}',                            '3/4 taza (30 g)',  30, 113.7, 1.2, 26.7, 0.2, 'Open Food Facts', false), -- 7702103978134, 7702103130112
('Chocapic',                       'Nestlé',     'cereal', '{chocapic,cereal chocapic}',                              '3/4 taza (30 g)',  30, 111.9, 2.5, 22.4, 1.4, 'Open Food Facts', false), -- 7613034638243, 8445290386496
('Fitness',                        'Nestlé',     'cereal', '{fitness,cereal fitness}',                                '3/4 taza (30 g)',  30,  98.0, 2.9, 20.3, 0.7, 'Open Food Facts', false), -- 7613035652101, 8445291296794
('Corn Flakes',                    'Nestlé',     'cereal', '{corn flakes nestle}',                                    '3/4 taza (30 g)',  30, 108.0, 2.1, 23.1, 0.8, 'Open Food Facts', false), -- 7613287193650
('Trix',                           'Nestlé',     'cereal', '{trix,cereal trix}',                                      '3/4 taza (30 g)',  30, 110.1, 1.8, 26.4, 0.7, 'Open Food Facts', false), -- 7613287354952

-- Avena, granola y barras
('Avena instantánea',              'Quaker',     'cereal', '{avena quaker,quaker}',                                   '30 g',             30, 120.6, 3.9, 20.1, 2.7, 'Open Food Facts', false), -- 7802000014130
('Avena multisemillas',            'Quaker',     'cereal', '{avena multisemillas,avena con semillas}',                '40 g',             40, 150.0, 5.1, 22.0, 3.9, 'Open Food Facts', false), -- 7802000017896, 7802000013546
('Granola avena, almendras y miel', 'Quaker',    'cereal', '{granola,granola quaker}',                                '30 g',             30, 114.0, 2.4, 22.8, 1.1, 'Open Food Facts', false), -- 7802000017803
('Barra de cereal frutilla',       'Quaker',     'snack',  '{barra de cereal,barrita de cereal,barra quaker}',        '1 barra (20 g)',   20,  73.0, 1.0, 13.0, 1.5, 'Open Food Facts', false), -- 7802000004018

-- Arroz y fideos (crudo)
('Arroz blanco (crudo)',           'Tucapel',    'cereal', '{arroz blanco,arroz tucapel,arroz graneado}',             '1/4 taza crudo (50 g)', 50, 163.5, 3.7, 36.2, 0.5, 'Open Food Facts', false), -- 7801420210139, 7801420001850
('Arroz largo ancho (crudo)',      'Miraflores', 'cereal', '{arroz miraflores,arroz largo ancho}',                    '1/4 taza crudo (50 g)', 50, 168.0, 3.4, 37.0, 0.7, 'Open Food Facts', false), -- 7802615006551
('Tallarines (crudo)',             'Carozzi',    'cereal', '{tallarines carozzi,tallarines 87,spaghetti carozzi}',    '80 g crudo',       80, 270.4, 8.8, 55.2, 1.6, 'Open Food Facts', false), -- 7802575004635, 7802575011336
('Tallarines (crudo)',             'Lucchetti',  'cereal', '{tallarines lucchetti,tallarines 77,spaghetti lucchetti}', '80 g crudo',      80, 270.4, 8.0, 56.0, 2.4, 'Open Food Facts', false), -- 7802500000039, 7802500000046
('Spaghetti integral (crudo)',     'Lucchetti',  'cereal', '{spaghetti integral,spaghetti,espagueti}',                '80 g crudo',       80, 256.8, 10.4, 53.6, 2.4, 'Open Food Facts', false), -- 7802500222189

-- Galletas
('Galletas de agua',               'McKay',      'snack',  '{galletas de agua,galletas de agua mckay}',               '6 unidades (29 g)', 29, 124.1, 2.5, 22.1, 2.9, 'Open Food Facts', false), -- 7613287778109
('Galletas soda',                  'Costa',      'snack',  '{soda costa,galletas soda costa}',                        '30 g',             30, 125.0, 2.5, 22.3, 2.9, 'Open Food Facts', false), -- 7802215502026, 7802215511615
('Galletas Criollitas',            'McKay',      'snack',  '{criollitas,galletas criollitas}',                        '24 g',             24,  97.9, 2.0, 17.4, 2.1, 'Open Food Facts', false), -- 7802230082831
('Galletas de arroz',              'Tucapel',    'snack',  '{galletas de arroz,galleta de arroz}',                    '18 g',             18,  66.1, 1.8, 13.9, 0.4, 'Open Food Facts', false), -- 7801420001775, 0841324001775
('Tritón vainilla',                'McKay',      'snack',  '{triton,tritón,galletas triton}',                         '3 galletas (34 g)', 34, 169.7, 1.7, 23.7, 7.5, 'Open Food Facts', false), -- 7802230086952
('Kuky',                           'McKay',      'snack',  '{kuky,galletas kuky}',                                    '1 paquete (40 g)', 40, 197.6, 2.6, 28.6, 8.1, 'Open Food Facts', false), -- 7802950088823
('Frac clásica',                   'Costa',      'snack',  '{frac,galletas frac}',                                    '3 galletas (30 g)', 30, 139.2, 1.4, 20.7, 6.3, 'Open Food Facts', false), -- 7802215512261
('Tuareg coco',                    'Costa',      'snack',  '{tuareg,galletas tuareg}',                                '2 galletas (24 g)', 24, 122.4, 0.8, 16.4, 6.0, 'Open Food Facts', false); -- 7802215502262

-- "avena quaker" pasa a la fila con marca; la genérica se queda con "avena".
update foods set aliases = array_remove(aliases, 'avena quaker')
where nombre = 'Avena instantánea' and marca is null and created_by is null;

-- Galletas soda McKay (semilla 002): 83 kcal calzan con 4 galletas, pero 4
-- galletas pesan ~19 g, no 26 (OFF 7802230086648: 6 galletas = 29 g, 427 kcal/100 g).
update foods set porcion_g = 19.3
where nombre = 'Galletas soda' and marca = 'McKay' and created_by is null and porcion_g = 26;
