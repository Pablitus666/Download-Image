# 🖼️ Download - Image

Extensión de navegador para descargar imágenes de cualquier página web con filtros avanzados, progreso en tiempo real e historial de descargas.

---

![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Opera%20%7C%20Brave-4285F4?style=flat&logo=google-chrome&logoColor=white)
![Language](https://img.shields.io/badge/language-JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=white)
![Manifest](https://img.shields.io/badge/manifest-V3-4285F4?style=flat&logo=google-chrome&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat)
![Status](https://img.shields.io/badge/status-Estable-brightgreen?style=flat)

---

![Social Preview](images/Preview.png)

---

## ✨ Funciones

- 🖼️ **Detección automática de imágenes** en cualquier página web
- ⚡ **Detección de imágenes dinámicas** (lazy-load, carruseles, redes sociales)
- 🔍 **Filtros por URL**: búsqueda por texto, comodines o expresiones regulares
- 🌐 **Filtros por dominio**: permite o bloquea imágenes de dominios específicos
- 📏 **Filtros por tamaño**: ancho y alto mínimo/máximo en píxeles
- 🔄 **Auto-scroll automático**: carga más imágenes al hacer scroll en la página
- 📊 **Progreso de descarga en tiempo real**: barra de progreso por imagen
- 📜 **Historial persistente**: registro de todas las descargas realizadas
- 🌙 **Modo oscuro por defecto**: interfaz oscura activada automáticamente
- 🏷️ **Renombrado de archivos**: nombre personalizado y organización en subcarpetas
- ✅ **Selección individual o masiva**: selecciona imágenes una por una o todas a la vez

---

## 🚀 Empezar en Chrome (o navegadores basados en Chromium)

### Opción 1: Descargar desde GitHub Releases (Recomendado)

1. Ve a la sección **Releases** de este repositorio en GitHub
2. Descarga el archivo **`Download-Image-v1.0.0.zip`** del último release
3. Descomprímelo en una carpeta de tu computadora
4. Abre Google Chrome (o Edge, Opera, Brave)
5. Ve a `chrome://extensions/`
6. Activa el **"Modo de desarrollador"** (esquina superior derecha)
7. Haz clic en el botón **"Cargar sin empaquetar"** (o **"Load unpacked"**)
8. Selecciona la **carpeta descomprimida** (la que contiene el archivo `manifest.json`)
9. ¡Listo! El icono de la extensión aparecerá en tu barra de herramientas

### Opción 2: Clonar el repositorio

1. **Descarga o clona este repositorio**:
   ```bash
   git clone https://github.com/Pablitus666/Download-Image.git
   cd Download-Image v1.0.0
   ```

2. **Abre Google Chrome** (o Edge, Opera, Brave).

3. **Ve a la página de extensiones**:
   Escribe en la barra de direcciones:
   ```
   chrome://extensions/
   ```
   y presiona Enter.

4. **Activa el "Modo de desarrollador"**:
   En la esquina SUPERIOR DERECHA, activa el interruptor "Modo de desarrollador".

5. **Carga la extensión sin empaquetar**:
   Haz clic en el botón **"Cargar sin empaquetar"** (o **"Load unpacked"**).
   Selecciona la carpeta del proyecto descargado y haz clic en **"Abrir"**.

6. **Verifica la instalación**:
   Deberías ver el icono de la extensión (una flecha 🏹) en la barra de herramientas de Chrome.
   Si no lo ves, haz clic en el icono de piezas de rompecabezas (▭) y fija la extensión a la barra de herramientas.

### Primera ejecución

La extensión estará lista inmediatamente después de cargarla. No requiere configuración adicional para comenzar a usarla.

---

## 🎚️ Opciones de la extensión

| Opción | Descripción |
|--------|-------------|
| **Mostrar confirmación de descarga** | Activa o desactiva la ventana de confirmación antes de iniciar una descarga masiva |
| **Mostrar campo de renombrado de archivos** | Activa u oculta el campo para renombrar los archivos descargados automáticamente |
| **Mostrar la URL al pasar el mouse** | Muestra la dirección web de cada imagen cuando pasas el cursor sobre ella |
| **Mostrar el botón "Abrir"** | Muestra un botón junto a cada imagen para abrirla en una pestaña nueva |
| **Mostrar el botón "Descargar"** | Muestra un botón junto a cada imagen para descargarla individualmente |
| **Columnas** | Número de columnas para mostrar las imágenes en la galería |
| **Ancho de pantalla mínimo en px** | Filtra imágenes más pequeñas que el ancho especificado |
| **Ancho de pantalla máximo en px** | Filtra imágenes más grandes que el ancho especificado |

### Recomendaciones

- Empieza con un filtro de tamaño moderado (por ejemplo, 200x200 píxeles) para evitar descargar íconos y avatares pequeños
- Usa el filtro por URL para buscar imágenes de sitios específicos
- Usa el filtro por dominio para permitir o bloquear imágenes de ciertos sitios web

### Filtros de imagen

La extensión detecta automáticamente imágenes en formatos JPG, PNG, WebP, SVG, GIF, BMP, ICO, TIFF y AVIF. Las imágenes muy pequeñas (avatares y iconos) se filtran automáticamente.

---

## 📁 Carpetas utilizadas en el proyecto

| Ubicación | Uso |
|-----------|-----|
| `manifest.json` | Manifiesto de la extensión (Manifest V3) |
| `src/contentScript.js` | Script que se inyecta en las páginas web para detectar imágenes |
| `src/imageScanner.js` | Funciones de detección de imágenes compartidas |
| `src/Popup/Popup.js` | Lógica principal del popup de la extensión |
| `src/Popup/Images.js` | Galería de imágenes detectadas |
| `src/Popup/ImageActions.js` | Acciones sobre imágenes (abrir, descargar, copiar URL) |
| `src/Popup/DownloadButton.js` | Botón principal de descarga |
| `src/Popup/DownloadConfirmation.js` | Diálogo de confirmación antes de descargar |
| `src/Popup/AdvancedFilters.js` | Filtros avanzados con sliders de tamaño |
| `src/Popup/UrlFilterMode.js` | Selector de modo de filtro de URL |
| `src/Popup/actions.js` | Comunicación con el service worker para descargas |
| `src/Popup/index.html` | HTML del popup |
| `src/background/serviceWorker.js` | Servicio en segundo plano para descargas y historial |
| `src/Options/Options.js` | Lógica de la página de opciones |
| `src/Options/index.html` | HTML de la página de opciones |
| `src/Options/About.js` | Página "Acerca de" |
| `src/Options/Support.js` | Página de soporte |
| `lib/` | Librerías de terceros (React, jQuery, nouislider, htm) |
| `images/` | Iconos y recursos gráficos |
| `stylesheets/main.css` | Estilos principales del popup |

---

## 🛠️ Tecnologías y dependencias

- **JavaScript (ES6+)** — Lenguaje principal
- **React 18** — Interfaz de usuario (vía htm)
- **htm** — Sintaxis tipo JSX sin necesidad de compilación
- **Chrome Extension APIs** — Manifest V3, content scripts, service workers
- **noUiSlider** — Sliders para filtros de tamaño
- **jQuery** — Librería de JavaScript (dependencia heredada)

La extensión utiliza APIs del navegador para detectar y descargar imágenes. No implica la propiedad de los modelos, pesos ni bibliotecas de terceros.

Este repositorio organiza el flujo de trabajo y la experiencia de uso. No implica la propiedad de las tecnologías de terceros utilizadas.

## 📷 Capturas de pantalla

<p align="center">
  <img src="images/screenshot.png?v=2" alt="Captura de pantalla de la extensión Download - Image" width="800">
</p>

---

## 🔐 Datos y privacidad

- No subas imágenes privadas, credenciales, tokens ni otros datos sensibles al repositorio.
- Conserva las imágenes y los resultados en tu almacenamiento personal.
- La extensión descarga imágenes directamente desde las páginas web que visitas; el procesamiento se realiza localmente en tu navegador.

## 🗺️ Estado del proyecto

**Estado: estable, con pruebas funcionales satisfactorias en Chrome, Edge, Opera y Brave.**

**Enfoque actual:** estabilidad, compatibilidad y experiencia de usuario.

- [x] Detección de imágenes en cualquier página web
- [x] Filtros por URL, dominio y tamaño
- [x] Descarga de imágenes seleccionadas
- [x] Progreso de descarga en tiempo real
- [x] Historial persistente de descargas
- [x] Modo oscuro por defecto
- [x] Renombrado de archivos y organización en subcarpetas
- [x] Interfaz de usuario completa con popup y opciones
- [x] Pruebas funcionales en Chrome, Edge, Opera y Brave

El estado estable refleja las pruebas realizadas hasta el momento. No implica que se hayan probado todas las combinaciones de páginas web y tipos de imágenes disponibles.

## 📌 Repositorio

[github.com/Pablitus666/Download-Image](https://github.com/Pablitus666/Download-Image)

---

## 👨‍💻 Autor

**Walter Pablo Téllez Ayala**  
Software Developer  
📍 Bolivia 🇧🇴 <img src="https://flagcdn.com/w20/bo.png" width="20" alt="Bandera de Bolivia">  
📧 pharmakoz@gmail.com

© 2026 — **Download - Image**

---
