-- Corrige la comparación text = text[] que impedía validar el PIN
-- al ingresar al módulo de Administración.

create or replace function private.gastroflow_has_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, private, extensions
as $$
  select exists (
    select 1
    from unnest(coalesce(p_roles, array[]::text[])) as allowed(role_name)
    where upper(allowed.role_name) = private.gastroflow_current_role()
  )
$$;

create or replace function public.gastroflow_validate_authorization_pin(
  p_pin text,
  p_allowed_roles text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  profile_row public.perfiles%rowtype;
begin
  if private.gastroflow_current_session_token() is null then
    raise exception 'Sesión requerida para validar autorizaciones.';
  end if;

  select p.*
  into profile_row
  from public.perfiles p
  where p.activo = true
    and exists (
      select 1
      from unnest(coalesce(p_allowed_roles, array[]::text[])) as allowed(role_name)
      where upper(allowed.role_name) = upper(p.rol)
    )
    and p.pin = crypt(trim(coalesce(p_pin, '')), p.pin)
  order by p.nombre
  limit 1;

  if profile_row.id is null then
    return jsonb_build_object(
      'valid', false,
      'user', null,
      'error', 'PIN de autorización no válido.'
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'user', jsonb_build_object(
      'id', profile_row.id,
      'name', profile_row.nombre,
      'role_id', upper(profile_row.rol)
    ),
    'error', null
  );
end;
$$;
