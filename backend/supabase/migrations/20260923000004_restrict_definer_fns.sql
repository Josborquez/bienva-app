-- Migración 004: cerrar funciones security definer expuestas por la API.
-- increment_ai_usage la llama solo analyze con service_role; si queda abierta,
-- cualquier usuario puede inflar el contador de fotos de otro y dejarlo sin cuota.
-- handle_new_auth_user es un trigger: no necesita EXECUTE para dispararse.
revoke execute on function increment_ai_usage(uuid, date, int, int) from public, anon, authenticated;
grant  execute on function increment_ai_usage(uuid, date, int, int) to service_role;

revoke execute on function handle_new_auth_user() from public, anon, authenticated;
