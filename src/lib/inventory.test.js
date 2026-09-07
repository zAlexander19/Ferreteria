import { describe, it, expect } from 'vitest';
import { generateSku, applyProductEdit } from './inventory';

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
