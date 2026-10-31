// Valores por defecto de las opciones de la extensión.
// Cada clave se inicializa en localStorage solo si no existe ya, permitiendo
// que el usuario personalice valores sin que se sobrescriban al recargar.
// TODO: Convertir a módulo y separar en dos archivos (valores por defecto y lógica de localStorage).
const defaults = {
  // Filtros
  folder_name: 'Download-Image',
  new_file_name: '',
  filter_url: '',
  filter_url_mode: 'normal',
  filter_min_width: 200,
  filter_min_width_enabled: true,
  filter_max_width: 4000,
  filter_max_width_enabled: true,
  filter_min_height: 200,
  filter_min_height_enabled: true,
  filter_max_height: 4000,
  filter_max_height_enabled: true,
  only_images_from_links: false,
  show_advanced_filters: true,
  // Filtros de dominio (NUEVO - v2.0.0)
  domain_filter: '',
  domain_filter_mode: 'block',
  domain_filter_enabled: false,
  // Auto-scroll (NUEVO - v2.0.0)
  auto_scroll_enabled: false,
  auto_scroll_delay: 1500,
  auto_scroll_max: 10,
  // Opciones generales
  show_download_confirmation: true,
  show_file_renaming: true,
  show_progress_bar: true,
  show_notifications: true,
  enable_dark_mode: false,
  // Imágenes
  show_image_url: true,
  show_open_image_button: true,
  show_download_image_button: true,
  columns: 2,
  image_min_width: 50,
  image_max_width: 200,
};

/**
 * Escribe un valor en localStorage de forma segura (modo incógnito/privado
 * puede lanzar QuotaExceededError o deshabilitar localStorage).
 * @param {string} key
 * @param {string} value
 */
function safeSetLocalStorage(key, value) {
  try {
    localStorage[key] = value;
  } catch (e) {
    // localStorage no disponible (incógnito, cuota agotada, etc.); ignorar.
  }
}

Object.keys(defaults).forEach((option) => {
  try {
    if (localStorage[option] === undefined) {
      safeSetLocalStorage(option, defaults[option]);
    }
    // Guarda una copia del valor por defecto para poder restablecerlo luego
    safeSetLocalStorage(`${option}_default`, defaults[option]);
  } catch (e) {
    // Ignorar fallos por opción individual.
  }
});
