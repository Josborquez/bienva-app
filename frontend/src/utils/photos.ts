import type { MealType } from '../types/domain.ts';

export function quickPhotoMealType(hour: number): MealType {
  return hour < 10 ? 'desayuno' : hour < 15 ? 'almuerzo' : hour < 19 ? 'snack' : 'cena';
}
export function photoStoragePath(userId: string, id: string) {
  if (![userId, id].every(value => /^[a-zA-Z0-9-]+$/.test(value))) throw new Error('Invalid photo path');
  return `${userId}/${id}.jpg`;
}
export function photoResize(width: number, height: number) {
  if (!(width > 0 && height > 0)) throw new Error('Invalid image size');
  // Both dimensions stay within 1024, including portrait photos.
  return Math.max(width, height) <= 1024 ? [] : [{ resize: width >= height ? { width: 1024 } : { height: 1024 } }];
}
export type PhotoErrorCode = 'limit' | 'tooLarge' | 'empty' | 'failed';
export class PhotoAnalysisError extends Error {
  code: PhotoErrorCode;
  constructor(code: PhotoErrorCode) { super(code); this.code = code; }
}
export async function photoFunctionError(error: unknown): Promise<PhotoAnalysisError> {
  const response = error && typeof error === 'object' && 'context' in error ? error.context : null;
  if (response instanceof Response) {
    if (response.status === 413) return new PhotoAnalysisError('tooLarge');
    if (response.status === 429) {
      const body = await response.clone().json().catch(() => null);
      if (body?.error === 'limite_fotos') return new PhotoAnalysisError('limit');
    }
  }
  return new PhotoAnalysisError('failed');
}
