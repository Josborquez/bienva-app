# bienva-backend

Backend de **Bienva** (bienva.cl): app iPhone de nutrición simple con IA para Chile. Tagline: *Tu bienestar, a tu ritmo.* Todo vive en Supabase: Postgres, Auth, Storage y Edge Functions. La app móvil está en otro repo (`bienva-app`, Expo).

## Problema que resuelve
La gente que intenta registrar lo que come abandona porque acumula días sin registrar y ponerse al día se siente como castigo. La app hace que registrar tome menos de 15 s y que un día perdido se recupere en vez de romper una racha.

## Estado actual (23 sep 2026)
- Proyecto Supabase `app-alimentos` (ref `jbtlwnwrplgbzdsaqvjl`, región us-west-2, Postgres 17) creado y sano.
- Migraciones 001–003 aplicadas a mano desde el SQL Editor: 8 tablas + 2 vistas, RLS, búsqueda difusa, 46 alimentos semilla. El historial remoto solo registra `20260923135855_ai_usage_increment_fn`; reparar con `supabase migration repair` antes de `db push`.
- Migración 004 (revoca EXECUTE de `increment_ai_usage` y `handle_new_auth_user` a anon/authenticated) escrita, pendiente de aplicar.
- Edge Function `analyze` escrita, **no desplegada ni probada** todavía.
- Falta: Edge Function `coach`, cron del resumen semanal, procesamiento de `pending_photos`.

## Arquitectura
```
App Expo ──JWT──> Edge Functions ──> Gemini 2.5 Flash (foto/voz/texto → JSON)
                        │          └> Claude Haiku 4.5 (coach con memoria)
                        └──> Postgres (foods, meals, user_memory, ai_usage)
```
Reglas de diseño que no se negocian:
1. La app nunca llama a Gemini ni a Anthropic directo. Solo Edge Functions, con `service_role` en secrets.
2. La IA identifica alimento y porción; **las calorías salen de la tabla `foods`** cuando hay match. El modelo solo rellena cuando no hay match (`fuente: "modelo"`).
3. El coach no recibe historial completo: recibe `user_memory.perfil_texto` (≤500 tokens) + resumen del día + últimos 20 mensajes. Tras cada conversación, otra llamada reescribe el perfil.
4. Toda llamada con foto pasa por `can_analyze_photo()` y suma en `ai_usage` con `increment_ai_usage()`. Texto no cuenta.
5. Un día sin filas en `daily_totals` es "sin registro", nunca 0.

## Esquema (resumen)
| Tabla | Rol |
|---|---|
| `users` | metas kcal/prot, plan free/pro, `hora_habitual_registro`, `fotos_gratis_por_dia` |
| `foods` | base chilena por porción; `aliases[]`, `verificado`, `usos`; búsqueda con `search_foods(q, lim)` (pg_trgm + unaccent) |
| `meals` / `meal_items` | comida y sus ítems; `es_borrador` para registros a medias; `confianza` < 0.6 pide confirmar |
| `pending_photos` | captura rápida: foto guardada, análisis después en lote |
| `user_memory` / `messages` | memoria del coach |
| `ai_usage` | contador diario por usuario |
| vistas `daily_totals`, `frequent_items` | día y comidas frecuentes (3+ veces) |

Extensiones van en el esquema `extensions`; toda función que use `unaccent`/`similarity` lleva `set search_path = public, extensions`.

## Convenciones
- Migraciones en `supabase/migrations/YYYYMMDDHHMMSS_nombre.sql`. Nunca editar una aplicada; crear una nueva.
- Edge Functions en Deno/TypeScript, una carpeta por función, `Deno.serve`, CORS incluido, respuestas JSON `{ error }` con status correcto.
- Nombres de columnas y enums en español (`desayuno`, `almuerzo`, `snack`, `cena`).
- Secrets: `supabase secrets set`. Nunca en el repo. Ver `.env.example`.
- Antes de desplegar una función, probarla con `curl` según `supabase/functions/analyze/README.md`.

## Comandos
```bash
supabase login
supabase link --project-ref jbtlwnwrplgbzdsaqvjl
supabase db push                    # aplica migraciones pendientes
supabase functions deploy analyze
supabase functions logs analyze
```

## Backlog inmediato (en orden)
1. Desplegar y probar `analyze` con texto y con foto. Ajustar el prompt si Gemini devuelve nombres no chilenos.
2. Edge Function `coach`: POST `{ message }` → arma prompt (perfil + día + últimos 20) → Haiku → guarda en `messages` → dispara `update_memory` (segunda llamada que reescribe `user_memory.perfil_texto`).
3. Edge Function `process_pending`: toma `pending_photos` no procesadas del usuario, las manda a `analyze` en lote, crea `meals` en borrador.
4. Cron (pg_cron o Supabase Scheduled Functions): sábado 20:00 America/Santiago, resumen semanal → push.
5. Endpoint `foods/suggest`: ítems con `fuente: "modelo"` que se repiten → candidatos a agregar a `foods`.

## Fuera de alcance (v2)
Código de barras (Open Food Facts), Apple Health, recetas, pagos, Android, widgets.
