// supabase/functions/_shared/analyze.ts
// Lógica compartida de análisis de comidas: la usan analyze (una comida a la
// vez) y process_pending (fotos de captura rápida en lote).
//
// Flujo: modelo (Gemini, o Haiku de respaldo) → ítems con porciones → cruce con
// foods (match_food) → totales. Las calorías salen de foods cuando hay match.

import Anthropic from "npm:@anthropic-ai/sdk@0.128";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export const MEAL_TYPES = ["desayuno", "almuerzo", "snack", "once", "cena"] as const; // = enum meal_type
export type MealType = (typeof MEAL_TYPES)[number];
export const PHOTO_BUCKET = "meal-photos";

export interface AnalyzeInput {
  image_base64?: string;      // JPEG/PNG ya redimensionado a ≤1024 px
  mime_type?: string;         // "image/jpeg" por defecto
  text?: string;              // "2 huevos revueltos y pan con palta"
  meal_type?: MealType;
}

interface GeminiItem {
  nombre: string;
  cantidad: number;           // unidades o multiplicador ("2 huevos" → 2)
  cantidad_g: number | null;  // gramos estimados de la porción total
  kcal: number;
  prot_g: number;
  confianza: number;          // 0–1
}

export interface ResultItem extends GeminiItem {
  food_id: string | null;
  match_nombre: string | null;
  fuente: "base" | "modelo";  // de dónde salieron los números finales
}

export interface AnalyzeResult {
  items: ResultItem[];
  totals: { kcal: number; prot_g: number };
  needs_confirmation: boolean;
  modelo: string;
}

// Gemini (o cualquier modelo) caído o saturado: error transitorio, reintentable.
export class ModelUnavailableError extends Error {}
// Error del pedido (foto ajena, archivo inexistente…): responde 4xx, no 500.
export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// ---------------------------------------------------------------------------
// Prompt y esquemas
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

const HAIKU_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre:     { type: "string" },
          cantidad:   { type: "number" },
          cantidad_g: { anyOf: [{ type: "number" }, { type: "null" }] },
          kcal:       { type: "number" },
          prot_g:     { type: "number" },
          confianza:  { type: "number" },
        },
        required: ["nombre", "cantidad", "cantidad_g", "kcal", "prot_g", "confianza"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const userPrompt = (req: AnalyzeInput) =>
  req.text
    ? `Comida descrita por el usuario (${req.meal_type ?? "sin tipo"}): ${req.text}`
    : `Foto de ${req.meal_type ?? "una comida"}. Identifica todo lo que se ve.`;

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------
async function callGemini(req: AnalyzeInput): Promise<GeminiItem[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash";
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const parts: unknown[] = [];
  if (req.image_base64) {
    parts.push({ inlineData: { mimeType: req.mime_type ?? "image/jpeg", data: req.image_base64 } });
  }
  parts.push({ text: userPrompt(req) });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
  };

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch (e) {
    throw new ModelUnavailableError(`Gemini red: ${e}`);
  }
  if (res.status === 429 || res.status >= 500) {
    throw new ModelUnavailableError(`Gemini ${res.status}: ${await res.text()}`);
  }
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

async function callHaiku(req: AnalyzeInput): Promise<GeminiItem[]> {
  const client = new Anthropic({ timeout: 60_000 }); // lee ANTHROPIC_API_KEY

  const content: Anthropic.ContentBlockParam[] = [];
  if (req.image_base64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: (req.mime_type ?? "image/jpeg") as ImageMediaType, data: req.image_base64 },
    });
  }
  content.push({ type: "text", text: userPrompt(req) });

  let msg: Anthropic.Message;
  try {
    msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { format: { type: "json_schema", schema: HAIKU_SCHEMA } },
    });
  } catch (e) {
    // 429 / 5xx / red: transitorio; 4xx (imagen inválida, etc.) no.
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError) {
      throw new ModelUnavailableError(`Haiku: ${e.message}`);
    }
    throw e;
  }
  if (msg.stop_reason !== "end_turn") throw new Error(`Haiku stop_reason: ${msg.stop_reason}`);

  const block = msg.content.find((b) => b.type === "text");
  const parsed = JSON.parse(block?.type === "text" ? block.text : "{}");
  return Array.isArray(parsed.items) ? parsed.items : [];
}

// Gemini primero; si no está disponible y hay clave de Anthropic, Haiku.
// TEMPORAL (24 sep 2026): Gemini desactivado mientras su cuota está agotada
// (429 "exceeded your current quota"); todo va directo a Haiku. Para volver,
// descomentar el bloque y borrar el return de abajo.
async function identifyItems(req: AnalyzeInput): Promise<{ items: GeminiItem[]; modelo: string }> {
  // try {
  //   return { items: await callGemini(req), modelo: "gemini" };
  // } catch (e) {
  //   if (!(e instanceof ModelUnavailableError) || !Deno.env.get("ANTHROPIC_API_KEY")) throw e;
  //   console.warn(`Gemini no disponible, uso Haiku: ${e.message.slice(0, 200)}`);
  //   return { items: await callHaiku(req), modelo: "haiku" };
  // }
  void callGemini;
  return { items: await callHaiku(req), modelo: "haiku" };
}

// ---------------------------------------------------------------------------
// Cruce con la base chilena
// ---------------------------------------------------------------------------
async function matchWithFoods(db: SupabaseClient, items: GeminiItem[]): Promise<ResultItem[]> {
  const out: ResultItem[] = [];
  for (const it of items) {
    // match_food exige similitud >= 0,5. search_foods (filtro 0,3) cruzaba
    // "agua" con "Atún en agua" y "sopa crema" con "Queso crema".
    const { data } = await db.rpc("match_food", { q: it.nombre });
    const f = data?.[0];

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

// Una comida: modelo → cruce con foods → totales.
export async function analyzeMeal(admin: SupabaseClient, input: AnalyzeInput): Promise<AnalyzeResult> {
  const { items: raw, modelo } = await identifyItems(input);
  const items = await matchWithFoods(admin, raw);
  return {
    items,
    totals: { kcal: items.reduce((a, i) => a + i.kcal, 0), prot_g: items.reduce((a, i) => a + i.prot_g, 0) },
    needs_confirmation: items.some((i) => i.confianza < 0.6),
    modelo,
  };
}

// ---------------------------------------------------------------------------
// Fotos en Storage
// ---------------------------------------------------------------------------
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // tope de imagen de la API de Anthropic
const MIME_BY_EXT: Record<string, ImageMediaType> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

// Descarga con el cliente DEL USUARIO: la política "own photos" del bucket
// garantiza que solo lea su carpeta <user_id>/. El prefijo se valida además para
// responder 403 claro en vez de "no encontrado".
export async function photoFromStorage(userClient: SupabaseClient, userId: string, path: string): Promise<{ image_base64: string; mime_type: ImageMediaType }> {
  if (!path.startsWith(`${userId}/`) || path.includes("..")) throw new RequestError("La foto no es tuya", 403);
  const { data, error } = await userClient.storage.from(PHOTO_BUCKET).download(path);
  if (error || !data) throw new RequestError(`No encontramos la foto ${path}`, 404);
  if (data.size > MAX_PHOTO_BYTES) throw new RequestError("La foto pesa más de 5 MB; redimensiónala antes de subirla", 413);
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const mime = (data.type?.startsWith("image/") ? data.type : MIME_BY_EXT[ext] ?? "image/jpeg") as ImageMediaType;
  return { image_base64: encodeBase64(new Uint8Array(await data.arrayBuffer())), mime_type: mime };
}

// ---------------------------------------------------------------------------
// Tope de fotos del plan
// ---------------------------------------------------------------------------
export async function canAnalyzePhoto(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.rpc("can_analyze_photo", { p_user: userId });
  if (error) throw error;
  return Boolean(data);
}

// Siempre la fecha del servidor (UTC, igual que el current_date de
// can_analyze_photo); nunca la fecha del cliente ni la de la foto.
export async function countPhoto(admin: SupabaseClient, userId: string) {
  const hoy = new Date().toISOString().slice(0, 10);
  const { error } = await admin.rpc("increment_ai_usage", { p_user: userId, p_fecha: hoy, p_fotos: 1, p_mensajes: 0 });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// Usuario del JWT + dos clientes: el del usuario (respeta RLS) y el de
// service_role (contadores, match_food, escrituras del backend).
export async function authenticate(req: Request) {
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  return { user, userClient, admin };
}

export function errorResponse(e: unknown) {
  console.error(e);
  if (e instanceof RequestError) return json({ error: e.message }, e.status);
  if (e instanceof ModelUnavailableError) return json({ error: "ia_no_disponible", message: "La IA está saturada, intenta en un rato" }, 503);
  return json({ error: e instanceof Error ? e.message : String(e) }, 500);
}
