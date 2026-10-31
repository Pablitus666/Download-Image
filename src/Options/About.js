import html from '../html.js';

// Página "Acerca de" mostrada dentro de la página de opciones.
// Incluye logo, versión, firma y descripción de la extensión.
export const About = () => html`
  <style>
    :root {
      --bg-page: #0F172A;
      --bg-card: #1E293B;
      --text-primary: #F8FAFC;
      --text-secondary: #94A3B8;
      --primary-color: #38BDF8;
      --border-color: #334155;
      --accent-color: #2e7d32;
    }
    .about-page {
      font-family: 'Segoe UI', Arial, sans-serif;
      background-color: var(--bg-page);
      color: var(--text-primary);
      margin: 0;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .about-container {
      max-width: 560px;
      width: 100%;
      text-align: center;
    }
    /* Logo centrado arriba */
    .about-logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      filter: drop-shadow(0 4px 8px rgba(37,99,235,0.4));
      margin: 0 auto 14px auto;
      display: block;
    }
    /* Título único centrado */
    .about-title {
      color: var(--primary-color);
      margin: 0 0 4px 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .about-version {
      color: var(--text-secondary);
      margin: 0 0 20px 0;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    /* Firma centrada debajo del título */
    .about-signature {
      width: min(300px, 90%);
      height: auto;
      max-height: 90px;
      object-fit: contain;
      object-position: center;
      margin: 0 auto 22px auto;
      filter: drop-shadow(0 2px 6px rgba(0,153,255,0.3));
      display: block;
    }
    /* Tarjeta "Acerca de" centrada */
    .about-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 20px 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      text-align: left;
    }
    .about-card h2 {
      color: var(--primary-color);
      font-size: 17px;
      font-weight: 600;
      margin-top: 0;
      margin-bottom: 12px;
      padding: 0 0 8px 12px;
      position: relative;
      border-bottom: 1px solid var(--border-color);
    }
    .about-card h2::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 4px;
      height: 100%;
      min-height: 20px;
      border-radius: 3px;
      background: var(--accent-color);
    }
    .about-card p {
      line-height: 1.6;
      font-size: 13.5px;
      color: var(--text-secondary);
      margin: 7px 0;
      text-align: justify;
    }
    .about-card p b {
      color: var(--text-primary);
    }
  </style>

  <div class="about-page">
    <div class="about-container">
      <!-- Icono/logo centrado arriba -->
      <img src="/images/logo.svg" class="about-logo" alt="Download - Image" />

      <!-- Título único centrado -->
      <h1 class="about-title">Download - Image</h1>
      <div class="about-version">v1.0.0</div>

      <!-- Firma centrada debajo del título -->
      <img src="/images/firma.svg" class="about-signature" alt="Pablo Téllez A." />

      <div class="about-card">
        <h2>Acerca de</h2>
        <p>
          <b>Download - Image</b> es una extensión de navegador para navegar y
          descargar imágenes de cualquier página web de forma rápida y sencilla.
        </p>
        <p>
          Detecta imágenes automáticamente, incluidas aquellas cargadas
          dinámicamente (lazy-load, carruseles, redes sociales), y te permite
          filtrarlas antes de descargarlas.
        </p>
      </div>
    </div>
  </div>
`;
