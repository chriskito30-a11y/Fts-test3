/* ================================================================
   FTS-PWA.JS — Service Worker + Prompt d'installation
   À inclure en dernier dans toutes les pages (avant </body>).
   Nécessite un élément #install-bar dans le HTML de la page.
   ================================================================ */

'use strict';


/* ── REGISTRATION SERVICE WORKER ─────────────────────────────── */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.warn('[FTS] SW registration failed:', err));
  });
}


/* ── INSTALL PROMPT PWA ───────────────────────────────────────── */

(function() {
  // Si déjà refusé, on n'affiche plus
  if (localStorage.getItem('fts_install_dismissed')) return;

  const bar      = document.getElementById('install-bar');
  if (!bar) return;

  const msg      = document.getElementById('install-msg');
  const btn      = document.getElementById('btn-install');
  const closeBtn = document.getElementById('btn-close-bar');
  let deferredPrompt = null;

  function show() { bar.classList.add('show'); }
  function hide() {
    bar.classList.remove('show');
    localStorage.setItem('fts_install_dismissed', '1');
  }

  // iOS — instruction manuelle
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  if (isIOS && !window.navigator.standalone) {
    if (msg) msg.innerHTML = "Installe l'appli : appuie sur <span>⬆</span> puis <span>Ajouter à l'écran d'accueil</span>";
    if (btn) btn.style.display = 'none';
    show();
  }

  // Android / Chrome — prompt natif
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (msg) msg.innerHTML = "Installe l'appli <span>Fais Ton Show</span> sur ton téléphone !";
    if (btn) btn.style.display = '';
    show();
  });

  if (btn) {
    btn.addEventListener('click', function() {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        hide();
      });
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', hide);
  }
})();
