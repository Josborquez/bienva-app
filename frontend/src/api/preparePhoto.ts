import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { photoResize } from '../utils/photos';

export type SourcePhoto = { uri: string; width: number; height: number };
export async function preparePhoto(photo: SourcePhoto, base64: boolean) {
  return manipulateAsync(photo.uri, photoResize(photo.width, photo.height), { compress: 0.8, format: SaveFormat.JPEG, base64 });
}
