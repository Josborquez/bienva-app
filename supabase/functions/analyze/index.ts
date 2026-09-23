// supabase/functions/analyze/index.ts
// Recibe una foto (base64) o texto, pide a Gemini un JSON estricto con los
// alimentos y porciones, cruza cada ítem contra la tabla foods y devuelve
// los ítems listos para confirmar en la app.
//
// Deploy:  supabase functions deploy analyze
// Secrets: supabase secrets set GEMINI_API_KEY=...  GEMINI_MODEL=gemini-2.5-flash

import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type MealType = "desayuno" | "almuerzo" | "snack" | "cena";

interface AnalyzeRequest {
  image_base64?: string;      // JPEG/PNG ya redimensionado a ≤1024 px
  mime_type?: string;         // "image/jpeg" por defecto
  text?: string;              // "2 huevos revueltos y pan con palta"
  meal_type?: MealType;
  fecha?: string;             // YYYY-MM-DD, por defecto hoy
}

interface GeminiItem {
  nombre: string;
  cantidad: number;           // unidades o multiplicador ("2 huevos" → 2)
  cantidad_g: number | null;  // gramos estimados de la porción total
  kcal: number;
  prot_g: number;
  confianza: number;          // 0–1
}

interface ResultItem extends GeminiItem {
  food_id: string | null;
  match_nombre: string | null;
  fuente: "base" | "modelo";  // de dónde salieron los números finales
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Eres un nutricionista chileno experto en estimar porciones.
Analiza la comida y devuelve SOLO JSON con este esquema exacto:
{"items":[{"nombre":string,"cantidad":number,"cantidad_g":number|null,"kcal":number,"prot_g":number,"confianza":number}]}

Reglas:
- Usa nombres chilenos y genéricos: "marraqueta", "palta", "completo", "sopaipilla", "pan de molde integral". Si ves una marca clara (Soprole, Colun, Carozzi, McKay), inclúyela en el nombre.
- Una fila por alimento distinto. "Pan con palta" son dos filas: pan y palta.
- cantidad: unidades cuando aplica (2 huevos → 2, 1 lata → 1); si es a granel usa 1 y pon los gramos en cantidad_g.
- kcal y prot_g son para la cantidad TOTAL indicada, no por 100 g.
- confianza: 0.9 si es evidente; 0.6 si la porción es dudosa; 0.3 si apenas se distingue.
- Si no hay comida en la imagen o texto, devuelve {"items":[]}.
- No agregues texto fuera del JSON.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nombre:     { type: "STRING" },
          cantidad:   { type: "NUMBER" },
          cantidad_g: { type: "NUMBER", nullable: true },
          kcal:       { type: "NUMBER" },
          prot_g:     { type: "NUMBER" },
          confianza:  { type: "NUMBER" },
        },
        required: ["nombre", "cantidad", "cantidad_g", "kcal", "prot_g", "confianza"],
      },
    },
  },
  required: ["items"],
};

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------
async function callGemini(req: AnalyzeRequest): Promise<GeminiItem[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const parts: unknown[] = [];
  if (req.image_base64) {
    parts.push({ inlineData: { mimeType: req.mime_type ?? "image/jpeg", data: req.image_base64 } });
  }
  parts.push({
    text: req.text
      ? `Comida descrita por el usuario (${req.meal_type ?? "sin tipo"}): ${req.text}`
      : `Foto de ${req.meal_type ?? "una comida"}. Identifica todo lo que se ve.`,
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

// ---------------------------------------------------------------------------
// Cruce con la base chilena
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
async function matchWithFoods(db: any, items: GeminiItem[]): Promise<ResultItem[]> {
  const out: ResultItem[] = [];
  for (const it of items) {
    const { data } = await db.rpc("search_foods", { q: it.nombre, lim: 1 });
    const f = data?.[0];

    // Umbral: aceptamos el match solo si el nombre es razonablemente parecido.
    // search_foods ya filtra por similitud (% operator), así que si vino, sirve.
    if (f) {
      // Escala por gramos si ambos lados los conocen; si no, por cantidad.
      let factor = it.cantidad || 1;
      if (it.cantidad_g && f.porcion_g) factor = it.cantidad_g / Number(f.porcion_g);
      out.push({
        ...it,
        nombre: f.marca ? `${f.nombre} ${f.marca}` : f.nombre,
        kcal: Math.round(Number(f.kcal) * factor),
        prot_g: Math.round(Number(f.prot_g) * factor),
        food_id: f.id,
        match_nombre: f.nombre,
        fuente: "base",
        confianza: Math.max(it.confianza, f.verificado ? 0.8 : it.confianza),
      });
    } else {
      out.push({ ...it, kcal: Math.round(it.kcal), prot_g: Math.round(it.prot_g), food_id: null, match_nombre: null, fuente: "modelo" });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // 1. Usuario autenticado (JWT de la app)
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "No autenticado" }, 401);

    // 2. Cliente con service_role para contadores y búsqueda
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = (await req.json()) as AnalyzeRequest;
    if (!body.image_base64 && !body.text) return json({ error: "Falta image_base64 o text" }, 400);

    // 3. Tope del plan free (solo para fotos; el texto es gratis)
    if (body.image_base64) {
      const { data: ok } = await admin.rpc("can_analyze_photo", { p_user: user.id });
      if (!ok) return json({ error: "limite_fotos", message: "Llegaste al tope de fotos de hoy" }, 429);
    }

    // 4. Gemini → ítems
    const t0 = Date.now();
    const raw = await callGemini(body);

    // 5. Cruce con foods
    const items = await matchWithFoods(admin, raw);

    // 6. Contador de uso
    const hoy = body.fecha ?? new Date().toISOString().slice(0, 10);
    if (body.image_base64) {
      await admin.rpc("increment_ai_usage", { p_user: user.id, p_fecha: hoy, p_fotos: 1, p_mensajes: 0 });
    }

    return json({
      items,
      totals: {
        kcal: items.reduce((a, i) => a + i.kcal, 0),
        prot_g: items.reduce((a, i) => a + i.prot_g, 0),
      },
      needs_confirmation: items.some((i) => i.confianza < 0.6),
      ms: Date.now() - t0,
    });
  } catch (e) {
    console.error(e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
