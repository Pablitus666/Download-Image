# Download - Image v1.0.0

## 🚀 Lanzamiento inicial

Esta es la primera versión estable de **Download - Image**, una extensión de navegador para descargar imágenes de cualquier página web con filtros avanzados.

## ✨ Características incluidas

### Detección de imágenes
- Escanea páginas web automáticamente en busca de imágenes
- Detecta imágenes cargadas dinámicamente (lazy-load, carruseles, redes sociales)
- Soporte para múltiples formatos: JPG, PNG, WebP, SVG, GIF, BMP, ICO, TIFF, AVIF
- Filtra imágenes pequeñas (avatares, iconos) automáticamente

### Filtros avanzados
- **Por URL**: Filtra por texto, comodines (*) o expresiones regulares
- **Por dominio**: Permite o bloquea imágenes de dominios específicos
- **Por tamaño**: Filtra por ancho y alto mínimo/máximo en píxeles

### Funciones de descarga
- Descarga imágenes seleccionadas individualmente o en lote
- Progreso de descarga en tiempo real
- Historial persistente de descargas
- Renombrado de archivos con subcarpetas
- Confirmación antes de descargar (opcional)

### Interfaz de usuario
- Modo oscuro activado por defecto
- Botón de escaneo manual
- Auto-scroll para cargar más imágenes
- Galería visual con miniaturas
- Selección individual o "Seleccionar todo"

## 📦 Instalación

### Desde Chrome Web Store (próximamente)

### Instalación manual (desarrollo)
1. Descarga o clona este repositorio
2. Abre `chrome://extensions/` en Chrome/Edge/Opera/Brave
3. Activa "Modo de desarrollador"
4. Haz clic en "Cargar sin empaquetar" y selecciona la carpeta del proyecto

## 🐛 Problemas conocidos

- Funciona oficialmente en navegadores basados en Chromium (Chrome, Edge, Opera, Brave)
- Firefox y Safari requieren adaptaciones adicionales de la API del navegador
- El modo incógnito puede tener limitaciones con el almacenamiento local

## 📋 Cambios futuros (hoja de ruta)

- Soporte para Firefox y Safari (manifest v3 cross-browser)
- Almacenamiento con chrome.storage.local para modo incógnito
- Más filtros (por color, ratio de aspecto, etc.)
- Exportar e importar configuración

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias, abre un issue en el repositorio de GitHub.

---

**Descarga - Image** v1.0.0  
Descarga imágenes de cualquier página web con filtros avanzados.
