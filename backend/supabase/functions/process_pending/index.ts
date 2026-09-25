// supabase/functions/process_pending/index.ts
// Procesa en lote las fotos de captura rápida (pending_photos) del usuario:
// cada una pasa por la misma lógica de analyze y queda como comida en borrador
// (meals.origen = 'foto', es_borrador = true) para revisar en la app.
//
// POST { limit?: number }   (1–10, por defecto 5)
// → { processed, created_meals, errors: [{ id, error }], stopped? }
//
// - Respeta el tope del plan: si can_analyze_photo da false, se detiene con
//   stopped = 'limite_fotos' sin tocar la foto.
// - Si la IA no está disponible (429/5xx/red) también se detiene, con
//   stopped = 'ia_no_disponible', y deja la foto pendiente para reintentar: un
//   corte transitorio no debe perder fotos.
// - Cualquier otro error de una foto se guarda en pending_photos.error, la foto
//   queda procesada y se sigue con la siguiente.
// Lecturas y escrituras de datos del usuario van con SU cliente (RLS); el de
// service_role solo para el tope, el contador y match_food.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  analyzeMeal, authenticate, canAnalyzePhoto, cors, countPhoto, errorResponse, json,
  ModelUnavailableError, photoFromStorage, type MealType, type ResultItem,
} from "../_shared/analyze.ts";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10; // ~5–10 s por foto; deja margen al límite de ejecución de la función
const TIMEZONE = "America/Santiago";

// Fecha y hora locales de la foto en Santiago.
function santiagoParts(ts: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { fecha: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

// <10 desayuno, 10–15 almuerzo, 15–19 snack, ≥19 cena.
export function mealTypeForHour(hour: number): MealType {
  if (hour < 10) return "desayuno";
  if (hour < 15) return "almuerzo";
  if (hour < 19) return "snack";
  return "cena";
}

async function createDraftMeal(db: SupabaseClient, userId: string, fecha: string, tipo: MealType, fotoPath: string, items: ResultItem[]) {
  const { data: meal, error } = await db.from("meals")
    .insert({ user_id: userId, fecha, tipo, origen: "foto", es_borrador: true, foto_path: fotoPath })
    .select("id").single();
  if (error) throw error;

  const { error: itemsError } = await db.from("meal_items").insert(items.map((it) => ({
    meal_id: meal.id, food_id: it.food_id, nombre: it.nombre, cantidad: it.cantidad > 0 ? it.cantidad : 1,
    cantidad_g: it.cantidad_g, kcal: it.kcal, prot_g: it.prot_g, confianza: it.confianza,
  })));
  if (itemsError) {
    await db.from("meals").delete().eq("id", meal.id); // sin ítems, el borrador no sirve
    throw itemsError;
  }
  return meal.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = await authenticate(req);
    if (!auth) return json({ error: "No autenticado" }, 401);
    const { user, userClient, admin } = auth;

    const raw = await req.text();
    const body = raw.trim() ? JSON.parse(raw) as { limit?: unknown } : {};
    const limit = body.limit ?? DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > MAX_LIMIT) {
      return json({ error: `limit debe ser un entero entre 1 y ${MAX_LIMIT}` }, 400);
    }

    const { data: pending, error } = await userClient.from("pending_photos")
      .select("id, storage_path, tomada_en, tipo_sugerido")
      .eq("user_id", user.id).eq("procesada", false)
      .order("tomada_en", { ascending: true }).limit(limit as number);
    if (error) throw error;

    const created_meals: string[] = [];
    const errors: { id: string; error: string }[] = [];
    let processed = 0;
    let stopped: string | undefined;

    for (const photo of pending ?? []) {
      if (!(await canAnalyzePhoto(admin, user.id))) { stopped = "limite_fotos"; break; }
      try {
        const { fecha, hour } = santiagoParts(photo.tomada_en);
        const tipo: MealType = photo.tipo_sugerido ?? mealTypeForHour(hour);
        const image = await photoFromStorage(userClient, user.id, photo.storage_path);
        const result = await analyzeMeal(admin, { ...image, meal_type: tipo });
        await countPhoto(admin, user.id); // el modelo ya vio la foto: cuenta aunque no haya alimentos
        if (!result.items.length) throw new Error("No encontramos alimentos en la foto");

        const mealId = await createDraftMeal(userClient, user.id, fecha, tipo, photo.storage_path, result.items);
        const { error: markError } = await userClient.from("pending_photos")
          .update({ procesada: true, meal_id: mealId, error: null }).eq("id", photo.id);
        if (markError) throw markError;
        created_meals.push(mealId);
        processed++;
      } catch (e) {
        if (e instanceof ModelUnavailableError) { stopped = "ia_no_disponible"; break; }
        const message = e instanceof Error ? e.message : String(e);
        console.error(`process_pending foto ${photo.id}: ${message}`);
        await userClient.from("pending_photos").update({ procesada: true, error: message.slice(0, 500) }).eq("id", photo.id);
        errors.push({ id: photo.id, error: message });
        processed++;
      }
    }

    console.log(`process_pending user=${user.id} processed=${processed} meals=${created_meals.length} errors=${errors.length} stopped=${stopped ?? "-"}`);
    return json({ processed, created_meals, errors, ...(stopped ? { stopped } : {}) });
  } catch (e) {
    return errorResponse(e);
  }
});
