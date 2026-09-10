import { useState, useMemo } from 'react';
import { Trash2, AlertTriangle, Package, Plus, Search, X, Filter, Pencil } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { generateSku, normalizeProductFields, vistaStock, disponibleDesdeMaquina } from '../lib/inventory';
import { comprometidoPorProducto } from '../lib/pedidos';

const CATEGORIES = ["Freir", "Horno", "Sopaipillas"];

// El detalle de stock se muestra igual en la tarjeta del celular y en la tabla.
function BloqueStock({ product, comprometido }) {
  const v = vistaStock(product, comprometido);
  const bajo = v.disponible <= (product.minStock || 5);

  return (
    <div className="text-sm space-y-0.5">
      <div className="text-gray-600">
        <span className="text-xs text-gray-500">En máquina:</span>{' '}
        <span className="font-medium">{v.enMaquina}</span>
      </div>
      <div className="text-gray-600">
        <span className="text-xs text-gray-500">Reservado:</span>{' '}
        <span className={v.reservado > 0 ? 'font-medium text-amber-700' : 'font-medium'}>
          {v.reservado}
        </span>
      </div>
      <div className={twMerge('flex items-center font-bold', bajo ? 'text-red-600' : 'text-green-600')}>
        <span className="text-xs font-normal text-gray-500 mr-1">Disponible:</span>
        {v.disponible}
        {bajo && <AlertTriangle className="ml-1 w-4 h-4 text-red-500" />}
      </div>
      {bajo && (
        <span className="text-xs text-red-500 block">
          {v.disponible < 0
            ? `Faltan ${-v.disponible} por producir`
            : `Reordenar (Mín: ${product.minStock || 5})`}
        </span>
      )}
    </div>
  );
}

const precioBolsa = p => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(p);

export function InventoryTable({ products, orders = [], onAddProduct, onEditProduct, onDeleteProduct }) {
  // Unidades ya apartadas para pedidos pendientes. Sin esto, un producto en 0
  // porque todo esta comprometido se ve igual que uno en 0 y libre.
  const comprometido = useMemo(() => comprometidoPorProducto(orders), [orders]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    id: '',
    centimetros: '',
    isCocktail: false,
    category: CATEGORIES[0],
    unitsPerPackage: '',
    stock: '',
    minStock: '',
    price: '',
    cost: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      id: '',
      centimetros: '',
      isCocktail: false,
      category: CATEGORIES[0],
      unitsPerPackage: '',
      stock: '',
      minStock: '',
      price: '',
      cost: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.id);
    setFormData({
      id: product.id,
      centimetros: product.centimetros || '',
      isCocktail: product.isCocktail || false,
      category: product.category,
      unitsPerPackage: product.unitsPerPackage || '',
      // Ella cuenta lo que hay fisicamente, asi que el campo muestra el stock
      // en maquina; al guardar se vuelve a convertir a disponible.
      stock: vistaStock(product, comprometido[product.id]).enMaquina,
      minStock: product.minStock || '',
      price: product.price,
      cost: product.cost || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Se comprueba "vacío", no "falsy": un 0 es un valor válido y frecuente
    // (tener 0 masas en máquina), y con `!formData.stock` el guardar no hacía
    // nada y sin avisar.
    const vacio = v => v === '' || v === null || v === undefined;
    if (vacio(formData.centimetros) || vacio(formData.stock) || vacio(formData.price) || vacio(formData.unitsPerPackage)) return;
    
    // Generar nombre basado en la categoría, centímetros y unidades por paquete
    const cocktailText = formData.isCocktail ? " (Cóctel)" : "";
    const packageText = ` x${formData.unitsPerPackage} uds`;
    const generatedName = formData.category.toLowerCase() === "sopaipillas" 
      ? `Paquete Masas Sopaipillas ${formData.centimetros}cm${packageText}${cocktailText}`
      : `Paquete Masas ${formData.category} ${formData.centimetros}cm${packageText}${cocktailText}`;

    const base = normalizeProductFields({ ...formData, name: generatedName });

    if (editingId) {
      // El campo trae el stock en maquina; lo que se guarda es el disponible.
      onEditProduct({
        ...base,
        stock: disponibleDesdeMaquina(base.stock, comprometido[editingId])
      });
    } else {
      onAddProduct({ ...base, id: generateSku(products, formData.category) });
    }
    
    setIsModalOpen(false);
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      onDeleteProduct(id);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      product.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Todas' || product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Agregar Producto
        </button>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-grow md:flex-grow-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full md:w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2 w-full md:w-48 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white cursor-pointer"
            >
              <option value="Todas">Todas las categorías</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in flex flex-col">
            <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                {editingId ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
              <div className="md:col-span-2 bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                 <p className="text-sm text-blue-800">
                    <span className="font-semibold">Info:</span> {editingId ? `Editando producto: ${formData.id}` : `El ID del producto se generará automáticamente (ej. ${formData.category.substring(0,3).toUpperCase()}-001).`}
                 </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Centímetros</label>
                <input
                  type="number"
                  name="centimetros"
                  value={formData.centimetros}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. 15"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidades por Bolsa</label>
                <select
                  name="unitsPerPackage"
                  value={formData.unitsPerPackage}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="" disabled>Seleccionar unidades...</option>
                  <option value="10">10 Unidades</option>
                  <option value="20">20 Unidades</option>
                  <option value="25">25 Unidades</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock en máquina (Unidades)</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  min="0"
                  required
                />
                {editingId && comprometido[editingId] > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Contá lo que hay físicamente. De ahí se apartan{' '}
                    <span className="font-medium text-amber-700">{comprometido[editingId]} unidades</span>{' '}
                    ya comprometidas en pedidos, y quedan{' '}
                    <span className="font-medium">
                      {disponibleDesdeMaquina(formData.stock, comprometido[editingId])}
                    </span>{' '}
                    disponibles.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aviso de Stock Mínimo</label>
                <input
                  type="number"
                  name="minStock"
                  value={formData.minStock}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 5"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo (Compra)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    name="cost"
                    value={formData.cost}
                    onChange={handleInputChange}
                    className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center mt-6">
                <input
                  type="checkbox"
                  id="isCocktail"
                  name="isCocktail"
                  checked={formData.isCocktail}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isCocktail" className="ml-2 block text-sm text-gray-900">
                  Es para Cóctel
                </label>
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Productos: tarjetas apiladas en celular, tabla desde md */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">
            {products.length === 0 ? "No hay productos en el inventario" : "No se encontraron productos con estos filtros"}
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200 md:hidden">
              {filteredProducts.map((product) => (
                <li key={product.id} className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.id}</div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between items-end gap-3">
                    <BloqueStock product={product} comprometido={comprometido[product.id]} />
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Precio bolsa</div>
                      <div className="text-sm font-semibold text-gray-800">{precioBolsa(product.price)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-blue-200 text-blue-700 rounded-md font-medium active:bg-blue-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-700 rounded-md font-medium active:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[760px] w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU / Producto</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock (Unidades)</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Bolsa</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500">
                            <Package className="w-5 h-5" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <BloqueStock product={product} comprometido={comprometido[product.id]} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {precioBolsa(product.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="text-blue-600 hover:text-blue-900 focus:outline-none transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900 focus:outline-none transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
