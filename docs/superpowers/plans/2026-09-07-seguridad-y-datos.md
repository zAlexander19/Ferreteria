# Plan de implementación: seguridad, integridad de datos y despliegue

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la app «Masas La Dueña» usable en producción: sin credenciales en el cliente, con la base de datos protegida por RLS, sin los tres defectos que corrompen datos y sin que la sincronización borre información.

**Architecture:** El login pasa de constantes en el código a Supabase Auth; la tabla `app_state` se re-modela con clave `user_id` para que las políticas RLS se aten a `auth.uid()`. La lógica que causó los defectos (SKU, edición, normalización numérica, decisión nube-vs-local) se extrae a módulos puros en `src/lib/` con pruebas en Vitest. Se conserva el estado como un único blob JSON y `localStorage` como caché local.

**Tech Stack:** React 18, Vite 5, Tailwind 3, `@supabase/supabase-js` 2.104, Vitest (a instalar), ESLint 8.

**Spec:** `docs/superpowers/specs/2026-09-07-seguridad-y-datos-design.md`

## Global Constraints

- Rama de trabajo: `arreglos/seguridad-y-datos`. No commitear a `main`.
- Repositorio: `c:\Users\123\Desktop\ferreteria}` (el nombre de la carpeta incluye una llave `}`; citarla siempre entre comillas).
- ESLint instalado es la versión 8 → la configuración va en `.eslintrc.cjs`, **no** en `eslint.config.js`.
- Tabla en Supabase: `app_state`, clave primaria `user_id uuid`.
- Forma del payload: `{ products: [], orders: [], sales: [], productions: [] }` — exactamente esas cuatro claves.
- Claves de `localStorage`: `masas_products`, `masas_orders`, `masas_sales`, `masas_productions` (no renombrar).
- Categorías de producto: `["Freir", "Horno", "Sopaipillas"]` → prefijos de SKU `FRE`, `HOR`, `SOP`.
- La contraseña nueva del usuario **debe ser distinta** de `masasladueña2026`, que quedó en el historial de git.
- No se migran datos: no hay datos que conservar.
- Comandos de terminal: PowerShell en Windows. `&&` no encadena; usar `;` o comandos separados.

---

### Task 1: Higiene del repositorio y ESLint

Hoy 17.931 de 17.953 archivos versionados son `node_modules`, y `dist/` también está commiteado. Correr el servidor de desarrollo modifica archivos versionados. Sin esto, todos los commits siguientes son ilegibles.

**Files:**
- Modify: `.gitignore`
- Create: `.eslintrc.cjs`

**Interfaces:**
- Consumes: nada.
- Produces: repositorio donde `git status` solo muestra cambios reales; `npm run lint` ejecutable.

- [ ] **Step 1: Reemplazar `.gitignore` por completo**

```
node_modules/
dist/
.vercel
.env
.env.*
!.env.example
```

- [ ] **Step 2: Sacar `node_modules` y `dist` del índice de git**

Conserva los archivos en disco; solo deja de versionarlos.

```bash
cd "c:/Users/123/Desktop/ferreteria}"
git rm -r --cached node_modules dist -q
```

- [ ] **Step 3: Verificar que quedaron solo los archivos reales**

Run: `git ls-files | wc -l`
Expected: un número menor a 30 (antes: 17953).

Run: `git status --short | grep -c node_modules`
Expected: `0`

- [ ] **Step 4: Crear `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  ignorePatterns: ['dist', 'node_modules', '.eslintrc.cjs'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
```

- [ ] **Step 5: Correr el lint**

Run: `npm run lint`
Expected: termina sin el error «ESLint couldn't find a configuration file». Puede reportar warnings o errores de código; anotarlos, no arreglarlos todavía (Task 9 limpia el código muerto).

- [ ] **Step 6: Commit**

```bash
git add .gitignore .eslintrc.cjs
git commit -m "chore: sacar node_modules y dist del control de versiones, configurar ESLint"
```

---

### Task 2: SKU único (defecto reproducido)

La causa es contar productos de la categoría: al borrar uno, el contador retrocede y el siguiente alta reutiliza un ID existente. Verificado en la app: `HOR-001`, `HOR-003`, `HOR-003`, y después un clic en eliminar borró dos productos.

**Files:**
- Modify: `package.json` (dependencia y script de pruebas)
- Modify: `vite.config.js` (configuración de Vitest)
- Create: `src/lib/inventory.js`
- Test: `src/lib/inventory.test.js`
- Modify: `src/components/InventoryTable.jsx:89-94`

**Interfaces:**
- Consumes: nada.
- Produces: `generateSku(products: Array<{id: string, category: string}>, category: string) => string`, exportada desde `src/lib/inventory.js`.

- [ ] **Step 1: Instalar Vitest**

```bash
cd "c:/Users/123/Desktop/ferreteria}"
npm install -D vitest
```

- [ ] **Step 2: Agregar el script de pruebas a `package.json`**

En el bloque `"scripts"`, agregar estas dos líneas junto a las existentes:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: Configurar Vitest en `vite.config.js`**

Reemplazar el archivo completo:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
```

- [ ] **Step 4: Escribir la prueba que falla**

Crear `src/lib/inventory.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { generateSku } from './inventory';

describe('generateSku', () => {
  it('arranca en 001 cuando no hay productos de esa categoria', () => {
    expect(generateSku([], 'Freir')).toBe('FRE-001');
  });

  it('no reutiliza un SKU despues de borrar uno intermedio', () => {
    const products = [
      { id: 'HOR-001', category: 'Horno' },
      { id: 'HOR-003', category: 'Horno' },
    ];
    expect(generateSku(products, 'Horno')).toBe('HOR-004');
  });

  it('no mezcla categorias distintas', () => {
    const products = [
      { id: 'FRE-001', category: 'Freir' },
      { id: 'FRE-002', category: 'Freir' },
      { id: 'SOP-001', category: 'Sopaipillas' },
    ];
    expect(generateSku(products, 'Sopaipillas')).toBe('SOP-002');
  });

  it('ignora ids con formato inesperado', () => {
    const products = [
      { id: 'FRE-001', category: 'Freir' },
      { id: 'FRE-abc', category: 'Freir' },
      { id: null, category: 'Freir' },
    ];
    expect(generateSku(products, 'Freir')).toBe('FRE-002');
  });
});
```

- [ ] **Step 5: Correr la prueba y verificar que falla**

Run: `npm test`
Expected: FAIL — no se puede resolver el import `./inventory`.

- [ ] **Step 6: Escribir la implementación mínima**

Crear `src/lib/inventory.js`:

```js
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

- [ ] **Step 7: Correr la prueba y verificar que pasa**

Run: `npm test`
Expected: PASS — 4 pruebas.

- [ ] **Step 8: Usar la función en el componente**

En `src/components/InventoryTable.jsx`, agregar el import debajo de la línea 3:

```js
import { generateSku } from '../lib/inventory';
```

Y en `handleSubmit`, reemplazar estas cuatro líneas (89-94):

```js
      const prefix = formData.category.substring(0, 3).toUpperCase();
      const count = products.filter(p => p.category === formData.category).length + 1;
      // Opcional: Rellenar con ceros para mantener formato (ej. HER-005)
      const paddedCount = count.toString().padStart(3, '0');
      const generatedId = `${prefix}-${paddedCount}`;
```

por:

```js
      const generatedId = generateSku(products, formData.category);
```

- [ ] **Step 9: Verificar en el navegador**

Levantar `npm run dev`, entrar a Inventario y reproducir el caso exacto que fallaba: crear tres productos de categoría Horno (8cm, 9cm, 11cm → `HOR-001`, `HOR-002`, `HOR-003`), borrar el del medio, y crear uno nuevo.
Expected: el nuevo recibe `HOR-004`, no `HOR-003`. La tabla muestra tres productos con IDs distintos.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.js src/lib/inventory.js src/lib/inventory.test.js src/components/InventoryTable.jsx
git commit -m "fix: generar SKU por mayor sufijo para que no se dupliquen tras un borrado"
```

---

### Task 3: Editar un producto sin perder su historial de ventas

La causa es reemplazar el objeto entero por uno construido desde el formulario, que no contiene `salesCount` ni `lastSaleDate`. Verificado: un producto con `salesCount: 1` quedó en `undefined` al cambiarle el precio.

**Files:**
- Modify: `src/lib/inventory.js`
- Test: `src/lib/inventory.test.js`
- Modify: `src/App.jsx:163-165`

**Interfaces:**
- Consumes: `src/lib/inventory.js` de la Task 2.
- Produces: `applyProductEdit(products: Array<object>, updatedProduct: object) => Array<object>`.

- [ ] **Step 1: Escribir la prueba que falla**

Primero, ampliar el import que ya está en la primera línea del archivo:

```js
import { generateSku, applyProductEdit } from './inventory';
```

Después agregar este bloque al final de `src/lib/inventory.test.js`:

```js
describe('applyProductEdit', () => {
  it('conserva los campos que el formulario no envia', () => {
    const products = [
      { id: 'FRE-001', name: 'Masas 12cm', price: 3500, salesCount: 120, lastSaleDate: '2026-09-07' },
    ];
    const editado = { id: 'FRE-001', name: 'Masas 12cm', price: 3900 };

    const [resultado] = applyProductEdit(products, editado);

    expect(resultado.price).toBe(3900);
    expect(resultado.salesCount).toBe(120);
    expect(resultado.lastSaleDate).toBe('2026-09-07');
  });

  it('no toca los demas productos', () => {
    const products = [
      { id: 'FRE-001', price: 100 },
      { id: 'SOP-001', price: 200 },
    ];

    const resultado = applyProductEdit(products, { id: 'FRE-001', price: 150 });

    expect(resultado[1]).toEqual({ id: 'SOP-001', price: 200 });
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npm test`
Expected: FAIL — `applyProductEdit is not a function`.

- [ ] **Step 3: Escribir la implementación**

Agregar a `src/lib/inventory.js`:

```js
export function applyProductEdit(products, updatedProduct) {
  return products.map(p =>
    p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p
  );
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `npm test`
Expected: PASS — 6 pruebas.

- [ ] **Step 5: Usar la función en `App.jsx`**

Agregar el import debajo de la línea 8:

```js
import { applyProductEdit } from './lib/inventory';
```

Reemplazar `handleEditProduct` (líneas 163-165):

```js
  const handleEditProduct = (updatedProduct) => {
    setProducts(applyProductEdit(products, updatedProduct));
  };
```

- [ ] **Step 6: Verificar en el navegador**

Crear un producto, hacerle una venta en Punto de Venta, volver a Inventario y editarle el precio.
Expected: en la consola, `JSON.parse(localStorage.getItem('masas_products'))[0].salesCount` sigue valiendo lo mismo que antes de editar, no `undefined`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/inventory.js src/lib/inventory.test.js src/App.jsx
git commit -m "fix: fusionar al editar un producto para no perder salesCount ni lastSaleDate"
```

---

### Task 4: Normalización numérica compartida

La rama de alta no convierte `cost`, a diferencia de la de edición. Verificado: un producto recién creado guarda `cost: "1800"` como texto.

**Files:**
- Modify: `src/lib/inventory.js`
- Test: `src/lib/inventory.test.js`
- Modify: `src/components/InventoryTable.jsx:76-104`

**Interfaces:**
- Consumes: `src/lib/inventory.js` de las Tasks 2 y 3.
- Produces: `normalizeProductFields(formData: object) => object` — devuelve una copia con `stock`, `minStock`, `price` y `cost` numéricos. `minStock` cae en `5` si viene vacío; los otros tres caen en `0`.

- [ ] **Step 1: Escribir la prueba que falla**

Agregar el import y el bloque a `src/lib/inventory.test.js`:

```js
import { generateSku, applyProductEdit, normalizeProductFields } from './inventory';

describe('normalizeProductFields', () => {
  it('convierte a numero los cuatro campos numericos', () => {
    const resultado = normalizeProductFields({
      centimetros: '12',
      stock: '500',
      minStock: '50',
      price: '3500',
      cost: '1800',
    });

    expect(resultado.stock).toBe(500);
    expect(resultado.minStock).toBe(50);
    expect(resultado.price).toBe(3500);
    expect(resultado.cost).toBe(1800);
  });

  it('usa 5 como minimo por defecto y 0 para el resto', () => {
    const resultado = normalizeProductFields({ stock: '', minStock: '', price: '', cost: '' });

    expect(resultado.minStock).toBe(5);
    expect(resultado.stock).toBe(0);
    expect(resultado.price).toBe(0);
    expect(resultado.cost).toBe(0);
  });

  it('conserva los campos no numericos', () => {
    const resultado = normalizeProductFields({
      category: 'Freir',
      isCocktail: true,
      unitsPerPackage: '10',
      stock: '1', minStock: '1', price: '1', cost: '1',
    });

    expect(resultado.category).toBe('Freir');
    expect(resultado.isCocktail).toBe(true);
    expect(resultado.unitsPerPackage).toBe('10');
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npm test`
Expected: FAIL — `normalizeProductFields is not a function`.

- [ ] **Step 3: Escribir la implementación**

Agregar a `src/lib/inventory.js`:

```js
export function normalizeProductFields(formData) {
  return {
    ...formData,
    stock: Number(formData.stock) || 0,
    minStock: Number(formData.minStock) || 5,
    price: Number(formData.price) || 0,
    cost: Number(formData.cost) || 0,
  };
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `npm test`
Expected: PASS — 9 pruebas.

- [ ] **Step 5: Usar la función en ambas ramas de `handleSubmit`**

En `src/components/InventoryTable.jsx`, ampliar el import de la Task 2:

```js
import { generateSku, normalizeProductFields } from '../lib/inventory';
```

Reemplazar el bloque `if (editingId) { ... } else { ... }` completo (líneas 76-104) por:

```js
    const base = normalizeProductFields({ ...formData, name: generatedName });

    if (editingId) {
      onEditProduct(base);
    } else {
      onAddProduct({ ...base, id: generateSku(products, formData.category) });
    }
```

- [ ] **Step 6: Correr las pruebas y el lint**

Run: `npm test`
Expected: PASS — 9 pruebas.

Run: `npm run lint`
Expected: sin errores nuevos respecto de lo anotado en la Task 1.

- [ ] **Step 7: Verificar en el navegador**

Crear un producto nuevo con costo 1800.
Expected: en la consola, `typeof JSON.parse(localStorage.getItem('masas_products')).at(-1).cost` devuelve `"number"`, no `"string"`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/inventory.js src/lib/inventory.test.js src/components/InventoryTable.jsx
git commit -m "fix: normalizar los campos numericos igual al crear que al editar"
```

---

### Task 5: Módulo de decisión nube-vs-local

`if (data?.payload)` considera válido un objeto vacío. Como `SUPABASE_SETUP.md` indica insertar la fila con `'{}'`, seguir el instructivo vacía las cuatro listas y sube el vacío. Esta tarea crea y prueba el módulo; la Task 8 lo conecta.

**Files:**
- Create: `src/lib/syncPayload.js`
- Test: `src/lib/syncPayload.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `tieneDatos(payload: object|null|undefined) => boolean` y `decidirOrigen(payloadNube, estadoLocal) => 'nube' | 'local'`, ambas desde `src/lib/syncPayload.js`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/lib/syncPayload.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { tieneDatos, decidirOrigen } from './syncPayload';

const vacio = { products: [], orders: [], sales: [], productions: [] };

describe('tieneDatos', () => {
  it('es falso para null, undefined y objeto vacio', () => {
    expect(tieneDatos(null)).toBe(false);
    expect(tieneDatos(undefined)).toBe(false);
    expect(tieneDatos({})).toBe(false);
    expect(tieneDatos(vacio)).toBe(false);
  });

  it('es verdadero si cualquiera de las cuatro listas tiene elementos', () => {
    expect(tieneDatos({ ...vacio, products: [{ id: 'FRE-001' }] })).toBe(true);
    expect(tieneDatos({ ...vacio, sales: [{ id: 'VEN-1' }] })).toBe(true);
    expect(tieneDatos({ ...vacio, productions: [{ id: 'PROD-1' }] })).toBe(true);
  });
});

describe('decidirOrigen', () => {
  it('adopta la nube cuando la nube tiene datos', () => {
    const nube = { ...vacio, products: [{ id: 'FRE-001' }] };
    expect(decidirOrigen(nube, vacio)).toBe('nube');
  });

  it('conserva lo local cuando la nube esta vacia y hay datos locales', () => {
    const local = { ...vacio, products: [{ id: 'FRE-001' }] };
    expect(decidirOrigen({}, local)).toBe('local');
  });

  it('la fila creada con {} del instructivo no borra los datos locales', () => {
    const local = { ...vacio, orders: [{ id: 'PED-1' }] };
    expect(decidirOrigen({}, local)).toBe('local');
  });

  it('no rompe cuando ambos estan vacios', () => {
    expect(decidirOrigen(undefined, vacio)).toBe('nube');
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npm test`
Expected: FAIL — no se puede resolver el import `./syncPayload`.

- [ ] **Step 3: Escribir la implementación**

Crear `src/lib/syncPayload.js`:

```js
const LISTAS = ['products', 'orders', 'sales', 'productions'];

export function tieneDatos(payload) {
  return LISTAS.some(k => Array.isArray(payload?.[k]) && payload[k].length > 0);
}

// 'nube'  -> hay que adoptar lo remoto
// 'local' -> hay que conservar lo local y subirlo
export function decidirOrigen(payloadNube, estadoLocal) {
  if (tieneDatos(payloadNube)) return 'nube';
  if (tieneDatos(estadoLocal)) return 'local';
  return 'nube';
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `npm test`
Expected: PASS — 15 pruebas en total.

- [ ] **Step 5: Commit**

```bash
git add src/lib/syncPayload.js src/lib/syncPayload.test.js
git commit -m "feat: modulo que decide entre datos de la nube y locales sin destruir informacion"
```

---

### Task 6: Esquema de base de datos, RLS y usuario

Trabajo manual en el panel de Supabase más la reescritura del instructivo. Requiere un proyecto de Supabase ya creado.

**Files:**
- Modify: `SUPABASE_SETUP.md` (reescritura completa)

**Interfaces:**
- Consumes: nada.
- Produces: tabla `app_state(user_id uuid primary key, payload jsonb, updated_at timestamptz)` con RLS activa y tres políticas; un usuario en `auth.users`.

- [ ] **Step 1: Ejecutar el esquema en el SQL Editor de Supabase**

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

- [ ] **Step 2: Verificar que RLS quedó activa**

Ejecutar en el SQL Editor:

```sql
select relname, relrowsecurity from pg_class where relname = 'app_state';
```

Expected: `relrowsecurity` = `true`.

- [ ] **Step 3: Crear el usuario**

En el panel: Authentication → Users → Add user → Create new user.
Correo: el que use la dueña. Contraseña: **distinta** de `masasladueña2026`.
Marcar «Auto Confirm User» para evitar el circuito de confirmación por correo.

Expected: el usuario aparece en la lista con estado confirmado.

- [ ] **Step 4: Comprobar que sin sesión la tabla está cerrada**

Con la `anon key` del proyecto, desde una terminal:

```bash
curl -s "https://TU-PROYECTO.supabase.co/rest/v1/app_state?select=*" \
  -H "apikey: TU_ANON_KEY"
```

Expected: `[]` — devuelve vacío, no las filas. Sin sesión, RLS no deja ver nada. (Si devolviera datos, RLS no quedó activa: volver al Step 1.)

- [ ] **Step 5: Reescribir `SUPABASE_SETUP.md`**

Reemplazar el archivo completo:

````markdown
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
````

- [ ] **Step 6: Commit**

```bash
git add SUPABASE_SETUP.md
git commit -m "docs: esquema con RLS y quitar el insert vacio que borraba los datos"
```

---

### Task 7: Migrar el login a Supabase Auth

Saca `AUTH_EMAIL` y `AUTH_PASSWORD` del código y reemplaza la bandera de `sessionStorage` —que se falsifica desde la consola— por una sesión real.

**Files:**
- Modify: `src/App.jsx` (constantes 10-14, estado 36-42, `handleLoginSubmit` 344-358, `handleLogout` 360-368, guarda de render 392, encabezado 587)

**Interfaces:**
- Consumes: `supabase` e `isSupabaseConfigured` de `src/lib/supabaseClient.js` (ya existen, sin cambios).
- Produces: variable de estado `session` (objeto `Session` de Supabase o `null`), consumida por la Task 8.

- [ ] **Step 1: Reemplazar el bloque de constantes (líneas 10-14)**

Quitar `AUTH_EMAIL`, `AUTH_PASSWORD`, `AUTH_SESSION_KEY` y `CLOUD_ROW_ID`. Queda:

```js
const CLOUD_TABLE_NAME = 'app_state';
```

- [ ] **Step 2: Reemplazar el estado de autenticación (líneas 38-42)**

```js
  const [session, setSession] = useState(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDataHydrated, setIsDataHydrated] = useState(false);
  const [cloudSyncState, setCloudSyncState] = useState('connecting');
```

- [ ] **Step 3: Agregar el efecto que sigue la sesión**

Insertar justo después de los `useState` de datos (después de la línea 68, antes del efecto de hidratación):

```js
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsAuthChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setIsAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);
```

- [ ] **Step 4: Reemplazar `handleLoginSubmit` (líneas 344-358)**

```js
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email.trim(),
      password: loginForm.password
    });

    setIsLoggingIn(false);

    if (error) {
      setLoginError('Credenciales incorrectas. Intenta nuevamente.');
      return;
    }

    setLoginForm({ email: '', password: '' });
  };
```

El mensaje es genérico a propósito: no debe revelar si falló el correo o la contraseña.

- [ ] **Step 5: Reemplazar `handleLogout` (líneas 360-368)**

```js
  const handleLogout = async () => {
    if (!window.confirm('¿Cerrar sesión?')) return;
    await supabase.auth.signOut();
    setIsMobileNavOpen(false);
    setLoginForm({ email: '', password: '' });
    setLoginError('');
  };
```

- [ ] **Step 6: Reemplazar la guarda de render `if (!isAuthenticated)` (línea 392)**

Agregar estas dos pantallas **antes** del bloque de login existente, y cambiar la condición del login:

```js
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Falta configuración</h1>
          <p className="text-sm text-gray-600">
            No están definidas las variables <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>. Ver <code>SUPABASE_SETUP.md</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthChecked) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!session) {
```

El cuerpo del login (el `return (` con el formulario) queda igual. Solo cambia la condición que lo envuelve.

- [ ] **Step 7: Deshabilitar el botón mientras entra**

En el formulario de login, reemplazar el botón de submit:

```js
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300"
            >
              {isLoggingIn ? 'Entrando...' : 'Iniciar sesion'}
            </button>
```

- [ ] **Step 8: Mostrar el correo real en el encabezado (línea 587)**

Reemplazar `{AUTH_EMAIL}` por:

```js
{session.user.email}
```

- [ ] **Step 9: Verificar que no quedan rastros de las credenciales**

Run: `grep -rn "AUTH_EMAIL\|AUTH_PASSWORD\|AUTH_SESSION_KEY\|masasladue" src/`
Expected: sin resultados.

- [ ] **Step 10: Verificar en el navegador**

Con `.env` completo y `npm run dev`:
1. Abrir la app → muestra el login.
2. Contraseña incorrecta → «Credenciales incorrectas».
3. Contraseña correcta → entra, y el encabezado muestra el correo del usuario.
4. En la consola: `sessionStorage.setItem('masas_auth_session','1')` y recargar → **sigue pidiendo login**.
5. «Cerrar sesión» → vuelve al login.

Expected: los cinco puntos. El 4 es el que prueba que el agujero se cerró.

- [ ] **Step 11: Commit**

```bash
git add src/App.jsx
git commit -m "feat: reemplazar el login del cliente por Supabase Auth"
```

---

### Task 8: Sincronización atada a la sesión y al usuario

Conecta `decidirOrigen` de la Task 5 y cambia las consultas de `id = 1` a `user_id`. Sin sesión, RLS rechaza las consultas, así que la hidratación tiene que esperarla.

**Files:**
- Modify: `src/App.jsx` (efecto de hidratación 70-129, efecto de sincronización 131-158, etiquetas de estado 374-390)

**Interfaces:**
- Consumes: `session` de la Task 7; `decidirOrigen` de `src/lib/syncPayload.js` (Task 5).
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Agregar el import**

Debajo de la línea 8:

```js
import { decidirOrigen } from './lib/syncPayload';
```

- [ ] **Step 2: Reemplazar el efecto de hidratación completo (líneas 70-129)**

```js
  useEffect(() => {
    if (!session || !supabase) return;

    let mounted = true;
    const userId = session.user.id;

    setIsDataHydrated(false);
    setCloudSyncState('connecting');

    const hydrateFromCloud = async () => {
      const { data, error } = await supabase
        .from(CLOUD_TABLE_NAME)
        .select('payload')
        .eq('user_id', userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        // Deliberado: NO se marca la hidratacion como terminada. Si no pudimos
        // leer la nube, no sabemos que hay en ella, y dejar que el efecto de
        // subida se dispare la sobrescribiria con lo local. La app sigue usable
        // contra localStorage; el sync se reintenta al recargar.
        console.error('Error al cargar datos desde Supabase:', error.message);
        setCloudSyncState('error');
        return;
      }

      const estadoLocal = { products, orders, sales, productions };

      if (decidirOrigen(data?.payload, estadoLocal) === 'nube') {
        const payload = data?.payload ?? {};
        setProducts(Array.isArray(payload.products) ? payload.products : []);
        setOrders(Array.isArray(payload.orders) ? payload.orders : []);
        setSales(Array.isArray(payload.sales) ? payload.sales : []);
        setProductions(Array.isArray(payload.productions) ? payload.productions : []);
      }

      setCloudSyncState('synced');
      setIsDataHydrated(true);
    };

    hydrateFromCloud();

    return () => {
      mounted = false;
    };
  }, [session]);
```

Cuando `decidirOrigen` devuelve `'local'` no se toca el estado: el efecto de subida se encarga de mandarlo a la nube. Ese es el arreglo del borrado.

- [ ] **Step 3: Reemplazar el efecto de sincronización completo (líneas 131-158)**

```js
  useEffect(() => {
    if (!isDataHydrated || !session || !supabase) return;

    const timeoutId = setTimeout(async () => {
      setCloudSyncState('syncing');

      const { error } = await supabase
        .from(CLOUD_TABLE_NAME)
        .upsert(
          {
            user_id: session.user.id,
            payload: { products, orders, sales, productions },
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error al sincronizar con Supabase:', error.message);
        setCloudSyncState('error');
        return;
      }

      setCloudSyncState('synced');
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [products, orders, sales, productions, isDataHydrated, session]);
```

- [ ] **Step 4: Quitar la etiqueta «Modo local» que ya no puede ocurrir**

En `cloudSyncLabel` (líneas 374-382), reemplazar el último `: 'Modo local'` por:

```js
          : 'Sin conexión'
```

- [ ] **Step 5: Correr las pruebas y el lint**

Run: `npm test`
Expected: PASS — 15 pruebas.

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 6: Verificar el circuito completo en el navegador**

1. Entrar con el usuario. El indicador pasa a «Nube sincronizada».
2. Crear un producto. En Supabase, Table Editor → `app_state`: hay una fila con el `user_id` correcto y el producto dentro de `payload`.
3. Vaciar `localStorage` con `localStorage.clear()` y recargar. Volver a entrar.
   Expected: el producto reaparece desde la nube.
4. **Prueba del borrado que causaba pérdida de datos:** en Supabase, ejecutar
   `update app_state set payload = '{}'::jsonb;`. Crear un producto en la app
   (queda en `localStorage`), recargar y entrar.
   Expected: el producto **sobrevive** y se vuelve a subir; no se borra.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "fix: sincronizar por user_id y no destruir datos locales ante una fila vacia"
```

---

### Task 9: Eliminar código muerto

`Dashboard.jsx` no lo importa nadie desde que `App.jsx` maneja las pestañas, y si se renderizara fallaría porque llama a `InventoryTable` sin props. `lowStock` y `expiringSoon` se calculan pero no se muestran desde que el formulario dejó de tener fecha de vencimiento (verificado: las palabras «Bajo Stock» y «Vencer» no aparecen en el DOM).

**Files:**
- Delete: `src/views/Dashboard.jsx`
- Modify: `src/views/Statistics.jsx:28-38`

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Confirmar que nadie importa `Dashboard`**

Run: `grep -rn "views/Dashboard\|{ Dashboard }" src/`
Expected: sin resultados. Si aparece alguno, no borrar el archivo y detenerse.

- [ ] **Step 2: Borrar el archivo**

```bash
git rm src/views/Dashboard.jsx
```

- [ ] **Step 3: Quitar los cálculos sin usar de `Statistics.jsx`**

Borrar de `stats` estas dos definiciones (líneas 28-38) y sus dos entradas en el `return` del `useMemo`:

```js
    const lowStock = products.filter(p => p.stock < 5);

    const expiringSoon = products.filter(p => {
      if (!p.expirationDate) return false;
      const expDate = new Date(p.expirationDate);
      const diffTime = expDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    });
```

En el `return { ... }` del `useMemo`, quitar `lowStock` y `expiringSoon` de la lista de propiedades.

- [ ] **Step 4: Verificar que no quedaron referencias**

Run: `grep -n "lowStock\|expiringSoon" src/views/Statistics.jsx`
Expected: sin resultados.

- [ ] **Step 5: Correr pruebas, lint y build**

Run: `npm test`
Expected: PASS — 15 pruebas.

Run: `npm run lint`
Expected: sin errores.

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Verificar Estadísticas en el navegador**

Abrir la pestaña Estadísticas con al menos un producto y una venta cargados.
Expected: se ven las cuatro secciones (Ventas Realizadas, Estado de Inventario, Ventas por Categoría, Análisis Financiero) y no hay errores en consola.

- [ ] **Step 7: Commit**

```bash
git add src/views/Statistics.jsx
git commit -m "chore: eliminar la vista Dashboard y los calculos de estadisticas sin usar"
```

---

### Task 10: Verificación de seguridad y despliegue

**Files:**
- Ninguno. Verificación y despliegue.

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: despliegue en producción verificado.

- [ ] **Step 1: Verificar que la contraseña no está en el bundle**

```bash
cd "c:/Users/123/Desktop/ferreteria}"
npm run build
grep -rc "masasladue" dist/ || echo "SIN COINCIDENCIAS - correcto"
```

Expected: `SIN COINCIDENCIAS - correcto`.

- [ ] **Step 2: Verificar que la tabla está cerrada sin sesión**

```bash
curl -s "https://TU-PROYECTO.supabase.co/rest/v1/app_state?select=*" \
  -H "apikey: TU_ANON_KEY"
```

Expected: `[]`, aunque la fila exista con datos.

- [ ] **Step 3: Recorrido funcional completo en local**

Con `npm run dev`, en este orden:
1. Login correcto.
2. Crear tres productos de la misma categoría, borrar el del medio, crear otro → el SKU nuevo no repite.
3. Registrar una venta → el stock baja según unidades por bolsa y aparece en Estadísticas.
4. Editar ese producto → el historial de ventas sobrevive.
5. Crear un pedido → reserva stock; cancelarlo → lo devuelve.
6. Registrar producción → suma stock.
7. Cerrar sesión → vuelve al login.

Expected: los siete pasos sin errores en consola.

- [ ] **Step 4: Cargar las variables en Vercel**

Project → Settings → Environment Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, para los entornos Production y Preview.

- [ ] **Step 5: Desplegar**

```bash
npx vercel --prod --yes
```

- [ ] **Step 6: Verificar en producción**

Abrir la URL desplegada en una ventana privada.
Expected: pide login; con las credenciales correctas entra y muestra los datos guardados; `sessionStorage.setItem('masas_auth_session','1')` y recargar **no** da acceso.

- [ ] **Step 7: Integrar la rama**

```bash
git checkout main
git merge arreglos/seguridad-y-datos
```

- [ ] **Step 8: Commit final del estado del plan**

```bash
git add docs/superpowers/plans/2026-09-07-seguridad-y-datos.md
git commit -m "docs: plan de seguridad y datos completado"
```

---

## Notas para quien ejecute

- **El nombre de la carpeta tiene una llave**: `ferreteria}`. Citarla siempre entre comillas en la terminal.
- **No commitear `.env`.** El `.gitignore` de la Task 1 lo cubre, pero conviene revisar `git status` antes de cada commit.
- **La contraseña vieja quedó en el historial de git.** Por eso la nueva tiene que ser distinta. No se reescribe el historial: al migrar a Supabase Auth esa credencial queda inservible.
- **Si la app ya está desplegada**, sigue expuesta hasta que salgan las Tasks 6 a 8. Conviene bajar el despliegue mientras tanto.
- Las Tasks 2 a 5 son independientes de las 6 a 8: si algo se traba con Supabase, los arreglos de datos pueden avanzar igual.
