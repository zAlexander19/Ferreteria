# Configuración de base de datos (Supabase)

## 1) Crear el proyecto
Entrar a https://supabase.com y crear un proyecto nuevo.

## 2) Crear la tabla y las políticas de seguridad
Ejecutar este SQL en el SQL Editor. Las políticas son obligatorias: sin ellas
la `anon key` —que viaja en el código del navegador— deja leer y escribir la
tabla entera a cualquiera.

```sql
create table app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "lee su propia fila" on app_state
  for select using (auth.uid() = user_id);

create policy "crea su propia fila" on app_state
  for insert with check (auth.uid() = user_id);

create policy "actualiza su propia fila" on app_state
  for update using (auth.uid() = user_id)
             with check (auth.uid() = user_id);
```

No hay que insertar ninguna fila a mano: la aplicación crea la suya la primera
vez que guarda.

## 3) Crear el usuario
Authentication → Users → Add user. Marcar «Auto Confirm User».
La aplicación no tiene pantalla de registro: los usuarios se crean solo acá.

## 4) Variables de entorno
Copiar `.env.example` a `.env` y completar con los valores de
Project Settings → API:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 5) Ejecutar en local

```bash
npm install
npm run dev
```

`node_modules` no está versionado, por eso el `npm install`.

## 6) Configurar en Vercel
Project → Settings → Environment Variables, las mismas dos variables.
Después redesplegar.

## Límite conocido
Todo el estado se guarda como un único documento JSON por usuario, y cada
guardado reemplaza el anterior. Con un solo dispositivo a la vez funciona
bien; si se usa desde dos lugares al mismo tiempo, el último en guardar pisa
al otro sin aviso. Resolverlo requiere separar en tablas por entidad.
