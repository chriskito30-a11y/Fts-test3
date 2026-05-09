/* ================================================================
   FTS-UTILS.JS — Utilitaires JavaScript partagés
   Chargé en premier dans toutes les pages via <script src>.
   Expose un objet global window.FTS avec tous les helpers.
   ================================================================ */

'use strict';

window.FTS = window.FTS || {};

const FTS = window.FTS;


/* ── STOCKAGE LOCAL ──────────────────────────────────────────── */

FTS.store = {
  get:    (k)    => localStorage.getItem(k),
  set:    (k, v) => localStorage.setItem(k, String(v)),
  remove: (k)    => localStorage.removeItem(k),
  has:    (k)    => localStorage.getItem(k) !== null,
};


/* ── CSV PARSER — avec headers (retourne tableau d'objets) ───── */
/*
  Usage : const rows = FTS.parseCSV(csvText);
  Retourne : [ { col1: 'val', col2: 'val', ... }, ... ]
*/
FTS.parseCSV = function(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(',')
    .map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  return lines.slice(1).map(line => {
    const vals = [];
    let val = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { vals.push(val.trim()); val = ''; }
      else { val += line[i]; }
    }
    vals.push(val.trim());

    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || '').replace(/^"|"$/g, '');
    });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
};


/* ── CSV PARSER — sans headers (retourne tableau de tableaux) ── */
/*
  Usage : const rows = FTS.parseCSVRaw(csvText);
  Retourne : [ ['val1', 'val2'], ['val3', 'val4'], ... ]
  (ignore la ligne 0 = headers)
*/
FTS.parseCSVRaw = function(text) {
  const lines = text.trim().split('\n');
  const result = [];
  for (let li = 1; li < lines.length; li++) {
    const row = lines[li];
    const cols = [];
    let s = '', q = false;
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '"') { q = !q; }
      else if (row[i] === ',' && !q) { cols.push(s.trim()); s = ''; }
      else { s += row[i]; }
    }
    cols.push(s.trim());
    if (cols.some(x => x)) result.push(cols);
  }
  return result;
};


/* ── SÉCURITÉ HTML ─────────────────────────────────────────────── */

FTS.esc = function(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};


/* ── NORMALISATION (Firebase keys, comparaisons) ─────────────── */
/*
  Usage : FTS.norm('Théâtre') → 'theatre'
*/
FTS.norm = function(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
};


/* ── DATES & HEURES ─────────────────────────────────────────── */

FTS.formatDate = function(ts) {
  return new Date(ts).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

FTS.formatTime = function(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  });
};

FTS.formatDateTime = function(ts) {
  const d   = new Date(ts);
  const now = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString())  return `Aujourd'hui · ${FTS.formatTime(ts)}`;
  if (d.toDateString() === yest.toDateString()) return `Hier · ${FTS.formatTime(ts)}`;
  return `${FTS.formatDate(ts)} · ${FTS.formatTime(ts)}`;
};

FTS.dayLabel = function(ts) {
  const d   = new Date(ts);
  const now = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString())  return "Aujourd'hui";
  if (d.toDateString() === yest.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
};


/* ── GÉNÉRATION D'IDENTIFIANT UNIQUE ──────────────────────────── */

FTS.genUID = function() {
  return 'u' + Math.random().toString(36).substr(2, 9);
};


/* ── ICÔNE PAR NOM DE CATÉGORIE ──────────────────────────────── */

FTS.catIcon = function(name) {
  const n = FTS.norm(name);
  if (n.includes('theat'))              return '🎭';
  if (n.includes('dans'))               return '💃';
  if (n.includes('musi') || n.includes('chant')) return '🎸';
  if (n.includes('singer_academy'))     return '⭐';
  if (n.includes('singer_show'))        return '🌟';
  if (n.includes('comedie'))            return '🎬';
  if (n.includes('atelier'))            return '🎨';
  if (n.includes('formation'))          return '🎼';
  return '💬';
};


/* ── FETCH AVEC TIMEOUT ───────────────────────────────────────── */
/*
  Usage : FTS.fetch(url, 8000).then(r => r.text()).catch(...)
*/
FTS.fetch = function(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, { signal: ctrl.signal })
    .finally(() => clearTimeout(id));
};


/* ── UPLOAD CLOUDINARY ─────────────────────────────────────────── */
/*
  Usage :
    FTS.uploadCloudinary(file, onProgress)
      .then(url => ...)
      .catch(err => ...)
*/
FTS.uploadCloudinary = function(file, onProgress) {
  const { cloudName, uploadPreset } = FTS.CLOUDINARY;
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', uploadPreset);
    fd.append('resource_type', 'auto');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.secure_url);
      } else {
        reject(new Error('Upload échoué : ' + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error('Erreur réseau'));
    xhr.send(fd);
  });
};


/* ── SCROLL BAS ───────────────────────────────────────────────── */

FTS.scrollBottom = function(el) {
  if (el) el.scrollTop = el.scrollHeight;
};
