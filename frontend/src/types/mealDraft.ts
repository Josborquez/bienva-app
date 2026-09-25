import type { MealType } from './domain';
import type { FoodSelection } from './foodSelection';
import type { Enums } from './database';

export interface EditableItem {
  id: string;
  nombre: string;
  cantidad: string;
  cantidad_g: number | null;
  kcal: string;
  prot_g: string;
  food_id: string | null;
  confianza: number;
  fuente: 'base' | 'modelo' | 'frecuente';
  edited: boolean;
  confirmed: boolean;
}
export interface MealDraft {
  id: string;
  fecha: string;
  tipo: MealType;
  text: string;
  items: EditableItem[];
  origin?: Enums<'meal_origin'>;
  entryMode?: 'frecuentes' | 'texto';
  selections?: FoodSelection[];
}
