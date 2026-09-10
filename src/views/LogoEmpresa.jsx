import { useState } from 'react';
import { Package } from 'lucide-react';

// El logo se busca en la carpeta public/ del proyecto. Se prueban las
// extensiones más habituales para no obligar a un formato concreto, y si no
// hay ninguna se muestra el ícono de siempre: así la app funciona igual antes
// y después de copiar el archivo.
const CANDIDATOS = [
  '/logo_masas.png',
  '/logo_masas.jpg',
  '/logo_masas.jpeg',
  '/logo_masas.webp',
  '/logo_masas.svg',
];

export function LogoEmpresa({ size = 'md' }) {
  const [intento, setIntento] = useState(0);

  const caja = size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  const icono = size === 'lg' ? 'w-7 h-7' : 'w-6 h-6';

  if (intento >= CANDIDATOS.length) {
    return (
      <div className={`${caja} bg-blue-600 rounded-xl flex items-center justify-center shrink-0`}>
        <Package className={`${icono} text-white`} />
      </div>
    );
  }

  return (
    <div className={`${caja} bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shrink-0`}>
      <img
        src={CANDIDATOS[intento]}
        alt="Fábrica de Masas"
        onError={() => setIntento(n => n + 1)}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
