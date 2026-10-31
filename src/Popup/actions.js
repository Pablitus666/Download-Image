// Puente de comunicación con el service worker para iniciar descargas.
// Envía un mensaje de tipo 'downloadImages' al background y espera la respuesta.
export const downloadImages = (imagesToDownload, options) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'downloadImages', imagesToDownload, options },
      resolve
    );
  });
};
