import { useState, useEffect, useMemo } from 'react';
import { CalendarClock, Plus, Search, Trash2, X, ShoppingCart, Pencil, Filter } from 'lucide-react';
import { faltantesPorProducto } from '../lib/inventory';
import { unidadesDeItem, unidadesTotales } from '../lib/pedidos';
import { OrderCard } from './OrderCard';

const ESTADOS_PAGO = ['Sin pagar', 'Abonado', 'Pagado'];

const FORM_VACIO = {
  customerName: '',
  deliveryDate: '',
  deliveryTime: '',
  phone: '',
  paymentStatus: 'Sin pagar',
  paidAmount: ''
};

const clp = valor => (Number(valor) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

export function Orders({ products, orders, onAddOrder, onEditOrder, onUpdateOrderStatus, onDeleteOrder }) {
  const faltantes = useMemo(() => faltantesPorProducto(products), [products]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [formData, setFormData] = useState(FORM_VACIO);
  const [cart, setCart] = useState([]);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // Las fechas se guardan como 'YYYY-MM-DD', así que comparar como texto
  // ordena igual que comparar como fecha, sin líos de zona horaria.
  const pedidosFiltrados = useMemo(() => {
    return orders.filter(order => {
      const fecha = order.deliveryDate || '';
      if (desde && (!fecha || fecha < desde)) return false;
      if (hasta && (!fecha || fecha > hasta)) return false;
      return true;
    });
  }, [orders, desde, hasta]);

  const hayFiltro = Boolean(desde || hasta);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }
    const results = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(results);
  }, [searchTerm, products]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(FORM_VACIO);
    setCart([]);
    setSearchTerm('');
    setIsModalOpen(true);
  };

  const openEditModal = (order) => {
    setEditingId(order.id);
    setFormData({
      customerName: order.customerName || '',
      deliveryDate: order.deliveryDate || '',
      deliveryTime: order.deliveryTime || '',
      phone: order.phone || '',
      paymentStatus: order.paymentStatus || 'Sin pagar',
      paidAmount: order.paidAmount ?? ''
    });
    setCart(order.items.map(item => ({ ...item })));
    setSearchTerm('');
    setIsModalOpen(true);
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setSearchTerm('');
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== productId));
      return;
    }
    setCart(cart.map(item =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const avisarFaltantes = (result) => {
    if (result.faltantes?.length > 0) {
      const detalle = result.faltantes
        .map(f => `${f.unitsShort} unidades de ${f.name}`)
        .join('\n');
      alert(`Pedido ${editingId ? 'actualizado' : 'agendado'}.\n\nFalta producir:\n${detalle}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Debes agregar al menos un producto al pedido');
      return;
    }

    const datosPago = {
      paymentStatus: formData.paymentStatus,
      paidAmount: formData.paymentStatus === 'Abonado' ? (Number(formData.paidAmount) || 0) : 0
    };

    if (editingId) {
      const result = onEditOrder({
        ...formData,
        ...datosPago,
        id: editingId,
        items: cart,
        total: calculateTotal()
      });
      if (!result?.ok) {
        alert(result?.message || 'No se pudo actualizar el pedido.');
        return;
      }
      avisarFaltantes(result);
    } else {
      const result = onAddOrder({
        id: `PED-${Date.now().toString().slice(-6)}`,
        ...formData,
        ...datosPago,
        items: cart,
        total: calculateTotal(),
        status: 'Pendiente',
        createdAt: new Date().toISOString()
      });
      if (!result?.ok) {
        alert(result?.message || 'No se pudo crear el pedido.');
        return;
      }
      avisarFaltantes(result);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full gap-4 sm:gap-6">
      {/* Controles */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pedido
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 text-sm text-gray-600 sm:hidden">
            <Filter className="w-4 h-4" /> Filtrar por fecha de entrega
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {hayFiltro && (
            <button
              onClick={() => { setDesde(''); setHasta(''); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      </div>

      {hayFiltro && (
        <div className="text-sm text-gray-600 -mt-2">
          Mostrando <span className="font-semibold">{pedidosFiltrados.length}</span> de {orders.length} pedidos
        </div>
      )}

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {pedidosFiltrados.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white rounded-lg border border-gray-100 shadow-sm">
            <CalendarClock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">
              {orders.length === 0
                ? 'No hay pedidos registrados'
                : 'No hay pedidos para esas fechas'}
            </p>
          </div>
        ) : (
          pedidosFiltrados.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              faltantes={faltantes}
              onEdit={openEditModal}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onDeleteOrder={onDeleteOrder}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                {editingId ? <Pencil className="w-5 h-5 text-blue-600" /> : <CalendarClock className="w-5 h-5 text-blue-600" />}
                {editingId ? `Editar pedido ${editingId}` : 'Crear Nuevo Pedido'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Datos */}
              <div className="w-full md:w-1/2 p-4 sm:p-6 border-r border-gray-100 overflow-y-auto">
                <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente</label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (Opcional)</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Entrega</label>
                      <input
                        type="date"
                        name="deliveryDate"
                        value={formData.deliveryDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora de Entrega</label>
                      <input
                        type="time"
                        name="deliveryTime"
                        value={formData.deliveryTime}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado del pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ESTADOS_PAGO.map(estado => (
                        <button
                          key={estado}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, paymentStatus: estado }))}
                          className={`px-2 py-2 rounded-md text-sm font-medium border transition-colors ${
                            formData.paymentStatus === estado
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {estado}
                        </button>
                      ))}
                    </div>

                    {formData.paymentStatus === 'Abonado' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuánto abonó?</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            name="paidAmount"
                            min="0"
                            value={formData.paidAmount}
                            onChange={handleInputChange}
                            className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Falta cobrar: {clp(Math.max(0, calculateTotal() - (Number(formData.paidAmount) || 0)))}
                        </p>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Carrito */}
              <div className="w-full md:w-1/2 flex flex-col bg-gray-50 h-full overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Agregar Productos (Bolsas)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar para añadir..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-20 max-h-48 overflow-y-auto">
                        {searchResults.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addToCart(product)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-sm flex justify-between gap-2"
                          >
                            <span className="min-w-0">
                              <span className="font-medium block truncate">{product.name}</span>
                              <span className="text-xs text-gray-500">
                                {parseInt(product.unitsPerPackage) || 1} unidades por bolsa
                              </span>
                            </span>
                            <span className="text-blue-600 font-bold flex-shrink-0">${product.price}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <ShoppingCart className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-sm">No hay productos en el pedido</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-medium text-sm text-gray-900 truncate" title={item.name}>{item.name}</div>
                          <div className="text-blue-600 text-xs font-semibold">${item.price} c/u</div>
                          <div className="text-xs text-gray-600 font-medium">
                            {item.quantity} {item.quantity === 1 ? 'bolsa' : 'bolsas'} = {unidadesDeItem(item)} unidades
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                          />
                          <button type="button" onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                  {cart.length > 0 && (
                    <div className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 mb-3 border border-gray-100">
                      En total: <span className="font-semibold">{cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'bolsa' : 'bolsas'}</span>
                      {' · '}
                      <span className="font-semibold">{unidadesTotales(cart)} unidades</span> de masa
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                    <span className="font-bold text-gray-700">Total del Pedido:</span>
                    <span className="text-xl font-bold text-blue-600 break-all">{clp(calculateTotal())}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      form="order-form"
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                    >
                      {editingId ? 'Guardar cambios' : 'Guardar Pedido'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
