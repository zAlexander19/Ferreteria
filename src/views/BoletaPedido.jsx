import { useState, useRef, useEffect } from 'react';
import { Share2, Download, X, Loader2 } from 'lucide-react';
import { datosBoleta, describirProducto } from '../lib/pedidos';
import { mostrarFecha } from '../lib/fechas';
import { CANDIDATOS } from '../lib/logo';

const clp = valor => (Number(valor) || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

// El detalle va en texto plano y no en las pastillas de colores que usa el
// resto de la app. No es una preferencia: html2canvas dibuja el texto mas
// arriba de donde corresponde dentro de una caja ajustada, y en el PNG las
// palabras salian corridas contra el borde de la pastilla. Se intento con
// inline-block y con el line-height clavado al tamano de la letra, y siguio
// pasando. Sin caja alrededor el desplazamiento deja de tener contra que
// notarse, asi que el problema desaparece en vez de quedar peleado.

// Ancho fijo de la boleta en pantalla. html2canvas captura el elemento al
// tamano que tiene en el layout, asi que no se puede escalar con CSS para la
// vista previa: lo que se ve es literalmente lo que sale en el PNG. Con
// scale: 2 al capturar, el archivo sale de 840px de ancho, comodo para
// mandarlo por WhatsApp sin que se vea pixelado.
const ANCHO = 420;

// ¿El navegador puede compartir archivos? En celular abre el menu nativo (y
// ahi aparece WhatsApp); en escritorio casi nunca existe, y por eso se ofrece
// descargar en su lugar. Se pregunta con un archivo de mentira porque
// canShare() mira el TIPO de dato, no el contenido.
function puedeCompartirArchivos() {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

export function BoletaPedido({ order, onCerrar }) {
  const boletaRef = useRef(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [intentoLogo, setIntentoLogo] = useState(0);
  const [compartible, setCompartible] = useState(false);

  useEffect(() => { setCompartible(puedeCompartirArchivos()); }, []);

  const boleta = datosBoleta(order);
  const nombreArchivo = `boleta-${boleta.id}.png`;
  const hayLogo = intentoLogo < CANDIDATOS.length;

  const capturar = async () => {
    // Import dinamico: html2canvas pesa ~200 KB y solo hace falta cuando se
    // aprieta el boton, asi que no tiene por que viajar en el bundle inicial
    // de una app que se abre desde el celular.
    const { default: html2canvas } = await import('html2canvas');

    const canvas = await html2canvas(boletaRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('El navegador no devolvio la imagen.'))),
        'image/png'
      );
    });
  };

  const descargar = (blob) => {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const generar = async (compartir) => {
    setGenerando(true);
    setError('');

    try {
      const blob = await capturar();
      const archivo = new File([blob], nombreArchivo, { type: 'image/png' });

      if (compartir && navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: `Pedido ${boleta.id}` });
      } else {
        descargar(blob);
      }
    } catch (fallo) {
      // Cerrar el menu de compartir sin elegir nada tira AbortError. No es un
      // error: la duena cambio de opinion.
      if (fallo?.name !== 'AbortError') {
        setError('No se pudo generar la boleta. Proba de nuevo.');
      }
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-masa-carbon/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onCerrar}
    >
      <div className="my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 gap-3" style={{ width: ANCHO }}>
          <span className="text-white font-semibold drop-shadow">Comprobante del pedido</span>
          <button
            onClick={onCerrar}
            className="p-2 bg-white/90 rounded-full text-masa-carbon/70 hover:text-masa-carbon shadow-vidrio"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* La boleta va con estilos planos y opacos a proposito: html2canvas no
            sabe renderizar backdrop-filter, que es la base de todo el vidrio de
            la app. Y de paso un comprobante se lee mejor asi. */}
        <div
          ref={boletaRef}
          className="bg-white text-gray-900"
          style={{ width: ANCHO, padding: 28 }}
        >
          <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-900">
            {hayLogo && (
              <img
                src={CANDIDATOS[intentoLogo]}
                alt=""
                onError={() => setIntentoLogo(n => n + 1)}
                style={{ width: 64, height: 64, objectFit: 'contain' }}
              />
            )}
            <div className="leading-tight">
              <div className="font-bold text-lg">Fábrica de Masas</div>
              <div className="text-xl font-bold">La Dueña</div>
            </div>
          </div>

          <div className="flex justify-between items-start pt-4 pb-3 text-sm">
            <div>
              <div className="font-bold text-base">{boleta.id}</div>
              <div className="text-gray-600">
                Emitido el {new Date().toLocaleDateString('es-CL')}
              </div>
            </div>
            <div className="text-right text-gray-600">
              <div className="font-semibold text-gray-900">Entrega</div>
              <div>{mostrarFecha(boleta.entrega.fecha) || 'Sin fecha'}</div>
              <div>{boleta.entrega.hora || ''}</div>
            </div>
          </div>

          <div className="py-3 border-t border-gray-200 text-sm">
            <div className="text-gray-500 text-xs uppercase font-semibold mb-1">Cliente</div>
            <div className="font-medium">{boleta.cliente.nombre}</div>
            {boleta.cliente.telefono && (
              <div className="text-gray-600">{boleta.cliente.telefono}</div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-3">
            <div className="text-gray-500 text-xs uppercase font-semibold mb-2">Detalle</div>

            {boleta.lineas.map(linea => (
              <div key={linea.id} className="flex justify-between items-start gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-semibold">{describirProducto(linea)}</div>
                  <div className="text-sm text-gray-700">
                    {linea.bolsas} {linea.bolsas === 1 ? 'bolsa' : 'bolsas'} x {clp(linea.precioUnitario)}
                  </div>
                  <div className="text-xs text-gray-500">{linea.unidades} unidades</div>
                </div>
                <div className="font-semibold whitespace-nowrap">{clp(linea.subtotal)}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-3 text-sm">
            <div className="flex justify-between text-gray-600 mb-2">
              <span>Total del pedido</span>
              <span className="font-semibold text-gray-900">{boleta.totalUnidades} unidades de masa</span>
            </div>

            <div className="flex justify-between items-center border-t-2 border-gray-900 pt-2 text-lg font-bold">
              <span>TOTAL</span>
              <span>{clp(boleta.total)}</span>
            </div>

            {boleta.pago.estado === 'Pagado' ? (
              <div className="mt-2 text-center font-bold text-green-700 border border-green-600 rounded py-1">
                PAGADO
              </div>
            ) : (
              <div className="mt-2">
                {boleta.pago.abonado > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Abonado</span>
                    <span>{clp(boleta.pago.abonado)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-red-700">
                  <span>SALDO PENDIENTE</span>
                  <span>{clp(boleta.pago.saldo)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 mt-4 pt-3 text-center text-xs text-gray-500 leading-relaxed">
            <div className="font-semibold text-gray-700">Fábrica de Masas La Dueña</div>
            <div>WhatsApp +56 9 7330 6311</div>
            <div className="mt-1">Comprobante de pedido. No es un documento tributario.</div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-white bg-red-600/90 rounded-xl px-3 py-2 mt-3" style={{ width: ANCHO }}>
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-3" style={{ width: ANCHO }}>
          <button
            type="button"
            disabled={generando}
            onClick={() => generar(compartible)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-masa-naranja text-white font-semibold rounded-xl shadow-vidrio hover:bg-masa-tostado transition-colors disabled:opacity-60"
          >
            {generando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando...
              </>
            ) : compartible ? (
              <>
                <Share2 className="w-5 h-5" />
                Compartir
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Descargar
              </>
            )}
          </button>

          {/* En celular conviene tener las dos: compartir manda al menu nativo,
              pero a veces se quiere guardar la imagen y adjuntarla a mano. */}
          {compartible && (
            <button
              type="button"
              disabled={generando}
              onClick={() => generar(false)}
              title="Guardar la imagen"
              className="px-4 py-2.5 bg-white/90 text-masa-carbon font-medium rounded-xl shadow-vidrio hover:bg-white transition-colors disabled:opacity-60"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
