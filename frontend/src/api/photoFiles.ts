import { Directory, File, Paths } from 'expo-file-system';

export async function cachePhoto(uri: string, userId: string, id: string) {
  const directory = new Directory(Paths.cache, 'pendingUploads', userId);
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, `${id}.jpg`);
  new File(uri).copy(destination);
  return destination.uri;
}
export async function photoBytes(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}
export async function removeCachedPhoto(uri: string) {
  if (!uri.startsWith(new Directory(Paths.cache, 'pendingUploads').uri.replace(/\/?$/, '/'))) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
