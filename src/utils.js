// Utilidades funcionales puras (currying) usadas en filtros y renderizado del popup.
// No dependen del DOM ni de APIs del navegador, por lo que son seguras de probar y reutilizar.

// Devuelve una función que compara estrictamente value1 === value2.
// Patrón curried: isStrictEqual(a)(b) => boolean
export const isStrictEqual = (value1) => (value2) => value1 === value2;

// Devuelve una función que compara estrictamente value1 !== value2.
// Patrón curried: isNotStrictEqual(a)(b) => boolean
export const isNotStrictEqual = (value1) => (value2) => value1 !== value2;

// Devuelve una función que verifica si item está incluido en array.
// Patrón curried: isIncludedIn(array)(item) => boolean
export const isIncludedIn = (array) => (item) => array.includes(item);

// Detiene la propagación del evento DOM (evita que eventos de botón dentro de celdas
// disparen handlers del contenedor padre).
export const stopPropagation = (e) => e.stopPropagation();

// Elimina caracteres no permitidos en nombres de archivo de Windows/Linux/macOS.
// Caracteres eliminados: < > : " | ? * y barra diagonal inversa.
export const removeSpecialCharacters = (value) => {
  return value.replace(/[<>:"|?*]/g, '');
};

// Devuelve un array con los valores únicos (elimina duplicados) preservando orden de primera aparición.
export const unique = (values) => [...new Set(values)];
