import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Search, Trash2, CheckCircle, Clock, X, ShoppingCart, User } from 'lucide-react';

export function Orders({ products, orders, onAddOrder, onUpdateOrderStatus, onDeleteOrder, onCompleteOrderStock }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [formData, setFormData] = useState({
    customerName: '',
    deliveryDate: '',
    deliveryTime: '',
    phone: ''
  });
  
  const [cart, setCart] = useState([]);

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
    setFormData({
      customerName: '',
      deliveryDate: '',
      deliveryTime: '',
      phone: ''
    });
    setCart([]);
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

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Debes agregar al menos un producto al pedido");
      return;
    }

    const newOrder = {
      id: `PED-${Date.now().toString().slice(-6)}`,
      ...formData,
      items: cart,
      total: calculateTotal(),
      status: 'Pendiente', // Pendiente, Completado, Cancelado
      createdAt: new Date().toISOString()
    };

    onAddOrder(newOrder);
    setIsModalOpen(false);
  };

  const handleCompleteOrder = (order) => {
    if (window.confirm(`¿Marcar el pedido de ${order.customerName} como completado? Esto descontará el stock de los productos.`)) {
      onCompleteOrderStock(order.items);
      onUpdateOrderStatus(order.id, 'Completado');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Pedido
        </button>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders.length === 0 ? (
          <div className="col-span-full p-10 text-center text-gray-500 bg-white rounded-lg border border-gray-100 shadow-sm">
            <CalendarClock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">No hay pedidos registrados</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
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
                  <ul className="text-sm space-y-1 mb-4">
                    {order.items.map(item => (
                      <li key={item.id} className="flex justify-between text-gray-700">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="text-gray-500 text-xs">{(item.price * item.quantity).toLocaleString('es-CL', {style:'currency', currency:'CLP'})}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between items-center font-bold text-lg text-gray-800">
                    <span>Total:</span>
                    <span>{order.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</span>
                  </div>
                </div>
              </div>
              
              {/* Actions Footer */}
              <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
                {order.status === 'Pendiente' && (
                  <>
                    <button 
                      onClick={() => onUpdateOrderStatus(order.id, 'Cancelado')}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors tooltip"
                      title="Cancelar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleCompleteOrder(order)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors tooltip flex items-center gap-1"
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
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-blue-600" />
                Crear Nuevo Pedido
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Form Side */}
              <div className="w-full md:w-1/2 p-6 border-r border-gray-100 overflow-y-auto">
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
                  <div className="grid grid-cols-2 gap-4">
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
                </form>
              </div>

              {/* Cart Side */}
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
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-sm flex justify-between"
                          >
                            <span className="font-medium truncate mr-2">{product.name}</span>
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
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" 
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                          />
                          <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-gray-700">Total del Pedido:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {calculateTotal().toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </span>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      form="order-form"
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                    >
                      Guardar Pedido
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