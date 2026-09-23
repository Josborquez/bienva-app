# Bienva

Nutrición simple. Tu bienestar, a tu ritmo.

## Estado

Estructura y P1 Login implementados, pendientes de validación real en iPhone.
Hoy es una pantalla provisional para comprobar la sesión. P2–P8 aún no están implementadas.
Leer `CLAUDE.md` y `SPEC.md` antes de continuar.

## Ejecutar

1. `npm install`
2. Copiar `.env.example` a `.env` y completar `EXPO_PUBLIC_SUPABASE_ANON_KEY` con la clave pública del proyecto `jbtlwnwrplgbzdsaqvjl` (nunca `service_role`).
3. `npm start` y abrir el QR con el iPhone en la misma red.

Se usa Expo SDK 54 para la primera prueba con Expo Go de App Store sin cuenta Apple Developer.
Es una excepción de compatibilidad al requisito de SDK actual: npm publica SDK 57, pero
[Expo documenta que Expo Go de App Store se queda en SDK 54](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/).
Revisar esta elección al cambiar a una compilación propia.

## Configurar magic links

En Supabase → Authentication → URL Configuration → Redirect URLs, autorizar:

- `bienva://auth/callback` para una compilación propia.
- La dirección de Metro del equipo con `/--/auth/callback`, por ejemplo `exp://192.168.1.10:8081/--/auth/callback`, para Expo Go. Usar la IP real que muestra `npm start`; actualizar la autorización si cambia la IP.

La app elige automáticamente el callback según el entorno. No es necesario cambiar el Site URL
global del backend. El esquema `bienva` no se registra en el teléfono hasta instalar una compilación propia.
Referencia: [deep links de Expo](https://docs.expo.dev/linking/into-your-app/).

Los permisos de cámara y galería están preparados en español. El diálogo del sistema de
notificaciones usa el idioma de iOS; se solicitará al implementar P8. En Expo Go los permisos
nativos pertenecen a Expo Go; las descripciones propias se verifican en una compilación de Bienva.

## Prueba P1 en iPhone (obligatoria antes de P2)

1. Introducir el correo y tocar «Enviarme el enlace». Confirmar recepción.
2. Abrir el enlace en el mismo iPhone. Debe mostrar Hoy y «Ya estás dentro».
3. Cerrar completamente Expo Go y volver a abrir el proyecto. Debe seguir en Hoy.
4. Cerrar sesión. Debe volver al login; repetir cierre y reapertura para comprobar que sigue fuera.
5. Abrir un enlace vencido o ya usado. Debe permitir pedir otro sin bloquear la app.
6. Probar correo inválido y envío sin conexión. Deben mostrar mensajes recuperables.

Esta prueba aún no se ha realizado. No marcar P1 como aceptada por pasar solo las verificaciones locales.

## Verificaciones locales

`npm run typecheck`, `npm test`, `npx expo install --check` y `npx expo export --platform ios`.
Los tests cubren enlaces nativos/Expo Go, rechazo de callbacks inválidos y persistencia fragmentada
en SecureStore, incluyendo escrituras fallidas y cierre de sesión. No sustituyen Supabase ni el iPhone.

Verificado localmente: TypeScript sin errores, 8 tests aprobados, dependencias compatibles
y bundle de iOS generado. `npm audit` reporta 21 avisos (9 altos y 12 moderados) en el árbol
de dependencias de SDK 54. Las correcciones propuestas incluyen cambios mayores de Expo;
queda pendiente revisarlos al migrar de SDK, antes de distribuir la app.

## Tipos del backend

`src/types/domain.ts` contiene el contrato de dominio del SDD. `database.ts` está pendiente de
generación con acceso autenticado al proyecto; no se inventaron columnas del backend.
Con Supabase CLI autenticado: `supabase gen types typescript --project-id jbtlwnwrplgbzdsaqvjl`.
Guardar su salida UTF-8 en `src/types/database.ts` y tipar `createClient<Database>` antes de P2.

No se modificaron Auth, tablas, Storage ni Edge Functions del proyecto remoto.
