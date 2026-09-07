# Configuracion de base de datos (Supabase)

## 1) Crear proyecto en Supabase
- Entra a https://supabase.com
- Crea un proyecto nuevo.

## 2) Crear tabla para estado global
Ejecuta este SQL en el SQL Editor:

```sql
create table if not exists app_state (
  id int primary key,
  payload jsonb not null default '{}'::jsonb
);
```

## 3) Insertar fila inicial (solo una vez)

```sql
insert into app_state (id, payload)
values (1, '{}')
on conflict (id) do nothing;
```

## 4) Configurar variables de entorno
Copia `.env.example` a `.env` y completa:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 5) Ejecutar local

```bash
npm run dev
```

## 6) Configurar en Vercel
En Vercel > Project > Settings > Environment Variables agrega:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Luego redeploy:

```bash
npx vercel --prod --yes --name ferreteria-masas
```

## Nota de seguridad
Esta app usa una tabla unica de estado global (`app_state`, `id=1`).
Si quieres multiusuario real por cuenta/sucursal, el siguiente paso es modelar tablas separadas por entidad y reglas RLS.
