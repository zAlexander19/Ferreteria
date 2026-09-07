import { describe, it, expect } from 'vitest';
import { generateSku } from './inventory';

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
