async function access<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('bienva-photo-cache', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction('photos', mode);
      const request = operation(transaction.objectStore('photos'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
export async function cachePhoto(uri: string, userId: string, id: string) {
  const bytes = await (await fetch(uri)).arrayBuffer();
  const key = `photo-cache:${userId}/${id}`;
  await access('readwrite', store => store.put(bytes, key));
  return key;
}
export async function photoBytes(uri: string): Promise<ArrayBuffer> {
  const bytes = await access<ArrayBuffer | undefined>('readonly', store => store.get(uri));
  if (!bytes) throw new Error('Cached photo missing');
  return bytes;
}
export async function removeCachedPhoto(uri: string) { await access('readwrite', store => store.delete(uri)); }
