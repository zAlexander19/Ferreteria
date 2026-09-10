import { describe, it, expect } from 'vitest';
import { ventasUnificadas, totalPorOrigen, filtrarVentas } from './ventas';

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
