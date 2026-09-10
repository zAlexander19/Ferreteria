// Lógica pura de pedidos. Sin React ni acceso a la nube, para poder probarla
// directamente: acá vive el cálculo de stock al editar, que es la parte donde
// un error descuadra el inventario sin que se note.

export function unidadesDeItem(item) {
  const unidadesPorBolsa = parseInt(item?.unitsPerPackage) || 1;
  return (Number(item?.quantity) || 0) * unidadesPorBolsa;
}

export function unidadesTotales(items) {
  return (items || []).reduce((acc, item) => acc + unidadesDeItem(item), 0);
}

// Cuánto stock hay que mover al editar un pedido, producto por producto.
// Positivo = devolver al stock (el pedido ahora pide menos).
// Negativo = descontar del stock (ahora pide más).
// Los productos que no cambiaron no aparecen.
export function deltaReserva(itemsViejos, itemsNuevos) {
  const delta = {};

  (itemsViejos || []).forEach(item => {
    delta[item.id] = (delta[item.id] || 0) + unidadesDeItem(item);
  });

  (itemsNuevos || []).forEach(item => {
    delta[item.id] = (delta[item.id] || 0) - unidadesDeItem(item);
  });

  Object.keys(delta).forEach(id => {
    if (delta[id] === 0) delete delta[id];
  });

  return delta;
}

// Cuánto falta cobrar. Un pedido sin `paymentStatus` (los creados antes de que
// existiera el campo) cuenta como no pagado.
export function saldoPendiente(order) {
  if (order?.paymentStatus === 'Pagado') return 0;

  const abonado = order?.paymentStatus === 'Abonado'
    ? (Number(order.paidAmount) || 0)
    : 0;

  return Math.max(0, (Number(order?.total) || 0) - abonado);
}

// Cuántas unidades de cada producto están apartadas para pedidos que todavía
// no se entregaron. Solo cuentan los Pendientes: un Cancelado ya devolvió su
// stock y un Completado ya salió por la puerta.
// Sirve para distinguir dos cosas que hoy se ven igual: un producto en 0 y
// libre, de uno en 0 porque todo lo que había está comprometido.
export function comprometidoPorProducto(orders) {
  return (orders || [])
    .filter(order => order.status === 'Pendiente' && order.stockReserved !== false)
    .reduce((acc, order) => {
      (order.reservationBreakdown || []).forEach(reserva => {
        const unidades = Number(reserva.unitsReserved) || 0;
        if (unidades > 0) acc[reserva.productId] = (acc[reserva.productId] || 0) + unidades;
      });
      return acc;
    }, {});
}
