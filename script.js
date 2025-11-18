// Vortex — unified script with nav badge, auto-scroll, nav reveal, and shortcut hint
(() => {
  const LS = 'vortex_stopwatch_v4';

  /* ----------------------
     Utilities
  ----------------------- */
  function format(ms) {
    const t = Math.floor(ms);
    const h = Math.floor(t / 3600000);
    const m = Math.floor((t % 3600000) / 60000);
    const s = Math.floor((t % 60000) / 1000);
    const msPart = t % 1000;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(msPart).padStart(3,'0')}`;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS);
      return raw ? JSON.parse(raw) : { running:false, elapsedBefore:0, laps:[] };
    } catch (e) { return { running:false, elapsedBefore:0, laps:[] }; }
  }
  function saveState(state) {
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch(e){}
  }

  /* ----------------------
     Shared lap helpers
  ----------------------- */
  let laps = []; // newest-first
  function saveLapsOnly() {
    try {
      const raw = localStorage.getItem(LS);
      const st = raw ? JSON.parse(raw) : { running:false, elapsedBefore:0, laps:[] };
      st.laps = laps;
      localStorage.setItem(LS, JSON.stringify(st));
    } catch (e) {}
  }

  function exportCSV(ascending = true) {
    if (!laps.length) { alert('No laps to export.'); return; }
    const arr = ascending ? [...laps].reverse() : [...laps];
    const header = 'Index,Time,ISO Timestamp\n';
    const rows = arr.map((l,i) => `${i+1},"${l.text}",${new Date(l.ts).toISOString()}`).join('\n');
    const csv = header + rows;
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vortex_laps.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function copyLaps(ascending = true) {
    if (!laps.length) { alert('No laps to copy.'); return; }
    const arr = ascending ? [...laps].reverse() : [...laps];
    const text = arr.map((l,i) => `${i+1}. ${l.text}`).join('\n');
    navigator.clipboard?.writeText(text).catch(()=> alert('Copy failed.'));
  }

  /* ----------------------
     Rendering laps (ascending)
  ----------------------- */
  function renderLapsInto(container) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = laps.length - 1, idx = 1; i >= 0; i--, idx++) {
      const l = laps[i];
      const li = document.createElement('li');
      li.className = 'lap-item';
      const left = document.createElement('div');
      left.className = 'lap-index';
      left.textContent = `Lap ${idx}`;
      const right = document.createElement('div');
      right.className = 'lap-time';
      right.textContent = l.text;
      li.appendChild(left);
      li.appendChild(right);
      container.appendChild(li);
      requestAnimationFrame(() => li.classList.add('show'));
    }
    // auto-scroll to bottom so newest is visible (ascending order: bottom = newest)
    container.scrollTop = container.scrollHeight;
  }

  /* ----------------------
     Nav helpers
  ----------------------- */
  function setNavLoaded() {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.add('nav-loaded');
  }

  function updateNavBadge() {
    // put a small badge with last lap (most recent) on the Laps nav item
    const navLinks = Array.from(document.querySelectorAll('.nav-link'));
    const lapsLink = navLinks.find(n => (n.textContent || '').toLowerCase().includes('laps'));
    if (!lapsLink) return;

    // remove old badge
    const old = lapsLink.querySelector('.nav-badge');
    if (old) old.remove();

    if (laps.length) {
      const latest = laps[0]; // newest-first
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      // show compact latest time (H:MM:SS.mmm -> show mm:ss.ms if hours zero)
      let text = latest.text;
      // shorten if hours are 00
      if (text.startsWith('00:')) text = text.slice(3);
      // keep max ~10 chars
      if (text.length > 10) text = text.slice(0,10);
      badge.textContent = text;
      lapsLink.appendChild(badge);
    }
  }

  /* ----------------------
     Home page setup
  ----------------------- */
  function initHome() {
    const display = document.getElementById('display');
    const startBtn = document.getElementById('startBtn');
    const lapBtn = document.getElementById('lapBtn');
    const resetBtn = document.getElementById('resetBtn');
    const copyBtn = document.getElementById('copyBtn');
    const exportBtn = document.getElementById('exportBtn');
    const drawerToggle = document.getElementById('drawerToggle');
    const lapDrawer = document.getElementById('lapDrawer');
    const clearBtn = document.getElementById('clearBtn');
    const lapsList = document.getElementById('lapsList');
    const stateText = document.getElementById('stateText');
    const lapCount = document.getElementById('lapCount');
    const glow = document.getElementById('glow');

    if (!display) return;

    // state from storage
    const stored = loadState();
    laps = stored.laps || [];
    let running = !!stored.running;
    let elapsedBefore = stored.elapsedBefore || 0;
    let startTime = 0;
    let raf = null;

    // render initial
    renderLapsInto(lapsList);
    lapCount.textContent = String(laps.length);
    updateNavBadge();

    // show display value
    if (running) {
      startTime = performance.now();
      raf = requestAnimationFrame(tick);
      startBtn.textContent = 'Pause';
      startBtn.setAttribute('aria-pressed','true');
      lapBtn.disabled = false; resetBtn.disabled = false;
      stateText.textContent = 'Running';
      setVisual(true);
    } else {
      display.textContent = format(elapsedBefore);
      startBtn.textContent = 'Start';
      lapBtn.disabled = !(elapsedBefore || laps.length);
      resetBtn.disabled = !(elapsedBefore || laps.length);
      stateText.textContent = running ? 'Running' : 'Stopped';
      setVisual(false);
    }

    // keyboard hint tooltip (one-time)
    const hint = document.createElement('div');
    hint.className = 'shortcut-hint';
    hint.textContent = 'Enter = Lap · Space = Start/Pause';
    const card = document.querySelector('.card');
    if (card) card.appendChild(hint);
    setTimeout(()=> hint.classList.add('show'), 420);
    // hide after 4s
    setTimeout(()=> hint.classList.remove('show'), 4200);

    // helpers
    function tick() {
      const now = performance.now();
      const elapsed = elapsedBefore + (now - startTime);
      display.textContent = format(elapsed);
      raf = requestAnimationFrame(tick);
    }
    function setVisual(on) {
      if (on) {
        display.classList.add('running');
        if (glow) { glow.style.opacity = '1'; glow.style.transform = 'scale(1.02)'; }
      } else {
        display.classList.remove('running');
        if (glow) { glow.style.opacity = '0'; glow.style.transform = 'scale(0.85)'; }
      }
    }

    // controls
    function start() {
      if (running) return;
      running = true;
      startTime = performance.now();
      raf = requestAnimationFrame(tick);
      startBtn.textContent = 'Pause';
      startBtn.setAttribute('aria-pressed','true');
      lapBtn.disabled = false; resetBtn.disabled = false;
      stateText.textContent = 'Running';
      setVisual(true);
      saveState({ running, elapsedBefore, laps });
    }
    function pause() {
      if (!running) return;
      running = false;
      startBtn.textContent = 'Start';
      startBtn.setAttribute('aria-pressed','false');
      if (raf) cancelAnimationFrame(raf);
      elapsedBefore += (performance.now() - startTime);
      stateText.textContent = 'Paused';
      setVisual(false);
      saveState({ running, elapsedBefore, laps });
    }
    function reset() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      elapsedBefore = 0;
      startTime = 0;
      display.textContent = '00:00:00.000';
      laps = [];
      saveState({ running, elapsedBefore, laps });
      renderLapsInto(lapsList);
      lapCount.textContent = '0';
      lapBtn.disabled = true; resetBtn.disabled = true;
      stateText.textContent = 'Stopped';
      setVisual(false);
      updateNavBadge();
    }
    function recordLap() {
      const now = running ? (elapsedBefore + (performance.now() - startTime)) : elapsedBefore;
      const obj = { t: now, text: format(now), ts: Date.now() };
      laps.unshift(obj); // store newest-first
      saveLapsOnly();
      renderLapsInto(lapsList);
      lapCount.textContent = String(laps.length);
      lapDrawer.classList.remove('closed'); // open drawer
      display.classList.add('lap-flash');
      setTimeout(()=> display.classList.remove('lap-flash'), 520);
      resetBtn.disabled = false;
      updateNavBadge();
    }

    // events
    startBtn.addEventListener('click', ()=> running ? pause() : start());
    lapBtn.addEventListener('click', recordLap);
    resetBtn.addEventListener('click', ()=>{
      if ((laps.length || elapsedBefore) && !confirm('Reset stopwatch and clear laps?')) return;
      reset();
    });

    copyBtn.addEventListener('click', ()=> {
      copyLaps();
      copyBtn.textContent = 'Copied';
      setTimeout(()=> copyBtn.textContent = 'Copy', 1200);
    });
    exportBtn.addEventListener('click', ()=> exportCSV());
    drawerToggle.addEventListener('click', ()=> lapDrawer.classList.toggle('closed'));
    clearBtn.addEventListener('click', ()=> {
      if (!laps.length) return;
      if (!confirm('Clear all laps?')) return;
      laps = [];
      saveLapsOnly();
      renderLapsInto(lapsList);
      lapCount.textContent = '0';
      updateNavBadge();
    });

    // keyboard
    window.addEventListener('keydown', (e) => {
      const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.code === 'Space') { e.preventDefault(); running ? pause() : start(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (!lapBtn.disabled) recordLap(); }
      else if (e.key.toLowerCase() === 'l') { if (!lapBtn.disabled) recordLap(); }
      else if (e.key.toLowerCase() === 'r') { if (confirm('Reset stopwatch and clear laps?')) reset(); }
    });

    // small ripple for buttons
    document.querySelectorAll('.btn').forEach(b=>{
      b.addEventListener('click', (ev)=>{
        const s = document.createElement('span');
        s.style.position='absolute'; s.style.borderRadius='50%'; s.style.pointerEvents='none';
        s.style.width = s.style.height = '10px';
        s.style.left = (ev.offsetX - 5) + 'px'; s.style.top = (ev.offsetY - 5) + 'px';
        s.style.background = 'rgba(255,255,255,0.08)';
        s.style.transform = 'scale(0)'; s.style.transition = 'transform 420ms ease, opacity 420ms';
        b.appendChild(s);
        requestAnimationFrame(()=> { s.style.transform='scale(14)'; s.style.opacity='0'; });
        setTimeout(()=> s.remove(), 520);
      });
    });

  } // end initHome

  /* ----------------------
     Laps-only page init
  ----------------------- */
  function initLapsOnly() {
    const container = document.getElementById('lapsList');
    const copyBtn = document.getElementById('copyBtn');
    const exportBtn = document.getElementById('exportBtn');
    const clearBtn = document.getElementById('clearBtn');
    const navExport = document.getElementById('navExport');

    const stored = loadState();
    laps = stored.laps || [];
    renderLapsInto(container);
    updateNavBadge();

    copyBtn?.addEventListener('click', ()=> {
      copyLaps();
      copyBtn.textContent = 'Copied';
      setTimeout(()=> copyBtn.textContent = 'Copy', 1200);
    });
    exportBtn?.addEventListener('click', ()=> exportCSV());
    navExport?.addEventListener('click', ()=> exportCSV());
    clearBtn?.addEventListener('click', ()=> {
      if (!laps.length) return;
      if (!confirm('Clear all laps?')) return;
      laps = [];
      saveLapsOnly();
      renderLapsInto(container);
      updateNavBadge();
    });

    document.querySelectorAll('.btn').forEach(b=>{
      b.addEventListener('click',(ev)=>{
        const s = document.createElement('span');
        s.style.position='absolute'; s.style.borderRadius='50%'; s.style.pointerEvents='none';
        s.style.width = s.style.height = '10px';
        s.style.left = (ev.offsetX - 5) + 'px'; s.style.top = (ev.offsetY - 5) + 'px';
        s.style.background = 'rgba(255,255,255,0.08)';
        s.style.transform = 'scale(0)'; s.style.transition = 'transform 420ms ease, opacity 420ms';
        b.appendChild(s);
        requestAnimationFrame(()=> { s.style.transform='scale(14)'; s.style.opacity='0'; });
        setTimeout(()=> s.remove(), 520);
      });
    });
  }

  /* ----------------------
     Nav behavior
  ----------------------- */
  function initNavBehavior() {
    const nav = document.getElementById('mainNav');
    const navLinks = Array.from(document.querySelectorAll('.nav-link[data-target]'));
    const navToggle = document.getElementById('navToggle');
    const navExport = document.getElementById('navExport');

    function onScroll() {
      const scrolled = window.scrollY > 18;
      nav.classList.toggle('scrolled', scrolled);

      // highlight active link: if on laps.html make laps active; otherwise stopwatch
      const path = window.location.pathname.split('/').pop();
      const isLapsPage = path === 'laps.html';
      navLinks.forEach(l => {
        const t = l.dataset.target;
        if (isLapsPage) {
          if (t === 'laps') l.classList.add('active'); else l.classList.remove('active');
        } else {
          // home: mark stopwatch
          if (t === 'stopwatch') l.classList.add('active'); else l.classList.remove('active');
        }
      });
    }

    // smooth-scroll behavior for local links to index sections
    navLinks.forEach(link => {
      link.addEventListener('click', (ev) => {
        const href = link.getAttribute('href') || '';
        if (href.includes('index.html') || href.startsWith('#') || href.includes('index.html#')) {
          ev.preventDefault();
          // determine id
          let id = 'stopwatch';
          if (href.includes('#')) id = href.split('#')[1] || 'stopwatch';
          const targetEl = document.getElementById(id);
          if (targetEl) {
            const top = targetEl.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(nav).height) || 64) - 8;
            window.scrollTo({ top, behavior:'smooth' });
          } else {
            window.location = 'index.html';
          }
          document.getElementById('mainNav')?.classList.remove('open');
          navToggle?.setAttribute('aria-expanded','false');
        }
      });
    });

    navToggle?.addEventListener('click', () => {
      const n = document.getElementById('mainNav');
      const open = n.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // nav export button wiring (works on both pages)
    navExport?.addEventListener('click', ()=> exportCSV());

    onScroll();
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
  }

  /* ----------------------
     Init
  ----------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    // reveal nav with animation
    setNavLoaded();

    // populate shared laps from storage
    const stored = loadState();
    laps = stored.laps || [];
    updateNavBadge();

    // detect page
    if (document.getElementById('display')) {
      initHome();
    } else if (document.getElementById('lapsOnly') || document.querySelector('.lap-page-card')) {
      initLapsOnly();
    }

    // nav & scroll behavior
    initNavBehavior();
  });

  // Expose for debug
  window._vortex = { exportCSV };
})();
