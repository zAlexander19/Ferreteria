import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// El mes se guarda siempre (1-12) aunque se esté mirando el año entero, así al
// volver a "Mes" se cae en el mismo mes que se estaba viendo antes.
export function FiltroPeriodo({ anio, mes, porAnio, onChange }) {
  const mover = paso => {
    if (porAnio) return onChange({ anio: anio + paso, mes, porAnio });

    // Contar en meses absolutos deja que diciembre → enero salte de año solo.
    const absoluto = anio * 12 + (mes - 1) + paso;
    onChange({ anio: Math.floor(absoluto / 12), mes: (absoluto % 12) + 1, porAnio });
  };

  const etiqueta = porAnio ? String(anio) : `${MESES[mes - 1]} ${anio}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => mover(-1)}
          className="px-2 py-2 text-gray-500 hover:bg-gray-50"
          title={porAnio ? 'Año anterior' : 'Mes anterior'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-2 text-sm font-medium text-gray-800 capitalize min-w-[9rem] text-center">
          {etiqueta}
        </span>
        <button
          type="button"
          onClick={() => mover(1)}
          className="px-2 py-2 text-gray-500 hover:bg-gray-50"
          title={porAnio ? 'Año siguiente' : 'Mes siguiente'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border border-gray-300 rounded-md overflow-hidden">
        {[['Mes', false], ['Año', true]].map(([texto, valor]) => (
          <button
            key={texto}
            type="button"
            onClick={() => onChange({ anio, mes, porAnio: valor })}
            className={`px-3 py-2 text-sm font-medium ${
              porAnio === valor ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  );
}
