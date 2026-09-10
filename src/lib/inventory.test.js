import { describe, it, expect } from 'vitest';
import { generateSku, applyProductEdit, normalizeProductFields, faltantesPorProducto, vistaStock, disponibleDesdeMaquina } from './inventory';

describe('generateSku', () => {
  it('arranca en 001 cuando no hay productos de esa categoria', () => {
    expect(generateSku([], 'Freir')).toBe('FRE-001');
  });

  it('no reutiliza un SKU despues de borrar uno intermedio', () => {
    const products = [
      { id: 'HOR-001', category: 'Horno' },
      { id: 'HOR-003', category: 'Horno' },
    ];
    expect(generateSku(products, 'Horno')).toBe('HOR-004');
  });

  it('no mezcla categorias distintas', () => {
    const products = [
      { id: 'FRE-001', category: 'Freir' },
      { id: 'FRE-002', category: 'Freir' },
      { id: 'SOP-001', category: 'Sopaipillas' },
    ];
    expect(generateSku(products, 'Sopaipillas')).toBe('SOP-002');
  });

  it('ignora ids con formato inesperado', () => {
    const products = [
      { id: 'FRE-001', category: 'Freir' },
      { id: 'FRE-abc', category: 'Freir' },
      { id: null, category: 'Freir' },
    ];
    expect(generateSku(products, 'Freir')).toBe('FRE-002');
  });
});

describe('applyProductEdit', () => {
  it('conserva los campos que el formulario no envia', () => {
    const products = [
      { id: 'FRE-001', name: 'Masas 12cm', price: 3500, salesCount: 120, lastSaleDate: '2026-09-07' },
    ];
    const editado = { id: 'FRE-001', name: 'Masas 12cm', price: 3900 };

    const [resultado] = applyProductEdit(products, editado);

    expect(resultado.price).toBe(3900);
    expect(resultado.salesCount).toBe(120);
    expect(resultado.lastSaleDate).toBe('2026-09-07');
  });

  it('no toca los demas productos', () => {
    const products = [
      { id: 'FRE-001', price: 100 },
      { id: 'SOP-001', price: 200 },
    ];

    const resultado = applyProductEdit(products, { id: 'FRE-001', price: 150 });

    expect(resultado[1]).toEqual({ id: 'SOP-001', price: 200 });
  });
});

describe('normalizeProductFields', () => {
  it('convierte a numero los cuatro campos numericos', () => {
    const resultado = normalizeProductFields({
      centimetros: '12',
      stock: '500',
      minStock: '50',
      price: '3500',
      cost: '1800',
    });

    expect(resultado.stock).toBe(500);
    expect(resultado.minStock).toBe(50);
    expect(resultado.price).toBe(3500);
    expect(resultado.cost).toBe(1800);
  });

  it('usa 5 como minimo por defecto y 0 para el resto', () => {
    const resultado = normalizeProductFields({ stock: '', minStock: '', price: '', cost: '' });

    expect(resultado.minStock).toBe(5);
    expect(resultado.stock).toBe(0);
    expect(resultado.price).toBe(0);
    expect(resultado.cost).toBe(0);
  });

  it('conserva los campos no numericos', () => {
    const resultado = normalizeProductFields({
      category: 'Freir',
      isCocktail: true,
      unitsPerPackage: '10',
      stock: '1', minStock: '1', price: '1', cost: '1',
    });

    expect(resultado.category).toBe('Freir');
    expect(resultado.isCocktail).toBe(true);
    expect(resultado.unitsPerPackage).toBe('10');
  });
});

describe('faltantesPorProducto', () => {
  it('no devuelve nada cuando ningun producto esta en negativo', () => {
    const products = [
      { id: 'FRE-001', name: 'Freir 12cm', stock: 100 },
      { id: 'HOR-001', name: 'Horno 8cm', stock: 0 },
    ];
    expect(faltantesPorProducto(products)).toEqual([]);
  });

  it('devuelve las unidades que faltan de un producto en negativo', () => {
    const products = [{ id: 'FRE-001', name: 'Freir 12cm', stock: -70 }];
    expect(faltantesPorProducto(products)).toEqual([
      { id: 'FRE-001', name: 'Freir 12cm', unitsShort: 70 },
    ]);
  });

  it('solo incluye los que estan en negativo', () => {
    const products = [
      { id: 'FRE-001', name: 'Freir 12cm', stock: -70 },
      { id: 'HOR-001', name: 'Horno 8cm', stock: 50 },
      { id: 'SOP-001', name: 'Sopaipillas 10cm', stock: -40 },
    ];
    expect(faltantesPorProducto(products).map(f => f.id)).toEqual(['FRE-001', 'SOP-001']);
  });

  it('no rompe con stock ausente o no numerico', () => {
    const products = [
      { id: 'FRE-001', name: 'Freir 12cm' },
      { id: 'HOR-001', name: 'Horno 8cm', stock: null },
      { id: 'SOP-001', name: 'Sopaipillas 10cm', stock: -5 },
    ];
    expect(faltantesPorProducto(products)).toEqual([
      { id: 'SOP-001', name: 'Sopaipillas 10cm', unitsShort: 5 },
    ]);
  });

  it('acepta una lista vacia', () => {
    expect(faltantesPorProducto([])).toEqual([]);
  });
});

describe('vistaStock', () => {
  it('el stock guardado es el disponible, y en maquina lo incluye mas lo reservado', () => {
    expect(vistaStock({ stock: 250 }, 550)).toEqual({ enMaquina: 800, reservado: 550, disponible: 250 });
  });

  it('un producto con todo comprometido queda en 0 disponible', () => {
    expect(vistaStock({ stock: 0 }, 75)).toEqual({ enMaquina: 75, reservado: 75, disponible: 0 });
  });

  it('un disponible negativo significa que no hay nada en maquina y se debe', () => {
    expect(vistaStock({ stock: -75 }, 75)).toEqual({ enMaquina: 0, reservado: 75, disponible: -75 });
  });

  it('sin reservas, en maquina y disponible son lo mismo', () => {
    expect(vistaStock({ stock: 620 })).toEqual({ enMaquina: 620, reservado: 0, disponible: 620 });
  });

  it('no rompe con stock ausente o no numerico', () => {
    expect(vistaStock({}, 10)).toEqual({ enMaquina: 10, reservado: 10, disponible: 0 });
    expect(vistaStock({ stock: null })).toEqual({ enMaquina: 0, reservado: 0, disponible: 0 });
  });
});

describe('disponibleDesdeMaquina', () => {
  it('descuenta lo reservado de lo que ella conto fisicamente', () => {
    expect(disponibleDesdeMaquina(800, 550)).toBe(250);
  });

  it('da 0 cuando lo contado es exactamente lo comprometido', () => {
    expect(disponibleDesdeMaquina(75, 75)).toBe(0);
  });

  it('da negativo cuando conto menos de lo que debe', () => {
    expect(disponibleDesdeMaquina(0, 75)).toBe(-75);
  });

  it('sin reservas devuelve lo contado', () => {
    expect(disponibleDesdeMaquina(100)).toBe(100);
  });

  it('es la inversa de vistaStock', () => {
    const v = vistaStock({ stock: -40 }, 40);
    expect(disponibleDesdeMaquina(v.enMaquina, v.reservado)).toBe(-40);
  });
});
