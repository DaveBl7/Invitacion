/* =========================================================
   PANEL LATERAL EN MÓVIL — archivo aparte, no toca main.js
   ni styles.css.

   En vez de un cajón/modal a pantalla completa, esto reutiliza el
   MISMO panel de fotos que ya existe para escritorio (#sideSlideshow,
   con su loop Ken Burns ya corriendo vía main.js) y lo muestra
   como columna fija a la izquierda en móvil, empujando la tarjeta de
   contenido (#mainContent) hacia la derecha — igual que en PC, sólo
   que aquí es opcional vía un botón, porque a 375px de ancho no cabe
   permanentemente.

   Incluir en index.html con:
   <script src="js/mobile-side-panel.js" defer></script>
   (después de js/main.js)
   ========================================================= */
(function () {
  'use strict';

  const sidePanel = document.getElementById('sideSlideshow');
  const shell = document.getElementById('mainContent');
  if (!sidePanel || !shell) return;

  /* ===== ESTILOS ===== */
  const style = document.createElement('style');
  style.textContent = `
    #mobilePanelToggle {
      display: none;
      position: fixed;
      bottom: calc(74px + env(safe-area-inset-bottom));
      left: 12px;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--glass-border, rgba(255,255,255,0.09));
      background: var(--glass-bg, rgba(255,255,255,0.045));
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      color: var(--gold-light, #d9c08e);
      font-size: 16px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9996;
      box-shadow: 0 6px 20px rgba(0,0,0,0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.6s ease, transform 0.3s ease, left 0.4s ease;
    }
    #mobilePanelToggle.show { opacity: 1; pointer-events: all; }
    #mobilePanelToggle:active { transform: scale(0.92); }

    @media (max-width: 575px) {
      #mobilePanelToggle { display: flex; }

      /* Panel de fotos como columna fija a la izquierda (igual que en
         PC), en vez del display:none por defecto en móvil. Se apoya en
         que #sideSlideshow ya trae su loop Ken Burns corriendo desde
         main.js — acá sólo se hace visible y se posiciona. */
      body.mp-panel-open #sideSlideshow {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: var(--mp-panel-w, 55vw);
        height: 100vh;
        z-index: 9994;
      }

      /* La tarjeta de contenido se angosta y se recorre a la derecha
         para dejarle espacio al panel, tal como en el layout de PC
         (ahí a la izquierda va el panel, a la derecha el contenido). */
      body.mp-panel-open #mainContent {
        margin-left: var(--mp-panel-w, 55vw);
        width: var(--mp-content-w, 45vw);
      }

      /* El botón se mueve junto al borde del panel abierto para que
         siga siendo fácil de alcanzar y quede claro que cierra el
         panel, no que abre otro. */
      body.mp-panel-open #mobilePanelToggle {
        left: calc(var(--mp-panel-w, 55vw) + 12px);
      }

      /* =====================================================
         MODO COMPACTO: con el panel ocupando más de la mitad de la
         pantalla, el contenido queda con muy poco ancho (~45vw). En vez
         de dejar que el texto se desborde o se encime, se reducen
         paddings, tipografías y tamaños de foto/botones a una escala
         más chica — mismo diseño, proporciones más ajustadas.
         ===================================================== */
      body.mp-panel-open .v3-hero { padding: 28px 12px 24px; gap: 8px; }
      body.mp-panel-open .v3-kicker { font-size: 0.56rem; letter-spacing: 2.5px; }
      body.mp-panel-open .v3-photo-ring { width: 96px; height: 96px; border-width: 2px; margin: 2px 0; }
      body.mp-panel-open .v3-names { font-size: clamp(1.3rem, 8vw, 1.7rem); }
      body.mp-panel-open .v3-date { font-size: 0.66rem; letter-spacing: 1px; }
      body.mp-panel-open .v3-pill-btn {
        padding: 9px 14px; font-size: 0.6rem; letter-spacing: 0.8px; gap: 6px;
      }
      body.mp-panel-open .v3-scroll-hint { font-size: 0.5rem; margin-top: 14px; }

      body.mp-panel-open .v3-script-heading { font-size: clamp(1.3rem, 7vw, 1.7rem); margin-bottom: 14px; }
      body.mp-panel-open .v3-script-heading.small { font-size: 1rem; }
      body.mp-panel-open .v3-lead { font-size: 0.85rem; line-height: 1.6; padding: 0 6px; }

      body.mp-panel-open .v3-glass-section,
      body.mp-panel-open .v3-countdown-section,
      body.mp-panel-open .v3-gallery-section { padding: 22px 12px; }

      body.mp-panel-open .pill-countdown { gap: 6px; }
      body.mp-panel-open .pill-chip { min-width: 52px; padding: 9px 6px; }
      body.mp-panel-open .pill-chip span { font-size: 1.1rem; }
      body.mp-panel-open .pill-chip small { font-size: 0.5rem; }
      body.mp-panel-open .v3-verse { font-size: 0.82rem; }

      body.mp-panel-open .v3-gallery-grid { gap: 4px; padding: 0 10px; }
      body.mp-panel-open .v3-carousel { height: 34vh; }

      body.mp-panel-open .v3-glass-card { padding: 16px 14px; max-width: 100%; }
      /* Más específico que la regla ".v3-photo-ring" de arriba a propósito
         (aunque tenga menos clases, "body.mp-panel-open .v3-photo-ring"
         por sí sola ya empataba/ganaba la especificidad de ".small" y le
         pisaba el margin:auto que la centraba — quedaba pegada a la
         izquierda en vez de centrada). */
      body.mp-panel-open .v3-photo-ring.small { width: 78px; height: 78px; margin: 0 auto 10px; }
      body.mp-panel-open .v3-amp { font-size: 1.7rem; margin: 8px 0; }

      body.mp-panel-open .v3-map-frame iframe { height: 190px; }
      body.mp-panel-open .v3-schedule { gap: 8px; }
      body.mp-panel-open .v3-schedule-item { min-width: 92px; padding: 10px 12px; }

      body.mp-panel-open .itinerary-wrap { max-width: 100%; }
      body.mp-panel-open .timeline-node { width: 46px; height: 46px; }
      body.mp-panel-open .timeline-node img { width: 40px; height: 40px; }
      body.mp-panel-open .timeline-card { padding: 8px 10px; min-width: 92px; }
      body.mp-panel-open .timeline-event { font-size: 0.88rem; }

      body.mp-panel-open .coverflow-carousel { max-width: 100%; height: 230px; }
      body.mp-panel-open .card { width: 150px; height: 200px; }

      body.mp-panel-open .v3-form input,
      body.mp-panel-open .v3-form textarea { padding: 11px 14px; font-size: 0.92rem; }

      body.mp-panel-open .v3-invite-final { padding: 6px 12px 24px; }
      body.mp-panel-open .invite-final-names { font-size: 1.5rem; }

      /* La barra inferior es "width:100%; right:0" (sin left), así que
         achicar su width la deja pegada al borde derecho — coincide con
         la columna de contenido en vez de taparle la foto al panel.
         Con 5 links en ~45vw no entran ni el ícono ni el texto a su
         tamaño normal (se desbordaban del contenedor) — se ocultan las
         etiquetas de texto y se deja sólo el ícono, más compacto. */
      body.mp-panel-open .bottom-nav {
        width: var(--mp-content-w, 45vw);
        padding-left: 2px;
        padding-right: 2px;
      }
      body.mp-panel-open .bottom-nav a { padding: 6px 4px; gap: 0; }
      body.mp-panel-open .bottom-nav a span { display: none; }
      body.mp-panel-open .bottom-nav a i { font-size: 1.05rem; }
    }

    #mobilePanelToggle:focus-visible {
      outline: 2px solid var(--gold-light, #d9c08e);
      outline-offset: 3px;
    }
  `;
  document.head.appendChild(style);

  /* ===== BOTÓN ===== */
  const toggle = document.createElement('button');
  toggle.id = 'mobilePanelToggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Ver fotos en panel lateral');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.innerHTML = '<i class="fa-solid fa-images" aria-hidden="true"></i>';
  document.body.appendChild(toggle);

  function setOpen(open) {
    document.body.classList.toggle('mp-panel-open', open);
    toggle.setAttribute('aria-pressed', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar panel de fotos' : 'Ver fotos en panel lateral');
    toggle.innerHTML = open
      ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-images" aria-hidden="true"></i>';
  }

  toggle.addEventListener('click', () => {
    setOpen(!document.body.classList.contains('mp-panel-open'));
  });

  /* El botón sólo debe aparecer una vez termina la intro (mismo criterio
     que los demás FABs del sitio: se muestran cuando #mainContent se
     revela). Se observa la clase "show" de la tarjeta principal en vez de
     engancharse a la lógica interna de main.js. */
  const obs = new MutationObserver(() => {
    if (shell.classList.contains('show')) toggle.classList.add('show');
  });
  obs.observe(shell, { attributes: true, attributeFilter: ['class'] });
  if (shell.classList.contains('show')) toggle.classList.add('show');
})();
