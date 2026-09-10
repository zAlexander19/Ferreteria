// Una venta es lo que ya salió por la puerta y está cobrado:
//   - lo vendido en el mostrador (Punto de Venta), y
//   - los pedidos Completados Y Pagados.
// Un pedido entregado con abono parcial todavía no cuenta: se suma recién
// cuando se marca como Pagado.

export const PUNTO_DE_VENTA = 'Punto de venta';
export const PEDIDO = 'Pedido';

const dosDigitos = n => String(n).padStart(2, '0');

// Del ISO que guarda el mostrador se saca la fecha y la hora LOCALES. Cortar el
// texto del ISO daría la fecha UTC, y en Chile una venta de la noche aparecería
// al día siguiente.
function fechaYHoraLocal(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { fecha: '', hora: '' };
  return {
    fecha: `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`,
    hora: `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`,
  };
}

export function ventasUnificadas(sales, orders) {
  const delMostrador = (sales || []).map(s => {
    const { fecha, hora } = fechaYHoraLocal(s.date);
    return {
      id: s.id,
      origen: PUNTO_DE_VENTA,
      fecha,
      hora,
      cliente: null,
      items: s.items || [],
      total: Number(s.total) || 0,
    };
  });

  const dePedidos = (orders || [])
    .filter(o => o.status === 'Completado' && o.paymentStatus === 'Pagado')
    .map(o => ({
      id: o.id,
      origen: PEDIDO,
      fecha: o.deliveryDate || '',
      hora: o.deliveryTime || '',
      cliente: o.customerName || null,
      items: o.items || [],
      total: Number(o.total) || 0,
    }));

  // Más reciente primero. Fecha y hora son texto ordenable ('YYYY-MM-DD', 'HH:MM').
  return [...delMostrador, ...dePedidos].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return (b.hora || '').localeCompare(a.hora || '');
  });
}

export function totalPorOrigen(ventas) {
  const acumular = origen => {
    const propias = (ventas || []).filter(v => v.origen === origen);
    return {
      origen,
      total: propias.reduce((sum, v) => sum + (Number(v.total) || 0), 0),
      cantidad: propias.length,
    };
  };

  return [acumular(PUNTO_DE_VENTA), acumular(PEDIDO)];
}

export function filtrarVentas(ventas, { desde, hasta } = {}) {
  return (ventas || []).filter(v => {
    if (desde && (!v.fecha || v.fecha < desde)) return false;
    if (hasta && (!v.fecha || v.fecha > hasta)) return false;
    return true;
  });
}
