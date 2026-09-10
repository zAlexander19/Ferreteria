import { describe, it, expect } from 'vitest';
import { aTexto, aFecha, mostrarFecha, mostrarFechaLarga } from './fechas';

describe('aTexto', () => {
  it('formatea como YYYY-MM-DD', () => {
    expect(aTexto(new Date(2026, 8, 10))).toBe('2026-09-10');
  });

  it('rellena mes y dia con cero', () => {
    expect(aTexto(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('usa la fecha local y no UTC: un 1 de mes a medianoche no retrocede un dia', () => {
    // Con toISOString() esto devolveria '2026-08-31' en Chile (UTC-3/-4).
    expect(aTexto(new Date(2026, 8, 1, 0, 0, 0))).toBe('2026-09-01');
  });

  it('devuelve vacio si no hay fecha', () => {
    expect(aTexto(null)).toBe('');
    expect(aTexto(undefined)).toBe('');
  });
});

describe('aFecha', () => {
  it('convierte el texto a una fecha local', () => {
    const f = aFecha('2026-09-10');
    expect(f.getFullYear()).toBe(2026);
    expect(f.getMonth()).toBe(8);
    expect(f.getDate()).toBe(10);
  });

  it('es la inversa de aTexto', () => {
    expect(aTexto(aFecha('2026-09-01'))).toBe('2026-09-01');
    expect(aTexto(aFecha('2026-01-31'))).toBe('2026-01-31');
  });

  it('devuelve undefined si no hay texto', () => {
    expect(aFecha('')).toBeUndefined();
    expect(aFecha(null)).toBeUndefined();
  });
});

describe('mostrarFecha', () => {
  it('muestra dia/mes/anio', () => {
    expect(mostrarFecha('2026-09-10')).toBe('10/09/2026');
  });

  it('devuelve vacio si no hay fecha', () => {
    expect(mostrarFecha('')).toBe('');
  });
});

describe('mostrarFechaLarga', () => {
  it('incluye el dia de la semana y el mes en palabras', () => {
    const texto = mostrarFechaLarga('2026-09-10');
    expect(texto.toLowerCase()).toContain('10');
    expect(texto.toLowerCase()).toMatch(/sep/);
  });

  it('devuelve vacio si no hay fecha', () => {
    expect(mostrarFechaLarga('')).toBe('');
  });
});
