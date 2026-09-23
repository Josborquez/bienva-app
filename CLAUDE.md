# bienva-app

**Bienva: nutrición simple** (bienva.cl). App iPhone de registro nutricional con IA para Chile. Tagline: *Tu bienestar, a tu ritmo.*

Este repo tiene dos áreas de trabajo. Antes de tocar una, lee su `CLAUDE.md`:

| Área | Qué es | Leer primero |
|---|---|---|
| `frontend/` | App Expo + React Native + TypeScript | `frontend/CLAUDE.md`, `frontend/SPEC.md` |
| `backend/` | Supabase: migraciones SQL, RLS, Edge Functions | `backend/CLAUDE.md` |

## Reglas entre áreas
- `frontend/` nunca importa código de `backend/`. Se comunican solo por la API de Supabase (tablas con RLS, vistas, RPC y Edge Functions).
- Un cambio de contrato (por ejemplo, la respuesta de `analyze`) actualiza en el mismo commit la Edge Function y los tipos de `frontend/src/types`.
- Commits con prefijo de área: `feat(frontend): …`, `fix(backend): …`.
- Secrets fuera de Git: `frontend/.env` solo lleva la clave pública (anon); las claves privadas viven en `supabase secrets` y nunca en el repo.

## Comandos
- App: `cd frontend && npm start`
- Backend: `cd backend && npx supabase …` (proyecto `jbtlwnwrplgbzdsaqvjl`, ya vinculado)
