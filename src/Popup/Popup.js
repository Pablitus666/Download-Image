import html, {
  render,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from '../html.js';

import { useRunAfterUpdate } from '../hooks/useRunAfterUpdate.js';
import { isIncludedIn, removeSpecialCharacters, unique } from '../utils.js';

import * as actions from './actions.js';
import { AdvancedFilters } from './AdvancedFilters.js';
import { DownloadButton } from './DownloadButton.js';
import { DownloadConfirmation } from './DownloadConfirmation.js';
import { Images } from './Images.js';
import { UrlFilterMode } from './UrlFilterMode.js';

// ============================================================================
// Download - Image — Popup (v1.0.0)
// ============================================================================
// Mejoras v1.0.0:
//   • Comunicación directa con Content Script (detección dinámica de imágenes)
//   • Progreso de descarga en tiempo real
//   • Historial persistente de descargas
//   • Filtros por dominio (permitir/bloquear)
//   • Scroll automático infinito
//   • Modo oscuro por defecto
//   • Botón de escanear página manualmente
// ============================================================================

// Patrón para validar que la pestaña activa sea http:// o https:// (evita chrome://, about:, etc.)
const TAB_URL_PATTERN = /^https?:\/\//;

// Cargar opciones iniciales desde localStorage al montar el componente.
// NOTA: useState(initialOptions) usa el valor una sola vez; los cambios posteriores
// en localStorage no se reflejan automáticamente sin este efecto de sincronización.
const initialOptions = localStorage;

const Popup = () => {
  const [options, setOptions] = useState(initialOptions);

  // Sincronizar cambios de options de vuelta a localStorage en cada render.
  // Esto persiste las preferencias del usuario entre sesiones.
  useEffect(() => {
    Object.assign(localStorage, options);
  }, [options]);

  // --- Estado de imágenes ---
  const [allImages, setAllImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [visibleImages, setVisibleImages] = useState([]);
  const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, ready
  const [activeTabOrigin, setActiveTabOrigin] = useState('');

  // --- Estado de descarga ---
  const [downloadIsInProgress, setDownloadIsInProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    processed: 0,
    total: 0,
    percent: 0,
    currentProgress: 0,
  });

  // --- Historial ---
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [historyIsLoaded, setHistoryIsLoaded] = useState(false);

  // --- Refs ---
  const imagesCacheRef = useRef(null);

  // ============================================================================
  // 1. Obtener imágenes de la pestaña activa
  // ============================================================================

  const fetchImages = useCallback(() => {
    setScanStatus('scanning');

    chrome.windows.getCurrent((currentWindow) => {
      chrome.tabs.query(
        { active: true, windowId: currentWindow.id },
        (activeTabs) => {
          const tab = activeTabs[0];

          // Si no hay URL o no es http/https (p.ej. chrome://, about:), no se puede escanear.
          if (!tab.url || !TAB_URL_PATTERN.test(tab.url)) {
            setScanStatus('idle');
            return;
          }

          setActiveTabOrigin(tab.url.split('/').slice(0, 3).join('/'));

          // Estrategia principal: inyectar findImages directamente en la página
          // (más confiable que depender de que el content script esté cargado)
          chrome.scripting
            .executeScript({
              target: { tabId: tab.id, allFrames: true },
              func: findImages,
            })
            .then((messages) => {
              const all = unique([
                ...messages.flatMap((m) => m?.result?.allImages || []),
              ]);
              setAllImages(all);
              setScanStatus('ready');
            })
            .catch((err) => {
              console.error('[Download - Image] findImages falló:', err);
              setScanStatus('idle');
            });

          // Estrategia secundaria: también preguntar al content script si está disponible
          // (protegido contra "Receiving end does not exist" en pestañas sin content script)
          chrome.tabs.sendMessage(
            tab.id,
            { type: 'di:get-images' },
            (response) => {
              if (chrome.runtime.lastError) {
                // El content script no está inyectado en esta pestaña; ignorar silenciosamente
                return;
              }
              if (response && response.images) {
                const imgs = unique(response.images || []);
                if (imgs.length > 0) {
                  setAllImages(imgs);
                  setScanStatus('ready');
                }
              }
            }
          );
        }
      );
    });
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // ============================================================================
  // 2. Filtrado de imágenes (URL + Dominio + Tamaño)
  // ============================================================================

  // Patrones de expresiones regulares potencialmente peligrosos (ReDoS).
  // Detecta cuantificadores anidados y repeticiones que pueden causar
  // retroceso catastrófico (backtracking exponencial).
  const REDOS_PATTERNS = [
    /\([^)]*[\+\*]\{0,\d*\}\)[\+\*]/,       // (a+)+, (a*)*
    /\([^)]*\)\{\d*,\d*\}[\+\*]/,          // (a){1,5}+
    /\[[\s\S]*\]\[\s\S\]\{0,\}/,           // [a][]* etc.
    /\(\?[<!=]/,                           // lookahead/lookbehind (costosas)
  ];

  /**
   * Evalúa si una expresión regular proporcionada por el usuario es segura
   * frente a ataques ReDoS (retroceso catastrófico).
   * @param {string} pattern
   * @returns {boolean}
   */
  function isSafeRegex(pattern) {
    if (!pattern || typeof pattern !== 'string') return false;
    if (pattern.length > 200) return false;
    try {
      new RegExp(pattern); // valida sintaxis
    } catch {
      return false;
    }
    // Rechazar patrones que coincidan con formas peligrosas conocidas
    return !REDOS_PATTERNS.some((p) => p.test(pattern));
  }

  const filterImages = useCallback(() => {
    // Por defecto mostramos todas las imágenes detectadas.
    // only_images_from_links solo se aplica si el usuario lo habilita y hay imágenes de enlaces.
    let visible = allImages;

    // Filtro por URL
    let filterValue = options.filter_url;
    if (filterValue) {
      switch (options.filter_url_mode) {
        case 'normal': {
          const terms = filterValue.split(/\s+/);
          visible = visible.filter((url) => {
            for (let i = 0; i < terms.length; i++) {
              let term = terms[i];
              if (term.length === 0) continue;
              const expected = term[0] !== '-';
              if (!expected) term = term.substr(1);
              if (term.length === 0) continue;
              const found = url.indexOf(term) !== -1;
              if (found !== expected) return false;
            }
            return true;
          });
          break;
        }
        case 'wildcard': {
          filterValue = filterValue
            .replace(/([.^$[\]\\(){}|-])/g, '\\$1')
            .replace(/([?*+])/g, '.$1');
          // Después de transformar wildcard a regex, continúa al caso regex
        }
        case 'regex': {
          // Protección contra ReDoS: validar que el regex del usuario no sea peligroso
          if (!isSafeRegex(filterValue)) {
            // Patrón inseguro o demasiado largo: no filtrar por regex
            break;
          }
          visible = visible.filter((url) => {
            try {
              return url.match(filterValue);
            } catch {
              return false;
            }
          });
          break;
        }
      }
    }

    // Filtro por dominio (NUEVO v2.0.0)
    if (options.domain_filter_enabled === 'true' && options.domain_filter) {
      const terms = options.domain_filter.split(/\s+/).map((t) => t.trim().toLowerCase());
      const mode = options.domain_filter_mode; // 'allow' o 'block'
      visible = visible.filter((url) => {
        try {
          const hostname = new URL(url).hostname.toLowerCase();
          const matches = terms.some((t) => hostname.includes(t));
          return mode === 'allow' ? matches : !matches;
        } catch {
          return mode === 'block';
        }
      });
    }

    // Filtro por tamaño (usa imágenes cacheadas para naturalWidth/Height)
    visible = visible.filter((url) => {
      const image = imagesCacheRef.current?.querySelector(
        `img[src="${encodeURI(url)}"]`
      );
      if (!image) return true; // Si no está en caché, dejar pasar

      return (
        (options.filter_min_width_enabled !== 'true' ||
          options.filter_min_width <= image.naturalWidth) &&
        (options.filter_max_width_enabled !== 'true' ||
          image.naturalWidth <= options.filter_max_width) &&
        (options.filter_min_height_enabled !== 'true' ||
          options.filter_min_height <= image.naturalHeight) &&
        (options.filter_max_height_enabled !== 'true' ||
          image.naturalHeight <= options.filter_max_height)
      );
    });

    setVisibleImages(visible);
  }, [allImages, options]);

  useEffect(filterImages, [allImages, options]);

  // ============================================================================
  // 3. Historial de descargas
  // ============================================================================

  const loadHistory = useCallback(async () => {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'getHistory' },
          (resp) => resolve(resp)
        );
      });
      if (response && response.type === 'history') {
        setDownloadHistory(response.history || []);
      }
    } catch (e) {
      console.error('[Download - Image] Error cargando historial:', e);
    } finally {
      setHistoryIsLoaded(true);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'clearHistory' }, (resp) => resolve(resp));
      });
      setDownloadHistory([]);
    } catch (e) {
      console.error('[Download - Image] Error limpiando historial:', e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ============================================================================
  // 4. Descarga de imágenes
  // ============================================================================

  const imagesToDownload = useMemo(
    () => visibleImages.filter(isIncludedIn(selectedImages)),
    [visibleImages, selectedImages]
  );

  const [downloadConfirmationIsShown, setDownloadConfirmationIsShown] =
    useState(false);

  const maybeDownloadImages = () => {
    if (options.show_download_confirmation === 'true') {
      setDownloadConfirmationIsShown(true);
    } else {
      startDownload();
    }
  };

  const startDownload = async () => {
    setDownloadIsInProgress(true);
    setDownloadProgress({ processed: 0, total: imagesToDownload.length, percent: 0, currentProgress: 0 });

    try {
      await actions.downloadImages(imagesToDownload, options);
    } finally {
      setDownloadIsInProgress(false);
      setDownloadProgress({
        processed: imagesToDownload.length,
        total: imagesToDownload.length,
        percent: 100,
        currentProgress: 100,
      });
      // Refrescar historial tras descarga
      loadHistory();
    }
  };

  // Escuchar progreso del background (sendResponse es asíncrono, usamos onMessage)
  useEffect(() => {
    const listener = (message, sender, sendResponse) => {
      if (message.type === 'progress') {
        setDownloadProgress({
          processed: message.processed,
          total: message.total,
          percent: message.percent,
          currentProgress: message.currentProgress,
        });
      }
      if (message.type === 'complete') {
        setDownloadIsInProgress(false);
        setDownloadProgress({
          processed: message.processed,
          total: message.total,
          percent: 100,
          currentProgress: 100,
        });
        loadHistory();
      }
      return true;
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(listener);
    }
    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
  }, [loadHistory]);

  // ============================================================================
  // 6. Modo oscuro
  // ============================================================================

  const toggleDarkMode = () => {
    const enabled = options.enable_dark_mode === 'true';
    setOptions((o) => ({
      ...o,
      enable_dark_mode: (!enabled).toString(),
    }));
    document.body.classList.toggle('dark-mode', !enabled);
  };

  // Modo oscuro activado por defecto
  useEffect(() => {
    if (options.enable_dark_mode !== 'false') {
      setOptions((o) => ({ ...o, enable_dark_mode: 'true' }));
    }
    document.body.classList.toggle('dark-mode', options.enable_dark_mode !== 'false');
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  const runAfterUpdate = useRunAfterUpdate();

  return html`
    <div id="filters_container">
      <!-- Header -->
      <div style=${{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
        <div style=${{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style=${{ fontWeight: 'bold', fontSize: '16px' }}>🖼️ Download - Image</span>
          <span style=${{ fontSize: '11px', opacity: 0.7 }}>v1.0.0</span>
        </div>

        <div style=${{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            id="btn_dark_mode"
            title="Alternar modo oscuro"
            onClick=${toggleDarkMode}
            style=${{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', minWidth: '70px', justifyContent: 'center' }}
          >
            ${options.enable_dark_mode === 'true' ? 'Día' : 'Noche'}
          </button>
        </div>
      </div>

      <!-- Filtro de URL -->
      <div style=${{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <input
          type="text"
          placeholder="Filtrar por URL"
          title="Filtrar por partes de la URL o expresiones regulares."
          value=${options.filter_url}
          style=${{ flex: '1' }}
          onChange=${({ currentTarget: { value } }) => {
            setOptions((options) => ({ ...options, filter_url: value.trim() }));
          }}
        />

        <${UrlFilterMode}
          value=${options.filter_url_mode}
          onChange=${({ currentTarget: { value } }) => {
            setOptions((options) => ({ ...options, filter_url_mode: value }));
          }}
        />

        <button
          id="toggle_advanced_filters_button"
          class=${options.show_advanced_filters === 'true' ? '' : 'collapsed'}
          title="Alternar filtros avanzados"
          onClick=${() => {
            setOptions((options) => ({
              ...options,
              show_advanced_filters:
                options.show_advanced_filters === 'true' ? 'false' : 'true',
            }));
          }}
        >
          <img class="toggle" src="/images/times.svg" />
        </button>

        <button
          id="open_options_button"
          title="Opciones"
          onClick=${() => chrome.runtime.openOptionsPage()}
        >
          <img src="/images/cog.svg" />
        </button>
      </div>

      <!-- Filtro por dominio (NUEVO v2.0.0) -->
      <div style=${{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
        <label style=${{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked=${options.domain_filter_enabled === 'true'}
            onChange=${({ currentTarget: { checked } }) => {
              setOptions((o) => ({ ...o, domain_filter_enabled: checked.toString() }));
            }}
          />
          <span style=${{ fontSize: '11px', fontWeight: 'bold' }}>Dominio:</span>
        </label>

        <input
          type="text"
          placeholder="ej. instagram.com pinterest.com"
          title="Dominios separados por espacio"
          value=${options.domain_filter}
          style=${{ flex: '1', fontSize: '11px' }}
          onChange=${({ currentTarget: { value } }) => {
            setOptions((o) => ({ ...o, domain_filter: value.trim() }));
          }}
        />

        <select
          value=${options.domain_filter_mode}
          onChange=${({ currentTarget: { value } }) => {
            setOptions((o) => ({ ...o, domain_filter_mode: value }));
          }}
          style=${{ fontSize: '11px' }}
        >
          <option value="block">Bloquear</option>
          <option value="allow">Solo permitir</option>
        </select>
      </div>

      ${options.show_advanced_filters === 'true' &&
      html`
        <${AdvancedFilters} options=${options} setOptions=${setOptions} />
      `}
    </div>

    <!-- Imágenes en caché para medir tamaño -->
    <div ref=${imagesCacheRef} class="hidden">
      ${allImages.map(
        (url) => html`<img src=${encodeURI(url)} onLoad=${filterImages} />`
      )}
    </div>

    <!-- Galería de imágenes -->
    <${Images}
      options=${options}
      visibleImages=${visibleImages}
      selectedImages=${selectedImages}
      imagesToDownload=${imagesToDownload}
      setSelectedImages=${setSelectedImages}
    />

    <!-- Barra de progreso de descarga (NUEVO v2.0.0) -->
    ${downloadIsInProgress || downloadProgress.percent > 0 ? html`
      <div id="download_progress_container" style=${{
        margin: '8px 0',
        padding: '8px',
        background: 'var(--neutral-lighter)',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--border-color)',
      }}>
        <div style=${{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
          <span>Descargando imágenes</span>
          <span>${downloadProgress.processed} / ${downloadProgress.total}</span>
        </div>
        <div
          style=${{
            width: '100%',
            height: '6px',
            background: 'var(--input-background)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style=${{
              width: `${downloadProgress.percent}%`,
              height: '100%',
              background: 'var(--accent)',
              transition: 'width 300ms ease-out',
            }}
          ></div>
        </div>
        <div style=${{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
          ${downloadProgress.currentProgress}% imagen actual
        </div>
      </div>
    ` : ''}

    <!-- Controles de descarga -->
    <div
      id="downloads_container"
      style=${{
        gridTemplateColumns: `${
          options.show_file_renaming === 'true'
            ? 'minmax(100px, 1fr)'
            : ''
        } minmax(100px, 1fr) 80px`,
      }}
    >
      <input
        type="text"
        placeholder="Guardar en subcarpeta"
        title="Nombre de la subcarpeta para las descargas"
        value=${options.folder_name}
        onChange=${({ currentTarget: input }) => {
          const savedSelectionStart = removeSpecialCharacters(
            input.value.slice(0, input.selectionStart),
          ).length;

          runAfterUpdate(() => {
            input.selectionStart = input.selectionEnd = savedSelectionStart;
          });

          setOptions((options) => ({
            ...options,
            folder_name: removeSpecialCharacters(input.value),
          }));
        }}
      />

      ${options.show_file_renaming === 'true' &&
      html`
        <input
          type="text"
          placeholder="Renombrar archivos"
          title="Nuevo nombre para los archivos descargados"
          value=${options.new_file_name}
          onChange=${({ currentTarget: input }) => {
            const savedSelectionStart = removeSpecialCharacters(
              input.value.slice(0, input.selectionStart),
            ).length;

            runAfterUpdate(() => {
              input.selectionStart = input.selectionEnd = savedSelectionStart;
            });

            setOptions((options) => ({
              ...options,
              new_file_name: removeSpecialCharacters(input.value),
            }));
          }}
        />
      `}

      <${DownloadButton}
        disabled=${imagesToDownload.length === 0}
        loading=${downloadIsInProgress}
        onClick=${maybeDownloadImages}
      />

      ${downloadConfirmationIsShown &&
      html`
        <${DownloadConfirmation}
          onCheckboxChange=${({ currentTarget: { checked } }) => {
            setOptions((options) => ({
              ...options,
              show_download_confirmation: (!checked).toString(),
            }));
          }}
          onClose=${() => setDownloadConfirmationIsShown(false)}
          onConfirm=${startDownload}
        />
      `}
    </div>

    <!-- Historial de descargas (NUEVO v2.0.0) -->
    ${historyIsLoaded && downloadHistory.length > 0 ? html`
      <details id="history_panel">
        <summary style=${{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
          📜 Historial de descargas (${downloadHistory.length})
          <span style=${{ float: 'right', cursor: 'pointer', fontSize: '10px' }} onClick=${clearHistory}>Borrar todo</span>
        </summary>
        <div style=${{ maxHeight: '200px', overflowY: 'auto', marginTop: '4px', fontSize: '11px' }}>
          ${downloadHistory
            .slice()
            .reverse()
            .slice(0, 20)
            .map(
              (item) => html`
                <div style=${{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '2px 4px',
                  borderBottom: '1px solid var(--border-color)',
                  opacity: item.status === 'failed' ? 0.6 : 1,
                }}>
                  <span title=${item.url}>
                    ${item.status === 'failed' ? '❌' : '✅'} ${item.url.length > 40 ? item.url.substring(0, 37) + '...' : item.url}
                  </span>
                  <span style=${{ color: item.status === 'failed' ? 'var(--danger)' : 'var(--success)' }}>
                    ${item.status === 'failed' ? 'Error' : item.progress + '%'}
                  </span>
                </div>
              `
            )}
        </div>
      </details>
    ` : ''}
  `;
};

// ============================================================================
// findImages — Ejecutado en el contexto de la página (fallback)
// ============================================================================

function findImages() {
  const imageUrlRegex =
    /(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*\.(?:bmp|gif|ico|jfif|jpe?g|png|svg|tiff?|webp|avif))(?:\?([^#]*))?(?:#(.*))?/i;

  const mediaDomains = [
    'instagram.com', 'cdninstagram.com', 'fbcdn.net', 'facebook.com',
    'pinterest.com', 'pinimg.com', 'twitter.com', 'x.com', 'twimg.com',
    'reddit.com', 'redditstatic.com', 'imgur.com', 'giphy.com',
    'tiktok.com', 'ytimg.com', 'youtube.com',
  ];

  function isImageUrl(url) {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    if (url.startsWith('blob:')) return true;
    if (imageUrlRegex.test(url)) return true;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (mediaDomains.some((d) => hostname.includes(d))) return true;

      // Aceptar URLs sin extensión de imagen que parecen rutas de imagen
      const pathname = new URL(url).pathname.toLowerCase();
      const imagePathRegex = /\/(?:img|image|photo|pic|picture|thumb|thumbnail|media|assets|uploads|static)\//i;
      if (imagePathRegex.test(pathname)) return true;
    } catch (e) {
      return false;
    }
    return false;
  }

  function extractFromElement(el) {
    const results = [];
    const tag = el.tagName.toLowerCase();

    if (tag === 'img' || tag === 'image') {
      const src = el.src || el.getAttribute('src') || el.getAttribute('xlink:href');
      if (src) results.push(src);
      const srcset = el.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach((part) => {
          const u = part.trim().split(/\s+/)[0];
          if (u) results.push(u);
        });
      }
      const dataSrc = el.getAttribute('data-src');
      if (dataSrc) results.push(dataSrc);
      const dataSrcset = el.getAttribute('data-srcset');
      if (dataSrcset) {
        dataSrcset.split(',').forEach((part) => {
          const u = part.trim().split(/\s+/)[0];
          if (u) results.push(u);
        });
      }
    }

    if (tag === 'a') {
      const href = el.href;
      if (href && isImageUrl(href)) results.push(href);
    }

    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && isImageUrl(match[1])) results.push(match[1]);
    }

    return results.map(toAbsolute).filter(isImageUrl);
  }

  function extractImagesFromSelector(selector) {
    return unique(
      toArray(document.querySelectorAll(selector))
        .map(extractFromElement)
        .filter((arr) => arr.length > 0)
        .flat()
        .map(relativeUrlToAbsolute)
    );
  }

  function toAbsolute(url) {
    try {
      return new URL(url, window.location.origin).href;
    } catch (e) {
      return url;
    }
  }

  function relativeUrlToAbsolute(url) {
    return url.indexOf('/') === 0 ? `${window.location.origin}${url}` : url;
  }

  function unique(values) {
    return toArray(new Set(values));
  }

  function toArray(values) {
    return [...values];
  }

  const all = unique(
    extractImagesFromSelector(
      'img, image, a, [srcset], [data-src], [data-srcset], ' +
      '[class*="img"], [class*="photo"], [class*="pic"], [class*="thumb"], ' +
      '[style*="background"], [style*="url"], [role="img"], ' +
      'div[style*="background-image"]'
    )
  );

  return {
    allImages: all,
    linkedImages: unique(
      extractImagesFromSelector('a')
    ),
    origin: window.location.origin,
  };
}

try {
  const rootEl = document.querySelector('main') || document.body;
  if (rootEl) render(html`<${Popup} />`, rootEl);
  else {
    const retry = () => {
      const el = document.querySelector('main') || document.body;
      if (el) render(html`<${Popup} />`, el);
      else setTimeout(retry, 50);
    };
    setTimeout(retry, 50);
  }
} catch (e) {
  console.error('[Download - Image] Render error:', e);
}
