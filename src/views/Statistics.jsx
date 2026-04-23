import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ReferenceLine } from 'recharts';
import { AlertTriangle, Calendar, TrendingUp, TrendingDown, Clock, DollarSign, Wallet, ShoppingCart, Filter, Package } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function Statistics({ products, sales = [] }) {
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  }, [products]);

  const filteredSales = useMemo(() => {
    let result = [...sales];
    if (dateFilter) {
      result = result.filter(s => s.date.startsWith(dateFilter));
    }
    if (categoryFilter) {
      result = result.filter(s => s.items.some(item => item.category === categoryFilter));
    }
    return result.reverse(); // Más recientes primero
  }, [sales, dateFilter, categoryFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const lowStock = products.filter(p => p.stock < 5);
    
    // Vencimiento en próximos 30 días
    const expiringSoon = products.filter(p => {
      if (!p.expirationDate) return false;
      const expDate = new Date(p.expirationDate);
      const diffTime = expDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays >= 0 && diffDays <= 30;
    });

    // Best Sellers calculation for chart/list
    const sortedBySales = [...products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    const bestSellers = sortedBySales.slice(0, 10).filter(p => (p.salesCount || 0) > 0);

    // Single Products for Cards
    const topProduct = sortedBySales.length > 0 && (sortedBySales[0].salesCount || 0) > 0 ? sortedBySales[0] : null;
    const worstProduct = sortedBySales.length > 0 ? sortedBySales[sortedBySales.length - 1] : null;

    // Baja Rotación (No vendidos en 60 días)
    const lowRotation = products.filter(p => {
      if (!p.lastSaleDate) return true; // Nunca vendido
      const lastSale = new Date(p.lastSaleDate);
      const diffTime = now - lastSale;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 60;
    });

    const lowestStockProduct = [...products].sort((a, b) => a.stock - b.stock)[0] || null;

    const stockChartData = products.map(p => ({
      name: p.name,
      stock: p.stock,
      minStock: p.minStock || 5,
      shortName: p.id // Usa ID o nombre corto para que cuadre en la gráfica
    }));

    // Categorías
    const categoryData = products.reduce((acc, curr) => {
      const existing = acc.find(c => c.name === curr.category);
      if (existing) {
        existing.value += (curr.salesCount || 0);
      } else {
        acc.push({ name: curr.category, value: (curr.salesCount || 0) });
      }
      return acc;
    }, []).filter(c => c.value > 0);

    // Finance
    const totalInvestment = products.reduce((acc, curr) => acc + (curr.stock * (curr.cost || 0)), 0);
    const totalProfit = products.reduce((acc, curr) => {
        const cost = curr.cost || 0;
        const price = curr.price || 0;
        return acc + ((curr.salesCount || 0) * (price - cost));
    }, 0);

    // History Calculation (Investment vs Profit)
    const historyMap = products.reduce((acc, curr) => {
      if (!curr.lastSaleDate) return acc;
      const date = curr.lastSaleDate;
      const salesCount = curr.salesCount || 0;
      const price = curr.price || 0;
      const cost = curr.cost || 0;

      const profit = salesCount * (price - cost);
      const investment = salesCount * cost;
      
      if (!acc[date]) {
        acc[date] = { profit: 0, investment: 0 };
      }
      acc[date].profit += profit;
      acc[date].investment += investment;

      return acc;
    }, {});

    const chartData = Object.keys(historyMap)
      .sort()
      .map(date => ({
        date: date,
        profit: Math.round(historyMap[date].profit),
        investment: Math.round(historyMap[date].investment)
      }));

    return { lowStock, expiringSoon, bestSellers, lowRotation, categoryData, topProduct, worstProduct, totalInvestment, totalProfit, chartData, lowestStockProduct, stockChartData };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Tabla de Ventas Realizadas */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Ventas Realizadas
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              title="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              title="Filtrar por fecha"
            />
            
            {(dateFilter || categoryFilter) && (
              <button 
                onClick={() => { setDateFilter(''); setCategoryFilter(''); }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Venta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos Vendidos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500 bg-gray-50">
                    No hay ventas registradas para este filtro.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.id}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sale.date).toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      <ul className="list-disc list-inside">
                        {sale.items.map((item, idx) => (
                          <li key={idx}>
                            {item.quantity}x {item.name || item.id}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-800">
                      {sale.total.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm font-medium text-gray-600">
           <span>Total de ventas mostradas: {filteredSales.length}</span>
           <span className="text-lg text-blue-700">
             Total Recaudado: {filteredSales.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
           </span>
        </div>
      </div>

      {/* Contenedor principal para Estadísticas Superiores */}
      <div className="flex flex-col gap-6 mb-6">
        {/* Gráfico de Barras de Stock (Ancho de todo el dashboard) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-blue-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Estado de Inventario</h3>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <div className="h-64 w-full">
            {stats.stockChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.stockChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value, name, props) => {
                      const limit = props.payload.minStock;
                      return [`${value} unid. (Aviso: < ${limit})`, 'Stock Actual'];
                    }} 
                  />
                  <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                    {stats.stockChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.stock <= entry.minStock ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Agrega inventario para ver el gráfico
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Ventas por Categoría</h3>
          <div className="h-64 w-full">
            {stats.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No hay datos de ventas suficientes
              </div>
            )}
          </div>
        </div>

        {/* Profit Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Análisis Financiero (Ventas)</h3>
          <div className="h-64 w-full">
             {stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => [new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value), '']} />
                  <Legend />
                  <Line type="monotone" dataKey="investment" stroke="#6366f1" strokeWidth={2} activeDot={{ r: 8 }} name="Costo (Inversión)" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} name="Ganancia Neta" />
                </LineChart>
              </ResponsiveContainer>
             ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No hay datos de historial
              </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
