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

// Del más próximo al más lejano. Las fechas son 'YYYY-MM-DD' y las horas
// 'HH:MM', así que comparar como texto ordena igual que comparar como fecha.
// Los que no tienen fecha van al final: no se sabe cuándo hay que entregarlos.
export function ordenarPorEntrega(orders) {
  return [...(orders || [])].sort((a, b) => {
    const fa = a.deliveryDate || '';
    const fb = b.deliveryDate || '';
    if (!fa && !fb) return 0;
    if (!fa) return 1;
    if (!fb) return -1;
    if (fa !== fb) return fa < fb ? -1 : 1;
    return (a.deliveryTime || '').localeCompare(b.deliveryTime || '');
  });
}

// Tres secciones, cada una ya ordenada por fecha de entrega.
export function agruparPorEstado(orders) {
  const ordenados = ordenarPorEntrega(orders);
  return {
    pendientes: ordenados.filter(o => o.status === 'Pendiente'),
    completados: ordenados.filter(o => o.status === 'Completado'),
    cancelados: ordenados.filter(o => o.status === 'Cancelado'),
  };
}

export function filtrarPedidos(orders, { desde, hasta, estadoPago } = {}) {
  return (orders || []).filter(order => {
    const fecha = order.deliveryDate || '';

    if (desde && (!fecha || fecha < desde)) return false;
    if (hasta && (!fecha || fecha > hasta)) return false;

    if (estadoPago && estadoPago !== 'Todos') {
      // Los pedidos creados antes de que existiera el campo cuentan como sin pagar.
      const pago = order.paymentStatus || 'Sin pagar';
      if (pago !== estadoPago) return false;
    }

    return true;
  });
}
