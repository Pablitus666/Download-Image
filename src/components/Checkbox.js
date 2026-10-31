import html from '../html.js';

// Componente de checkbox con soporte para estado indeterminado (tri-state).
// Usado en el selector "Seleccionar todo" de la galería de imágenes.
// Fuente: https://davidwalsh.name/react-indeterminate
export const Checkbox = ({
  children,
  class: className,
  indeterminate,
  style,
  title = '',
  ...props
}) => html`
  <label ...${{ className, title }}>
    <input
      ref=${setIndeterminate(indeterminate)}
      type="checkbox"
      style=${{ marginLeft: 0, ...style }}
      ...${props}
    />
    ${children}
  </label>
`;

// Establece la propiedad indeterminate del checkbox nativo cuando se monta.
// Recibe un booleano y devuelve un callback de ref de React.
const setIndeterminate = (indeterminate) => (element) => {
  if (element) {
    element.indeterminate = indeterminate;
  }
};
