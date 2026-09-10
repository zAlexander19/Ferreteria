// Una venta es lo que ya salió por la puerta y está cobrado:
//   - lo vendido en el mostrador (Punto de Venta), y
//   - los pedidos Completados Y Pagados.
// Un pedido entregado con abono parcial todavía no cuenta: se suma recién
// cuando se marca como Pagado.

import { unidadesDeItem } from './pedidos';

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

// --- Agregados para los gráficos de Estadísticas -----------------------------
// Todo se calcula sobre los items, que guardan una foto del producto al momento
// de venderlo (precio, costo, categoría, unidades por bolsa). Usar el producto
// actual daría números distintos si después le cambian el precio.

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const num = v => Number(v) || 0;
const plataDelItem = item => num(item?.price) * num(item?.quantity);
const costoDelItem = item => num(item?.cost) * num(item?.quantity);

// La fecha es texto 'YYYY-MM-DD' y se lee por posición. Convertirla a Date solo
// abriría la puerta al corrimiento de zona horaria que ya nos mordió antes.
const anioDe = v => Number((v?.fecha || '').slice(0, 4)) || 0;
const mesDe = v => Number((v?.fecha || '').slice(5, 7)) || 0;
const diaDe = v => Number((v?.fecha || '').slice(8, 10)) || 0;

// `mes` en 1-12. Sin mes (null) toma el año entero.
export function ventasDelPeriodo(ventas, { anio, mes } = {}) {
  return (ventas || []).filter(v => {
    if (anioDe(v) !== anio) return false;
    if (mes && mesDe(v) !== mes) return false;
    return true;
  });
}

// Un punto por cada día del mes, o uno por cada mes del año. Los períodos sin
// ventas quedan en 0 en vez de faltar, para que la línea muestre los huecos.
export function serieFinanciera(ventas, { anio, mes } = {}) {
  const cuantos = mes ? new Date(anio, mes, 0).getDate() : 12;
  const casilla = mes ? diaDe : mesDe;

  const serie = Array.from({ length: cuantos }, (_, i) => ({
    etiqueta: mes ? String(i + 1) : MESES_CORTOS[i],
    costo: 0,
    ganancia: 0,
  }));

  ventasDelPeriodo(ventas, { anio, mes }).forEach(v => {
    const i = casilla(v) - 1;
    if (i < 0 || i >= serie.length) return;

    (v.items || []).forEach(item => {
      const costo = costoDelItem(item);
      serie[i].costo += costo;
      serie[i].ganancia += plataDelItem(item) - costo;
    });
  });

  return serie.map(p => ({ ...p, costo: Math.round(p.costo), ganancia: Math.round(p.ganancia) }));
}

// Cuánta plata y cuántas unidades de masa se vendieron de cada tipo.
export function totalPorCategoria(ventas) {
  const acumulado = new Map();

  (ventas || []).forEach(v => {
    (v.items || []).forEach(item => {
      const categoria = item?.category || 'Sin categoría';
      const previo = acumulado.get(categoria) || { categoria, total: 0, unidades: 0 };

      previo.total += plataDelItem(item);
      previo.unidades += unidadesDeItem(item);
      acumulado.set(categoria, previo);
    });
  });

  return [...acumulado.values()].sort((a, b) => b.total - a.total);
}

// Los años que tienen alguna venta, para el selector. Si no hay ninguna,
// el año actual, así el selector nunca queda vacío.
export function aniosConVentas(ventas) {
  const anios = [...new Set((ventas || []).map(anioDe).filter(Boolean))];
  return anios.length > 0 ? anios.sort((a, b) => b - a) : [new Date().getFullYear()];
}
