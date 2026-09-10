import { describe, it, expect } from 'vitest';
import {
  ventasUnificadas, totalPorOrigen, filtrarVentas,
  ventasDelPeriodo, serieFinanciera, totalPorCategoria, aniosConVentas,
} from './ventas';

// Las ventas del mostrador guardan un ISO completo. Se construye desde una
// fecha LOCAL para que la prueba valga en cualquier zona horaria.
const venta = (id, anio, mes, dia, hora, minuto, total) => ({
  id,
  date: new Date(anio, mes - 1, dia, hora, minuto).toISOString(),
  items: [{ id: 'FRE-001', quantity: 1 }],
  total,
});

const pedido = (id, deliveryDate, total, extra = {}) => ({
  id,
  deliveryDate,
  deliveryTime: '12:00',
  status: 'Completado',
  paymentStatus: 'Pagado',
  customerName: 'Cliente',
  items: [{ id: 'HOR-001', quantity: 2 }],
  total,
  ...extra,
});

describe('ventasUnificadas', () => {
  it('incluye las ventas del mostrador', () => {
    const r = ventasUnificadas([venta('VEN-1', 2026, 9, 10, 14, 30, 5000)], []);
    expect(r).toHaveLength(1);
    expect(r[0].origen).toBe('Punto de venta');
    expect(r[0].fecha).toBe('2026-09-10');
    expect(r[0].total).toBe(5000);
  });

  it('convierte la hora del mostrador a hora local, no UTC', () => {
    const r = ventasUnificadas([venta('VEN-1', 2026, 9, 10, 14, 30, 5000)], []);
    expect(r[0].hora).toBe('14:30');
  });

  it('una venta de la noche no se corre al dia siguiente', () => {
    const r = ventasUnificadas([venta('VEN-1', 2026, 9, 10, 23, 45, 1000)], []);
    expect(r[0].fecha).toBe('2026-09-10');
  });

  it('incluye los pedidos completados Y pagados', () => {
    const r = ventasUnificadas([], [pedido('PED-1', '2026-09-10', 30000)]);
    expect(r).toHaveLength(1);
    expect(r[0].origen).toBe('Pedido');
    expect(r[0].cliente).toBe('Cliente');
  });

  it('excluye los pedidos pendientes', () => {
    const r = ventasUnificadas([], [pedido('PED-1', '2026-09-10', 30000, { status: 'Pendiente' })]);
    expect(r).toHaveLength(0);
  });

  it('excluye los pedidos cancelados', () => {
    const r = ventasUnificadas([], [pedido('PED-1', '2026-09-10', 30000, { status: 'Cancelado' })]);
    expect(r).toHaveLength(0);
  });

  it('excluye los completados que solo estan abonados', () => {
    const r = ventasUnificadas([], [pedido('PED-1', '2026-09-10', 30000, { paymentStatus: 'Abonado' })]);
    expect(r).toHaveLength(0);
  });

  it('excluye los completados sin pagar', () => {
    const r = ventasUnificadas([], [pedido('PED-1', '2026-09-10', 30000, { paymentStatus: 'Sin pagar' })]);
    expect(r).toHaveLength(0);
  });

  it('ordena de la mas reciente a la mas antigua', () => {
    const r = ventasUnificadas(
      [venta('VEN-vieja', 2026, 9, 1, 10, 0, 1000), venta('VEN-nueva', 2026, 9, 20, 10, 0, 1000)],
      [pedido('PED-medio', '2026-09-10', 1000)]
    );
    expect(r.map(v => v.id)).toEqual(['VEN-nueva', 'PED-medio', 'VEN-vieja']);
  });

  it('desempata por hora dentro del mismo dia', () => {
    const r = ventasUnificadas(
      [venta('VEN-manana', 2026, 9, 10, 9, 0, 1000), venta('VEN-tarde', 2026, 9, 10, 18, 0, 1000)],
      []
    );
    expect(r.map(v => v.id)).toEqual(['VEN-tarde', 'VEN-manana']);
  });

  it('no rompe con listas vacias o ausentes', () => {
    expect(ventasUnificadas([], [])).toEqual([]);
    expect(ventasUnificadas(undefined, undefined)).toEqual([]);
  });
});

describe('totalPorOrigen', () => {
  it('suma el monto y cuenta las ventas de cada origen', () => {
    const ventas = ventasUnificadas(
      [venta('VEN-1', 2026, 9, 10, 10, 0, 5000), venta('VEN-2', 2026, 9, 11, 10, 0, 3000)],
      [pedido('PED-1', '2026-09-10', 30000), pedido('PED-2', '2026-09-12', 20000)]
    );
    expect(totalPorOrigen(ventas)).toEqual([
      { origen: 'Punto de venta', total: 8000, cantidad: 2 },
      { origen: 'Pedido', total: 50000, cantidad: 2 },
    ]);
  });

  it('devuelve los dos origenes aunque uno no tenga ventas', () => {
    const ventas = ventasUnificadas([venta('VEN-1', 2026, 9, 10, 10, 0, 5000)], []);
    expect(totalPorOrigen(ventas)).toEqual([
      { origen: 'Punto de venta', total: 5000, cantidad: 1 },
      { origen: 'Pedido', total: 0, cantidad: 0 },
    ]);
  });

  it('con lista vacia devuelve ambos en cero', () => {
    expect(totalPorOrigen([])).toEqual([
      { origen: 'Punto de venta', total: 0, cantidad: 0 },
      { origen: 'Pedido', total: 0, cantidad: 0 },
    ]);
  });
});

describe('filtrarVentas', () => {
  const ventas = ventasUnificadas(
    [venta('VEN-1', 2026, 9, 5, 10, 0, 1000), venta('VEN-2', 2026, 9, 25, 10, 0, 1000)],
    [pedido('PED-1', '2026-09-15', 1000)]
  );

  it('sin filtro devuelve todo', () => {
    expect(filtrarVentas(ventas, {}).map(v => v.id)).toEqual(['VEN-2', 'PED-1', 'VEN-1']);
  });

  it('filtra por rango de fechas', () => {
    expect(filtrarVentas(ventas, { desde: '2026-09-10', hasta: '2026-09-20' }).map(v => v.id)).toEqual(['PED-1']);
  });

  it('acepta solo desde', () => {
    expect(filtrarVentas(ventas, { desde: '2026-09-15' }).map(v => v.id)).toEqual(['VEN-2', 'PED-1']);
  });

  it('acepta solo hasta', () => {
    expect(filtrarVentas(ventas, { hasta: '2026-09-15' }).map(v => v.id)).toEqual(['PED-1', 'VEN-1']);
  });
});

// --- Agregados para los gráficos de Estadísticas -----------------------------

// Una venta ya unificada: fecha 'YYYY-MM-DD' e items con el snapshot del producto.
const v = (fecha, items) => ({ id: 'V-' + fecha, fecha, hora: '12:00', items, total: 0 });
const item = (categoria, precio, costo, bolsas, udsPorBolsa = 10) => ({
  id: categoria + '-1',
  category: categoria,
  price: precio,
  cost: costo,
  quantity: bolsas,
  unitsPerPackage: String(udsPorBolsa),
});

describe('ventasDelPeriodo', () => {
  const ventas = [
    v('2026-09-10', [item('Freir', 1500, 700, 1)]),
    v('2026-09-25', [item('Horno', 2400, 1100, 2)]),
    v('2026-04-25', [item('Freir', 1500, 700, 1)]),
    v('2025-09-10', [item('Horno', 2400, 1100, 1)]),
  ];

  it('deja solo las del mes pedido', () => {
    expect(ventasDelPeriodo(ventas, { anio: 2026, mes: 9 }).map(x => x.fecha))
      .toEqual(['2026-09-10', '2026-09-25']);
  });

  it('sin mes toma el año entero', () => {
    expect(ventasDelPeriodo(ventas, { anio: 2026, mes: null }).map(x => x.fecha))
      .toEqual(['2026-09-10', '2026-09-25', '2026-04-25']);
  });

  it('no mezcla el mismo mes de otro año', () => {
    expect(ventasDelPeriodo(ventas, { anio: 2025, mes: 9 }).map(x => x.fecha))
      .toEqual(['2025-09-10']);
  });

  it('con lista vacía devuelve vacío', () => {
    expect(ventasDelPeriodo([], { anio: 2026, mes: 9 })).toEqual([]);
    expect(ventasDelPeriodo(undefined, { anio: 2026, mes: 9 })).toEqual([]);
  });
});

describe('serieFinanciera por mes', () => {
  it('arma un punto por cada día del mes, aunque no haya ventas', () => {
    const r = serieFinanciera([], { anio: 2026, mes: 9 });
    expect(r).toHaveLength(30);
    expect(r[0].etiqueta).toBe('1');
    expect(r[29].etiqueta).toBe('30');
    expect(r.every(d => d.costo === 0 && d.ganancia === 0)).toBe(true);
  });

  it('respeta los meses de 31 días', () => {
    expect(serieFinanciera([], { anio: 2026, mes: 1 })).toHaveLength(31);
  });

  it('respeta febrero bisiesto', () => {
    expect(serieFinanciera([], { anio: 2024, mes: 2 })).toHaveLength(29);
    expect(serieFinanciera([], { anio: 2026, mes: 2 })).toHaveLength(28);
  });

  it('pone costo y ganancia en el día que corresponde', () => {
    // 2 bolsas a $2.400 con costo $1.100: costo 2200, ganancia 2600
    const r = serieFinanciera([v('2026-09-10', [item('Horno', 2400, 1100, 2)])], { anio: 2026, mes: 9 });
    expect(r[9]).toEqual({ etiqueta: '10', costo: 2200, ganancia: 2600 });
    expect(r[8]).toEqual({ etiqueta: '9', costo: 0, ganancia: 0 });
  });

  it('suma varias ventas del mismo día', () => {
    const r = serieFinanciera([
      v('2026-09-10', [item('Horno', 2400, 1100, 2)]),
      v('2026-09-10', [item('Freir', 1500, 700, 1)]),
    ], { anio: 2026, mes: 9 });
    expect(r[9]).toEqual({ etiqueta: '10', costo: 2900, ganancia: 3400 });
  });

  it('suma todos los items de una misma venta', () => {
    const r = serieFinanciera([
      v('2026-09-10', [item('Horno', 2400, 1100, 2), item('Freir', 1500, 700, 1)]),
    ], { anio: 2026, mes: 9 });
    expect(r[9]).toEqual({ etiqueta: '10', costo: 2900, ganancia: 3400 });
  });

  it('ignora las ventas de otro mes', () => {
    const r = serieFinanciera([v('2026-08-10', [item('Horno', 2400, 1100, 2)])], { anio: 2026, mes: 9 });
    expect(r.every(d => d.costo === 0 && d.ganancia === 0)).toBe(true);
  });

  it('acepta el costo guardado como texto', () => {
    const r = serieFinanciera([v('2026-09-10', [item('Horno', 2400, '1100', 2)])], { anio: 2026, mes: 9 });
    expect(r[9].costo).toBe(2200);
  });

  it('un producto sin costo deja la ganancia igual a la venta', () => {
    const r = serieFinanciera([v('2026-09-10', [item('Horno', 2000, 0, 1)])], { anio: 2026, mes: 9 });
    expect(r[9]).toEqual({ etiqueta: '10', costo: 0, ganancia: 2000 });
  });
});

describe('serieFinanciera por año', () => {
  it('arma los 12 meses aunque no haya ventas', () => {
    const r = serieFinanciera([], { anio: 2026, mes: null });
    expect(r).toHaveLength(12);
    expect(r[0].etiqueta).toBe('ene');
    expect(r[11].etiqueta).toBe('dic');
  });

  it('acumula cada venta en su mes', () => {
    const r = serieFinanciera([
      v('2026-09-10', [item('Horno', 2400, 1100, 2)]),
      v('2026-09-25', [item('Freir', 1500, 700, 1)]),
      v('2026-04-25', [item('Freir', 1500, 700, 1)]),
    ], { anio: 2026, mes: null });
    expect(r[8]).toEqual({ etiqueta: 'sep', costo: 2900, ganancia: 3400 });
    expect(r[3]).toEqual({ etiqueta: 'abr', costo: 700, ganancia: 800 });
    expect(r[0]).toEqual({ etiqueta: 'ene', costo: 0, ganancia: 0 });
  });

  it('ignora las ventas de otro año', () => {
    const r = serieFinanciera([v('2025-09-10', [item('Horno', 2400, 1100, 2)])], { anio: 2026, mes: null });
    expect(r.every(m => m.costo === 0 && m.ganancia === 0)).toBe(true);
  });
});

describe('totalPorCategoria', () => {
  it('devuelve plata y unidades por categoría', () => {
    const r = totalPorCategoria([
      v('2026-09-10', [item('Horno', 2400, 1100, 2, 10)]),   // $4.800, 20 uds
      v('2026-09-11', [item('Freir', 1500, 700, 1, 10)]),    // $1.500, 10 uds
    ]);
    expect(r).toEqual([
      { categoria: 'Horno', total: 4800, unidades: 20 },
      { categoria: 'Freir', total: 1500, unidades: 10 },
    ]);
  });

  it('junta la misma categoría de ventas distintas', () => {
    const r = totalPorCategoria([
      v('2026-09-10', [item('Freir', 1500, 700, 1, 10)]),
      v('2026-09-11', [item('Freir', 1875, 1000, 2, 25)]),
    ]);
    expect(r).toEqual([{ categoria: 'Freir', total: 5250, unidades: 60 }]);
  });

  it('ordena de mayor a menor plata', () => {
    const r = totalPorCategoria([
      v('2026-09-10', [item('Freir', 1000, 500, 1)]),
      v('2026-09-10', [item('Horno', 5000, 500, 1)]),
      v('2026-09-10', [item('Sopaipillas', 3000, 500, 1)]),
    ]);
    expect(r.map(c => c.categoria)).toEqual(['Horno', 'Sopaipillas', 'Freir']);
  });

  it('un item sin categoría queda como Sin categoría', () => {
    const sinCat = { id: 'X', price: 1000, cost: 0, quantity: 1, unitsPerPackage: '10' };
    expect(totalPorCategoria([v('2026-09-10', [sinCat])]))
      .toEqual([{ categoria: 'Sin categoría', total: 1000, unidades: 10 }]);
  });

  it('sin ventas devuelve vacío', () => {
    expect(totalPorCategoria([])).toEqual([]);
    expect(totalPorCategoria(undefined)).toEqual([]);
  });
});

describe('aniosConVentas', () => {
  it('devuelve los años sin repetir, del mas nuevo al mas viejo', () => {
    const r = aniosConVentas([
      v('2026-09-10', []), v('2025-04-01', []), v('2026-01-02', []),
    ]);
    expect(r).toEqual([2026, 2025]);
  });

  it('sin ventas devuelve el año actual', () => {
    expect(aniosConVentas([])).toEqual([new Date().getFullYear()]);
  });

  it('ignora ventas sin fecha', () => {
    expect(aniosConVentas([{ id: 'X', fecha: '', items: [] }])).toEqual([new Date().getFullYear()]);
  });
});
