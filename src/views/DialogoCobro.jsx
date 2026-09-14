import { useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { normalizarCobro, saldoPendiente } from '../lib/pedidos';

const ESTADOS_PAGO = ['Sin pagar', 'Abonado', 'Pagado'];

const clp = valor => (Number(valor) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

// Cambiar SOLO el estado de pago de un pedido, sin pasar por el modal de
// edicion completo.
//
// El modal grande recalcula reservas de stock al guardar, asi que abrirlo
// sobre un pedido ya entregado volveria a apartar mercaderia que ya salio por
// la puerta. Por eso los completados no tenian como cobrarse: la unica via
// para tocar el pago era justamente la que no se podia usar. Este dialogo
// escribe dos campos y nada mas.
export function DialogoCobro({ order, onGuardar, onCerrar }) {
  const [estado, setEstado] = useState(order.paymentStatus || 'Sin pagar');
  const [monto, setMonto] = useState(
    order.paymentStatus === 'Abonado' ? String(order.paidAmount ?? '') : ''
  );
  const [error, setError] = useState('');

  const total = Number(order.total) || 0;
  const faltaActual = saldoPendiente(order);

  const elegirEstado = (nuevo) => {
    setEstado(nuevo);
    setError('');
  };

  const handleGuardar = () => {
    const resultado = normalizarCobro({ paymentStatus: estado, paidAmount: monto }, total);

    if (!resultado.ok) {
      setError(resultado.message);
      return;
    }

    onGuardar({
      paymentStatus: resultado.paymentStatus,
      paidAmount: resultado.paidAmount
    });
  };

  return (
    <div
      className="fixed inset-0 bg-masa-carbon/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <div
        className="glass-solido rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/60 glass-panel">
          <h3 className="font-bold text-masa-carbon flex items-center gap-2">
            <Wallet className="w-5 h-5 text-masa-tostado" />
            Cobro
          </h3>
          <button
            onClick={onCerrar}
            className="p-1 text-masa-carbon/50 hover:text-masa-carbon rounded-lg transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <div className="font-medium text-masa-carbon">{order.customerName}</div>
            <div className="text-sm text-masa-carbon/60">
              {order.id} · Total {clp(total)}
            </div>
            {faltaActual > 0 && (
              <div className="text-sm text-amber-800 mt-1">
                Hoy falta cobrar {clp(faltaActual)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {ESTADOS_PAGO.map(opcion => (
              <button
                key={opcion}
                type="button"
                onClick={() => elegirEstado(opcion)}
                className={`px-2 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  estado === opcion
                    ? 'bg-masa-naranja text-white border-masa-naranja shadow-sm'
                    : 'bg-white/60 text-masa-carbon/80 border-white/80 hover:bg-white/90'
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>

          {estado === 'Abonado' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-masa-carbon/80 mb-1">
                ¿Cuánto abonó?
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-masa-carbon/50 text-sm">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  autoFocus
                  value={monto}
                  onChange={e => { setMonto(e.target.value); setError(''); }}
                  className="w-full pl-7 px-3 py-2 campo"
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-masa-carbon/60 mt-1">
                Falta cobrar: {clp(Math.max(0, total - (Number(monto) || 0)))}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-500/10 border border-red-600/20 rounded-xl px-3 py-2 mt-4">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end mt-5">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 border border-white/80 bg-white/60 text-masa-carbon/80 font-medium rounded-xl hover:bg-white/90 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              className="px-4 py-2 bg-masa-naranja text-white font-semibold rounded-xl shadow-vidrio hover:bg-masa-tostado transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
