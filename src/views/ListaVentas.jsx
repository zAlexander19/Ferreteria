import { ShoppingCart, Store, ClipboardList, X } from 'lucide-react';
import { mostrarFecha } from '../lib/fechas';
import { PUNTO_DE_VENTA } from '../lib/ventas';

const clp = v => (Number(v) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

function EtiquetaOrigen({ origen }) {
  const esMostrador = origen === PUNTO_DE_VENTA;
  const Icono = esMostrador ? Store : ClipboardList;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
      esMostrador
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-purple-100 text-purple-800 border-purple-200'
    }`}>
      <Icono className="w-3 h-3" />
      {esMostrador ? 'Mostrador' : 'Pedido'}
    </span>
  );
}

// En celular cada venta es una tarjeta apilada; desde `md` vuelve a ser tabla.
export function ListaVentas({ ventas }) {
  if (ventas.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500 bg-gray-50 rounded-md">
        No hay ventas registradas para este filtro.
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {ventas.map(v => (
          <li key={v.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-start gap-2 mb-1">
              <EtiquetaOrigen origen={v.origen} />
              <span className="font-bold text-gray-900 whitespace-nowrap">{clp(v.total)}</span>
            </div>
            <div className="text-sm text-gray-700">
              {mostrarFecha(v.fecha)} {v.hora && `· ${v.hora}`}
              {v.cliente && <span className="font-medium"> · {v.cliente}</span>}
            </div>
            <ul className="text-xs text-gray-500 mt-1">
              {v.items.map((item, i) => (
                <li key={`${v.id}-${item.id}-${i}`}>{item.quantity}x {item.name}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Origen</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Productos</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ventas.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap align-top">
                  <div className="font-medium text-gray-800">{mostrarFecha(v.fecha)}</div>
                  <div className="text-xs text-gray-500">{v.hora}</div>
                </td>
                <td className="px-4 py-3 align-top"><EtiquetaOrigen origen={v.origen} /></td>
                <td className="px-4 py-3 align-top text-gray-700">{v.cliente || '—'}</td>
                <td className="px-4 py-3 align-top text-gray-700">
                  <ul>
                    {v.items.map((item, i) => (
                      <li key={`${v.id}-${item.id}-${i}`}>{item.quantity}x {item.name}</li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3 text-right align-top font-semibold text-gray-800 whitespace-nowrap">
                  {clp(v.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ModalVentas({ ventas, total, onClose, filtro }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2 min-w-0">
            <ShoppingCart className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="truncate">Todas las ventas</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0" title="Cerrar">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          {filtro}
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{ventas.length}</span> ventas ·{' '}
            <span className="font-bold text-blue-700">{clp(total)}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <ListaVentas ventas={ventas} />
        </div>
      </div>
    </div>
  );
}
