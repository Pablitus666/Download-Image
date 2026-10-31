// ============================================================================
// Download - Image — Browser API Wrappers (cross-browser, safe fallbacks)
// ============================================================================
// Envolturas seguras sobre `chrome` / `browser`. Cada función:
//   1. Verifica que la API exista antes de llamarla (no lanza si falta).
//   2. Acepta un callback estilo Chrome (o devuelve undefined si no hay API).
//   3. Devuelve una función de desregistro para listeners (no-op si no hay API).
//
// Úselas en lugar de llamar a `chrome.*` directamente para que la extensión
// funcione en Safari, Firefox, Edge y Opera sin romperse.
// ============================================================================

import { browser, hasApi } from './browser.js';

// ---------------------------------------------------------------------------
// runtime
// ---------------------------------------------------------------------------

/** Envía un mensaje al background / service worker. */
export const runtimeSendMessage = (message, callback) => {
  if (!hasApi('runtime.sendMessage')) {
    return callback ? callback(undefined) : undefined;
  }
  return browser.runtime.sendMessage(message, callback);
};

/** Registra un listener de mensajes. Devuelve función para removerlo. */
export const runtimeOnMessage = (listener) => {
  if (!hasApi('runtime.onMessage.addListener')) {
    return () => {};
  }
  browser.runtime.onMessage.addListener(listener);
  return () => {
    try { browser.runtime.onMessage.removeListener(listener); } catch (e) {}
  };
};

/** Abre la página de opciones (silencioso si no está disponible). */
export const runtimeOpenOptionsPage = () => {
  if (hasApi('runtime.openOptionsPage')) {
    browser.runtime.openOptionsPage();
  }
};

/** Resuelve una URL de recurso interno (iconos, imágenes). */
export const runtimeGetURL = (path) => {
  if (hasApi('runtime.getURL')) {
    return browser.runtime.getURL(path);
  }
  return path;
};

// ---------------------------------------------------------------------------
// tabs
// ---------------------------------------------------------------------------

export const tabsQuery = (queryInfo, callback) => {
  if (!hasApi('tabs.query')) {
    return callback ? callback([]) : undefined;
  }
  return browser.tabs.query(queryInfo, callback);
};

export const tabsCreate = (createProperties, callback) => {
  if (!hasApi('tabs.create')) {
    return callback ? callback(undefined) : undefined;
  }
  return browser.tabs.create(createProperties, callback);
};

export const tabsSendMessage = (tabId, message, callback) => {
  if (!hasApi('tabs.sendMessage')) {
    return callback ? callback(undefined) : undefined;
  }
  return browser.tabs.sendMessage(tabId, message, callback);
};

// ---------------------------------------------------------------------------
// windows
// ---------------------------------------------------------------------------

export const windowsGetCurrent = (callback) => {
  if (!hasApi('windows.getCurrent')) {
    return callback ? callback(undefined) : undefined;
  }
  return browser.windows.getCurrent(callback);
};

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

export const storageGet = (keys, callback) => {
  if (!hasApi('storage.local.get')) {
    return callback ? callback({}) : undefined;
  }
  return browser.storage.local.get(keys, callback);
};

export const storageSet = (items, callback) => {
  if (!hasApi('storage.local.set')) {
    return callback ? callback() : undefined;
  }
  return browser.storage.local.set(items, callback);
};

export const storageRemove = (keys, callback) => {
  if (!hasApi('storage.local.remove')) {
    return callback ? callback() : undefined;
  }
  return browser.storage.local.remove(keys, callback);
};

/** Registra listener de cambios en storage. Devuelve función para removerlo. */
export const storageOnChanged = (listener) => {
  if (!hasApi('storage.onChanged.addListener')) {
    return () => {};
  }
  browser.storage.onChanged.addListener(listener);
  return () => {
    try { browser.storage.onChanged.removeListener(listener); } catch (e) {}
  };
};

// ---------------------------------------------------------------------------
// downloads
// ---------------------------------------------------------------------------

export const downloadsDownload = (options, callback) => {
  if (!hasApi('downloads.download')) {
    return callback ? callback(undefined) : undefined;
  }
  return browser.downloads.download(options, callback);
};

/** Registra listener de cambios en descargas. Devuelve función para removerlo. */
export const downloadsOnChanged = (listener) => {
  if (!hasApi('downloads.onChanged.addListener')) {
    return () => {};
  }
  browser.downloads.onChanged.addListener(listener);
  return () => {
    try { browser.downloads.onChanged.removeListener(listener); } catch (e) {}
  };
};

/** Registra listener para determinar nombre de archivo. Devuelve función para removerlo. */
export const downloadsOnDeterminingFilename = (listener) => {
  if (!hasApi('downloads.onDeterminingFilename.addListener')) {
    return () => {};
  }
  browser.downloads.onDeterminingFilename.addListener(listener);
  return () => {
    try { browser.downloads.onDeterminingFilename.removeListener(listener); } catch (e) {}
  };
};

// ---------------------------------------------------------------------------
// runtime events (installed, etc.)
// ---------------------------------------------------------------------------

/** Registra listener de instalación/actualización de la extensión. */
export const runtimeOnInstalled = (listener) => {
  if (!hasApi('runtime.onInstalled.addListener')) {
    return () => {};
  }
  browser.runtime.onInstalled.addListener(listener);
  return () => {
    try { browser.runtime.onInstalled.removeListener(listener); } catch (e) {}
  };
};

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export const notificationsCreate = (options, callback) => {
  if (!hasApi('notifications.create')) {
    return callback ? callback(undefined) : undefined;
  }
  return browser.notifications.create(options, callback);
};

// ---------------------------------------------------------------------------
// scripting
// ---------------------------------------------------------------------------

export const scriptingExecuteScript = (options, callback) => {
  if (!hasApi('scripting.executeScript')) {
    return callback ? callback([]) : undefined;
  }
  return browser.scripting.executeScript(options, callback);
};
