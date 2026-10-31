import html from '../html.js';
import * as actions from './actions.js';

// Muestra la URL de la imagen en un input de sólo lectura.
// Al hacer clic selecciona todo el texto para copiar fácilmente.
export const ImageUrlTextbox = (props) => html`
  <input
    type="text"
    readonly
    onClick=${(e) => {
      e.currentTarget.select();
    }}
    ...${props}
  />
`;

// Botón para abrir la imagen en una pestaña nueva (sin activarla).
export const OpenImageButton = ({ imageUrl, onClick, ...props }) => {
  return html`
    <button
      type="button"
      title="Open in new tab"
      style=${{ backgroundImage: `url("/images/open.svg")` }}
      onClick=${(e) => {
        chrome.tabs.create({ url: imageUrl, active: false });
        if (onClick) {
          onClick(e);
        }
      }}
      ...${props}
    />
  `;
};

// Botón para descargar una imagen individual.
// Llama a actions.downloadImages con un array de una sola URL.
export const DownloadImageButton = ({
  imageUrl,
  options,
  onClick,
  ...props
}) => {
  return html`
    <button
      type="button"
      title="Download"
      style=${{ backgroundImage: `url("/images/download.svg")` }}
      onClick=${(e) => {
        actions.downloadImages([imageUrl], options);
        if (onClick) {
          onClick(e);
        }
      }}
      ...${props}
    />
  `;
};
