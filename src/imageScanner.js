// ============================================================================
// Download - Image — Image Scanner (v1.0.0)
// ============================================================================
// Funciones puras de detección de imágenes compartidas entre
// contentScript.js y Popup.js (findImages se mantiene self-contained).
// ============================================================================

// Convierte una URL relativa en absoluta usando el origen de la página actual.
// Si la conversión falla (URL inválida), devuelve la URL original sin cambios.
function toAbsolute(url) {
  try {
    return new URL(url, window.location.origin).href;
  } catch (e) {
    return url;
  }
}

// Determina si una URL apunta a una imagen.
// Acepta: data:image/, blob:, y URLs que terminan en extensión de imagen
// (bmp, gif, ico, jfif, jpe?g, png, svg, tiff?, webp, avif).
// No acepta dominios de medios generales (p.ej. instagram.com) a menos que
// la URL tenga extensión de imagen, para evitar capturar enlaces a páginas
// en lugar de archivos de imagen reales.
function isImageUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('blob:')) return true;

  const imageRegex = /\.(?:bmp|gif|ico|jfif|jpe?g|png|svg|tiff?|webp|avif)(?:\?|#|$)/i;
  return imageRegex.test(url);
}

// Determina si un elemento <img> es demasiado pequeño (posible avatar o icono).
// Se descarta si los atributos width/height o naturalWidth/naturalHeight son
// menores a 100px. Solo se aplica a elementos img/image.
function isImageTooSmall(el) {
  if (el.tagName.toLowerCase() !== 'img' && el.tagName.toLowerCase() !== 'image') return false;
  const w = el.getAttribute('width');
  const h = el.getAttribute('height');
  if (w && parseInt(w, 10) < 100) return true;
  if (h && parseInt(h, 10) < 100) return true;
  if (el.naturalWidth > 0 && el.naturalWidth < 100) return true;
  if (el.naturalHeight > 0 && el.naturalHeight < 100) return true;
  return false;
}

// Extrae URLs de imagen de un elemento DOM.
// Revisa: src, srcset, data-src, data-srcset, y background-image en CSS.
// Cada URL candidata se valida con isImageUrl y se convierte a absoluta.
function extractFromElement(el) {
  const results = [];
  const tag = el.tagName.toLowerCase();

  // Descartar imágenes demasiado pequeñas (avatares, iconos)
  if (isImageTooSmall(el)) return results;

  if (tag === 'img' || tag === 'image') {
    const src = el.src || el.getAttribute('src') || el.getAttribute('xlink:href');
    if (src && isImageUrl(src)) results.push(src);

    const srcset = el.getAttribute('srcset');
    if (srcset) {
      srcset.split(',').forEach((part) => {
        const u = part.trim().split(/\s+/)[0];
        if (u && isImageUrl(u)) results.push(u);
      });
    }

    const dataSrc = el.getAttribute('data-src');
    if (dataSrc && isImageUrl(dataSrc)) results.push(dataSrc);

    const dataSrcset = el.getAttribute('data-srcset');
    if (dataSrcset) {
      dataSrcset.split(',').forEach((part) => {
        const u = part.trim().split(/\s+/)[0];
        if (u && isImageUrl(u)) results.push(u);
      });
    }
  }

  // Extraer imágenes definidas como fondo en CSS (background-image)
  const bg = window.getComputedStyle(el).backgroundImage;
  if (bg && bg !== 'none') {
    const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (match && isImageUrl(match[1])) results.push(match[1]);
  }

  return results.map(toAbsolute).filter(isImageUrl);
}

// Convierte una URL relativa que comienza con '/' en absoluta usando window.location.origin.
// Las URLs que no comienzan con '/' se devuelven sin cambios.
function relativeUrlToAbsolute(url) {
  return url.indexOf('/') === 0 ? `${window.location.origin}${url}` : url;
}

// Convierte un array-like o Set en un array plano.
function toArray(values) {
  return [...values];
}

// Elimina duplicados de un array preservando el orden de primera aparición.
function unique(values) {
  return toArray(new Set(values));
}

// Extrae imágenes de todos los elementos que coincidan con un selector CSS.
// Aplica extractFromElement a cada uno, filtra vacíos, aplana, convierte a absolutas y elimina duplicados.
function extractImagesFromSelector(selector) {
  return unique(
    toArray(document.querySelectorAll(selector))
      .map(extractFromElement)
      .filter((arr) => arr.length > 0)
      .flat()
      .map(relativeUrlToAbsolute)
  );
}

// Exponer las funciones al objeto window para que contentScript.js pueda usarlas
// sin necesidad de imports ES modules (los content scripts no los soportan bien
// en todos los navegadores Chromium).
window.__ImageScanner = {
  toAbsolute,
  isImageUrl,
  isImageTooSmall,
  extractFromElement,
  unique,
  toArray,
  relativeUrlToAbsolute,
  extractImagesFromSelector,
};
