create extension if not exists pgcrypto;

create schema if not exists private;

revoke all on schema private from public;

create table if not exists private.gastroflow_sessions (
  token text primary key,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  perfil_nombre text not null,
  perfil_rol text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists idx_gastroflow_sessions_perfil_id
  on private.gastroflow_sessions (perfil_id);

create index if not exists idx_gastroflow_sessions_expires_at
  on private.gastroflow_sessions (expires_at)
  where revoked_at is null;

create table if not exists private.gastroflow_login_rate_limits (
  scope text primary key,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  locked_until timestamptz
);

create table if not exists public.reservas_historicas (
  like public.reservas including defaults including constraints including indexes
);

alter table public.reservas_historicas
  add column if not exists archivado_en timestamptz not null default now(),
  add column if not exists motivo_archivo text not null default 'retencion_operativa';

create or replace function private.gastroflow_request_headers()
returns jsonb
language sql
stable
security definer
set search_path = public, private, extensions
as $$
  select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb
$$;

create or replace function private.gastroflow_current_session_token()
returns text
language sql
stable
security definer
set search_path = public, private, extensions
as $$
  select nullif(private.gastroflow_request_headers() ->> 'x-gastroflow-session', '')
$$;

create or replace function private.gastroflow_current_session_record()
returns private.gastroflow_sessions
language sql
stable
security definer
set search_path = public, private, extensions
as $$
  select s.*
  from private.gastroflow_sessions s
  where s.token = private.gastroflow_current_session_token()
    and s.revoked_at is null
    and s.expires_at > now()
  order by s.created_at desc
  limit 1
$$;

create or replace function private.gastroflow_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, private, extensions
as $$
  select (private.gastroflow_current_session_record()).perfil_id
$$;

create or replace function private.gastroflow_current_role()
returns text
language sql
stable
security definer
set search_path = public, private, extensions
as $$
  select upper(coalesce((private.gastroflow_current_session_record()).perfil_rol, ''))
$$;

create or replace function private.gastroflow_permissions_for_role(p_role text)
returns text[]
language sql
stable
security definer
set search_path = public, private, extensions
as $$
  select case upper(coalesce(p_role, ''))
    when 'ADMINISTRADOR' then array[
      'MESAS_VER', 'PEDIDO_CREAR', 'CUENTA_SOLICITAR', 'INCIDENCIA_REPORTAR',
      'KDS_VER', 'KDS_ESTADO', 'MERMA_REGISTRAR',
      'CAJA_COBRAR', 'CAJA_DIVIDIR', 'CAJA_TURNO', 'CAJA_QUITAR_ITEM',
      'MENU_ADMINISTRAR', 'RECETAS_ADMINISTRAR', 'INVENTARIO_ADMINISTRAR',
      'USUARIOS_ADMINISTRAR', 'INCIDENCIA_RESOLVER', 'FACTURA_CORREGIR', 'REPORTES_FINANCIEROS'
    ]
    when 'SALONERO' then array['MESAS_VER', 'PEDIDO_CREAR', 'CUENTA_SOLICITAR', 'INCIDENCIA_REPORTAR']
    when 'COCINA' then array['KDS_VER', 'KDS_ESTADO', 'MERMA_REGISTRAR', 'INCIDENCIA_REPORTAR']
    when 'CAJERO' then array['MESAS_VER', 'CUENTA_SOLICITAR', 'CAJA_COBRAR', 'CAJA_DIVIDIR', 'CAJA_TURNO', 'CAJA_QUITAR_ITEM', 'INCIDENCIA_REPORTAR']
    else array[]::text[]
  end
$$;

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

create or replace function private.gastroflow_get_request_ip()
returns text
language sql
stable
security definer
set search_path = public, private, extensions
as $$
  select coalesce(
    nullif(private.gastroflow_request_headers() ->> 'x-forwarded-for', ''),
    nullif(private.gastroflow_request_headers() ->> 'x-real-ip', ''),
    'unknown'
  )
$$;

create or replace function private.gastroflow_assert_rate_limit(p_scope text)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  limit_row private.gastroflow_login_rate_limits%rowtype;
begin
  insert into private.gastroflow_login_rate_limits (scope, attempts, last_attempt_at, locked_until)
  values (p_scope, 0, now(), null)
  on conflict (scope) do nothing;

  select *
  into limit_row
  from private.gastroflow_login_rate_limits
  where scope = p_scope
  for update;

  if limit_row.locked_until is not null and limit_row.locked_until > now() then
    raise exception 'Demasiados intentos fallidos. Intente nuevamente más tarde.';
  end if;
end;
$$;

create or replace function private.gastroflow_record_failed_login(p_scope text)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  insert into private.gastroflow_login_rate_limits (scope, attempts, last_attempt_at, locked_until)
  values (p_scope, 1, now(), null)
  on conflict (scope) do update
  set attempts = case
      when private.gastroflow_login_rate_limits.last_attempt_at < now() - interval '15 minutes' then 1
      else private.gastroflow_login_rate_limits.attempts + 1
    end,
    last_attempt_at = now(),
    locked_until = case
      when (
        case
          when private.gastroflow_login_rate_limits.last_attempt_at < now() - interval '15 minutes' then 1
          else private.gastroflow_login_rate_limits.attempts + 1
        end
      ) >= 5 then now() + interval '30 minutes'
      else null
    end;
end;
$$;

create or replace function private.gastroflow_reset_rate_limit(p_scope text)
returns void
language sql
security definer
set search_path = public, private, extensions
as $$
  delete from private.gastroflow_login_rate_limits where scope = p_scope
$$;

-- bcrypt hashes generated by crypt() are longer than the legacy varchar(10) PIN field.
alter table public.perfiles
  alter column pin type text
  using pin::text;

update public.perfiles
set pin = crypt(pin, gen_salt('bf'))
where pin is not null
  and pin !~ '^\$2[aby]\$';

-- Los perfiles se gestionan mediante Administración; no recrear usuarios al migrar.

create or replace function public.gastroflow_list_login_profiles()
returns table (
  id uuid,
  nombre text,
  rol text,
  activo boolean,
  creado_en timestamptz
)
language sql
security definer
set search_path = public, private, extensions
as $$
  select p.id, p.nombre, upper(p.rol), p.activo, p.creado_en
  from public.perfiles p
  where p.activo = true
  order by p.nombre
$$;

create or replace function public.gastroflow_pin_login(p_pin text, p_perfil_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  profile_row public.perfiles%rowtype;
  session_token text;
  scope_key text;
begin
  scope_key := coalesce(p_perfil_id::text, private.gastroflow_get_request_ip());
  perform private.gastroflow_assert_rate_limit(scope_key);

  select *
  into profile_row
  from public.perfiles
  where activo = true
    and (p_perfil_id is null or id = p_perfil_id)
    and pin = crypt(trim(coalesce(p_pin, '')), pin)
  order by nombre
  limit 1;

  if profile_row.id is null then
    perform private.gastroflow_record_failed_login(scope_key);
    raise exception 'Código PIN incorrecto o usuario sin permisos activos.';
  end if;

  perform private.gastroflow_reset_rate_limit(scope_key);

  session_token := encode(gen_random_bytes(24), 'hex');

  insert into private.gastroflow_sessions (
    token,
    perfil_id,
    perfil_nombre,
    perfil_rol,
    expires_at
  )
  values (
    session_token,
    profile_row.id,
    profile_row.nombre,
    upper(profile_row.rol),
    now() + interval '12 hours'
  );

  return jsonb_build_object(
    'token', session_token,
    'login_time', now(),
    'permissions', private.gastroflow_permissions_for_role(profile_row.rol),
    'user', jsonb_build_object(
      'id', profile_row.id,
      'name', profile_row.nombre,
      'role_id', upper(profile_row.rol)
    )
  );
end;
$$;

create or replace function public.gastroflow_session_me()
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  session_row private.gastroflow_sessions%rowtype;
begin
  select *
  into session_row
  from private.gastroflow_current_session_record();

  if session_row.token is null then
    raise exception 'Sesión Gastroflow no válida o expirada.';
  end if;

  return jsonb_build_object(
    'token', session_row.token,
    'login_time', session_row.created_at,
    'permissions', private.gastroflow_permissions_for_role(session_row.perfil_rol),
    'user', jsonb_build_object(
      'id', session_row.perfil_id,
      'name', session_row.perfil_nombre,
      'role_id', upper(session_row.perfil_rol)
    )
  );
end;
$$;

create or replace function public.gastroflow_logout()
returns boolean
language sql
security definer
set search_path = public, private, extensions
as $$
  update private.gastroflow_sessions
  set revoked_at = now()
  where token = private.gastroflow_current_session_token()
    and revoked_at is null;

  select true
$$;

create or replace function public.gastroflow_validate_authorization_pin(p_pin text, p_allowed_roles text[])
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

  select *
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
    'error', null,
    'user', jsonb_build_object(
      'id', profile_row.id,
      'name', profile_row.nombre,
      'role_id', upper(profile_row.rol)
    )
  );
end;
$$;

create or replace function public.gastroflow_list_profiles_admin()
returns table (
  id uuid,
  nombre text,
  rol text,
  activo boolean,
  creado_en timestamptz
)
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  if not private.gastroflow_has_role(array['ADMINISTRADOR']) then
    raise exception 'Solo el administrador puede consultar perfiles.';
  end if;

  return query
  select p.id, p.nombre, upper(p.rol), p.activo, p.creado_en
  from public.perfiles p
  order by p.nombre;
end;
$$;

create or replace function public.gastroflow_admin_upsert_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  target_id uuid;
  target_row public.perfiles%rowtype;
  next_role text;
  next_name text;
  next_pin text;
  next_active boolean;
begin
  if not private.gastroflow_has_role(array['ADMINISTRADOR']) then
    raise exception 'Solo el administrador puede modificar perfiles.';
  end if;

  target_id := nullif(p_profile ->> 'id', '')::uuid;
  next_name := trim(coalesce(p_profile ->> 'nombre', ''));
  next_role := upper(trim(coalesce(p_profile ->> 'rol', 'SALONERO')));
  next_pin := trim(coalesce(p_profile ->> 'pin', ''));
  next_active := coalesce((p_profile ->> 'activo')::boolean, true);

  if next_name = '' then
    raise exception 'El nombre es obligatorio.';
  end if;

  if target_id is null then
    if next_pin = '' then
      raise exception 'El PIN es obligatorio para crear perfiles.';
    end if;

    insert into public.perfiles (nombre, pin, rol, activo)
    values (
      next_name,
      crypt(next_pin, gen_salt('bf')),
      lower(next_role),
      next_active
    )
    returning * into target_row;
  else
    update public.perfiles
    set nombre = next_name,
        rol = lower(next_role),
        activo = next_active,
        pin = case
          when next_pin = '' then public.perfiles.pin
          else crypt(next_pin, gen_salt('bf'))
        end
    where id = target_id
    returning * into target_row;
  end if;

  return jsonb_build_object(
    'id', target_row.id,
    'nombre', target_row.nombre,
    'rol', upper(target_row.rol),
    'activo', target_row.activo,
    'creado_en', target_row.creado_en
  );
end;
$$;

create or replace function public.gastroflow_admin_toggle_profile(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  target_row public.perfiles%rowtype;
begin
  if not private.gastroflow_has_role(array['ADMINISTRADOR']) then
    raise exception 'Solo el administrador puede activar o desactivar perfiles.';
  end if;

  update public.perfiles
  set activo = not activo
  where id = p_profile_id
  returning * into target_row;

  if target_row.id is null then
    raise exception 'Perfil no encontrado.';
  end if;

  return jsonb_build_object(
    'id', target_row.id,
    'nombre', target_row.nombre,
    'rol', upper(target_row.rol),
    'activo', target_row.activo,
    'creado_en', target_row.creado_en
  );
end;
$$;

create or replace function public.gastroflow_admin_delete_profile(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, private, extensions
as $$
begin
  if not private.gastroflow_has_role(array['ADMINISTRADOR']) then
    raise exception 'Solo el administrador puede eliminar perfiles.';
  end if;

  delete from public.perfiles where id = p_profile_id;
  return true;
end;
$$;

create or replace function public.actualizar_reserva_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create or replace function public.gastroflow_sync_pago_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.pedidos%rowtype;
begin
  select *
  into order_row
  from public.pedidos
  where id = new.pedido_id;

  if order_row.id is null then
    raise exception 'Pedido asociado no encontrado para el pago.';
  end if;

  new.subtotal := order_row.subtotal;
  new.impuesto_iva := order_row.impuesto_iva;
  new.impuesto_servicio := order_row.impuesto_servicio;
  new.total := order_row.total;
  new.pagado_en := coalesce(new.pagado_en, now());

  return new;
end;
$$;

drop trigger if exists trg_gastroflow_sync_pago_totals on public.pagos;
create trigger trg_gastroflow_sync_pago_totals
before insert or update on public.pagos
for each row
execute function public.gastroflow_sync_pago_totals();

create or replace function public.gastroflow_archive_stale_reservations(p_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  archived_count integer := 0;
begin
  with candidates as (
    select r.*
    from public.reservas r
    where upper(coalesce(r.estado, '')) in ('CANCELADA', 'COMPLETADA', 'NO_SE_PRESENTO')
      and coalesce(r.fecha_hora_fin, r.fecha_hora_inicio) <
        (((now() at time zone 'America/Costa_Rica')::date)::timestamp - make_interval(days => greatest(p_days, 1)))
  ),
  archived as (
    insert into public.reservas_historicas
    select c.*, now(), 'retencion_operativa'
    from candidates c
    where not exists (
      select 1
      from public.reservas_historicas h
      where h.id = c.id
    )
    returning id
  )
  delete from public.reservas r
  using archived a
  where r.id = a.id;

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$;

do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'categorias',
    'detalles_pedido',
    'incidencias_auditoria',
    'insumos_inventario',
    'mesas',
    'modificadores_producto',
    'pagos',
    'pedidos',
    'perfiles',
    'productos',
    'receta_ingredientes',
    'reservas'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    for policy_name in
      select pol.policyname
      from pg_policies pol
      where pol.schemaname = 'public'
        and pol.tablename = table_name
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    end loop;
  end loop;
end;
$$;

grant usage on schema public to anon;

grant select on public.categorias, public.detalles_pedido, public.incidencias_auditoria, public.insumos_inventario,
  public.mesas, public.modificadores_producto, public.pagos, public.pedidos, public.perfiles,
  public.productos, public.receta_ingredientes, public.reservas, public.reservas_historicas to anon;

grant insert, update on public.detalles_pedido, public.incidencias_auditoria, public.insumos_inventario,
  public.mesas, public.pagos, public.pedidos, public.perfiles, public.productos,
  public.receta_ingredientes, public.reservas, public.categorias, public.modificadores_producto to anon;

grant delete on public.perfiles, public.productos, public.categorias, public.modificadores_producto,
  public.receta_ingredientes to anon;

grant execute on function public.gastroflow_list_login_profiles() to anon;
grant execute on function public.gastroflow_pin_login(text, uuid) to anon;
grant execute on function public.gastroflow_session_me() to anon;
grant execute on function public.gastroflow_logout() to anon;
grant execute on function public.gastroflow_validate_authorization_pin(text, text[]) to anon;
grant execute on function public.gastroflow_list_profiles_admin() to anon;
grant execute on function public.gastroflow_admin_upsert_profile(jsonb) to anon;
grant execute on function public.gastroflow_admin_toggle_profile(uuid) to anon;
grant execute on function public.gastroflow_admin_delete_profile(uuid) to anon;
grant execute on function public.gastroflow_archive_stale_reservations(integer) to anon;

create policy gastroflow_mesas_select
on public.mesas
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_mesas_update
on public.mesas
for update
using (private.gastroflow_has_role(array['SALONERO', 'CAJERO', 'ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['SALONERO', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_catalog_select
on public.categorias
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_catalog_write
on public.categorias
for all
using (private.gastroflow_has_role(array['ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['ADMINISTRADOR']));

create policy gastroflow_productos_select
on public.productos
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_productos_write
on public.productos
for all
using (private.gastroflow_has_role(array['ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['ADMINISTRADOR']));

create policy gastroflow_modificadores_select
on public.modificadores_producto
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_modificadores_write
on public.modificadores_producto
for all
using (private.gastroflow_has_role(array['ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['ADMINISTRADOR']));

create policy gastroflow_insumos_select
on public.insumos_inventario
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_insumos_write
on public.insumos_inventario
for all
using (private.gastroflow_has_role(array['COCINA', 'ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['COCINA', 'ADMINISTRADOR']));

create policy gastroflow_recetas_select
on public.receta_ingredientes
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_recetas_write
on public.receta_ingredientes
for all
using (private.gastroflow_has_role(array['ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['ADMINISTRADOR']));

create policy gastroflow_perfiles_admin
on public.perfiles
for all
using (private.gastroflow_has_role(array['ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['ADMINISTRADOR']));

create policy gastroflow_pedidos_select
on public.pedidos
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_pedidos_insert
on public.pedidos
for insert
with check (
  private.gastroflow_has_role(array['ADMINISTRADOR'])
  or (
    private.gastroflow_has_role(array['SALONERO'])
    and salonero_id = private.gastroflow_current_profile_id()
  )
);

create policy gastroflow_pedidos_update
on public.pedidos
for update
using (
  private.gastroflow_has_role(array['ADMINISTRADOR', 'COCINA', 'CAJERO'])
  or (
    private.gastroflow_has_role(array['SALONERO'])
    and salonero_id = private.gastroflow_current_profile_id()
  )
)
with check (
  private.gastroflow_has_role(array['ADMINISTRADOR', 'COCINA', 'CAJERO'])
  or (
    private.gastroflow_has_role(array['SALONERO'])
    and salonero_id = private.gastroflow_current_profile_id()
  )
);

create policy gastroflow_detalles_select
on public.detalles_pedido
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_detalles_insert
on public.detalles_pedido
for insert
with check (
  private.gastroflow_has_role(array['ADMINISTRADOR'])
  or exists (
    select 1
    from public.pedidos p
    where p.id = detalles_pedido.pedido_id
      and p.salonero_id = private.gastroflow_current_profile_id()
  )
);

create policy gastroflow_detalles_update
on public.detalles_pedido
for update
using (
  private.gastroflow_has_role(array['ADMINISTRADOR', 'COCINA', 'CAJERO'])
  or exists (
    select 1
    from public.pedidos p
    where p.id = detalles_pedido.pedido_id
      and p.salonero_id = private.gastroflow_current_profile_id()
  )
)
with check (
  private.gastroflow_has_role(array['ADMINISTRADOR', 'COCINA', 'CAJERO'])
  or exists (
    select 1
    from public.pedidos p
    where p.id = detalles_pedido.pedido_id
      and p.salonero_id = private.gastroflow_current_profile_id()
  )
);

create policy gastroflow_pagos_select
on public.pagos
for select
using (private.gastroflow_has_role(array['CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_pagos_insert
on public.pagos
for insert
with check (private.gastroflow_has_role(array['CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_incidencias_select
on public.incidencias_auditoria
for select
using (private.gastroflow_has_role(array['COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_incidencias_insert
on public.incidencias_auditoria
for insert
with check (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_incidencias_update
on public.incidencias_auditoria
for update
using (private.gastroflow_has_role(array['ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['ADMINISTRADOR']));

create policy gastroflow_reservas_select
on public.reservas
for select
using (private.gastroflow_has_role(array['SALONERO', 'COCINA', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_reservas_insert
on public.reservas
for insert
with check (
  private.gastroflow_has_role(array['SALONERO', 'CAJERO', 'ADMINISTRADOR'])
  and fecha_hora_inicio >= ((now() at time zone 'America/Costa_Rica')::date::timestamp - interval '1 day')
);

create policy gastroflow_reservas_update
on public.reservas
for update
using (private.gastroflow_has_role(array['SALONERO', 'CAJERO', 'ADMINISTRADOR']))
with check (private.gastroflow_has_role(array['SALONERO', 'CAJERO', 'ADMINISTRADOR']));

create policy gastroflow_reservas_historicas_admin
on public.reservas_historicas
for select
using (private.gastroflow_has_role(array['ADMINISTRADOR']));

create index if not exists idx_detalles_pedido_pedido_id on public.detalles_pedido (pedido_id);
create index if not exists idx_detalles_pedido_producto_id on public.detalles_pedido (producto_id);
create index if not exists idx_incidencias_auditoria_pedido_id on public.incidencias_auditoria (pedido_id);
create index if not exists idx_modificadores_producto_categoria_id on public.modificadores_producto (categoria_id);
create index if not exists idx_pagos_pedido_id on public.pagos (pedido_id);
create index if not exists idx_pedidos_mesa_id on public.pedidos (mesa_id);
create index if not exists idx_pedidos_salonero_id on public.pedidos (salonero_id);
create index if not exists idx_productos_categoria_id on public.productos (categoria_id);
create index if not exists idx_receta_ingredientes_insumo_id on public.receta_ingredientes (insumo_id);
create index if not exists idx_receta_ingredientes_producto_id on public.receta_ingredientes (producto_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_insumos_stock_actual_nonnegative') then
    alter table public.insumos_inventario
      add constraint chk_insumos_stock_actual_nonnegative check (stock_actual >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_insumos_stock_minimo_nonnegative') then
    alter table public.insumos_inventario
      add constraint chk_insumos_stock_minimo_nonnegative check (stock_minimo >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_insumos_costo_nonnegative') then
    alter table public.insumos_inventario
      add constraint chk_insumos_costo_nonnegative check (costo_unitario >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pedidos_comensales_positive') then
    alter table public.pedidos
      add constraint chk_pedidos_comensales_positive check (comensales > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pedidos_subtotal_nonnegative') then
    alter table public.pedidos
      add constraint chk_pedidos_subtotal_nonnegative check (subtotal >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pedidos_impuesto_iva_nonnegative') then
    alter table public.pedidos
      add constraint chk_pedidos_impuesto_iva_nonnegative check (impuesto_iva >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pedidos_impuesto_servicio_nonnegative') then
    alter table public.pedidos
      add constraint chk_pedidos_impuesto_servicio_nonnegative check (impuesto_servicio >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pedidos_total_nonnegative') then
    alter table public.pedidos
      add constraint chk_pedidos_total_nonnegative check (total >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pagos_subtotal_nonnegative') then
    alter table public.pagos
      add constraint chk_pagos_subtotal_nonnegative check (subtotal >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pagos_impuesto_iva_nonnegative') then
    alter table public.pagos
      add constraint chk_pagos_impuesto_iva_nonnegative check (impuesto_iva >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pagos_impuesto_servicio_nonnegative') then
    alter table public.pagos
      add constraint chk_pagos_impuesto_servicio_nonnegative check (impuesto_servicio >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_pagos_total_nonnegative') then
    alter table public.pagos
      add constraint chk_pagos_total_nonnegative check (total >= 0);
  end if;
end;
$$;
