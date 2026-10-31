// ============================================================================
// Download - Image — Background Service Worker (v2.0.0)
// ============================================================================
// Maneja descargas en segundo plano, historial persistente, progreso en tiempo
// real y notificaciones. Comunicación con el popup vía chrome.runtime.onMessage
// y con el content script para coordinar descargas.
// ============================================================================

// @ts-check

import {
  runtimeSendMessage,
  runtimeOnMessage,
  runtimeOpenOptionsPage,
  runtimeGetURL,
  tabsCreate,
  storageGet as _storageGet,
  storageSet as _storageSet,
  storageRemove as _storageRemove,
  storageOnChanged as _storageOnChanged,
  downloadsDownload as _downloadsDownload,
  downloadsOnChanged as _downloadsOnChanged,
  downloadsOnDeterminingFilename as _downloadsOnDeterminingFilename,
  notificationsCreate as _notificationsCreate,
  runtimeOnInstalled as _runtimeOnInstalled,
} from '../utils/browserWrappers.js';

// Tipo de registro de descarga individual.
/** @typedef {{ id: number, url: string, filename: string, status: string, progress: number, bytesReceived: number, totalBytes: number, error: string, timestamp: number }} DownloadRecord */

// Estado de tareas activas (descargas en curso).
/** @type {Set<DownloadRecord>} */
const activeTasks = new Set();

// Mapa de downloadId -> registro para seguimiento individual.
// /** @type {Map<number, DownloadRecord>} */
const downloadMap = new Map();

// ---------------------------------------------------------------------------
// Helpers de storage con promesas sobre los wrappers (envuelven callbacks en Promises)
// ---------------------------------------------------------------------------

function storageGet(keys) {
  return new Promise((resolve) => { _storageGet(keys, (r) => resolve(r || {})); });
}
function storageSet(items) {
  return new Promise((resolve) => { _storageSet(items, resolve); });
}
function storageRemove(keys) {
  return new Promise((resolve) => { _storageRemove(keys, resolve); });
}

// ---------------------------------------------------------------------------
// Historial persistente (chrome.storage.local)
// ---------------------------------------------------------------------------

/**
 * Carga el historial de descargas desde storage.
 * @returns {Promise<DownloadRecord[]>}
 */
async function loadHistory() {
  const result = await storageGet(['mid_download_history']);
  return Array.isArray(result.mid_download_history) ? result.mid_download_history : [];
}

/**
 * Guarda el historial en storage (máximo 500 entradas, elimina las más antiguas).
 * @param {DownloadRecord[]} history
 */
async function saveHistory(history) {
  const trimmed = history.slice(-500);
  await storageSet({ mid_download_history: trimmed });
}

/**
 * Agrega una entrada al historial.
 * @param {DownloadRecord} record
 */
async function addToHistory(record) {
  const history = await loadHistory();
  history.push(record);
  await saveHistory(history);
}

/**
 * Actualiza una entrada del historial por downloadId.
 * @param {number} downloadId
 * @param {Partial<DownloadRecord>} changes
 */
async function updateHistoryById(downloadId, changes) {
  const history = await loadHistory();
  const index = history.findIndex((h) => h.id === downloadId);
  if (index !== -1) {
    Object.assign(history[index], changes);
    await saveHistory(history);
  }
}

// ---------------------------------------------------------------------------
// Notificaciones
// ---------------------------------------------------------------------------

/**
 * Muestra una notificación del navegador (si el usuario las tiene habilitadas).
 * @param {string} title
 * @param {string} message
 * @param {string} iconUrl
 */
function showNotification(title, message, iconUrl = 'images/logo.svg') {
  // Las notificaciones son opcionales: NUNCA deben lanzar promesas no capturadas.
  // Se envuelve TODO en promesas que nunca se rechazan para evitar fallos silenciosos.
  try {
    if (typeof chrome === 'undefined' || !chrome.notifications || !chrome.notifications.create) {
      return;
    }

    // Verificar si el usuario tiene notificaciones habilitadas
    chrome.storage.local.get(['show_notifications']).then((stored) => {
      if (stored.show_notifications === 'false') return;

      // Resolver icono de forma segura
      let resolvedIconUrl = iconUrl;
      try {
        resolvedIconUrl = chrome.runtime.getURL(iconUrl);
      } catch (e) {
        resolvedIconUrl = iconUrl;
      }

      // Envolver chrome.notifications.create en una promesa que nunca se rechaza
      new Promise((resolve) => {
        try {
          const result = chrome.notifications.create({
            type: 'basic',
            iconUrl: resolvedIconUrl,
            title,
            message,
            priority: 1,
          });
          if (result && typeof result.then === 'function') {
            result.then(resolve).catch(resolve);
          } else {
            resolve(result);
          }
        } catch (e) {
          resolve();
        }
      }).catch(() => {
        // Nunca dejar que se propague una promesa rechazada
      });
    }).catch(() => {
      // Ignorar errores de storage; nunca propagar
    });
  } catch (e) {
    // Ignorar cualquier error; las notificaciones son opcionales
  }
}

// ---------------------------------------------------------------------------
// Normalización de nombres de archivo
// ---------------------------------------------------------------------------

function normalizeSlashes(filename) {
  return filename.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
}

/**
 * Sanitiza un nombre de archivo para prevenir path traversal y caracteres
 * no permitidos en sistemas de archivos.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') return '';
  let clean = String(name);
  // Eliminar caracteres de control y nulos
  clean = clean.replace(/[\x00-\x1f\x7f]/g, '');
  // Reemplazar separadores de ruta por guion bajo (evita crear subcarpetas)
  clean = clean.replace(/[/\\]/g, '_');
  // Eliminar segmentos peligrosos (.., .)
  const parts = clean.split('/').map((p) => p.trim()).filter((p) => p !== '' && p !== '.' && p !== '..');
  clean = parts.join('_');
  // Caracteres prohibidos en Windows/Linux/macOS
  clean = clean.replace(/[<>:"|?*]/g, '');
  // Limitar longitud a 200 caracteres
  if (clean.length > 200) clean = clean.slice(0, 200);
  if (!clean || clean === '_' || clean === '.') clean = 'download';
  return clean;
}

/**
 * Sanitiza el nombre de carpeta del usuario.
 * @param {string} folder
 * @returns {string}
 */
function sanitizeFolderName(folder) {
  if (!folder || typeof folder !== 'string') return '';

  // Rechazar rutas absolutas de Windows (C:, D:, etc.) o rutas de red (\\)
  // para que la extensión funcione en cualquier PC sin depender de una letra de unidad.
  if (/^[a-zA-Z]:[\\/]/.test(folder) || /^\\\\/.test(folder)) {
    return '';
  }

  return sanitizeFilename(folder);
}

// ---------------------------------------------------------------------------
// Lógica de descarga (secuencial, con listener único y timeout de seguridad)
// ---------------------------------------------------------------------------

/** @type {Map<number, { resolve: Function, record: DownloadRecord, timeoutId: number }>} */
const pendingDownloads = new Map();

// Tiempo máximo de espera por descarga (10 minutos)
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Registra un listener único de downloads.onChanged a nivel de módulo.
 * Esto evita fugas de listeners: antes se añadía un listener por descarga
 * y si la promesa nunca se resolvía, el listener quedaba para siempre.
 */
function registerOnChangedListener() {
  const listener = (delta) => {
    const id = delta.id;
    if (!id || !pendingDownloads.has(id)) return;

    const entry = pendingDownloads.get(id);
    const record = entry.record;
    const resolve = entry.resolve;
    const timeoutId = entry.timeoutId;

    if (delta.state && delta.state.current === 'complete') {
      record.status = 'complete';
      record.progress = 100;
      activeTasks.delete(record);
      downloadMap.delete(id);
      pendingDownloads.delete(id);
      clearTimeout(timeoutId);
      addToHistory(record).then(resolve);
      return;
    }

    if (
      delta.state &&
      (delta.state.current === 'interrupted' || delta.state.current === 'cancelled')
    ) {
      record.status = 'failed';
      record.error = delta.error ? delta.error.current : 'interrupted';
      activeTasks.delete(record);
      downloadMap.delete(id);
      pendingDownloads.delete(id);
      clearTimeout(timeoutId);
      addToHistory(record).then(resolve);
      return;
    }

    if (delta.bytesReceived && delta.totalBytes) {
      record.bytesReceived = delta.bytesReceived.current;
      record.totalBytes = delta.totalBytes.current;
      record.progress = Math.round(
        (record.bytesReceived / record.totalBytes) * 100
      );
    }
  };

  const remove = _downloadsOnChanged(listener);
  return remove;
}

// Registrar listener único al cargar el service worker
registerOnChangedListener();

/**
 * Construye un registro de fallo con id único.
 * @param {string} imageUrl
 * @param {number} timestamp
 * @param {string} error
 * @returns {DownloadRecord}
 */
function buildFailedRecord(imageUrl, timestamp, error) {
  return {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000), // id único, evita colisión con -1
    url: imageUrl,
    filename: '',
    status: 'failed',
    progress: 0,
    bytesReceived: 0,
    totalBytes: 0,
    error,
    timestamp,
  };
}

/**
 * Descarga una única imagen y espera a que finalice o falle.
 * Usa el listener único de onChanged y un timeout de seguridad.
 * Siempre retorna un DownloadRecord (nunca undefined).
 * @param {string} imageUrl
 * @returns {Promise<DownloadRecord>}
 */
async function downloadOne(imageUrl) {
  const startTime = Date.now();

  // Validar esquema: solo http:/https: se descargan vía API del navegador.
  // Se rechazan javascript:, file:, ftp:, data:, blob: y cualquier otro esquema no seguro.
  let proto;
  try {
    proto = new URL(imageUrl).protocol.toLowerCase();
  } catch (e) {
    const failedRecord = buildFailedRecord(imageUrl, startTime, 'URL inválida');
    await addToHistory(failedRecord);
    return failedRecord;
  }
  if (proto !== 'http:' && proto !== 'https:') {
    const failedRecord = buildFailedRecord(imageUrl, startTime, `Esquema no soportado: ${proto}`);
    await addToHistory(failedRecord);
    return failedRecord;
  }

  let downloadId;
  try {
    downloadId = await new Promise((resolve, reject) => {
      // Usar la API nativa cuando esté disponible (Chrome/Edge/Opera/Brave)
      // para mantener compatibilidad con el manejo de errores original.
      // El wrapper se usa solo como fallback para Firefox/Safari.
      if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({ url: imageUrl }, (id) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'download failed'));
            chrome.runtime.lastError = undefined;
            return;
          }
          if (id == null) {
            reject(new Error('download failed'));
            return;
          }
          resolve(id);
        });
      } else {
        _downloadsDownload({ url: imageUrl }, (id) => {
          if (id == null) {
            reject(new Error('download failed'));
            return;
          }
          resolve(id);
        });
      }
    });
  } catch (err) {
    const failedRecord = buildFailedRecord(imageUrl, startTime, err.message || 'download failed');
    await addToHistory(failedRecord);
    return failedRecord;
  }

  const record = {
    id: downloadId,
    url: imageUrl,
    filename: '',
    status: 'in_progress',
    progress: 0,
    bytesReceived: 0,
    totalBytes: 0,
    error: '',
    timestamp: startTime,
  };

  activeTasks.add(record);
  downloadMap.set(downloadId, record);

  const result = await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      if (!pendingDownloads.has(downloadId)) return;
      record.status = 'failed';
      record.error = 'timeout';
      activeTasks.delete(record);
      downloadMap.delete(downloadId);
      pendingDownloads.delete(downloadId);
      addToHistory(record).then(resolve);
    }, DOWNLOAD_TIMEOUT_MS);

    pendingDownloads.set(downloadId, { resolve, record, timeoutId });
  });

  // Si por alguna razón el promise resuelve con undefined, retornar el record actual
  return result || record;
}

/** Número máximo de descargas simultáneas. */
const MAX_CONCURRENT_DOWNLOADS = 4;

/**
 * Descarga imágenes con concurrencia limitada (hasta MAX_CONCURRENT_DOWNLOADS
 * a la vez), registrando progreso e historial. El orden de las descargas se
 * mantiene: se procesan en la secuencia dada, pero hasta 4 pueden estar en
 * vuelo simultáneamente para acelerar lotes grandes.
 * @param {Object} task
 * @param {string[]} task.imagesToDownload
 * @param {Object} task.options
 * @param {Function} task.onProgress - callback(processed, total, currentProgress)
 * @param {Function} task.onComplete - callback()
 */
async function downloadImages(task) {
  const { imagesToDownload, options, onProgress, onComplete } = task;
  const total = imagesToDownload.length;
  let processed = 0;
  let index = 0;
  let inFlight = 0;
  const workers = [];

  const launchNext = () => {
    if (index >= imagesToDownload.length) return null;
    const url = imagesToDownload[index];
    index += 1;
    inFlight += 1;
    return downloadOne(url)
      .then((record) => {
        inFlight -= 1;
        processed += 1;
        if (record && record.status === 'complete') {
          onProgress?.(processed, total, 100);
        } else {
          onProgress?.(processed, total, 0);
        }
        // Lanzar la siguiente descarga si queda trabajo
        const next = launchNext();
        if (next) workers.push(next);
        return record;
      })
      .catch((err) => {
        inFlight -= 1;
        processed += 1;
        onProgress?.(processed, total, 0);
        console.error(`[Download - Image] Error descargando ${url}:`, err.message);
        const next = launchNext();
        if (next) workers.push(next);
        return null;
      });
  };

  // Iniciar los primeros workers (hasta MAX_CONCURRENT_DOWNLOADS)
  for (let i = 0; i < MAX_CONCURRENT_DOWNLOADS && index < imagesToDownload.length; i += 1) {
    workers.push(launchNext());
  }

  await Promise.all(workers);

  onComplete?.();
  await showNotification(
    'Descarga completada',
    `Se procesaron ${processed} de ${total} imágenes`
  );
}

// ---------------------------------------------------------------------------
// Sugerencia de nombre de archivo (renombrado + carpeta)
// ---------------------------------------------------------------------------

/**
 * Sugiere un nuevo nombre de archivo basado en las opciones del usuario.
 * @param {chrome.downloads.DownloadItem} item
 * @param {(suggestion: chrome.downloads.DownloadFilenameSuggestion) => void} suggest
 */
function suggestNewFilename(item, suggest) {
  const task = [...activeTasks][0];
  if (!task) {
    suggest();
    return;
  }

  let newFilename = '';
  if (options_folder_name) {
    const safeFolder = sanitizeFolderName(options_folder_name);
    if (safeFolder) newFilename += `${safeFolder}/`;
  }

  if (options_new_file_name) {
    const extensionMatch = /(?:\.([^.]+))?$/.exec(item.filename);
    const extension = extensionMatch ? extensionMatch[1] : '';
    const digits = activeTasks.size.toString().length;
    const padded = (activeTasks.size).toString().padStart(digits, '0');
    const safeNewFileName = sanitizeFilename(options_new_file_name);
    newFilename += `${safeNewFileName}${padded}.${extension}`;
  } else {
    newFilename += sanitizeFilename(item.filename);
  }

  suggest({ filename: normalizeSlashes(newFilename) });
}

// Variables para opciones de renombrado (leídas al vuelo desde storage)
let options_folder_name = '';
let options_new_file_name = '';

_storageOnChanged((changes) => {
  if (changes.folder_name) options_folder_name = changes.folder_name.newValue;
  if (changes.new_file_name) options_new_file_name = changes.new_file_name.newValue;
});

// Inicializar valores
storageGet(['folder_name', 'new_file_name']).then((result) => {
  options_folder_name = result.folder_name || '';
  options_new_file_name = result.new_file_name || '';
});

// ---------------------------------------------------------------------------
// Mensajes del popup
// ---------------------------------------------------------------------------

runtimeOnMessage((message, sender, sendResponse) => {
  if (message.type === 'downloadImages') {
    const { imagesToDownload, options } = message;

    options_folder_name = options.folder_name || '';
    options_new_file_name = options.new_file_name || '';

    let current = 0;
    const total = imagesToDownload.length;

    const onProgress = (processed, pct) => {
      current = processed;
      sendResponse?.({
        type: 'progress',
        processed,
        total,
        percent: Math.round((processed / total) * 100),
        currentProgress: pct,
      });
      return true;
    };

    downloadImages({
      imagesToDownload,
      options,
      onProgress,
      onComplete: () => {
        sendResponse?.({
          type: 'complete',
          processed: total,
          total,
          percent: 100,
        });
      },
    });

    return true; // Mantener canal abierto para respuestas asíncronas
  }

  if (message.type === 'getHistory') {
    loadHistory().then((history) => sendResponse({ type: 'history', history }));
    return true;
  }

  if (message.type === 'clearHistory') {
    storageRemove(['mid_download_history']).then(() => {
      sendResponse({ type: 'cleared' });
    });
    return true;
  }

  if (message.type === 'getActiveDownloads') {
    sendResponse({
      type: 'active',
      downloads: Array.from(activeTasks).map((t) => ({
        id: t.id,
        url: t.url,
        status: t.status,
        progress: t.progress,
      })),
    });
    return true;
  }

  return false;
});

_downloadsOnDeterminingFilename(suggestNewFilename);

// Instalación / actualización
_runtimeOnInstalled((details) => {
  if (details.reason === 'install') {
    tabsCreate({ url: 'src/Options/index.html' });
    showNotification(
      'Download - Image',
      'Extensión instalada correctamente. ¡Comienza a descargar imágenes!'
    );
  }
});

console.log('[Download - Image] Service worker activo');
