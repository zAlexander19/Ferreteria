import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle } from 'lucide-react';

export function Sales({ products, onCompleteSale }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }
    const results = products.filter(p => 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      p.stock > 0
    );
    setSearchResults(results);
  }, [searchTerm, products]);

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        ));
      } else {
        alert("No hay suficiente stock disponible");
      }
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setSearchTerm(''); // Clear search after adding
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity > 0 && newQuantity <= product.stock) {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleFinalizeSale = () => {
    if (cart.length === 0) return;
    if (window.confirm(`¿Confirmar venta por total de $${total.toFixed(2)}?`)) {
      onCompleteSale(cart);
      setCart([]);
      alert("¡Venta realizada con éxito!");
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          Punto de Venta
        </h2>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar producto por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-lg"
          />
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-10 max-h-60 overflow-y-auto">
              {searchResults.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium text-gray-800">{product.name}</div>
                    <div className="text-xs text-gray-500">SKU: {product.id} | Stock: {product.stock}</div>
                  </div>
                  <div className="font-semibold text-blue-600">${product.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 font-medium text-gray-500 grid grid-cols-12 gap-4">
          <div className="col-span-6">Producto</div>
          <div className="col-span-2 text-center">Cantidad</div>
          <div className="col-span-2 text-right">Precio</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
                <div className="col-span-6">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.id}</div>
                </div>
                <div className="col-span-2 flex items-center justify-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="col-span-2 text-right text-gray-600">
                  ${item.price.toFixed(2)}
                </div>
                <div className="col-span-2 flex items-center justify-end gap-4">
                  <span className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl font-medium text-gray-600">Total a Pagar:</span>
            <span className="text-3xl font-bold text-blue-600">${total.toFixed(2)}</span>
          </div>
          <button
            onClick={handleFinalizeSale}
            disabled={cart.length === 0}
            className="w-full py-4 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-6 h-6" />
            Finalizar Venta
          </button>
        </div>
      </div>
    </div>
  );
}
