# Diseño: seguridad, integridad de datos y puesta en producción

**Proyecto:** Masas La Dueña (sistema de inventario, ventas, pedidos y producción)
**Fecha:** 2026-09-07
**Estado:** aprobado el enfoque, pendiente de revisión de la spec

---

## 1. Contexto

La aplicación es un frontend React 18 + Vite 5 + Tailwind 3, sin backend propio.
Gestiona cinco áreas: inventario, punto de venta, pedidos, producción y estadísticas.
El estado completo vive en `localStorage` y se sincroniza a Supabase.

Una revisión funcional confirmó que las cinco vistas funcionan: se crean productos,
los pedidos reservan stock, la producción lo repone, las ventas quedan registradas
y los gráficos dibujan. El problema no es la funcionalidad, sino tres frentes que
impiden usarla en producción con datos reales:

1. **Seguridad.** El login se valida contra constantes en el código
   (`AUTH_EMAIL` / `AUTH_PASSWORD` en `src/App.jsx`), que además quedaron compiladas
   en `dist/assets/index-BtN11l0R.js`, versionado en git. La sesión es una bandera
   en `sessionStorage`, así que escribir `masas_auth_session = "1"` en la consola
   da acceso completo (verificado). Y `SUPABASE_SETUP.md` nunca habilita RLS: con
   RLS desactivada, la `anon key` —que por diseño viaja en el bundle— permite leer
   y escribir toda la tabla sin pasar por la aplicación.

2. **Integridad de datos.** Tres defectos reproducidos en la app corriendo:
   editar un producto borra su historial de ventas; los SKU se duplican tras
   eliminar un producto intermedio, y borrar un duplicado elimina dos productos
   de un solo clic; `cost` se guarda como texto al crear.

3. **Sincronización.** El instructivo de configuración indica insertar la fila
   inicial con `'{}'`, y el código trata ese objeto vacío como datos válidos,
   vaciando las cuatro listas y subiendo el vacío a la nube.

## 2. Objetivos

- Que la aplicación pueda desplegarse sin exponer credenciales ni datos del negocio.
- Eliminar los defectos que corrompen o pierden información.
- Que la sincronización nunca destruya datos existentes.
- Dejar el repositorio en un estado manejable y desplegable.

## 3. No-objetivos

Decisiones tomadas a partir del uso real declarado (**una sola persona, un
dispositivo a la vez, sin datos previos que conservar**):

- **Multiusuario y roles.** No se modelan permisos por rol.
- **Edición simultánea.** No se resuelve la concurrencia entre dispositivos.
  «La última escritura gana» es aceptable con un solo dispositivo, y queda
  documentado como límite conocido.
- **Migrar a tablas relacionales.** La fila única con JSON alcanza para este uso.
- **Migración de datos.** No hay datos que preservar.
- **Rediseño visual.** La interfaz queda como está.

## 4. Decisiones de arquitectura

### D1 — Supabase Auth en lugar de credenciales en el cliente

La contraseña pasa a vivir en Supabase. El login usa `signInWithPassword` y la
sesión (con expiración y refresco) la administra `supabase-js`.

Alternativas descartadas:

- *Clave única verificada contra una tabla*: sigue siendo una clave compartida sin
  gestión de sesión, y de todos modos hay que escribir las políticas RLS.
- *Protección por contraseña de Vercel*: es función de plan pago y no protege los
  datos, porque la `anon key` permite consultar Supabase directamente sin pasar por
  la aplicación. Sirve como candado adicional, nunca como reemplazo de RLS.

### D2 — El login es obligatorio siempre

Se elimina el «Modo local» que daba acceso sin autenticar. Si faltan las variables
de entorno, la aplicación muestra una pantalla de configuración faltante en lugar
de abrirse. Así un despliegue mal configurado falla cerrado, no abierto.

### D3 — Se conserva el blob JSON, atado al usuario

La tabla pasa de `app_state(id int = 1)` a `app_state(user_id uuid)`, con la clave
primaria referenciando `auth.users`. Esto permite que la política RLS se exprese
como `auth.uid() = user_id`, que es la forma más simple y difícil de equivocar.

### D4 — La lógica de datos se extrae a módulos puros

Las tres funciones donde aparecieron los defectos (generación de SKU, normalización
del formulario, decisión nube-vs-local) salen de los componentes a módulos sin
dependencias de React, para poder probarlas de forma directa.

## 5. Modelo de datos

Reemplaza por completo el esquema actual. Como no hay datos que conservar, se
elimina la tabla anterior.

```sql
drop table if exists app_state;

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

No se define política de borrado: la aplicación nunca elimina la fila.

Forma de `payload`: `{ products: [], orders: [], sales: [], productions: [] }`.

El usuario se crea a mano una sola vez desde el panel de Supabase
(Authentication → Users → Add user), con «Auto Confirm User» activado para evitar
el circuito de confirmación por correo. No hay registro público: la aplicación no
expone pantalla de alta.

## 6. Cambios por área

### 6.1 Autenticación (`src/App.jsx`, `src/lib/supabaseClient.js`)

Se eliminan las constantes `AUTH_EMAIL`, `AUTH_PASSWORD` y `AUTH_SESSION_KEY`.

- Al montar, `supabase.auth.getSession()` determina si hay sesión activa.
- `supabase.auth.onAuthStateChange` mantiene el estado sincronizado y cubre el
  vencimiento del token.
- El formulario llama a `signInWithPassword` y muestra el error que devuelve
  Supabase, sin filtrar si falló el correo o la contraseña.
- «Cerrar sesión» llama a `signOut()`.
- La hidratación de datos **espera a que haya sesión**: sin ella, RLS rechaza la
  consulta.

### 6.2 Inventario (`src/components/InventoryTable.jsx`, `src/App.jsx`)

**SKU único.** La causa es contar productos existentes: al borrar uno, el contador
retrocede. Se reemplaza por el mayor sufijo ya usado, más uno.

```js
// src/lib/inventory.js
export function generateSku(products, category) {
  const prefix = category.substring(0, 3).toUpperCase();
  const mayor = products
    .map(p => p.id)
    .filter(id => typeof id === 'string' && id.startsWith(`${prefix}-`))
    .map(id => Number.parseInt(id.slice(prefix.length + 1), 10))
    .filter(Number.isInteger)
    .reduce((a, b) => Math.max(a, b), 0);

  return `${prefix}-${String(mayor + 1).padStart(3, '0')}`;
}
```

**Editar sin perder historial.** La causa es reemplazar el objeto entero por uno
construido desde el formulario, que no contiene `salesCount` ni `lastSaleDate`.
Se cambia a fusión, lo que además protege cualquier campo que se agregue después:

```js
const handleEditProduct = (updatedProduct) => {
  setProducts(products.map(p =>
    p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p
  ));
};
```

**`cost` numérico.** La rama de alta no convierte el valor, a diferencia de la de
edición. Ambas pasan a usar una única función de normalización que convierte
`stock`, `minStock`, `price` y `cost`.

### 6.3 Sincronización (`src/App.jsx`)

La regla actual, `if (data?.payload)`, considera válido un objeto vacío. Se
reemplaza por una decisión explícita en un módulo puro:

```js
// src/lib/syncPayload.js
const LISTAS = ['products', 'orders', 'sales', 'productions'];

export function tieneDatos(payload) {
  return LISTAS.some(k => Array.isArray(payload?.[k]) && payload[k].length > 0);
}

// Devuelve 'nube' si hay que adoptar lo remoto, 'local' si hay que subir lo local.
export function decidirOrigen(payloadNube, estadoLocal) {
  if (tieneDatos(payloadNube)) return 'nube';
  if (tieneDatos(estadoLocal)) return 'local';
  return 'nube';
}
```

Con esto, una fila vacía en la nube deja de destruir el estado local: si la nube
está vacía y hay datos locales, se suben los locales. Cubre tanto el caso `'{}'`
del instructivo como el de una fila recién creada.

La subida sigue siendo un `upsert` con retardo de 450 ms, condicionado a que la
hidratación haya terminado —esa parte ya es correcta— y ahora incluye `updated_at`.

### 6.4 Repositorio y herramientas

- `.gitignore` se completa con `node_modules/` y `dist/`.
- Se sacan del índice con `git rm -r --cached node_modules dist`. Hoy son 17.931 de
  17.953 archivos versionados; correr el servidor de desarrollo ensucia el
  repositorio al modificar la caché de Vite.
- Se agrega `.eslintrc.cjs` —formato correspondiente a ESLint 8, que es la versión
  instalada— con los tres plugins de React ya declarados en `package.json`, para que
  `npm run lint` deje de fallar.
- Se elimina código muerto: `src/views/Dashboard.jsx` (nadie lo importa) y los
  cálculos `lowStock` / `expiringSoon` de `Statistics.jsx`, que se computan pero no
  se muestran desde que el formulario dejó de tener fecha de vencimiento.
- Se reescribe `SUPABASE_SETUP.md` con el esquema nuevo, las políticas RLS y la
  creación del usuario, quitando el `insert ... '{}'` que provoca el borrado.

## 7. Manejo de errores

| Situación | Comportamiento |
|---|---|
| Faltan variables de entorno | Pantalla de configuración faltante. No se permite entrar. |
| Credenciales incorrectas | Mensaje genérico, sin distinguir correo de contraseña. |
| Sesión vencida | `onAuthStateChange` devuelve al login sin perder lo guardado en `localStorage`. |
| Falla la lectura inicial de la nube | Se sigue trabajando con los datos locales y el indicador queda en «Error de sincronización». No se sobrescribe la nube. |
| Falla la escritura | El indicador pasa a error; el reintento ocurre en el próximo cambio. |
| Sin conexión | Igual que el caso anterior: la app sigue usable contra `localStorage`. |

El indicador de estado del encabezado ya existe y se reutiliza.

## 8. Estrategia de pruebas

**Pruebas automatizadas (Vitest).** Solo sobre los módulos puros, que es donde
estuvieron los defectos:

- `generateSku`: no reutiliza un SKU tras borrar uno intermedio; respeta el prefijo
  por categoría; arranca en `001` cuando no hay productos de esa categoría.
- Normalización del formulario: `cost`, `price`, `stock` y `minStock` quedan
  numéricos tanto al crear como al editar.
- Fusión en edición: `salesCount` y `lastSaleDate` sobreviven.
- `decidirOrigen`: nube con datos gana; nube vacía con local con datos conserva lo
  local; ambas vacías no rompe.

**Verificación manual en el navegador**, replicando los recorridos ya usados en la
revisión: login correcto e incorrecto, alta de producto, el caso exacto que
duplicaba el SKU, pedido que reserva stock, producción que lo repone, venta
registrada, y edición de producto comprobando que el historial sobrevive.

**Verificación de seguridad**, que es la que justifica el trabajo:

- Escribir la bandera vieja en `sessionStorage` ya no da acceso.
- Buscar la contraseña en el bundle compilado no arroja resultados.
- Una consulta a `app_state` con la `anon key` y sin sesión es rechazada por RLS.

## 9. Despliegue

1. Ejecutar el SQL del esquema y las políticas en Supabase.
2. Crear el usuario en el panel, con una contraseña **distinta de la anterior**.
3. Cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel.
4. Redesplegar y recorrer el circuito completo en producción.
5. Confirmar desde otro navegador, sin sesión, que la aplicación pide login.

## 10. Riesgos y mitigaciones

**La contraseña anterior quedó en el historial de git.** Al migrar a Supabase Auth
esa credencial deja de servir para algo, siempre que la contraseña nueva sea
distinta. No se reescribe el historial: es una operación disruptiva cuyo único
beneficio aquí sería ocultar una clave ya inservible. Si el repositorio llegara a
hacerse público, conviene reconsiderarlo.

**Si la aplicación ya está desplegada, está expuesta hasta que salga la Fase 1.**
Cualquiera con la URL entra con la clave del bundle, y la tabla es consultable sin
pasar por la aplicación. Conviene bajar el despliegue mientras tanto.

**Sacar `node_modules` del control de versiones** hace que un clon nuevo requiera
`npm install`. Queda documentado en el instructivo.

**Un solo dispositivo es un supuesto, no una restricción técnica.** Si en el futuro
se usa desde dos lugares a la vez, la última escritura pisará a la otra sin aviso.
Resolverlo implicaría separar en tablas por entidad, que es el trabajo explícitamente
descartado aquí.
