import React, { useState, useEffect } from 'react';
import { InventoryTable } from './components/InventoryTable';
import { Sales } from './views/Sales';
import { Statistics } from './views/Statistics';
import { Orders } from './views/Orders';
import { Production } from './views/Production';
import { LayoutDashboard, ShoppingCart, BarChart3, Settings, LogOut, Package, ClipboardList, Mail, KeyRound, Menu, X } from 'lucide-react';

const AUTH_EMAIL = 'masas@gmail.com';
const AUTH_PASSWORD = 'masasladueña2026';
const AUTH_SESSION_KEY = 'masas_auth_session';

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem(AUTH_SESSION_KEY) === '1');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
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

  const [productions, setProductions] = useState(() => {
    const savedProductions = localStorage.getItem('masas_productions');
    if (savedProductions) {
      return JSON.parse(savedProductions);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('masas_productions', JSON.stringify(productions));
  }, [productions]);

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
    const requiredUnitsByProduct = newOrder.items.reduce((acc, item) => {
      const unitsPerPackage = parseInt(item.unitsPerPackage) || 1;
      const unitsRequired = Number(item.quantity) * unitsPerPackage;
      acc[item.id] = (acc[item.id] || 0) + unitsRequired;
      return acc;
    }, {});

    const insufficientProducts = products.filter(product => {
      const required = requiredUnitsByProduct[product.id] || 0;
      return required > 0 && Number(product.stock || 0) < required;
    });

    if (insufficientProducts.length > 0) {
      const names = insufficientProducts.map(p => p.name).join(', ');
      return { ok: false, message: `Stock insuficiente para: ${names}` };
    }

    setProducts(prevProducts => prevProducts.map(product => ({
      ...product,
      stock: Number(product.stock || 0) - (requiredUnitsByProduct[product.id] || 0)
    })));

    const reservationBreakdown = Object.entries(requiredUnitsByProduct).map(([productId, unitsReserved]) => ({
      productId,
      unitsReserved
    }));

    setOrders(prevOrders => [...prevOrders, {
      ...newOrder,
      stockReserved: true,
      reservationBreakdown
    }]);

    return { ok: true };
  };

  const handleUpdateOrderStatus = (orderId, status) => {
    const orderToUpdate = orders.find(order => order.id === orderId);
    if (!orderToUpdate) return;

    // Al cancelar, liberar stock reservado para que vuelva al inventario.
    if (status === 'Cancelado' && orderToUpdate.stockReserved) {
      const releaseByProduct = (orderToUpdate.reservationBreakdown || []).reduce((acc, item) => {
        acc[item.productId] = (acc[item.productId] || 0) + Number(item.unitsReserved || 0);
        return acc;
      }, {});

      setProducts(prevProducts => prevProducts.map(product => ({
        ...product,
        stock: Number(product.stock || 0) + (releaseByProduct[product.id] || 0)
      })));
    }

    setOrders(prevOrders => prevOrders.map(order => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        status,
        stockReserved: status === 'Cancelado' ? false : order.stockReserved
      };
    }));
  };

  const handleDeleteOrder = (orderId) => {
    const orderToDelete = orders.find(order => order.id === orderId);

    if (orderToDelete?.stockReserved) {
      const releaseByProduct = (orderToDelete.reservationBreakdown || []).reduce((acc, item) => {
        acc[item.productId] = (acc[item.productId] || 0) + Number(item.unitsReserved || 0);
        return acc;
      }, {});

      setProducts(prevProducts => prevProducts.map(product => ({
        ...product,
        stock: Number(product.stock || 0) + (releaseByProduct[product.id] || 0)
      })));
    }

    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
  };

  const handleRegisterProduction = ({ operatorName, items, productId, quantityUnits, quantityBags, batches }) => {
    const normalizedItems = Array.isArray(items) && items.length > 0
      ? items
      : [{ productId, quantityUnits, quantityBags, batches }];

    const enrichedItems = normalizedItems.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return acc;

      const unitsPerPackage = parseInt(product.unitsPerPackage) || 1;
      const units = Number(item.quantityUnits) || (Number(item.quantityBags) * unitsPerPackage);
      const batchCount = Number(item.batches);
      if (!units || !batchCount) return acc;

      const totalUnitsAdded = units;

      acc.push({
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantityUnits: units,
        batches: batchCount,
        totalUnitsAdded
      });
      return acc;
    }, []);

    if (enrichedItems.length === 0) return;

    const unitsByProduct = enrichedItems.reduce((acc, item) => {
      acc[item.productId] = (acc[item.productId] || 0) + item.totalUnitsAdded;
      return acc;
    }, {});

    setProducts(prevProducts => prevProducts.map(p => ({
      ...p,
      stock: Number(p.stock || 0) + (unitsByProduct[p.id] || 0)
    })));

    const totalBatches = enrichedItems.reduce((sum, item) => sum + item.batches, 0);
    const totalUnitsAdded = enrichedItems.reduce((sum, item) => sum + item.totalUnitsAdded, 0);

    const newProduction = {
      id: `PROD-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      operatorName,
      items: enrichedItems,
      itemCount: enrichedItems.length,
      totalBatches,
      totalUnitsAdded
    };

    setProductions(prevProductions => [newProduction, ...prevProductions]);
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();

    const email = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;

    if (email === AUTH_EMAIL && password === AUTH_PASSWORD) {
      sessionStorage.setItem(AUTH_SESSION_KEY, '1');
      setIsAuthenticated(true);
      setLoginError('');
      return;
    }

    setLoginError('Credenciales incorrectas. Intenta nuevamente.');
  };

  const handleLogout = () => {
    if (!window.confirm('¿Cerrar sesión?')) return;
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setIsAuthenticated(false);
    setIsMobileNavOpen(false);
    setLoginForm({ email: '', password: '' });
    setLoginError('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto h-14 w-14 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Fabrica de Masas</h1>
            <p className="text-sm text-gray-500">Inicia sesion para acceder al sistema</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="masas@gmail.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="********"
                  required
                />
              </div>
            </div>

            {loginError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
            >
              Iniciar sesion
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50 overflow-hidden">
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 lg:static lg:w-64 lg:translate-x-0 ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 lg:p-6 border-b border-gray-100 shrink-0">
           <div className="flex items-center justify-between gap-3">
             <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
               <Package className="w-6 h-6 text-white" />
             </div>
             <h1 className="text-xl font-bold text-gray-800">Fábrica de Masas<br/><span className="text-sm font-normal text-gray-500">Gestión V1.0</span></h1>
             </div>
             <button
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Cerrar barra de tareas"
            >
              <X className="w-5 h-5" />
            </button>
           </div>
        </div>

        <nav className="flex-1 p-3 lg:p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => handleTabChange('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'inventory' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Inventario
          </button>
          
          <button
            onClick={() => handleTabChange('sales')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'sales' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            Punto de Venta
          </button>

          <button
            onClick={() => handleTabChange('orders')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'orders' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            Pedidos
          </button>

          <button
            onClick={() => handleTabChange('production')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'production' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-5 h-5" />
            Producción
          </button>

          <button
            onClick={() => handleTabChange('statistics')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'statistics' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Estadísticas
          </button>
        </nav>

        <div className="p-3 lg:p-4 border-t border-gray-100 space-y-2">
           <button className="w-full hidden lg:flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Settings className="w-5 h-5" />
            Configuración
          </button>
           <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-2.5 lg:py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center shadow-sm gap-3">
           <div className="flex items-center gap-3 min-w-0">
             <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              aria-label="Abrir barra de tareas"
            >
              <Menu className="w-4 h-4" />
              Menu
            </button>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 truncate">
              {activeTab === 'inventory' ? 'Panel de Inventario' : activeTab === 'sales' ? 'Nueva Venta' : activeTab === 'orders' ? 'Gestión de Pedidos' : activeTab === 'production' ? 'Registro de Producción' : 'Estadísticas y Reportes'}
            </h2>
           </div>
           <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <div className="text-sm font-medium text-gray-900">{AUTH_EMAIL}</div>
               <div className="text-xs text-gray-500">Dueña</div>
             </div>
               <div className="h-9 w-9 sm:h-10 sm:w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
              AD
            </div>
           </div>
        </header>

        {/* View Area */}
             <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
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
            />
          ) : activeTab === 'production' ? (
            <Production
              products={products}
              productions={productions}
              onRegisterProduction={handleRegisterProduction}
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
