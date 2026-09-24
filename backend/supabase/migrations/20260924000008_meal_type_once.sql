-- =============================================================================
-- Migración 008: agrega "once" a meal_type
-- La once es una comida propia en Chile (las Guías Alimentarias para Chile
-- nombran desayuno, almuerzo, once y cena). Va antes de cena para que el orden
-- del enum siga el orden del día.
-- =============================================================================

alter type meal_type add value if not exists 'once' before 'cena';
