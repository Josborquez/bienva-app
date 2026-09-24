# Bienva app — Especificación de desarrollo (SDD)

Documento de diseño de software para el área `frontend/` del repo `bienva-app`. Complementa `CLAUDE.md` (contexto y reglas) con el **qué construir, en qué orden y cómo saber que está listo**. Claude Code debe leer ambos antes de empezar.

---

## 0. Resumen

| | |
|---|---|
| Producto | Bienva: nutrición simple. *Tu bienestar, a tu ritmo.* |
| Plataforma | iPhone primero. Expo SDK actual, React Native, TypeScript, expo-router |
| Backend | Supabase `app-alimentos` (ref `jbtlwnwrplgbzdsaqvjl`). Tablas y Edge Function `analyze` ya existen |
| Objetivo del MVP | Que un usuario registre ≥ 5 de 7 días durante 2 semanas usando solo la app |
| Entorno de prueba | Expo Go en el iPhone del fundador. TestFlight después |

---

## 1. Estructura del proyecto

```
bienva-app/frontend/
├─ app/                        # expo-router
│  ├─ _layout.tsx              # providers: QueryClient, Supabase session, theme
│  ├─ (auth)/login.tsx
│  ├─ (tabs)/_layout.tsx       # Hoy · Semana · Coach · Ajustes
│  ├─ (tabs)/index.tsx         # Hoy
│  ├─ (tabs)/semana.tsx
│  ├─ (tabs)/coach.tsx
│  ├─ (tabs)/ajustes.tsx
│  ├─ registrar.tsx            # modal: Frecuentes · Texto · Foto
│  ├─ confirmar.tsx            # modal: ítems editables antes de guardar
│  └─ reconstruir.tsx          # modal: días sin registro y fotos pendientes
├─ src/
│  ├─ api/                     # una función por operación contra Supabase
│  │  ├─ supabase.ts           # cliente + persistencia de sesión
│  │  ├─ auth.ts
│  │  ├─ meals.ts
│  │  ├─ foods.ts
│  │  ├─ analyze.ts            # llama a la Edge Function
│  │  ├─ pendingPhotos.ts
│  │  └─ coach.ts
│  ├─ hooks/                   # React Query wrappers: useToday, useWeek, useFrequent...
│  ├─ components/
│  ├─ store/                   # Zustand: borrador en curso, foto en cola
│  ├─ i18n/es.ts               # todos los textos de UI
│  ├─ theme/                   # colores, tipografía, espaciado
│  └─ types/                   # tipos generados de Supabase + tipos de dominio
├─ assets/
├─ .env.example
├─ app.json
├─ CLAUDE.md
└─ SPEC.md (este archivo)
```

## 2. Dependencias

`expo`, `expo-router`, `expo-camera`, `expo-image-picker`, `expo-image-manipulator`, `expo-notifications`, `expo-secure-store`, `@react-native-async-storage/async-storage`, `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `date-fns` (con locale `es`), `react-native-svg`.

Sin librerías de UI pesadas. Componentes propios sobre `StyleSheet`.

## 3. Modelo de datos (lado app)

Tipos generados desde Supabase con `supabase gen types typescript --project-id jbtlwnwrplgbzdsaqvjl > src/types/database.ts`. Tipos de dominio encima:

```ts
type MealType = 'desayuno' | 'almuerzo' | 'snack' | 'once' | 'cena';

interface MealItemDraft {
  nombre: string;
  cantidad: number;          // 2 huevos = 2
  cantidad_g?: number | null;
  kcal: number;
  prot_g: number;
  food_id?: string | null;
  confianza: number;         // < 0.6 => pedir confirmación
  fuente: 'base' | 'modelo' | 'frecuente' | 'manual';
}

interface DayTotals { fecha: string; kcal: number; prot_g: number; comidas: number; }
```

Metas del usuario: `users.meta_kcal_min/max`, `meta_prot_min/max`. "Dentro de meta" = entre min y max.

## 4. Pantallas y criterios de aceptación

Construir en este orden. Cada pantalla se prueba en Expo Go antes de pasar a la siguiente.

### P1 · Login (`(auth)/login.tsx`)
- Email + botón "Enviarme el enlace". Supabase `signInWithOtp`. Deep link `bienva://auth/callback` configurado en `app.json` y en Supabase Auth → URL Configuration.
- Sesión persistida en `expo-secure-store`. Al abrir con sesión válida, va directo a Hoy.
- **Listo cuando:** entras desde el iPhone con tu correo sin escribir contraseña, cierras la app, la abres y sigues dentro.

### P2 · Hoy (`(tabs)/index.tsx`)
- Cabecera: fecha en español ("miércoles 23 de septiembre").
- Dos barras: kcal acumuladas / rango meta y proteína / rango meta. Colores: gris bajo el mínimo, verde dentro, ámbar sobre el máximo. **Nunca rojo.**
- Sin registros: texto "Sin registro todavía" y las barras vacías. **Nunca "0 kcal".**
- Lista de comidas del día agrupada por tipo, con subtotal por comida y sus ítems. Tap en ítem abre edición (cantidad, kcal, prot).
- Botón flotante grande **"Registrar"** → `registrar.tsx`.
- Botón secundario con ícono de cámara **"Foto rápida"** → abre cámara, toma, redimensiona a 1024 px JPEG 0.8, sube a `meal-photos/<uid>/<uuid>.jpg`, inserta en `pending_photos` y vuelve. Sin pantalla intermedia. Toast: "Guardada, la revisamos después".
- Si hay días sin registro en los últimos 7 o fotos pendientes: banner "Tienes 2 días sin registro y 3 fotos pendientes · Reconstruir".
- Si existe `meals.es_borrador = true` de hoy: banner "Tienes un registro a medias · Retomar".
- **Listo cuando:** registras una comida por texto, aparece en la lista con totales correctos, y una foto rápida termina en `pending_photos` en menos de 3 segundos.

### P3 · Registrar (`registrar.tsx`, modal)
- Selector de tipo de comida (por defecto según hora local: <10 desayuno, 10–15 almuerzo, 15–19 snack, >19 cena) y fecha (por defecto hoy, editable para reconstruir).
- Tres pestañas:
  1. **Frecuentes** (pestaña por defecto): lista desde la vista `frequent_items` filtrada por tipo, con casilla y cantidad. Debajo, buscador sobre `search_foods` con los mismos controles. Botón "Agregar seleccionados".
  2. **Texto**: input multilínea + micrófono (v2, deshabilitado). Botón "Analizar" → `analyze({ text, meal_type, fecha })`.
  3. **Foto**: cámara o galería → redimensionar → `analyze({ image_base64, ... })`. Si la Edge Function devuelve 429 `limite_fotos`, mostrar "Llegaste al tope de fotos de hoy; puedes registrar por texto o frecuentes".
- Cualquier pestaña termina en `confirmar.tsx` con los ítems.
- Al cerrar el modal con ítems sin guardar, se guarda `meals` con `es_borrador = true` y sus `meal_items`.
- **Listo cuando:** las tres pestañas producen ítems y "2 huevos y pan con palta" devuelve tres filas.

### P4 · Confirmar (`confirmar.tsx`, modal)
- Lista editable: nombre, cantidad (stepper), kcal, prot. Ítems con `confianza < 0.6` marcados y con texto "¿Tienes el dato exacto?".
- Chip por ítem: "Base" (verde) o "Estimado" (gris) según `fuente`.
- Botón "Guardar": inserta `meals` (o actualiza el borrador) y `meal_items`; `editado_por_usuario = true` si se tocó. Vuelve a Hoy.
- **Listo cuando:** guardar refleja en Hoy en menos de 1 segundo y los ítems de la base llegan con `food_id`.

### P5 · Reconstruir (`reconstruir.tsx`, modal)
- Lista de los últimos 7 días marcando: con registro ✓, sin registro, con fotos pendientes (n).
- Tap en día sin registro → `registrar.tsx` con esa fecha, pestaña Frecuentes.
- "Procesar fotos pendientes" → por cada foto: `analyze` con `tipo_sugerido` y fecha de `tomada_en` → crea `meals` en borrador → marca `procesada`. Muestra progreso "2 de 3".
- Nunca muestra rachas rotas ni cuenta de días perdidos como fallo. Copy: "Vamos a ponernos al día, de a uno".
- **Listo cuando:** tres fotos pendientes se convierten en tres comidas en borrador y aparecen en sus días.

### P6 · Semana (`(tabs)/semana.tsx`)
- Tabla lunes a domingo (semana actual, navegable hacia atrás): kcal, prot, estado (dentro / fuera / sin registro).
- Pie: promedio de kcal y prot, días dentro de meta calórica y proteica (x/7), **días registrados (x/7)**.
- Racha semanal: "3 semanas seguidas con 4+ días registrados". Solo se muestra si ≥ 1.
- **Listo cuando:** coincide con la vista `daily_totals` para la misma semana.

### P7 · Coach (`(tabs)/coach.tsx`)
- Chat simple sobre `messages`. Envío llama a Edge Function `coach` (backend, pendiente); mientras no exista, la pestaña muestra "Pronto" y no bloquea el MVP.
- Menú "¿Qué sabe de mí?": muestra `user_memory.perfil_texto` con botón "Borrar memoria".
- **Listo cuando:** un mensaje recibe respuesta y el perfil se puede ver y borrar.

### P8 · Ajustes (`(tabs)/ajustes.tsx`)
- Metas kcal y prot (min/max), hora de recordatorio, activar/desactivar recordatorio, cerrar sesión.
- Recordatorio local con `expo-notifications`: uno al día a `hora_habitual_registro`; si el día ya tiene registro, no se dispara. Nunca más de uno.
- **Listo cuando:** cambiar la meta actualiza las barras de Hoy y el recordatorio llega a la hora elegida.

## 5. Contratos con el backend

**Edge Function `analyze`** — `POST {SUPABASE_URL}/functions/v1/analyze`, header `Authorization: Bearer <access_token>`.
```json
// request
{ "image_base64"?: string, "mime_type"?: "image/jpeg", "text"?: string, "meal_type"?: MealType, "fecha"?: "YYYY-MM-DD" }
// response 200
{ "items": MealItemDraft[], "totals": { "kcal": number, "prot_g": number }, "needs_confirmation": boolean, "ms": number }
// 401 no autenticado · 429 { "error": "limite_fotos" } · 500 { "error": string }
```

**Tablas** (todas con RLS por `auth.uid()`): `users`, `foods` (solo lectura), `meals`, `meal_items`, `pending_photos`, `user_memory`, `messages`. **Vistas:** `daily_totals`, `frequent_items`. **RPC:** `search_foods(q, lim)`.

**Storage:** bucket privado `meal-photos`, ruta `<user_id>/<uuid>.jpg`. Subir con `contentType: 'image/jpeg'`.

## 6. Reglas de UX (no negociables)
1. Ningún cero en rojo; un día sin datos es "sin registro".
2. Rachas semanales, nunca diarias.
3. Un registro a medias siempre se guarda como borrador.
4. Un recordatorio al día como máximo.
5. Todo texto de UI vive en `src/i18n/es.ts`, tono cercano y breve.
6. Fotos siempre redimensionadas antes de salir del teléfono.

## 7. Configuración

`.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://jbtlwnwrplgbzdsaqvjl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```
`app.json`: `scheme: "bienva"`, `ios.bundleIdentifier: "cl.bienva.app"`, permisos con texto en español: cámara ("Para registrar tu comida con una foto"), galería, notificaciones.

## 8. Orden de trabajo para Claude Code

1. `npx create-expo-app bienva-app --template tabs` (o blank + expo-router), TypeScript, limpiar plantilla, instalar dependencias, crear estructura de carpetas, `.env.example`, `src/api/supabase.ts`, generar tipos.
2. P1 Login. Probar en Expo Go.
3. P2 Hoy con datos reales (insertar una comida a mano en Supabase para ver algo).
4. P3 Registrar pestaña Texto + P4 Confirmar (recorrido completo texto → guardar → Hoy).
5. P3 pestañas Frecuentes y Foto.
6. Foto rápida + P5 Reconstruir.
7. P6 Semana.
8. P8 Ajustes y recordatorio.
9. P7 Coach cuando exista la Edge Function.

Commits pequeños, uno por pantalla o feature. No avanzar a la siguiente pantalla sin probar la anterior en el iPhone.

## 9. Fuera de alcance
Código de barras, Apple Health, recetas, ayuno, widgets, Android, pagos, Sign in with Apple, voz (dejar el botón deshabilitado).
