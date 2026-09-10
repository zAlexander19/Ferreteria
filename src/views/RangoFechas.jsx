import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { CalendarRange, X } from 'lucide-react';
import 'react-day-picker/style.css';

// Las fechas de los pedidos se guardan como 'YYYY-MM-DD'. Se convierte a mano
// y no con toISOString(), que pasa por UTC y en Chile devuelve el día anterior.
const aTexto = fecha => {
  if (!fecha) return '';
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const aFecha = texto => {
  if (!texto) return undefined;
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
};

const mostrar = texto => {
  if (!texto) return '';
  const [a, m, d] = texto.split('-');
  return `${d}/${m}/${a}`;
};

export function RangoFechas({ desde, hasta, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);

  // Cerrar al hacer clic afuera: si no, el calendario queda tapando la lista.
  useEffect(() => {
    if (!abierto) return;
    const alClic = e => {
      if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener('mousedown', alClic);
    return () => document.removeEventListener('mousedown', alClic);
  }, [abierto]);

  const rango = { from: aFecha(desde), to: aFecha(hasta) };
  const hayRango = Boolean(desde || hasta);

  const etiqueta = !hayRango
    ? 'Filtrar por fecha'
    : desde && hasta
      ? `${mostrar(desde)} — ${mostrar(hasta)}`
      : desde
        ? `Desde ${mostrar(desde)}`
        : `Hasta ${mostrar(hasta)}`;

  return (
    <div className="relative" ref={contenedor}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setAbierto(a => !a)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
            hayRango
              ? 'bg-blue-50 border-blue-300 text-blue-800'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          {etiqueta}
        </button>
        {hayRango && (
          <button
            type="button"
            onClick={() => { onChange({ desde: '', hasta: '' }); setAbierto(false); }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
            title="Quitar filtro de fecha"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {abierto && (
        <div className="absolute right-0 z-30 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3">
          <p className="text-xs text-gray-500 mb-2 px-1">
            Tocá el primer día y después el último. El período queda marcado.
          </p>
          <DayPicker
            mode="range"
            locale={es}
            selected={rango}
            onSelect={r => onChange({ desde: aTexto(r?.from), hasta: aTexto(r?.to) })}
            weekStartsOn={1}
            styles={{ root: { margin: 0 } }}
          />
          <div className="flex justify-between items-center gap-2 pt-2 border-t border-gray-100 mt-2">
            <button
              type="button"
              onClick={() => onChange({ desde: '', hasta: '' })}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
