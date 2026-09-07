const LISTAS = ['products', 'orders', 'sales', 'productions'];

export function tieneDatos(payload) {
  return LISTAS.some(k => Array.isArray(payload?.[k]) && payload[k].length > 0);
}

// 'nube'  -> hay que adoptar lo remoto
// 'local' -> hay que conservar lo local y subirlo
export function decidirOrigen(payloadNube, estadoLocal) {
  if (tieneDatos(payloadNube)) return 'nube';
  if (tieneDatos(estadoLocal)) return 'local';
  return 'nube';
}
