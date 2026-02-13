import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AlertTriangle, Calendar, TrendingUp, TrendingDown, Clock, DollarSign, Wallet } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function Statistics({ products }) {
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
        profit: Number(historyMap[date].profit.toFixed(2)),
        investment: Number(historyMap[date].investment.toFixed(2))
      }));

    return { lowStock, expiringSoon, bestSellers, lowRotation, categoryData, topProduct, worstProduct, totalInvestment, totalProfit, chartData };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Low Stock Card */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Bajo Stock</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.lowStock.length}</p>
          <p className="text-xs text-gray-500 mt-1">Productos con &#60; 5 unidades</p>
        </div>

        {/* Expiring Soon Card */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-orange-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Próx. a Vencer</h3>
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.expiringSoon.length}</p>
          <p className="text-xs text-gray-500 mt-1">Vencen en 30 días</p>
        </div>

        {/* Best Seller Product Card */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Producto Más Vendido</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-xl font-bold text-gray-800 truncate" title={stats.topProduct?.name}>
            {stats.topProduct ? stats.topProduct.name : "N/A"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.topProduct ? `${stats.topProduct.salesCount} ventas totales` : "Sin datos de ventas"}
          </p>
        </div>

        {/* Least Seller Product Card */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Producto Menos Vendido</h3>
            <TrendingDown className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-gray-800 truncate" title={stats.worstProduct?.name}>
            {stats.worstProduct ? stats.worstProduct.name : "N/A"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.worstProduct ? `${stats.worstProduct.salesCount || 0} ventas totales` : "Sin datos"}
          </p>
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
                  <RechartsTooltip formatter={(value) => [`$${value}`, '']} />
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

        {/* Best Sellers Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
             <TrendingUp className="w-5 h-5 text-green-600" />
             Top Best Sellers
          </h3>
          <div className="overflow-auto max-h-64">
             <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                   <tr>
                      <th className="px-4 py-2">Producto</th>
                      <th className="px-4 py-2 text-right">Ventas</th>
                      <th className="px-4 py-2 text-right">Stock</th>
                   </tr>
                </thead>
                <tbody>
                   {stats.bestSellers.length > 0 ? (
                      stats.bestSellers.map(p => (
                         <tr key={p.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-3 text-right text-blue-600 font-bold">{p.salesCount}</td>
                            <td className="px-4 py-3 text-right">{p.stock}</td>
                         </tr>
                      ))
                   ) : (
                      <tr>
                         <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                            No hay ventas registradas
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        </div>

        {/* Expiring Soon Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
             <Calendar className="w-5 h-5 text-orange-600" />
             Próximos a Vencer
          </h3>
          <div className="overflow-auto max-h-64">
             <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                   <tr>
                      <th className="px-4 py-2">Producto</th>
                      <th className="px-4 py-2">SKU</th>
                      <th className="px-4 py-2 text-right">Fecha</th>
                   </tr>
                </thead>
                <tbody>
                   {stats.expiringSoon.length > 0 ? (
                      stats.expiringSoon.map(p => (
                         <tr key={p.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                            <td className="px-4 py-3 text-gray-500">{p.id}</td>
                            <td className="px-4 py-3 text-right text-red-600 font-medium">{p.expirationDate}</td>
                         </tr>
                      ))
                   ) : (
                      <tr>
                         <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                            No hay productos próximos a vencer
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        </div>

        {/* Low Rotation Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
             <TrendingDown className="w-5 h-5 text-blue-600" />
             Baja Rotación (+60 días)
          </h3>
          <div className="overflow-auto max-h-64">
             <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                   <tr>
                      <th className="px-4 py-2">Producto</th>
                      <th className="px-4 py-2 text-right">Ult. Venta</th>
                      <th className="px-4 py-2 text-right">Stock</th>
                   </tr>
                </thead>
                <tbody>
                   {stats.lowRotation.slice(0, 5).map(p => (
                      <tr key={p.id} className="border-b hover:bg-gray-50">
                         <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                         <td className="px-4 py-3 text-right text-gray-500">
                            {p.lastSaleDate ? new Date(p.lastSaleDate).toLocaleDateString() : 'Nunca'}
                         </td>
                         <td className="px-4 py-3 text-right">{p.stock}</td>
                      </tr>
                   ))}
                   {stats.lowRotation.length === 0 && (
                      <tr>
                         <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                            Todos los productos tienen movimiento reciente
                         </td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}
