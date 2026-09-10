import { createPortal } from 'react-dom';
import { Clock, ChevronDown } from 'lucide-react';
import { usePopover } from './usePopover';

// Horas de media en media, de 7 a 21. Cubre la jornada de la fábrica sin
// obligarla a escribir; para cualquier otra hora está el campo de abajo.
const HORAS = Array.from({ length: 29 }, (_, i) => {
  const minutosTotales = 7 * 60 + i * 30;
  const h = String(Math.floor(minutosTotales / 60)).padStart(2, '0');
  const m = String(minutosTotales % 60).padStart(2, '0');
  return `${h}:${m}`;
});

export function SelectorHora({ value, onChange, label = 'Hora de Entrega' }) {
  const { abierto, setAbierto, disparador, panel, posicion } = usePopover();

  const elegir = hora => {
    onChange(hora);
    setAbierto(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        ref={disparador}
        type="button"
        onClick={() => setAbierto(a => !a)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-md text-left bg-white transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          value ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        <span className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          {value ? `${value} hs` : 'Elegir hora'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {abierto && createPortal(
        <div
          ref={panel}
          style={{ position: 'fixed', top: posicion.top, left: posicion.left }}
          className="z-[60] w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-3"
        >
          <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto">
            {HORAS.map(h => (
              <button
                key={h}
                type="button"
                onClick={() => elegir(h)}
                className={`px-2 py-1.5 text-sm rounded-md border transition-colors ${
                  value === h
                    ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                {h}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-600 mb-1">Otra hora</label>
            <input
              type="time"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
