import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { quickPhotoMealType, photoStoragePath, photoResize, PhotoAnalysisError } from '../src/utils/photos.ts';
import { requestImageAnalysis } from '../src/api/imageAnalysis.ts';
import { uploadPhotoRecord } from '../src/api/photoUpload.ts';
import type { Database } from '../src/types/database.ts';

test('quick photo meal type respects every local hour boundary, including 19:00', () => {
  for (const [hour, expected] of [[0, 'desayuno'], [9, 'desayuno'], [10, 'almuerzo'], [14, 'almuerzo'], [15, 'snack'], [18, 'snack'], [19, 'cena'], [23, 'cena']] as const) assert.equal(quickPhotoMealType(hour), expected);
});
test('photo path is stable and scoped to its user; landscape and portrait stay within 1024', () => {
  assert.equal(photoStoragePath('user-a', 'photo-b'), 'user-a/photo-b.jpg');
  assert.throws(() => photoStoragePath('../user-a', 'photo-b'));
  assert.throws(() => photoStoragePath('user-a', 'other/photo-b'));
  assert.deepEqual(photoResize(4000, 3000), [{ resize: { width: 1024 } }]);
  assert.deepEqual(photoResize(3000, 4000), [{ resize: { height: 1024 } }]);
  assert.deepEqual(photoResize(640, 480), []);
});
test('image analysis sends JPEG base64 and retains base food references for the editor', async () => {
  const client = createClient<Database>('https://photo-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      assert.equal(new URL(String(input)).pathname, '/functions/v1/analyze');
      assert.deepEqual(JSON.parse(String(init?.body)), { image_base64: 'test-image', mime_type: 'image/jpeg', meal_type: 'almuerzo', fecha: '2026-09-25' });
      return Response.json({ items: [{ nombre: 'Arroz', cantidad: 1, cantidad_g: 100, kcal: 130, prot_g: 2.7, food_id: 'food-1', confianza: 0.9, fuente: 'base' }] });
    } },
  });
  try {
    const items = await requestImageAnalysis(client, 'test-image', 'almuerzo', '2026-09-25');
    assert.equal(items[0].fuente, 'base'); assert.equal(items[0].food_id, 'food-1');
  } finally { await client.auth.dispose(); }
});
test('analyze handles 429 limite_fotos, 413 and empty items without confusing unrelated limits', async () => {
  for (const [status, body, expected] of [[429, { error: 'limite_fotos' }, 'limit'], [413, {}, 'tooLarge'], [200, { items: [] }, 'empty'], [429, { error: 'other_limit' }, 'failed']] as const) {
    const client = createClient<Database>('https://photo-test.supabase.co', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async () => Response.json(body, { status }) },
    });
    try { await assert.rejects(requestImageAnalysis(client, 'image', 'cena', '2026-09-25'), error => error instanceof PhotoAnalysisError && error.code === expected); }
    finally { await client.auth.dispose(); }
  }
});
test('quick upload retries use the same JPEG path and pending ID without resetting processing state', async () => {
  const pendingBodies: Record<string, unknown>[] = [];
  const paths: string[] = [];
  const client = createClient<Database>('https://photo-test.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input)); paths.push(url.pathname);
      if (url.pathname.startsWith('/storage/')) {
        assert.equal(new Headers(init?.headers).get('content-type'), 'image/jpeg');
        return Response.json({ Key: 'user-a/photo-b.jpg' });
      }
      assert.equal(url.searchParams.get('on_conflict'), 'id');
      assert.match(new Headers(init?.headers).get('prefer') ?? '', /ignore-duplicates/);
      pendingBodies.push(JSON.parse(String(init?.body)));
      if (pendingBodies.length === 1) return Response.json({ message: 'connection lost after storage upload' }, { status: 503 });
      return new Response(null, { status: 201 });
    } },
  });
  try {
    const photo = { id: 'photo-b', userId: 'user-a', uri: 'cache.jpg', storagePath: photoStoragePath('user-a', 'photo-b'), takenAt: '2026-09-25T22:00:00Z', mealType: 'cena' as const };
    await assert.rejects(uploadPhotoRecord(client, photo, new ArrayBuffer(1)));
    await uploadPhotoRecord(client, photo, new ArrayBuffer(1));
    assert.equal(paths[0], '/storage/v1/object/meal-photos/user-a/photo-b.jpg');
    assert.deepEqual(pendingBodies[0], pendingBodies[1]);
    assert.equal(pendingBodies[0].id, 'photo-b');
    assert.equal(Object.hasOwn(pendingBodies[0], 'procesada'), false);
  } finally { await client.auth.dispose(); }
});
