-- Migración 003: contador atómico de uso de IA (lo llama la Edge Function con service_role)
create or replace function increment_ai_usage(p_user uuid, p_fecha date, p_fotos int default 0, p_mensajes int default 0)
returns void language sql security definer set search_path = public as $$
  insert into ai_usage (user_id, fecha, fotos, mensajes)
  values (p_user, p_fecha, p_fotos, p_mensajes)
  on conflict (user_id, fecha) do update
    set fotos    = ai_usage.fotos    + excluded.fotos,
        mensajes = ai_usage.mensajes + excluded.mensajes;
$$;
