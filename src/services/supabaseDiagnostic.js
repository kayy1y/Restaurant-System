import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export async function testSupabaseConnection() {
  const result = {
    isConfigured: isSupabaseConfigured,
    url: import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('GASTRO_SUPABASE_URL') || 'No configurada',
    dbPingSuccess: false,
    dbPingMessage: '',
    tablesExist: false,
    timestamp: new Date().toLocaleTimeString('es-CR')
  };

  if (!isSupabaseConfigured || !supabase) {
    result.dbPingMessage = 'Faltan credenciales o la URL ingresada no es una URL válida de Supabase.';
    return result;
  }

  try {
    // 1. Probar lectura de la tabla de mesas
    const { data: mesasData, error: mesasErr } = await supabase
      .from('mesas')
      .select('id')
      .limit(1);

    if (mesasErr) {
      if (mesasErr.code === '42P01' || mesasErr.message.includes('does not exist')) {
        result.dbPingSuccess = false;
        result.dbPingMessage = '⚠️ Conexión exitosa a Supabase, PERO aún no has creado las tablas en el SQL Editor. Copia y pega el script SQL en Supabase para crearlas.';
        result.tablesExist = false;
      } else {
        result.dbPingSuccess = false;
        result.dbPingMessage = `Error de permisos o conexión en Supabase: ${mesasErr.message}`;
      }
      return result;
    }

    // 2. Probar lectura de la tabla de pedidos
    const { data: pedidosData, error: pedidosErr } = await supabase
      .from('pedidos')
      .select('id')
      .limit(1);

    if (pedidosErr) {
      result.dbPingSuccess = false;
      result.dbPingMessage = '⚠️ La tabla de mesas existe pero falta la tabla de pedidos. Vuelve a ejecutar el script SQL completo en Supabase.';
      result.tablesExist = false;
      return result;
    }

    result.dbPingSuccess = true;
    result.tablesExist = true;
    result.dbPingMessage = '✅ ¡SISTEMA 100% LISTO! Las tablas de PostgreSQL y la transmisión Realtime en la nube están activas y respondiendo correctamente.';
  } catch (err) {
    result.dbPingSuccess = false;
    result.dbPingMessage = `Excepción consultando Supabase: ${err.message}`;
  }

  return result;
}

export const GASTROFLOW_OFFICIAL_SQL_SCRIPT = `-- =============================================================================
-- GASTROFLOW OS v4.3 - ESQUEMA OFICIAL PARA SUPABASE POSTGRESQL (LA VID 2025)
-- =============================================================================

create extension if not exists "uuid-ossp";

create table if not exists public.perfiles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  pin varchar(10) not null,
  rol text not null check (rol in ('administrador', 'salonero', 'cocina', 'cajero')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table if not exists public.mesas (
  id varchar(20) primary key,
  numero integer not null unique,
  nombre text not null,
  capacidad integer not null default 4,
  zona text not null default 'Salón Principal',
  estado text not null default 'disponible' check (estado in ('disponible', 'ocupada', 'esperando', 'en_cobro', 'con_incidencia')),
  creado_en timestamptz not null default now()
);

create table if not exists public.categorias (
  id varchar(50) primary key,
  nombre text not null unique,
  orden integer default 1,
  activo boolean not null default true
);

create table if not exists public.productos (
  id varchar(50) primary key,
  sku_code varchar(30) unique,
  categoria_id varchar(50) references public.categorias(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio_base numeric(10,2) not null check (precio_base >= 0),
  area_preparacion text default 'cocina_caliente' check (area_preparacion in ('cocina_caliente', 'cocina_fria', 'barra')),
  tiempo_preparacion_min integer default 12,
  estado text not null default 'ACTIVO' check (estado in ('ACTIVO', 'BORRADOR', 'AGOTADO', 'INACTIVO')),
  disponible boolean not null default true,
  es_gluten_free boolean default false,
  es_picante boolean default false,
  imagen_url text,
  creado_en timestamptz not null default now()
);

create table if not exists public.modificadores_producto (
  id varchar(50) primary key,
  categoria_id varchar(50) references public.categorias(id) on delete cascade,
  codigo_opcion varchar(50) not null,
  nombre_opcion text not null,
  precio_extra numeric(10,2) default 0.00 check (precio_extra >= 0)
);

create table if not exists public.insumos_inventario (
  id varchar(50) primary key,
  sku_code varchar(30) unique,
  nombre text not null,
  stock_actual numeric(10,3) not null default 0,
  stock_minimo numeric(10,3) not null default 5,
  unidad_medida varchar(20) not null default 'kg',
  costo_unitario numeric(10,2) not null default 0,
  actualizado_en timestamptz not null default now()
);

create table if not exists public.receta_ingredientes (
  id varchar(50) primary key,
  producto_id varchar(50) references public.productos(id) on delete cascade,
  insumo_id varchar(50) references public.insumos_inventario(id) on delete cascade,
  cantidad numeric(10,3) not null check (cantidad > 0),
  unidad_medida varchar(20) default 'kg'
);

create table if not exists public.pedidos (
  id varchar(50) primary key,
  mesa_id varchar(20) references public.mesas(id) on delete set null,
  nombre_mesa text not null,
  salonero_id uuid references public.perfiles(id) on delete set null,
  nombre_salonero text not null,
  comensales integer not null default 2,
  estado text not null default 'ENVIADO_A_COCINA' check (estado in ('ENVIADO_A_COCINA', 'EN_PREPARACION', 'LISTO_PARA_ENTREGA', 'ENTREGADO', 'ESPERANDO_CUENTA', 'EN_COBRO', 'PAGADO', 'CANCELADO')),
  estado_cuenta text not null default 'ABIERTA' check (estado_cuenta in ('ABIERTA', 'SOLICITADA', 'EN_COBRO', 'PAGADA')),
  subtotal numeric(10,2) not null default 0,
  impuesto_iva numeric(10,2) not null default 0,
  impuesto_servicio numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists public.detalles_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id varchar(50) not null references public.pedidos(id) on delete cascade,
  producto_id varchar(50) references public.productos(id),
  nombre_producto text not null,
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  cantidad integer not null check (cantidad > 0),
  monto_total numeric(10,2) not null check (monto_total >= 0),
  personalizaciones text[],
  indicacion_escrita text,
  audio_url text,
  audio_duracion_seg integer default 0,
  audio_transcripcion text,
  estado text not null default 'ENVIADO_A_COCINA' check (estado in ('ENVIADO_A_COCINA', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'RETIRADO_DE_CUENTA', 'CANCELADO')),
  motivo_retiro text,
  retirado_por text,
  retirado_en timestamptz,
  creado_en timestamptz not null default now()
);

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id varchar(50) not null references public.pedidos(id),
  cajero_nombre text not null,
  metodo_pago text not null check (metodo_pago in ('Tarjeta POS', 'Efectivo', 'SINPE Movil', 'Dolares')),
  nombre_cliente text default 'Consumidor Final',
  subtotal numeric(10,2) not null,
  impuesto_iva numeric(10,2) not null,
  impuesto_servicio numeric(10,2) not null,
  total numeric(10,2) not null,
  clave_hacienda_50 varchar(50) unique,
  consecutivo_20 varchar(20),
  estado_fiscal text default 'PENDIENTE_CONEXION' check (estado_fiscal in ('PENDIENTE_CONEXION', 'ACEPTADO', 'RECHAZADO', 'ANULADO')),
  pagado_en timestamptz not null default now()
);

create table if not exists public.incidencias_auditoria (
  id uuid primary key default gen_random_uuid(),
  pedido_id varchar(50) references public.pedidos(id) on delete set null,
  nombre_usuario text not null,
  categoria_incidencia text not null,
  motivo_escrito text not null,
  autorizado_por text,
  efecto_inventario text default 'SIN_REPOSICION',
  creado_en timestamptz not null default now()
);

alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.detalles_pedido;
alter publication supabase_realtime add table public.mesas;
alter publication supabase_realtime add table public.pagos;

insert into public.perfiles (id, nombre, pin, rol)
values
  ('11111111-1111-1111-1111-111111111111', 'Laura', '1234', 'salonero'),
  ('22222222-2222-2222-2222-222222222222', 'Carlos', '1111', 'salonero'),
  ('33333333-3333-3333-3333-333333333333', 'Chef Mario', '2222', 'cocina'),
  ('44444444-4444-4444-4444-444444444444', 'Ana Cajera', '3333', 'cajero'),
  ('55555555-5555-5555-5555-555555555555', 'Admin General', '9999', 'administrador')
on conflict (id) do nothing;

insert into public.mesas (id, numero, nombre, capacidad, zona)
values
  ('T-01', 1, 'Mesa 1', 4, 'Salón Principal'),
  ('T-02', 2, 'Mesa 2', 2, 'Salón Principal'),
  ('T-03', 3, 'Mesa 3', 6, 'Terraza Bar'),
  ('T-04', 4, 'Mesa 4', 4, 'Terraza Bar'),
  ('T-05', 5, 'Mesa 5 VIP', 8, 'Cava Privada'),
  ('T-06', 6, 'Mesa 6', 2, 'Salón Principal')
on conflict (id) do nothing;

insert into public.categorias (id, nombre, orden)
values
  ('cat-carnes-res', 'Cortes de Res Premium', 1),
  ('cat-hamburguesas', 'Hamburguesas Gourmet', 2),
  ('cat-entradas-frias', 'Entradas & Ceviches', 3),
  ('cat-bebidas', 'Bebidas & Coctelería', 4),
  ('cat-postres', 'Postres de la Casa', 5)
on conflict (id) do nothing;

insert into public.productos (id, sku_code, categoria_id, nombre, descripcion, precio_base, area_preparacion, es_gluten_free)
values
  ('prod-ribeye-350g', 'SKU-001', 'cat-carnes-res', 'Rib Eye Angus 350g', 'Corte con marmoleo superior a la parrilla de carbón', 14500.00, 'cocina_caliente', true),
  ('prod-hamburguesa-angus', 'SKU-002', 'cat-hamburguesas', 'Hamburguesa Angus La Vid', '200g carne Angus, queso cheddar madurado, tocino ahumado', 7800.00, 'cocina_caliente', false),
  ('prod-ceviche-tico', 'SKU-003', 'cat-entradas-frias', 'Ceviche Tico Tradicional', 'Corvina reina fresca marinado en limón mandarina', 6500.00, 'cocina_fria', true),
  ('prod-sangria-caraf', 'SKU-004', 'cat-bebidas', 'Jarra Sangría Artesanal 1L', 'Vino tinto reserva, frutas de temporada y licor de naranja', 9500.00, 'barra', false),
  ('prod-volcan-chocolate', 'SKU-005', 'cat-postres', 'Volcán de Chocolate', 'Bizcocho tibio con centro fluido de chocolate y helado', 4200.00, 'cocina_fria', false)
on conflict (id) do nothing;
`;
