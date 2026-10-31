import html from '../html.js';

// Componente de enlace externo con rel="nofollow noopener" y target="_blank"
// por seguridad (evita tabnabbing y no transfiere PageRank).
export const ExternalLink = ({ children, ...props }) => html`
  <a rel="nofollow noopener" target="_blank" ...${props}>
    ${children || props.href}
  </a>
`;
