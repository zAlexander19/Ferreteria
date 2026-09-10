import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { aTexto, aFecha, mostrarFechaLarga } from '../lib/fechas';
import { usePopover } from './usePopover';
import 'react-day-picker/style.css';

export function SelectorFecha({ value, onChange, label = 'Fecha de Entrega' }) {
  const { abierto, setAbierto, disparador, panel, posicion } = usePopover();

  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);

  const elegir = fecha => {
    if (!fecha) return;
    onChange(aTexto(fecha));
    setAbierto(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        ref={disparador}
        type="button"
        onClick={() => setAbierto(a => !a)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-md text-left bg-white transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          value ? 'border-gray-300 text-gray-900' : 'border-gray-300 text-gray-400'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="truncate capitalize">
            {value ? mostrarFechaLarga(value) : 'Elegir fecha'}
          </span>
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {abierto && createPortal(
        <div
          ref={panel}
          style={{ position: 'fixed', top: posicion.top, left: posicion.left }}
          className="z-[60] bg-white border border-gray-200 rounded-lg shadow-xl p-3"
        >
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => elegir(hoy)}
              className="px-3 py-1 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => elegir(manana)}
              className="px-3 py-1 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
            >
              Mañana
            </button>
          </div>
          <DayPicker
            mode="single"
            locale={es}
            selected={aFecha(value)}
            onSelect={elegir}
            weekStartsOn={1}
            styles={{ root: { margin: 0 } }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
