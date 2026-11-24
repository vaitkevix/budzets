/* SH | Budžets — kadastrs.lv nolasītājs (grāmatzīme «SH Kadastrs»). © VAITKEVIX, SIA.
   Darbojas tikai kadastrs.lv lapā ar lietotāja paša pieslēgšanos (Smart-ID).
   Nolasa būvi (vai vairākas būves uz zemes vienības), zemes vienību un koplietošanas telpu grupas ar telpām,
   un atver SH | Budžets ar šiem datiem (jauns budžets vai pievienot esošam). */
(function () {
  if (window.__shKad) return; window.__shKad = 1;
  const APP = 'https://vaitkevix.cloud/sh/#budz/';
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;top:16px;z-index:2147483647;width:min(384px,calc(100vw - 32px))';
  const root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  root.innerHTML = '<style>' +
    ':host,.w{all:initial}' +
    '.w{--acc:#e2ddf2;--bg:#f1f4f2;--surf:#fff;--surf2:#f3f5f4;--ink:#17201c;--ink2:#4a534f;--ink3:#6d7672;--dark:#17201c;--ondark:#fff;--err:#b42318;' +
      'display:block;max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;padding:12px;border-radius:32px;background:var(--bg);color:var(--ink);' +
      'font:15px/1.45 Manrope,system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 24px 60px -16px rgba(16,32,26,.45)}' +
    '@media (prefers-color-scheme:dark){.w{--acc:#2c2840;--bg:#0b120f;--surf:#151d1a;--surf2:#1b2521;--ink:#eef2ef;--ink2:#b4bdb8;--ink3:#8b958f;--dark:#eef2ef;--ondark:#0b120f;--err:#ff8a80}}' +
    '.w *{box-sizing:border-box;font:inherit;color:inherit}' +
    '.hero{position:relative;padding:20px 20px 18px;border-radius:28px;background:var(--acc)}' +
    '.kick{display:block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}' +
    '.h{display:block;margin-top:4px;font-size:26px;font-weight:800;letter-spacing:-.03em;line-height:1.1}' +
    '.x{position:absolute;right:12px;top:12px;width:40px;height:40px;border:0;border-radius:50%;background:var(--surf);cursor:pointer;font-size:20px;line-height:40px;text-align:center;padding:0}' +
    '.bar{display:block;height:8px;margin-top:16px;border-radius:999px;background:rgba(255,255,255,.55);overflow:hidden}' +
    '.bar i{display:block;height:100%;width:3%;border-radius:999px;background:var(--dark);transition:width .25s}' +
    '.card{display:block;margin-top:8px;padding:16px 18px;border-radius:28px;background:var(--surf)}' +
    '.card b{font-weight:800}' +
    '.mut{display:block;margin-top:6px;font-size:13px;color:var(--ink3)}' +
    '.err{color:var(--err);font-weight:700}' +
    '.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}' +
    '.st{display:block;padding:12px 14px;border-radius:20px;background:var(--surf2)}' +
    '.st b{display:block;font-size:22px;font-weight:800;letter-spacing:-.02em;line-height:1.15}' +
    '.st span{display:block;font-size:12px;font-weight:700;color:var(--ink3)}' +
    '.row{display:flex;gap:8px;margin-top:12px}' +
    '.btn{display:flex;align-items:center;justify-content:center;min-height:48px;padding:0 20px;border:0;border-radius:999px;cursor:pointer;font-weight:800;text-decoration:none;text-align:center}' +
    '.p{flex:1;background:var(--dark);color:var(--ondark)}' +
    '.s{background:var(--surf2)}' +
    '.full{width:100%;margin-top:12px}' +
    '.pick{display:flex;gap:12px;align-items:flex-start;margin-top:8px;padding:12px 14px;border-radius:20px;background:var(--surf2);cursor:pointer}' +
    '.pick input{width:20px;height:20px;margin:2px 0 0;accent-color:var(--dark);flex:none}' +
    '.pick small{display:block;font-size:13px;color:var(--ink3)}' +
    '.foot{display:block;padding:10px 6px 2px;text-align:center;font-size:11px;color:var(--ink3)}' +
    '</style><div class="w"><div class="hero"><span class="kick">SH | Kadastrs</span><span class="h">Kadastrs → SH</span>' +
    '<button class="x" id="shk_x" title="Aizvērt" aria-label="Aizvērt">×</button><span class="bar"><i id="shk_p"></i></span></div>' +
    '<div class="card" id="shk_s">Sāku…</div><span class="foot">© ' + new Date().getFullYear() + ' VAITKEVIX, SIA</span></div>';
  document.body.appendChild(host);
  const box = root;
  const $s = () => box.querySelector('#shk_s');
  const st = (t, p) => { $s().innerHTML = t; if (p != null) box.querySelector('#shk_p').style.width = Math.max(3, p) + '%'; };
  box.querySelector('#shk_x').onclick = () => { host.remove(); window.__shKad = 0; };
  const fail = (t) => { st('<span class="err">' + t + '</span>'); window.__shKad = 0; };
  const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nf = (n) => n == null ? '—' : Number(n).toLocaleString('lv-LV', { maximumFractionDigits: 1 });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const get = async (u) => {
    u = u.replace(/^https?:\/\/(www\.)?kadastrs\.lv/, location.origin);
    for (let i = 0; i < 4; i++) {
      try { const r = await fetch(u, { credentials: 'include' }); if (r.ok) return new DOMParser().parseFromString(await r.text(), 'text/html'); }
      catch (e) {}
      await sleep(700 * (i + 1));
    }
    throw new Error('Neizdevās ielādēt ' + u.split('?')[0]);
  };
  const txt = (d) => d.body.innerText.replace(/[ \t ]+/g, ' ');
  const num = (s) => { const n = parseFloat(String(s || '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const rx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const field = (t, label) => { const m = t.match(new RegExp(rx(label) + '\\s*:?\\s*(-?[0-9][0-9.,]*)')); return m ? num(m[1]) : null; };
  const fieldS = (t, label) => { const m = t.match(new RegExp(rx(label) + '\\s*:\\s*([^\\n]+)')); return m ? m[1].trim() : ''; };
  /* Telpu grupas lietošanas veids. Pieņēmums (pārbaudīts dzīvajā: «1274 - Cita, iepriekš neklasificēta, telpu grupa»): grupas kods ir 4 cipari,
     būves kods — 8 cipari («11220104 - Daudzdzīvokļu…»). Ja lapā ir abi, ņem 4 ciparu (grupas); citādi — to, kurā «telpu grup»; citādi pirmo. */
  const fieldLv = (t) => { const L = [...t.matchAll(/Lietošanas veids\s*:\s*([^\n]+)/g)].map(m => m[1].trim());
    return L.find(x => /^\d{4}\b(?!\d)/.test(x)) || L.find(x => /telpu grup/i.test(x)) || L[0] || ''; };
  const isApt = (r) => / - \d+[A-Za-z]?\b/.test(r.row);
  const addrOf = (row) => { const m = row.match(/\d{11,17}\s*[0-9/]*\s*(.+?, [^,]+?)(, LV-\d{4})?(\s|$)/); return m ? m[1].trim() : ''; };

  const tnames = (R) => [...new Set((R || []).map(r => (r.n || r.v || '').trim()).concat((R || []).map(r => (r.v || '').trim())).filter(Boolean))].slice(0, 15);   // telpu nosaukumi/veidi grupā (stāvvietas atpazīšanai)
  async function readBuilding(b, groups, zeme, onProg) {
    const bt = txt(await get(b.h));
    const mine = groups.filter(g => g.t.indexOf(b.t) === 0);
    const apts = mine.filter(isApt), other = mine.filter(r => !isApt(r));
    const out = { v: 1, avots: 'kadastrs.lv', buve: b.t, zeme_apz: zeme.apz || '', zeme_m2: zeme.m2,
      adrese: addrOf(b.row), nosaukums_buvei: fieldS(bt, 'Nosaukums'), tips: fieldS(bt, 'Būves tips'),
      kopeja: field(bt, 'Kopējā platība (kv.m.)'), dzivoklu_m2: field(bt, 'Dzīvokļu platība (kv.m.)'),
      kopl_iek: field(bt, 'Koplietošanas iekštelpu platība (kv.m.)'), kopl_ar: field(bt, 'Koplietošanas ārtelpu platība (kv.m.)'),
      stavi: field(bt, 'Virszemes stāvu skaits'), gads: field(bt, 'Ekspluatācijas uzsākšanas gads') || field(bt, 'Būvniecības pabeigšanas gads') || field(bt, 'Uzbūvēšanas gads'), pazemes: field(bt, 'Pazemes stāvu skaits'), apbuve: field(bt, 'Apbūves laukums (kv.m.)'),
      dzivokli: apts.length, telpas: [], citas_grupas: [], neizdevas: [] };
    const rooms = (d) => { const out = [];
      const tbl = [...d.querySelectorAll('table')].filter(tb => !tb.querySelector('table') && /Telpas veids/.test(tb.textContent)).pop();
      if (tbl) {
        const head = [...tbl.querySelectorAll('tr')].find(tr => /Telpas veids/.test(tr.textContent));
        if (!head) return out;
        const hc = [...head.children].map(c => c.textContent.trim());
        const iN = hc.findIndex(h => /^Nosaukums/.test(h)), iV = hc.findIndex(h => /Telpas veids/.test(h)), iS = hc.findIndex(h => /^Stāvs/.test(h)), iP = hc.findIndex(h => /^Platība/.test(h));
        [...tbl.querySelectorAll('tr')].filter(tr => tr !== head).forEach(tr => { const c = [...tr.children].map(x => x.textContent.trim()); if (c.length < 5 || !c[iN]) return;
          out.push({ n: c[iN] || '', v: c[iV] || '', s: c[iS] || '', m2: num(c[iP]) || 0 }); });
      }
      return out;
    };
    /* Telpu grupas ar numuru adresē (« - 12») — pārbauda lietošanas veidu: stāvvietas, garāžas, noliktavas, veikali nav dzīvokļi */
    const notApt = []; let ad = 0;
    const chk = async (g) => { if (/dzīvok/i.test(g.row)) { ad++; onProg(ad, apts.length, 'dz'); return; }   // rindā jau redzams, ka dzīvoklis — neatver
      const d = await get(g.h), t = txt(d), lv = fieldLv(t), nos = fieldS(t, 'Nosaukums');
      if (lv && !/dzīvok|^\s*11\d\d/i.test(lv) && !/dzīvok/i.test(nos)) notApt.push({ apz: g.t, nosaukums: nos, lv, m2: field(t, 'Kopējā platība (kv.m.)'), telpas_n: tnames(rooms(d)) });
      ad++; onProg(ad, apts.length, 'dz'); };
    for (let i = 0; i < apts.length; i += 4) await Promise.all(apts.slice(i, i + 4).map(g => chk(g).catch(() => { ad++; out.neizdevas.push(g.t); })));
    out.dzivokli = apts.length - notApt.length;
    const grupas = []; let done = 0;
    const one = async (g) => {
      const d = await get(g.h); const t = txt(d);
      const grp = { apz: g.t, nosaukums: fieldS(t, 'Nosaukums'), lv: fieldLv(t), m2: field(t, 'Kopējā platība (kv.m.)'), telpas: rooms(d) };
      grupas.push(grp); done++; onProg(done, other.length);
    };
    for (let i = 0; i < other.length; i += 3) await Promise.all(other.slice(i, i + 3).map(g => one(g).catch(() => out.neizdevas.push(g.t))));
    const agg = {}, aggS = {};   // aggS — tas pats pa zonām (virszeme / pagrabs / bēniņi) Mājas lietai; Budžets lieto agg
    const zona = (s) => /pagrab|pazem|cokol|^\s*-\s*\d/i.test(s) ? 'Pagrabs' : /bēniņ|mansard|jumt/i.test(s) ? 'Bēniņi / jumts' : 'Virszeme';
    grupas.filter(g => /^1200\b|koplietošanas/i.test(g.lv)).forEach(g => g.telpas.forEach(r => {
      const ar = /ārtelp/i.test(r.v); const k = (r.n || 'Telpa').trim() + (ar ? ' (ārtelpa)' : '');
      (agg[k] = agg[k] || { nosaukums: k, m2: 0, skaits: 0, ar }); agg[k].m2 += r.m2; agg[k].skaits++;
      const z = zona(r.s), ks = z + '|' + k.toLowerCase();
      (aggS[ks] = aggS[ks] || { zona: z, nosaukums: k, m2: 0, skaits: 0, ar }); aggS[ks].m2 += r.m2; aggS[ks].skaits++;
    }));
    out.telpas_st = Object.values(aggS).map(x => Object.assign(x, { m2: Math.round(x.m2 * 10) / 10 })).sort((a, b) => b.m2 - a.m2);
    out.telpas = Object.values(agg).map(x => Object.assign(x, { m2: Math.round(x.m2 * 10) / 10 })).sort((a, b) => b.m2 - a.m2);
    out.citas_grupas = grupas.filter(g => !/^1200\b|koplietošanas/i.test(g.lv)).map(g => ({ apz: g.apz, nosaukums: g.nosaukums, lv: g.lv, m2: g.m2, telpas_n: tnames(g.telpas) })).concat(notApt);
    return out;
  }

  (async () => {
    try {
      if (!/kadastrs\.lv/.test(location.hostname)) return fail('Atver šo grāmatzīmi kadastrs.lv būves lapā (ar Smart-ID pieslēgšanos).');
      let doc = document;
      if (!/physical_view/.test(location.href)) {
        const a = [...document.querySelectorAll('a')].find(a => /buildings\/physical_view/.test(a.href)) || [...document.querySelectorAll('a')].find(a => /physical_view/.test(a.href));
        if (!a) return fail('Atver būvi kadastrs.lv (Meklēt būves → būve) un spied grāmatzīmi vēlreiz.');
        st('Atveru objektu sarakstu…', 5); doc = await get(a.href);
      }
      const seen = {};
      const rows = [...doc.querySelectorAll('tr')].filter(tr => !tr.querySelector('tr')).map(tr => { const a = tr.querySelector('a'); const t = a && a.textContent.trim(); return a && /^\d{11}(\d{3}(\d{3})?)?$/.test(t) ? { t, h: a.href, row: tr.textContent.replace(/\s+/g, ' ') } : null; }).filter(r => r && !seen[r.t] && (seen[r.t] = 1));
      const parcel = rows.find(r => r.t.length === 11), blds = rows.filter(r => r.t.length === 14), groups = rows.filter(r => r.t.length === 17);
      if (!blds.length) return fail('Neatradu būvi šajā lapā.');
      let chosen = blds;
      if (blds.length > 1) {
        const cnt = (b) => groups.filter(g => g.t.indexOf(b.t) === 0).length;
        st('Uz zemes vienības ir <b>' + blds.length + ' būves</b>.<span class="mut">Atzīmē, kuras iekļaut budžetā.</span>' +
          blds.map((b, i) => '<label class="pick"><input type="checkbox" data-i="' + i + '" ' + (cnt(b) ? 'checked' : '') + '>' +
            '<span><b>' + esc(b.t) + '</b><small>' + esc(addrOf(b.row) || '—') + ' · ' + cnt(b) + ' telpu grupas</small></span></label>').join('') +
          '<button class="btn p full" id="shk_go">Nolasīt izvēlētās</button>', 5);
        await new Promise(res => { box.querySelector('#shk_go').onclick = res; });
        chosen = [...box.querySelectorAll('input[data-i]')].filter(c => c.checked).map(c => blds[+c.dataset.i]);
        if (!chosen.length) return fail('Nav izvēlēta neviena būve.');
      }
      const zeme = { apz: parcel ? parcel.t : '', m2: null };
      if (parcel) { st('Lasu zemes vienību…', 8); const pt = txt(await get(parcel.h)); const ha = field(pt, 'Nekustamā īpašuma objekta platība'); zeme.m2 = ha != null ? Math.round(ha * 10000) : null; }
      const res = [];
      for (let i = 0; i < chosen.length; i++) {
        const b = chosen[i], base = 10 + i / chosen.length * 88, span = 88 / chosen.length;
        st('Lasu būvi ' + (i + 1) + ' / ' + chosen.length + '…', base);
        res.push(await readBuilding(b, groups, zeme, (d, n, k) => st('Būve ' + (i + 1) + ' / ' + chosen.length + ' · ' + (k === 'dz' ? 'pārbaudu dzīvokļus' : 'telpu grupas') + ': ' + d + ' / ' + n, base + (k === 'dz' ? d / Math.max(1, n) * span * 0.6 : span * 0.6 + d / Math.max(1, n) * span * 0.4))));
      }
      const payload = res.length === 1 ? res[0] : res;
      const json = JSON.stringify(payload);
      const enc = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const url = APP + 'kadastrs=' + enc, urlMl = 'https://vaitkevix.cloud/sh/#ml/kadastrs=' + enc;
      const dz = res.reduce((s, k) => s + k.dzivokli, 0), m2 = res.reduce((s, k) => s + k.telpas.reduce((a, x) => a + x.m2, 0), 0);
      const zm = res[0] && res[0].zeme_m2, adr = res.map(k => k.adrese || k.buve).filter(Boolean).join('; ');
      st('<b>Gatavs ✓</b>' + (adr ? '<span class="mut">' + esc(adr) + '</span>' : '') +
        '<div class="stats"><div class="st"><b>' + res.length + '</b><span>' + (res.length > 1 ? 'būves' : 'būve') + '</span></div>' +
        '<div class="st"><b>' + dz + '</b><span>dzīvokļi</span></div>' +
        '<div class="st"><b>' + nf(m2) + '</b><span>koplietošanas m²</span></div>' +
        '<div class="st"><b>' + nf(zm) + '</b><span>zeme m²</span></div></div>' +
        '<span class="mut">Budžetā izvēlies: jauns budžets vai pievienot esošam (dalītai mājai — katru daļu pēc kārtas). Mājas lietā — saglabā objekta kadastra datus.</span>' +
        '<div class="row"><a class="btn p" href="' + url + '" target="_blank" rel="noopener">Atvērt Budžetā</a>' +
        '<button class="btn s" id="shk_c">Kopēt</button></div>' +
        '<a class="btn p full" href="' + urlMl + '" target="_blank" rel="noopener">Atvērt Mājas lietā</a>', 100);
      box.querySelector('#shk_c').onclick = () => { navigator.clipboard.writeText('SHBUDZETS ' + json).then(() => box.querySelector('#shk_c').textContent = 'Nokopēts ✓'); };
      window.__shKadData = payload; window.__shKad = 0;
    } catch (e) { fail('Kļūda: ' + e.message); }
  })();
})();
