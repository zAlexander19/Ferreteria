import { CalendarClock, Trash2, CheckCircle, Clock, X, User, AlertTriangle, Pencil } from 'lucide-react';
import { EtiquetasProducto } from './EtiquetasProducto';
import { unidadesDeItem, unidadesTotales, saldoPendiente } from '../lib/pedidos';

const clp = valor => (Number(valor) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

const ESTILO_PAGO = {
  'Pagado': 'bg-green-100 text-green-800 border border-green-200',
  'Abonado': 'bg-amber-100 text-amber-800 border border-amber-200',
  'Sin pagar': 'bg-red-100 text-red-800 border border-red-200',
};

export function OrderCard({ order, faltantes, onEdit, onUpdateOrderStatus, onDeleteOrder }) {
  const isReleased = order.status === 'Cancelado' || order.stockReserved === false;

  // Faltante en vivo contra el stock de hoy: si el pedido sigue pendiente y
  // alguno de sus productos está en negativo, todavía hay que producirlo. Al
  // registrar producción se apaga solo.
  const faltantesDelPedido = isReleased
    ? []
    : faltantes.filter(f => order.items.some(item => item.id === f.id));

  // Los pedidos creados antes de que existiera el campo cuentan como sin pagar.
  const estadoPago = order.paymentStatus || 'Sin pagar';
  const saldo = saldoPendiente(order);

  const handleComplete = () => {
    if (window.confirm(`¿Marcar el pedido de ${order.customerName} como completado?`)) {
      onUpdateOrderStatus(order.id, 'Completado');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
          isReleased
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            : 'bg-amber-100 text-amber-800 border border-amber-200'
        }`}>
          {isReleased ? 'Stock liberado' : 'Stock reservado'}
        </span>

        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${ESTILO_PAGO[estadoPago]}`}>
          {estadoPago}
        </span>

        {faltantesDelPedido.length > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200"
            title={faltantesDelPedido.map(f => `${f.unitsShort} unidades de ${f.name}`).join('\n')}
          >
            <AlertTriangle className="w-3 h-3" />
            Falta producir
          </span>
        )}
      </div>

      <div className={`px-4 py-3 border-b flex justify-between items-center ${
        order.status === 'Completado' ? 'bg-green-50' :
        order.status === 'Cancelado' ? 'bg-red-50' : 'bg-blue-50'
      }`}>
        <div className="font-bold text-gray-800">{order.id}</div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          order.status === 'Completado' ? 'bg-green-200 text-green-800' :
          order.status === 'Cancelado' ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800'
        }`}>
          {order.status}
        </span>
      </div>

      <div className="p-4 flex-1">
        <div className="flex items-center gap-2 text-gray-700 mb-2 font-medium">
          <User className="w-4 h-4 text-gray-400" />
          {order.customerName} {order.phone && `- ${order.phone}`}
        </div>
        <div className="flex items-center gap-2 text-gray-600 mb-1 text-sm">
          <CalendarClock className="w-4 h-4 text-gray-400" />
          Fecha: {order.deliveryDate || 'No especificada'}
        </div>
        <div className="flex items-center gap-2 text-gray-600 mb-4 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          Hora: {order.deliveryTime || 'No especificada'}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Productos:</p>
          <ul className="text-sm space-y-2 mb-4">
            {order.items.map(item => {
              const falta = order.status === 'Cancelado'
                ? null
                : faltantes.find(f => f.id === item.id);

              return (
                <li key={item.id} className="text-gray-700">
                  <div className="flex justify-between items-start gap-2">
                    <EtiquetasProducto product={item} />
                    <span className="text-gray-500 text-xs whitespace-nowrap">{clp(item.price * item.quantity)}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    <span className="font-semibold">{item.quantity}</span>
                    {' '}{item.quantity === 1 ? 'bolsa' : 'bolsas'} = {unidadesDeItem(item)} unidades
                  </div>
                  {falta && (
                    <div className="text-xs text-orange-700 font-medium">
                      Faltan {falta.unitsShort} unidades por producir
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-2 mb-3 border border-gray-100">
            Total del pedido: <span className="font-semibold">{unidadesTotales(order.items)} unidades</span> de masa
          </div>

          <div className="flex justify-between items-center font-bold text-lg text-gray-800">
            <span>Total:</span>
            <span>{clp(order.total)}</span>
          </div>

          {estadoPago === 'Abonado' && (
            <div className="text-sm text-amber-800 mt-1 text-right">
              Abonó {clp(order.paidAmount)} · Falta {clp(saldo)}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
        {order.status === 'Pendiente' && (
          <>
            <button
              onClick={() => onEdit(order)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Editar pedido"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={() => onUpdateOrderStatus(order.id, 'Cancelado')}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Cancelar"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={handleComplete}
              className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors flex items-center gap-1"
              title="Marcar como Completado"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Entregar</span>
            </button>
          </>
        )}
        <button
          onClick={() => {
            if (window.confirm('¿Eliminar pedido permanentemente?')) onDeleteOrder(order.id);
          }}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-auto"
          title="Eliminar"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
