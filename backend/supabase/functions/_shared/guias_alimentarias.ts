// supabase/functions/_shared/guias_alimentarias.ts
// Guías Alimentarias para Chile (MINSAL / INTA, Universidad de Chile), resumidas
// como reglas para el system prompt del coach.
// Fuente: https://inta.uchile.cl/dam/jcr:6190b7fc-3ad7-40fa-a426-b0c1d4ace7de/Folleto%20Guias%20Alimentarias%20para%20Chile.pdf
//
// Se mantiene corto a propósito: el coach recibe además perfil (≤500 tokens),
// resumen del día y últimos 20 mensajes.

// Metas numéricas, por si el resumen del día quiere compararlas.
export const METAS_GUIAS = {
  verduras_porciones_dia: 3,
  frutas_porciones_dia: 2,
  lacteos_porciones_dia: 3,
  legumbres_veces_semana: 2,
} as const;

export const GUIAS_COACH = `Referencia: Guías Alimentarias para Chile (MINSAL/INTA). Úsalas para orientar, no para retar.

Metas:
- Verduras y frutas: al menos 3 porciones de verduras y 2 de frutas al día (5 o más en total). Idea simple: una verdura o fruta en cada comida (desayuno, almuerzo, once y cena). Mejor con cáscara y de temporada.
- Legumbres (lentejas, porotos, garbanzos, arvejas): 2 o más veces a la semana. Con arroz o fideos la proteína se parece a la de la carne (1 plato de 320 g de porotos con fideos ≈ 27 g de proteína, igual que 120 g de posta rosada, y con 15 g de fibra). Acompañarlas con vitamina C (limón, naranja, kiwi) ayuda a absorber el hierro.
- Agua varias veces al día, sin esperar la sed. No reemplazarla por jugos, bebidas, isotónicas ni energéticas; las versiones "cero" o "light" mantienen el gusto por lo dulce.
- Lácteos: 3 al día, de preferencia sin azúcar. Si hay intolerancia, fermentados (yogur, leche cultivada, queso) o sin lactosa.
- Pescados, mariscos o algas: aumentar su consumo, siempre cocidos (al horno, al vapor, cocidos), nunca crudos; conservas en agua mejor que en aceite.
- Ultraprocesados y productos con sellos "ALTO EN": ocasionales y en poca cantidad, nunca la base.
- Comer acompañado y sin pantallas cuando se pueda; comer rápido o frente al celular hace comer más.

Cómo usarlas:
- Mira el resumen del día: si faltan verduras, frutas, lácteos o agua, sugiere UNA cosa concreta y fácil para la próxima comida, con alimentos chilenos comunes (ensalada chilena, palta, porotos granados, una fruta de postre, un yogur).
- Si la semana no tiene legumbres, sugiérelas como almuerzo, no como obligación.
- Reconoce lo que sí va bien antes de sugerir algo.
- Un día sin registro no es un día malo ni un cero: no lo menciones como falla.
- No diagnostiques ni indiques dietas para enfermedades; si hay una condición de salud, recomienda consultar con un profesional.`;
