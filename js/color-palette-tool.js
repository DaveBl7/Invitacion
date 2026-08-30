/* =========================================================
   HERRAMIENTA DE PALETA DE COLORES — archivo aparte, no toca
   main.js ni styles.css directamente.

   Agrega un botón discreto (esquina superior izquierda) que abre un
   panel para ajustar en vivo los colores de modo oscuro y modo claro
   sobre el sitio REAL (no una copia/iframe) — cambias un color y lo ves
   de inmediato en la página. Al terminar, el botón "Exportar CSS" te da
   el bloque final para pegar en css/styles.css.

   Esto es una herramienta de trabajo para ti, no para tus invitados:
   no rompe ni reemplaza el botón de modo claro/oscuro real del sitio
   (los mantiene sincronizados en ambos sentidos).

   Incluir en index.html con:
   <script src="js/color-palette-tool.js" defer></script>
   ========================================================= */
(function () {
  'use strict';

  /* ===== VALORES ACTUALES DEL SITIO (los mismos de css/styles.css) ===== */
  const DEFAULT_PALETTES = {
    dark: {
      '--bg': '#0b0c10',
      '--card-bg': 'rgba(15, 15, 18, 0.5)',
      '--glass-bg': 'rgba(255, 255, 255, 0.045)',
      '--glass-border': 'rgba(255, 255, 255, 0.09)',
      '--ink': '#f4efe4',
      '--ink-soft': 'rgba(244, 239, 228, 0.72)',
      '--shadow': 'rgba(0, 0, 0, 0.5)',
      '--gold': '#b8935a',
      '--gold-light': '#d9c08e',
      '--gold-dark': '#8c6a32'
    },
    light: {
      '--bg': '#f3ecdc',
      '--card-bg': 'rgba(255, 252, 244, 0.72)',
      '--glass-bg': 'rgba(255, 255, 255, 0.55)',
      '--glass-border': 'rgba(58, 42, 18, 0.14)',
      '--ink': '#2b2318',
      '--ink-soft': 'rgba(43, 35, 24, 0.68)',
      '--shadow': 'rgba(58, 42, 18, 0.2)',
      '--gold': '#a9803f',
      '--gold-light': '#c9a769',
      '--gold-dark': '#7d5f2d'
    }
  };

  const VAR_FIELDS = [
    { key: '--bg', label: 'Fondo general', type: 'solid' },
    { key: '--ink', label: 'Texto principal', type: 'solid' },
    { key: '--ink-soft', label: 'Texto secundario', type: 'alpha' },
    { key: '--gold', label: 'Dorado', type: 'solid' },
    { key: '--gold-light', label: 'Dorado claro', type: 'solid' },
    { key: '--gold-dark', label: 'Dorado oscuro', type: 'solid' },
    { key: '--card-bg', label: 'Fondo de la tarjeta', type: 'alpha' },
    { key: '--glass-bg', label: 'Fondo "cristal"', type: 'alpha' },
    { key: '--glass-border', label: 'Borde "cristal"', type: 'alpha' },
    { key: '--shadow', label: 'Sombra', type: 'alpha' }
  ];

  // Copia de trabajo — se edita esto, no las constantes de arriba (que
  // quedan como referencia para "Restablecer").
  const palettes = {
    dark: { ...DEFAULT_PALETTES.dark },
    light: { ...DEFAULT_PALETTES.light }
  };

  let activeTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

  /* ===== UTILIDADES DE COLOR ===== */
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
  }
  function parseColor(str) {
    str = String(str).trim();
    if (str.startsWith('#')) return { hex: str, alpha: 1 };
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return { hex: '#000000', alpha: 1 };
    const parts = m[1].split(',').map(s => parseFloat(s.trim()));
    const [r, g, b, a] = parts;
    return { hex: rgbToHex(r, g, b), alpha: a === undefined ? 1 : a };
  }
  function buildRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /* ===== ESTILOS DEL PANEL (con sus propios tokens, para que se lea
     igual sin importar qué colores del sitio esté editando en ese momento) ===== */
  const style = document.createElement('style');
  style.textContent = `
    #paletteToolToggle {
      position: fixed; top: 16px; left: 16px; z-index: 100010;
      width: 34px; height: 34px; border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.25);
      background: rgba(20,18,14,0.55);
      backdrop-filter: blur(10px);
      color: #e8d49e;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; cursor: pointer;
      opacity: 0.28; transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #paletteToolToggle:hover, #paletteToolToggle.active { opacity: 1; transform: scale(1.06); }

    #paletteToolPanel {
      position: fixed; top: 16px; left: 16px; z-index: 100009;
      width: min(300px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      background: #17140f;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
      font-family: 'Montserrat', Arial, sans-serif;
      color: #f0e6d0;
      transform: translateY(-12px) scale(0.97);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    #paletteToolPanel.open {
      transform: translateY(46px) scale(1);
      opacity: 1;
      pointer-events: all;
    }
    #paletteToolPanel h3 { font-size: 0.85rem; letter-spacing: 0.5px; margin-bottom: 12px; color: #fff; }
    .pt-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .pt-tab {
      flex: 1; padding: 7px 0; border-radius: 8px; text-align: center;
      font-size: 0.68rem; letter-spacing: 1px; text-transform: uppercase;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer; color: #cbbfa0;
    }
    .pt-tab.active { background: #b8935a; color: #17140f; border-color: #b8935a; font-weight: 600; }
    .pt-row { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
    .pt-row label { flex: 1; font-size: 0.72rem; color: #cbbfa0; }
    .pt-row input[type="color"] { width: 30px; height: 26px; padding: 0; border: none; border-radius: 6px; background: none; cursor: pointer; }
    .pt-row input[type="range"] { width: 56px; accent-color: #b8935a; }
    .pt-actions { display: flex; gap: 8px; margin-top: 14px; }
    .pt-btn {
      flex: 1; padding: 9px 0; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05); color: #f0e6d0; font-size: 0.68rem;
      letter-spacing: 1px; text-transform: uppercase; cursor: pointer;
    }
    .pt-btn.primary { background: #b8935a; color: #17140f; border-color: #b8935a; font-weight: 600; }
    #paletteToolExport {
      display: none; margin-top: 12px;
    }
    #paletteToolExport.open { display: block; }
    #paletteToolExport textarea {
      width: 100%; height: 150px; font-family: monospace; font-size: 0.68rem;
      background: #0b0a08; color: #d9c08e; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px; padding: 8px; resize: vertical;
    }
    #paletteToolExport p { font-size: 0.65rem; color: #a89878; margin: 8px 0 4px; line-height: 1.5; }
  `;
  document.head.appendChild(style);

  /* ===== MARCADO ===== */
  const toggle = document.createElement('button');
  toggle.id = 'paletteToolToggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Herramienta de paleta de colores');
  toggle.innerHTML = '<i class="fa-solid fa-palette" aria-hidden="true"></i>';
  document.body.appendChild(toggle);

  const panel = document.createElement('div');
  panel.id = 'paletteToolPanel';
  panel.innerHTML = `
    <h3>Paleta de colores</h3>
    <div class="pt-tabs">
      <div class="pt-tab" data-theme="dark">Modo oscuro</div>
      <div class="pt-tab" data-theme="light">Modo claro</div>
    </div>
    <div id="paletteToolFields"></div>
    <div class="pt-actions">
      <button type="button" class="pt-btn" id="paletteToolReset">Restablecer</button>
      <button type="button" class="pt-btn primary" id="paletteToolExportBtn">Exportar CSS</button>
    </div>
    <div id="paletteToolExport">
      <p>Reemplaza las líneas correspondientes dentro de <code>:root { }</code> y <code>[data-theme="light"] { }</code> en css/styles.css por esto (el resto de variables de esos bloques, como fuentes o colores del sello, no cambian):</p>
      <textarea id="paletteToolExportText" readonly></textarea>
      <button type="button" class="pt-btn" id="paletteToolCopyBtn" style="margin-top:8px; width:100%;">Copiar</button>
    </div>
  `;
  document.body.appendChild(panel);

  const fieldsContainer = panel.querySelector('#paletteToolFields');
  const tabs = [...panel.querySelectorAll('.pt-tab')];

  function renderFields() {
    fieldsContainer.innerHTML = '';
    VAR_FIELDS.forEach(field => {
      const value = palettes[activeTheme][field.key];
      const row = document.createElement('div');
      row.className = 'pt-row';

      const label = document.createElement('label');
      label.textContent = field.label;
      row.appendChild(label);

      if (field.type === 'solid') {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = parseColor(value).hex;
        colorInput.addEventListener('input', () => {
          palettes[activeTheme][field.key] = colorInput.value;
          document.documentElement.style.setProperty(field.key, colorInput.value);
        });
        row.appendChild(colorInput);
      } else {
        const parsed = parseColor(value);
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = parsed.hex;
        const rangeInput = document.createElement('input');
        rangeInput.type = 'range';
        rangeInput.min = '0';
        rangeInput.max = '100';
        rangeInput.value = String(Math.round(parsed.alpha * 100));

        function update() {
          const rgba = buildRgba(colorInput.value, (parseInt(rangeInput.value, 10) / 100).toFixed(2));
          palettes[activeTheme][field.key] = rgba;
          document.documentElement.style.setProperty(field.key, rgba);
        }
        colorInput.addEventListener('input', update);
        rangeInput.addEventListener('input', update);
        row.appendChild(colorInput);
        row.appendChild(rangeInput);
      }

      fieldsContainer.appendChild(row);
    });
  }

  function applyPalette(theme) {
    Object.entries(palettes[theme]).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }

  function setActiveTheme(theme, opts = {}) {
    activeTheme = theme;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.theme === theme));
    if (!opts.skipDataTheme) {
      if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
      else document.documentElement.removeAttribute('data-theme');
    }
    applyPalette(theme);
    renderFields();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => setActiveTheme(tab.dataset.theme));
  });

  panel.querySelector('#paletteToolReset').addEventListener('click', () => {
    palettes[activeTheme] = { ...DEFAULT_PALETTES[activeTheme] };
    applyPalette(activeTheme);
    renderFields();
  });

  panel.querySelector('#paletteToolExportBtn').addEventListener('click', () => {
    const exportBox = panel.querySelector('#paletteToolExport');
    const darkLines = Object.entries(palettes.dark).map(([k, v]) => `  ${k}: ${v};`).join('\n');
    const lightLines = Object.entries(palettes.light).map(([k, v]) => `  ${k}: ${v};`).join('\n');
    const css = `:root {\n${darkLines}\n}\n\n[data-theme="light"] {\n${lightLines}\n}`;
    panel.querySelector('#paletteToolExportText').value = css;
    exportBox.classList.toggle('open');
  });

  panel.querySelector('#paletteToolCopyBtn').addEventListener('click', () => {
    const textarea = panel.querySelector('#paletteToolExportText');
    navigator.clipboard.writeText(textarea.value).then(() => {
      const btn = panel.querySelector('#paletteToolCopyBtn');
      const original = btn.textContent;
      btn.textContent = '¡Copiado!';
      setTimeout(() => { btn.textContent = original; }, 1500);
    });
  });

  toggle.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('open');
    toggle.classList.toggle('active', isOpen);
  });

  // Si el invitado/tú usan el botón real de modo claro/oscuro del sitio
  // mientras el panel está abierto, se resincroniza para no aplicar la
  // paleta del tema equivocado.
  const realToggle = document.getElementById('theme-toggle');
  if (realToggle) {
    realToggle.addEventListener('click', () => {
      setTimeout(() => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        setActiveTheme(isLight ? 'light' : 'dark', { skipDataTheme: true });
      }, 0);
    });
  }

  setActiveTheme(activeTheme, { skipDataTheme: true });
})();
