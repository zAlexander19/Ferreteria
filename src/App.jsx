import React, { useState, useEffect } from 'react';
import { InventoryTable } from './components/InventoryTable';
import { Sales } from './views/Sales';
import { Statistics } from './views/Statistics';
import { Orders } from './views/Orders';
import { LayoutDashboard, ShoppingCart, BarChart3, Settings, LogOut, Package, ClipboardList } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Inicializar estado desde LocalStorage si existe, si no, usar datos por defecto
  const [products, setProducts] = useState(() => {
    const savedProducts = localStorage.getItem('masas_products');
    if (savedProducts) {
      return JSON.parse(savedProducts);
    }
    return [];
  });

  // Guardar en LocalStorage cada vez que cambien los productos
  useEffect(() => {
    localStorage.setItem('masas_products', JSON.stringify(products));
  }, [products]);

  const [orders, setOrders] = useState(() => {
    const savedOrders = localStorage.getItem('masas_orders');
    if (savedOrders) {
      return JSON.parse(savedOrders);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('masas_orders', JSON.stringify(orders));
  }, [orders]);

  const [sales, setSales] = useState(() => {
    const savedSales = localStorage.getItem('masas_sales');
    if (savedSales) {
      return JSON.parse(savedSales);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('masas_sales', JSON.stringify(sales));
  }, [sales]);

  const handleAddProduct = (newProduct) => {
    setProducts([...products, newProduct]);
  };

  const handleEditProduct = (updatedProduct) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleCompleteSale = (cartItems) => {
    // Deduct stock (in units) and update sales stats
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const updatedProducts = products.map(product => {
      const soldItem = cartItems.find(item => item.id === product.id);
      if (soldItem) {
        const unitsSold = soldItem.quantity * (parseInt(product.unitsPerPackage) || 1);
        return { 
          ...product, 
          stock: product.stock - unitsSold,
          salesCount: (product.salesCount || 0) + soldItem.quantity,
          lastSaleDate: today
        };
      }
      return product;
    });
    setProducts(updatedProducts);

    // Guardar la venta en el historial
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newSale = {
      id: `VEN-${Date.now().toString().slice(-6)}`,
      date: now.toISOString(),
      items: cartItems,
      total: total
    };
    setSales([...sales, newSale]);
  };

  const handleAddOrder = (newOrder) => {
    setOrders([...orders, newOrder]);
  };

  const handleUpdateOrderStatus = (orderId, status) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status } : order
    ));
  };

  const handleDeleteOrder = (orderId) => {
    setOrders(orders.filter(order => order.id !== orderId));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
           <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
               <Package className="w-6 h-6 text-white" />
             </div>
             <h1 className="text-xl font-bold text-gray-800">Fábrica de Masas<br/><span className="text-sm font-normal text-gray-500">Gestión V1.0</span></h1>
           </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'inventory' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Inventario
          </button>
          
          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'sales' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Punto de Venta
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'orders' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            Pedidos
          </button>

          <button
            onClick={() => setActiveTab('statistics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'statistics' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Estadísticas
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
           <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Settings className="w-5 h-5" />
            Configuración
          </button>
           <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
           <h2 className="text-2xl font-bold text-gray-800">
             {activeTab === 'inventory' ? 'Panel de Inventario' : activeTab === 'sales' ? 'Nueva Venta' : activeTab === 'orders' ? 'Gestión de Pedidos' : 'Estadísticas y Reportes'}
           </h2>
           <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <div className="text-sm font-medium text-gray-900">Admin User</div>
               <div className="text-xs text-gray-500">Gerente</div>
             </div>
             <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
              AD
            </div>
           </div>
        </header>

        {/* View Area */}
        <div className="flex-1 p-8 overflow-auto">
          {activeTab === 'inventory' ? (
            <InventoryTable 
              products={products} 
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          ) : activeTab === 'sales' ? (
            <Sales 
              products={products} 
              onCompleteSale={handleCompleteSale}
            />
          ) : activeTab === 'orders' ? (
            <Orders 
              products={products}
              orders={orders}
              onAddOrder={handleAddOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onDeleteOrder={handleDeleteOrder}
              onCompleteOrderStock={handleCompleteSale}
            />
          ) : (
            <Statistics products={products} sales={sales} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
