// ============================================================================
// Download - Image — Content Script (v1.0.1)
// ============================================================================
// Detecta imágenes en cualquier página web y las expone al popup.
// Se ejecuta en el contexto de cada pestaña (all_urls) y se comunica con el
// popup mediante chrome.runtime.onMessage.
// ============================================================================

(function() {
  // Evitar ejecución doble si el script se inyecta más de una vez en la misma pestaña.
  if (window.__DownloadImageCSLoaded) return;
  window.__DownloadImageCSLoaded = true;

  // Obtener funciones de detección del módulo compartido imageScanner.js.
  // window.__ImageScanner se popula en imageScanner.js que se carga antes.
  const { extractFromElement } = window.__ImageScanner || {};

  // Conjunto de URLs de imágenes únicas detectadas en la pestaña actual.
  const discoveredImages = new Set();
  let observer = null;

  // Escanea el DOM actual y devuelve solo las imágenes nuevas desde la última llamada.
  // Útil para detectar imágenes cargadas dinámicamente sin repetir las ya vistas.
  function scanPage() {
    const before = discoveredImages.size;

    const candidates = document.querySelectorAll(
      'img, image, [srcset], [data-src], [data-srcset], [role="img"]'
    );

    candidates.forEach((el) => {
      extractFromElement(el).forEach((url) => discoveredImages.add(url));
    });

    const after = discoveredImages.size;
    // Devuelve solo las imágenes nuevas (desde el índice 'before' en adelante)
    return after > before ? Array.from(discoveredImages).slice(before) : [];
  }

  // Configura un MutationObserver para detectar cambios en el DOM (SPA, lazy load, etc.).
  // Observa atributos relevantes de imagen y nodos añadidos.
  function startObserver() {
    if (observer) return;

    // document.body no existe o no es un Node en documentos no-HTML (p.ej. .svg abiertos directamente).
    if (!document.body || typeof Node === 'undefined' || !(document.body instanceof Node)) return;

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            // Procesar el nodo añadido y sus descendientes que coincidan con selectores de imagen
            extractFromElement(node).forEach((url) => discoveredImages.add(url));
            node.querySelectorAll(
              'img, image, [srcset], [data-src], [data-srcset], [role="img"]'
            ).forEach((el) => {
              extractFromElement(el).forEach((url) => discoveredImages.add(url));
            });
          }
        }
      }
    });

    try {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'data-src', 'data-srcset', 'style', 'class'],
      });
    } catch (e) {
      observer = null;
    }
  }

  // API pública expuesta al popup y a otros scripts.
  window.__DownloadImage = {
    scanPage,
    startObserver,
    getAllImages: () => Array.from(discoveredImages),
    clearImages: () => { discoveredImages.clear(); },
  };

  // Escaneo inmediato cuando el DOM esté listo (solo en documentos HTML).
  if (document.body) {
    try { scanPage(); } catch (e) {}
    startObserver();
  }

  // ---------------------------------------------------------------------------
  // Escaneo periódico para SPA (Single Page Applications) como Instagram.
  // Vuelve a escanear cada 3 segundos para capturar imágenes cargadas dinámicamente.
  // ---------------------------------------------------------------------------
  let scanInterval = null;

  function startPeriodicScan() {
    if (scanInterval) return;
    scanInterval = setInterval(() => {
      try { scanPage(); } catch (e) {}
    }, 3000);
  }

  function stopPeriodicScan() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
  }

  // Pausar escaneo cuando la pestaña está oculta (ahorra CPU/batería),
  // reanudar cuando vuelve a ser visible.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stopPeriodicScan();
    } else {
      startPeriodicScan();
    }
  });

  startPeriodicScan();

  // ---------------------------------------------------------------------------
  // Puente de comunicación con el popup.
  // El popup solicita las imágenes detectadas mediante mensaje 'di:get-images'.
  // ---------------------------------------------------------------------------
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'di:get-images') {
        sendResponse({ images: Array.from(discoveredImages), count: discoveredImages.size });
        return true; // Mantener canal abierto para respuesta asíncrona
      }
      return false;
    });
  }

  console.log('[Download - Image] Content script activo — imágenes:', discoveredImages.size);
})();
