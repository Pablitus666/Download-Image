// ============================================================================
// Download - Image — Unified Browser API (cross-browser)
// ============================================================================
// Resuelve la referencia correcta a la API de extensiones (chrome / browser)
// y proporciona detección de capacidades. Funciona en Chrome, Edge, Opera,
// Firefox y Safari (Manifest V3).
//
// Uso:
//   import { browser, hasApi } from './browser.js';
//   if (hasApi('downloads.download')) { ... }
// ============================================================================

// Referencia unificada: prefiere `chrome` con fallback a `browser` (Firefox nativo).
// Si ninguno existe, `browser` es null y todas las operaciones degradan silenciosamente.
export const browser =
  (typeof chrome !== 'undefined' && chrome) ||
  (typeof browser !== 'undefined' && browser) ||
  null;

/**
 * Comprueba si una ruta de API existe en el objeto browser.
 * @param {string} path - Ruta con puntos, ej. 'runtime.sendMessage' o 'downloads.download'
 * @returns {boolean}
 */
export const hasApi = (path) => {
  if (!browser) return false;
  let obj = browser;
  for (const key of path.split('.')) {
    obj = obj ? obj[key] : undefined;
    if (obj == null) return false;
  }
  return true;
};

export default { browser, hasApi };
