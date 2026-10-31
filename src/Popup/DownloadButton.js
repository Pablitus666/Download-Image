import html from '../html.js';

// Botón principal de descarga. Muestra estado de carga mientras se descarga.
export const DownloadButton = ({ disabled, loading, ...props }) => {
  const tooltipText = disabled
    ? 'Select some images to download first'
    : loading
    ? 'If you want, you can close the extension popup\nwhile the images are downloading!'
    : '';

  return html`
    <input
      type="button"
      class="accent ${loading ? 'loading' : ''}"
      value=${loading ? '•••' : 'Download'}
      disabled=${disabled || loading}
      title=${tooltipText}
      ...${props}
    />
  `;
};
