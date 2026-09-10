import { describe, it, expect } from 'vitest';
import { unidadesDeItem, unidadesTotales, deltaReserva, saldoPendiente, comprometidoPorProducto } from './pedidos';

describe('unidadesDeItem', () => {
  it('multiplica bolsas por unidades por bolsa', () => {
    expect(unidadesDeItem({ quantity: 3, unitsPerPackage: '10' })).toBe(30);
  });

  it('trata unitsPerPackage ausente como 1', () => {
    expect(unidadesDeItem({ quantity: 4 })).toBe(4);
  });

  it('devuelve 0 si no hay cantidad', () => {
    expect(unidadesDeItem({ unitsPerPackage: '25' })).toBe(0);
  });
});

describe('unidadesTotales', () => {
  it('suma las unidades de todos los items', () => {
    const items = [
      { id: 'A', quantity: 2, unitsPerPackage: '10' },
      { id: 'B', quantity: 1, unitsPerPackage: '25' },
    ];
    expect(unidadesTotales(items)).toBe(45);
  });

  it('devuelve 0 para una lista vacia o ausente', () => {
    expect(unidadesTotales([])).toBe(0);
    expect(unidadesTotales(undefined)).toBe(0);
  });
});

describe('deltaReserva', () => {
  it('devuelve al stock cuando baja la cantidad', () => {
    const viejos = [{ id: 'A', quantity: 5, unitsPerPackage: '10' }];
    const nuevos = [{ id: 'A', quantity: 2, unitsPerPackage: '10' }];
    expect(deltaReserva(viejos, nuevos)).toEqual({ A: 30 });
  });

  it('descuenta del stock cuando sube la cantidad', () => {
    const viejos = [{ id: 'A', quantity: 2, unitsPerPackage: '10' }];
    const nuevos = [{ id: 'A', quantity: 5, unitsPerPackage: '10' }];
    expect(deltaReserva(viejos, nuevos)).toEqual({ A: -30 });
  });

  it('devuelve todo lo reservado de un producto que se quita del pedido', () => {
    const viejos = [
      { id: 'A', quantity: 2, unitsPerPackage: '10' },
      { id: 'B', quantity: 1, unitsPerPackage: '25' },
    ];
    const nuevos = [{ id: 'A', quantity: 2, unitsPerPackage: '10' }];
    expect(deltaReserva(viejos, nuevos)).toEqual({ B: 25 });
  });

  it('descuenta un producto que se agrega al pedido', () => {
    const viejos = [{ id: 'A', quantity: 2, unitsPerPackage: '10' }];
    const nuevos = [
      { id: 'A', quantity: 2, unitsPerPackage: '10' },
      { id: 'B', quantity: 3, unitsPerPackage: '20' },
    ];
    expect(deltaReserva(viejos, nuevos)).toEqual({ B: -60 });
  });

  it('no incluye los productos que no cambiaron', () => {
    const items = [{ id: 'A', quantity: 2, unitsPerPackage: '10' }];
    expect(deltaReserva(items, items)).toEqual({});
  });

  it('maneja el cambio completo de productos', () => {
    const viejos = [{ id: 'A', quantity: 1, unitsPerPackage: '10' }];
    const nuevos = [{ id: 'B', quantity: 1, unitsPerPackage: '10' }];
    expect(deltaReserva(viejos, nuevos)).toEqual({ A: 10, B: -10 });
  });
});

describe('saldoPendiente', () => {
  it('es el total completo cuando no esta pagado', () => {
    expect(saldoPendiente({ total: 30000, paymentStatus: 'Sin pagar' })).toBe(30000);
  });

  it('descuenta lo abonado', () => {
    expect(saldoPendiente({ total: 30000, paymentStatus: 'Abonado', paidAmount: 10000 })).toBe(20000);
  });

  it('es 0 cuando esta pagado', () => {
    expect(saldoPendiente({ total: 30000, paymentStatus: 'Pagado' })).toBe(0);
  });

  it('nunca es negativo aunque el abono supere el total', () => {
    expect(saldoPendiente({ total: 10000, paymentStatus: 'Abonado', paidAmount: 15000 })).toBe(0);
  });

  it('trata un pedido viejo sin estado de pago como sin pagar', () => {
    expect(saldoPendiente({ total: 5000 })).toBe(5000);
  });
});

describe('comprometidoPorProducto', () => {
  const pedido = (status, items, stockReserved = true) => ({
    status,
    stockReserved,
    reservationBreakdown: items
  });

  it('suma lo reservado por los pedidos pendientes', () => {
    const orders = [
      pedido('Pendiente', [{ productId: 'HOR-002', unitsReserved: 75 }]),
      pedido('Pendiente', [{ productId: 'HOR-002', unitsReserved: 25 }]),
    ];
    expect(comprometidoPorProducto(orders)).toEqual({ 'HOR-002': 100 });
  });

  it('ignora los pedidos cancelados', () => {
    const orders = [
      pedido('Pendiente', [{ productId: 'A', unitsReserved: 10 }]),
      pedido('Cancelado', [{ productId: 'A', unitsReserved: 50 }], false),
    ];
    expect(comprometidoPorProducto(orders)).toEqual({ A: 10 });
  });

  it('ignora los pedidos completados porque ya se entregaron', () => {
    const orders = [
      pedido('Pendiente', [{ productId: 'A', unitsReserved: 10 }]),
      pedido('Completado', [{ productId: 'A', unitsReserved: 40 }]),
    ];
    expect(comprometidoPorProducto(orders)).toEqual({ A: 10 });
  });

  it('separa por producto dentro de un mismo pedido', () => {
    const orders = [pedido('Pendiente', [
      { productId: 'HOR-002', unitsReserved: 75 },
      { productId: 'FRE-002', unitsReserved: 75 },
    ])];
    expect(comprometidoPorProducto(orders)).toEqual({ 'HOR-002': 75, 'FRE-002': 75 });
  });

  it('no rompe con pedidos sin reservationBreakdown ni con lista vacia', () => {
    expect(comprometidoPorProducto([{ status: 'Pendiente' }])).toEqual({});
    expect(comprometidoPorProducto([])).toEqual({});
    expect(comprometidoPorProducto(undefined)).toEqual({});
  });
});
