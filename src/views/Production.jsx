import React, { useMemo, useState } from 'react';
import { Factory, Package, User, Layers3, PlusCircle, Trash2 } from 'lucide-react';

const createEmptyLine = () => ({
  productId: '',
  quantityUnits: '',
  batches: ''
});

const getRecordItems = (record) => {
  if (Array.isArray(record.items) && record.items.length > 0) return record.items;

  if (record.productId) {
    return [{
      productId: record.productId,
      productName: record.productName,
      category: record.category,
      quantityUnits: Number(record.quantityUnits) || Number(record.totalUnitsAdded) || 0,
      batches: Number(record.batches) || 0,
      totalUnitsAdded: Number(record.totalUnitsAdded) || 0
    }];
  }

  return [];
};

const getCategoryBadgeClass = (category) => {
  const normalizedCategory = (category || '').toLowerCase();

  if (normalizedCategory.includes('freir')) {
    return 'bg-amber-100 text-amber-800 border border-amber-200';
  }
  if (normalizedCategory.includes('horno')) {
    return 'bg-rose-100 text-rose-800 border border-rose-200';
  }
  if (normalizedCategory.includes('sopaip')) {
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200';
};

export function Production({ products, productions = [], onRegisterProduction }) {
  const [operatorName, setOperatorName] = useState('');
  const [lines, setLines] = useState([createEmptyLine()]);

  const linePreview = useMemo(() => {
    return lines.map(line => {
      const units = Number(line.quantityUnits) || 0;
      return {
        ...line,
        previewUnits: units
      };
    });
  }, [lines, products]);

  const totalPreviewUnits = useMemo(() => {
    return linePreview.reduce((acc, curr) => acc + curr.previewUnits, 0);
  }, [linePreview]);

  const today = new Date().toISOString().slice(0, 10);

  const todaySummary = useMemo(() => {
    const todayRecords = productions.filter(record => record.date.startsWith(today));

    return {
      records: todayRecords.length,
      totalBatches: todayRecords.reduce((acc, curr) => {
        if (typeof curr.totalBatches === 'number') return acc + curr.totalBatches;
        if (Array.isArray(curr.items)) {
          return acc + curr.items.reduce((sum, item) => sum + (Number(item.batches) || 0), 0);
        }
        return acc + (Number(curr.batches) || 0);
      }, 0),
      totalUnits: todayRecords.reduce((acc, curr) => {
        if (typeof curr.totalUnitsAdded === 'number') return acc + curr.totalUnitsAdded;
        if (Array.isArray(curr.items)) {
          return acc + curr.items.reduce((sum, item) => sum + (Number(item.totalUnitsAdded) || Number(item.quantityUnits) || 0), 0);
        }
        return acc + (Number(curr.totalUnitsAdded) || 0);
      }, 0)
    };
  }, [productions, today]);

  const handleLineChange = (index, field, value) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== index) return line;
      return { ...line, [field]: value };
    }));
  };

  const handleAddLine = () => {
    setLines(prev => [...prev, createEmptyLine()]);
  };

  const handleRemoveLine = (index) => {
    setLines(prev => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!operatorName.trim()) return;

    const validLines = lines.filter(line => (
      line.productId && Number(line.quantityUnits) > 0 && Number(line.batches) > 0
    ));

    if (validLines.length === 0) return;

    if (validLines.length !== lines.length) {
      window.alert('Completa o elimina las líneas incompletas antes de registrar.');
      return;
    }

    onRegisterProduction({
      operatorName: operatorName.trim(),
      items: validLines.map(line => ({
        productId: line.productId,
        quantityUnits: Number(line.quantityUnits),
        batches: Number(line.batches)
      }))
    });

    setOperatorName('');
    setLines([createEmptyLine()]);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Registros de hoy</div>
          <div className="text-2xl font-bold text-gray-800">{todaySummary.records}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Tiradas realizadas hoy</div>
          <div className="text-2xl font-bold text-blue-700">{todaySummary.totalBatches}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500">Unidades agregadas hoy</div>
          <div className="text-2xl font-bold text-emerald-700">{todaySummary.totalUnits}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Factory className="w-6 h-6 text-blue-600" />
          Nuevo registro de producción
        </h3>

        {products.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-4">
            Debes crear productos en inventario antes de registrar producción.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              {linePreview.map((line, index) => {
                return (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div className="md:col-span-2 xl:col-span-5">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Producto</label>
                      <select
                        value={line.productId}
                        onChange={(e) => handleLineChange(index, 'productId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Seleccionar producto...</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.id} - {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="xl:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unidades</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={line.quantityUnits}
                          onChange={(e) => handleLineChange(index, 'quantityUnits', e.target.value)}
                          className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="100"
                          required
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tiradas</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Layers3 className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={line.batches}
                          onChange={(e) => handleLineChange(index, 'batches', e.target.value)}
                          className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="3"
                          required
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-2 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-md p-2 flex items-center">
                      +{line.previewUnits} unid.
                    </div>

                    <div className="md:col-span-2 xl:col-span-1 flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(index)}
                        disabled={lines.length === 1}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:text-gray-300 disabled:hover:bg-transparent"
                        title="Eliminar línea"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-md font-medium hover:bg-blue-100 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Agregar otra categoría/producto
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-5 h-5" />
                Registrar producción
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-md p-3 text-sm">
              Se sumarán automáticamente <span className="font-semibold">{totalPreviewUnits}</span> unidades al stock con este registro.
            </div>
          </form>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Historial de producción</h3>

        {productions.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 bg-gray-50 rounded-md border border-gray-100">
            Todavía no hay producción registrada.
          </div>
        ) : (
          <div className="space-y-4">
            {productions.map(record => {
              const items = getRecordItems(record);
              const totalUnitsProduced = items.reduce(
                (sum, item) => sum + (Number(item.quantityUnits) || Number(item.totalUnitsAdded) || 0),
                0
              );
              const totalBatches = typeof record.totalBatches === 'number'
                ? record.totalBatches
                : items.reduce((sum, item) => sum + (Number(item.batches) || 0), 0);
              const totalUnits = typeof record.totalUnitsAdded === 'number'
                ? record.totalUnitsAdded
                : items.reduce((sum, item) => sum + (Number(item.totalUnitsAdded) || 0), 0);

              const groupedByCategory = items.reduce((acc, item) => {
                const categoryName = item.category || 'Sin categoría';
                if (!acc[categoryName]) {
                  acc[categoryName] = [];
                }
                acc[categoryName].push(item);
                return acc;
              }, {});

              return (
                <article key={record.id} className="border border-gray-200 rounded-xl overflow-hidden bg-gradient-to-b from-white to-gray-50">
                  <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm text-gray-500">{new Date(record.date).toLocaleString('es-CL')}</div>
                      <div className="text-base font-semibold text-gray-900">Responsable: {record.operatorName}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        {totalUnitsProduced} unid.
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {totalBatches} tiradas
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        +{totalUnits} al stock
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {Object.entries(groupedByCategory).map(([categoryName, categoryItems]) => {
                      const categoryUnits = categoryItems.reduce(
                        (sum, item) => sum + (Number(item.quantityUnits) || Number(item.totalUnitsAdded) || 0),
                        0
                      );
                      const categoryBatches = categoryItems.reduce(
                        (sum, item) => sum + (Number(item.batches) || 0),
                        0
                      );

                      return (
                        <section key={`${record.id}-${categoryName}`} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getCategoryBadgeClass(categoryName)}`}>
                              {categoryName}
                            </span>
                            <span className="text-xs text-gray-500">{categoryItems.length} item(s)</span>
                          </div>

                          <ul className="space-y-2">
                            {categoryItems.map((item, idx) => (
                              <li key={`${record.id}-${categoryName}-${idx}`} className="border border-gray-100 rounded-md p-2.5 bg-gray-50">
                                <div className="text-sm font-medium text-gray-800">{item.productName || item.productId}</div>
                                <div className="text-xs text-gray-600 mt-1 flex flex-wrap gap-2">
                                  <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800">{Number(item.quantityUnits) || Number(item.totalUnitsAdded) || 0} unid.</span>
                                  <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800">{item.batches} tiradas</span>
                                </div>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-3 pt-2 border-t border-gray-100 text-xs font-semibold text-gray-700 flex justify-between">
                            <span>Subtotal categoría</span>
                            <span>{categoryUnits} unid. | {categoryBatches} tiradas</span>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
