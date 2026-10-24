'use strict';
/* ===== Costanti ===== */
var PW = 794, PH = 1123;               // A4 a 96 dpi
var PAPER_BG = '#fdf8ee';
var FONTS = [
  ['Pulito', '-apple-system,Helvetica,Arial,sans-serif'],
  ['Corsivo', '"Bradley Hand","Noteworthy","Marker Felt",cursive'],
  ['Stampa', '"Chalkboard SE","Marker Felt",Helvetica,sans-serif'],
  ['Serif', 'Georgia,"Times New Roman",serif']
];
var ARROWS = [
  ['semplice', '→ Semplice'], ['doppia', '↔ Doppia'], ['tratteggio', '⇢ Tratteggiata'],
  ['implica', '⇒ Implica'], ['curva', '↷ Curva'], ['linea', '— Linea']
];
var NODE_COL = { x: '#ecd5ae', d: '#f7dcc8', t: '#fffaf0' };
var NODE_BORDER = '#b89b7a', EDGE_COL = '#6b4f3a';

/* ===== Utilità ===== */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function pgW(pg) { return pg.orient === 'h' ? PH : PW; }
function pgH(pg) { return pg.orient === 'h' ? PW : PH; }
function lhOf(fs) { return fs <= 20 ? 30 : Math.round(fs * 1.5); }

function h(tag, p) {
  var e = document.createElement(tag);
  if (p) for (var k in p) {
    var v = p[k];
    if (k === 'className') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'value') e.value = v;
    else if (k.slice(0, 2) === 'on') e[k] = v;
    else e.setAttribute(k, v);
  }
  for (var i = 2; i < arguments.length; i++) {
    var c = arguments[i];
    if (c == null || c === false) continue;
    if (Array.isArray(c)) c.forEach(function (x) { if (x != null && x !== false) e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
    else e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}
function svgEl(tag, a) {
  var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (var k in a) e.setAttribute(k, a[k]);
  return e;
}
function toast(m) {
  var t = h('div', { className: 'toast', text: m });
  document.body.appendChild(t);
  setTimeout(function () { t.style.opacity = 0; }, 2300);
  setTimeout(function () { t.remove(); }, 2800);
}
function modal(title, body, btns) {
  var ov = h('div', { className: 'ov' }), box = h('div', { className: 'box' });
  var api = { close: function () { ov.remove(); }, box: box };
  if (title) box.appendChild(h('h3', { text: title }));
  if (body) box.appendChild(body);
  var row = h('div', { className: 'brow' });
  (btns || [{ t: 'Chiudi' }]).forEach(function (b) {
    row.appendChild(h('button', {
      className: 'btn ' + (b.cls || ''), text: b.t,
      onclick: function () { if (b.fn && b.fn(api) === false) return; if (!b.keep) api.close(); }
    }));
  });
  box.appendChild(row); ov.appendChild(box); document.body.appendChild(ov);
  return api;
}

/* ===== Archivio locale (IndexedDB) ===== */
var DB;
function dbOpen() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open('quaderni', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
    r.onsuccess = function () { DB = r.result; res(); };
    r.onerror = function () { rej(r.error); };
  });
}
function dbGet(k) {
  return new Promise(function (res) {
    var q = DB.transaction('kv').objectStore('kv').get(k);
    q.onsuccess = function () { res(q.result); };
    q.onerror = function () { res(undefined); };
  });
}
function dbSet(k, v) {
  return new Promise(function (res) {
    var t = DB.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k);
    t.oncomplete = res; t.onerror = res;
  });
}
function dbDel(k) {
  return new Promise(function (res) {
    var t = DB.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k);
    t.oncomplete = res; t.onerror = res;
  });
}

/* ===== Carta ===== */
function drawPaper(x, w, hh, type) {
  var u = 18.9; // 0,5 cm
  x.fillStyle = PAPER_BG; x.fillRect(0, 0, w, hh);
  x.strokeStyle = '#dccdad'; x.fillStyle = '#cdb98f'; x.lineWidth = 1;
  var i, j;
  if (type === 'righe') {
    x.beginPath();
    for (i = 60; i < hh - 20; i += 30) { x.moveTo(0, i + .5); x.lineTo(w, i + .5); }
    x.stroke();
    x.strokeStyle = '#e9b9a9'; x.beginPath(); x.moveTo(64.5, 0); x.lineTo(64.5, hh); x.stroke();
  } else if (type === 'quadretti') {
    x.strokeStyle = '#e1d4b6'; x.lineWidth = .7; x.beginPath();
    for (i = 0; i <= w; i += u) { x.moveTo(i, 0); x.lineTo(i, hh); }
    for (i = 0; i <= hh; i += u) { x.moveTo(0, i); x.lineTo(w, i); }
    x.stroke();
  } else if (type === 'puntini') {
    for (i = u; i < w; i += u) for (j = u; j < hh; j += u) { x.beginPath(); x.arc(i, j, 1.15, 0, 6.2832); x.fill(); }
  } else if (type === 'nido') {
    var a = 14, W = Math.sqrt(3) * a;
    x.strokeStyle = '#e1d4b6'; x.lineWidth = .8; x.beginPath();
    for (var r = -1; r * 1.5 * a < hh + a; r++) for (var c = -1; c * W < w + W; c++) {
      var cx = c * W + (r % 2 ? W / 2 : 0), cy = r * 1.5 * a;
      for (var k = 0; k < 6; k++) {
        var an = Math.PI / 6 + k * Math.PI / 3, px = cx + a * Math.cos(an), py = cy + a * Math.sin(an);
        if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
    }
    x.stroke();
  }
}

/* ===== Tratti a mano ===== */
function drawStroke(x, st) {
  var p = st.p; x.save();
  x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = st.s;
  if (st.m === 'e') { x.globalCompositeOperation = 'destination-out'; x.strokeStyle = x.fillStyle = '#000'; }
  else { x.strokeStyle = x.fillStyle = st.c; if (st.m === 'h') x.globalAlpha = .38; }
  if (p.length < 2) { x.beginPath(); x.arc(p[0][0], p[0][1], st.s / 2, 0, 6.2832); x.fill(); }
  else {
    x.beginPath(); x.moveTo(p[0][0], p[0][1]);
    for (var i = 1; i < p.length - 1; i++) x.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
    x.lineTo(p[p.length - 1][0], p[p.length - 1][1]); x.stroke();
  }
  x.restore();
}

/* ===== Frecce degli schemi ===== */
function borderPt(r, t) {
  var cx = r.x + r.w / 2, cy = r.y + r.h / 2, dx = t.x - cx, dy = t.y - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  var sx = dx ? (r.w / 2 + 3) / Math.abs(dx) : Infinity, sy = dy ? (r.h / 2 + 3) / Math.abs(dy) : Infinity, s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}
function nodeRect(n) { return { x: n.x, y: n.y, w: n.w, h: n.h || 60 }; }
function edgeGeom(a, b, type) {
  var ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, c = null;
  if (type === 'curva') {
    var dx = bc.x - ac.x, dy = bc.y - ac.y;
    c = { x: (ac.x + bc.x) / 2 - dy * .25, y: (ac.y + bc.y) / 2 + dx * .25 };
  }
  return { p0: borderPt(a, c || bc), p1: borderPt(b, c || ac), c: c };
}
function edgeMid(g) {
  return g.c ? { x: .25 * g.p0.x + .5 * g.c.x + .25 * g.p1.x, y: .25 * g.p0.y + .5 * g.c.y + .25 * g.p1.y }
             : { x: (g.p0.x + g.p1.x) / 2, y: (g.p0.y + g.p1.y) / 2 };
}

/* ===== Analisi degli appunti: definizioni e titoli ===== */
var DEF_RE = /^(.{2,60}?)\s+(è|sono|si definisce|si chiama|si dice|indica|rappresenta|consiste in|viene definit[oa]|è definit[oa])\s+(.+)$/i;
var COL_RE = /^(.{2,50}?)\s*[:–—-]\s+(.{6,})$/;
function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function matchDef(line) {
  var m = DEF_RE.exec(line);
  if (m) {
    var v = m[2].toLowerCase();
    return { k: 'd', term: capFirst(m[1].trim()), text: capFirst((v === 'è' || v === 'sono') ? m[3].trim() : m[2] + ' ' + m[3].trim()) };
  }
  m = COL_RE.exec(line);
  if (m) return { k: 'd', term: capFirst(m[1].trim()), text: capFirst(m[2].trim()) };
  return null;
}
function parseNotes(txt) {
  var groups = [], cur = null;
  String(txt || '').split(/\n+/).forEach(function (line) {
    line = line.trim().replace(/^[-•*]\s*/, '');
    if (!line) return;
    var d = matchDef(line);
    if (!d && !/[.;!?]$/.test(line) && line.split(/\s+/).length <= 6) {
      cur = { head: capFirst(line.replace(/:$/, '')), items: [] }; groups.push(cur); return;
    }
    if (!cur) { cur = { head: null, items: [] }; groups.push(cur); }
    if (d) { cur.items.push(d); return; }
    (line.match(/[^.;!?]+[.;!?]*/g) || []).forEach(function (s) {
      s = s.trim(); if (s.length < 4) return;
      var dd = matchDef(s);
      if (dd) cur.items.push(dd);
      else cur.items.push({ k: 't', text: s.length > 220 ? s.slice(0, 217) + '…' : s });
    });
  });
  return groups;
}

/* ===== Disegno di una pagina su canvas (per il PDF) ===== */
function loadImg(src) {
  return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; });
}
function wrapText(x, text, maxW) {
  var out = [];
  String(text || '').split('\n').forEach(function (par) {
    var words = par.split(' '), line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    });
    out.push(line);
  });
  return out;
}
function rr(x, X, Y, W, H, r) {
  x.beginPath(); x.moveTo(X + r, Y); x.lineTo(X + W - r, Y); x.quadraticCurveTo(X + W, Y, X + W, Y + r);
  x.lineTo(X + W, Y + H - r); x.quadraticCurveTo(X + W, Y + H, X + W - r, Y + H); x.lineTo(X + r, Y + H);
  x.quadraticCurveTo(X, Y + H, X, Y + H - r); x.lineTo(X, Y + r); x.quadraticCurveTo(X, Y, X + r, Y); x.closePath();
}
function drawTextItem(x, it) {
  var fs = it.fs || 20, lh = lhOf(fs);
  x.save(); x.font = fs + 'px ' + FONTS[it.ff || 0][1]; x.fillStyle = it.c || '#3d2f26'; x.textBaseline = 'alphabetic';
  wrapText(x, it.text || '', (it.w || 300) - 8).forEach(function (l, i) { x.fillText(l, it.x + 4, it.y + i * lh + lh / 2 + fs * .33); });
  x.restore();
}
function drawHead(x, from, to, size) {
  var an = Math.atan2(to.y - from.y, to.x - from.x);
  x.beginPath(); x.moveTo(to.x, to.y);
  x.lineTo(to.x - size * Math.cos(an - .45), to.y - size * Math.sin(an - .45));
  x.lineTo(to.x - size * Math.cos(an + .45), to.y - size * Math.sin(an + .45));
  x.closePath(); x.fill();
}
function drawSchemeItem(x, it) {
  var byId = {}; it.nodes.forEach(function (n) { byId[n.id] = n; });
  x.save(); x.translate(it.x, it.y);
  (it.edges || []).forEach(function (e) {
    var a = byId[e.a], b = byId[e.b]; if (!a || !b) return;
    var g = edgeGeom(nodeRect(a), nodeRect(b), e.type);
    x.strokeStyle = x.fillStyle = EDGE_COL; x.lineCap = 'round';
    x.lineWidth = e.type === 'implica' ? 5 : 2.2;
    x.setLineDash(e.type === 'tratteggio' ? [7, 6] : []);
    function path() { x.beginPath(); x.moveTo(g.p0.x, g.p0.y); if (g.c) x.quadraticCurveTo(g.c.x, g.c.y, g.p1.x, g.p1.y); else x.lineTo(g.p1.x, g.p1.y); }
    path(); x.stroke();
    if (e.type === 'implica') { x.strokeStyle = PAPER_BG; x.lineWidth = 2; path(); x.stroke(); x.strokeStyle = x.fillStyle = EDGE_COL; }
    x.setLineDash([]);
    if (e.type !== 'linea') drawHead(x, g.c || g.p0, g.p1, 13);
    if (e.type === 'doppia') drawHead(x, g.c || g.p1, g.p0, 13);
    if (e.label) {
      var m = edgeMid(g); x.font = '14px -apple-system,Helvetica,sans-serif';
      var tw = x.measureText(e.label).width + 10;
      x.fillStyle = PAPER_BG; rr(x, m.x - tw / 2, m.y - 11, tw, 22, 6); x.fill();
      x.fillStyle = EDGE_COL; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e.label, m.x, m.y + 1); x.textAlign = 'left';
    }
  });
  it.nodes.forEach(function (n) {
    var W = n.w, tx = n.x + 10, mw = W - 20, y = n.y + 8, lines;
    x.font = '16px -apple-system,Helvetica,sans-serif';
    var body = wrapText(x, n.text || '', mw), term = null;
    if (n.k === 'd') { x.font = 'bold 16px -apple-system,Helvetica,sans-serif'; term = wrapText(x, n.term || '', mw); }
    var H = n.h || (16 + (term ? term.length * 22 + 7 : 0) + body.length * 22);
    x.fillStyle = NODE_COL[n.k] || '#fff'; x.strokeStyle = NODE_BORDER; x.lineWidth = 2;
    rr(x, n.x, n.y, W, H, 12); x.fill(); x.stroke();
    x.fillStyle = '#4a3b2f'; x.textBaseline = 'middle';
    if (n.k === 'x') {
      x.font = 'bold 17px -apple-system,Helvetica,sans-serif'; x.textAlign = 'center';
      body.forEach(function (l, i) { x.fillText(l, n.x + W / 2, y + i * 22 + 11); }); x.textAlign = 'left';
    } else {
      if (term) {
        x.font = 'bold 16px -apple-system,Helvetica,sans-serif';
        term.forEach(function (l, i) { x.fillText(l, tx, y + i * 22 + 11); });
        y += term.length * 22 + 2; x.strokeStyle = '#d6b79a'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(tx, y); x.lineTo(n.x + W - 10, y); x.stroke(); y += 5;
      }
      x.font = '16px -apple-system,Helvetica,sans-serif';
      body.forEach(function (l, i) { x.fillText(l, tx, y + i * 22 + 11); });
    }
  });
  x.restore();
}
async function renderPage(pg, sc) {
  var w = pgW(pg), hh = pgH(pg), c = document.createElement('canvas');
  c.width = Math.round(w * sc); c.height = Math.round(hh * sc);
  var x = c.getContext('2d'); x.scale(sc, sc);
  drawPaper(x, w, hh, pg.paper);
  for (var i = 0; i < pg.items.length; i++) {
    var it = pg.items[i];
    if (it.t === 'img') { var im = await loadImg(it.src); if (im) x.drawImage(im, it.x, it.y, it.w, it.h); }
    else if (it.t === 'text') drawTextItem(x, it);
    else if (it.t === 'scheme') drawSchemeItem(x, it);
  }
  var ic = document.createElement('canvas'); ic.width = c.width; ic.height = c.height;
  var ix = ic.getContext('2d'); ix.scale(sc, sc);
  (pg.strokes || []).forEach(function (s) { drawStroke(ix, s); });
  x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(ic, 0, 0);
  return c;
}

/* ===== PDF (immagini JPEG, nessuna libreria) ===== */
function b64bytes(u) {
  var b = atob(u.split(',')[1]), a = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a;
}
function makePDF(pgs) {
  var chunks = [], off = 0, xref = [];
  function push(u) { chunks.push(u); off += u.length; }
  function pushS(s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; push(a); }
  function obj(n, fn) { xref[n] = off; pushS(n + ' 0 obj\n'); fn(); pushS('\nendobj\n'); }
  function pad10(n) { var s = String(n); while (s.length < 10) s = '0' + s; return s; }
  pushS('%PDF-1.4\n');
  var kids = [];
  pgs.forEach(function (p, i) { kids.push((3 + i * 3) + ' 0 R'); });
  obj(1, function () { pushS('<< /Type /Catalog /Pages 2 0 R >>'); });
  obj(2, function () { pushS('<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + pgs.length + ' >>'); });
  pgs.forEach(function (p, i) {
    var pn = 3 + i * 3, cn = pn + 1, im = pn + 2;
    obj(pn, function () { pushS('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + p.pw + ' ' + p.ph + '] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + cn + ' 0 R >>'); });
    var cs = 'q ' + p.pw + ' 0 0 ' + p.ph + ' 0 0 cm /Im0 Do Q';
    obj(cn, function () { pushS('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'); });
    obj(im, function () {
      pushS('<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpg.length + ' >>\nstream\n');
      push(p.jpg); pushS('\nendstream');
    });
  });
  var total = 2 + pgs.length * 3, xo = off;
  pushS('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
  for (var k = 1; k <= total; k++) pushS(pad10(xref[k]) + ' 00000 n \n');
  pushS('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xo + '\n%%EOF');
  return new Blob(chunks, { type: 'application/pdf' });
}
'use strict';
var app, meta, E = null, SC = {};
var COLORS = ['#3d2f26', '#2f4858', '#b5483a', '#d98c5f', '#7f9a6b', '#5f8fa6', '#9a7fb0', '#d4a63c'];
var HLS = ['#ffe27a', '#b8e0a8', '#f8b6c4', '#b3d4f0'];
var SIZES = { p: [1.6, 2.6, 4.5], h: [14, 22, 34], e: [10, 26, 50] };
var NBCOL = ['#f4d9c6', '#d8e2c8', '#d3e0e6', '#e8d6ea', '#f6e7b4', '#f1cfd0'];
var NBEMO = ['📘', '📗', '📙', '📕', '📒', '📓'];
var PAPERS = [['righe', 'Righe'], ['quadretti', 'Quadretti 0,5 cm'], ['puntini', 'Puntini'], ['nido', "Nido d'ape"]];
var DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'];

/* ===== Rete / modalità offline ===== */
function isOffline() { return meta.manualOffline || !navigator.onLine; }
function updateNet() {
  var off = isOffline();
  document.body.classList.toggle('offline', off);
  [].forEach.call(document.querySelectorAll('.netchip'), function (c) {
    c.textContent = off ? (meta.manualOffline ? '✈️ Offline (manuale)' : '✈️ Senza rete') : '📶 Online';
  });
}
function toggleNet() {
  if (!meta.manualOffline && !navigator.onLine) { toast('Sei già senza rete'); return; }
  meta.manualOffline = !meta.manualOffline; saveMeta(); updateNet();
  toast(meta.manualOffline ? 'Funzioni online disattivate' : 'Funzioni online riattivate');
}
function needOnline(fn) {
  return function () { if (isOffline()) { toast('Serve la rete: ora sei offline'); return; } return fn.apply(this, arguments); };
}
function saveMeta() { return dbSet('meta', meta); }

/* ===== Navigazione ===== */
function go(n, a) {
  if (E) { flushSave(); E = null; }
  document.body.removeAttribute('data-tool');
  app.innerHTML = '';
  SC[n](a);
  updateNet();
}
function topbar(title, left, rights) {
  var t = h('div', { className: 'top' });
  if (left) t.appendChild(h('button', { className: 'btn', text: left.t, onclick: left.fn }));
  t.appendChild(h('h1', { text: title }));
  (rights || []).forEach(function (r) { t.appendChild(r.nodeType ? r : h('button', { className: 'btn ' + (r.cls || ''), text: r.t, onclick: r.fn })); });
  t.appendChild(h('button', { className: 'chip netchip', onclick: toggleNet }));
  return t;
}
function getNb(id) { return meta.notebooks.filter(function (n) { return n.id === id; })[0]; }

/* ===== Home ===== */
SC.home = function () {
  app.appendChild(topbar('Quaderni'));
  var b = h('div', { className: 'body' }), g = h('div', { className: 'grid' });
  meta.notebooks.forEach(function (nb) {
    g.appendChild(h('div', { className: 'card', style: 'background:' + nb.color, onclick: function () { go('nb', nb.id); } },
      h('div', { className: 'emo', text: nb.emoji }), h('div', { className: 'nm', text: nb.name }),
      h('div', { className: 'sub', text: (meta.pages[nb.id] || []).length + ' pagine' })));
  });
  g.appendChild(h('div', { className: 'card add', onclick: newNotebook }, h('div', { className: 'emo', text: '＋' }), h('div', { className: 'nm', text: 'Nuovo quaderno' })));
  b.appendChild(g);
  b.appendChild(h('h2', { text: 'Studio' }));
  b.appendChild(h('div', { className: 'grid' },
    h('div', { className: 'card', style: 'background:#e6dcc3', onclick: function () { go('orario'); } }, h('div', { className: 'emo', text: '🗓' }), h('div', { className: 'nm', text: 'Orario' })),
    h('div', { className: 'card', style: 'background:#e3d3d0', onclick: function () { go('quiz'); } }, h('div', { className: 'emo', text: '🎯' }), h('div', { className: 'nm', text: 'Interrogazioni' }), h('div', { className: 'sub', text: 'Domande di ripasso' }))));
  b.appendChild(h('p', { className: 'hint', text: 'Tutto resta salvato su questo iPad, anche senza rete. Il pulsante in alto a destra attiva/disattiva le funzioni online.' }));
  app.appendChild(b);
};
function newNotebook() {
  var name = prompt('Nome del quaderno (es. Fisica)');
  if (!name || !name.trim()) return;
  var i = meta.notebooks.length;
  var nb = { id: uid(), name: name.trim(), emoji: NBEMO[i % NBEMO.length], color: NBCOL[i % NBCOL.length] };
  meta.notebooks.push(nb); meta.pages[nb.id] = []; saveMeta().then(function () { go('home'); });
}

/* ===== Quaderno ===== */
SC.nb = function (id) {
  var nb = getNb(id); if (!nb) { go('home'); return; }
  app.appendChild(topbar(nb.emoji + ' ' + nb.name, { t: '‹ Home', fn: function () { go('home'); } }, [
    { t: '✎', fn: function () { var n = prompt('Nuovo nome', nb.name); if (n && n.trim()) { nb.name = n.trim(); saveMeta().then(function () { go('nb', id); }); } } },
    { t: '📄 PDF', cls: 'pri', fn: function () { exportNotebook(id); } },
    { t: '🗑', cls: 'dng', fn: function () {
      if (!confirm('Eliminare il quaderno "' + nb.name + '" con tutte le sue pagine?')) return;
      Promise.all((meta.pages[id] || []).map(function (p) { return dbDel('p:' + p.id); })).then(function () {
        meta.notebooks = meta.notebooks.filter(function (n) { return n.id !== id; }); delete meta.pages[id]; delete meta.quest[id];
        saveMeta().then(function () { go('home'); });
      });
    } }
  ]));
  var b = h('div', { className: 'body' }), g = h('div', { className: 'grid pages' });
  (meta.pages[id] || []).forEach(function (p, i) {
    var pv = h('canvas', { className: 'pv' }); var w = p.orient === 'h' ? 100 : 72, hh = p.orient === 'h' ? 72 : 100;
    pv.width = w; pv.height = hh; var x = pv.getContext('2d'); x.scale(w / pgW(p), hh / pgH(p)); drawPaper(x, pgW(p), pgH(p), p.paper);
    g.appendChild(h('div', { className: 'card pcard', onclick: function () { go('edit', { nb: id, id: p.id }); } }, pv,
      h('div', { className: 'nm', text: 'Pagina ' + (i + 1) }), h('div', { className: 'sub', text: (PAPERS.filter(function (q) { return q[0] === p.paper; })[0] || ['', ''])[1] })));
  });
  g.appendChild(h('div', { className: 'card add', onclick: function () { newPageDialog(id); } }, h('div', { className: 'emo', text: '＋' }), h('div', { className: 'nm', text: 'Nuova pagina' })));
  b.appendChild(g); app.appendChild(b);
};
function newPageDialog(nbId) {
  var sel = { orient: meta.last.orient, paper: meta.last.paper };
  var body = h('div'), oRow = h('div', { className: 'opt-row' }), pRow = h('div', { className: 'opt-row' });
  function refresh() {
    oRow.innerHTML = ''; pRow.innerHTML = '';
    [['v', 'A4 verticale'], ['h', 'A4 orizzontale']].forEach(function (o) {
      oRow.appendChild(h('button', { className: 'btn' + (sel.orient === o[0] ? ' sel' : ''), text: o[1], onclick: function () { sel.orient = o[0]; refresh(); } }));
    });
    PAPERS.forEach(function (p) {
      var cv = h('canvas'); cv.width = 64; cv.height = 80; var x = cv.getContext('2d'); x.scale(.08, .08); drawPaper(x, 800, 1000, p[0]);
      pRow.appendChild(h('button', { className: 'btn pbtn' + (sel.paper === p[0] ? ' sel' : ''), onclick: function () { sel.paper = p[0]; refresh(); } }, cv, h('div', { text: p[1] })));
    });
  }
  refresh(); body.appendChild(oRow); body.appendChild(pRow);
  modal('Nuova pagina', body, [{ t: 'Annulla' }, { t: 'Crea', cls: 'pri', fn: function () {
    var rec = { id: uid(), nb: nbId, paper: sel.paper, orient: sel.orient, items: [], strokes: [] };
    meta.last = { paper: sel.paper, orient: sel.orient };
    meta.pages[nbId].push({ id: rec.id, paper: rec.paper, orient: rec.orient });
    dbSet('p:' + rec.id, rec).then(saveMeta).then(function () { go('edit', { nb: nbId, id: rec.id }); });
  } }]);
}

/* ===== Esporta PDF ===== */
async function exportNotebook(id) {
  var nb = getNb(id), list = meta.pages[id] || [];
  if (!list.length) { toast('Il quaderno è vuoto'); return; }
  var prog = h('div', { text: 'Pagina 1 di ' + list.length });
  var m = modal('Creo il PDF…', prog, []);
  try {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      prog.textContent = 'Pagina ' + (i + 1) + ' di ' + list.length;
      await new Promise(function (r) { setTimeout(r, 30); });
      var pg = await dbGet('p:' + list[i].id); if (!pg) continue;
      var c = await renderPage(pg, 1.6);
      out.push({ jpg: b64bytes(c.toDataURL('image/jpeg', .86)), w: c.width, h: c.height, pw: Math.round(pgW(pg) * .75), ph: Math.round(pgH(pg) * .75) });
    }
    var blob = makePDF(out); m.close();
    var name = nb.name.replace(/[^\w\- ]+/g, '').trim() || 'quaderno';
    var url = URL.createObjectURL(blob);
    var body = h('div', {}, h('p', { text: 'Il PDF di "' + nb.name + '" è pronto (' + out.length + ' pagine).' }),
      h('a', { href: url, download: name + '.pdf', className: 'lnk', text: 'Scarica il file' }));
    modal('PDF pronto', body, [{ t: 'Chiudi' }, { t: 'Condividi / Salva', cls: 'pri', keep: true, fn: function () {
      var file = new File([blob], name + '.pdf', { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: name }).catch(function () {});
      else window.open(url, '_blank');
    } }]);
  } catch (e) { m.close(); alert('Non sono riuscito a creare il PDF: ' + e); }
}

/* ===== Orario ===== */
SC.orario = function () {
  app.appendChild(topbar('🗓 Orario', { t: '‹ Home', fn: function () { go('home'); } }));
  var b = h('div', { className: 'body' }), t = h('table', { className: 'tt' }), hr = h('tr', {}, h('th'));
  DAYS.forEach(function (d) { hr.appendChild(h('th', { text: d })); }); t.appendChild(hr);
  for (var r = 0; r < 6; r++) (function (r) {
    var tr = h('tr', {}, h('th', { text: (r + 1) + 'ª' }));
    for (var c = 0; c < 5; c++) (function (c) {
      tr.appendChild(h('td', {}, h('input', { value: meta.timetable[r][c] || '', oninput: function () { meta.timetable[r][c] = this.value; saveMeta(); } })));
    })(c);
    t.appendChild(tr);
  })(r);
  b.appendChild(t); b.appendChild(h('p', { className: 'hint', text: 'Scrivi la materia di ogni ora: si salva da sola.' })); app.appendChild(b);
};

/* ===== Interrogazioni ===== */
async function notebookKnowledge(nbId) {
  var qs = [], seen = {};
  function add(q, a) { var k = q.toLowerCase(); if (seen[k]) return; seen[k] = 1; qs.push({ q: q, a: a, src: 'appunti' }); }
  var list = meta.pages[nbId] || [];
  for (var i = 0; i < list.length; i++) {
    var pg = await dbGet('p:' + list[i].id); if (!pg) continue;
    var txt = pg.items.filter(function (it) { return it.t === 'text'; }).map(function (it) { return it.text || ''; }).join('\n');
    parseNotes(txt).forEach(function (g) {
      g.items.forEach(function (d) { if (d.k === 'd') add('Che cosa significa / cos\'è: ' + d.term + '?', d.text); });
      if (g.head && g.items.length) add('Spiega: ' + g.head, g.items.map(function (d) { return d.k === 'd' ? d.term + ': ' + d.text : d.text; }).join(' '));
    });
    pg.items.forEach(function (it) {
      if (it.t !== 'scheme') return;
      it.nodes.forEach(function (n) { if (n.k === 'd' && n.term && n.text) add('Che cosa significa / cos\'è: ' + n.term + '?', n.text); });
    });
  }
  return qs;
}
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
SC.quiz = function () {
  app.appendChild(topbar('🎯 Interrogazioni', { t: '‹ Home', fn: function () { go('home'); } }));
  var b = h('div', { className: 'body' }), cur = meta.notebooks[0].id;
  var sel = h('select', { onchange: function () { cur = this.value; ta.value = meta.quest[cur] || ''; } });
  meta.notebooks.forEach(function (n) { sel.appendChild(h('option', { value: n.id, text: n.emoji + ' ' + n.name })); });
  var ta = h('textarea', { className: 'ta', placeholder: 'Domande fatte dalla prof, una per riga.\nSe vuoi, aggiungi la risposta dopo una barra: Cos\'è l\'attrito? | Forza che si oppone al moto', oninput: function () { meta.quest[cur] = this.value; saveMeta(); } });
  ta.value = meta.quest[cur] || '';
  var area = h('div');
  b.appendChild(h('label', { text: 'Materia' })); b.appendChild(sel);
  b.appendChild(h('label', { text: 'Domande delle scorse interrogazioni' })); b.appendChild(ta);
  b.appendChild(h('button', { className: 'btn pri big', text: 'Inizia il ripasso', onclick: start }));
  b.appendChild(h('p', { className: 'hint', text: 'Le domande vengono dalle tue + dalle definizioni e dai titoli che hai scritto negli appunti di quella materia. Funziona anche offline.' }));
  b.appendChild(area); app.appendChild(b);
  async function start() {
    area.innerHTML = '<p class="hint">Preparo le domande…</p>';
    var all = (meta.quest[cur] || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var p = l.split('|'); return { q: p[0].trim(), a: p[1] ? p.slice(1).join('|').trim() : '', src: 'prof' };
    });
    all = all.concat(await notebookKnowledge(cur)); shuffle(all);
    if (!all.length) { area.innerHTML = ''; area.appendChild(h('p', { className: 'hint', text: 'Non ho ancora domande: scrivi quelle della prof qui sopra o aggiungi definizioni agli appunti.' })); return; }
    var i = 0, ok = 0, redo = [];
    function show() {
      area.innerHTML = '';
      if (i >= all.length) {
        area.appendChild(h('div', { className: 'qcard' }, h('h2', { text: 'Fatto! ' + ok + ' su ' + all.length }),
          redo.length ? h('div', {}, h('b', { text: 'Da ripassare:' }), h('ul', {}, redo.map(function (q) { return h('li', { text: q }); }))) : h('p', { text: 'Le sapevi tutte 🎉' }),
          h('button', { className: 'btn pri', text: 'Ricomincia', onclick: start })));
        return;
      }
      var c = all[i], ans = h('div', { className: 'ans', style: 'display:none', text: c.a || 'Rispondi a voce, poi valutati.' });
      area.appendChild(h('div', { className: 'qcard' }, h('div', { className: 'sub', text: (i + 1) + ' / ' + all.length + ' · ' + (c.src === 'prof' ? 'domanda della prof' : 'dai tuoi appunti') }),
        h('div', { className: 'q', text: c.q }), ans,
        h('button', { className: 'btn', text: 'Mostra risposta', onclick: function () { ans.style.display = 'block'; } }),
        h('div', { className: 'brow' },
          h('button', { className: 'btn', text: '😕 Da ripassare', onclick: function () { redo.push(c.q); i++; show(); } }),
          h('button', { className: 'btn pri', text: '😊 Lo sapevo', onclick: function () { ok++; i++; show(); } }))));
    }
    show();
  }
};

/* ===== Editor di pagina ===== */
SC.edit = function (a) {
  dbGet('p:' + a.id).then(function (rec) { if (!rec) { go('nb', a.nb); return; } startEditor(rec, a.nb); });
};
function save() { if (!E) return; E.dirty = true; clearTimeout(E.timer); E.timer = setTimeout(doSave, 700); }
function doSave() { if (!E || !E.dirty) return; E.dirty = false; dbSet('p:' + E.pg.id, E.pg); }
function flushSave() { if (E) { clearTimeout(E.timer); doSave(); } }
window.addEventListener('pagehide', function () { flushSave(); });
document.addEventListener('visibilitychange', function () { if (document.hidden) flushSave(); });
document.addEventListener('selectionchange', function () {
  var s = window.getSelection(), t = s ? s.toString().trim() : '';
  if (t && E) E.lastSel = t;
});

function startEditor(pg, nbId) {
  var nb = getNb(nbId), list = meta.pages[nbId], idx = list.map(function (p) { return p.id; }).indexOf(pg.id);
  var w = pgW(pg), ph = pgH(pg), DPR = Math.min(2, window.devicePixelRatio || 1);
  E = { pg: pg, nb: nbId, tool: 'move', color: COLORS[0], hl: HLS[0], si: 1, scale: 1, cur: null, dirty: false, timer: null, linkFrom: null, lastSel: '', w: w, h: ph };

  function layer(z) {
    var c = h('canvas', { style: 'z-index:' + z }); c.width = w * DPR; c.height = ph * DPR;
    c.style.width = w + 'px'; c.style.height = ph + 'px'; var x = c.getContext('2d'); x.scale(DPR, DPR); return { c: c, x: x };
  }
  var bg = layer(1), ink = layer(3), live = layer(4);
  ink.c.className = 'ink'; live.c.style.pointerEvents = 'none';
  drawPaper(bg.x, w, ph, pg.paper);
  var items = h('div', { className: 'items', style: 'z-index:2' });
  var page = h('div', { className: 'page', style: 'width:' + w + 'px;height:' + ph + 'px' }, bg.c, items, ink.c, live.c);
  var wrap = h('div', { className: 'pagewrap' }, page);
  var stage = h('div', { className: 'stage' }, wrap);
  E.items = items;

  function redrawInk() { ink.x.clearRect(0, 0, w, ph); pg.strokes.forEach(function (s) { drawStroke(ink.x, s); }); }
  function setScale(s) {
    E.scale = clamp(s, .3, 2.5); wrap.style.width = w * E.scale + 'px'; wrap.style.height = ph * E.scale + 'px';
    page.style.transform = 'scale(' + E.scale + ')';
  }
  function pt(e) { var r = ink.c.getBoundingClientRect(); return { x: (e.clientX - r.left) * w / r.width, y: (e.clientY - r.top) * ph / r.height }; }

  /* --- barre --- */
  var toolBtns = {};
  var tools = [['move', '✋', 'Muovi'], ['p', '✏️', 'Penna'], ['h', '🖍', 'Evidenzia'], ['e', '🧽', 'Gomma'], ['text', '🔤', 'Testo']];
  var trow = h('div', { className: 'tools' });
  tools.forEach(function (t) { toolBtns[t[0]] = h('button', { className: 'btn tb', onclick: function () { setTool(t[0]); } }, h('span', { text: t[1] }), h('small', { text: t[2] })); trow.appendChild(toolBtns[t[0]]); });
  trow.appendChild(h('span', { className: 'sep' }));
  var fileIn = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: function () { if (this.files[0]) handlePhoto(this.files[0]); this.value = ''; } });
  [['🖼', 'Foto', function () { fileIn.click(); }], ['🔀', 'Schema', addScheme], ['🪄', 'Da testo', autoScheme], ['📖', 'Significato', needOnline(defineWord), 'onl']].forEach(function (a) {
    trow.appendChild(h('button', { className: 'btn tb ' + (a[3] || ''), onclick: a[2] }, h('span', { text: a[0] }), h('small', { text: a[1] })));
  });
  trow.appendChild(fileIn);
  var opts = h('div', { className: 'opts' });

  function buildOpts() {
    opts.innerHTML = '';
    var t = E.tool;
    if (t === 'move') { opts.appendChild(h('span', { className: 'hint2', text: 'Trascina ⠿ per spostare. Scorri la pagina col dito.' })); return; }
    if (t !== 'e') {
      (t === 'h' ? HLS : COLORS).forEach(function (c) {
        var cur = (t === 'h' ? E.hl : E.color) === c;
        opts.appendChild(h('button', { className: 'sw' + (cur ? ' sel' : ''), style: 'background:' + c, onclick: function () { if (t === 'h') E.hl = c; else E.color = c; buildOpts(); } }));
      });
    }
    if (t !== 'text') {
      opts.appendChild(h('span', { className: 'sep' }));
      ['S', 'M', 'L'].forEach(function (s, i) { opts.appendChild(h('button', { className: 'btn sz' + (E.si === i ? ' sel' : ''), text: s, onclick: function () { E.si = i; buildOpts(); } })); });
    } else opts.appendChild(h('span', { className: 'hint2', text: 'Tocca la pagina dove vuoi scrivere.' }));
  }
  function setTool(t) {
    E.tool = t; document.body.setAttribute('data-tool', t);
    ink.c.style.pointerEvents = (t === 'move') ? 'none' : 'auto';
    for (var k in toolBtns) toolBtns[k].classList.toggle('sel', k === t);
    buildOpts();
  }

  var top = topbar(nb.name + ' · pag. ' + (idx + 1), { t: '‹', fn: function () { go('nb', nbId); } }, [
    { t: '↶', fn: function () { if (pg.strokes.length) { pg.strokes.pop(); redrawInk(); save(); } } },
    { t: '−', fn: function () { setScale(E.scale - .1); } }, { t: '＋', fn: function () { setScale(E.scale + .1); } },
    { t: '◀', fn: function () { if (idx > 0) go('edit', { nb: nbId, id: list[idx - 1].id }); } },
    { t: '▶', fn: function () { if (idx < list.length - 1) go('edit', { nb: nbId, id: list[idx + 1].id }); else newPageDialog(nbId); } },
    { t: '🗑', cls: 'dng', fn: function () {
      if (!confirm('Eliminare questa pagina?')) return;
      meta.pages[nbId].splice(idx, 1); var id = pg.id; E.dirty = false; E = null;
      dbDel('p:' + id).then(saveMeta).then(function () { go('nb', nbId); });
    } }
  ]);
  app.appendChild(top); app.appendChild(trow); app.appendChild(opts); app.appendChild(stage);

  /* --- disegno a mano --- */
  ink.c.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary) return; var t = E.tool, p = pt(e);
    if (t === 'text') {
      var y = pg.paper === 'righe' ? Math.max(0, Math.round((p.y - 30) / 30) * 30) : Math.round(p.y - 15);
      addText(Math.round(p.x), y); setTool('move'); return;
    }
    e.preventDefault(); ink.c.setPointerCapture(e.pointerId);
    E.cur = { c: t === 'h' ? E.hl : E.color, s: SIZES[t][E.si], m: t === 'e' ? 'e' : (t === 'h' ? 'h' : 'p'), p: [[p.x, p.y]] };
    if (E.cur.m === 'e') drawStroke(ink.x, E.cur); else { live.x.clearRect(0, 0, w, ph); drawStroke(live.x, E.cur); }
  });
  ink.c.addEventListener('pointermove', function (e) {
    if (!E || !E.cur) return; var p = pt(e), q = E.cur.p, l = q[q.length - 1];
    if (Math.abs(p.x - l[0]) + Math.abs(p.y - l[1]) < 1.2) return;
    var np = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]; q.push(np);
    if (E.cur.m === 'e') drawStroke(ink.x, { m: 'e', s: E.cur.s, p: [l, np] });
    else { live.x.clearRect(0, 0, w, ph); drawStroke(live.x, E.cur); }
  });
  function endStroke() {
    if (!E || !E.cur) return;
    if (E.cur.m !== 'e') { drawStroke(ink.x, E.cur); live.x.clearRect(0, 0, w, ph); }
    pg.strokes.push(E.cur); E.cur = null; save();
  }
  ink.c.addEventListener('pointerup', endStroke); ink.c.addEventListener('pointercancel', endStroke);

  /* --- elementi --- */
  function place(f, it) { f.style.left = it.x + 'px'; f.style.top = it.y + 'px'; if (it.w && it.t !== 'scheme') f.style.width = it.w + 'px'; if (it.t === 'img') f.style.height = it.h + 'px'; }
  function dragger(grip, obj, el, cb) {
    grip.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation(); grip.setPointerCapture(e.pointerId);
      var sx = e.clientX, sy = e.clientY, ox = obj.x, oy = obj.y;
      function mv(ev) { obj.x = Math.round(ox + (ev.clientX - sx) / E.scale); obj.y = Math.round(oy + (ev.clientY - sy) / E.scale); el.style.left = obj.x + 'px'; el.style.top = obj.y + 'px'; if (cb) cb(); }
      function up() { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); save(); }
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
    });
  }
  function resizer(rz, it, f) {
    rz.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation(); rz.setPointerCapture(e.pointerId);
      var sx = e.clientX, ow = it.w, ratio = it.h && it.w ? it.h / it.w : 0;
      function mv(ev) { it.w = Math.max(60, Math.round(ow + (ev.clientX - sx) / E.scale)); f.style.width = it.w + 'px'; if (ratio) { it.h = Math.round(it.w * ratio); f.style.height = it.h + 'px'; } }
      function up() { rz.removeEventListener('pointermove', mv); rz.removeEventListener('pointerup', up); rz.removeEventListener('pointercancel', up); save(); }
      rz.addEventListener('pointermove', mv); rz.addEventListener('pointerup', up); rz.addEventListener('pointercancel', up);
    });
  }
  function bbtn(txt, fn) { return h('button', { className: 'mini', text: txt, onclick: fn }); }
  function removeItem(it, f) { pg.items.splice(pg.items.indexOf(it), 1); f.remove(); save(); }

  function buildItem(it) {
    var f = h('div', { className: 'item it-' + it.t }); place(f, it);
    var bar = h('div', { className: 'bar' }), grip = h('span', { className: 'grip', text: '⠿' }); bar.appendChild(grip); dragger(grip, it, f);
    if (it.t === 'text') {
      var d = h('div', { className: 'txt' }); d.contentEditable = 'plaintext-only'; if (d.contentEditable !== 'plaintext-only') d.contentEditable = 'true';
      d.textContent = it.text || '';
      var sty = function () { d.style.fontSize = it.fs + 'px'; d.style.lineHeight = lhOf(it.fs) + 'px'; d.style.fontFamily = FONTS[it.ff || 0][1]; d.style.color = it.c; };
      sty();
      d.addEventListener('input', function () { it.text = d.innerText; save(); });
      d.addEventListener('blur', function () { setTimeout(function () { if (!(it.text || '').trim() && f.parentNode) removeItem(it, f); }, 150); });
      f.appendChild(d); f._focus = function () { d.focus(); };
      bar.appendChild(bbtn('A−', function () { it.fs = Math.max(12, it.fs - 2); sty(); save(); }));
      bar.appendChild(bbtn('A+', function () { it.fs = Math.min(56, it.fs + 2); sty(); save(); }));
      bar.appendChild(bbtn('Aa', function () { it.ff = ((it.ff || 0) + 1) % FONTS.length; sty(); save(); toast('Carattere: ' + FONTS[it.ff][0]); }));
      var rz = h('span', { className: 'rz', text: '↔' }); resizer(rz, it, f); f.appendChild(rz);
    } else if (it.t === 'img') {
      f.appendChild(h('img', { src: it.src, draggable: 'false', className: it.st ? 'stk' : '' }));
      var rz2 = h('span', { className: 'rz', text: '⤡' }); resizer(rz2, it, f); f.appendChild(rz2);
    } else if (it.t === 'scheme') {
      buildScheme(it, f, bar);
    }
    bar.appendChild(bbtn('✕', function () { if (it.t === 'scheme' && !confirm('Eliminare questo schema?')) return; removeItem(it, f); }));
    f.appendChild(bar); return f;
  }
  function renderItems() {
    items.innerHTML = ''; pg.items.forEach(function (it) { items.appendChild(buildItem(it)); });
    [].forEach.call(items.querySelectorAll('.it-scheme'), refreshScheme);
  }
  function addItem(it) { pg.items.push(it); var f = buildItem(it); items.appendChild(f); if (it.t === 'scheme') refreshScheme(f); save(); return f; }

  function addText(x, y) {
    var it = { id: uid(), t: 'text', x: clamp(x, 0, w - 200), y: y, w: Math.min(360, w - x - 10), fs: 20, ff: 0, c: E.color, text: '' };
    var f = addItem(it); if (f._focus) setTimeout(f._focus, 50);
  }

  /* --- foto / sticker --- */
  function handlePhoto(file) {
    readImage(file).then(function (cv) {
      modal('Foto', h('p', { text: 'Vuoi usare tutta la foto o ritagliare un oggetto per farne uno sticker?' }), [
        { t: 'Annulla' },
        { t: 'Foto intera', fn: function () { placeImage(cv.toDataURL('image/jpeg', .82), cv.width, cv.height, false); } },
        { t: '✂️ Ritaglia sticker', cls: 'pri', fn: function () { setTimeout(function () { cropper(cv, function (sc) { placeImage(sc.toDataURL('image/png'), sc.width, sc.height, true); }); }, 50); } }
      ]);
    }).catch(function () { toast('Non riesco a leggere la foto'); });
  }
  function placeImage(src, iw, ih, stk) {
    var tw = stk ? Math.min(260, iw) : Math.min(w - 80, iw), n = pg.items.length * 14;
    addItem({ id: uid(), t: 'img', x: 40 + n % 120, y: 40 + n % 120, w: Math.round(tw), h: Math.round(tw * ih / iw), src: src, st: stk });
    setTool('move'); toast('Aggiunta. Con ✏️ puoi disegnarci sopra.');
  }

  /* --- schemi --- */
  function arrowDefs(svg) {
    var defs = svgEl('defs', {});
    defs.appendChild(mk('mkE', 'M0,0 L10,5 L0,10 z', 9));
    defs.appendChild(mk('mkS', 'M10,0 L0,5 L10,10 z', 1));
    function mk(id, d, rx) { var m = svgEl('marker', { id: id, viewBox: '0 0 10 10', refX: rx, refY: 5, markerWidth: 13, markerHeight: 13, markerUnits: 'userSpaceOnUse', orient: 'auto' }); m.appendChild(svgEl('path', { d: d, fill: EDGE_COL })); return m; }
    svg.appendChild(defs);
  }
  function buildScheme(it, f, bar) {
    var svg = svgEl('svg', { 'class': 'edges' }); arrowDefs(svg); f.appendChild(svg);
    var st = { it: it, svg: svg, els: {} }; f._st = st;
    it.nodes.forEach(function (n) { addNodeEl(f, n); });
    var sel = h('select', { className: 'asel', onchange: function () { it.arrow = this.value; save(); } });
    ARROWS.forEach(function (a) { sel.appendChild(h('option', { value: a[0], text: a[1] })); }); sel.value = it.arrow || 'semplice';
    bar.appendChild(bbtn('＋Titolo', function () { newNode(f, 'x'); }));
    bar.appendChild(bbtn('＋Definizione', function () { newNode(f, 'd'); }));
    bar.appendChild(bbtn('＋Testo', function () { newNode(f, 't'); }));
    bar.appendChild(h('span', { className: 'lbl', text: 'Freccia:' })); bar.appendChild(sel);
  }
  function newNode(f, k) {
    var it = f._st.it, y = 0; it.nodes.forEach(function (n) { y = Math.max(y, n.y + (n.h || 60) + 44); });
    var n = { id: uid(), k: k, x: 0, y: y, w: k === 'x' ? 240 : 210, term: '', text: '' }; it.nodes.push(n); addNodeEl(f, n); refreshScheme(f); save();
  }
  function field(n, key, ph, f) {
    var d = h('div', { className: 'fld', 'data-ph': ph }); d.contentEditable = 'plaintext-only'; if (d.contentEditable !== 'plaintext-only') d.contentEditable = 'true';
    d.textContent = n[key] || '';
    d.addEventListener('input', function () { n[key] = d.innerText; refreshScheme(f); save(); });
    return d;
  }
  function addNodeEl(f, n) {
    var st = f._st, e = h('div', { className: 'node k-' + n.k }); e.style.left = n.x + 'px'; e.style.top = n.y + 'px'; e.style.width = n.w + 'px';
    var grip = h('span', { className: 'grip', text: '⠿' }); dragger(grip, n, e, function () { drawEdges(f); });
    var ctl = h('div', { className: 'ctl' }, grip,
      bbtn('🔗', function () {
        if (!E.linkFrom) { E.linkFrom = { f: f, id: n.id }; e.classList.add('linking'); toast('Ora tocca 🔗 sul riquadro di arrivo'); return; }
        var a = E.linkFrom; E.linkFrom = null; [].forEach.call(document.querySelectorAll('.linking'), function (x) { x.classList.remove('linking'); });
        if (a.f !== f || a.id === n.id) return;
        st.it.edges.push({ id: uid(), a: a.id, b: n.id, type: st.it.arrow || 'semplice', label: '' }); drawEdges(f); save();
      }),
      bbtn('✕', function () {
        st.it.nodes = st.it.nodes.filter(function (x) { return x.id !== n.id; }); st.it.edges = st.it.edges.filter(function (x) { return x.a !== n.id && x.b !== n.id; });
        e.remove(); delete st.els[n.id]; drawEdges(f); save();
      }));
    e.appendChild(ctl);
    if (n.k === 'd') e.appendChild(h('div', { className: 'term' }, field(n, 'term', 'Termine', f)));
    e.appendChild(field(n, 'text', n.k === 'x' ? 'Titolo' : (n.k === 'd' ? 'Definizione' : 'Spiegazione'), f));
    st.els[n.id] = e; f.appendChild(e);
  }
  function refreshScheme(f) {
    var st = f._st; if (!st) return;
    st.it.nodes.forEach(function (n) { var e = st.els[n.id]; if (e && e.offsetHeight) n.h = e.offsetHeight; });
    drawEdges(f);
  }
  function drawEdges(f) {
    var st = f._st, svg = st.svg, byId = {};
    [].slice.call(svg.childNodes).forEach(function (c) { if (c.nodeName !== 'defs') svg.removeChild(c); });
    st.it.nodes.forEach(function (n) { byId[n.id] = n; });
    st.it.edges.forEach(function (e) {
      var a = byId[e.a], b = byId[e.b]; if (!a || !b) return;
      var g = edgeGeom(nodeRect(a), nodeRect(b), e.type);
      var d = 'M' + g.p0.x + ',' + g.p0.y + (g.c ? ' Q' + g.c.x + ',' + g.c.y + ' ' : ' L') + g.p1.x + ',' + g.p1.y;
      var at = { d: d, fill: 'none', stroke: EDGE_COL, 'stroke-width': e.type === 'implica' ? 5 : 2.2, 'stroke-linecap': 'round' };
      if (e.type === 'tratteggio') at['stroke-dasharray'] = '7 6';
      if (e.type !== 'linea') at['marker-end'] = 'url(#mkE)';
      if (e.type === 'doppia') at['marker-start'] = 'url(#mkS)';
      svg.appendChild(svgEl('path', at));
      if (e.type === 'implica') svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: PAPER_BG, 'stroke-width': 2 }));
      if (e.label) {
        var m = edgeMid(g), tw = e.label.length * 8 + 12;
        svg.appendChild(svgEl('rect', { x: m.x - tw / 2, y: m.y - 11, width: tw, height: 22, rx: 6, fill: PAPER_BG }));
        var tx = svgEl('text', { x: m.x, y: m.y + 5, 'text-anchor': 'middle', 'font-size': 14, fill: EDGE_COL }); tx.textContent = e.label; svg.appendChild(tx);
      }
      var hit = svgEl('path', { d: d, fill: 'none', stroke: 'rgba(0,0,0,0.01)', 'stroke-width': 18, 'class': 'hit' });
      hit.addEventListener('click', function () { if (E.tool === 'move') editEdge(f, e); });
      svg.appendChild(hit);
    });
  }
  function editEdge(f, e) {
    var body = h('div'), row = h('div', { className: 'opt-row' });
    var lab = h('input', { className: 'inp', placeholder: 'Scritta sulla freccia (facoltativa)', value: e.label || '', oninput: function () { e.label = this.value; drawEdges(f); save(); } });
    function btns() {
      row.innerHTML = '';
      ARROWS.forEach(function (a) { row.appendChild(h('button', { className: 'btn' + (e.type === a[0] ? ' sel' : ''), text: a[1], onclick: function () { e.type = a[0]; drawEdges(f); save(); btns(); } })); });
    }
    btns(); body.appendChild(row); body.appendChild(lab);
    modal('Freccia', body, [
      { t: 'Elimina', cls: 'dng', fn: function () { f._st.it.edges = f._st.it.edges.filter(function (x) { return x !== e; }); drawEdges(f); save(); } },
      { t: 'Fatto', cls: 'pri' }]);
  }
  function addScheme() {
    var f = addItem({ id: uid(), t: 'scheme', x: 30, y: 40 + (pg.items.length * 20) % 200, arrow: 'semplice', nodes: [], edges: [] });
    newNode(f, 'x'); newNode(f, 'd'); setTool('move');
    toast('Schema creato: usa ＋ per aggiungere riquadri e 🔗 per collegarli');
  }
  function autoScheme() {
    var txt = pg.items.filter(function (i) { return i.t === 'text'; }).map(function (i) { return i.text || ''; }).join('\n');
    var groups = parseNotes(txt);
    if (!groups.length) { toast('Scrivi prima degli appunti con la tastiera in questa pagina'); return; }
    var cols = Math.min(3, Math.max(1, groups.length)), gap = 30, nw = clamp(Math.floor((w - 70 - (cols - 1) * gap) / cols), 150, 260), ys = [], i;
    for (i = 0; i < cols; i++) ys.push(0);
    var nodes = [], edges = [];
    function est(n) { var chars = (n.text || '').length, per = Math.max(10, Math.floor((nw - 20) / 8.4)); return 22 + Math.ceil(chars / per) * 22 + (n.k === 'd' ? 30 : 0); }
    groups.forEach(function (g) {
      var c = ys.indexOf(Math.min.apply(null, ys)), prev = null;
      function put(n) {
        n.id = uid(); n.x = c * (nw + gap); n.y = ys[c]; n.w = nw; n.h = est(n); ys[c] += n.h + 44; nodes.push(n);
        if (prev) edges.push({ id: uid(), a: prev.id, b: n.id, type: prev.k === 'x' ? 'semplice' : 'tratteggio', label: '' });
        prev = n;
      }
      if (g.head) put({ k: 'x', text: g.head, term: '' });
      g.items.forEach(function (d) { put({ k: d.k, term: d.term || '', text: d.text }); });
      ys[c] += 14;
    });
    var f = addItem({ id: uid(), t: 'scheme', x: 30, y: 30, arrow: 'semplice', nodes: nodes, edges: edges });
    refreshScheme(f); setTool('move');
    toast('Schema pronto: sposta, modifica o collega i riquadri');
  }

  /* --- significato di una parola (serve rete) --- */
  function defineWord() {
    var word = E.lastSel || prompt('Quale parola vuoi cercare?'); if (!word) return;
    word = word.trim().replace(/\s+/g, ' ').slice(0, 60);
    var out = h('div', { text: 'Cerco "' + word + '"…' }), m = modal('Significato', out, [{ t: 'Chiudi' }]);
    lookup(word).then(function (r) {
      out.innerHTML = '';
      if (!r) { out.appendChild(h('p', { text: 'Non ho trovato una definizione per "' + word + '".' })); }
      else {
        var short = r.text.length > 420 ? r.text.slice(0, 420).replace(/\s+\S*$/, '') + '…' : r.text;
        out.appendChild(h('b', { text: r.title })); out.appendChild(h('p', { text: short, style: 'user-select:text;-webkit-user-select:text' }));
        out.appendChild(h('button', { className: 'btn pri', text: '＋ Aggiungi alla pagina', onclick: function () {
          var y = pg.paper === 'righe' ? 60 + 30 * Math.floor(pg.items.length) : 80;
          addItem({ id: uid(), t: 'text', x: 70, y: Math.min(y, ph - 200), w: w - 140, fs: 18, ff: 0, c: E.color, text: r.title + ': ' + short });
          m.close(); toast('Aggiunto');
        } }));
      }
      out.appendChild(h('p', {}, h('a', { className: 'lnk', target: '_blank', href: 'https://www.google.com/search?q=' + encodeURIComponent('significato ' + word), text: 'Cerca anche su Google' })));
    });
  }

  renderItems(); redrawInk(); setTool('move');
  requestAnimationFrame(function () { setScale(Math.min(1.3, (stage.clientWidth - 16) / w)); });
}

/* ===== Ricerca definizioni ===== */
function wikiSummary(t) {
  return fetch('https://it.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t) + '?redirect=true').then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (j) { if (j.type === 'disambiguation' || !j.extract) throw 0; return { title: j.title, text: j.extract }; });
}
function lookup(wd) {
  return wikiSummary(wd).catch(function () { return wikiSummary(capFirst(wd)); }).catch(function () {
    return fetch('https://it.wikipedia.org/w/api.php?action=opensearch&limit=1&format=json&origin=*&search=' + encodeURIComponent(wd))
      .then(function (r) { return r.json(); }).then(function (j) { if (!j[1] || !j[1][0]) throw 0; return wikiSummary(j[1][0]); });
  }).catch(function () { return null; });
}

/* ===== Foto e ritaglio sticker ===== */
function readImage(file) {
  return new Promise(function (res, rej) {
    var u = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var s = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); res(c);
    };
    im.onerror = rej; im.src = u;
  });
}
function cropper(src, done) {
  var s = Math.min(1, 900 / Math.max(src.width, src.height)), W = Math.round(src.width * s), H = Math.round(src.height * s);
  var wc = document.createElement('canvas'); wc.width = W; wc.height = H; var wx = wc.getContext('2d'); wx.drawImage(src, 0, 0, W, H);
  var disp = h('canvas', { className: 'crop' }); disp.width = W; disp.height = H; disp.style.width = Math.min(window.innerWidth - 24, 700) + 'px';
  var dx = disp.getContext('2d'), hist = [], mode = 'wand', tol = 32, path = null;
  function show() {
    dx.clearRect(0, 0, W, H); dx.drawImage(wc, 0, 0);
    if (path && path.length > 1) { dx.save(); dx.strokeStyle = '#e0523d'; dx.lineWidth = 3; dx.setLineDash([8, 6]); dx.beginPath(); path.forEach(function (p, i) { if (i) dx.lineTo(p[0], p[1]); else dx.moveTo(p[0], p[1]); }); dx.stroke(); dx.restore(); }
  }
  function xy(e) { var r = disp.getBoundingClientRect(); return [clamp(Math.round((e.clientX - r.left) * W / r.width), 0, W - 1), clamp(Math.round((e.clientY - r.top) * H / r.height), 0, H - 1)]; }
  function snap() { hist.push(wx.getImageData(0, 0, W, H)); if (hist.length > 6) hist.shift(); }
  function flood(sx, sy) {
    var id = wx.getImageData(0, 0, W, H), d = id.data, i0 = (sy * W + sx) * 4;
    if (d[i0 + 3] === 0) return; snap();
    var r = d[i0], g = d[i0 + 1], b = d[i0 + 2], T = tol * 3, seen = new Uint8Array(W * H), st = [sy * W + sx]; seen[st[0]] = 1;
    while (st.length) {
      var p = st.pop(), i = p * 4;
      if (d[i + 3] === 0 || Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b) <= T) {
        d[i + 3] = 0; var x = p % W, y = (p / W) | 0;
        if (x > 0 && !seen[p - 1]) { seen[p - 1] = 1; st.push(p - 1); }
        if (x < W - 1 && !seen[p + 1]) { seen[p + 1] = 1; st.push(p + 1); }
        if (y > 0 && !seen[p - W]) { seen[p - W] = 1; st.push(p - W); }
        if (y < H - 1 && !seen[p + W]) { seen[p + W] = 1; st.push(p + W); }
      }
    }
    wx.putImageData(id, 0, 0);
  }
  disp.addEventListener('pointerdown', function (e) {
    e.preventDefault(); var p = xy(e);
    if (mode === 'wand') { flood(p[0], p[1]); show(); return; }
    path = [p]; disp.setPointerCapture(e.pointerId);
  });
  disp.addEventListener('pointermove', function (e) { if (mode === 'lasso' && path) { path.push(xy(e)); show(); } });
  function lassoEnd() {
    if (mode !== 'lasso' || !path) return;
    if (path.length > 6) {
      snap(); var t = document.createElement('canvas'); t.width = W; t.height = H; var tx = t.getContext('2d');
      tx.beginPath(); path.forEach(function (p, i) { if (i) tx.lineTo(p[0], p[1]); else tx.moveTo(p[0], p[1]); }); tx.closePath(); tx.clip(); tx.drawImage(wc, 0, 0);
      wx.clearRect(0, 0, W, H); wx.drawImage(t, 0, 0);
    }
    path = null; show();
  }
  disp.addEventListener('pointerup', lassoEnd); disp.addEventListener('pointercancel', lassoEnd);
  var modeRow = h('div', { className: 'opt-row' }), tolRow = h('div', { className: 'opt-row' });
  function buildModes() {
    modeRow.innerHTML = '';
    modeRow.appendChild(h('button', { className: 'btn' + (mode === 'wand' ? ' sel' : ''), text: '🪄 Bacchetta: tocca lo sfondo', onclick: function () { mode = 'wand'; buildModes(); } }));
    modeRow.appendChild(h('button', { className: 'btn' + (mode === 'lasso' ? ' sel' : ''), text: '✂️ Lazo: disegna intorno', onclick: function () { mode = 'lasso'; buildModes(); } }));
    modeRow.appendChild(h('button', { className: 'btn', text: '↶ Annulla', onclick: function () { var s = hist.pop(); if (s) { wx.putImageData(s, 0, 0); show(); } } }));
    tolRow.style.display = mode === 'wand' ? 'flex' : 'none';
  }
  tolRow.appendChild(h('span', { text: 'Precisione' }));
  tolRow.appendChild(h('input', { type: 'range', min: 4, max: 90, value: 32, oninput: function () { tol = +this.value; } }));
  buildModes();
  var body = h('div', { className: 'cropbox' }, h('p', { className: 'hint', text: 'Bacchetta: tocca lo sfondo per cancellarlo (ripeti se serve). Lazo: disegna una linea chiusa intorno all\'oggetto.' }), modeRow, tolRow, disp);
  show();
  modal('Ritaglia sticker', body, [{ t: 'Annulla' }, { t: 'Fatto', cls: 'pri', fn: function () {
    var d = wx.getImageData(0, 0, W, H).data, x0 = W, y0 = H, x1 = 0, y1 = 0, x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0 || y1 <= y0) { toast('Non è rimasto niente da ritagliare'); return false; }
    var cw = x1 - x0 + 1, ch = y1 - y0 + 1, out = document.createElement('canvas'); out.width = cw; out.height = ch;
    out.getContext('2d').drawImage(wc, x0, y0, cw, ch, 0, 0, cw, ch); done(out);
  } }]);
}

/* ===== Avvio ===== */
function defaultMeta() {
  var t = []; for (var r = 0; r < 6; r++) t.push(['', '', '', '', '']);
  return { notebooks: [{ id: 'misc', name: 'Appunti a caso', emoji: '✏️', color: '#f6e7b4' }], pages: { misc: [] }, timetable: t, quest: {}, manualOffline: false, last: { paper: 'righe', orient: 'v' } };
}
function boot() {
  app = document.getElementById('app');
  try {
    var c = document.createElement('canvas'); c.width = c.height = 180; var x = c.getContext('2d');
    x.fillStyle = '#f3e9d8'; x.fillRect(0, 0, 180, 180); x.font = '110px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('📓', 90, 96);
    document.getElementById('touchicon').href = c.toDataURL('image/png');
  } catch (e) {}
  dbOpen().then(function () { return dbGet('meta'); }).then(function (m) {
    meta = m || defaultMeta();
    if (!meta.last) meta.last = { paper: 'righe', orient: 'v' };
    if (!meta.quest) meta.quest = {}; if (!meta.pages) meta.pages = {};
    meta.notebooks.forEach(function (n) { if (!meta.pages[n.id]) meta.pages[n.id] = []; });
    window.addEventListener('online', updateNet); window.addEventListener('offline', updateNet);
    go('home');
  }).catch(function (e) { document.body.textContent = 'Archivio non disponibile (esci dalla navigazione privata): ' + e; });
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
}
boot();
