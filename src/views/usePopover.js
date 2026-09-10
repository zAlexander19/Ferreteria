import { useState, useRef, useEffect, useLayoutEffect } from 'react';

// Abre y cierra un panel flotante, cerrándolo al tocar afuera o con Escape.
//
// El panel se dibuja en un portal sobre <body> con posición fija, y no dentro
// del contenedor del botón: el formulario del pedido tiene scroll propio
// (overflow-y-auto) y un panel absoluto queda recortado por ese contenedor,
// dejando el calendario a medio ver. Al vivir fuera, nada lo recorta.
export function usePopover() {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const disparador = useRef(null);
  const panel = useRef(null);

  useEffect(() => {
    if (!abierto) return;

    const alTocarAfuera = e => {
      const fueraDelBoton = disparador.current && !disparador.current.contains(e.target);
      const fueraDelPanel = panel.current && !panel.current.contains(e.target);
      if (fueraDelBoton && fueraDelPanel) setAbierto(false);
    };
    const alPresionar = e => {
      if (e.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', alTocarAfuera);
    document.addEventListener('keydown', alPresionar);
    return () => {
      document.removeEventListener('mousedown', alTocarAfuera);
      document.removeEventListener('keydown', alPresionar);
    };
  }, [abierto]);

  // Se ubica después de dibujar, cuando ya se puede medir el panel: si no entra
  // abajo se pone arriba, y si se sale por la derecha se corre hacia adentro.
  useLayoutEffect(() => {
    if (!abierto || !disparador.current || !panel.current) return;

    const boton = disparador.current.getBoundingClientRect();
    const alto = panel.current.offsetHeight;
    const ancho = panel.current.offsetWidth;
    const margen = 8;

    const entraAbajo = boton.bottom + alto + margen <= window.innerHeight;
    const top = entraAbajo
      ? boton.bottom + margen
      : Math.max(margen, boton.top - alto - margen);

    const left = Math.max(
      margen,
      Math.min(boton.left, window.innerWidth - ancho - margen)
    );

    setPosicion({ top, left });
  }, [abierto]);

  return { abierto, setAbierto, disparador, panel, posicion };
}
