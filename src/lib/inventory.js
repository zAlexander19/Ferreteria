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

export function applyProductEdit(products, updatedProduct) {
  return products.map(p =>
    p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p
  );
}

export function normalizeProductFields(formData) {
  return {
    ...formData,
    stock: Number(formData.stock) || 0,
    minStock: Number(formData.minStock) || 5,
    price: Number(formData.price) || 0,
    cost: Number(formData.cost) || 0,
  };
}

// Con el stock en negativo, ese negativo ES el faltante: si un producto quedó
// en -70 es porque hay pedidos agendados que piden 70 unidades más de las que
// hay. Se calcula en vivo, así que al registrar producción el faltante baja
// solo y desaparece sin que nadie tenga que reconciliar nada.
export function faltantesPorProducto(products) {
  return products
    .filter(p => Number(p.stock) < 0)
    .map(p => ({
      id: p.id,
      name: p.name,
      unitsShort: -Number(p.stock),
    }));
}

// El `stock` que guardamos ya viene con las reservas descontadas: es el
// DISPONIBLE. De ahí salen las otras dos vistas sin guardar nada nuevo.
//   en máquina = lo que hay físicamente = disponible + reservado
//   disponible = lo que puede vender hoy (negativo = lo que debe producir)
export function vistaStock(product, unidadesReservadas = 0) {
  const disponible = Number(product?.stock) || 0;
  const reservado = Number(unidadesReservadas) || 0;
  return { enMaquina: disponible + reservado, reservado, disponible };
}

// Conversión inversa, para cuando ella cuenta físicamente y escribe cuántas
// masas hay en máquina: lo que se guarda es el disponible.
export function disponibleDesdeMaquina(enMaquina, unidadesReservadas = 0) {
  return (Number(enMaquina) || 0) - (Number(unidadesReservadas) || 0);
}
