# Edge Functions `analyze` y `process_pending`

Ambas usan la misma lógica, en `supabase/functions/_shared/analyze.ts`: el modelo identifica alimentos y porciones, cada ítem se cruza con `foods` (`match_food`, similitud ≥ 0,5) y, si hay match, las calorías salen de la tabla. Toda foto pasa por `can_analyze_photo()` y suma en `ai_usage` con `increment_ai_usage()` (fecha del servidor); el texto no cuenta.

## Requisitos y deploy
```bash
cd backend
supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=gemini-3.6-flash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # Claude Haiku 4.5
supabase functions deploy analyze --use-api
supabase functions deploy process_pending --use-api
```
`--use-api` empaqueta en Supabase (no necesita Docker). Hoy Gemini está desactivado en `identifyItems` por cuota agotada y todo va a Haiku; ver el comentario TEMPORAL en `_shared/analyze.ts`.

## `analyze`: tres modos
`POST /functions/v1/analyze` con `Authorization: Bearer <access_token>`. Se envía **uno** de `text`, `image_base64` o `photo_path`; con dos o ninguno responde 400.

| Modo | Cuerpo | Cuenta en el tope de fotos |
|---|---|---|
| Texto | `{ "text": "2 huevos y una marraqueta", "meal_type"?: "desayuno" }` | No |
| Foto en el cuerpo | `{ "image_base64": "<jpeg en base64>", "mime_type"?: "image/jpeg", "meal_type"?: … }` | Sí |
| Foto en Storage | `{ "photo_path": "<user_id>/<archivo>.jpg", "meal_type"?: … }` | Sí |

- `meal_type`: `desayuno`, `almuerzo`, `snack`, `once` o `cena`; otro valor → 400.
- `photo_path` debe estar en `meal-photos/<user_id>/…` del mismo usuario. Se descarga con el JWT del usuario, así que la política del bucket impide leer fotos ajenas; un prefijo de otro usuario → 403 `"La foto no es tuya"`, archivo inexistente → 404, más de 5 MB → 413.
- Redimensiona las fotos a ≤ 1024 px y JPEG 0,8 antes de subirlas o enviarlas.

Respuesta 200:
```json
{
  "items": [
    {"nombre":"Huevo revuelto en aceite","cantidad":2,"cantidad_g":100,"kcal":196,"prot_g":12,"confianza":0.9,"food_id":"...","match_nombre":"Huevo revuelto en aceite","fuente":"base"},
    {"nombre":"fideos con salsa alfredo","cantidad":1,"cantidad_g":300,"kcal":450,"prot_g":12,"confianza":0.6,"food_id":null,"match_nombre":null,"fuente":"modelo"}
  ],
  "totals": {"kcal": 646, "prot_g": 24},
  "needs_confirmation": false,
  "ms": 3855
}
```
`fuente: "base"` = los números salieron de `foods`; `"modelo"` = no hubo match y se usó la estimación del modelo (candidato para agregar a la base). `confianza < 0,6` → `needs_confirmation: true`.

Errores: 400 pedido inválido · 401 sin JWT · 403 foto ajena · 404 foto inexistente · 413 foto muy grande · 429 `{"error":"limite_fotos"}` · 503 `{"error":"ia_no_disponible"}` (modelo saturado o caído, reintentable) · 500 otro error.

## `process_pending`: fotos de captura rápida en lote
`POST /functions/v1/process_pending` con el JWT del usuario y cuerpo opcional `{ "limit"?: number }` (1–10, por defecto 5).

Toma las filas de `pending_photos` del usuario con `procesada = false`, ordenadas por `tomada_en`, hasta `limit`. Por cada una:
1. Revisa el tope con `can_analyze_photo()`. Si da `false`, se detiene: `stopped: "limite_fotos"`, y la foto sigue pendiente.
2. Analiza `storage_path` con la misma lógica de `analyze`, con `meal_type = tipo_sugerido`; si es null, por la hora local de `tomada_en` en America/Santiago: < 10 desayuno, 10–15 almuerzo, 15–19 snack, ≥ 19 cena.
3. Crea `meals` con `origen = 'foto'`, `es_borrador = true`, `foto_path = storage_path`, `fecha` = día de `tomada_en` en Santiago, y sus `meal_items`.
4. Marca la foto `procesada = true` con su `meal_id`.

Si una foto falla (archivo inexistente, foto ajena, sin alimentos…), el mensaje queda en `pending_photos.error`, la foto se marca procesada y se sigue con la siguiente. Excepción: si el **modelo no está disponible** (429/5xx/red) se detiene con `stopped: "ia_no_disponible"` y deja la foto pendiente, para no perder fotos por un corte transitorio.

Respuesta 200:
```json
{ "processed": 3, "created_meals": ["641cfb44-…", "413dbaa4-…"], "errors": [{ "id": "b854f499-…", "error": "No encontramos la foto …/no-existe.jpg" }], "stopped": "limite_fotos" }
```
`processed` cuenta las fotos marcadas como procesadas (con comida o con error). `stopped` solo aparece si se detuvo antes de terminar.

## Probar con curl
1. JWT de un usuario de prueba:
```bash
curl -X POST 'https://jbtlwnwrplgbzdsaqvjl.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <ANON_KEY>' -H 'Content-Type: application/json' \
  -d '{"email":"prueba@bienva.cl","password":"<clave>"}'
```
2. Texto:
```bash
curl -X POST 'https://jbtlwnwrplgbzdsaqvjl.supabase.co/functions/v1/analyze' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: application/json' \
  -d '{"text":"2 huevos revueltos, 1 marraqueta con palta y un té","meal_type":"desayuno"}'
```
3. Foto en el cuerpo:
```bash
B64=$(base64 -w0 foto.jpg)
curl -X POST 'https://jbtlwnwrplgbzdsaqvjl.supabase.co/functions/v1/analyze' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: application/json' \
  -d "{\"image_base64\":\"$B64\",\"mime_type\":\"image/jpeg\",\"meal_type\":\"almuerzo\"}"
```
4. Foto en Storage (subirla primero a la carpeta del usuario):
```bash
curl -X POST "https://jbtlwnwrplgbzdsaqvjl.supabase.co/storage/v1/object/meal-photos/<USER_ID>/almuerzo.jpg" \
  -H 'apikey: <ANON_KEY>' -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: image/jpeg' --data-binary @foto.jpg
curl -X POST 'https://jbtlwnwrplgbzdsaqvjl.supabase.co/functions/v1/analyze' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: application/json' \
  -d '{"photo_path":"<USER_ID>/almuerzo.jpg","meal_type":"almuerzo"}'
```
5. Lote de pendientes (después de insertar filas en `pending_photos` con `storage_path` de fotos subidas):
```bash
curl -X POST 'https://jbtlwnwrplgbzdsaqvjl.supabase.co/functions/v1/process_pending' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: application/json' -d '{"limit":5}'
```
Comprobar el contador: `select fecha, fotos from ai_usage where user_id = '<USER_ID>';`
