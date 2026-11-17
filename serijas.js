/* SH | Budžets — ēku sērijas un to vektora attēli (SVG). © VAITKEVIX, SIA.
   Attēli ir vienkāršotas fasāžu ilustrācijas (stāvi, materiāls, balkoni / lodžijas, jumts). */
(function (root) {
  // f — stāvi, w — sekcijas, c — fasāde, m — materiāls, win — logi, b — balkoni, r — jumts, a — akcents
  const S = [
    ['pirmskara', 'Pirmskara ēka', 'līdz 1940 · dolomīts, ķieģelis', { f: 4, w: 4, c: '#dcc6a4', m: 'stone', win: 'tall', b: 'none', r: 'pediment', a: '#9c7b55' }],
    ['koka', 'Koka māja', 'koka konstrukcija, veranda', { f: 2, w: 3, c: '#b98458', m: 'wood', win: 'pair', b: 'veranda', r: 'pitched', a: '#7b4e2c' }],
    ['stalina', 'Staļina laika ēka', '2–6 st. · ķieģelis, dekoratīvs apmetums', { f: 5, w: 5, c: '#e4cb9f', m: 'plaster', win: 'tall', b: 'none', r: 'cornice', a: '#b8925e' }],
    ['316', '316. sērija', 'hruščovka · 5 st. · silikātķieģelis', { f: 5, w: 5, c: '#ece7dc', m: 'silicate', win: 'pair', b: 'small', r: 'flat', a: '#9aa3a8' }],
    ['318', '318. sērija', 'hruščovka · 5 st. · ķieģelis', { f: 5, w: 5, c: '#dcbca6', m: 'brick', win: 'pair', b: 'small', r: 'flat', a: '#8f6a55' }],
    ['464', '464. sērija', '5 st. · paneļi, balkoni', { f: 5, w: 6, c: '#c3c8cc', m: 'panel', win: 'pair', b: 'balcony', r: 'flat', a: '#7f8a92' }],
    ['lt_vecais', 'Lietuviešu vecais projekts', '5 st. · paneļi, balkoni', { f: 5, w: 6, c: '#c9cdc6', m: 'panel', win: 'pair', b: 'balcony', r: 'flat', a: '#8a9286' }],
    ['lt_jaunais', 'Lietuviešu jaunais projekts', '5 st. · paneļi, lodžijas', { f: 5, w: 6, c: '#cfd2cc', m: 'panel', win: 'pair', b: 'loggia', r: 'flat', a: '#8e958b' }],
    ['103', '103. sērija', '5–9 st. · paneļi', { f: 9, w: 6, c: '#d2d5d0', m: 'panel', win: 'pair', b: 'balcony', r: 'flat', a: '#8b928c' }],
    ['467', '467. sērija', '9 st. · lielpaneļi, lodžijas, krāsainas flīzes', { f: 9, w: 5, c: '#d6dadd', m: 'panel', win: 'pair', b: 'loggia', r: 'flat', a: '#5e9bb5' }],
    ['602', '602. sērija', '9 st. · balta flīžu apdare, balkoni', { f: 9, w: 4, c: '#f3f3ef', m: 'tile', win: 'pair', b: 'protrude', r: 'flat', a: '#a9b0b3' }],
    ['602u', '602. uzlabotā sērija', '9 st. · lodžiju nišas, krāsu akcenti', { f: 9, w: 4, c: '#f1eee8', m: 'tile', win: 'pair', b: 'recess', r: 'flat', a: '#d98f4e' }],
    ['119', '119. sērija', '9 st. · paneļi, vertikālas lodžiju joslas', { f: 9, w: 6, c: '#cfd6d2', m: 'panel', win: 'pair', b: 'bands', r: 'flat', a: '#7fa093' }],
    ['104', '104. sērija', '12–16 st. · torņveida, lodžijas', { f: 16, w: 3, c: '#bfc3c6', m: 'panel', win: 'pair', b: 'bandsBrown', r: 'flat', a: '#8a5b3d' }],
    ['mazgim', 'Mazģimeņu projekts', '5–9 st. · ķieģelis', { f: 9, w: 4, c: '#cf9a78', m: 'brick', win: 'small', b: 'none', r: 'flat', a: '#8c5b3e' }],
    ['cehu', 'Čehu projekts', 'izolētas istabas', { f: 9, w: 6, c: '#d8d2c6', m: 'panel', win: 'pair', b: 'balcony', r: 'flat', a: '#9a8f7c' }],
    ['franc', 'Franču projekts', 'monolīts dzelzsbetons', { f: 12, w: 4, c: '#c9cbce', m: 'mono', win: 'wide', b: 'none', r: 'flat', a: '#6f7880' }],
    ['brezn', 'Brežņeva laika projekts', 'lieli logi, augsti griesti', { f: 9, w: 6, c: '#d2d6da', m: 'panel', win: 'wide', b: 'balcony', r: 'flat', a: '#7d8790' }],
    ['spec', 'Specprojekts', 'dažādi materiāli, plašas istabas', { f: 7, w: 4, c: '#ddd5c8', m: 'mixed', win: 'mix', b: 'bay', r: 'flat', a: '#a08a6a' }],
    ['jauns', 'Jaunais projekts', 'pēc 1991 · stikla balkoni', { f: 7, w: 5, c: '#ebe8e2', m: 'modern', win: 'wide', b: 'glass', r: 'flat', a: '#c48a52' }],
    ['cits', 'Cits', '', { f: 3, w: 3, c: '#d9dcd9', m: 'panel', win: 'pair', b: 'none', r: 'flat', a: '#9aa19c' }]
  ];
  const BY = {}; S.forEach(s => BY[s[0]] = s); BY.lt = BY.lt_vecais;

  function shade(hex, p) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (p < 0 ? r : 255 - r) * p); g = Math.round(g + (p < 0 ? g : 255 - g) * p); b = Math.round(b + (p < 0 ? b : 255 - b) * p);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }

  function svg(key, size) {
    const d = (BY[key] || BY.cits)[3], uid = 's' + (key || 'x').replace(/\W/g, '') + Math.random().toString(36).slice(2, 6);
    const VW = 120, VH = 100, G = 92;
    const h = Math.min(d.r === 'pitched' ? 11 : 12.5, 76 / d.f), H = d.f * h, sw = Math.min(h * 1.9, 92 / d.w), W = d.w * sw, x0 = (VW - W) / 2, y0 = G - H;
    const dark = shade(d.c, -0.28), line = shade(d.c, -0.18), win = '#8fb1c9', winD = '#6d93ad';
    let o = '';
    o += `<defs><linearGradient id="${uid}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf3f6"/><stop offset="1" stop-color="#f7faf8"/></linearGradient>`;
    o += `<pattern id="${uid}br" width="4" height="2.4" patternUnits="userSpaceOnUse"><path d="M0 2.4H4M2 0V1.2M0 1.2H4M4 1.2V2.4M0 1.2V2.4" stroke="${line}" stroke-width=".25" fill="none"/></pattern>`;
    o += `<pattern id="${uid}tl" width="2" height="2" patternUnits="userSpaceOnUse"><path d="M0 0H2V2" stroke="${shade(d.c, -0.08)}" stroke-width=".2" fill="none"/></pattern></defs>`;
    o += `<rect width="${VW}" height="${VH}" rx="10" fill="url(#${uid}sky)"/>`;
    o += `<ellipse cx="60" cy="${G + 1}" rx="${W / 2 + 14}" ry="3" fill="#d6e3da"/>`;
    // trees
    o += `<circle cx="${x0 - 7}" cy="${G - 7}" r="5.5" fill="#9fc29a"/><rect x="${x0 - 7.6}" y="${G - 3}" width="1.2" height="3" fill="#7a6a55"/>`;
    o += `<circle cx="${x0 + W + 8}" cy="${G - 5}" r="4.2" fill="#b4d2a8"/><rect x="${x0 + W + 7.4}" y="${G - 2}" width="1.2" height="2" fill="#7a6a55"/>`;
    // roof
    if (d.r === 'pitched') o += `<path d="M${x0 - 3} ${y0 + 0.5} L60 ${y0 - 14} L${x0 + W + 3} ${y0 + 0.5}Z" fill="${d.a}"/>`;
    if (d.r === 'pediment') o += `<path d="M${60 - 12} ${y0} L60 ${y0 - 7} L${60 + 12} ${y0}Z" fill="${shade(d.c, -0.1)}" stroke="${dark}" stroke-width=".4"/>`;
    // body
    o += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="${d.c}" stroke="${dark}" stroke-width=".6"/>`;
    if (d.m === 'brick' || d.m === 'silicate') o += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#${uid}br)" opacity=".9"/>`;
    if (d.m === 'tile') o += `<rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="url(#${uid}tl)"/>`;
    if (d.m === 'wood') for (let y = y0 + 1.5; y < G; y += 1.6) o += `<path d="M${x0} ${y}H${x0 + W}" stroke="${shade(d.c, -0.15)}" stroke-width=".35"/>`;
    if (d.m === 'panel' || d.m === 'mono') {
      for (let i = 1; i < d.f; i++) o += `<path d="M${x0} ${y0 + i * h}H${x0 + W}" stroke="${line}" stroke-width=".3"/>`;
      if (d.m === 'panel') for (let s = 1; s < d.w * 2; s++) o += `<path d="M${x0 + s * sw / 2} ${y0}V${G}" stroke="${line}" stroke-width=".22"/>`;
    }
    if (d.m === 'modern') o += `<rect x="${x0 + W * 0.62}" y="${y0}" width="${W * 0.38}" height="${H}" fill="${d.a}" opacity=".85"/>`;
    if (d.a && (key === '467')) for (let i = 0; i < d.f; i += 2) o += `<rect x="${x0}" y="${y0 + i * h + h * 0.78}" width="${W}" height="${h * 0.16}" fill="${d.a}" opacity=".55"/>`;
    if (d.r === 'cornice') o += `<rect x="${x0 - 1.8}" y="${y0 - 1.6}" width="${W + 3.6}" height="2.2" fill="${shade(d.c, -0.12)}" stroke="${dark}" stroke-width=".4"/>`;
    if (d.r === 'flat') o += `<rect x="${x0 - 0.6}" y="${y0 - 1}" width="${W + 1.2}" height="1.2" fill="${dark}"/>`;
    if (d.m === 'stone' || d.m === 'plaster') o += `<rect x="${x0}" y="${G - h * 0.7}" width="${W}" height="${h * 0.7}" fill="${shade(d.c, -0.12)}"/>`;
    // windows / balconies
    for (let fl = 0; fl < d.f; fl++) {
      const fy = y0 + fl * h, ground = fl === d.f - 1;
      for (let s = 0; s < d.w; s++) {
        const sx = x0 + s * sw;
        const band = (d.b === 'bands' || d.b === 'bandsBrown') && s % 2 === 1;
        if (band) { o += `<rect x="${sx + 1}" y="${fy + h * 0.12}" width="${sw - 2}" height="${h * 0.8}" fill="${d.b === 'bandsBrown' ? d.a : shade(d.a, 0.15)}" opacity=".9"/>`;
          o += `<rect x="${sx + 2.2}" y="${fy + h * 0.2}" width="${sw - 4.4}" height="${h * 0.42}" fill="${winD}"/>`; continue; }
        if (d.b === 'recess' && s % 2 === 0 && !ground) { o += `<rect x="${sx + 1.2}" y="${fy + h * 0.1}" width="${sw - 2.4}" height="${h * 0.84}" fill="${shade(d.c, -0.22)}"/>`;
          o += `<rect x="${sx + 1.2}" y="${fy + h * 0.62}" width="${sw - 2.4}" height="${h * 0.32}" fill="${d.a}"/>`; }
        const ww = d.win === 'wide' ? sw * 0.62 : d.win === 'small' ? sw * 0.22 : sw * 0.26, wh = d.win === 'tall' ? h * 0.62 : d.win === 'small' ? h * 0.38 : h * 0.46;
        const wy = fy + (h - wh) / 2 - h * 0.04;
        if (d.win === 'wide') o += `<rect x="${sx + (sw - ww) / 2}" y="${wy}" width="${ww}" height="${wh}" fill="${win}" stroke="${winD}" stroke-width=".25"/>`;
        else if (d.win === 'mix' && s % 2) o += `<rect x="${sx + sw * 0.18}" y="${wy}" width="${sw * 0.64}" height="${wh}" fill="${win}" stroke="${winD}" stroke-width=".25"/>`;
        else { const g = sw * 0.12; o += `<rect x="${sx + sw / 2 - g - ww}" y="${wy}" width="${ww}" height="${wh}" fill="${win}" stroke="${winD}" stroke-width=".25"/>`;
          o += `<rect x="${sx + sw / 2 + g}" y="${wy}" width="${ww}" height="${wh}" fill="${win}" stroke="${winD}" stroke-width=".25"/>`;
          if (d.win === 'tall') { o += `<path d="M${sx + sw / 2 - g - ww} ${wy - 0.6}h${ww}M${sx + sw / 2 + g} ${wy - 0.6}h${ww}" stroke="${dark}" stroke-width=".5"/>`; } }
        if (ground) { if (s === Math.floor(d.w / 2)) o += `<rect x="${sx + sw / 2 - 1.8}" y="${fy + h * 0.25}" width="3.6" height="${h * 0.75}" fill="${shade(d.a, -0.15)}"/>`; continue; }
        if (d.b === 'balcony' && s % 2 === 0) o += `<rect x="${sx + 1.5}" y="${fy + h * 0.62}" width="${sw - 3}" height="${h * 0.3}" fill="${shade(d.c, -0.2)}" stroke="${dark}" stroke-width=".25"/>`;
        if (d.b === 'small' && s % 2 === 1) o += `<rect x="${sx + sw * 0.25}" y="${fy + h * 0.66}" width="${sw * 0.5}" height="${h * 0.26}" fill="none" stroke="${dark}" stroke-width=".45"/>`;
        if (d.b === 'loggia' && s % 2 === 0) o += `<rect x="${sx + 1}" y="${fy + h * 0.58}" width="${sw - 2}" height="${h * 0.36}" fill="${shade(d.c, -0.3)}" opacity=".8"/>`;
        if (d.b === 'protrude' && s % 2 === 1) o += `<rect x="${sx + 1}" y="${fy + h * 0.6}" width="${sw - 2}" height="${h * 0.32}" fill="#fff" stroke="${dark}" stroke-width=".3"/>`;
        if (d.b === 'glass' && s % 2 === 0) o += `<rect x="${sx + 1}" y="${fy + h * 0.56}" width="${sw - 2}" height="${h * 0.38}" fill="#bfe0ea" opacity=".75" stroke="${winD}" stroke-width=".25"/>`;
        if (d.b === 'bay' && s === 1) o += `<rect x="${sx - 0.6}" y="${fy + h * 0.06}" width="${sw * 0.9}" height="${h * 0.92}" fill="${shade(d.c, 0.15)}" stroke="${dark}" stroke-width=".25" opacity=".6"/>`;
      }
    }
    if (d.b === 'veranda') o += `<rect x="${x0 + W - sw * 1.1}" y="${G - h * 0.9}" width="${sw * 1.4}" height="${h * 0.9}" fill="#d7ecf2" stroke="${d.a}" stroke-width=".6"/>`;
    o += `<path d="M6 ${G}H114" stroke="#b7c9bd" stroke-width=".8"/>`;
    const sz = size ? ` width="${size}" height="${Math.round(size * VH / VW)}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${VH}"${sz} role="img" aria-label="${((BY[key] || BY.cits)[1])}">${o}</svg>`;
  }

  /** Ieteikumi pēc gada un stāviem */
  function suggest(gads, stavi) {
    gads = +gads || 0; stavi = +stavi || 0; const r = [];
    if (!gads && !stavi) return r;
    if (gads && gads < 1945) r.push('pirmskara', 'koka');
    if (gads >= 1945 && gads <= 1958) r.push('stalina');
    if (gads >= 1992) r.push('jauns', 'spec');
    if ((!gads || (gads > 1955 && gads < 1992))) {
      if (stavi && stavi <= 5) { if (!gads || gads <= 1970) r.push('316', '318', '464', 'lt_vecais'); if (!gads || gads >= 1965) r.push('lt_jaunais', '103', 'mazgim'); }
      if (stavi >= 6 && stavi <= 10) r.push('467', '602', '119', '103', 'cehu', 'mazgim', 'brezn');
      if (stavi >= 11) r.push('104', '602u', 'franc', 'spec');
    }
    return [...new Set(r)];
  }

  root.SERIJAS = { list: S.map(s => ({ key: s[0], name: s[1], desc: s[2] })), name: (k) => k ? ((BY[k] || [0, k])[1]) : '', svg, suggest };
  if (typeof module !== 'undefined') module.exports = root.SERIJAS;
})(typeof self !== 'undefined' ? self : this);
