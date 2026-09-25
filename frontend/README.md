# Bienva

Nutrición simple. Tu bienestar, a tu ritmo.

## Estado

Login con correo y contraseña, creación de cuenta, recuperación de clave y magic link alternativo implementados según `../docs/SPEC (1).md`. El acceso por enlace web se comprobó; el recorrido real con contraseña y la persistencia al reabrir Chrome siguen pendientes de confirmación. P1 nativa aún no se ha validado en iPhone.

### Acceso con contraseña

- En el login: correo + contraseña → «Entrar». Las cuentas nuevas usan «Crear cuenta»; si Supabase exige confirmar el correo, se muestra el aviso correspondiente.
- Si antes se entraba por enlace y la sesión sigue activa: Hoy → «Definir o cambiar contraseña». No requiere pedir otro correo, salvo que Supabase solicite reautenticación.
- Sin sesión: «Olvidé mi clave» envía un correo de recuperación. Su retorno usa el callback ya autorizado, `/auth/callback`; `type=recovery` abre `/auth/password` después de establecer la sesión.
- Las contraseñas solo se mantienen en el formulario y se envían al SDK de Supabase; no se guardan en borradores ni se registran en logs. Al crear/cambiar clave se requieren 8 caracteres y confirmación; al entrar se aceptan claves existentes más cortas.
- Verificar con una cuenta real: entrar, recargar, cerrar y reabrir, cerrar sesión, recuperar clave y entrar con la nueva. Probar clave incorrecta y enlace vencido. No se modificó la política remota de sesiones ni se ha validado la caducidad de 60 días que pide la spec.

### Onboarding y Tu plan

Los usuarios con `onboarding_completo = false` pasan por `/bienvenida` antes de Hoy o Registrar. Los siete pasos conservan el avance en AsyncStorage por usuario y permiten retroceder. Mantener usa el peso actual y ritmo cero. Se validan fechas, edad 16–100 según la migración 005, medidas, dirección del peso objetivo, coma decimal y horario. La recuperación de contraseña sigue accesible aunque el perfil no cargue.

«Ver mi plan» consulta `compute_targets` sin escribir datos. «Empezar» llama una vez a `complete_onboarding` (perfil, metas y peso inicial en una transacción del backend), actualiza la caché de Hoy y elimina el borrador local. Un fallo permite reintentar. Las metas vienen del servidor; no hay una fórmula alternativa en el frontend. Si se alcanza el mínimo calórico, se muestra el ajuste de ritmo y se omite la fecha estimada.

Al empezar se pide permiso de notificaciones en el teléfono, opcional y sin bloquear el guardado si se rechaza. En web no se solicitan permisos. El horario se guarda; la programación y cancelación del recordatorio según comidas corresponde a P8 y aún está pendiente, como indica la pantalla.

Prueba real pendiente: cuenta sin onboarding → completar los siete pasos → Tu plan → Empezar → Hoy con metas → recargar y seguir en Hoy. Probar también Mantener, retroceso, recarga intermedia, error de conexión y reintento. El fixture hombre, 1990-05-10, 175 cm, 90 kg, ligero y bajar 0,5 espera 1.951 kcal / 1.801–2.101 / 144–198 g al 25-09-2026. La consulta remota sin sesión devolvió 401, acorde a los permisos de la migración 005; no se ha validado el cálculo remoto autenticado ni el guardado real. Los tipos de perfil y RPC se ampliaron a partir de las migraciones 004/005, sin regenerar todo el esquema.

Hoy lee las metas y comidas reales del usuario. Registrar abre Frecuentes por defecto: filtra por usuario y tipo de comida, permite buscar con `search_foods`, seleccionar varios alimentos y ajustar porciones con recálculo proporcional de nutrientes. No llama a la IA para esa selección. La pestaña Texto sigue disponible con `analyze`. Ambas rutas permiten revisar/editar los ítems y guardar `meals` + `meal_items`; la revisión está integrada en Registrar.

Los borradores, incluidas las selecciones de alimentos y cantidades, se guardan localmente por usuario con AsyncStorage durante la edición. Los ítems se sincronizan con Supabase después del análisis, al agregar la selección para revisarla o al pulsar «Guardar borrador y volver». Las selecciones aún no agregadas quedan en este dispositivo. Los identificadores estables permiten reintentar sin duplicar comidas; solo se incluyen en los totales al terminar de guardar todos los ítems.

Pendientes: validar el recorrido completo contra Supabase desde la web/iPhone, edición de comidas ya guardadas, fotos, reconstrucción, Semana, Coach y Ajustes. P2–P4 no se consideran aceptadas todavía. Se avanza por autorización del usuario sin bloquear el desarrollo por las pruebas de magic links.
Leer `CLAUDE.md` y `SPEC.md` antes de continuar.

### Comprobar el recorrido de comidas

1. Abrir Hoy con una cuenta sin comidas: debe mostrar «Sin registro todavía», sin «0 kcal».
2. Registrar → Texto → escribir «2 huevos y pan con palta» → Analizar. Revisar alimentos, cantidad y nutrientes; confirmar las porciones marcadas.
3. Guardar: debe volver a Hoy con la comida y sus totales, sin incluir borradores.
4. Empezar otra comida, cerrar y reabrir el registro: «Para retomar» recupera el texto o los ítems. «Guardar borrador y volver» también sincroniza los ítems con la cuenta.
5. Simular un fallo de red al guardar y reintentar: debe conservar el avance y producir una sola comida.
6. Registrar → Frecuentes: buscar «palta», seleccionar varios alimentos, ajustar porciones (también acepta coma decimal) y agregar la selección. Los nutrientes deben escalar proporcionalmente y conservar `food_id`.
7. Cambiar entre Texto/Frecuentes, buscar otro alimento o cerrar el borrador: las selecciones deben mantenerse. Un alimento repetido en búsqueda y frecuentes solo puede seleccionarse una vez.
8. Los frecuentes aparecen después de 3 registros del mismo alimento en el mismo tipo de comida. Al cambiar entre desayuno/almuerzo/once se consulta el grupo correspondiente. Si no hay frecuentes, el buscador sigue disponible.

## Ejecutar

### Prueba web en Vercel

Sitio de prueba: https://bienva-web.vercel.app (proyecto `bienva-web`).
Desplegado con Vercel CLI desde `frontend/`; GitHub aún no está conectado a Vercel.
Callback que debe autorizar el responsable del backend: `https://bienva-web.vercel.app/auth/callback`.

La versión web permite probar el login desde Safari sin conexión a Metro.
No sustituye la aceptación de P1 en la app nativa: deep links y SecureStore requieren iPhone/Expo Go.
En web la sesión persiste en IndexedDB; en iOS sigue usando SecureStore.

1. Importar el repositorio en Vercel con **Root Directory: `frontend`** y framework **Other**.
2. Configurar `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` con los valores públicos de `.env`.
3. `vercel.json` configura el build (`npm run build:web`), salida `dist` y rutas, incluido `/auth/callback`.
4. Cuando exista el dominio definitivo de prueba, autorizar `https://<dominio>/auth/callback` en Supabase Auth → URL Configuration → Redirect URLs. Coordinar este paso con quien lleva el backend; no hace falta cambiar el Site URL global.
5. Abrir el sitio, pedir un magic link y abrirlo en el mismo navegador. Comprobar Hoy, recarga, cierre/reapertura y cierre de sesión. Probar también correo inválido y enlace vencido.

Para desarrollar localmente: `npm run web`. Para exportar: `npm run build:web`.
Las variables públicas se incorporan al compilar; si se cambian en Vercel hay que volver a desplegar.

### Prueba nativa

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
notificaciones usa el idioma de iOS; se solicita al pulsar «Empezar» en Tu plan. En Expo Go los permisos
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

Verificado localmente: TypeScript sin errores, 28 tests aprobados y bundles web/iOS generados.
Las pruebas incluyen fechas por zona horaria, metas, validación de respuestas de IA y reintentos de guardado con fallos simulados; no sustituyen el recorrido real autenticado.
`npm audit` reporta 21 avisos (9 altos y 12 moderados) en el árbol
de dependencias de SDK 54. Las correcciones propuestas incluyen cambios mayores de Expo;
queda pendiente revisarlos al migrar de SDK, antes de distribuir la app.

## Tipos del backend

`src/types/domain.ts` contiene el contrato de dominio del SDD. `src/types/database.ts` ya está generado y `createClient<Database>` tipa las consultas. Para regenerarlo al cambiar el esquema, usar Supabase CLI autenticado: `supabase gen types typescript --project-id jbtlwnwrplgbzdsaqvjl` y guardar la salida UTF-8 en ese archivo.

No se modificaron Auth, tablas, Storage ni Edge Functions del proyecto remoto.
