export type MealType = 'desayuno' | 'almuerzo' | 'snack' | 'once' | 'cena';

export interface MealItemDraft {
  nombre: string;
  cantidad: number;
  cantidad_g?: number | null;
  kcal: number;
  prot_g: number;
  food_id?: string | null;
  confianza: number;
  fuente: 'base' | 'modelo' | 'frecuente' | 'manual';
}

export interface DayTotals {
  fecha: string;
  kcal: number;
  prot_g: number;
  comidas: number;
}
