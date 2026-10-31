// Puente entre htm (templating tipo JSX) y React para el popup.
// Carga React y ReactDOM desde las librerías minificadas incluidas en /lib.
// Si React no está disponible (fallo de carga), provee fallbacks no-operativos
// para que el popup no rompa por completo.
import htm from '../lib/htm.js';
import '../lib/react-18.3.1.min.js';
import '../lib/react-dom-18.3.1.min.js';

// Obtener React y ReactDOM desde el objeto global (los minificados los asignan a window)
const React = window.React || {};
const ReactDOM = window.ReactDOM || {};

let html;
try {
  if (typeof htm === 'function' && typeof React.createElement === 'function') {
    html = htm.bind(React.createElement);
  } else {
    throw new Error('htm o React.createElement no disponibles');
  }
} catch (e) {
  console.warn('[Download - Image] Fallback de htm activado:', e.message);
  // Fallback mínimo: devolver el primer segmento del template literal sin procesar
  html = (strings, ...values) => String(strings.raw[0] || '');
}

export default html;

// React hooks con fallback seguro (no rompen si React falta)
export const useCallback = React.useCallback || ((fn) => fn);
export const useEffect = React.useEffect || ((fn) => { fn(); return () => {}; });
export const useLayoutEffect = React.useLayoutEffect || React.useEffect || ((fn) => { fn(); return () => {}; });
export const useMemo = React.useMemo || ((fn) => fn());
export const useRef = React.useRef || ((initial) => ({ current: initial }));
export const useState = React.useState || ((initial) => [initial, () => {}]);

// React DOM
export const render = ReactDOM.render || ((element, container) => {});
