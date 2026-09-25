// Browser persistence is separate from the native SecureStore implementation.
// IndexedDB keeps the session across browser restarts without localStorage.
async function access<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('bienva-auth', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('session');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction('session', mode);
      const request = operation(transaction.objectStore('session'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error('Session storage transaction aborted'));
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    return (await access('readonly', store => store.get(key))) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await access('readwrite', store => store.put(value, key));
  },
  async removeItem(key: string): Promise<void> {
    await access('readwrite', store => store.delete(key));
  },
};
