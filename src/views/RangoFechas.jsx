import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { CalendarRange, X } from 'lucide-react';
import { aTexto, aFecha, mostrarFecha } from '../lib/fechas';
import { usePopover } from './usePopover';
import 'react-day-picker/style.css';

export function RangoFechas({ desde, hasta, onChange }) {
  const { abierto, setAbierto, disparador, panel, posicion } = usePopover();

  const rango = { from: aFecha(desde), to: aFecha(hasta) };
  const hayRango = Boolean(desde || hasta);

  const etiqueta = !hayRango
    ? 'Filtrar por fecha'
    : desde && hasta
      ? `${mostrarFecha(desde)} — ${mostrarFecha(hasta)}`
      : desde
        ? `Desde ${mostrarFecha(desde)}`
        : `Hasta ${mostrarFecha(hasta)}`;

  return (
    <div className="flex items-center gap-1">
      <button
        ref={disparador}
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

      {abierto && createPortal(
        <div
          ref={panel}
          style={{ position: 'fixed', top: posicion.top, left: posicion.left }}
          className="z-[60] bg-white border border-gray-200 rounded-lg shadow-xl p-3"
        >
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
        </div>,
        document.body
      )}
    </div>
  );
}
