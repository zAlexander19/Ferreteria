import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { ShoppingCart, Package } from 'lucide-react';
import { RangoFechas } from './RangoFechas';
import { ListaVentas, ModalVentas } from './ListaVentas';
import { ventasUnificadas, totalPorOrigen, filtrarVentas, PUNTO_DE_VENTA, PEDIDO } from '../lib/ventas';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const COLOR_ORIGEN = { [PUNTO_DE_VENTA]: '#2563eb', [PEDIDO]: '#9333ea' };

const clp = v => (Number(v) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

export function Statistics({ products, sales = [], orders = [] }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [modalVentas, setModalVentas] = useState(false);

  // Una venta es lo del mostrador mas los pedidos completados Y pagados.
  const ventas = useMemo(() => ventasUnificadas(sales, orders), [sales, orders]);
  const ventasFiltradas = useMemo(() => filtrarVentas(ventas, { desde, hasta }), [ventas, desde, hasta]);
  const ultimasVentas = useMemo(() => ventas.slice(0, 10), [ventas]);
  const porOrigen = useMemo(() => totalPorOrigen(ventas), [ventas]);
  const totalVendido = useMemo(() => ventas.reduce((s, v) => s + v.total, 0), [ventas]);
  const totalFiltrado = useMemo(() => ventasFiltradas.reduce((s, v) => s + v.total, 0), [ventasFiltradas]);


  const stats = useMemo(() => {
    const now = new Date();

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
    // Math.max(0, ...): el stock puede quedar negativo cuando hay pedidos
    // agendados sin producir. Ese negativo es un faltante, no una inversión
    // negativa, así que no debe restar del capital inmovilizado.
    const totalInvestment = products.reduce((acc, curr) => acc + (Math.max(0, Number(curr.stock) || 0) * (curr.cost || 0)), 0);
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

    return { bestSellers, lowRotation, categoryData, topProduct, worstProduct, totalInvestment, totalProfit, chartData, lowestStockProduct, stockChartData };
  }, [products]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Últimas ventas: mostrador + pedidos completados y pagados */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Últimas ventas
          </h3>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{ventas.length}</span> en total ·{' '}
            <span className="font-bold text-blue-700">{clp(totalVendido)}</span>
          </div>
        </div>

        <ListaVentas ventas={ultimasVentas} />

        {ventas.length > 0 && (
          <button
            onClick={() => setModalVentas(true)}
            className="mt-4 w-full sm:w-auto px-4 py-2 border border-blue-300 text-blue-700 font-medium rounded-md hover:bg-blue-50 transition-colors"
          >
            Ver todas las ventas ({ventas.length})
          </button>
        )}
      </div>

      {modalVentas && (
        <ModalVentas
          ventas={ventasFiltradas}
          total={totalFiltrado}
          onClose={() => setModalVentas(false)}
          filtro={
            <RangoFechas
              desde={desde}
              hasta={hasta}
              onChange={({ desde: d, hasta: h }) => { setDesde(d); setHasta(h); }}
            />
          }
        />
      )}

      {/* Mostrador vs Pedidos */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Mostrador vs Pedidos</h3>
        <p className="text-sm text-gray-500 mb-4">Cuánto se vendió por cada canal.</p>

        {totalVendido === 0 ? (
          <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
            Todavía no hay ventas registradas
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="h-56 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porOrigen} cx="50%" cy="50%" outerRadius={80} dataKey="total" nameKey="origen">
                    {porOrigen.map((entry) => (
                      <Cell key={entry.origen} fill={COLOR_ORIGEN[entry.origen]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(valor, nombre) => [clp(valor), nombre]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="w-full md:w-1/2 space-y-2">
              {porOrigen.map(o => (
                <li key={o.origen} className="flex items-center justify-between gap-3 border border-gray-100 rounded-md px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLOR_ORIGEN[o.origen] }} />
                    {o.origen}
                  </span>
                  <span className="text-sm whitespace-nowrap">
                    <span className="font-bold text-gray-900">{clp(o.total)}</span>
                    <span className="text-gray-500"> ({o.cantidad} {o.cantidad === 1 ? 'venta' : 'ventas'})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Contenedor principal para Estadísticas Superiores */}
      <div className="flex flex-col gap-6 mb-6">
        {/* Gráfico de Barras de Stock (Ancho de todo el dashboard) */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-blue-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Estado de Inventario</h3>
            <Package className="w-5 h-5 text-blue-500" />
          </div>
          <div className="h-64 w-full">
            {stats.stockChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.stockChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="shortName" tick={{ fontSize: 12 }} />
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
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
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
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
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
