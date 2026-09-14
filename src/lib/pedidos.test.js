import { describe, it, expect } from 'vitest';
import { unidadesDeItem, unidadesTotales, deltaReserva, saldoPendiente, comprometidoPorProducto } from './pedidos';
import { ordenarPorEntrega, agruparPorEstado, filtrarPedidos, normalizarCobro, datosBoleta, describirProducto } from './pedidos';

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

const ped = (id, deliveryDate, extra = {}) => ({
  id, deliveryDate, deliveryTime: '12:00', status: 'Pendiente', ...extra
});

describe('ordenarPorEntrega', () => {
  it('ordena del mas proximo al mas lejano', () => {
    const orders = [ped('c', '2026-10-20'), ped('a', '2026-10-05'), ped('b', '2026-10-11')];
    expect(ordenarPorEntrega(orders).map(o => o.id)).toEqual(['a', 'b', 'c']);
  });

  it('desempata por hora de entrega', () => {
    const orders = [
      ped('tarde', '2026-10-05', { deliveryTime: '18:00' }),
      ped('manana', '2026-10-05', { deliveryTime: '09:00' }),
    ];
    expect(ordenarPorEntrega(orders).map(o => o.id)).toEqual(['manana', 'tarde']);
  });

  it('manda al final los que no tienen fecha', () => {
    const orders = [ped('sinfecha', ''), ped('confecha', '2026-10-05')];
    expect(ordenarPorEntrega(orders).map(o => o.id)).toEqual(['confecha', 'sinfecha']);
  });

  it('no modifica el arreglo original', () => {
    const orders = [ped('b', '2026-10-20'), ped('a', '2026-10-05')];
    ordenarPorEntrega(orders);
    expect(orders.map(o => o.id)).toEqual(['b', 'a']);
  });
});

describe('agruparPorEstado', () => {
  it('separa en pendientes, completados y cancelados', () => {
    const orders = [
      ped('p', '2026-10-05'),
      ped('c', '2026-10-06', { status: 'Completado' }),
      ped('x', '2026-10-07', { status: 'Cancelado' }),
    ];
    const g = agruparPorEstado(orders);
    expect(g.pendientes.map(o => o.id)).toEqual(['p']);
    expect(g.completados.map(o => o.id)).toEqual(['c']);
    expect(g.cancelados.map(o => o.id)).toEqual(['x']);
  });

  it('cada seccion viene ordenada por fecha', () => {
    const orders = [ped('p2', '2026-10-20'), ped('p1', '2026-10-05')];
    expect(agruparPorEstado(orders).pendientes.map(o => o.id)).toEqual(['p1', 'p2']);
  });

  it('devuelve las tres secciones aunque esten vacias', () => {
    const g = agruparPorEstado([]);
    expect(g).toEqual({ pendientes: [], completados: [], cancelados: [] });
  });
});

describe('filtrarPedidos', () => {
  const orders = [
    ped('a', '2026-10-05', { paymentStatus: 'Pagado' }),
    ped('b', '2026-10-15', { paymentStatus: 'Abonado' }),
    ped('c', '2026-10-25', { paymentStatus: 'Sin pagar' }),
    ped('d', '2026-10-20'),
  ];

  it('sin filtros devuelve todo', () => {
    expect(filtrarPedidos(orders, {}).map(o => o.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filtra por rango de fechas', () => {
    expect(filtrarPedidos(orders, { desde: '2026-10-10', hasta: '2026-10-21' }).map(o => o.id)).toEqual(['b', 'd']);
  });

  it('acepta solo desde', () => {
    expect(filtrarPedidos(orders, { desde: '2026-10-20' }).map(o => o.id)).toEqual(['c', 'd']);
  });

  it('acepta solo hasta', () => {
    expect(filtrarPedidos(orders, { hasta: '2026-10-15' }).map(o => o.id)).toEqual(['a', 'b']);
  });

  it('filtra por estado de pago', () => {
    expect(filtrarPedidos(orders, { estadoPago: 'Abonado' }).map(o => o.id)).toEqual(['b']);
  });

  it('trata los pedidos viejos sin estado de pago como sin pagar', () => {
    expect(filtrarPedidos(orders, { estadoPago: 'Sin pagar' }).map(o => o.id)).toEqual(['c', 'd']);
  });

  it('"Todos" no filtra por pago', () => {
    expect(filtrarPedidos(orders, { estadoPago: 'Todos' }).map(o => o.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('combina fecha y pago', () => {
    expect(filtrarPedidos(orders, { desde: '2026-10-16', estadoPago: 'Sin pagar' }).map(o => o.id)).toEqual(['c', 'd']);
  });
});

describe('filtrarPedidos con texto', () => {
  const orders = [
    ped('PED-001', '2026-10-05', { customerName: 'Maria Nunez', phone: '912345678' }),
    ped('PED-002', '2026-10-15', { customerName: 'Jose Nunez', phone: '987654321' }),
    ped('PED-003', '2026-10-25', { customerName: 'Ana Rojas', phone: '911111111' }),
  ];

  it('busca por nombre de cliente', () => {
    expect(filtrarPedidos(orders, { texto: 'rojas' }).map(o => o.id)).toEqual(['PED-003']);
  });

  it('ignora mayusculas y minusculas', () => {
    expect(filtrarPedidos(orders, { texto: 'ANA' }).map(o => o.id)).toEqual(['PED-003']);
  });

  it('encuentra por coincidencia parcial', () => {
    expect(filtrarPedidos(orders, { texto: 'nunez' }).map(o => o.id)).toEqual(['PED-001', 'PED-002']);
  });

  it('busca por telefono', () => {
    expect(filtrarPedidos(orders, { texto: '87654' }).map(o => o.id)).toEqual(['PED-002']);
  });

  it('busca por numero de pedido', () => {
    expect(filtrarPedidos(orders, { texto: 'PED-003' }).map(o => o.id)).toEqual(['PED-003']);
  });

  it('ignora espacios sobrantes alrededor', () => {
    expect(filtrarPedidos(orders, { texto: '  rojas  ' }).map(o => o.id)).toEqual(['PED-003']);
  });

  it('un texto vacio no filtra nada', () => {
    expect(filtrarPedidos(orders, { texto: '' }).map(o => o.id)).toEqual(['PED-001', 'PED-002', 'PED-003']);
  });

  it('devuelve vacio cuando no hay coincidencias', () => {
    expect(filtrarPedidos(orders, { texto: 'zzz' })).toEqual([]);
  });

  it('se combina con los otros filtros', () => {
    expect(filtrarPedidos(orders, { texto: 'nunez', desde: '2026-10-10' }).map(o => o.id)).toEqual(['PED-002']);
  });

  it('tolera pedidos sin nombre ni telefono', () => {
    expect(filtrarPedidos([ped('PED-009', '2026-10-05')], { texto: 'ana' })).toEqual([]);
  });
});

describe('filtrarPedidos: las tildes no importan', () => {
  // Con clientes chilenos esto no es un caso de borde: que "Nunez" no
  // encuentre a "Nunez" con tilde seria un bug garantizado en el mostrador.
  const orders = [
    ped('PED-001', '2026-10-05', { customerName: 'María Núñez' }),
    ped('PED-002', '2026-10-15', { customerName: 'Sebastián Bórquez' }),
  ];

  it('un texto sin tildes encuentra un nombre con tildes', () => {
    expect(filtrarPedidos(orders, { texto: 'nunez' }).map(o => o.id)).toEqual(['PED-001']);
  });

  it('un texto con tildes encuentra un nombre con tildes', () => {
    expect(filtrarPedidos(orders, { texto: 'Núñez' }).map(o => o.id)).toEqual(['PED-001']);
  });

  it('un texto con tildes encuentra un nombre sin tildes', () => {
    const sinTildes = [
      ped('PED-003', '2026-10-05', { customerName: 'Maria Nunez' }),
      ped('PED-004', '2026-10-05', { customerName: 'Ana Rojas' }),
    ];
    expect(filtrarPedidos(sinTildes, { texto: 'María' }).map(o => o.id)).toEqual(['PED-003']);
  });

  it('funciona en el medio de la palabra', () => {
    expect(filtrarPedidos(orders, { texto: 'borquez' }).map(o => o.id)).toEqual(['PED-002']);
  });
});

describe('normalizarCobro', () => {
  it('Pagado deja el monto abonado en 0 porque ya no queda saldo', () => {
    expect(normalizarCobro({ paymentStatus: 'Pagado', paidAmount: '5000' }, 24000))
      .toEqual({ ok: true, paymentStatus: 'Pagado', paidAmount: 0 });
  });

  it('Sin pagar descarta cualquier monto que hubiera quedado cargado', () => {
    expect(normalizarCobro({ paymentStatus: 'Sin pagar', paidAmount: '5000' }, 24000))
      .toEqual({ ok: true, paymentStatus: 'Sin pagar', paidAmount: 0 });
  });

  it('Abonado convierte el monto de texto a numero', () => {
    expect(normalizarCobro({ paymentStatus: 'Abonado', paidAmount: '10000' }, 24000))
      .toEqual({ ok: true, paymentStatus: 'Abonado', paidAmount: 10000 });
  });

  it('rechaza un abono de 0', () => {
    expect(normalizarCobro({ paymentStatus: 'Abonado', paidAmount: '0' }, 24000).ok).toBe(false);
  });

  it('rechaza un abono negativo', () => {
    expect(normalizarCobro({ paymentStatus: 'Abonado', paidAmount: '-500' }, 24000).ok).toBe(false);
  });

  it('rechaza un abono sin monto', () => {
    expect(normalizarCobro({ paymentStatus: 'Abonado', paidAmount: '' }, 24000).ok).toBe(false);
  });

  it('rechaza un abono mayor al total', () => {
    expect(normalizarCobro({ paymentStatus: 'Abonado', paidAmount: '30000' }, 24000).ok).toBe(false);
  });

  it('un abono igual al total es en realidad un pago completo', () => {
    expect(normalizarCobro({ paymentStatus: 'Abonado', paidAmount: '24000' }, 24000))
      .toEqual({ ok: true, paymentStatus: 'Pagado', paidAmount: 0 });
  });

  it('el rechazo explica el motivo', () => {
    expect(normalizarCobro({ paymentStatus: 'Abonado', paidAmount: '30000' }, 24000).message)
      .toMatch(/total/i);
  });
});

describe('datosBoleta', () => {
  const pedido = {
    id: 'PED-416263',
    customerName: 'Dhayi Vega',
    phone: '912345678',
    deliveryDate: '2026-09-13',
    deliveryTime: '12:00',
    total: 54700,
    paymentStatus: 'Sin pagar',
    items: [
      { id: 'HOR-001', name: 'Masas Horno 21cm', category: 'Horno', centimetros: '21', price: 2400, quantity: 15, unitsPerPackage: '10' },
      { id: 'FRE-003', name: 'Masas Freir 19cm', category: 'Freir', centimetros: '19', price: 1700, quantity: 6, unitsPerPackage: '10' },
    ],
  };

  it('arma una linea por producto del pedido', () => {
    expect(datosBoleta(pedido).lineas).toHaveLength(2);
  });

  it('cada linea trae las bolsas y el precio de cada bolsa', () => {
    const [primera] = datosBoleta(pedido).lineas;
    expect(primera.bolsas).toBe(15);
    expect(primera.precioUnitario).toBe(2400);
  });

  it('el subtotal de una linea es el precio por bolsa multiplicado por las bolsas', () => {
    expect(datosBoleta(pedido).lineas[0].subtotal).toBe(36000);
  });

  it('cada linea trae las unidades de masa que representa', () => {
    expect(datosBoleta(pedido).lineas[0].unidades).toBe(150);
  });

  it('conserva las etiquetas con las que se reconoce el producto', () => {
    const [primera] = datosBoleta(pedido).lineas;
    expect(primera.category).toBe('Horno');
    expect(primera.centimetros).toBe('21');
  });

  it('suma el total de unidades de masa del pedido', () => {
    expect(datosBoleta(pedido).totalUnidades).toBe(210);
  });

  it('el total en plata es el que se guardo en el pedido, no uno recalculado', () => {
    expect(datosBoleta(pedido).total).toBe(54700);
  });

  it('copia los datos del cliente y de la entrega', () => {
    const boleta = datosBoleta(pedido);
    expect(boleta.cliente).toEqual({ nombre: 'Dhayi Vega', telefono: '912345678' });
    expect(boleta.entrega).toEqual({ fecha: '2026-09-13', hora: '12:00' });
  });

  it('un pedido sin pagar debe el total entero', () => {
    expect(datosBoleta(pedido).pago).toEqual({ estado: 'Sin pagar', abonado: 0, saldo: 54700 });
  });

  it('un pedido abonado muestra cuanto abono y cuanto falta', () => {
    const abonado = { ...pedido, paymentStatus: 'Abonado', paidAmount: 20000 };
    expect(datosBoleta(abonado).pago).toEqual({ estado: 'Abonado', abonado: 20000, saldo: 34700 });
  });

  it('un pedido pagado no deja saldo', () => {
    const pagado = { ...pedido, paymentStatus: 'Pagado' };
    expect(datosBoleta(pagado).pago).toEqual({ estado: 'Pagado', abonado: 0, saldo: 0 });
  });

  it('los pedidos viejos sin estado de pago cuentan como sin pagar', () => {
    const viejo = { ...pedido, paymentStatus: undefined };
    expect(datosBoleta(viejo).pago.estado).toBe('Sin pagar');
  });

  it('tolera un pedido sin items', () => {
    const vacio = datosBoleta({ ...pedido, items: undefined });
    expect(vacio.lineas).toEqual([]);
    expect(vacio.totalUnidades).toBe(0);
  });
});

describe('describirProducto', () => {
  it('junta el tipo de masa y la medida', () => {
    expect(describirProducto({ category: 'Horno', centimetros: '21' })).toBe('Horno · 21 cm');
  });

  it('agrega Coctel cuando el producto lo es', () => {
    expect(describirProducto({ category: 'Freir', centimetros: '10', isCocktail: true }))
      .toBe('Freir · 10 cm · Cóctel');
  });

  it('omite la medida cuando el producto no la tiene', () => {
    expect(describirProducto({ category: 'Sopaipillas' })).toBe('Sopaipillas');
  });

  it('trata la medida vacia como ausente', () => {
    expect(describirProducto({ category: 'Horno', centimetros: '' })).toBe('Horno');
  });

  it('acepta una medida de 0 sin confundirla con ausente', () => {
    expect(describirProducto({ category: 'Horno', centimetros: 0 })).toBe('Horno · 0 cm');
  });

  it('omite el tipo cuando no esta cargado', () => {
    expect(describirProducto({ centimetros: '19' })).toBe('19 cm');
  });

  it('devuelve texto vacio cuando no hay nada que describir', () => {
    expect(describirProducto({})).toBe('');
    expect(describirProducto(undefined)).toBe('');
  });
});
