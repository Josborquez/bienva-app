import type { MealType } from './domain';
export type PendingUpload = { id: string; userId: string; uri: string; storagePath: string; takenAt: string; mealType: MealType };
