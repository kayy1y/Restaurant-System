-- Relaciona cada acompañamiento con un producto concreto.
-- categoria_id se conserva para compatibilidad histórica, pero el flujo POS
-- solo consulta filas con producto_id.

alter table public.modificadores_producto
  add column if not exists producto_id varchar(50);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'modificadores_producto_producto_id_fkey'
      and conrelid = 'public.modificadores_producto'::regclass
  ) then
    alter table public.modificadores_producto
      add constraint modificadores_producto_producto_id_fkey
      foreign key (producto_id)
      references public.productos(id)
      on delete cascade;
  end if;
end
$$;

create index if not exists idx_modificadores_producto_producto_id
  on public.modificadores_producto (producto_id);
