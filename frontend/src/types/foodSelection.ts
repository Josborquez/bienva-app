export interface FoodOption {
  key: string;
  foodId: string | null;
  name: string;
  source: 'base' | 'frecuente';
  portion: string | null;
  baseQuantity: number;
  kcal: number;
  protein: number;
  grams: number | null;
}
export interface FoodSelection {
  food: FoodOption;
  quantity: string;
}
