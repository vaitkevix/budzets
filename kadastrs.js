/* SH | Budžets — kadastrs.lv nolasītājs (grāmatzīme). © VAITKEVIX, SIA.
   Darbojas tikai kadastrs.lv lapā ar lietotāja paša pieslēgšanos (Smart-ID).
   Nolasa būvi, zemes vienību un koplietošanas telpu grupas ar telpām, un atver SH | Budžets ar šiem datiem. */
(function () {
  if (window.__shKad) return; window.__shKad = 1;
  const APP = 'https://vaitkevix.github.io/budzets/';
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:16px;top:16px;z-index:2147483647;width:340px;padding:16px;border-radius:14px;background:#fff;color:#1b1f1d;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 18px 50px -12px rgba(0,0,0,.45);border:1px solid #d9e3de';
  box.innerHTML = '<b style="font-size:15px;color:#0f6b5c">SH | Budžets · kadastrs</b><div id="shk_s" style="margin-top:8px">Sāku…</div><div style="height:6px;border-radius:4px;background:#e8efe9;margin-top:10px;overflow:hidden"><i id="shk_p" style="display:block;height:100%;width:3%;background:#0f6b5c;transition:width .2s"></i></div><button id="shk_x" style="margin-top:12px;border:0;background:#eef2ef;border-radius:8px;padding:7px 12px;cursor:pointer">Aizvērt</button>';
  document.body.appendChild(box);
  const st = (t, p) => { box.querySelector('#shk_s').innerHTML = t; if (p != null) box.querySelector('#shk_p').style.width = Math.max(3, p) + '%'; };
  box.querySelector('#shk_x').onclick = () => { box.remove(); window.__shKad = 0; };
  const fail = (t) => { st('<span style="color:#c02626">' + t + '</span>'); window.__shKad = 0; };

  const get = async (u) => new DOMParser().parseFromString(await (await fetch(u, { credentials: 'include' })).text(), 'text/html');
  const txt = (d) => d.body.innerText.replace(/[ \t ]+/g, ' ');
  const num = (s) => { const n = parseFloat(String(s || '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  const rx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const field = (t, label) => { const m = t.match(new RegExp(rx(label) + '\\s*:?\\s*(-?[0-9][0-9.,]*)')); return m ? num(m[1]) : null; };
  const fieldS = (t, label) => { const m = t.match(new RegExp(rx(label) + '\\s*:\\s*([^\\n]+)')); return m ? m[1].trim() : ''; };

  (async () => {
    try {
      if (!/kadastrs\.lv/.test(location.hostname)) return fail('Atver šo grāmatzīmi kadastrs.lv būves lapā (ar Smart-ID pieslēgšanos).');
      // 1) Fiziskās atrašanās skats
      let doc = document;
      if (!/physical_view/.test(location.href)) {
        const a = [...document.querySelectorAll('a')].find(a => /buildings\/physical_view/.test(a.href)) || [...document.querySelectorAll('a')].find(a => /physical_view/.test(a.href));
        if (!a) return fail('Atver būvi kadastrs.lv (Meklēt būves → būve) un spied grāmatzīmi vēlreiz.');
        st('Atveru būves objektu sarakstu…', 5); doc = await get(a.href);
      }
      const seen = {};
      const rows = [...doc.querySelectorAll('tr')].filter(tr => !tr.querySelector('tr')).map(tr => { const a = tr.querySelector('a'); const t = a && a.textContent.trim(); return a && /^\d{11}(\d{3}(\d{3})?)?$/.test(t) ? { t, h: a.href, row: tr.textContent.replace(/\s+/g, ' ') } : null; }).filter(r => r && !seen[r.t] && (seen[r.t] = 1));
      const parcel = rows.find(r => r.t.length === 11), bld = rows.find(r => r.t.length === 14);
      const groups = rows.filter(r => r.t.length === 17);
      if (!bld) return fail('Neatradu būvi šajā lapā.');
      const isApt = (r) => / - \d+[A-Za-z]?\b/.test(r.row);
      const apts = groups.filter(isApt), other = groups.filter(r => !isApt(r));
      // 2) Būve
      st('Lasu būves datus…', 10);
      const bt = txt(await get(bld.h));
      const out = { v: 1, avots: 'kadastrs.lv', buve: bld.t, zeme_apz: parcel ? parcel.t : '',
        adrese: (bld.row.match(/\d{14}\s*[0-9/]*\s*(.+?, [^,]+?)(, LV-\d{4})?(\s|$)/) || [])[1] || '',
        nosaukums_buvei: fieldS(bt, 'Nosaukums'), tips: fieldS(bt, 'Būves tips'), gads: field(bt, 'Uzbūvēšanas gads'),
        kopeja: field(bt, 'Kopējā platība (kv.m.)'), dzivoklu_m2: field(bt, 'Dzīvokļu platība (kv.m.)'),
        kopl_iek: field(bt, 'Koplietošanas iekštelpu platība (kv.m.)'), kopl_ar: field(bt, 'Koplietošanas ārtelpu platība (kv.m.)'),
        stavi: field(bt, 'Virszemes stāvu skaits'), pazemes: field(bt, 'Pazemes stāvu skaits'), apbuve: field(bt, 'Apbūves laukums (kv.m.)'),
        dzivokli: apts.length, grupas: [], telpas: [] };
      // 3) Zeme
      if (parcel) { st('Lasu zemes vienību…', 14); const pt = txt(await get(parcel.h)); const ha = field(pt, 'Nekustamā īpašuma objekta platība'); out.zeme_m2 = ha != null ? Math.round(ha * 10000) : null; }
      // 4) Telpu grupas (koplietošanas un nedzīvojamās)
      const list = other.slice(); let done = 0;
      const one = async (g) => {
        const d = await get(g.h); const t = txt(d);
        const lv = fieldS(t, 'Lietošanas veids'), nos = fieldS(t, 'Nosaukums');
        const grp = { apz: g.t, nosaukums: nos, lv, m2: field(t, 'Kopējā platība (kv.m.)'), telpas: [] };
        const tbl = [...d.querySelectorAll('table')].filter(tb => !tb.querySelector('table') && /Telpas veids/.test(tb.textContent)).pop();
        if (tbl) {
          const head = [...tbl.querySelectorAll('tr')].find(tr => /Telpas veids/.test(tr.textContent)); const hc = [...head.children].map(c => c.textContent.trim());
          const iN = hc.findIndex(h => /^Nosaukums/.test(h)), iV = hc.findIndex(h => /Telpas veids/.test(h)), iS = hc.findIndex(h => /^Stāvs/.test(h)), iP = hc.findIndex(h => /^Platība/.test(h));
          [...tbl.querySelectorAll('tr')].filter(tr => tr !== head).forEach(tr => { const c = [...tr.children].map(x => x.textContent.trim()); if (c.length < 5 || !c[iN]) return;
            grp.telpas.push({ n: c[iN] || '', v: c[iV] || '', s: c[iS] || '', m2: num(c[iP]) || 0 }); });
        }
        out.grupas.push(grp); done++; st('Lasu telpu grupas: ' + done + ' / ' + list.length, 15 + done / list.length * 80);
      };
      for (let i = 0; i < list.length; i += 5) await Promise.all(list.slice(i, i + 5).map(one));
      // 5) Apkopojums pa telpu nosaukumiem (tikai koplietošanas)
      const agg = {};
      out.grupas.filter(g => /^1200\b|koplietošanas/i.test(g.lv)).forEach(g => g.telpas.forEach(r => {
        const ar = /ārtelp/i.test(r.v); const k = (r.n || 'Telpa').trim() + (ar ? ' (ārtelpa)' : '');
        (agg[k] = agg[k] || { nosaukums: k, m2: 0, skaits: 0, ar }); agg[k].m2 += r.m2; agg[k].skaits++;
      }));
      out.telpas = Object.values(agg).map(x => Object.assign(x, { m2: Math.round(x.m2 * 10) / 10 })).sort((a, b) => b.m2 - a.m2);
      out.citas_grupas = out.grupas.filter(g => !/^1200\b|koplietošanas/i.test(g.lv)).map(g => ({ apz: g.apz, nosaukums: g.nosaukums, lv: g.lv, m2: g.m2 }));
      delete out.grupas;
      const json = JSON.stringify(out);
      const enc = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const url = APP + '#kadastrs=' + enc;
      const sum = out.telpas.reduce((s, x) => s + x.m2, 0);
      st('<b>Gatavs.</b> ' + out.dzivokli + ' dzīvokļi · ' + out.telpas.length + ' telpu veidi · koplietošanas ' + sum.toFixed(1) + ' m²' +
        '<div style="margin-top:10px;display:flex;gap:8px"><a href="' + url + '" target="_blank" style="flex:1;text-align:center;background:#0f6b5c;color:#fff;text-decoration:none;font-weight:700;padding:9px;border-radius:9px">Atvērt Budžetā</a>' +
        '<button id="shk_c" style="border:0;background:#eef2ef;border-radius:9px;padding:9px 12px;cursor:pointer">Kopēt</button></div>', 100);
      box.querySelector('#shk_c').onclick = () => { navigator.clipboard.writeText('SHBUDZETS ' + json).then(() => box.querySelector('#shk_c').textContent = 'Nokopēts ✓'); };
      window.__shKadData = out; window.__shKad = 0;
    } catch (e) { fail('Kļūda: ' + e.message); }
  })();
})();
