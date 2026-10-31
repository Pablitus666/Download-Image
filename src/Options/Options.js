import html, { render, useState } from '../html.js';

import { Checkbox } from '../components/Checkbox.js';
import { isNotStrictEqual } from '../utils.js';

import { About } from './About.js';

// Lee todas las opciones guardadas en localStorage (excepto las copias *_default).
const initialOptions = Object.keys(localStorage)
  .filter((key) => !key.endsWith('_default'))
  .reduce((options, key) => ({ ...options, [key]: localStorage[key] }), {});

// Lee los valores por defecto guardados (claves que terminan en _default).
const defaultOptions = Object.keys(localStorage)
  .filter((key) => key.endsWith('_default'))
  .reduce(
    (options, key) => ({
      ...options,
      [key.replace('_default', '')]: localStorage[key],
    }),
    {}
  );

// Sistema de notificaciones temporales (toasts) mostradas en la parte inferior del popup.
const useNotifications = (initialNotifications = []) => {
  const [notifications, setNotifications] = useState(initialNotifications);

  function addNotification(type, message) {
    setNotifications((notifications) => {
      // Remover notificaciones previas del mismo tipo para no acumular duplicados.
      const filtered = notifications.filter((n) => n.type !== type);
      const notification = { message, type };
      const removeNotificationAfterMs = 10_000;
      const updated = [notification, ...filtered].slice(0, 3); // máximo 3 visibles

      setTimeout(() => {
        setNotifications((current) =>
          current.filter((n) => n !== notification)
        );
      }, removeNotificationAfterMs);

      return updated;
    });
  }

  return { notifications, addNotification };
};

const Options = () => {
  const [options, setOptions] = useState(initialOptions);

  const setCheckboxOption = (key) => ({ currentTarget: { checked } }) => {
    setOptions((options) => ({ ...options, [key]: checked.toString() }));
  };

  const setValueOption = (key) => ({ currentTarget: { value } }) => {
    setOptions((state) => ({ ...state, [key]: value }));
  };

  // Guarda todas las opciones actuales en localStorage y muestra notificación de éxito.
  function saveOptions() {
    Object.assign(localStorage, options);
    addNotification('success', 'Opciones guardadas');
  }

  // Restablece todas las opciones a sus valores por defecto.
  function resetOptions() {
    setOptions(defaultOptions);
    addNotification(
      'accent',
      'Todas las opciones se han restablecido a sus valores predeterminados.'
    );
  }

  // Borra todo el almacenamiento local y recarga la página.
  function clearData() {
    const userHasConfirmed = window.confirm(
      'Esto borrará todos los datos de la extensión (filtros, opciones y nombre de carpeta). ¿Continuar?'
    );
    if (userHasConfirmed) {
      localStorage.clear();
      window.location.reload();
    }
  }

  const { notifications, addNotification } = useNotifications();

  // Forzar modo oscuro por defecto al montar el componente.
  useState(() => {
    document.body.classList.add('dark-mode');
    if (options.enable_dark_mode === undefined) {
      setOptions((o) => ({ ...o, enable_dark_mode: 'true' }));
    }
  });

  // Ajusta un valor numérico (columnas, ancho mínimo/máximo) con botones ▲/▼.
  // Respeta los límites min/max definidos en el input del DOM.
  const adjustNumber = (key, delta) => {
    setOptions((state) => {
      const current = parseInt(state[key], 10) || 0;
      const input = document.getElementById(key + '_numberbox');
      const min = parseInt(input?.getAttribute('min') || '0', 10);
      const max = parseInt(input?.getAttribute('max') || '1000', 10);
      const next = Math.min(Math.max(current + delta, min), max);
      return { ...state, [key]: String(next) };
    });
  };

  return html`
    <style>
      :root {
        --bg-page: #0F172A;
        --bg-card: #1E293B;
        --text-primary: #F8FAFC;
        --text-secondary: #94A3B8;
        --primary-color: #38BDF8;
        --border-color: #334155;
        --accent-color: #2e7d32;
        --success-color: #16A34A;
        --danger-color: #DC2626;
        --neutral-lightest: #0F172A;
        --neutral-lighter: #1E293B;
        --neutral-light: #334155;
        --neutral: #475569;
        --input-background: #334155;
        --foreground: #F8FAFC;
        --foreground-light: #94A3B8;
        --foreground-inverse: #FFFFFF;
      }
      body {
        background-color: var(--bg-page) !important;
        color: var(--text-primary) !important;
      }
      main {
        background-color: var(--bg-card) !important;
        color: var(--text-primary) !important;
      }
      fieldset, details {
        border-color: var(--border-color) !important;
        background: var(--bg-card) !important;
        color: var(--text-primary) !important;
      }
      legend, summary {
        color: var(--primary-color) !important;
      }
      input[type='text'], input[type='number'], select {
        background: var(--input-background) !important;
        color: var(--text-primary) !important;
        border: 1px solid var(--border-color) !important;
      }
      input[type='button'] {
        color: var(--foreground-inverse) !important;
      }
      label {
        color: var(--text-primary) !important;
      }
      .light {
        color: var(--text-secondary) !important;
      }
    </style>

    <${About} />

    <fieldset>
      <legend>⚙️ General options</legend>

      <${Checkbox}
        id="show_download_confirmation_checkbox"
        title="Requiere confirmación al presionar Descargar"
        checked="${options.show_download_confirmation === 'true'}"
        onChange=${setCheckboxOption('show_download_confirmation')}
      >
        <span>Mostrar confirmación de descarga</span>
      <//>

      <br />
      <${Checkbox}
        id="show_file_renaming_checkbox"
        title="Te permite especificar un nuevo nombre para los archivos descargados"
        checked="${options.show_file_renaming === 'true'}"
        onChange=${setCheckboxOption('show_file_renaming')}
      >
        <span>Mostrar campo de renombrado de archivos</span>
      <//>
    </fieldset>

    <fieldset>
      <legend>🖼️ Image options</legend>

      <${Checkbox}
        id="show_image_url_checkbox"
        title="Muestra la URL sobre cada imagen"
        checked="${options.show_image_url === 'true'}"
        onChange=${setCheckboxOption('show_image_url')}
      >
        <span>Mostrar la <b>URL</b> al pasar el mouse</span>
      <//>

      <br />
      <${Checkbox}
        id="show_open_image_button_checkbox"
        title="Muestra un botón junto a cada imagen para abrirla en una pestaña nueva"
        checked="${options.show_open_image_button === 'true'}"
        onChange=${setCheckboxOption('show_open_image_button')}
      >
        <span>Mostrar el botón <b>Abrir</b> al pasar el mouse</span>
      <//>

      <br />
      <${Checkbox}
        id="show_download_image_button_checkbox"
        title="Muestra un botón junto a cada imagen para descargarla individualmente"
        checked="${options.show_download_image_button === 'true'}"
        onChange=${setCheckboxOption('show_download_image_button')}
      >
        <span>Mostrar el botón <b>Descargar</b> al pasar el mouse</span>
      <//>

      <table>
        <tr title="El número de columnas">
          <td><label for="columns_numberbox">Columnas:</label></td>
          <td>
            <div class="number-spinner-container">
              <input
                id="columns_numberbox"
                type="number"
                required
                min="1"
                max="10"
                value="${options.columns}"
                onChange=${setValueOption('columns')}
              />
              <div class="number-spinner">
                <button
                  title="Incrementar"
                  onClick=${() => adjustNumber('columns', 1)}
                >
                  ▲
                </button>
                <button
                  title="Decrementar"
                  onClick=${() => adjustNumber('columns', -1)}
                >
                  ▼
                </button>
              </div>
            </div>
          </td>
        </tr>

        <tr
          title="Establecer el ancho mínimo puede ser útil para imágenes demasiado pequeñas"
        >
          <td>
            <label for="image_min_width_numberbox">
              Ancho de pantalla mínimo en px:
            </label>
          </td>
          <td>
            <div class="number-spinner-container">
              <input
                id="image_min_width_numberbox"
                type="number"
                required
                min="0"
                max="720"
                value="${options.image_min_width}"
                onChange=${setValueOption('image_min_width')}
              />
              <div class="number-spinner">
                <button
                  title="Incrementar"
                  onClick=${() => adjustNumber('image_min_width', 1)}
                >
                  ▲
                </button>
                <button
                  title="Decrementar"
                  onClick=${() => adjustNumber('image_min_width', -1)}
                >
                  ▼
                </button>
              </div>
            </div>
          </td>
        </tr>

        <tr
          title="Establecer el ancho máximo evita que imágenes grandes ocupen demasiado espacio"
        >
          <td>
            <label for="image_max_width_numberbox">
              Ancho de pantalla máximo en px:
            </label>
          </td>
          <td>
            <div class="number-spinner-container">
              <input
                id="image_max_width_numberbox"
                type="number"
                required
                min="30"
                max="720"
                value="${options.image_max_width}"
                onChange=${setValueOption('image_max_width')}
              />
              <div class="number-spinner">
                <button
                  title="Incrementar"
                  onClick=${() => adjustNumber('image_max_width', 1)}
                >
                  ▲
                </button>
                <button
                  title="Decrementar"
                  onClick=${() => adjustNumber('image_max_width', -1)}
                >
                  ▼
                </button>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </fieldset>

    <div style=${{ display: 'flex', gap: '4px', marginTop: '20px' }}>
      <input
        type="button"
        id="clear_data_button"
        class="danger ghost"
        value="Borrar datos"
        title="Borra todos los datos que la extensión ha guardado en tu máquina"
        onClick=${clearData}
      />

      <input
        type="button"
        id="reset_button"
        class="neutral ghost"
        style=${{ marginLeft: 'auto' }}
        value="Restablecer"
        title="Restablece todos los ajustes a sus valores predeterminados"
        onClick=${resetOptions}
      />

      <input
        type="button"
        id="save_button"
        class="accent"
        value="Guardar"
        title="Guarda los ajustes actuales"
        onClick=${saveOptions}
      />
    </div>

    <div id="notifications">
      ${notifications.map(
        (notification) => html`
          <div class="notification ${`bg-${notification.type}`} inverse">
            ${notification.message}
          </div>
        `
      )}
    </div>
  `;
};

render(html`<${Options} />`, document.querySelector('main'));
