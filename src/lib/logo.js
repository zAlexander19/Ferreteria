// Donde buscar el logo de la empresa. Se prueban las extensiones mas
// habituales en orden para no obligar a un formato concreto: la duena copia el
// archivo a public/ y la app lo encuentra sea cual sea. Ver public/LEEME.txt.
//
// Vive en lib/ y no dentro de LogoEmpresa.jsx porque lo usan dos componentes
// (el logo de la barra lateral y la boleta), y exportar constantes desde un
// archivo de componente rompe el Fast Refresh de Vite.
export const CANDIDATOS = [
  '/logo_masas.png',
  '/logo_masas.jpg',
  '/logo_masas.jpeg',
  '/logo_masas.webp',
  '/logo_masas.svg',
];
