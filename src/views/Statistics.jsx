import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { ShoppingCart, Package } from 'lucide-react';
import { RangoFechas } from './RangoFechas';
import { ListaVentas, ModalVentas } from './ListaVentas';
import { FiltroPeriodo } from './FiltroPeriodo';
import {
  ventasUnificadas, totalPorOrigen, filtrarVentas,
  ventasDelPeriodo, serieFinanciera, totalPorCategoria,
  PUNTO_DE_VENTA, PEDIDO,
} from '../lib/ventas';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const COLOR_ORIGEN = { [PUNTO_DE_VENTA]: '#2563eb', [PEDIDO]: '#9333ea' };

const clp = v => (Number(v) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function Statistics({ products, sales = [], orders = [] }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [modalVentas, setModalVentas] = useState(false);

  // El periodo manda sobre el grafico financiero y sobre la torta de categorias.
  // `mes` se guarda siempre, aunque se este mirando el anio entero.
  const [anio, setAnio] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState(() => new Date().getMonth() + 1);
  const [porAnio, setPorAnio] = useState(false);

  // Una venta es lo del mostrador mas los pedidos completados Y pagados.
  const ventas = useMemo(() => ventasUnificadas(sales, orders), [sales, orders]);
  const ventasFiltradas = useMemo(() => filtrarVentas(ventas, { desde, hasta }), [ventas, desde, hasta]);
  const ultimasVentas = useMemo(() => ventas.slice(0, 10), [ventas]);
  const porOrigen = useMemo(() => totalPorOrigen(ventas), [ventas]);
  const totalVendido = useMemo(() => ventas.reduce((s, v) => s + v.total, 0), [ventas]);
  const totalFiltrado = useMemo(() => ventasFiltradas.reduce((s, v) => s + v.total, 0), [ventasFiltradas]);

  const periodo = useMemo(() => ({ anio, mes: porAnio ? null : mes }), [anio, mes, porAnio]);
  const serie = useMemo(() => serieFinanciera(ventas, periodo), [ventas, periodo]);
  const porCategoria = useMemo(
    () => totalPorCategoria(ventasDelPeriodo(ventas, periodo)),
    [ventas, periodo]
  );
  const hayMovimiento = useMemo(() => serie.some(p => p.costo !== 0 || p.ganancia !== 0), [serie]);
  const nombrePeriodo = porAnio ? String(anio) : `${MESES_LARGOS[mes - 1]} de ${anio}`;


  // Lo unico que se sigue usando del inventario es el grafico de stock. El
  // resto de las cifras salen ahora de las ventas reales, no de los campos
  // salesCount/lastSaleDate que quedan pegados en cada producto: esos guardan
  // una sola fecha por producto y apilaban todo el historial en un punto.
  const stockChartData = useMemo(
    () => products.map(p => ({
      name: p.name,
      stock: p.stock,
      minStock: p.minStock || 5,
      shortName: p.id,
    })),
    [products]
  );

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
            {stockChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockChartData}>
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
                    {stockChartData.map((entry, index) => (
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

      {/* Financiero y categorías, los dos mandados por el mismo período */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-lg font-bold text-gray-800">Ventas del período</h3>
          <FiltroPeriodo
            anio={anio}
            mes={mes}
            porAnio={porAnio}
            onChange={({ anio: a, mes: m, porAnio: pa }) => { setAnio(a); setMes(m); setPorAnio(pa); }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Costo vs ganancia, día a día o mes a mes */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Análisis Financiero (Ventas)</h3>
            <p className="text-sm text-gray-500 mb-4">
              {porAnio ? 'Mes a mes' : 'Día a día'} · {nombrePeriodo}
            </p>
            <div className="h-64 w-full">
              {hayMovimiento ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serie} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={v => clp(v)} />
                    <RechartsTooltip
                      formatter={(valor, nombre) => [clp(valor), nombre]}
                      labelFormatter={l => (porAnio ? l : `Día ${l}`)}
                    />
                    <Legend />
                    <Line type="linear" dataKey="costo" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Costo (Inversión)" />
                    <Line type="linear" dataKey="ganancia" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Ganancia Neta" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm px-4">
                  No hubo ventas en {nombrePeriodo}
                </div>
              )}
            </div>
          </div>

          {/* Cuánta plata y cuántas unidades por tipo de masa */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Ventas por Categoría</h3>
            <p className="text-sm text-gray-500 mb-4">Cuánto se vendió de cada tipo · {nombrePeriodo}</p>

            {porCategoria.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-center text-gray-400 text-sm px-4">
                No hubo ventas en {nombrePeriodo}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="h-56 w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={porCategoria} cx="50%" cy="50%" outerRadius={80} dataKey="total" nameKey="categoria">
                        {porCategoria.map((entrada, i) => (
                          <Cell key={entrada.categoria} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(valor, nombre) => [clp(valor), nombre]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="w-full md:w-1/2 space-y-2">
                  {porCategoria.map((c, i) => (
                    <li key={c.categoria} className="flex items-center justify-between gap-3 border border-gray-100 rounded-md px-3 py-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        {c.categoria}
                      </span>
                      <span className="text-sm whitespace-nowrap">
                        <span className="font-bold text-gray-900">{clp(c.total)}</span>
                        <span className="text-gray-500"> ({c.unidades} uds)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
