import { describe, it, expect } from 'vitest';
import { tieneDatos, decidirOrigen } from './syncPayload';

const vacio = { products: [], orders: [], sales: [], productions: [] };

describe('tieneDatos', () => {
  it('es falso para null, undefined y objeto vacio', () => {
    expect(tieneDatos(null)).toBe(false);
    expect(tieneDatos(undefined)).toBe(false);
    expect(tieneDatos({})).toBe(false);
    expect(tieneDatos(vacio)).toBe(false);
  });

  it('es verdadero si cualquiera de las cuatro listas tiene elementos', () => {
    expect(tieneDatos({ ...vacio, products: [{ id: 'FRE-001' }] })).toBe(true);
    expect(tieneDatos({ ...vacio, sales: [{ id: 'VEN-1' }] })).toBe(true);
    expect(tieneDatos({ ...vacio, productions: [{ id: 'PROD-1' }] })).toBe(true);
  });
});

describe('decidirOrigen', () => {
  it('adopta la nube cuando la nube tiene datos', () => {
    const nube = { ...vacio, products: [{ id: 'FRE-001' }] };
    expect(decidirOrigen(nube, vacio)).toBe('nube');
  });

  it('conserva lo local cuando la nube esta vacia y hay datos locales', () => {
    const local = { ...vacio, products: [{ id: 'FRE-001' }] };
    expect(decidirOrigen({}, local)).toBe('local');
  });

  it('la fila creada con {} del instructivo no borra los datos locales', () => {
    const local = { ...vacio, orders: [{ id: 'PED-1' }] };
    expect(decidirOrigen({}, local)).toBe('local');
  });

  it('no rompe cuando ambos estan vacios', () => {
    expect(decidirOrigen(undefined, vacio)).toBe('nube');
  });
});
