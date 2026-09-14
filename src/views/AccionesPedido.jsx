import { Receipt, Wallet, Pencil, X, CheckCircle, Trash2 } from 'lucide-react';

// Los botones de accion de un pedido, compartidos por la tarjeta y por la fila
// de la tabla.
//
// Viven en un solo lugar a proposito: mientras estuvieron escritos dentro de
// OrderCard, la vista de lista no tenia ninguna accion, y cada vez que se
// agrega una (Cobrar, Boleta) habria que acordarse de copiarla al otro lado.
// Eso es justo lo que se olvida.
//
// `compacto` deja solo los iconos, que es lo que entra en una celda de tabla.
export function AccionesPedido({
  order,
  compacto = false,
  onEdit,
  onUpdateOrderStatus,
  onDeleteOrder,
  onCobrar,
  onVerBoleta,
}) {
  const confirmarEntrega = () => {
    if (window.confirm(`¿Marcar el pedido de ${order.customerName} como completado?`)) {
      onUpdateOrderStatus(order.id, 'Completado');
    }
  };

  const confirmarBorrado = () => {
    if (window.confirm('¿Eliminar pedido permanentemente?')) onDeleteOrder(order.id);
  };

  const etiqueta = texto => (compacto ? null : <span className="text-sm font-medium">{texto}</span>);
  const base = 'p-2 rounded-xl transition-colors flex items-center gap-1';

  return (
    <>
      {/* Un pedido cancelado no tiene comprobante que mandarle a nadie, y
          tampoco hay nada que cobrarle. */}
      {order.status !== 'Cancelado' && (
        <>
          <button
            onClick={() => onVerBoleta(order)}
            className={`${base} text-masa-carbon/70 hover:bg-white/80`}
            title="Generar el comprobante para el cliente"
          >
            <Receipt className="w-5 h-5" />
            {etiqueta('Boleta')}
          </button>

          {/* El cobro es independiente de la entrega: un pedido entregado
              puede seguir sin pagarse. */}
          <button
            onClick={() => onCobrar(order)}
            className={`${base} text-masa-tostado hover:bg-masa-amarillo/25`}
            title="Cambiar estado de pago"
          >
            <Wallet className="w-5 h-5" />
            {etiqueta('Cobrar')}
          </button>
        </>
      )}

      {order.status === 'Pendiente' && (
        <>
          <button
            onClick={() => onEdit(order)}
            className={`${base} text-blue-600 hover:bg-blue-50`}
            title="Editar pedido"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => onUpdateOrderStatus(order.id, 'Cancelado')}
            className={`${base} text-red-600 hover:bg-red-50`}
            title="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={confirmarEntrega}
            className={`${base} text-green-600 hover:bg-green-50`}
            title="Marcar como Completado"
          >
            <CheckCircle className="w-5 h-5" />
            {etiqueta('Entregar')}
          </button>
        </>
      )}

      <button
        onClick={confirmarBorrado}
        className={`${base} text-gray-400 hover:text-red-600 hover:bg-red-50 ${compacto ? '' : 'ml-auto'}`}
        title="Eliminar"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </>
  );
}
