# bienva-app · frontend

**Bienva: nutrición simple** (bienva.cl). App iPhone (Expo + React Native + TypeScript) de registro nutricional con IA para Chile. Tagline: *Tu bienestar, a tu ritmo.* El backend es Supabase y vive en `../backend` de este mismo repo; `frontend/` solo consume sus tablas y Edge Functions por la API, nunca importa código de `backend/`.

## Problema que resuelve
La gente abandona el registro de comidas porque acumula días sin anotar y ponerse al día se siente como castigo. Esta app hace que registrar tome menos de 15 s y que un día perdido se recupere, no que rompa una racha.

## Criterio de éxito del MVP
El usuario registra al menos 5 de 7 días durante 2 semanas seguidas usando solo la app.

## Estado actual (23 sep 2026)
Estructura y P1 Login implementados (pendiente de validar en iPhone); P2–P8 por hacer. Backend: migraciones 001–004 aplicadas, `analyze` desplegada y probada con texto.

## Stack y setup
- Expo SDK actual, TypeScript, `expo-router`, `@supabase/supabase-js`, `expo-camera`, `expo-image-manipulator`, `expo-notifications`, `expo-av` (voz, después).
- Probar en Expo Go primero (sin cuenta Apple). TestFlight cuando llegue la cuenta de desarrollador.
- Variables en `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Nunca la `service_role`.
- Estado: React Query para datos remotos, Zustand para el poco estado local. Sin Redux.

## Reglas de diseño que no se negocian
1. Nada de rachas diarias ni ceros en rojo. Un día sin datos se muestra como "sin registro". La racha, si existe, es semanal: semanas con 4 o más días registrados.
2. La pantalla de registro principal es el **stack de alimentos frecuentes con casillas**; la foto y el texto son alternativas, no el camino por defecto.
3. Captura rápida: un botón que saca la foto, la sube a `pending_photos` y vuelve a la pantalla anterior. Sin pantalla de confirmación. Se analiza después.
4. Un registro a medias se guarda como `meals.es_borrador = true` y se retoma al volver, sin perder nada (la usuaria con hijos que suelta el celular cada 2 min).
5. Modo reconstruir: al abrir con días sin registro, se ofrece revisar fotos pendientes y días vacíos, uno a uno, sugiriendo comidas típicas de `frequent_items`.
6. Un solo recordatorio al día como máximo, a la hora en que el usuario suele registrar (`users.hora_habitual_registro`).
7. Tono de todos los textos: cercano, breve, chileno, sin sermones. "Vamos", "grande" cuando corresponda, sin exagerar.

## Pantallas del MVP (en orden de construcción)
1. **Login** por email (magic link de Supabase).
2. **Hoy**: kcal y proteína acumuladas vs meta, lista de comidas del día, botón grande de captura rápida, botón "registrar".
3. **Registrar**: pestañas Frecuentes (casillas) · Texto · Foto. Al confirmar, llama a `analyze`, muestra ítems editables, guarda `meals` + `meal_items`. Ítems con `confianza < 0.6` piden confirmar.
4. **Reconstruir**: días sin registro y fotos pendientes, procesa en lote.
5. **Semana**: tabla lunes a domingo con kcal, proteína y dentro/fuera de meta.
6. **Coach**: chat con Haiku vía Edge Function `coach`; muestra y permite borrar el perfil de memoria.
7. **Ajustes**: metas, hora de recordatorio, plan.

## Contrato con el backend
- `POST /functions/v1/analyze` con `Authorization: Bearer <jwt>` y body `{ image_base64?, mime_type?, text?, meal_type?, fecha? }` → `{ items[], totals, needs_confirmation }`. Cada ítem trae `food_id`, `kcal`, `prot_g`, `confianza`, `fuente: "base"|"modelo"`.
- Fotos: redimensionar a máx. 1024 px y JPEG calidad 0.8 **antes** de subir o enviar.
- Lectura directa a tablas con RLS: `meals`, `meal_items`, `foods`, `daily_totals`, `frequent_items`, `user_memory`, `messages`, `pending_photos`.
- Storage bucket `meal-photos`, ruta `<user_id>/<uuid>.jpg`.

## Convenciones
- Un componente por archivo, hooks en `src/hooks`, llamadas a Supabase en `src/api`.
- Textos de UI en `src/i18n/es.ts` desde el inicio, aunque solo haya español.
- Sin `localStorage`; persistencia local con `expo-secure-store` (sesión) y AsyncStorage (borradores).
- Commits pequeños; cada pantalla se prueba en Expo Go antes de pasar a la siguiente.

## Fuera de alcance (v2)
Código de barras, Apple Health, recetas, ayuno intermitente, widgets, Android, pagos, Sign in with Apple.
