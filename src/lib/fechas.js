// Conversión entre el texto 'YYYY-MM-DD' que guardan los pedidos y los objetos
// Date que usa el calendario.
//
// Deliberadamente NO se usa toISOString(): esa función convierte a UTC, y en
// Chile (UTC-3/-4) un 1 de mes a medianoche se convierte en el último día del
// mes anterior. Todo se arma y se lee en hora local.

export function aTexto(fecha) {
  if (!fecha) return '';
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function aFecha(texto) {
  if (!texto) return undefined;
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function mostrarFecha(texto) {
  if (!texto) return '';
  const [anio, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function mostrarFechaLarga(texto) {
  const fecha = aFecha(texto);
  if (!fecha) return '';
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(fecha);
}
