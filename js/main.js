/* ===== PREFERENCIA DE MOVIMIENTO REDUCIDO ===== */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===== BARRA DE PROGRESO DE SCROLL ===== */
(function () {
  const bar = document.getElementById('scrollProgress');
  function update() {
    const h = document.documentElement;
    const scrollable = h.scrollHeight - h.clientHeight;
    const pct = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ===== PÉTALOS CAYENDO ===== */
(function () {
  if (REDUCED_MOTION) return;
  const canvas = document.getElementById('petals-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, petals = [];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize);
  resize();

  function createPetal() {
    return {
      x: Math.random() * W,
      y: -20 - Math.random() * 100,
      size: Math.random() * 5 + 3,
      speedY: Math.random() * 0.6 + 0.35,
      speedX: (Math.random() - 0.5) * 0.6,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.02 + 0.01,
      opacity: Math.random() * 0.35 + 0.25
    };
  }

  for (let i = 0; i < 26; i++) { const p = createPetal(); p.y = Math.random() * H; petals.push(p); }

  function drawPetal(p) {
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = '#c9a769';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    petals.forEach((p, i) => {
      p.y += p.speedY;
      p.wobble += p.wobbleSpeed;
      p.x += Math.sin(p.wobble) * 0.6 + p.speedX;
      p.rotation += p.rotSpeed;
      drawPetal(p);
      if (p.y > H + 20) petals[i] = createPetal();
    });
    requestAnimationFrame(animate);
  }
  animate();
})();

/* ===== PANEL LATERAL: loop de fotos con zoom (Ken Burns) ===== */
(function () {
  const slides = document.querySelectorAll('.side-slide');
  if (!slides.length) return;
  let idx = 0;

  // El encuadre de "llegada" (zoom + paneo) de cada foto vive en las clases
  // .kb-1..kb-4 del CSS. Aquí solo se alterna la clase .active: al
  // quitarla, la foto vuelve a su encuadre de "salida" (instantáneo, sin
  // transición) y al agregarla de nuevo, la transición de 8s la lleva
  // suavemente al encuadre de llegada — eso es el Ken Burns.
  function activate(i) {
    slides.forEach((s, n) => {
      if (n === i) {
        s.style.transition = 'none';
        s.classList.remove('active');
        s.style.opacity = '0';
        void s.offsetWidth; // fuerza reflow antes de re-habilitar la transición
        s.style.transition = '';
        // La clase .active sigue controlando el encuadre/zoom (transform,
        // vía las reglas .kb-N.active). La opacidad, en cambio, se fija
        // aquí directo con style.opacity en vez de depender de la regla
        // ".side-slide.active { opacity: 1 }": en algunos motores, cuando
        // el elemento tiene mask-image + will-change + una transición ya
        // declarada, el cambio de opacidad disparado sólo por classList no
        // llega a pintarse (queda en opacity:0 aunque el DOM ya diga
        // .active) y ahí el slide nunca se hace visible. Fijar el inline
        // style evita ese problema y sigue animando igual, porque el
        // `transition: opacity 2s` del CSS aplica a cualquier cambio de
        // valor computado, venga de una clase o de un inline style.
        s.classList.add('active');
        s.style.opacity = '1';
      } else {
        s.classList.remove('active');
        s.style.opacity = '0';
      }
    });
  }

  activate(idx);
  if (!REDUCED_MOTION) {
    // 8200ms: un poco más que los 8s de la transición del CSS, para que el
    // movimiento de cada foto alcance a completarse antes del corte.
    setInterval(() => { idx = (idx + 1) % slides.length; activate(idx); }, 8200);
  }
})();

/* ===== MÚSICA ===== */
const music = document.getElementById('bg-music');
let musicStarted = false;

function startMusic() {
  if (musicStarted) return;
  music.volume = 0;
  music.muted = false;
  const promise = music.play();
  if (promise !== undefined) {
    promise.then(() => {
      musicStarted = true;
      let vol = 0;
      const fade = setInterval(() => {
        if (vol < 0.55) { vol += 0.015; music.volume = vol; }
        else clearInterval(fade);
      }, 120);
    }).catch(() => { });
  }
}

(function () {
  const btn = document.getElementById('music-player');
  function syncBtn() { music.paused ? btn.classList.add('paused') : btn.classList.remove('paused'); }
  btn.addEventListener('click', () => {
    if (music.paused) { musicStarted ? music.play().catch(() => { }) : startMusic(); }
    else music.pause();
  });
  music.addEventListener('play', syncBtn);
  music.addEventListener('pause', syncBtn);
})();

/* =========================================================
   PRECARGA DE RECURSOS CRÍTICOS (fuentes + foto del hero)
   ========================================================= */
function preloadCritical() {
  const heroImg = new Image();
  heroImg.src = 'assets/img/anilo.jpg';
  const imgReady = new Promise(res => { heroImg.onload = res; heroImg.onerror = res; });
  const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise(res => setTimeout(res, 2200));
  return Promise.race([Promise.all([imgReady, fontsReady]), timeout]);
}

/* ===== INTRO: SOBRE CON SELLO DE CERA + REVELADO DEL CHROME DE v3 ===== */
(function () {
  const intro = document.getElementById('intro');
  const seal = document.getElementById('envelopeSeal');
  const flap = document.getElementById('envelopeFlap');
  const card = document.getElementById('envelopeCard');
  const skip = document.getElementById('skipIntro');
  const shell = document.getElementById('mainContent');
  const nav = document.getElementById('mainMenu');
  const fabs = document.querySelector('.fab-stack');
  const namesEl = document.getElementById('introNames');

  // Animar el nombre letra por letra (respetando "&" como span propio)
  function animateNames() {
    if (!namesEl) return;
    const raw = namesEl.textContent;
    namesEl.textContent = '';
    let delay = 0;
    [...raw].forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? ' ' : ch;
      if (ch === '&') span.classList.add('intro-amp');
      else span.classList.add('letter');
      span.style.animationDelay = `${0.6 + delay}s`;
      delay += ch === ' ' ? 0 : 0.045;
      namesEl.appendChild(span);
    });
  }

  seal.style.visibility = 'hidden';
  preloadCritical().then(() => {
    seal.style.visibility = 'visible';
    animateNames();
    setTimeout(() => skip.classList.add('visible'), 1200);
  });

  function revealFrame() {
    intro.classList.add('hidden');
    setTimeout(() => intro.remove(), 950);
    document.body.style.overflow = 'auto';
    shell.classList.add('show');
    nav.classList.add('show');
    fabs.classList.add('show');
    fireOpenConfetti();
    revealSections();
    revealTimelineNodes();
    revealScriptHeadings();
  }

  let opening = false;

  function abrirSobre() {
    if (opening) return;
    opening = true;
    startMusic();

    seal.classList.add('seal-crack');
    setTimeout(() => {
      seal.classList.add('seal-open');
      flap.classList.add('open');
    }, 420);

    setTimeout(() => {
      card.classList.add('reveal');
    }, 950);

    setTimeout(revealFrame, 2050);
  }

  seal.addEventListener('click', abrirSobre);

  skip.addEventListener('click', () => {
    if (opening) return;
    startMusic();
    revealFrame();
  });
})();

/* ===== COUNTDOWN ===== */
(function () {
  const weddingDate = new Date('March 13, 2027 16:30:00').getTime();
  const countdownEl = document.getElementById('countdown');

  function animateNum(id, val) {
    const el = document.getElementById(id);
    const v = String(val).padStart(2, '0');
    if (el.innerText !== v) {
      el.classList.add('animate');
      setTimeout(() => { el.innerText = v; el.classList.remove('animate'); }, 180);
    }
  }

  function tick() {
    const diff = weddingDate - Date.now();
    if (diff < 0) {
      countdownEl.innerHTML =
        '<div style="font-family:\'Parisienne\',cursive;font-size:2rem;color:var(--gold-light);">✨ Hoy celebramos nuestro amor ✨</div>';
      return;
    }
    const days = Math.floor(diff / 86400000);
    countdownEl.classList.toggle('urgent', days < 30);
    animateNum('days', days);
    animateNum('hours', Math.floor((diff % 86400000) / 3600000));
    animateNum('minutes', Math.floor((diff % 3600000) / 60000));
    animateNum('seconds', Math.floor((diff % 60000) / 1000));
  }
  tick();
  setInterval(tick, 1000);
})();

/* ===== SCROLL REVEAL DE SECCIONES + CASCADA EN GALERÍA ===== */
function revealSections() {
  const targets = document.querySelectorAll('.v3-hero, .v3-countdown-section, .v3-gallery-section, .v3-glass-section');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; }
    });
  }, { threshold: 0.08 });

  targets.forEach(el => {
    el.style.transition = 'opacity 0.9s ease, transform 0.9s ease';
    // Si ya está a la vista al momento de revelar, se muestra de inmediato en
    // vez de esperar el primer callback del IntersectionObserver (que en
    // algunos navegadores puede tardar más de un frame en entregarse).
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    } else {
      el.style.opacity = '0';
      el.style.transform = 'translateY(40px)';
    }
    obs.observe(el);
  });

  // Cascada escalonada para las fotos del grid de galería
  const galleryImgs = document.querySelectorAll('.v3-gallery-grid img');
  const galleryObs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 100);
        galleryObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  galleryImgs.forEach(img => {
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) img.classList.add('visible');
    else galleryObs.observe(img);
  });
}

/* ===== REBOTE DE LOS PINES DEL ITINERARIO AL ENTRAR EN PANTALLA ===== */
function revealTimelineNodes() {
  const nodes = document.querySelectorAll('.timeline-node');
  if (!nodes.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('bounce-in');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  nodes.forEach(n => obs.observe(n));
}

/* ===== TÍTULOS: PALABRA POR PALABRA + BARRIDO DE BRILLO ===== */
function revealScriptHeadings() {
  const headings = document.querySelectorAll('.v3-script-heading');
  if (!headings.length) return;

  headings.forEach(h => {
    const raw = h.textContent.trim();
    if (!raw) return;
    h.setAttribute('data-text', raw);
    h.innerHTML = '';
    raw.split(/(\s+)/).forEach(chunk => {
      if (chunk.trim() === '') {
        h.appendChild(document.createTextNode(chunk));
        return;
      }
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = chunk;
      h.appendChild(span);
    });
  });

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateHeading(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  headings.forEach(h => obs.observe(h));

  function animateHeading(h) {
    const words = h.querySelectorAll('.word');
    words.forEach((w, i) => {
      w.style.animationDelay = `${i * 0.09}s`;
      w.classList.add('reveal');
    });
    const totalMs = words.length * 90 + 550;
    setTimeout(() => h.classList.add('shine'), totalMs);
  }
}

/* ===== PARALLAX EN LA FOTO CIRCULAR DEL HERO ===== */
(function () {
  const ring = document.getElementById('heroPhotoRing');
  if (!ring || REDUCED_MOTION) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = ring.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        ring.style.transform = `translateY(${window.scrollY * 0.12}px)`;
      }
      ticking = false;
    });
  }, { passive: true });
})();

/* ===== LÍNEA DEL ITINERARIO LIGADA AL SCROLL ===== */
(function () {
  const wrap = document.querySelector('.itinerary-wrap');
  if (!wrap) return;

  function update() {
    const rect = wrap.getBoundingClientRect();
    const referenceY = window.innerHeight * 0.75;
    let progress = (referenceY - rect.top) / rect.height;
    progress = Math.max(0, Math.min(1, progress));
    wrap.style.setProperty('--line-progress', progress.toFixed(3));
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ===== MENÚ INFERIOR: LINK ACTIVO ===== */
(function () {
  const links = document.querySelectorAll('#mainMenu a');
  const sections = [...links].map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 100;
    sections.forEach(sec => {
      if (scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight) {
        links.forEach(a => a.classList.remove('active'));
        const match = document.querySelector(`#mainMenu a[href="#${sec.id}"]`);
        if (match) match.classList.add('active');
      }
    });
  }, { passive: true });
})();

/* ===== CARRUSEL PADRINOS ===== */
const _carousel = document.getElementById('coverflow');
const _cards = _carousel.querySelectorAll('.card');
const _dots = document.getElementById('carouselDots');
let _index = 0;
let _auto;

_cards.forEach((_, i) => {
  const dot = document.createElement('span');
  dot.addEventListener('click', () => { _index = i; updateCarousel(); restartAuto(); });
  _dots.appendChild(dot);
});
const dotEls = _dots.querySelectorAll('span');

function updateCarousel() {
  // Se limpia también cualquier transform inline que haya dejado el tilt 3D
  // (ver más abajo) para que la tarjeta que deja de estar activa no se
  // quede "congelada" con una inclinación vieja.
  _cards.forEach(c => { c.className = 'card'; c.style.transform = ''; c.style.transition = ''; });
  dotEls.forEach(d => d.classList.remove('active'));
  _cards[_index].classList.add('active');
  _cards[(_index + 1) % _cards.length].classList.add('next');
  _cards[(_index - 1 + _cards.length) % _cards.length].classList.add('prev');
  dotEls[_index].classList.add('active');
}
function nextSlide() { _index = (_index + 1) % _cards.length; updateCarousel(); }
function prevSlide() { _index = (_index - 1 + _cards.length) % _cards.length; updateCarousel(); }
function restartAuto() {
  clearInterval(_auto);
  if (!REDUCED_MOTION) _auto = setInterval(nextSlide, 4500);
}

_carousel.addEventListener('mouseenter', () => clearInterval(_auto));
_carousel.addEventListener('mouseleave', restartAuto);

let _touchX = null;
_carousel.addEventListener('touchstart', e => { _touchX = e.changedTouches[0].clientX; }, { passive: true });
_carousel.addEventListener('touchend', e => {
  if (_touchX === null) return;
  const diff = e.changedTouches[0].clientX - _touchX;
  if (Math.abs(diff) > 40) { diff < 0 ? nextSlide() : prevSlide(); restartAuto(); }
  _touchX = null;
}, { passive: true });

updateCarousel();
restartAuto();

/* ===== CARRUSEL GALERÍA PAUSE FUERA DE VISTA ===== */
(function () {
  const track = document.querySelector('.v3-carousel-track');
  const carousel = document.querySelector('.v3-carousel');
  if (track && carousel) {
    new IntersectionObserver(entries => {
      track.style.animationPlayState = entries[0].isIntersecting ? 'running' : 'paused';
    }, { threshold: 0.2 }).observe(carousel);
  }
})();

/* =========================================================
   RSVP: asistencia Sí/No + acompañantes + manejo real de errores
   ========================================================= */
(function () {
  const form = document.getElementById('rsvpForm');
  const message = document.getElementById('formMessage');
  const spinner = document.getElementById('spinner');
  const submitBtn = document.getElementById('submitBtn');
  const guestSection = document.getElementById('guestSection');
  const numAcompanantes = document.getElementById('numAcompanantes');
  const guestNamesList = document.getElementById('guestNamesList');
  const nombreInput = document.getElementById('rsvpNombre');
  const leadEl = document.getElementById('rsvpLead');
  let sending = false;

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbykznj9_suZV6_Z8IGMzyNUAFrXafW0ZawlFW1xkV2VyADw3rT5OM94o3Ehyez3V3jwpw/exec';

  /* ===== INVITACIÓN PERSONALIZADA (?g=slug → js/guests.js) =====
     Sin lista cargada (o link sin "?g=" reconocido), el límite por
     defecto es 0-1 acompañante — más restrictivo a propósito, para no
     autorizar de más mientras la lista real no esté lista. */
  const DEFAULT_MAX_ACOMPANANTES = 1;
  const guestSlug = new URLSearchParams(location.search).get('g');
  const guest = (guestSlug && window.GUEST_LIST && window.GUEST_LIST[guestSlug]) || null;
  const maxAcompanantes = guest ? guest.maxAcompanantes : DEFAULT_MAX_ACOMPANANTES;

  numAcompanantes.max = String(maxAcompanantes);
  if (guest) {
    nombreInput.value = guest.nombre;
    leadEl.innerHTML = `¡Hola, <strong>${guest.nombre}</strong>! Por favor confirma tu asistencia antes del <strong>01 de Febrero de 2027</strong>.`;
  }

  function renderGuestInputs(count) {
    const current = guestNamesList.querySelectorAll('input').length;
    if (count === current) return;
    const values = [...guestNamesList.querySelectorAll('input')].map(i => i.value);
    guestNamesList.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Nombre del acompañante ${i + 1}`;
      input.value = values[i] || '';
      guestNamesList.appendChild(input);
    }
  }

  form.querySelectorAll('input[name="asistencia"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const attending = radio.value === 'si' && radio.checked;
      if (attending) {
        guestSection.hidden = false;
      } else if (radio.checked) {
        guestSection.hidden = true;
        numAcompanantes.value = 0;
        guestNamesList.innerHTML = '';
      }
    });
  });

  numAcompanantes.addEventListener('input', () => {
    let n = parseInt(numAcompanantes.value, 10) || 0;
    n = Math.max(0, Math.min(maxAcompanantes, n));
    numAcompanantes.value = n;
    renderGuestInputs(n);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;

    const asistenciaInput = form.querySelector('input[name="asistencia"]:checked');
    if (!form.nombre.value.trim() || !asistenciaInput) {
      message.textContent = 'Por favor completa tu nombre y confirma si nos acompañas.';
      message.classList.add('error');
      return;
    }

    sending = true;
    submitBtn.disabled = true;
    spinner.style.display = 'block';
    message.textContent = '';
    message.classList.remove('error');

    const acompanantes = [...guestNamesList.querySelectorAll('input')]
      .map(i => i.value.trim())
      .filter(Boolean);

    const data = {
      nombre: form.nombre.value.trim(),
      asistencia: asistenciaInput.value,
      acompanantes,
      comentarios: form.comentarios.value.trim(),
      invitado: guestSlug || ''
    };

    try {
      // Google Apps Script no agrega cabeceras CORS a la respuesta del
      // endpoint /exec, así que el navegador bloquea la lectura de esa
      // respuesta aunque el script se haya ejecutado bien del otro lado
      // (esto es una limitación de Apps Script, no de este código). Por
      // eso se usa `mode: 'no-cors'`: el envío sí llega y se procesa,
      // pero ya no podemos leer el status/body de vuelta. `fetch` solo
      // rechaza aquí ante fallas reales de red (sin conexión, URL mal
      // escrita, DNS, etc.), que es justo lo que queremos seguir detectando.
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(data)
      });
      form.style.display = 'none';
      message.textContent = '✨ Gracias por confirmar — Te esperamos con los brazos abiertos 🤍';
      lanzarCorazones();
    } catch (err) {
      message.textContent = 'Hubo un problema al enviar tu confirmación. Revisa tu conexión e intenta de nuevo, o escríbenos directamente.';
      message.classList.add('error');
    } finally {
      spinner.style.display = 'none';
      submitBtn.disabled = false;
      sending = false;
    }
  });
})();

/* ===== DATOS BANCARIOS: inyectados por JS, no viven en el HTML ===== */
const CARD_NUMBER = '4152 3137 7105 6947';
const CLABE = '012743015426556397';

function mostrarDatosBancarios() {
  const sensitive = document.getElementById('bankSensitive');
  const revealBtn = document.getElementById('revealBank');
  document.getElementById('cardValue').textContent = CARD_NUMBER;
  document.getElementById('clabeValue').textContent = CLABE;
  sensitive.classList.add('revealed');
  revealBtn.style.display = 'none';
}

function copiarClabe() {
  navigator.clipboard.writeText(CLABE).then(() => {
    const btn = document.getElementById('copyClabe');
    btn.classList.add('copied');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      btn.classList.remove('copied');
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copiar CLABE';
    }, 2500);
  });
}

/* ===== LIGHTBOX ===== */
(function () {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbClose = document.getElementById('lightbox-close');
  const lbPrev = document.getElementById('lightbox-prev');
  const lbNext = document.getElementById('lightbox-next');
  const lbCount = document.getElementById('lightbox-counter');

  const galleryImgs = ['assets/img/anilo.jpg', 'assets/img/portada3.jpg', 'assets/img/portada1.jpg', 'assets/img/portada2.jpg'];
  let current = 0;

  function showLightbox(index) {
    current = ((index % galleryImgs.length) + galleryImgs.length) % galleryImgs.length;
    lbImg.style.opacity = '0';
    lbImg.style.transform = 'scale(0.88)';
    setTimeout(() => {
      lbImg.src = galleryImgs[current];
      lbImg.style.opacity = '1';
      lbImg.style.transform = 'scale(1)';
    }, 150);
    lbCount.textContent = `${current + 1} / ${galleryImgs.length}`;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() { lb.classList.remove('open'); document.body.style.overflow = ''; }

  lbImg.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

  document.addEventListener('click', e => {
    const target = e.target.closest('[data-gallery]');
    if (target) { e.preventDefault(); showLightbox(parseInt(target.dataset.gallery, 10)); }
  });

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => showLightbox(current - 1));
  lbNext.addEventListener('click', () => showLightbox(current + 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLightbox(current - 1);
    if (e.key === 'ArrowRight') showLightbox(current + 1);
  });

  let lbTouchX = null;
  lb.addEventListener('touchstart', e => { lbTouchX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (lbTouchX === null) return;
    const diff = e.changedTouches[0].clientX - lbTouchX;
    if (Math.abs(diff) > 50) diff < 0 ? showLightbox(current + 1) : showLightbox(current - 1);
    lbTouchX = null;
  }, { passive: true });
})();

/* ===== CONFETTI: EXPLOSIÓN DESDE EL CENTRO (al abrir la invitación) ===== */
function fireOpenConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  const COLORS = ['#b8935a', '#d9c08e', '#8c6a32', '#f4efe4', '#fff8e7', '#e8a0b0', '#9ad1c9'];
  const SHAPES = ['circle', 'rect', 'diamond', 'heart'];
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.42;
  const count = REDUCED_MOTION ? 0 : 160;

  const pieces = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 12 + 4;
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      r: Math.random() * 6 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1
    };
  });

  let frame;
  function drawHeart(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y, x - size, y, x - size, y + size * 0.3);
    ctx.bezierCurveTo(x - size, y + size * 0.7, x, y + size * 1.1, x, y + size * 1.3);
    ctx.bezierCurveTo(x, y + size * 1.1, x + size, y + size * 0.7, x + size, y + size * 0.3);
    ctx.bezierCurveTo(x + size, y, x, y, x, y + size * 0.3);
    ctx.closePath();
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let allDone = true;
    pieces.forEach(p => {
      if (p.opacity <= 0) return;
      allDone = false;
      p.vy += 0.28;
      p.vx *= 0.985;
      p.x += p.vx; p.y += p.vy;
      p.rotation += p.rotSpeed;
      if (p.y > canvas.height * 0.55) p.opacity = Math.max(0, p.opacity - 0.012);
      ctx.save(); ctx.globalAlpha = p.opacity; ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color;
      if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
      else if (p.shape === 'rect') { ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r); }
      else if (p.shape === 'diamond') { ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(p.r * 0.7, 0); ctx.lineTo(0, p.r); ctx.lineTo(-p.r * 0.7, 0); ctx.closePath(); ctx.fill(); }
      else if (p.shape === 'heart') { drawHeart(ctx, 0, -p.r * 0.5, p.r * 0.5); ctx.fill(); }
      ctx.restore();
    });
    if (!allDone) frame = requestAnimationFrame(animate);
    else { cancelAnimationFrame(frame); canvas.style.display = 'none'; }
  }
  animate();
  setTimeout(() => { cancelAnimationFrame(frame); canvas.style.display = 'none'; }, 4500);
}

/* ===== CONFETTI: LLUVIA (al confirmar asistencia) ===== */
/* ===== CORAZONES SUBIENDO (al confirmar asistencia) ===== */
function lanzarCorazones() {
  if (REDUCED_MOTION) return;
  const container = document.createElement('div');
  container.className = 'hearts-rise';
  document.body.appendChild(container);

  const COLORS = ['#b8935a', '#d9c08e', '#e8a0b0', '#f4efe4', '#9ad1c9'];
  const count = 26;

  for (let i = 0; i < count; i++) {
    const heart = document.createElement('i');
    heart.className = 'fa-regular fa-heart heart-particle';
    heart.style.left = `${Math.random() * 96 + 2}%`;
    heart.style.fontSize = `${14 + Math.random() * 18}px`;
    heart.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    heart.style.setProperty('--drift', `${Math.random() * 70 - 35}px`);
    heart.style.setProperty('--rot', `${Math.random() * 40 - 20}deg`);
    heart.style.animationDuration = `${2.6 + Math.random() * 1.8}s`;
    heart.style.animationDelay = `${Math.random() * 0.9}s`;
    container.appendChild(heart);
  }

  setTimeout(() => container.remove(), 5200);
}

/* ===== TEMA CLARO/OSCURO (oscuro por defecto) ===== */
(function () {
  const btn = document.getElementById('theme-toggle');
  const html = document.documentElement;
  const saved = localStorage.getItem('wedding-theme-final');
  if (saved === 'light') html.setAttribute('data-theme', 'light');

  btn.addEventListener('click', () => {
    const isLight = html.getAttribute('data-theme') === 'light';
    if (isLight) html.removeAttribute('data-theme');
    else html.setAttribute('data-theme', 'light');
    localStorage.setItem('wedding-theme-final', isLight ? 'dark' : 'light');
    btn.style.transform = 'scale(1.15) rotate(15deg)';
    setTimeout(() => { btn.style.transform = ''; }, 300);
  });
})();

/* =========================================================
   TILT 3D — tarjetas de padrinos, regalos e itinerario.
   Sólo en dispositivos con mouse real (hover:hover + pointer:fine) y
   sin prefers-reduced-motion; en touch no aplica (no hay cursor que
   "inclinar" la tarjeta).
   ========================================================= */
(function () {
  if (REDUCED_MOTION) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  function tiltHandlers(el, { maxDeg, scale, perspective, base }) {
    const restTransform = base ? `${base} perspective(${perspective}px) rotateX(0deg) rotateY(0deg)` : '';
    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - py) * maxDeg * 2;
      const rotateY = (px - 0.5) * maxDeg * 2;
      el.style.transition = 'transform 0.08s linear';
      el.style.transform = `${base || ''} perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${base ? '' : `scale(${scale})`}`.trim();
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1)';
      el.style.transform = restTransform;
    });
  }

  // Regalos
  document.querySelectorAll('#regalos .v3-glass-card').forEach(el => {
    tiltHandlers(el, { maxDeg: 6, scale: 1.025, perspective: 700 });
  });

  // Itinerario
  document.querySelectorAll('.timeline-card').forEach(el => {
    tiltHandlers(el, { maxDeg: 7, scale: 1.04, perspective: 600 });
  });

  // Padrinos: sólo la tarjeta frontal (activa) del coverflow, preservando
  // el translate/scale de posicionamiento que ya usa el carrusel — por
  // eso "base" va fijo y sólo se le agrega la rotación del tilt encima.
  const coverflow = document.getElementById('coverflow');
  if (coverflow) {
    const PADRINOS_BASE = 'translate(-50%, -50%) scale(1)';
    coverflow.addEventListener('mousemove', e => {
      const active = coverflow.querySelector('.card.active');
      if (!active) return;
      const rect = active.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) {
        active.style.transition = 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1)';
        active.style.transform = '';
        return;
      }
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateX = (0.5 - py) * 16;
      const rotateY = (px - 0.5) * 16;
      active.style.transition = 'transform 0.08s linear';
      active.style.transform = `${PADRINOS_BASE} perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    coverflow.addEventListener('mouseleave', () => {
      const active = coverflow.querySelector('.card.active');
      if (!active) return;
      active.style.transition = 'transform 0.5s cubic-bezier(0.2,0.8,0.2,1)';
      active.style.transform = '';
    });
  }
})();
