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
