/* SH | Budžets — kadastrs.lv nolasītājs (grāmatzīme «SH Kadastrs»). © VAITKEVIX, SIA.
   Darbojas tikai kadastrs.lv lapā ar lietotāja paša pieslēgšanos (Smart-ID).
   Nolasa būvi (vai vairākas būves uz zemes vienības), zemes vienību un koplietošanas telpu grupas ar telpām,
   un atver SH | Budžets ar šiem datiem (jauns budžets vai pievienot esošam). */
(function () {
  if (window.__shKad) return; window.__shKad = 1;
  const APP = 'https://vaitkevix.github.io/budzets/';
  const G = '#0f6b5c';
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:16px;top:16px;z-index:2147483647;width:360px;max-height:85vh;overflow:auto;padding:16px;border-radius:14px;background:#fff;color:#1b1f1d;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 18px 50px -12px rgba(0,0,0,.45);border:1px solid #d9e3de';
  box.innerHTML = '<b style="font-size:15px;color:' + G + '">SH | Budžets · kadastrs</b><div id="shk_s" style="margin-top:8px">Sāku…</div><div style="height:6px;border-radius:4px;background:#e8efe9;margin-top:10px;overflow:hidden"><i id="shk_p" style="display:block;height:100%;width:3%;background:' + G + ';transition:width .2s"></i></div><div style="display:flex;align-items:center;gap:8px;margin-top:12px"><button id="shk_x" style="border:0;background:#eef2ef;border-radius:8px;padding:7px 12px;cursor:pointer">Aizvērt</button><span style="margin-left:auto;font-size:11px;color:#8a938f">© ' + new Date().getFullYear() + ' VAITKEVIX, SIA</span></div>';
  document.body.appendChild(box);
  const $s = () => box.querySelector('#shk_s');
  const st = (t, p) => { $s().innerHTML = t; if (p != null) box.querySelector('#shk_p').style.width = Math.max(3, p) + '%'; };
  box.querySelector('#shk_x').onclick = () => { box.remove(); window.__shKad = 0; };
  const fail = (t) => { st('<span style="color:#c02626">' + t + '</span>'); window.__shKad = 0; };
  const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  const isApt = (r) => / - \d+[A-Za-z]?\b/.test(r.row);
  const addrOf = (row) => { const m = row.match(/\d{11,17}\s*[0-9/]*\s*(.+?, [^,]+?)(, LV-\d{4})?(\s|$)/); return m ? m[1].trim() : ''; };

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
    const grupas = []; let done = 0;
    const one = async (g) => {
      const d = await get(g.h); const t = txt(d);
      const grp = { apz: g.t, nosaukums: fieldS(t, 'Nosaukums'), lv: fieldS(t, 'Lietošanas veids'), m2: field(t, 'Kopējā platība (kv.m.)'), telpas: [] };
      const tbl = [...d.querySelectorAll('table')].filter(tb => !tb.querySelector('table') && /Telpas veids/.test(tb.textContent)).pop();
      if (tbl) {
        const head = [...tbl.querySelectorAll('tr')].find(tr => /Telpas veids/.test(tr.textContent));
        const hc = [...head.children].map(c => c.textContent.trim());
        const iN = hc.findIndex(h => /^Nosaukums/.test(h)), iV = hc.findIndex(h => /Telpas veids/.test(h)), iS = hc.findIndex(h => /^Stāvs/.test(h)), iP = hc.findIndex(h => /^Platība/.test(h));
        [...tbl.querySelectorAll('tr')].filter(tr => tr !== head).forEach(tr => { const c = [...tr.children].map(x => x.textContent.trim()); if (c.length < 5 || !c[iN]) return;
          grp.telpas.push({ n: c[iN] || '', v: c[iV] || '', s: c[iS] || '', m2: num(c[iP]) || 0 }); });
      }
      grupas.push(grp); done++; onProg(done, other.length);
    };
    for (let i = 0; i < other.length; i += 3) await Promise.all(other.slice(i, i + 3).map(g => one(g).catch(() => out.neizdevas.push(g.t))));
    const agg = {};
    grupas.filter(g => /^1200\b|koplietošanas/i.test(g.lv)).forEach(g => g.telpas.forEach(r => {
      const ar = /ārtelp/i.test(r.v); const k = (r.n || 'Telpa').trim() + (ar ? ' (ārtelpa)' : '');
      (agg[k] = agg[k] || { nosaukums: k, m2: 0, skaits: 0, ar }); agg[k].m2 += r.m2; agg[k].skaits++;
    }));
    out.telpas = Object.values(agg).map(x => Object.assign(x, { m2: Math.round(x.m2 * 10) / 10 })).sort((a, b) => b.m2 - a.m2);
    out.citas_grupas = grupas.filter(g => !/^1200\b|koplietošanas/i.test(g.lv)).map(g => ({ apz: g.apz, nosaukums: g.nosaukums, lv: g.lv, m2: g.m2 }));
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
        st('Uz zemes vienības ir <b>' + blds.length + ' būves</b>. Atzīmē, kuras iekļaut budžetā:' +
          blds.map((b, i) => '<label style="display:flex;gap:8px;align-items:flex-start;margin-top:8px;cursor:pointer"><input type="checkbox" data-i="' + i + '" ' + (cnt(b) ? 'checked' : '') + ' style="margin-top:3px">' +
            '<span><b>' + esc(b.t) + '</b><br><span style="color:#6d7470">' + esc(addrOf(b.row) || '—') + ' · ' + cnt(b) + ' telpu grupas</span></span></label>').join('') +
          '<button id="shk_go" style="margin-top:12px;width:100%;border:0;background:' + G + ';color:#fff;font-weight:700;border-radius:9px;padding:10px;cursor:pointer">Nolasīt izvēlētās</button>', 5);
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
        res.push(await readBuilding(b, groups, zeme, (d, n) => st('Būve ' + (i + 1) + ' / ' + chosen.length + ' · telpu grupas: ' + d + ' / ' + n, base + d / Math.max(1, n) * span)));
      }
      const payload = res.length === 1 ? res[0] : res;
      const json = JSON.stringify(payload);
      const enc = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const url = APP + '#kadastrs=' + enc;
      const dz = res.reduce((s, k) => s + k.dzivokli, 0), m2 = res.reduce((s, k) => s + k.telpas.reduce((a, x) => a + x.m2, 0), 0);
      st('<b>Gatavs.</b> ' + res.length + (res.length > 1 ? ' būves · ' : ' būve · ') + dz + ' dzīvokļi · koplietošanas ' + m2.toFixed(1) + ' m²' +
        '<div style="margin-top:6px;color:#6d7470;font-size:12.5px">Budžetā izvēlies: jauns budžets vai pievienot esošam (dalītai mājai — katru daļu pēc kārtas).</div>' +
        '<div style="margin-top:10px;display:flex;gap:8px"><a href="' + url + '" target="_blank" style="flex:1;text-align:center;background:' + G + ';color:#fff;text-decoration:none;font-weight:700;padding:9px;border-radius:9px">Atvērt Budžetā</a>' +
        '<button id="shk_c" style="border:0;background:#eef2ef;border-radius:9px;padding:9px 12px;cursor:pointer">Kopēt</button></div>', 100);
      box.querySelector('#shk_c').onclick = () => { navigator.clipboard.writeText('SHBUDZETS ' + json).then(() => box.querySelector('#shk_c').textContent = 'Nokopēts ✓'); };
      window.__shKadData = payload; window.__shKad = 0;
    } catch (e) { fail('Kļūda: ' + e.message); }
  })();
})();
