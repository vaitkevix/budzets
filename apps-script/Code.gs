/**
 * SH | Budžets — © VAITKEVIX, SIA. Visas tiesības aizsargātas.
 * SH | Budžets — uzkopšanas (sanitārās apkopes) tāmju lietotne
 * Google Sheet + Apps Script API. Struktūra atbilst MK noteikumu Nr. 408
 * tāmes pozīcijai «1.1. Dzīvojamās mājas sanitārā apkope».
 *
 * Saskarne: https://vaitkevix.github.io/budzets/ (GitHub) — šis skripts ir tās API (doPost).
 *
 * Lapas:
 *   Lietotāji  — Vārds | PIN (unikāls) | Loma (admin / gatavotājs / vadība) | Aktīvs (jā/nē)
 *   Budžeti    — viena rinda katram budžetam (pēdējā versija)
 *   Versijas   — katra saglabāšana (pilna vēsture)
 *   Žurnāls    — darbību žurnāls
 *
 * Pirmajā reizē: palaid funkciju setup() no redaktora.
 */

const APP_NAME = 'SH | Budžets';
const SHEETS = { USERS: 'Lietotāji', BUD: 'Budžeti', VER: 'Versijas', LOG: 'Žurnāls', SET: 'Iestatījumi', TPL: 'Veidnes' };
const USER_HEAD = ['Vārds', 'PIN', 'Loma', 'Aktīvs', 'E-pasts'];
const TPL_HEAD = ['ID', 'Nosaukums', 'Apraksts', 'Autors', 'Izveidots', 'Dati'];
const APP_URL = 'https://vaitkevix.github.io/budzets/';
const BUD_HEAD = ['ID', 'Nosaukums', 'Adrese', 'Pasūtītājs', 'Izpildītājs', 'Sagatavots', 'Derīgs līdz',
  'Autors', 'Statuss', 'Cena bez PVN', 'Cena ar PVN', 'Versija', 'Izveidots', 'Atjaunots',
  'Vadības komentārs', 'Izskatīja', 'Dati', 'Dzīvokļu m²', 'Sērija'];
const VER_HEAD = ['ID', 'Versija', 'Laiks', 'Lietotājs', 'Statuss', 'Cena bez PVN', 'Piezīme', 'Dati'];
const LOG_HEAD = ['Laiks', 'Lietotājs', 'Darbība', 'Budžets', 'Info'];
const STATUSES = ['Melnraksts', 'Iesniegts', 'Apstiprināts', 'Noraidīts', 'Arhivēts'];
const TZ = 'Europe/Riga';
function copy_() { return '© ' + Utilities.formatDate(new Date(), TZ, 'yyyy') + ' VAITKEVIX, SIA. Visas tiesības aizsargātas.'; }
/** Copyright rinda Excel lapas apakšā */
function addCopy_(sh) {
  const r = sh.getLastRow() + 2;
  sh.getRange(r, 1).setValue('SELECTUM HOME · vaitkevix.cloud/sh · ' + copy_()).setFontColor('#6d7672').setFontSize(9);
}

/* ---------------- Web app ---------------- */

function doGet() {
  return ContentService.createTextOutput(APP_NAME + ' API — lietotne: https://vaitkevix.cloud/sh/#budz · ' + copy_());
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Nederīgs pieprasījums' }); }
  try {
    const user = auth_(req.pin);
    if (!user) return json_({ ok: false, error: 'Nepareizs PIN' });
    const fn = ACTIONS[req.action];
    if (!fn) return json_({ ok: false, error: 'Nezināma darbība' });
    return json_(Object.assign({ ok: true }, fn(user, req) || {}));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

const ACTIONS = {
  login: (u) => { log_(u.name, 'Pieteicās'); return { user: u, settings: publicSettings_() }; },
  tplList: (u) => ({ items: tplList_() }),
  tplGet: (u, r) => ({ tpl: tplGet_(r.id) }),
  tplSave: (u, r) => ({ tpl: tplSave_(u, r) }),
  tplDel: (u, r) => ({ done: tplDel_(u, r.id) }),
  sendPdf: (u, r) => ({ sent: sendPdfMail_(u, r) }),
  list: (u) => ({ items: listBudgets_(u) }),
  get: (u, r) => r.versija ? getVersion_(u, r.id, r.versija) : getBudget_(u, r.id),
  save: (u, r) => saveBudget_(u, r),
  status: (u, r) => ({ done: setStatus_(u, r.id, r.statuss, r.komentars) }),
  del: (u, r) => ({ done: deleteBudget_(u, r.id) }),
  versions: (u, r) => ({ items: getVersions_(u, r.id) }),
  pdf: (u, r) => ({ file: exportPdf_(u, r.id, r.data, r.calc, r.meta) }),
  xlsx: (u, r) => ({ file: exportXlsx_(u, r.id, r.data, r.calc, r.meta) }),
  listXlsx: (u, r) => ({ file: exportListXlsx_(u, r.ids) }),
  aiKadastrs: (u, r) => ({ ai: aiKadastrs_(u, r.text) }),
  aiTelpas: (u, r) => ({ kat: aiTelpas_(u, r.nosaukumi) })
};

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------- Uzstādīšana ---------------- */

function setup() {
  const ss = SS_();
  const mk = (name, head, widths) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head])
        .setFontWeight('bold').setBackground('#0f6b5c').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
    (widths || []).forEach((w, i) => sh.setColumnWidth(i + 1, w));
    return sh;
  };
  const u = mk(SHEETS.USERS, USER_HEAD, [180, 90, 130, 80]);
  mk(SHEETS.BUD, BUD_HEAD);
  mk(SHEETS.VER, VER_HEAD);
  mk(SHEETS.LOG, LOG_HEAD);
  ensureSettings_(); ensureTpl_();
  const uh = u.getRange(1, 1, 1, USER_HEAD.length); uh.setValues([USER_HEAD]).setFontWeight('bold').setBackground('#0f6b5c').setFontColor('#ffffff');
  if (u.getLastRow() < 2) {
    u.getRange(2, 1, 3, 4).setValues([
      ['Admins', '1234', 'admin', 'jā'],
      ['Gatavotājs', '1111', 'gatavotājs', 'jā'],
      ['Vadība', '2222', 'vadība', 'jā']
    ]);
  }
  u.getRange('B:B').setNumberFormat('@');
  const roleRule = SpreadsheetApp.newDataValidation().requireValueInList(['admin', 'gatavotājs', 'vadība'], true).build();
  u.getRange(2, 3, 200, 1).setDataValidation(roleRule);
  const yn = SpreadsheetApp.newDataValidation().requireValueInList(['jā', 'nē'], true).build();
  u.getRange(2, 4, 200, 1).setDataValidation(yn);
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lapa1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
}

/* ---------------- Palīgfunkcijas ---------------- */

function sh_(name) {
  const sh = SS_().getSheetByName(name);
  if (!sh) throw new Error('Nav lapas «' + name + '». Palaid setup().');
  return sh;
}
function now_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }
function norm_(s) { return String(s || '').trim().toLowerCase(); }
function isMgmt_(u) { return u.role === 'vadība' || u.role === 'admin'; }
function isMaker_(u) { return u.role === 'gatavotājs' || u.role === 'admin'; }

function log_(user, action, id, info) {
  try { sh_(SHEETS.LOG).appendRow([now_(), user, action, id || '', info || '']); } catch (e) {}
}

function users_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('users');
  if (hit) return JSON.parse(hit);
  const list = usersRead_();
  cache.put('users', JSON.stringify(list), 60);
  return list;
}
function usersRead_() {
  const v = sh_(SHEETS.USERS).getDataRange().getValues();
  v.shift();
  return v.filter(r => r[0] && norm_(r[3]) !== 'nē')
    .map(r => ({ name: String(r[0]).trim(), pin: String(r[1]).trim(), role: norm_(r[2]) || 'gatavotājs', email: String(r[4] || '').trim() }));
}

/** Lietotājs pēc PIN (PIN jābūt unikālam) */
function auth_(pin) {
  pin = String(pin || '').trim();
  if (!pin) return null;
  const cu = centralUser_(pin, 'budz');
  if (cu.known) {
    if (!cu.role) return null;
    const loc = users_().find(x => x.name.toLowerCase() === String(cu.name).toLowerCase());
    return { name: cu.name, role: cu.role, email: loc && loc.email || '' };
  }
  const u = users_().find(x => x.pin === pin);
  return u ? { name: u.name, role: u.role, email: u.email || '' } : null;
}

function budRows_() {
  const sh = sh_(SHEETS.BUD);
  const v = sh.getDataRange().getValues();
  v.shift();
  return v;
}
/** Saraksts bez «Dati» stabiņa (ātrāk) + kešs */
function metaAll_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('meta');
  if (hit) return JSON.parse(hit);
  const sh = sh_(SHEETS.BUD), n = sh.getLastRow() - 1, iD = BUD_HEAD.indexOf('Dati');
  let list = [];
  if (n > 0) {
    const a = sh.getRange(2, 1, n, iD).getValues();
    const b = sh.getRange(2, iD + 2, n, Math.max(1, BUD_HEAD.length - iD - 1)).getValues();
    list = a.map((r, i) => r.concat([''], b[i])).filter(r => r[0]).map(rowToMeta_);
  }
  const js = JSON.stringify(list);
  if (js.length < 90000) cache.put('meta', js, 300);
  return list;
}
function bust_() { CacheService.getScriptCache().remove('meta'); }

function rowToMeta_(r) {
  const o = {};
  BUD_HEAD.forEach((h, i) => { if (h !== 'Dati') o[h] = r[i] instanceof Date ? Utilities.formatDate(r[i], TZ, 'yyyy-MM-dd') : r[i]; });
  return {
    id: o['ID'], nosaukums: o['Nosaukums'], adrese: o['Adrese'], pasutitajs: o['Pasūtītājs'],
    izpilditajs: o['Izpildītājs'], sagatavots: o['Sagatavots'], derigs: o['Derīgs līdz'],
    autors: o['Autors'], statuss: o['Statuss'], bezPVN: Number(o['Cena bez PVN']) || 0,
    arPVN: Number(o['Cena ar PVN']) || 0, versija: Number(o['Versija']) || 1,
    izveidots: o['Izveidots'], atjaunots: o['Atjaunots'], komentars: o['Vadības komentārs'],
    izskatija: o['Izskatīja'], plat: Number(o['Dzīvokļu m²']) || 0, serija: o['Sērija'] || '',
    perM2: (Number(o['Dzīvokļu m²']) > 0) ? round2_(Number(o['Cena bez PVN']) / Number(o['Dzīvokļu m²']) * 100) / 100 : null
  };
}
function findRow_(id) {
  const sh = sh_(SHEETS.BUD), n = sh.getLastRow() - 1;
  if (n < 1) return null;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) {
    return { idx: i + 2, row: sh.getRange(i + 2, 1, 1, BUD_HEAD.length).getValues()[0] };
  }
  return null;
}
function canSee_(u, meta) { return isMgmt_(u) || norm_(meta.autors) === norm_(u.name); }

/* ---------------- Budžeti ---------------- */

function listBudgets_(u) {
  const list = metaAll_().filter(m => canSee_(u, m));
  list.sort((a, b) => String(b.atjaunots).localeCompare(String(a.atjaunots)));
  return list;
}

function getBudget_(u, id) {
  const f = findRow_(id);
  if (!f) throw new Error('Budžets nav atrasts.');
  const meta = rowToMeta_(f.row);
  if (!canSee_(u, meta)) throw new Error('Nav piekļuves.');
  return { meta: meta, data: JSON.parse(f.row[BUD_HEAD.indexOf('Dati')] || '{}') };
}

function nextId_() {
  const year = Utilities.formatDate(new Date(), TZ, 'yyyy');
  let max = 0;
  const sh = sh_(SHEETS.BUD), n = sh.getLastRow() - 1;
  (n > 0 ? sh.getRange(2, 1, n, 1).getValues() : []).forEach(r => {
    const m = String(r[0]).match(/^B-(\d{4})-(\d+)$/);
    if (m && m[1] === year) max = Math.max(max, Number(m[2]));
  });
  return 'B-' + year + '-' + ('000' + (max + 1)).slice(-4);
}

/**
 * payload = { id?, data, calc, statuss?, piezime? }
 * data — visa forma; calc — klienta aprēķins (summas)
 */
function saveBudget_(u, payload) {
  if (!isMaker_(u)) throw new Error('Vadības profils budžetus nelabo — tikai skatās un apstiprina.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = payload.data || {};
    const c = payload.calc || {};
    const o = d.objekts || {};
    const sh = sh_(SHEETS.BUD);
    const hc = sh.getRange(1, BUD_HEAD.length);
    if (hc.getValue() !== BUD_HEAD[BUD_HEAD.length - 1]) sh.getRange(1, 1, 1, BUD_HEAD.length).setValues([BUD_HEAD]).setFontWeight('bold').setBackground('#0f6b5c').setFontColor('#ffffff');
    const ts = now_();
    let id = payload.id;
    let row, version = 1, status = payload.statuss || 'Melnraksts', created = ts, autors = u.name, koment = '', izsk = '';
    if (id) {
      const f = findRow_(id);
      if (!f) throw new Error('Budžets nav atrasts.');
      const meta = rowToMeta_(f.row);
      if (u.role !== 'admin' && norm_(meta.autors) !== norm_(u.name)) throw new Error('Var labot tikai savus budžetus.');
      if (meta.statuss === 'Apstiprināts' && u.role !== 'admin') throw new Error('Apstiprinātu budžetu labot nevar — izveido kopiju.');
      row = f.idx; version = meta.versija + 1; created = meta.izveidots; autors = meta.autors;
      koment = meta.komentars; izsk = meta.izskatija;
      if (!payload.statuss) status = meta.statuss === 'Noraidīts' ? 'Melnraksts' : meta.statuss;
    } else {
      id = nextId_();
    }
    const json = JSON.stringify(d);
    const values = [id, o.nosaukums || '', o.adrese || '', o.pasutitajs || '', o.izpilditajs || '',
      o.sagatavots || '', '', autors, status, round2_(c.bezPVN), round2_(c.arPVN), version,
      created, ts, koment, izsk, json, Number(o.lietderiga) || '', o.serija || ''];
    if (row) sh.getRange(row, 1, 1, values.length).setValues([values]);
    else sh.appendRow(values);
    sh_(SHEETS.VER).appendRow([id, version, ts, u.name, status, round2_(c.bezPVN), payload.piezime || '', json]);
    bust_();
    log_(u.name, row ? 'Saglabāja' : 'Izveidoja', id, 'v' + version + ' · ' + status);
    let sent = [];
    if (payload.sutitVadibai && status === 'Iesniegts') {
      try { sent = mailBudget_(u, { id: id, versija: version, statuss: status, autors: autors }, d, c, settingList_('Vadības e-pasti'), 'iesniegts', payload.piezime, true); }
      catch (e) { log_(u.name, 'E-pasta kļūda', id, String(e.message || e)); sent = ['KĻŪDA: ' + (e.message || e)]; }
    }
    return { id: id, versija: version, statuss: status, atjaunots: ts, sent: sent };
  } finally {
    lock.releaseLock();
  }
}

function setStatus_(u, id, status, comment) {
  if (STATUSES.indexOf(status) < 0) throw new Error('Nezināms statuss.');
  const f = findRow_(id);
  if (!f) throw new Error('Budžets nav atrasts.');
  const meta = rowToMeta_(f.row);
  const own = norm_(meta.autors) === norm_(u.name);
  const mgmtOnly = ['Apstiprināts', 'Noraidīts', 'Arhivēts'];
  if (mgmtOnly.indexOf(status) >= 0 && !isMgmt_(u)) throw new Error('Šo statusu var likt tikai vadība.');
  if (mgmtOnly.indexOf(status) < 0 && !own && u.role !== 'admin') throw new Error('Nav piekļuves.');
  const sh = sh_(SHEETS.BUD);
  sh.getRange(f.idx, BUD_HEAD.indexOf('Statuss') + 1).setValue(status);
  sh.getRange(f.idx, BUD_HEAD.indexOf('Atjaunots') + 1).setValue(now_());
  if (mgmtOnly.indexOf(status) >= 0) {
    sh.getRange(f.idx, BUD_HEAD.indexOf('Vadības komentārs') + 1).setValue(comment || '');
    sh.getRange(f.idx, BUD_HEAD.indexOf('Izskatīja') + 1).setValue(u.name + ' · ' + now_().slice(0, 16).replace('T', ' '));
  }
  sh_(SHEETS.VER).appendRow([id, meta.versija, now_(), u.name, status, meta.bezPVN, comment || ('Statuss → ' + status), '']);
  bust_();
  log_(u.name, 'Statuss', id, status + (comment ? ' · ' + comment : ''));
  if ((status === 'Apstiprināts' || status === 'Noraidīts') && settingOn_('Sūtīt paziņojumus')) {
    try {
      const au = usersRead_().find(x => norm_(x.name) === norm_(meta.autors));
      if (au && au.email && norm_(au.name) !== norm_(u.name)) {
        const d = JSON.parse(f.row[BUD_HEAD.indexOf('Dati')] || '{}');
        mailNotice_(au.email, (status === 'Apstiprināts' ? '✓ Apstiprināts: ' : '✗ Noraidīts: ') + (d.objekts && d.objekts.nosaukums || id),
          `<p>Budžetu <b>${esc_((d.objekts && d.objekts.nosaukums) || id)}</b> (${esc_(id)}, ${eur_(meta.bezPVN)} mēnesī bez PVN) vadība (${esc_(u.name)}) <b>${status === 'Apstiprināts' ? 'apstiprināja' : 'noraidīja'}</b>.</p>` +
          (comment ? `<p>Komentārs: <i>${esc_(comment)}</i></p>` : ''));
      }
    } catch (e) { log_(u.name, 'E-pasta kļūda', id, String(e.message || e)); }
  }
  return true;
}

function deleteBudget_(u, id) {
  const f = findRow_(id);
  if (!f) throw new Error('Budžets nav atrasts.');
  const meta = rowToMeta_(f.row);
  const own = norm_(meta.autors) === norm_(u.name);
  if (!(u.role === 'admin' || (own && meta.statuss === 'Melnraksts'))) throw new Error('Dzēst var tikai savu melnrakstu (vai admins).');
  sh_(SHEETS.BUD).deleteRow(f.idx);
  bust_();
  log_(u.name, 'Dzēsa', id, meta.nosaukums);
  return true;
}

function getVersions_(u, id) {
  const f = findRow_(id);
  if (!f) throw new Error('Budžets nav atrasts.');
  if (!canSee_(u, rowToMeta_(f.row))) throw new Error('Nav piekļuves.');
  const v = sh_(SHEETS.VER).getDataRange().getValues();
  v.shift();
  return v.filter(r => String(r[0]) === String(id)).map(r => ({
    versija: r[1], laiks: String(r[2]), lietotajs: r[3], statuss: r[4], bezPVN: Number(r[5]) || 0,
    piezime: r[6], irDati: !!r[7]
  })).reverse();
}

function getVersion_(u, id, versija) {
  const f = findRow_(id);
  if (!f) throw new Error('Budžets nav atrasts.');
  const meta = rowToMeta_(f.row);
  if (!canSee_(u, meta)) throw new Error('Nav piekļuves.');
  const v = sh_(SHEETS.VER).getDataRange().getValues();
  for (let i = v.length - 1; i > 0; i--) {
    if (String(v[i][0]) === String(id) && Number(v[i][1]) === Number(versija) && v[i][7]) {
      return { meta: Object.assign({}, meta, { versija: versija }), data: JSON.parse(v[i][7]) };
    }
  }
  throw new Error('Versija nav atrasta.');
}

/* ---------------- Eksports ---------------- */

/** PDF: klients atsūta jau aprēķināto tāmi (calc), lai PDF 1:1 sakrīt ar ekrānā redzamo. */
function exportPdf_(u, id, data, calc, meta) {
  if (id) { const f = findRow_(id); if (f && !canSee_(u, rowToMeta_(f.row))) throw new Error('Nav piekļuves.'); }
  const html = pdfHtml_(data, calc, meta || {});
  const blob = Utilities.newBlob(html, 'text/html', 'tame.html').getAs('application/pdf');
  const name = fileName_(data, meta) + '.pdf';
  log_(u.name, 'PDF', id || '', name);
  return { name: name, mime: 'application/pdf', b64: Utilities.base64Encode(blob.getBytes()) };
}

function exportXlsx_(u, id, data, calc, meta) {
  if (id) { const f = findRow_(id); if (f && !canSee_(u, rowToMeta_(f.row))) throw new Error('Nav piekļuves.'); }
  const name = fileName_(data, meta);
  const ss = SpreadsheetApp.create(name);
  try {
    buildWorkbook_(ss, data, calc, meta || {});
    SpreadsheetApp.flush();
    const out = xlsxBytes_(ss.getId());
    log_(u.name, 'Excel', id || '', name);
    return { name: name + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', b64: out };
  } finally {
    DriveApp.getFileById(ss.getId()).setTrashed(true);
  }
}

/** Vadībai — visu (atfiltrēto) budžetu saraksts Excel failā */
function exportListXlsx_(u, ids) {
  const all = metaAll_().filter(m => canSee_(u, m));
  const list = ids && ids.length ? all.filter(m => ids.indexOf(m.id) >= 0) : all;
  const name = 'Budžetu saraksts ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const ss = SpreadsheetApp.create(name);
  try {
    const sh = ss.getSheets()[0].setName('Budžeti');
    const head = ['ID', 'Objekts', 'Adrese', 'Pasūtītājs', 'Izpildītājs', 'Autors', 'Statuss', 'Sagatavots',
      'Sērija', 'Dzīvokļu m²', 'Cena mēnesī bez PVN', 'Cena mēnesī ar PVN', 'Cena gadā bez PVN', '€ / m² mēn. bez PVN', 'Versija', 'Atjaunots', 'Vadības komentārs'];
    const rows = list.map(m => [m.id, m.nosaukums, m.adrese, m.pasutitajs, m.izpilditajs, m.autors, m.statuss,
      m.sagatavots, serijaName_(m.serija), m.plat || '', m.bezPVN, m.arPVN, round2_(m.bezPVN * 12), m.perM2 || '', m.versija, String(m.atjaunots).replace('T', ' '), m.komentars]);
    const H = 4, n = rows.length;
    sh.getRange(H, 1, 1, head.length).setValues([head]);
    if (n) sh.getRange(H + 1, 1, n, head.length).setValues(rows);
    xlTable_(sh, 'Budžetu saraksts', Utilities.formatDate(new Date(), TZ, 'dd.MM.yyyy') + ' · ' + n + ' budžeti', H, head.length, n);
    sh.getRange(H, 10, 1, 5).setHorizontalAlignment('right');
    if (n) {
      sh.getRange(H + 1, 10, n, 1).setNumberFormat('#,##0.0#');
      sh.getRange(H + 1, 11, n, 3).setNumberFormat('#,##0.00 "€"');
      const t = H + n + 1;
      sh.getRange(t, 10).setValue('Kopā');
      sh.getRange(H + 1, 14, n, 1).setNumberFormat('0.0000 "€"');
      sh.getRange(t, 11, 1, 3).setFormulas([[`=SUM(K${H + 1}:K${t - 1})`, `=SUM(L${H + 1}:L${t - 1})`, `=SUM(M${H + 1}:M${t - 1})`]])
        .setNumberFormat('#,##0.00 "€"');
      xlTotal_(sh.getRange(t, 1, 1, head.length), true);
    }
    xlFit_(sh, head.length, 80);
    addCopy_(sh);
    SpreadsheetApp.flush();
    return { name: name + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', b64: xlsxBytes_(ss.getId()) };
  } finally {
    DriveApp.getFileById(ss.getId()).setTrashed(true);
  }
}

function xlsxBytes_(fileId) {
  const url = 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=xlsx';
  const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Excel eksports neizdevās (' + res.getResponseCode() + ').');
  return Utilities.base64Encode(res.getBlob().getBytes());
}

function fileName_(data, meta) {
  const o = (data && data.objekts) || {};
  const base = 'Tāme ' + (o.nosaukums || o.adrese || (meta && meta.id) || 'budžets');
  return base.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 90);
}

function round2_(x) { return Math.round((Number(x) || 0) * 100) / 100; }
function eur_(x) {
  const n = round2_(x);
  const s = Math.abs(n).toFixed(2).split('.');
  s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '−' : '') + '€' + s[0] + ',' + s[1];
}
function pct_(x, d) { return (Math.round((Number(x) || 0) * 1000) / 10).toFixed(d == null ? 1 : d).replace('.', ',').replace(/,0$/, '') + '%'; }
function num_(x, d) { return (Number(x) || 0).toFixed(d || 0).replace('.', ','); }
function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function lvDate_(iso) { if (!iso) return ''; const p = String(iso).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso; }

/* ---- Excel stils (sh-theme/eksports.md; Budžets = lilac) ---- */
const XL_ = { ink: '#17201c', ink2: '#4a534f', mute: '#6d7672', line: '#dfe5e2', soft: '#f3f5f4', acc: '#e2ddf2' };
function styleHeader_(rng) {
  rng.setBackground(XL_.ink).setFontColor('#ffffff').setFontWeight('bold').setFontSize(10).setVerticalAlignment('middle');
  rng.getSheet().setRowHeight(rng.getRow(), 24);
}
/** 1. rinda — nosaukums lilac joslā, 2. rinda — apakšvirsraksts */
function xlTitle_(sh, title, sub, cols) {
  sh.getRange(1, 1, 1, cols).merge().setValue(title).setFontSize(16).setFontWeight('bold').setFontColor(XL_.ink)
    .setBackground(XL_.acc).setVerticalAlignment('middle');
  sh.setRowHeight(1, 34);
  if (sub != null) sh.getRange(2, 1, 1, cols).merge().setValue(sub).setFontSize(10).setFontColor(XL_.ink2).setWrap(false);
}
/** Datu rindas: 10pt, plāna apakšlīnija */
function xlBody_(rng) {
  if (!rng || rng.getNumRows() < 1) return;
  rng.setFontSize(10).setFontColor(XL_.ink).setVerticalAlignment('middle')
    .setBorder(null, null, true, null, null, true, XL_.line, SpreadsheetApp.BorderStyle.SOLID);
}
/** Kopsumma: bold, fons, augšējā līnija */
function xlTotal_(rng, acc) {
  rng.setFontWeight('bold').setBackground(acc ? XL_.acc : XL_.soft).setFontColor(XL_.ink)
    .setBorder(true, null, null, null, null, null, XL_.ink, SpreadsheetApp.BorderStyle.SOLID);
}
/** Vienkārša tabula: virsraksts, galvene (rinda hr), dati, piesprausta galvene, filtrs */
function xlTable_(sh, title, sub, hr, cols, nData) {
  xlTitle_(sh, title, sub, cols);
  styleHeader_(sh.getRange(hr, 1, 1, cols));
  xlBody_(sh.getRange(hr + 1, 1, Math.max(nData, 1), cols));
  sh.setFrozenRows(hr);
  if (nData > 0) sh.getRange(hr, 1, nData + 1, cols).createFilter();
  sh.setHiddenGridlines(true);
}
function xlFit_(sh, cols, min) {
  sh.autoResizeColumns(1, cols);
  for (let i = 1; i <= cols; i++) { const w = sh.getColumnWidth(i); if (w < (min || 90)) sh.setColumnWidth(i, min || 90); else if (w > 360) sh.setColumnWidth(i, 360); }
}

/* ---- Excel darbgrāmata (vērtības no aprēķina) ---- */
function buildWorkbook_(ss, d, c, meta) {
  const o = d.objekts || {};
  const EUR = '#,##0.00 "€"';
  const subT = [o.nosaukums || o.adrese || '', o.adrese && o.nosaukums ? o.adrese : '', o.pasutitajs || '', lvDate_(o.sagatavots)].filter(Boolean).join(' · ');
  // Tāme
  const t = ss.getSheets()[0].setName('Tāme');
  t.setHiddenGridlines(true);
  xlTitle_(t, 'Sanitārās apkopes tāme', 'Struktūra atbilst MK noteikumu Nr. 408 tāmes pozīcijai «1.1. Dzīvojamās mājas sanitārā apkope».', 5);
  const obj = [['Nosaukums', o.nosaukums || ''], ['Adrese', o.adrese || ''], ['Pasūtītājs', o.pasutitajs || ''],
    ['Ēkas sērija', serijaName_(o.serija) + (o.gads ? ' · ' + o.gads + '. g.' : '') + (o.stavi ? ' · ' + o.stavi + ' st.' : '')], ['Sagatavots', lvDate_(o.sagatavots)], ['Izpildītājs', o.izpilditajs || ''], ['Dzīvokļi / dzīvokļu m²', (o.dzivokli || '') + ' / ' + (o.lietderiga || '')],
    ['Budžeta ID', meta.id || ''], ['Autors', meta.autors || ''], ['Statuss', meta.statuss || '']];
  t.getRange(4, 1, obj.length, 2).setValues(obj);
  xlBody_(t.getRange(4, 1, obj.length, 2));
  t.getRange(4, 1, obj.length, 1).setFontColor(XL_.mute);
  t.getRange(4, 2, obj.length, 1).setHorizontalAlignment('left');
  t.getRange(4, 4, 3, 2).setValues([['Cena mēnesī bez PVN', c.bezPVN], ['Cena mēnesī ar PVN', c.arPVN], ['Uzk. izd. = € / dzīvokļu m² (bez PVN)', c.perM2bez == null ? '' : c.perM2bez]])
    .setFontWeight('bold').setFontSize(10).setFontColor(XL_.ink).setBackground(XL_.soft)
    .setBorder(null, null, true, null, null, true, XL_.line, SpreadsheetApp.BorderStyle.SOLID);
  t.getRange(4, 5).setFontSize(14).setBackground(XL_.acc);
  t.getRange(4, 4).setBackground(XL_.acc);
  t.getRange(4, 5, 2, 1).setNumberFormat(EUR);
  t.getRange(6, 5).setNumberFormat('0.0000 "€"');
  let r = 15;
  t.getRange(r, 1, 1, 5).setValues([['Nr.', 'Pozīcija (MK 408 — 1.1. Sanitārā apkope)', 'Mēnesī', 'Gadā', 'Daļa']]);
  styleHeader_(t.getRange(r, 1, 1, 5));
  t.getRange(r, 3, 1, 3).setHorizontalAlignment('right');
  const lines = (c.lines || []).map(l => [l.nr || '', l.name, l.men, l.gada, l.dala == null ? '' : l.dala]);
  t.getRange(r + 1, 1, lines.length, 5).setValues(lines);
  xlBody_(t.getRange(r + 1, 1, lines.length, 5));
  t.getRange(r + 1, 1, lines.length, 1).setFontColor(XL_.mute).setHorizontalAlignment('left');
  t.getRange(r + 1, 3, lines.length, 2).setNumberFormat(EUR);
  t.getRange(r + 1, 5, lines.length, 1).setNumberFormat('0.0%');
  (c.lines || []).forEach((l, i) => {
    if (l.bold) xlTotal_(t.getRange(r + 1 + i, 1, 1, 5), !!l.total);
  });
  t.setColumnWidth(1, 110); t.setColumnWidth(2, 340); t.setColumnWidths(3, 3, 120); t.setColumnWidth(4, 220);

  // Platības
  const p = ss.insertSheet('Platības');
  const pr = [['Zona', 'Tips', 'Platība, m²']];
  (d.telpas || []).forEach(z => pr.push([z.nosaukums, z.tips === 'iek' ? 'Koplietošanas iekštelpas' : (z.tips === 'cieti' ? 'Teritorija — cietie segumi' : z.tips === 'gar' ? 'Garāža / pazemes stāvvieta' : 'Teritorija — zālāji / apstādījumi'), Number(z.m2) || 0]));
  const pn = pr.length - 1;
  pr.push(['Koplietošanas iekštelpas kopā', '', c.areas.iek], ['Teritorija kopā', '', c.areas.ter], ['Logi (aprēķins)', '', c.areas.logi]);
  p.getRange(4, 1, pr.length, 3).setValues(pr);
  xlTable_(p, 'Platības', subT, 4, 3, pn);
  p.getRange(4, 3).setHorizontalAlignment('right');
  p.getRange(5, 3, pr.length - 1, 1).setNumberFormat('#,##0.0#');
  xlTotal_(p.getRange(4 + pr.length - 3, 1, 3, 3));
  p.setColumnWidth(1, 320); p.setColumnWidth(2, 240); p.setColumnWidth(3, 120);

  // Darbi
  const w = ss.insertSheet('Darbi');
  const wr = [['Darbs', 'Zona', 'Izpildītājs', 'Platība, m²', 'Reizes mēnesī', 'Ražība, m² / h', 'Stundas mēnesī', 'Izmaksas mēnesī']];
  (c.darbi || []).forEach(x => wr.push([x.nosaukums, x.zona, x.izp, x.area, x.reizes, x.raziba, x.h, x.cost]));
  wr.push(['Kopā', '', '', '', '', '', c.hA + c.hS, c.darbiCost]);
  w.getRange(4, 1, wr.length, 8).setValues(wr);
  xlTable_(w, 'Regulārie darbi', subT, 4, 8, wr.length - 2);
  w.getRange(4, 4, 1, 5).setHorizontalAlignment('right');
  w.getRange(5, 4, wr.length - 1, 1).setNumberFormat('#,##0');
  w.getRange(5, 5, wr.length - 1, 1).setNumberFormat('#,##0.00');
  w.getRange(5, 6, wr.length - 1, 1).setNumberFormat('#,##0');
  w.getRange(5, 7, wr.length - 1, 1).setNumberFormat('#,##0.0');
  w.getRange(5, 8, wr.length - 1, 1).setNumberFormat(EUR);
  xlTotal_(w.getRange(3 + wr.length, 1, 1, 8), true);
  xlFit_(w, 8, 100); w.setColumnWidth(1, 420);

  // Sezonālie
  const s = ss.insertSheet('Sezonālie darbi');
  const sr = [['Sezonālais darbs', 'Platība, m²', 'Cena reizē (€/m² vai €/gab.)', 'Reizes gadā', 'Summa gadā', 'Mēnesī']];
  (c.sezon || []).forEach(x => sr.push([x.nosaukums, x.area, x.cena, x.reizes, x.gada, x.men]));
  sr.push(['Kopā', '', '', '', c.sezonGada, c.sezonMen]);
  s.getRange(4, 1, sr.length, 6).setValues(sr);
  xlTable_(s, 'Sezonālie darbi', subT, 4, 6, sr.length - 2);
  s.getRange(4, 2, 1, 5).setHorizontalAlignment('right');
  s.getRange(5, 2, sr.length - 1, 1).setNumberFormat('#,##0');
  s.getRange(5, 3, sr.length - 1, 1).setNumberFormat('#,##0.000');
  s.getRange(5, 4, sr.length - 1, 1).setNumberFormat('#,##0');
  s.getRange(5, 5, sr.length - 1, 2).setNumberFormat(EUR);
  xlTotal_(s.getRange(3 + sr.length, 1, 1, 6), true);
  xlFit_(s, 6, 100); s.setColumnWidth(1, 420);

  // Inventārs
  const inv = ss.insertSheet('Inventārs');
  const ir = [['Grupa', 'Pozīcija', 'Apraksts', 'Cena']];
  [['Iekštelpu uzkopšanai', d.invIek], ['Pagalma uzkopšanai', d.invPag]].forEach(g => (g[1] || []).filter(x => x.on).forEach(x => ir.push([g[0], x.nosaukums, x.apraksts || '', Number(x.cena) || 0])));
  const inN = ir.length - 1;
  ir.push(['Kopā', '', '', c.invTotal], ['Nolietojums mēnesī (÷ ' + d.param.invMen + ' mēn.)', '', '', c.inv]);
  inv.getRange(4, 1, ir.length, 4).setValues(ir);
  xlTable_(inv, 'Inventārs', subT, 4, 4, inN);
  inv.getRange(4, 4).setHorizontalAlignment('right');
  inv.getRange(5, 4, ir.length - 1, 1).setNumberFormat(EUR);
  xlTotal_(inv.getRange(2 + ir.length, 1, 2, 4), true);
  inv.setColumnWidth(1, 200); inv.setColumnWidth(2, 240); inv.setColumnWidth(3, 340); inv.setColumnWidth(4, 120);

  // Parametri
  const pa = ss.insertSheet('Parametri');
  const P = d.param || {};
  const prm = [['Parametrs', 'Vērtība'],
    ['Apkopējas bruto likme, € / h', P.likmeA], ['Sētnieka bruto likme, € / h', P.likmeS],
    ['Minimālā alga, € / mēn.', P.minAlga], ['Darba stundas mēnesī', P.stundas],
    ['Atvaļinājuma rezerve', P.atv], ['Darba devēja VSAOI', P.vsaoi],
    ['Pilnā stundas cena — apkopēja', c.fullA], ['Pilnā stundas cena — sētnieks', c.fullS],
    ['Neproduktīvais laiks', P.neprod], ['Logu daļa no iekštelpām', P.logiDala],
    ['Atkritumu konteineru laukums, m²', P.atkritumi],
    ['Materiāli — iekštelpas, € / m² mēn.', P.matIek], ['Materiāli — teritorija, € / m² mēn.', P.matTer],
    ['Inventāra nolietojums, mēn.', P.invMen], ['Transports un sakari, € / mēn.', P.transports],
    ['Netiešās izmaksas', P.netiesas], ['Neparedzētie izdevumi', P.nepar], ['Peļņa', P.pelna], ['PVN', P.pvn]];
  pa.getRange(4, 1, prm.length, 2).setValues(prm);
  xlTable_(pa, 'Parametri', subT, 4, 2, 0);
  pa.getRange(4, 2).setHorizontalAlignment('right');
  [6, 7, 10, 11, 18, 19, 20, 21].forEach(i => pa.getRange(i + 3, 2).setNumberFormat('0.00%'));
  pa.setColumnWidth(1, 300); pa.setColumnWidth(2, 140);
  xlBody_(pa.getRange(5, 1, prm.length - 1, 2));
  [t, p, w, s, inv, pa].forEach(addCopy_);
  ss.setActiveSheet(t);
}

/* ---- PDF HTML (SH eksportu stils — sh-theme/eksports.md; Budžets = lilac) ---- */
function pdfHtml_(d, c, meta) {
  const o = d.objekts || {};
  const INK = '#17201c', INK2 = '#4a534f', MUTE = '#6d7672', LINE = '#dfe5e2', SOFT = '#f3f5f4', ACC = '#e2ddf2', BAD = '#8a2a3b', GOOD = '#2f5d45';
  const css = `
  @page{size:A4;margin:14mm}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Manrope,-apple-system,"Segoe UI",Arial,Helvetica,sans-serif;color:${INK};font-size:11.5px;line-height:1.4;margin:0}
  table{border-collapse:separate;border-spacing:0;width:100%}
  tr{page-break-inside:avoid;break-inside:avoid}
  .hd td{vertical-align:middle;border:0;padding:0}
  .logo{width:34px;height:34px;background:${INK};border-radius:9px;padding:6px;box-sizing:border-box}
  .logo table{width:22px;border-spacing:2px;border-collapse:separate}
  .logo td{width:9px;height:9px;border-radius:3px;padding:0;font-size:1px;line-height:1px}
  .brand{font-weight:800;font-size:13px;letter-spacing:-.01em;color:${INK}}
  .kind{color:${MUTE};font-size:10.5px}
  .when{text-align:right;color:${INK2};font-size:10.5px}
  .when b{color:${INK};font-weight:800}
  .band{background:${ACC};border-radius:14px;padding:16px 18px;margin:12px 0 14px}
  h1{font-size:24px;font-weight:800;letter-spacing:-.02em;margin:0 0 4px;color:${INK}}
  .band .sub{color:${INK2};font-size:11px}
  h2{font-size:15px;font-weight:800;letter-spacing:-.02em;margin:18px 0 8px;color:${INK}}
  .card{background:${SOFT};border-radius:12px;padding:12px 14px;vertical-align:top}
  .card .cap{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${MUTE};margin-bottom:6px}
  .kv td{padding:4px 0;border-bottom:1px solid ${LINE};font-size:11.5px}
  .kv tr.last td{border-bottom:0}
  .kv td.k{color:${MUTE}}
  .kv td.v{text-align:right;font-weight:600}
  .big{font-size:22px;font-weight:800;letter-spacing:-.02em;color:${INK}}
  .t th{background:${INK};color:#fff;text-align:left;padding:7px 8px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
  .t th.f{border-radius:8px 0 0 8px}
  .t th.l{border-radius:0 8px 8px 0}
  .t td{padding:6px 8px;border-bottom:1px solid ${LINE};font-size:11px}
  .t tr.z td{background:#fafbfa}
  .r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .t th.r,.t td.r{text-align:right}
  .muted{color:${MUTE}}
  .t tr.tot td{background:${SOFT};font-weight:800}
  .t tr.grand td{background:${ACC};font-weight:800;font-size:12.5px;border-bottom:0}
  .note{margin-top:12px;color:${INK2};font-size:10.5px}
  .chip{display:inline-block;border-radius:999px;padding:1px 8px;font-weight:700;font-size:10px}
  .pb{page-break-before:always}
  .ft{margin-top:18px;border-top:1px solid ${LINE}}
  .ft td{padding-top:6px;color:${MUTE};font-size:9.5px;border:0}`;
  const zebra = (i) => i % 2 ? ' class="z"' : '';
  const kv = (rows) => rows.map((r, i) => `<tr${i === rows.length - 1 ? ' class="last"' : ''}><td class="k">${r[0]}</td><td class="v">${r[1]}</td></tr>`).join('');
  const objRows = kv([['Nosaukums', o.nosaukums], ['Adrese', o.adrese], ['Pasūtītājs', o.pasutitajs],
    ['Ēkas sērija', serijaName_(o.serija) + (o.gads ? ' · ' + o.gads + '. g.' : '') + (o.stavi ? ' · ' + o.stavi + ' st.' : '')],
    ['Sagatavots', lvDate_(o.sagatavots)], ['Izpildītājs', o.izpilditajs], ['Dzīvokļi / dzīvokļu m²', (o.dzivokli || '—') + ' / ' + (o.lietderiga ? num_(o.lietderiga, 1) : '—')]]
    .map(r => [esc_(r[0]), esc_(r[1] || '')]));
  const resRows = kv([
    ['Cena mēnesī bez PVN', `<span class="big">${eur_(c.bezPVN)}</span>`],
    ['Cena gadā bez PVN', `<b>${eur_(c.bezPVN * 12)}</b>`],
    ['Uzk. izd. = € / dzīvokļu m² bez PVN', `<b>${c.perM2bez == null ? '—' : '€' + num_(c.perM2bez, 4)}</b>`],
    ['Cena mēnesī ar PVN (' + pct_(d.param.pvn, 0) + ')', eur_(c.arPVN)]]);
  const lines = (c.lines || []).map((l, i) => `<tr class="${l.total ? 'grand' : (l.bold ? 'tot' : (i % 2 ? 'z' : ''))}">
      <td class="muted">${esc_(l.nr || '')}</td><td>${esc_(l.name)}</td>
      <td class="r">${eur_(l.men)}</td><td class="r">${eur_(l.gada)}</td>
      <td class="r">${l.dala == null ? '' : pct_(l.dala)}</td></tr>`).join('');
  const darbi = (c.darbi || []).map((x, i) => `<tr${zebra(i)}><td>${esc_(x.nosaukums)}</td><td>${esc_(x.izp)}</td>
      <td class="r">${num_(x.area)}</td><td class="r">${num_(x.reizes, 2)}</td><td class="r">${num_(x.raziba)}</td>
      <td class="r">${num_(x.h, 1)}</td><td class="r">${eur_(x.cost)}</td></tr>`).join('');
  const sez = (c.sezon || []).map((x, i) => `<tr${zebra(i)}><td>${esc_(x.nosaukums)}</td><td class="r">${num_(x.area)}</td>
      <td class="r">${num_(x.cena, 3)}</td><td class="r">${num_(x.reizes)}</td><td class="r">${eur_(x.gada)}</td>
      <td class="r">${eur_(x.men)}</td></tr>`).join('');
  const invRows = [].concat((d.invIek || []).filter(x => x.on).map(x => ['Iekštelpas', x]), (d.invPag || []).filter(x => x.on).map(x => ['Pagalms', x]))
    .map((a, i) => `<tr${zebra(i)}><td class="muted">${a[0]}</td><td>${esc_(a[1].nosaukums)}</td><td class="muted">${esc_(a[1].apraksts || '')}</td><td class="r">${eur_(a[1].cena)}</td></tr>`).join('');
  const th = (cols) => '<tr>' + cols.map((h, i) => `<th class="${[i === 0 ? 'f' : '', i === cols.length - 1 ? 'l' : '', h[1] ? 'r' : ''].join(' ').trim()}">${h[0]}</th>`).join('') + '</tr>';
  const sq = (col) => `<td style="background:${col}">&nbsp;</td>`;
  const idTxt = meta.id ? esc_(meta.id) + (meta.versija ? ' · v' + meta.versija : '') : '';
  const head = (kind) => `<table class="hd"><tr>
    <td style="width:44px"><div class="logo"><table><tr>${sq('#d6e8e1')}${sq('#f4e4b4')}</tr><tr>${sq('#d8e6f2')}${sq('#e2ddf2')}</tr></table></div></td>
    <td><div class="brand">SELECTUM HOME</div><div class="kind">${kind}</div></td>
    <td class="when">${o.sagatavots ? 'Sagatavots <b>' + esc_(lvDate_(o.sagatavots)) + '</b>' : ''}${idTxt ? '<br>' + idTxt : ''}</td></tr></table>`;
  const foot = `<table class="ft"><tr><td>SELECTUM HOME · vaitkevix.cloud/sh</td><td style="text-align:right">${copy_()}</td></tr></table>`;
  const minChip = c.minOk ? `<span class="chip" style="background:#d6e8e1;color:${GOOD}">atbilst</span>` : `<span class="chip" style="background:#f5dbe3;color:${BAD}">ZEM MINIMĀLĀS ALGAS</span>`;
  return `<html><head><meta charset="utf-8"><style>${css}</style></head><body>
  ${head('Budžets · uzkopšanas tāme')}
  <div class="band"><h1>Sanitārās apkopes tāme</h1>
  <div class="sub">Struktūra atbilst MK noteikumu Nr. 408 tāmes pozīcijai «1.1. Dzīvojamās mājas sanitārā apkope».${meta.id ? ' · ' + esc_(meta.id) + (meta.versija ? ' (v' + meta.versija + ')' : '') : ''}</div></div>
  <table><tr><td class="card" style="width:50%"><div class="cap">Objekts</div><table class="kv">${objRows}</table></td>
  <td style="width:12px;padding:0;border:0"></td>
  <td class="card"><div class="cap">Rezultāts</div><table class="kv">${resRows}</table></td></tr></table>
  <h2>Tāme</h2>
  <table class="t">${th([['Nr.'], ['Pozīcija (MK 408 — 1.1. Sanitārā apkope)'], ['Mēnesī', 1], ['Gadā', 1], ['Daļa', 1]])}${lines}</table>
  <div class="note">Pilnā stundas cena: apkopēja ${eur_(c.fullA)}, sētnieks ${eur_(c.fullS)} (ar atvaļinājuma rezervi un VSAOI). Neproduktīvais laiks ${pct_(d.param.neprod, 0)}. Minimālās algas pārbaude: ${minChip}.</div>
  ${foot}

  <div class="pb"></div>
  ${head('Budžets · tāmes pielikumi')}
  <h2>Pielikums 1 — Regulārie darbi</h2>
  <table class="t">${th([['Darbs'], ['Izpildītājs'], ['m²', 1], ['Reizes/mēn.', 1], ['m²/h', 1], ['h/mēn.', 1], ['€/mēn.', 1]])}${darbi}
  <tr class="tot"><td colspan="5">Kopā</td><td class="r">${num_(c.hA + c.hS, 1)}</td><td class="r">${eur_(c.darbiCost)}</td></tr></table>
  <h2>Pielikums 2 — Sezonālie darbi</h2>
  <table class="t">${th([['Darbs'], ['Platība', 1], ['Cena reizē', 1], ['Reizes gadā', 1], ['Gadā', 1], ['Mēnesī', 1]])}${sez}
  <tr class="tot"><td colspan="4">Kopā</td><td class="r">${eur_(c.sezonGada)}</td><td class="r">${eur_(c.sezonMen)}</td></tr></table>
  <h2>Pielikums 3 — Inventārs</h2>
  <table class="t">${th([['Grupa'], ['Pozīcija'], ['Apraksts'], ['Cena', 1]])}${invRows}
  <tr class="tot"><td colspan="3">Kopā (nolietojums ${d.param.invMen} mēn. → ${eur_(c.inv)} mēnesī)</td><td class="r">${eur_(c.invTotal)}</td></tr></table>
  ${foot}
  </body></html>`;
}


/* ---------------- AI: kadastra dati → forma ---------------- */

function aiCall_(system, prompt, maxTokens) {
  const props = PropertiesService.getScriptProperties();
  const model = props.getProperty('AI_MODEL');
  const claudeKey = props.getProperty('ANTHROPIC_API_KEY');
  const geminiKey = props.getProperty('GEMINI_API_KEY');
  if (claudeKey) {
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({ model: model || 'claude-haiku-5-5', max_tokens: maxTokens, system: system, messages: [{ role: 'user', content: prompt }] })
    });
    const j = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200) throw new Error('AI kļūda: ' + (j.error && j.error.message || res.getResponseCode()));
    return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  }
  if (geminiKey) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + (model || 'gemini-2.5-flash') + ':generateContent?key=' + encodeURIComponent(geminiKey);
    const res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens } })
    });
    const j = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200) throw new Error('AI kļūda: ' + (j.error && j.error.message || res.getResponseCode()));
    return (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
  }
  throw new Error('AI nav iestatīts — Apps Script → Project Settings → Script properties: ANTHROPIC_API_KEY');
}

/** Claude ar piespiedu rīku → vienmēr strukturēts objekts (bez JSON parsēšanas kļūdām) */
function aiJson_(system, prompt, schema, maxTokens) {
  const props = PropertiesService.getScriptProperties();
  const claudeKey = props.getProperty('ANTHROPIC_API_KEY');
  if (claudeKey) {
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({
        model: props.getProperty('AI_MODEL') || 'claude-haiku-5-5', max_tokens: maxTokens, system: system,
        tools: [{ name: 'aizpildit_formu', description: 'Aizpilda tāmes formu ar datiem no kadastra teksta.', input_schema: schema }],
        tool_choice: { type: 'tool', name: 'aizpildit_formu' },
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const j = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200) throw new Error('AI kļūda: ' + (j.error && j.error.message || res.getResponseCode()));
    const tu = (j.content || []).find(c => c.type === 'tool_use');
    if (!tu) throw new Error('AI neatgrieza datus.');
    return tu.input || {};
  }
  return looseJson_(aiCall_(system + '\nAtbildi TIKAI ar JSON objektu pēc šīs shēmas: ' + JSON.stringify(schema), prompt, maxTokens));
}

/** Iecietīga JSON nolasīšana (``` bloki, komentāri, liekie komati) */
function looseJson_(out) {
  let t = String(out || '').replace(/```(?:json)?/gi, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('AI neatgrieza datus.');
  t = t.slice(a, b + 1).replace(/\/\/[^\n]*/g, '').replace(/,\s*([}\]])/g, '$1').replace(/\bNaN\b|\bundefined\b/g, 'null');
  try { return JSON.parse(t); } catch (e) { throw new Error('AI atbildi neizdevās nolasīt.'); }
}

function aiKadastrs_(u, text) {
  text = String(text || '').trim();
  if (text.length < 20) throw new Error('Ielīmē kadastra datus (vismaz dažas rindas).');
  if (text.length > 30000) text = text.slice(0, 30000);
  const N = { type: ['number', 'null'] };
  const schema = {
    type: 'object',
    properties: {
      nosaukums: { type: ['string', 'null'], description: 'Īsa adrese + dzīvokļu skaits, piem. "Kvēles 24 (60 dzīvokļi)"; ja dzīvokļu skaits nav zināms — tikai īsā adrese' },
      adrese: { type: ['string', 'null'], description: 'Pilna adrese bez pasta indeksa, piem. "Kvēles iela 24, Rīga"' },
      dzivokli: Object.assign({ description: 'Dzīvokļu skaits, ja norādīts' }, N),
      lietderiga: Object.assign({ description: 'Dzīvokļu m² bez ārtelpām/balkoniem: "Dzīvokļu platība"; ja tādas nav — "Dzīvokļu kopējā platība" mīnus "Dzīvokļu ārtelpu platība"' }, N),
      stavi: Object.assign({ description: 'Virszemes stāvu skaits' }, N),
      gads: Object.assign({ description: 'Uzbūvēšanas gads' }, N),
      lifti: Object.assign({ description: 'Liftu skaits, ja norādīts' }, N),
      zemes_platiba: Object.assign({ description: 'Zemes vienības platība m², ja norādīta' }, N),
      apbuves_laukums: Object.assign({ description: 'Būves apbūves laukums m², ja norādīts' }, N),
      zonas: {
        type: 'object',
        properties: {
          kapnu: Object.assign({ description: 'Kāpņu telpas, gaiteņi, vestibils m². Ja ir tikai kopējā "Koplietošanas iekštelpu platība" — liec to šeit (atņemot citas zonas, ja tās zināmas)' }, N),
          ratinu: Object.assign({ description: 'Ratiņu/velosipēdu telpa m²' }, N),
          tehniskas: Object.assign({ description: 'Tehniskās telpas, siltummezgls, elektro, apsaimniekotāja telpa m²' }, N),
          atputas: Object.assign({ description: 'Koplietošanas atpūtas telpa / sanmezgls m²' }, N),
          terase: Object.assign({ description: 'Koplietošanas terase / koplietošanas ārtelpas m² (piem. "Koplietošanas ārtelpu platība")' }, N)
        }
      },
      citas_zonas: { type: 'array', items: { type: 'object', properties: { nosaukums: { type: 'string' }, m2: { type: 'number' } }, required: ['nosaukums', 'm2'] } },
      teritorija: {
        type: 'object',
        properties: {
          cieti: Object.assign({ description: 'Cietie segumi m² (ja zināma zeme: (zeme − apbūve) × 40%, ja sadalījums nav dots)' }, N),
          zale: Object.assign({ description: 'Zālāji, apstādījumi m² (ja zināma zeme: (zeme − apbūve) × 60%, ja sadalījums nav dots)' }, N)
        }
      },
      garaza: Object.assign({ description: 'Pazemes autostāvvieta / garāža m², ja ir' }, N),
      piezimes: { type: 'string', description: 'Īsi latviski: no kurām rindām ņemti skaitļi, kas ir aplēse, kas trūkst (piem. zemes platība)' }
    },
    required: ['piezimes']
  };
  const system = [
    'Tu no Latvijas Kadastra (kadastrs.lv / VZD) izkopēta teksta aizpildi uzkopšanas tāmes formu, izsaucot rīku aizpildit_formu.',
    'Ņem tikai skaitļus, kas tekstā tiešām ir (decimāldaļa ar punktu). Ko nevar noteikt — null. Neizdomā zemes platību, liftus vai dzīvokļu skaitu.',
    'Dzīvokļu īpašumu nodalījumi (pagrabi, noliktavas), kas pieder dzīvokļiem, NAV koplietošanas zonas.',
    'Koplietošanas palīgtelpu platība = koplietošanas iekštelpas + koplietošanas ārtelpas; neskaiti to divreiz.'
  ].join('\n');
  const j = aiJson_(system, text, schema, 1500);
  log_(u.name, 'AI kadastrs', '', String(j.adrese || ''));
  return j;
}


/* AI: telpu nosaukumi no kadastra → kategorijas */
function aiTelpas_(u, nosaukumi) {
  const names = (nosaukumi || []).map(String).filter(Boolean).slice(0, 200);
  if (!names.length) return [];
  const cats = ['kapnu', 'ratinu', 'lifts', 'tehniskas', 'atputas', 'saimniecibas', 'arpus', 'garaza', 'atkritumi', 'cits'];
  const schema = { type: 'object', properties: { telpas: { type: 'array', items: { type: 'object', properties: {
    nosaukums: { type: 'string' }, kategorija: { type: 'string', enum: cats } }, required: ['nosaukums', 'kategorija'] } } }, required: ['telpas'] };
  const system = ['Klasificē daudzdzīvokļu mājas koplietošanas telpu nosaukumus no Latvijas kadastra uzkopšanas tāmei. Izsauc rīku aizpildit_formu.',
    'kapnu = kāpņu telpas, gaiteņi, koridori, vestibili, tambūri, priekštelpas, halles, ieejas; ratinu = ratiņu/velosipēdu telpas;',
    'lifts = lifta šahtas un lifti (telpa "Lifts"); tehniskas = lifta mašīntelpa/lifta telpa, siltummezgls, elektro, ūdens, sūkņi, ventilācija, katlu, skaitītāji, apsaimniekotāja telpa;',
    'atputas = atpūtas telpas, sanmezgli, WC, dušas; saimniecibas = saimniecības telpas, pagrabi, noliktavas, bēniņi, žāvētavas, veļas telpas;',
    'arpus = balkoni, lodžijas, terases, ārtelpas; garaza = garāžas, autostāvvietas; atkritumi = atkritumu telpas/šahtas; cits = viss pārējais.'].join('\n');
  const j = aiJson_(system, names.join('\n'), schema, 1200);
  return (j.telpas || []).filter(x => cats.indexOf(x.kategorija) >= 0);
}


/** Ja kāds labo tabulu ar roku — notīra kešu */
function onEdit() { try { CacheService.getScriptCache().removeAll(['meta', 'users', 'settings']); } catch (e) {} }


/* ---------------- Iestatījumi ---------------- */
const SETTINGS_DEFAULT = [
  ['Vadības e-pasti', 'kaspars@selectumhome.lv', 'Kam sūtīt iesniegto budžetu PDF (vairākus atdalīt ar komatu)'],
  ['Sūtīt paziņojumus', 'jā', 'Autoram e-pasts, kad budžets apstiprināts / noraidīts (autora e-pasts — lapā «Lietotāji»)'],
  ['Sūtītāja vārds', 'SH | Budžets', 'Vārds, kas redzams e-pasta sūtītāja laukā']
];
function ensureSettings_() {
  const ss = SS_();
  let sh = ss.getSheetByName(SHEETS.SET);
  if (!sh) {
    sh = ss.insertSheet(SHEETS.SET);
    sh.getRange(1, 1, 1, 3).setValues([['Iestatījums', 'Vērtība', 'Paskaidrojums']]).setFontWeight('bold').setBackground('#0f6b5c').setFontColor('#ffffff');
    sh.getRange(2, 1, SETTINGS_DEFAULT.length, 3).setValues(SETTINGS_DEFAULT);
    sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 320); sh.setColumnWidth(3, 460); sh.setFrozenRows(1);
  }
  return sh;
}
function settings_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('settings');
  if (hit) return JSON.parse(hit);
  const o = {}; SETTINGS_DEFAULT.forEach(r => o[r[0]] = r[1]);
  ensureSettings_().getDataRange().getValues().slice(1).forEach(r => { if (r[0]) o[String(r[0]).trim()] = String(r[1]).trim(); });
  cache.put('settings', JSON.stringify(o), 60);
  return o;
}
function settingList_(k) { return String(settings_()[k] || '').split(/[,;\s]+/).map(x => x.trim()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)); }
function settingOn_(k) { return norm_(settings_()[k]) !== 'nē'; }
function publicSettings_() { return { vadibasEpasti: settingList_('Vadības e-pasti') }; }

/* ---------------- E-pasts ---------------- */
function mailWrap_(inner) {
  return `<div style="font-family:Manrope,-apple-system,'Segoe UI',Arial,Helvetica,sans-serif;font-size:14px;color:#17201c;max-width:560px">
    <div style="background:#e2ddf2;padding:14px 18px;border-radius:14px 14px 0 0;font-weight:800;font-size:16px;letter-spacing:-.02em">SELECTUM HOME <span style="font-weight:600;color:#4a534f">· Budžets</span></div>
    <div style="background:#ffffff;border:1px solid #dfe5e2;border-top:0;padding:18px;border-radius:0 0 14px 14px">${inner}
    <p style="margin-top:18px"><a href="${APP_URL}" style="background:#17201c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:700">Atvērt SH | Budžets</a></p></div>
    <p style="color:#6d7672;font-size:11px;margin-top:10px">SELECTUM HOME · vaitkevix.cloud/sh · ${copy_()}</p></div>`;
}
function mailNotice_(to, subject, inner, attachments) {
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: mailWrap_(inner), name: settings_()['Sūtītāja vārds'] || APP_NAME, attachments: attachments || [] });
}
/** Budžeta e-pasts ar PDF pielikumu */
function mailBudget_(u, meta, d, c, to, kind, note, attach) {
  to = (to || []).filter(Boolean);
  if (!to.length) throw new Error('Nav e-pasta adreses (lapa «Iestatījumi» → Vadības e-pasti).');
  const o = (d && d.objekts) || {};
  const nos = o.nosaukums || o.adrese || meta.id || 'Budžets';
  const atts = [];
  if (attach) atts.push(Utilities.newBlob(pdfHtml_(d, c, meta), 'text/html', 'tame.html').getAs('application/pdf').setName(fileName_(d, meta) + '.pdf'));
  const inner = `<p>${kind === 'iesniegts' ? `<b>${esc_(u.name)}</b> iesniedza budžetu izskatīšanai.` : `<b>${esc_(u.name)}</b> nosūtīja budžetu.`}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;color:#6d7672">Objekts</td><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;text-align:right"><b>${esc_(nos)}</b></td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;color:#6d7672">Adrese</td><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;text-align:right">${esc_(o.adrese || '—')}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;color:#6d7672">Budžets</td><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;text-align:right">${esc_(meta.id || '')}${meta.versija ? ' · v' + meta.versija : ''}</td></tr>
      <tr><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;color:#6d7672">Cena mēnesī bez PVN</td><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;text-align:right;font-size:18px"><b>${eur_(c.bezPVN)}</b></td></tr>
      ${c.perM2bez != null ? `<tr><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;color:#6d7672">€ / dzīvokļu m²</td><td style="padding:6px 0;border-bottom:1px solid #dfe5e2;text-align:right">€${num_(c.perM2bez, 4)}</td></tr>` : ''}
    </table>${note ? `<p style="background:#f3f5f4;padding:10px 12px;border-radius:12px">Piezīme: ${esc_(note)}</p>` : ''}
    ${attach ? '<p style="color:#6d7672">Tāme ar pielikumiem — PDF failā.</p>' : ''}`;
  mailNotice_(to.join(','), (kind === 'iesniegts' ? 'Iesniegts budžets: ' : 'Budžets: ') + nos + ' — ' + eur_(c.bezPVN) + '/mēn. bez PVN', inner, atts);
  log_(u.name, 'E-pasts', meta.id || '', to.join(', '));
  return to;
}
function sendPdfMail_(u, r) {
  const to = String(r.to || '').split(/[,;\s]+/).map(x => x.trim()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).slice(0, 10);
  if (r.id) { const f = findRow_(r.id); if (f && !canSee_(u, rowToMeta_(f.row))) throw new Error('Nav piekļuves.'); }
  return mailBudget_(u, r.meta || {}, r.data || {}, r.calc || {}, to, 'sutits', r.piezime || '', true);
}
/** Palaid vienreiz no redaktora, lai atļautu e-pasta sūtīšanu */
function atlaut_epastu() {
  Logger.log('Atlikušais e-pastu limits šodien: ' + MailApp.getRemainingDailyQuota());
  ensureSettings_(); ensureTpl_();
  const u = sh_(SHEETS.USERS);
  if (!u.getRange(1, 5).getValue()) u.getRange(1, 5).setValue('E-pasts').setFontWeight('bold').setBackground('#0f6b5c').setFontColor('#ffffff');
  u.setColumnWidth(5, 240);
  CacheService.getScriptCache().removeAll(['meta', 'users', 'settings']);
}

/* ---------------- Veidnes ---------------- */
function ensureTpl_() {
  const ss = SS_();
  let sh = ss.getSheetByName(SHEETS.TPL);
  if (!sh) { sh = ss.insertSheet(SHEETS.TPL); sh.getRange(1, 1, 1, TPL_HEAD.length).setValues([TPL_HEAD]).setFontWeight('bold').setBackground('#0f6b5c').setFontColor('#ffffff'); sh.setFrozenRows(1); }
  return sh;
}
function tplList_() {
  const v = ensureTpl_().getDataRange().getValues(); v.shift();
  return v.filter(r => r[0]).map(r => ({ id: r[0], nosaukums: r[1], apraksts: r[2], autors: r[3], izveidots: String(r[4]) }));
}
function tplGet_(id) {
  const v = ensureTpl_().getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) return { id: v[i][0], nosaukums: v[i][1], data: JSON.parse(v[i][5] || '{}') };
  throw new Error('Veidne nav atrasta.');
}
function tplSave_(u, r) {
  if (!isMaker_(u)) throw new Error('Veidnes veido budžetu gatavotājs.');
  const nos = String(r.nosaukums || '').trim(); if (!nos) throw new Error('Ievadi veidnes nosaukumu.');
  const sh = ensureTpl_(), id = 'V-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss');
  sh.appendRow([id, nos, String(r.apraksts || ''), u.name, now_(), JSON.stringify(r.data || {})]);
  log_(u.name, 'Veidne', id, nos);
  return { id: id, nosaukums: nos };
}
function tplDel_(u, id) {
  const sh = ensureTpl_(), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === String(id)) {
    if (u.role !== 'admin' && norm_(v[i][3]) !== norm_(u.name)) throw new Error('Dzēst var tikai savu veidni (vai admins).');
    sh.deleteRow(i + 1); log_(u.name, 'Dzēsa veidni', id, v[i][1]); return true;
  }
  return false;
}

/* Ēku sērijas (jāsakrīt ar index.html SERIJAS) */
const SERIJAS = { pirmskara: 'Pirmskara ēka', koka: 'Koka māja', stalina: 'Staļina laika ēka', '316': '316. sērija', '318': '318. sērija', '464': '464. sērija',
  lt_vecais: 'Lietuviešu vecais projekts', lt_jaunais: 'Lietuviešu jaunais projekts', lt: 'Lietuviešu projekts', '103': '103. sērija', '467': '467. sērija', '602': '602. sērija',
  '602u': '602. uzlabotā sērija', '119': '119. sērija', '104': '104. sērija', mazgim: 'Mazģimeņu projekts', cehu: 'Čehu projekts', franc: 'Franču projekts',
  brezn: 'Brežņeva laika projekts', spec: 'Specprojekts', jauns: 'Jaunais projekts', cits: 'Cits' };
function serijaName_(k) { return k ? (SERIJAS[k] || String(k)) : '—'; }

/* ===== Vienotais PIN no SH portāla (pilnvaras mainās portālā vaitkevix.cloud/sh). © VAITKEVIX, SIA ===== */
const PORTAL_URL_ = 'https://aizvietosana-api.vaitkevix.workers.dev/portal';
/** { known:false } — PIN portālā nav; { known:true, name, role } — role '' nozīmē: nav piekļuves */
function centralUser_(pin, app) {
  pin = String(pin || '').trim(); if (!pin) return { known: false };
  const key = 'cu_' + app + '_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'sh|' + pin)).slice(0, 30);
  const cache = CacheService.getScriptCache(), c = cache.get(key);
  if (c) return JSON.parse(c);
  try {
    const r = UrlFetchApp.fetch(PORTAL_URL_, { method: 'post', contentType: 'text/plain', payload: JSON.stringify({ action: 'check', pin: pin, app: app }), muteHttpExceptions: true });
    const j = JSON.parse(r.getContentText());
    if (!j.ok) return { known: false };
    const out = j.known ? { known: true, name: j.name, role: j.role || '' } : { known: false };
    cache.put(key, JSON.stringify(out), 300);
    return out;
  } catch (e) { return { known: false }; }
}
/** Palaid vienreiz no redaktora, lai atļautu savienojumu ar portālu */
function parbauditPortalu() { return centralUser_('0', 'test'); }


// ================================================================
//  VIENA TABULA «SH | Dati» — visas lietotnes, lapas pa sfērām. © VAITKEVIX, SIA
//  Script property DATA_SS = galvenās tabulas ID. Ja nav — strādā ar savu tabulu (kā agrāk).
// ================================================================
const DATA_TARGET_ = '1mEKmDB9H1R9Vnp6if_CCq0_EtHE9gCuCZATScNd4B8w';
const DATA_MAP_ = { 'Budžeti': 'Budžets · Budžeti', 'Versijas': 'Budžets · Versijas', 'Žurnāls': 'Budžets · Žurnāls', 'Veidnes': 'Budžets · Veidnes', 'Iestatījumi': '⚙ Budžets Iestatījumi', 'Lietotāji': '⚙ Budžets Lietotāji' };
function SS_() {
  if (SS_.c) return SS_.c;
  const act = SpreadsheetApp.getActiveSpreadsheet();
  const id = PropertiesService.getScriptProperties().getProperty('DATA_SS');
  if (!id) return (SS_.c = act);
  const real = act && act.getId() === id ? act : SpreadsheetApp.openById(id);
  const nm = (n) => (typeof n === 'string' && DATA_MAP_[n]) ? DATA_MAP_[n] : n;
  SS_.c = new Proxy(real, { get: (t, p) => {
    if (p === 'getSheetByName') return (n) => t.getSheetByName(nm(n));
    if (p === 'insertSheet') return (n, a, b) => { const sh = b !== undefined ? t.insertSheet(nm(n), a, b) : a !== undefined ? t.insertSheet(nm(n), a) : t.insertSheet(nm(n)); if (/^⚙/.test(nm(n))) sh.hideSheet(); return sh; };
    const v = t[p]; return typeof v === 'function' ? (...a) => t[p](...a) : v;
  } });
  return SS_.c;
}
/** Palaid vienreiz no redaktora: pārceļ šīs lietotnes lapas uz «SH | Dati» un pārslēdz lietotni. Veco tabulu neaiztiek. */
function parceltUzVienuTabulu() {
  const lock = LockService.getScriptLock(); lock.waitLock(60000);
  try {
    const src = SpreadsheetApp.getActiveSpreadsheet(), log = [];
    const same = src.getId() === DATA_TARGET_, dst = same ? src : SpreadsheetApp.openById(DATA_TARGET_);
    src.getSheets().forEach(sh => {
      const n = sh.getName(), to = DATA_MAP_[n];
      if (!to) { log.push('paliek: ' + n); return; }
      if (to === n) { log.push('jau: ' + n); return; }
      if (dst.getSheetByName(to)) { log.push('jau ir: ' + to); return; }
      const c = same ? sh.setName(to) : sh.copyTo(dst).setName(to);
      if (/^⚙/.test(to)) c.hideSheet();
      log.push(n + ' → ' + to + ' (' + sh.getLastRow() + ' rindas)');
    });
    if (same && dst.getName() !== 'SH | Dati') dst.rename('SH | Dati');
    PropertiesService.getScriptProperties().setProperty('DATA_SS', DATA_TARGET_);
    SpreadsheetApp.flush();
    console.log(log.join('\n'));
    return log;
  } finally { lock.releaseLock(); }
}
/** Ja vajag atgriezt: lietotne atkal strādās ar savu veco tabulu */
function atgrieztVecoTabulu() { PropertiesService.getScriptProperties().deleteProperty('DATA_SS'); }

/** Inventārs: lapas, izmēri, formulas ar atsaucēm uz citām lapām (pārcelšanai uz vienu tabulu). © VAITKEVIX, SIA */
function lapuInventars() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = ss.getSheets().map(sh => {
    const r = sh.getLastRow(), c = sh.getLastColumn();
    let f = 0, x = 0, ext = 0;
    if (r && c) sh.getRange(1, 1, Math.min(r, 3000), c).getFormulas().forEach(row => row.forEach(v => { if (v) { f++; if (/!/.test(v)) x++; if (/IMPORTRANGE/i.test(v)) ext++; } }));
    return [sh.getName(), r, c, f, x, ext, sh.isSheetHidden() ? 'slēpta' : ''].join(' | ');
  });
  console.log(ss.getName() + ' (' + ss.getId() + ')\n' + out.join('\n'));
  return out;
}
