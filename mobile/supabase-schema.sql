-- Sistema de Gestion de Escuela de Patinaje - Supabase Schema

create extension if not exists "pgcrypto";

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  nombre text not null,
  fecha_nacimiento date,
  genero text check (genero in ('masculino', 'femenino', 'otro', 'prefiero_no_decir')),
  correo text not null unique,
  telefono text,
  metodo_pago text,
  rol text not null default 'alumno' check (rol in ('alumno', 'instructor', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instructores (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuarios(id) on delete cascade,
  especialidad text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clases (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  horario timestamptz not null,
  nivel text not null,
  instructor_id uuid references public.instructores(id) on delete set null,
  cupo_maximo integer not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clase_alumnos (
  id uuid primary key default gen_random_uuid(),
  clase_id uuid not null references public.clases(id) on delete cascade,
  alumno_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (clase_id, alumno_id)
);

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  clase_id uuid references public.clases(id) on delete set null,
  monto numeric(10,2) not null default 0,
  metodo_pago text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'pagado')),
  fecha_pago timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asistencia (
  id uuid primary key default gen_random_uuid(),
  clase_id uuid not null references public.clases(id) on delete cascade,
  alumno_id uuid not null references public.usuarios(id) on delete cascade,
  instructor_id uuid references public.instructores(id) on delete set null,
  fecha date not null,
  presente boolean not null default false,
  created_at timestamptz not null default now(),
  unique (clase_id, alumno_id, fecha)
);

create table if not exists public.testimonios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios(id) on delete set null,
  autor text not null,
  contenido text not null,
  puntuacion integer check (puntuacion between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.noticias (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contenido text not null,
  fecha_evento date,
  publicado boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.galeria (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text,
  tipo text not null default 'imagen' check (tipo in ('imagen', 'video')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.informacion_institucional (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  contenido text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_usuarios_updated on public.usuarios;
create trigger trg_usuarios_updated
before update on public.usuarios
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_instructores_updated on public.instructores;
create trigger trg_instructores_updated
before update on public.instructores
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_clases_updated on public.clases;
create trigger trg_clases_updated
before update on public.clases
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_pagos_updated on public.pagos;
create trigger trg_pagos_updated
before update on public.pagos
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_info_inst_updated on public.informacion_institucional;
create trigger trg_info_inst_updated
before update on public.informacion_institucional
for each row execute procedure public.set_updated_at();

insert into public.informacion_institucional (clave, contenido)
values
  ('mision', 'Formar patinadores integrales en un ambiente seguro, inclusivo y de excelencia.'),
  ('vision', 'Ser una escuela referente en formacion deportiva y valores humanos.'),
  ('valores', 'Disciplina, respeto, trabajo en equipo, perseverancia y alegria.')
on conflict (clave) do nothing;

-- Seed de administradores base (perfil en public.usuarios).
-- Nota: auth_user_id se enlaza automaticamente al iniciar sesion por primera vez
-- con el mismo correo desde Supabase Auth.
insert into public.usuarios (nombre, correo, rol, telefono, metodo_pago)
values
  ('Lorena', 'lorena.admin@escuelapatinaje.com', 'admin', '', 'efectivo'),
  ('David', 'david.admin@escuelapatinaje.com', 'admin', '', 'efectivo'),
  ('Estefania', 'estefania.admin@escuelapatinaje.com', 'admin', '', 'efectivo')
on conflict (correo) do update
set
  nombre = excluded.nombre,
  rol = 'admin';

-- RLS
alter table public.usuarios enable row level security;
alter table public.instructores enable row level security;
alter table public.clases enable row level security;
alter table public.clase_alumnos enable row level security;
alter table public.pagos enable row level security;
alter table public.asistencia enable row level security;
alter table public.testimonios enable row level security;
alter table public.noticias enable row level security;
alter table public.galeria enable row level security;
alter table public.informacion_institucional enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'usuarios','instructores','clases','clase_alumnos','pagos',
      'asistencia','testimonios','noticias','galeria','informacion_institucional'
    ])
  loop
    execute format('drop policy if exists "allow_select_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "allow_insert_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "allow_update_%1$s" on public.%1$s;', t);
    execute format('drop policy if exists "allow_delete_%1$s" on public.%1$s;', t);

    execute format('create policy "allow_select_%1$s" on public.%1$s for select to anon, authenticated using (true);', t);
    execute format('create policy "allow_insert_%1$s" on public.%1$s for insert to anon, authenticated with check (true);', t);
    execute format('create policy "allow_update_%1$s" on public.%1$s for update to anon, authenticated using (true) with check (true);', t);
    execute format('create policy "allow_delete_%1$s" on public.%1$s for delete to anon, authenticated using (true);', t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'usuarios','instructores','clases','clase_alumnos','pagos',
      'asistencia','testimonios','noticias','galeria','informacion_institucional'
    ])
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
