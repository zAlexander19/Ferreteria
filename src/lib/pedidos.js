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

// Deja un texto listo para comparar: sin tildes y en minusculas. Lo de las
// tildes no es un lujo — con clientes chilenos, que buscar "Nunez" no
// encuentre a "Nunez" con tilde es un bug garantizado en el mostrador, y la
// duena no va a escribir los acentos cuando esta apurada.
function paraBuscar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function filtrarPedidos(orders, { desde, hasta, estadoPago, texto } = {}) {
  const buscado = paraBuscar(texto).trim();

  return (orders || []).filter(order => {
    const fecha = order.deliveryDate || '';

    if (desde && (!fecha || fecha < desde)) return false;
    if (hasta && (!fecha || fecha > hasta)) return false;

    if (estadoPago && estadoPago !== 'Todos') {
      // Los pedidos creados antes de que existiera el campo cuentan como sin pagar.
      const pago = order.paymentStatus || 'Sin pagar';
      if (pago !== estadoPago) return false;
    }

    if (buscado) {
      const campos = [order.customerName, order.phone, order.id];
      if (!campos.some(campo => paraBuscar(campo).includes(buscado))) return false;
    }

    return true;
  });
}

// Deja consistentes el estado de pago y el monto abonado antes de guardarlos.
// Vive aca y no en el formulario porque ahora hay dos caminos que escriben lo
// mismo (el modal de edicion y el popup de cobro) y no pueden discrepar: si
// uno dejara un monto abonado en un pedido marcado Pagado, `saldoPendiente`
// informaria mal lo que falta cobrar.
export function normalizarCobro({ paymentStatus, paidAmount } = {}, total = 0) {
  // Pagado y Sin pagar no tienen monto parcial: el saldo sale del total.
  if (paymentStatus !== 'Abonado') {
    return { ok: true, paymentStatus, paidAmount: 0 };
  }

  const monto = Number(paidAmount);
  if (!Number.isFinite(monto) || monto <= 0) {
    return { ok: false, message: 'Puso cuanto abono? Tiene que ser un monto mayor a 0.' };
  }

  const totalPedido = Number(total) || 0;
  if (monto > totalPedido) {
    return { ok: false, message: 'El abono no puede ser mayor que el total del pedido.' };
  }

  // Abonar el total es pagar. Si se guardara como Abonado, el pedido quedaria
  // con saldo 0 pero con el chip ambar de "Abonado", y la duena lo leeria como
  // que todavia le deben.
  if (monto === totalPedido) {
    return { ok: true, paymentStatus: 'Pagado', paidAmount: 0 };
  }

  return { ok: true, paymentStatus: 'Abonado', paidAmount: monto };
}

// Arma el modelo de datos del comprobante que se le manda al cliente.
//
// Vive aca y no dentro del componente para poder probarlo: la parte que
// importa es aritmetica (precio por bolsa, subtotales, saldo), y una boleta
// con un numero mal es peor que no tener boleta.
//
// El total sale del pedido y NO se recalcula sumando los subtotales: es el
// precio que se acordo con el cliente. Si algun dia los dos numeros
// discrepan, manda el que se pacto, no el que da la multiplicacion.
export function datosBoleta(order) {
  const lineas = (order?.items || []).map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    centimetros: item.centimetros,
    isCocktail: item.isCocktail,
    bolsas: Number(item.quantity) || 0,
    precioUnitario: Number(item.price) || 0,
    unidades: unidadesDeItem(item),
    subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 0),
  }));

  const estado = order?.paymentStatus || 'Sin pagar';

  return {
    id: order?.id,
    cliente: {
      nombre: order?.customerName,
      telefono: order?.phone,
    },
    entrega: {
      fecha: order?.deliveryDate,
      hora: order?.deliveryTime,
    },
    lineas,
    totalUnidades: unidadesTotales(order?.items),
    total: Number(order?.total) || 0,
    pago: {
      estado,
      abonado: estado === 'Abonado' ? (Number(order?.paidAmount) || 0) : 0,
      saldo: saldoPendiente(order),
    },
  };
}

// Describe un producto en una linea: "Horno · 21 cm · Coctel".
//
// Es la version en texto de las pastillas de colores de EtiquetasProducto, y
// existe para la boleta. Ahi el detalle NO puede ir en pastillas: html2canvas
// dibuja el texto mas arriba de donde va dentro de una caja ajustada, y en el
// PNG las palabras salian corridas contra el borde de la pastilla. Sin caja
// alrededor no hay contra que se note.
//
// La medida se compara contra vacio y nulo en vez de mirar si es "falsy",
// porque 0 cm es un valor cargado y tiene que aparecer.
export function describirProducto(item) {
  const medida = item?.centimetros;
  const hayMedida = medida !== '' && medida !== undefined && medida !== null;

  return [
    item?.category,
    hayMedida ? `${medida} cm` : null,
    item?.isCocktail ? 'Cóctel' : null,
  ].filter(Boolean).join(' · ');
}
