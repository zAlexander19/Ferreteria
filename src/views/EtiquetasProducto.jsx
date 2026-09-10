// Etiquetas para reconocer un producto de un vistazo al buscarlo, sin tener
// que leer el nombre completo: el tipo de masa, el tamaño y si es de cóctel.

const COLOR_TIPO = {
  freir: 'bg-amber-100 text-amber-800 border-amber-200',
  horno: 'bg-rose-100 text-rose-800 border-rose-200',
  sopaipillas: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const colorDe = categoria => COLOR_TIPO[(categoria || '').toLowerCase()] || 'bg-slate-100 text-slate-700 border-slate-200';

export function EtiquetasProducto({ product, className = '' }) {
  if (!product) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {product.category && (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border ${colorDe(product.category)}`}>
          {product.category}
        </span>
      )}
      {product.centimetros !== '' && product.centimetros !== undefined && product.centimetros !== null && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border bg-blue-100 text-blue-800 border-blue-200">
          {product.centimetros} cm
        </span>
      )}
      {product.isCocktail && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold border bg-purple-100 text-purple-800 border-purple-200">
          Cóctel
        </span>
      )}
    </span>
  );
}
