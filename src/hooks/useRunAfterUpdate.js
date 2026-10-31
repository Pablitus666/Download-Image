import { useLayoutEffect, useRef } from '../html.js';

// Ejecuta funciones después de que React termine de aplicar actualizaciones al DOM.
// Útil para restaurar la posición del cursor (selectionStart/selectionEnd) en inputs
// tras un setState que podría reposicionarlos.
export const useRunAfterUpdate = () => {
  const handlersRef = useRef([]);

  useLayoutEffect(() => {
    handlersRef.current.forEach((handler) => handler());
    handlersRef.current = [];
  });

  return (handler) => {
    handlersRef.current.push(handler);
  };
};
