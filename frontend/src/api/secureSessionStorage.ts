// SecureStore values can exceed the iOS per-item size limit for a full JWT session.
// Encode to ASCII and commit a manifest last, keeping the previous session readable
// until every new chunk is persisted. All session data remains in SecureStore.
interface SecureStorage {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}
interface Manifest { revision: string; count: number }
const chunkSize = 1800;

export function createSecureSessionStorage(storage: SecureStorage) {
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  };
  const readManifest = async (key: string): Promise<Manifest | null> => {
    const raw = await storage.getItemAsync(key);
    if (!raw) return null;
    const manifest = JSON.parse(raw) as Manifest;
    if (!/^[a-z0-9-]+$/.test(manifest.revision) || !Number.isInteger(manifest.count) || manifest.count < 1 || manifest.count > 1000) {
      throw new Error('Invalid secure session manifest');
    }
    return manifest;
  };
  const chunkKey = (key: string, revision: string, index: number) => `${key}.${revision}.${index}`;
  const cleanup = async (key: string, manifest: Manifest | null) => {
    if (!manifest) return;
    await Promise.all(Array.from({ length: manifest.count }, (_, i) => storage.deleteItemAsync(chunkKey(key, manifest.revision, i))));
  };
  return {
    getItem: (key: string) => serial(async () => {
      const manifest = await readManifest(key);
      if (!manifest) return null;
      const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => storage.getItemAsync(chunkKey(key, manifest.revision, i))));
      if (chunks.some(chunk => chunk === null)) throw new Error('Incomplete secure session');
      return decodeURIComponent(chunks.join(''));
    }),
    setItem: (key: string, value: string) => serial(async () => {
      const previous = await readManifest(key);
      const encoded = encodeURIComponent(value);
      const manifest = { revision: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count: Math.max(1, Math.ceil(encoded.length / chunkSize)) };
      try {
        for (let i = 0; i < manifest.count; i++) {
          await storage.setItemAsync(chunkKey(key, manifest.revision, i), encoded.slice(i * chunkSize, (i + 1) * chunkSize));
        }
        await storage.setItemAsync(key, JSON.stringify(manifest));
      } catch (error) {
        await cleanup(key, manifest).catch(() => undefined);
        throw error;
      }
      await cleanup(key, previous).catch(() => undefined);
    }),
    removeItem: (key: string) => serial(async () => {
      const manifest = await readManifest(key);
      await storage.deleteItemAsync(key);
      await cleanup(key, manifest);
    }),
  };
}
