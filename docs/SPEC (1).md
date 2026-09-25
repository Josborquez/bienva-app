# Bienva app — Especificación de desarrollo (SDD)

Documento de diseño de software para el repo `bienva-app`. Complementa `CLAUDE.md` (contexto y reglas) con el **qué construir, en qué orden y cómo saber que está listo**. Claude Code debe leer ambos antes de empezar.

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
bienva-app/
├─ app/                        # expo-router
│  ├─ _layout.tsx              # providers: QueryClient, Supabase session, theme
│  ├─ (auth)/login.tsx
│  ├─ (onboarding)/_layout.tsx  # 7 pasos + "Tu plan"
│  ├─ (onboarding)/[step].tsx
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
type MealType = 'desayuno' | 'almuerzo' | 'snack' | 'cena';

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

Metas del usuario: `users.meta_kcal_min/max`, `meta_prot_min/max`, calculadas por `complete_onboarding`. "Dentro de meta" = entre min y max. Perfil: `sexo`, `fecha_nacimiento`, `altura_cm`, `peso_kg`, `peso_objetivo_kg`, `actividad`, `objetivo`, `ritmo_kg_semana`, `onboarding_completo`.

## 4. Pantallas y criterios de aceptación

Construir en este orden. Cada pantalla se prueba en Expo Go antes de pasar a la siguiente.

### P1 · Login (`(auth)/login.tsx`)
- Dos opciones en la misma pantalla: **email + contraseña** (`signInWithPassword`, con "Crear cuenta" y "Olvidé mi clave") y **"Enviarme un enlace"** (`signInWithOtp`). Deep link `bienva://auth/callback` en `app.json` y en Supabase Auth → URL Configuration.
- **La sesión persiste.** Se guarda en `expo-secure-store` con `autoRefreshToken: true`; Supabase la renueva sola. El usuario entra una vez y no vuelve a ver login hasta que cierre sesión o pasen 60 días sin abrir la app. Nunca se pide el enlace en cada apertura.
- Router raíz: sin sesión → login; con sesión y `users.onboarding_completo = false` → P1b; con sesión y onboarding completo → Hoy.
- **Listo cuando:** entras con `prueba@bienva.cl`, cierras la app, la matas, la abres y sigues dentro sin ver login.

### P1b · Onboarding (`(onboarding)/`, 7 pasos, solo la primera vez)
Una pregunta por pantalla, barra de progreso arriba, botón "Siguiente" grande, sin paywall, sin pedir permisos todavía. Se puede volver atrás. Todo se guarda al final con la RPC `complete_onboarding(...)`, que calcula las metas con Mifflin-St Jeor y deja `onboarding_completo = true`.

| Paso | Pregunta | Control | Guarda en |
|---|---|---|---|
| 1 | "¿Cómo te llamamos?" | texto | `users.nombre` |
| 2 | "¿Cuál es tu objetivo?" | 3 tarjetas: Bajar de peso · Mantenerme · Subir masa | `objetivo` |
| 3 | "Cuéntanos de ti" | sexo (Hombre/Mujer), fecha de nacimiento | `sexo`, `fecha_nacimiento` |
| 4 | "Tu altura y peso actual" | altura cm (ruleta), peso kg con un decimal | `altura_cm`, `peso_kg` (+ fila en `weights`) |
| 5 | "¿A qué peso quieres llegar?" (solo si objetivo ≠ mantener) y "¿A qué ritmo?" | peso objetivo; ritmo 0.25 / 0.5 / 0.75 kg por semana con texto "recomendado" en 0.5 | `peso_objetivo_kg`, `ritmo_kg_semana` |
| 6 | "¿Cuánto te mueves en la semana?" | 5 tarjetas: Sedentario · Ligero (1–2 días) · Moderado (3–4) · Activo (5–6) · Muy activo (diario o trabajo físico) | `actividad` |
| 7 | "¿A qué hora sueles cerrar el día?" | selector de hora, por defecto 21:00, texto "Te avisamos una sola vez, a esa hora, si no has registrado" | `hora_habitual_registro` |

Pantalla de cierre **"Tu plan"**: muestra `kcal_objetivo` y rango, proteína diaria, y una frase en lenguaje simple: "Con esto bajas unos 0,5 kg por semana; llegarías a 80 kg en marzo". Botón "Empezar". Recién aquí se piden los permisos de notificaciones (cámara se pide al usarla).

Reglas:
- Mínimos de seguridad: nunca menos de 1.500 kcal (hombre) / 1.200 (mujer); si el cálculo cae bajo eso, se fija en el mínimo y se avisa "bajamos el ritmo para que sea sano".
- Ritmo máximo 1 kg/semana; se sugiere 0,5.
- Fecha estimada de llegada = (peso − objetivo) / ritmo semanas, solo informativa.
- Copy sin culpa: nada de "peso ideal", "IMC malo" ni colores rojos. El IMC no se muestra.
- **Listo cuando:** con hombre, 1990-05-10, 175 cm, 90 kg, ligero, bajar 0,5 kg/sem, "Tu plan" muestra 1.951 kcal (rango 1.801–2.101) y 144–198 g de proteína (mismo resultado que `select * from compute_targets(...)`).

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

### P8 · Perfil y ajustes (`(tabs)/ajustes.tsx`)
- **Dashboard de la cuenta** arriba: nombre, objetivo, peso actual → peso objetivo con fecha estimada, gráfico de línea de los últimos 30 registros de `weights`, botón "Registrar peso de hoy" (upsert en `weights`, actualiza `users.peso_kg`).
- **Tu plan**: kcal objetivo y rango, proteína, actividad. Botón "Recalcular" que reabre los pasos 4–6 del onboarding y vuelve a llamar `complete_onboarding`.
- **Metas manuales**: kcal y prot (min/max) editables para quien tenga plan de nutricionista; al editar a mano se marca "personalizado" y no se recalcula solo.
- Recordatorio: hora, activar/desactivar. Cuenta: email, cambiar contraseña, cerrar sesión, borrar cuenta (v2).
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

**Tablas** (todas con RLS por `auth.uid()`): `users`, `foods` (solo lectura), `meals`, `meal_items`, `pending_photos`, `user_memory`, `messages`, `weights`. **Vistas:** `daily_totals`, `frequent_items`. **RPC:** `search_foods(q, lim)`, `compute_targets(...)` (solo lectura, para previsualizar el plan en el paso 7), `complete_onboarding(p_sexo, p_fecha_nac, p_altura_cm, p_peso_kg, p_peso_objetivo_kg, p_actividad, p_objetivo, p_ritmo_kg_semana, p_hora_registro, p_nombre)` → devuelve la fila de `users` actualizada.

Enums: `sexo_type` (hombre, mujer) · `actividad_type` (sedentario, ligero, moderado, activo, muy_activo) · `objetivo_type` (bajar, mantener, subir).

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
2. P1 Login con sesión persistente. Probar en Expo Go: entrar, matar la app, abrir, seguir dentro.
3. P1b Onboarding completo hasta "Tu plan". Verificar contra `compute_targets`.
4. P2 Hoy con las metas que dejó el onboarding.
5. P3 Registrar pestaña Texto + P4 Confirmar (recorrido completo texto → guardar → Hoy).
6. P3 pestañas Frecuentes y Foto.
7. Foto rápida + P5 Reconstruir.
8. P6 Semana.
9. P8 Perfil, dashboard de peso, ajustes y recordatorio.
10. P7 Coach cuando exista la Edge Function.

Commits pequeños, uno por pantalla o feature. No avanzar a la siguiente pantalla sin probar la anterior en el iPhone.

## 9. Fuera de alcance
Código de barras, Apple Health, recetas, ayuno, widgets, Android, pagos, Sign in with Apple, voz (dejar el botón deshabilitado).
