import React, { useState, useEffect } from 'react';
import { InventoryTable } from './components/InventoryTable';
import { Sales } from './views/Sales';
import { Statistics } from './views/Statistics';
import { LayoutDashboard, ShoppingCart, BarChart3, Settings, LogOut, Package } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Inicializar estado desde LocalStorage si existe, si no, usar datos por defecto
  const [products, setProducts] = useState(() => {
    const savedProducts = localStorage.getItem('ferreteria_products');
    if (savedProducts) {
      return JSON.parse(savedProducts);
    }
    return [
    { 
      id: 'HER-001', 
      name: 'Martillo de Uña', 
      category: 'Herramientas', 
      stock: 15, 
      price: 12.50, 
      cost: 8.50,
      vendor: 'FerreTools SA',
      salesCount: 120,
      lastSaleDate: '2023-10-15',
      expirationDate: ''
    },
    { 
      id: 'ELE-042', 
      name: 'Cable Calibre 12', 
      category: 'Electricidad', 
      stock: 3, 
      price: 0.80, 
      cost: 0.50,
      vendor: 'CablesMex',
      salesCount: 500,
      lastSaleDate: '2023-10-20',
      expirationDate: ''
    },
    { 
      id: 'PLM-105', 
      name: 'Tubo PVC 1/2"', 
      category: 'Plomería', 
      stock: 50, 
      price: 3.20, 
      cost: 2.10,
      vendor: 'Plastifuerte',
      salesCount: 45,
      lastSaleDate: '2023-09-28',
      expirationDate: ''
    },
    { 
      id: 'CON-201', 
      name: 'Cemento Gris 50kg', 
      category: 'Construcción', 
      stock: 5, 
      price: 180.00, 
      cost: 140.00,
      vendor: 'Cemex',
      salesCount: 8,
      lastSaleDate: '2023-10-05',
      expirationDate: '2023-12-31'
    },
    { 
      id: 'PNT-305', 
      name: 'Sellador Vinílico 4L', 
      category: 'Pinturas', 
      stock: 2, 
      price: 350.50, 
      cost: 260.00,
      vendor: 'Comex',
      salesCount: 12,
      lastSaleDate: '2023-08-15',
      expirationDate: '2023-11-20'
    },
  ]});

  // Guardar en LocalStorage cada vez que cambien los productos
  useEffect(() => {
    localStorage.setItem('ferreteria_products', JSON.stringify(products));
  }, [products]);

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
    // Deduct stock and update sales stats
    const today = new Date().toISOString().split('T')[0];
    const updatedProducts = products.map(product => {
      const soldItem = cartItems.find(item => item.id === product.id);
      if (soldItem) {
        return { 
          ...product, 
          stock: product.stock - soldItem.quantity,
          salesCount: (product.salesCount || 0) + soldItem.quantity,
          lastSaleDate: today
        };
      }
      return product;
    });
    setProducts(updatedProducts);
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
             <h1 className="text-xl font-bold text-gray-800">Ferretería<br/><span className="text-sm font-normal text-gray-500">Gestión V1.0</span></h1>
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
             {activeTab === 'inventory' ? 'Panel de Inventario' : activeTab === 'sales' ? 'Nueva Venta' : 'Estadísticas y Reportes'}
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
          ) : (
            <Statistics products={products} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
