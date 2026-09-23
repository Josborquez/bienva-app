# Edge Function `analyze`

## Requisitos
- Supabase CLI: `npm i -g supabase`
- API key de Gemini: https://aistudio.google.com/apikey (gratis, sin tarjeta)

## Deploy
```bash
supabase login
supabase link --project-ref <tu-project-ref>      # en Project Settings > General
supabase secrets set GEMINI_API_KEY=AIza... GEMINI_MODEL=gemini-3.6-flash
supabase functions deploy analyze
```
Antes del deploy corre `003_ai_usage_fn.sql` en el SQL Editor.

## Probar con curl
1. Consigue un JWT de tu usuario de prueba (Postman o desde la app). Con la API REST:
```bash
curl -X POST 'https://<ref>.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <ANON_KEY>' -H 'Content-Type: application/json' \
  -d '{"email":"tu@correo.cl","password":"tu-pass"}'
```
2. Texto:
```bash
curl -X POST 'https://<ref>.supabase.co/functions/v1/analyze' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: application/json' \
  -d '{"text":"2 huevos revueltos, 1 rebanada pan integral castaño y media palta","meal_type":"desayuno"}'
```
3. Foto (redimensiona a 1024 px antes):
```bash
B64=$(base64 -w0 foto.jpg)
curl -X POST 'https://<ref>.supabase.co/functions/v1/analyze' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' -H 'Content-Type: application/json' \
  -d "{\"image_base64\":\"$B64\",\"mime_type\":\"image/jpeg\",\"meal_type\":\"almuerzo\"}"
```

## Respuesta
```json
{
  "items": [
    {"nombre":"Huevo revuelto en aceite","cantidad":2,"cantidad_g":100,"kcal":196,"prot_g":12,"confianza":0.9,"food_id":"...","fuente":"base"},
    {"nombre":"Pan integral Castaño","cantidad":1,"cantidad_g":28,"kcal":62,"prot_g":3,"confianza":0.9,"food_id":"...","fuente":"base"},
    {"nombre":"Palta","cantidad":0.5,"cantidad_g":85,"kcal":135,"prot_g":2,"confianza":0.7,"food_id":"...","fuente":"base"}
  ],
  "totals":{"kcal":393,"prot_g":17},
  "needs_confirmation":false,
  "ms":1840
}
```
`fuente: "base"` = los números salieron de tu tabla `foods`; `"modelo"` = no hubo match y se usó la estimación de Gemini (candidato para agregar a la base).
