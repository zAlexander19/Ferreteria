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
      <div className={`${caja} bg-masa-naranja rounded-full flex items-center justify-center shrink-0 shadow-vidrio`}>
        <Package className={`${icono} text-white`} />
      </div>
    );
  }

  return (
    <div className={`${caja} bg-white/80 rounded-full border border-white/80 flex items-center justify-center overflow-hidden shrink-0 shadow-vidrio`}>
      <img
        src={CANDIDATOS[intento]}
        alt="Fábrica de Masas"
        onError={() => setIntento(n => n + 1)}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}
