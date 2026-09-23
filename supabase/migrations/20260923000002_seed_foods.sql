-- =============================================================================
-- App de Alimentos — Semilla de alimentos frecuentes (Chile)
-- Migración 002. Valores por porción indicada. Fuente: base de alimentos
-- frecuentes del registro nutricional (abril 2026); marcar verificado=true
-- solo cuando se contraste con etiqueta o fuente oficial.
-- =============================================================================

insert into foods (nombre, marca, categoria, aliases, porcion_desc, porcion_g, kcal, prot_g, fuente, verificado) values

-- Proteínas
('Pechuga de pollo sin piel',        null,                'proteina', '{pechuga,pollo a la plancha,pollo cocido}', '100 g',        100,  164, 31, 'FatSecret Chile', true),
('Carne al jugo (posta)',            null,                'proteina', '{posta,carne al jugo,posta al jugo}',       '200 g',        200,  290, 50, 'estimación',      false),
('Lomo vetado',                      null,                'proteina', '{lomo,bife}',                               '100 g',        100,  200, 22, 'FatSecret Chile', false),
('Pulpa de cerdo',                   null,                'proteina', '{cerdo,chancho,pulpa}',                     '100 g',        100,  155, 18, 'FatSecret Chile', false),
('Pata de pollo asada con piel',     null,                'proteina', '{trutro,pata de pollo,muslo}',              '1 unidad',     120,  215, 25, 'estimación',      false),
('Huevo frito',                      null,                'proteina', '{huevo}',                                   '1 unidad',     50,   108,  6, 'USDA',            true),
('Huevo revuelto en aceite',         null,                'proteina', '{huevos revueltos,revuelto}',               '1 unidad',     50,    98,  6, 'estimación',      false),
('Huevo a la copa',                  null,                'proteina', '{huevo cocido,huevo duro,huevo pasado}',    '1 unidad',     50,    70,  6, 'USDA',            true),
('Atún en agua',                     'Robinson Crusoe',   'proteina', '{atun,atún lomitos,lata de atún}',          '1 lata',       120,  100, 22, 'etiqueta',        true),
('Atún en agua',                     null,                'proteina', '{atun,atún en agua,lata de atún}',          '1 lata',       96,   111, 25, 'etiqueta',        false),
('Quesito blanco / queso fresco',    null,                'lacteo',   '{quesillo,queso fresco,quesito}',           '100 g',        100,  145, 20, 'FatSecret Chile', false),
('Queso mantecoso',                  null,                'lacteo',   '{mantecoso,queso}',                         '30 g',         30,   105,  7, 'FatSecret Chile', false),

-- Lácteos y proteicos
('Yogurt Protein+',                  'Soprole',           'lacteo',   '{yogurt proteico,soprole protein,yogurt proteina}', '1 unidad', 155, 105, 15, 'etiqueta', true),
('Yogurt Protein Plus',              'Colun',             'lacteo',   '{yogurt proteico,colun protein,yogurt proteina}',   '1 unidad', 190, 165, 18, 'etiqueta', true),
('Barra Wild Protein',               'Wild Foods',        'snack',    '{wild protein,barra proteica,barra wild}',  '1 barra',      45,   170, 15, 'etiqueta',        true),
('Leche descremada',                 null,                'lacteo',   '{leche,leche light,leche sin grasa}',       '200 ml',       200,   70,  7, 'etiqueta',        true),

-- Cereales y panes
('Avena instantánea',                null,                'cereal',   '{avena,avena quaker}',                      '60 g',         60,   230,  8, 'etiqueta',        true),
('Arroz integral (crudo)',           null,                'cereal',   '{arroz,arroz integral}',                    '80 g crudo',   80,   288,  6, 'USDA',            true),
('Fideos integrales (crudo)',        'Carozzi',           'cereal',   '{fideos,pasta integral,tallarines integrales}', '80 g crudo', 80, 250, 10, 'etiqueta',       true),
('Pan integral',                     'Castaño',           'cereal',   '{pan integral,rebanada pan,pan de molde}',  '1 rebanada',   28,    62,  3, 'etiqueta',        true),
('Tortilla integral',                null,                'cereal',   '{tortilla,tortilla de harina,wrap}',        '1 unidad',     40,   122,  4, 'etiqueta',        false),
('Galletas soda',                    'McKay',             'cereal',   '{galletas soda,galletas de soda,soda}',     '4 unidades',   26,    83,  2, 'etiqueta',        true),

-- Legumbres y preparados
('Lentejas guisadas con verduras',   null,                'preparado','{lentejas,guiso de lentejas}',              '200 g',        200,  230, 15, 'estimación',      false),
('Garbanzos cocidos',                null,                'legumbre', '{garbanzos}',                               '60 g',         60,    98,  5, 'USDA',            true),
('Tortilla de acelga',               null,                'preparado','{tortilla acelga}',                         '1 porción',    100,  101,  6, 'estimación',      false),
('Tortilla de espinaca y huevo',     null,                'preparado','{tortilla espinaca}',                       '1 porción',    96,   154, 11, 'estimación',      false),

-- Verduras
('Brócoli cocido',                   null,                'verdura',  '{brocoli,brócoli}',                         '160 g',        160,   56,  4, 'USDA',            true),
('Tomate picado',                    null,                'verdura',  '{tomate}',                                  '150 g',        150,   27,  1, 'USDA',            true),
('Lechuga',                          null,                'verdura',  '{lechuga,ensalada verde}',                  '10 hojas',     100,   10,  1, 'USDA',            true),

-- Frutas
('Palta entera',                     null,                'fruta',    '{palta,aguacate}',                          '1 unidad',     170,  270,  3, 'USDA',            true),
('Plátano',                          null,                'fruta',    '{platano,banana}',                          '1 unidad',     118,  105,  1, 'USDA',            true),
('Manzana pequeña',                  null,                'fruta',    '{manzana}',                                 '1 unidad',     130,   70,  0, 'USDA',            true),
('Manzana cocida',                   null,                'fruta',    '{manzana cocida,compota}',                  '200 g',        200,  110,  0, 'estimación',      false),
('Arándanos',                        null,                'fruta',    '{arandanos,blueberries}',                   '40 g',         40,    23,  0, 'USDA',            true),
('Mix frutas rojas',                 null,                'fruta',    '{frutos rojos,berries,frutas rojas}',       '100 g',        100,   55,  1, 'USDA',            true),

-- Comida rápida y snacks
('Fajita de pollo',                  'KFC',               'preparado','{fajita kfc,fajita pollo,kfc}',             '1 unidad',     null, 350, 28, 'estimación',      false),
('Barros Jarpa',                     'Daily Fresh',       'preparado','{barros jarpa,sandwich barros jarpa}',      '1 unidad',     130,  391, 14, 'etiqueta',        true),
('Brauni Choc',                      'Nutrabien',         'snack',    '{brauni,brownie nutrabien,nutrabien}',      '1 unidad',     35,   175,  2, 'etiqueta',        true),
('Brownie casero',                   null,                'snack',    '{brownie}',                                 '100 g',        100,  430,  6, 'estimación',      false),
('Maní japonés',                     null,                'snack',    '{mani japones,maní,mani}',                  '50 g',         50,   250,  9, 'etiqueta',        false),

-- Bebidas
('Cerveza',                          'Miller',            'bebida',   '{cerveza,miller,chela}',                    '355 ml',       355,  140,  1, 'etiqueta',        true),
('Red Bull',                         'Red Bull',          'bebida',   '{redbull,energética,energetica}',           '250 ml',       250,  110,  0, 'etiqueta',        true),
('Gatorlit Recover',                 'Gatorlit',          'bebida',   '{gatorlit,isotónica,isotonica}',            '591 ml',       591,   50,  0, 'etiqueta',        true),
('Bebida regular',                   null,                'bebida',   '{bebida,coca cola,sprite,fanta,gaseosa}',   '200 ml',       200,   85,  0, 'etiqueta',        true),
('Bebida zero',                      null,                'bebida',   '{coca zero,sprite zero,bebida zero,light}', 'cualquier',    null,   0,  0, 'etiqueta',        true),
('Té o mate sin azúcar',             null,                'bebida',   '{te,té,mate,agua de hierbas}',              '1 taza',       250,    2,  0, 'USDA',            true);

-- Prueba rápida de búsqueda difusa
-- select nombre, marca, porcion_desc, kcal, prot_g from search_foods('yogur proteina');
-- select nombre, marca, porcion_desc, kcal, prot_g from search_foods('platano');
