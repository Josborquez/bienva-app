// supabase/functions/analyze/index.ts
// Analiza una comida y devuelve los ítems listos para confirmar en la app.
// Tres modos (uno por pedido):
//   { text }                         texto libre; no cuenta para el tope de fotos
//   { image_base64, mime_type? }     foto enviada en el cuerpo
//   { photo_path }                   foto ya subida a Storage (meal-photos/<user_id>/…)
// La lógica compartida (modelos, cruce con foods, tope) vive en _shared/analyze.ts.
//
// Deploy:  supabase functions deploy analyze
// Secrets: GEMINI_API_KEY, GEMINI_MODEL, ANTHROPIC_API_KEY (ver README)

import {
  analyzeMeal, authenticate, canAnalyzePhoto, cors, countPhoto, errorResponse, json,
  MEAL_TYPES, photoFromStorage, type AnalyzeInput, type MealType,
} from "../_shared/analyze.ts";

interface AnalyzeRequest {
  text?: string;
  image_base64?: string;
  mime_type?: string;
  photo_path?: string;
  meal_type?: MealType;
  fecha?: string;             // YYYY-MM-DD; lo usa la app, no el contador de fotos
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = await authenticate(req);
    if (!auth) return json({ error: "No autenticado" }, 401);
    const { user, userClient, admin } = auth;

    const body = (await req.json()) as AnalyzeRequest;
    const modes = [body.text, body.image_base64, body.photo_path].filter(Boolean).length;
    if (modes === 0) return json({ error: "Falta text, image_base64 o photo_path" }, 400);
    if (modes > 1) return json({ error: "Envía solo uno: text, image_base64 o photo_path" }, 400);
    if (body.meal_type && !MEAL_TYPES.includes(body.meal_type)) {
      return json({ error: `meal_type inválido; usa ${MEAL_TYPES.join(", ")}` }, 400);
    }

    // Tope del plan free: solo para fotos (el texto es gratis).
    const isPhoto = Boolean(body.image_base64 || body.photo_path);
    if (isPhoto && !(await canAnalyzePhoto(admin, user.id))) {
      return json({ error: "limite_fotos", message: "Llegaste al tope de fotos de hoy" }, 429);
    }

    const input: AnalyzeInput = { text: body.text, image_base64: body.image_base64, mime_type: body.mime_type, meal_type: body.meal_type };
    if (body.photo_path) Object.assign(input, await photoFromStorage(userClient, user.id, body.photo_path));

    const t0 = Date.now();
    const { modelo, ...result } = await analyzeMeal(admin, input);
    console.log(`analyze modelo=${modelo} items=${result.items.length} modo=${body.photo_path ? "photo_path" : body.image_base64 ? "image_base64" : "text"}`);

    if (isPhoto) await countPhoto(admin, user.id);
    return json({ ...result, ms: Date.now() - t0 });
  } catch (e) {
    return errorResponse(e);
  }
});
