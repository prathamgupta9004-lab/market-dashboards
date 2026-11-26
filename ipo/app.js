(function () {
'use strict';
var PK = window.PK = window.PK || {};
var HASKIT = !!PK.table;
function esc(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function num(v) { return typeof v === 'number' && isFinite(v); }
function $(id) { return document.getElementById(id); }
/* ---- kit fallbacks: the page still renders if kit files fail */
PK.haptic = PK.haptic || function () {};
PK.press = PK.press || function () {};
PK.badges = PK.badges || function () { return ''; };
PK.capOK = PK.capOK || function () { return true; };
PK.capIsDefault = PK.capIsDefault || function () { return true; };
PK.capSummary = PK.capSummary || function () { return 'All'; };
PK.capSet = PK.capSet || function () {};
PK.countUp = PK.countUp || function (el, v, o) { el.textContent = (o && o.fmt) ? o.fmt(v) : v; };
PK.spark = PK.spark || function () { return ''; };
PK.tip = PK.tip || { show: function () {}, hide: function () {} };
PK.svgBars = PK.svgBars || function (el, items, o) {
  o = o || {}; var mx = Math.max.apply(null, items.map(function (i) { return Math.abs(+i.value || 0); }).concat([1]));
  el.innerHTML = '<div class="bars">' + items.map(function (it) { var v = +it.value || 0;
    return '<div class="hb"><span class="mut">' + esc(it.label) + '</span><div class="t"><div class="f' + (v < 0 ? ' neg' : '') + '" style="width:' + (Math.abs(v) / mx * 100) + '%"></div></div><b>' + esc(o.fmt ? o.fmt(v, it) : v) + '</b></div>'; }).join('') + '</div>';
  return { update: function (n) { PK.svgBars(el, n, o); } };
};
PK.table = PK.table || function (el, cfg) {
  var st = { rows: cfg.rows || [] };
  function paint() {
    var v = st.rows.filter(function (r) { return !cfg.capKey || PK.capOK(r[cfg.capKey]); });
    el.innerHTML = '<div class="scroll"><table class="mini"><thead><tr>' + cfg.columns.map(function (c) { return '<th>' + (c.label || c.key) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      v.slice(0, 150).map(function (r) { return '<tr>' + cfg.columns.map(function (c) { var x = r[c.key]; return '<td>' + (c.fmt ? c.fmt(x, r) : esc(x == null ? '–' : x)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  paint(); return { update: function (r) { st.rows = r; paint(); } };
};
PK.tabs = PK.tabs || function (el, o) {
  var btns = [].slice.call(el.querySelectorAll('[data-tab]'));
  function set(n) { btns.forEach(function (b) { b.classList.toggle('on', b.dataset.tab === n); });
    [].forEach.call(document.querySelectorAll('[data-panel]'), function (p) { p.hidden = p.dataset.panel !== n; }); if (o.onChange) o.onChange(n); }
  el.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) set(b.dataset.tab); });
  set(((/tab=(\w+)/.exec(location.hash) || [])[1]) || btns[0].dataset.tab); return { set: set };
};

/* ---- formatting */
var fN = function (v, d) { return num(v) ? v.toLocaleString('en-IN', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }) : '–'; };
var pct = function (v, d) { return num(v) ? (v > 0 ? '+' : '') + v.toFixed(d == null ? 1 : d) + '%' : '–'; };
var pp = function (v) { return num(v) ? (v > 0 ? '+' : '') + v.toFixed(1) + ' pp' : '–'; };
var cls = function (v) { return num(v) ? (v > 0 ? 'up' : v < 0 ? 'dn' : '') : ''; };
var X = function (v) { return num(v) ? (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + '×' : '–'; };
var CR = function (v) { return num(v) ? '₹' + fN(v, v < 100 ? 1 : 0) + ' Cr' : '–'; };
var RS = function (v) { return num(v) ? '₹' + fN(v, v % 1 ? 2 : 0) : '–'; };
var D = function (s) { if (!s) return '–'; var d = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
var Ds = function (s) { if (!s) return '–'; var d = new Date(String(s).slice(0, 10) + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
var COL = { qib: '#2FE3B5', bnii: '#5AA9F0', snii: '#A78BFA', nii: '#5AA9F0', rii: '#E0A64A', emp: '#8A9690', sha: '#3E6B5E', tot: '#EEF5F2' };
var CATN = { qib: 'QIB', nii: 'NII (all)', bnii: 'Big NII (>₹10L)', snii: 'Small NII (₹2–10L)', rii: 'Retail', emp: 'Employee', sha: 'Shareholder', tot: 'Total' };
function chips(id, fn) {
  var el = $(id); if (!el) return;
  el.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; PK.haptic('select');
    if (el.dataset.multi) b.classList.toggle('on'); else [].forEach.call(el.children, function (x) { x.classList.toggle('on', x === b); });
    fn(b.dataset.v, b); });
}
function onv(id) { var b = $(id).querySelector('.chip.on'); return b && b.dataset.v; }
function ons(id) { return [].map.call($(id).querySelectorAll('.chip.on'), function (b) { return b.dataset.v; }); }
function nameCell(r) { return '<span class="sym"><b>' + esc(r.s) + '</b>' + PK.badges(r.s, { max: 2 }) + '<span class="nm2">' + esc(r.n || '') + '</span></span>'; }
function capNote(n) { return PK.capIsDefault() ? '' : '<div class="filt">Filtered to ' + esc(PK.capSummary()) + (num(n) ? ' · ' + n + ' hidden' : '') + ' · <a data-capreset>reset</a></div>'; }
document.addEventListener('click', function (e) { if (e.target.closest('[data-capreset]')) PK.capSet(null); });
function unavailable(el, msg) { el.innerHTML = '<div class="unavail">' + esc(msg) + '</div>'; }

var I = window.IPO;
if (!I) { $('asof').textContent = 'Data file missing. Run IPOCentre/run.bat.'; return; }
var SEG = 'EQ';
try { SEG = localStorage.getItem('ipo_seg') === 'SME' ? 'SME' : 'EQ'; } catch (e) {}
[].forEach.call($('seg').children, function (b) { b.classList.toggle('on', b.dataset.v === SEG); });
var segName = function () { return SEG === 'SME' ? 'SME' : 'mainboard'; };
var st = (I.status && I.status.fetch) || {};
$('asof').innerHTML = 'Prices as of <b>' + D(I.asof) + '</b> close · issue data fetched ' + esc(st.date ? D(st.date) : '–') + ' · built ' + esc(I.built) + ' IST' +
  (/FAILED/.test(JSON.stringify(st)) ? ' · <span class="am">some NSE sources unavailable on the last run, showing the last good copy</span>' : '');
[].forEach.call(document.querySelectorAll('.asofx'), function (e) { e.textContent = 'as of ' + D(I.asof); });

/* ---- hist (lazy) */
var histP = null;
function loadHist() {
  if (histP) return histP;
  histP = new Promise(function (res) {
    if (window.IPO_HIST) return res(window.IPO_HIST);
    var s = document.createElement('script'); s.src = 'hist.js?v=' + encodeURIComponent(I.built || '');
    s.onload = function () { res(window.IPO_HIST); }; s.onerror = function () { res(null); }; document.head.appendChild(s);
  });
  return histP;
}

/* ================================================================ KPIs */
function kpis() {
  var lv = I.live.filter(function (l) { return l.seg === SEG; });
  var open = lv.filter(function (l) { return l.st === 'Active'; }), up = lv.filter(function (l) { return l.st !== 'Active'; });
  var s = (I.score[SEG] || {})['12m'] || {};
  var nx = I.unlocks.filter(function (u) { return u.seg === SEG && u.d >= I.asof && daysTo(u.d) <= 30; });
  var hot = open.slice().sort(function (a, b) { return (b.sub.tot || 0) - (a.sub.tot || 0); })[0];
  var K = [
    { l: 'Open now · ' + segName(), v: open.length, f: function (x) { return Math.round(x); }, s: hot ? hot.s + ' ' + X(hot.sub.tot) + ' subscribed' : up.length + ' upcoming' },
    { l: 'Listed in 12 months', v: s.n, f: function (x) { return Math.round(x); }, s: (s.np || 0) + ' with a listing price' },
    { l: 'Opened above issue price', v: s.pp, f: function (x) { return Math.round(x) + '%'; }, c: s.pp >= 50 ? 'up' : 'dn', s: 'listing-day open, last 12 months' },
    { l: 'Average listing gain', v: s.avg, f: function (x) { return pct(x); }, c: cls(s.avg), s: 'median ' + pct(s.med) },
    { l: 'Anchor unlocks · 30 days', v: nx.length, f: function (x) { return Math.round(x); }, s: nx.length ? 'next: ' + nx[0].s + ' on ' + Ds(nx[0].d) : 'none due' }
  ];
  $('kpis').innerHTML = K.map(function (k, i) { return '<div class="pk" style="animation-delay:' + i * 45 + 'ms"><div class="l">' + esc(k.l) + '</div><div class="v ' + (k.c || '') + '" data-i="' + i + '">–</div><div class="s">' + esc(k.s || '') + '</div></div>'; }).join('');
  K.forEach(function (k, i) { var el = $('kpis').querySelector('[data-i="' + i + '"]'); if (num(k.v)) { el.textContent = k.f(k.v); PK.countUp(el, k.v, { fmt: k.f }); } });
}
function daysTo(d) { return Math.round((new Date(d + 'T00:00:00') - new Date(I.asof + 'T00:00:00')) / 864e5); }

/* ================================================================ LIVE */
var liveCharts = [];
function renderLive() {
  liveCharts.forEach(function (c) { try { c.remove(); } catch (e) {} }); liveCharts = [];
  var lv = I.live.filter(function (l) { return l.seg === SEG; });
  var open = lv.filter(function (l) { return l.st === 'Active'; });
  var v = $('live-verdict');
  if (!lv.length) v.innerHTML = 'No ' + segName() + ' IPO is open or announced on NSE right now.';
  else {
    var top = open.slice().sort(function (a, b) { return (b.sub.tot || 0) - (a.sub.tot || 0); })[0];
    v.innerHTML = '<b>' + open.length + '</b> ' + segName() + ' IPO' + (open.length === 1 ? ' is' : 's are') + ' open and <b>' + (lv.length - open.length) + '</b> upcoming' +
      (top && num(top.sub.tot) ? '; ' + esc(top.n) + ' leads at <b>' + X(top.sub.tot) + '</b> subscribed' + leadCat(top) + '.' : '.');
  }
  var el = $('live-cards');
  if (!lv.length) { el.innerHTML = '<div class="unavail">Nothing live in this segment. Switch segment above, or see what just listed below.</div>'; }
  else el.innerHTML = lv.map(function (l, i) { return liveCard(l, i); }).join('');
  lv.forEach(function (l, i) {
    var b = $('lb-' + i); if (b) {
      var cats = ['qib', 'bnii', 'snii', 'rii', 'emp', 'sha', 'tot'].filter(function (k) { return num(l.sub[k]); });
      if (!cats.length && !num(l.sub.nii)) { b.innerHTML = '<div class="unavail">' + (l.st === 'Active' ? 'Category-wise bids not published yet.' : 'Bidding has not started.') + '</div>'; }
      else {
        if (!num(l.sub.bnii) && num(l.sub.nii)) cats.splice(1, 0, 'nii');
        PK.svgBars(b, cats.map(function (k) { return { label: CATN[k], value: l.sub[k], tip: CATN[k] + ': ' + X(l.sub[k]) + ' subscribed' }; }), { fmt: function (x) { return X(x); }, labelW: 120 });
      }
    }
    var c = $('lc-' + i); if (c) liveChart(c, l);
  });
  // just closed (last 30 days)
  var cut = new Date(new Date(I.asof + 'T00:00:00') - 30 * 864e5).toISOString().slice(0, 10);
  var rec = I.listings.filter(function (r) { return r.seg === SEG && r.ld >= cut; });
  var hot = rec.filter(function (r) { return num(r.sub); }).sort(function (a, b) { return b.sub - a.sub; })[0];
  $('closed-verdict').innerHTML = rec.length ? rec.length + ' ' + segName() + ' IPOs listed in the last 30 days' + (hot ? '; the most bid was ' + esc(hot.n) + ' at ' + X(hot.sub) : '') + '.' : 'No ' + segName() + ' listings in the last 30 days.';
  closedT = mkTable($('closed-table'), closedT, rec, [
    { key: 's', label: 'Stock', align: 'l', fmt: function (v, r) { return nameCell(r); } },
    { key: 'ld', label: 'Listed', fmt: function (v) { return Ds(v); } },
    { key: 'sub', label: 'Total ×', num: true, fmt: X }, { key: 'qib', label: 'QIB ×', num: true, fmt: X },
    { key: 'nii', label: 'NII ×', num: true, fmt: X }, { key: 'rii', label: 'Retail ×', num: true, fmt: X },
    { key: 'lg', label: 'List open', num: true, fmt: function (v) { return '<span class="' + cls(v) + '">' + pct(v) + '</span>'; } },
    { key: 'ret', label: 'Return', num: true, fmt: function (v) { return '<span class="' + cls(v) + '">' + pct(v) + '</span>'; } }
  ], { sortKey: 'ld', csvName: 'ipo_just_closed', search: false });
}
var closedT = null;
function leadCat(l) {
  var best = null; ['qib', 'bnii', 'snii', 'nii', 'rii', 'emp'].forEach(function (k) { if (num(l.sub[k]) && (!best || l.sub[k] > l.sub[best])) best = k; });
  return best ? ' (' + CATN[best] + ' strongest at ' + X(l.sub[best]) + ')' : '';
}
function liveCard(l, i) {
  var tag = l.st === 'Active' ? (l.cd === I.asof || daysTo(l.cd) <= 0 ? '<span class="tag open">Closes today</span>' : '<span class="tag open">Open · closes ' + Ds(l.cd) + '</span>') : '<span class="tag soon">Opens ' + Ds(l.od) + '</span>';
  var minInv = num(l.lot) && num(l.hi) ? l.lot * l.hi : null;
  var size = (num(l.fresh) ? l.fresh : 0) + (num(l.ofs) ? l.ofs : 0);
  if (!num(l.fresh) && !num(l.ofs) && num(l.shares) && num(l.hi)) size = l.shares * l.hi / 1e7;
  var split = '';
  if (num(l.fresh) || num(l.ofs)) {
    var f = l.fresh || 0, o = l.ofs || 0, t = f + o || 1;
    split = '<div class="split" data-pk-tip><i style="width:' + (f / t * 100) + '%;background:linear-gradient(90deg,#10B981,#2FE3B5)"></i><i style="width:' + (o / t * 100) + '%;background:#E0A64A"></i></div>' +
      '<div class="legend2"><span><i style="background:#2FE3B5"></i>Fresh issue ' + CR(f) + '</span><span><i style="background:#E0A64A"></i>Offer for sale ' + CR(o) + '</span></div>';
  } else split = '<div class="dimc" style="font-size:12px">Fresh vs OFS split not published on the NSE issue page.</div>';
  var nseU = 'https://www.nseindia.com/market-data/issue-information?symbol=' + encodeURIComponent(l.s) + '&series=' + (l.seg === 'SME' ? 'SME' : 'EQ') + '&type=' + (l.st === 'Active' ? 'Active' : 'Forthcoming');
  var links = '<a href="' + esc(nseU) + '" target="_blank" rel="noopener">NSE issue page ↗</a>' +
    (l.links.rhp ? '<a href="' + esc(l.links.rhp) + '" target="_blank" rel="noopener">Red Herring Prospectus ↗</a>' : '') +
    (l.links.ratios ? '<a href="' + esc(l.links.ratios) + '" target="_blank" rel="noopener">Basis of issue price ↗</a>' : '') +
    (l.links.anchor ? '<a href="' + esc(l.links.anchor) + '" target="_blank" rel="noopener">Anchor allocation ↗</a>' : '');
  return '<div class="box hov icard2" style="animation-delay:' + i * 45 + 'ms"><div class="top"><div><div class="k">' + esc(l.s) + ' · ' + (l.seg === 'SME' ? '<span class="tag sme">SME</span>' : 'Mainboard') + '</div><h3>' + esc(l.n) + '</h3></div>' + tag + '</div>' +
    '<p class="verdict" style="margin-top:8px">' + liveVerdict(l) + '</p>' +
    '<div class="facts"><div><span>Bidding</span><b>' + Ds(l.od) + ' – ' + Ds(l.cd) + '</b></div><div><span>Price band</span><b>' + (num(l.lo) ? RS(l.lo) + (l.hi !== l.lo ? '–' + fN(l.hi) : '') : '–') + '</b></div>' +
    '<div><span>Lot · min ₹</span><b>' + fN(l.lot) + ' · ' + (minInv ? '₹' + fN(minInv) : '–') + '</b></div><div><span>Issue size</span><b>' + (size ? CR(size) : '–') + '</b></div></div>' + split +
    '<div class="k" style="margin-top:12px">Subscription by category' + (l.upd && !/^(null|none|undefined)$/i.test(String(l.upd)) ?' · ' + esc(l.upd) : '') + '</div><div id="lb-' + i + '"></div>' +
    '<div class="k" style="margin-top:12px">Day by day</div><div class="chart sm" id="lc-' + i + '"></div>' +
    '<div class="links">' + links + '</div>' +
    '<details class="how"><summary>Issue details</summary><p>' + esc(l.sizeTxt || 'Issue size text not published.') + '</p><p>Face value: ' + esc(l.fv || '–') + ' · ' + esc(l.type || '') + (l.lm ? ' · Lead managers: ' + esc(l.lm) : '') + (l.reg ? ' · Registrar: ' + esc(l.reg) : '') + '</p></details></div>';
}
function liveVerdict(l) {
  if (l.st !== 'Active') return 'Bidding opens ' + D(l.od) + '; subscription will show from the first evening.';
  if (!num(l.sub.tot)) return 'Open; NSE has not published bids yet.';
  var t = l.sub.tot;
  return (t >= 10 ? 'Heavily bid' : t >= 1 ? 'Fully subscribed' : 'Not yet fully subscribed') + ' at <b>' + X(t) + '</b> overall' + leadCat(l) + '.';
}
function liveChart(el, l) {
  var byDay = {};
  (l.hist || []).forEach(function (h) { byDay[String(h.t).slice(0, 10)] = h.c; });
  var days = Object.keys(byDay).sort();
  if (days.length < 2) { el.className = ''; el.innerHTML = '<div class="unavail">' + (days.length ? 'One snapshot so far (' + Ds(days[0]) + '). The line grows by one point each evening the issue is open.' : 'No snapshot yet. The chart starts from the first evening of bidding.') + '</div>'; return; }
  if (!PK.chart || !PK.lineSeries) { el.innerHTML = '<div class="unavail">Chart library unavailable.</div>'; return; }
  PK.chart(el, { height: 220 }).then(function (ch) {
    liveCharts.push(ch);
    var ser = [];
    ['qib', 'bnii', 'snii', 'nii', 'rii', 'emp', 'tot'].forEach(function (k) {
      var d = days.filter(function (x) { return num(byDay[x][k]); }).map(function (x) { return { time: x, value: byDay[x][k] }; });
      if (d.length < 2 || (k === 'nii' && days.some(function (x) { return num(byDay[x].bnii); }))) return;
      ser.push({ series: PK.lineSeries(ch, d, { color: COL[k], width: k === 'tot' ? 3 : 2, dashed: k === 'tot', title: CATN[k] }), label: CATN[k], color: COL[k] });
    });
    if (PK.legend) PK.legend(el, ch, ser, function (v) { return X(v); });
    ch.timeScale().fitContent();
  }).catch(function () { el.innerHTML = '<div class="unavail">Chart library unavailable.</div>'; });
}

/* ================================================================ SCORECARD */
var scT = null;
function mkTable(el, t, rows, cols, o) {
  if (t && t.update) { t.update(rows); return t; }
  var cfg = { columns: cols, rows: rows, sortKey: o.sortKey, sortDir: o.sortDir || 'desc', search: o.search !== false, pageSize: o.pageSize || 50,
    csvName: o.csvName, tvExport: true, symbolKey: 's', capKey: 's', presets: o.presets, rowClick: o.rowClick, countLabel: o.countLabel || 'IPOs' };
  return PK.table(el, cfg);
}
function renderScore() {
  var w = onv('sc-win'), s = (I.score[SEG] || {})[w] || {};
  var wl = w === '12m' ? 'the last 12 months' : 'the last 3 years';
  $('sc-verdict').innerHTML = num(s.pp) ? '<b>' + Math.round(s.pp) + '%</b> of ' + (s.np) + ' ' + segName() + ' IPOs in ' + wl + ' opened above the issue price, with an average listing gain of <b>' + pct(s.avg) + '</b>; ' + Math.round(s.above) + '% still trade above it today.' : 'Not enough priced listings in this window.';
  var T = [
    { l: 'IPOs listed', v: s.n, f: function (x) { return Math.round(x); }, s: (s.np || 0) + ' with a listing price' },
    { l: '% listing in profit', v: s.pp, f: function (x) { return Math.round(x) + '%'; }, s: 'open > issue · close > issue: ' + (num(s.ppc) ? Math.round(s.ppc) + '%' : '–') },
    { l: 'Average listing gain', v: s.avg, f: pct, c: cls(s.avg), s: 'median ' + pct(s.med) + ' · day-1 close ' + pct(s.avgc) },
    { l: 'Above issue price now', v: s.above, f: function (x) { return Math.round(x) + '%'; }, s: 'median return ' + pct(s.medret) },
    { l: 'Beat NIFTY 500 since listing', v: s.beat, f: function (x) { return Math.round(x) + '%'; }, s: 'from listing-day close' },
    { l: 'Best since issue', txt: s.best ? s.best.s : '–', s: s.best ? pct(s.best.ret) + ' · ' + s.best.n : '', c: 'up' },
    { l: 'Worst since issue', txt: s.worst ? s.worst.s : '–', s: s.worst ? pct(s.worst.ret) + ' · ' + s.worst.n : '', c: 'dn' },
    { l: 'Best / worst listing day', txt: (s.bestlg || '–') + ' / ' + (s.worstlg || '–'), s: 'by opening gain' }
  ];
  $('sc-stats').innerHTML = T.map(function (k, i) { return '<div class="pk" style="animation-delay:' + i * 45 + 'ms"><div class="l">' + esc(k.l) + '</div><div class="v ' + (k.c || '') + '" data-i="' + i + '">' + esc(k.txt || '–') + '</div><div class="s">' + esc(k.s || '') + '</div></div>'; }).join('');
  T.forEach(function (k, i) { if (num(k.v)) { var e2 = $('sc-stats').querySelector('[data-i="' + i + '"]'); e2.textContent = k.f(k.v); PK.countUp(e2, k.v, { fmt: k.f }); } });
  // monthly bars
  var mo = (I.monthly[SEG] || []).slice(w === '12m' ? -12 : -37);
  var good = mo.filter(function (m) { return m[2] > 0; }).length;
  $('mo-verdict').textContent = mo.length ? good + ' of the last ' + mo.length + ' months had a positive average listing gain' + (mo.length ? '; latest ' + mo[mo.length - 1][0] + ': ' + pct(mo[mo.length - 1][2]) + '.' : '.') : 'No data.';
  PK.svgBars($('mo-bars'), mo.map(function (m) { return { label: m[0].slice(2).replace('-', '/'), value: m[2], tip: m[0] + ': ' + m[1] + ' listings · avg ' + pct(m[2]) + ' · ' + m[3] + '% opened above issue' }; }), { vertical: true, height: 220, fmt: function (v) { return pct(v, 0); }, values: mo.length <= 14 });
  // distribution
  var lim = new Date(new Date(I.asof + 'T00:00:00') - (w === '12m' ? 365 : 1096) * 864e5).toISOString().slice(0, 10);
  var rows = I.listings.filter(function (r) { return r.seg === SEG && r.ld >= lim; });
  var B = [['< −20%', -1e9, -20], ['−20 to −10%', -20, -10], ['−10 to 0%', -10, 0], ['0 to 10%', 0, 10], ['10 to 25%', 10, 25], ['25 to 50%', 25, 50], ['50 to 100%', 50, 100], ['> 100%', 100, 1e9]];
  var lg = rows.filter(function (r) { return num(r.lg); });
  var cnt = B.map(function (b) { return lg.filter(function (r) { return r.lg >= b[1] && r.lg < b[2]; }).length; });
  var mx = cnt.indexOf(Math.max.apply(null, cnt));
  $('dist-verdict').textContent = lg.length ? 'The most common outcome was a ' + B[mx][0] + ' open (' + cnt[mx] + ' of ' + lg.length + ' IPOs).' : 'No data.';
  PK.svgBars($('dist-bars'), B.map(function (b, i) { return { label: b[0], value: cnt[i], color: b[2] <= 0 ? '#FF5C6C' : undefined, tip: b[0] + ': ' + cnt[i] + ' IPOs' }; }), { fmt: function (v) { return v; }, labelW: 96 });
  // table
  var vis = rows.filter(function (r) { return PK.capOK(r.s); });
  $('tb-verdict').innerHTML = vis.length + ' ' + segName() + ' listings in ' + wl + '; ' + vis.filter(function (r) { return r.ret > 0; }).length + ' trade above the issue price.' + (function () { var m = vis.filter(function (r) { return !num(r.sub) && !num(r.size); }).length; return m ? ' <span class="dimc">Issue size and subscription for ' + m + ' older listings: updating nightly.</span>' : ''; })() + capNote(rows.length - vis.length);
  scT = mkTable($('sc-table'), scT, rows, [
    { key: 's', label: 'Stock', align: 'l', fmt: function (v, r) { return nameCell(r); }, csvVal: function (r) { return r.s; } },
    { key: 'ld', label: 'Listed', fmt: function (v) { return D(v); } },
    { key: 'ip', label: 'Issue ₹', num: true, fmt: function (v) { return fN(v, v % 1 ? 2 : 0); } },
    { key: 'size', label: 'Size ₹Cr', num: true, fmt: function (v) { return num(v) ? fN(v, v < 100 ? 1 : 0) : '–'; } },
    { key: 'sub', label: 'Sub ×', num: true, fmt: X },
    { key: 'lo', label: 'List open', num: true, fmt: function (v, r) { return num(v) ? fN(v, 2) + '<span class="sub ' + cls(r.lg) + '">' + pct(r.lg) + '</span>' : '–'; }, sortVal: function (r) { return r.lg; } },
    { key: 'lc', label: 'Day-1 close', num: true, fmt: function (v, r) { return num(v) ? fN(v, 2) + '<span class="sub ' + cls(r.lcg) + '">' + pct(r.lcg) + '</span>' : '–'; }, sortVal: function (r) { return r.lcg; } },
    { key: 'cp', label: 'Now ₹', num: true, fmt: function (v, r) { return num(v) ? fN(v, 2) + (r.stale ? '<span class="sub dimc">stale</span>' : '') : '–'; } },
    { key: 'ret', label: 'Return', num: true, fmt: function (v) { return '<span class="' + cls(v) + '">' + pct(v) + '</span>'; }, cls: function (v) { return cls(v); } },
    { key: 'xs', label: 'vs NIFTY 500', num: true, fmt: function (v) { return '<span class="' + cls(v) + '">' + pp(v) + '</span>'; } }
  ], { sortKey: 'ld', csvName: 'ipo_scorecard', rowClick: openStock,
    presets: [{ label: 'Opened in profit', filter: function (r) { return r.lg > 0; } }, { label: 'Below issue now', filter: function (r) { return r.ret < 0; } },
      { label: 'Beating NIFTY 500', filter: function (r) { return r.xs > 0; } }, { label: 'Sub > 50×', filter: function (r) { return r.sub > 50; } }] });
}

/* ---- stock drill-down modal */
var mChart = null;
function openStock(r) {
  PK.haptic('tap');
  $('modal').hidden = false; $('m-k').textContent = r.s + ' · listed ' + D(r.ld); $('m-t').textContent = r.n;
  $('m-v').innerHTML = num(r.ret) ? 'Issued at ' + RS(r.ip) + ', opened ' + pct(r.lg) + ', now <b class="' + cls(r.ret) + '">' + pct(r.ret) + '</b> vs issue and ' + pp(r.xs) + ' vs the NIFTY 500.' : 'No price history in the vault for this symbol.';
  var el = $('m-chart'); el.innerHTML = '<div class="skel"></div>';
  if (mChart) { try { mChart.remove(); } catch (e) {} mChart = null; }
  loadHist().then(function (H) {
    var a = H && H.s[r.s];
    if (!a || !PK.chart) { el.innerHTML = '<div class="unavail">Price history unavailable.</div>'; return; }
    el.innerHTML = '';
    PK.chart(el, { height: 300 }).then(function (ch) {
      mChart = ch;
      var px = [], n5 = [], c0 = a[1], i0 = a[0], b0 = H.n5[i0];
      for (var k = 0; k < a.length; k += 2) { px.push({ time: H.d[a[k]], value: a[k + 1] }); if (b0 && H.n5[a[k]]) n5.push({ time: H.d[a[k]], value: +(c0 * H.n5[a[k]] / b0).toFixed(2) }); }
      var s1 = PK.lineSeries(ch, px, { area: true, title: r.s });
      var s2 = PK.lineSeries(ch, n5, { color: '#5AA9F0', width: 1, title: 'NIFTY 500 (rebased)' });
      var s3 = PK.lineSeries(ch, px.map(function (p) { return { time: p.time, value: r.ip }; }), { color: '#E0A64A', width: 1, dashed: true, title: 'Issue price' });
      if (PK.legend) PK.legend(el, ch, [{ series: s1, label: r.s, color: '#2FE3B5' }, { series: s2, label: 'NIFTY 500 rebased', color: '#5AA9F0' }, { series: s3, label: 'Issue', color: '#E0A64A' }], function (v) { return RS(v); });
      ch.timeScale().fitContent();
    }).catch(function () { el.innerHTML = '<div class="unavail">Chart library unavailable.</div>'; });
  });
}
function closeModal() { $('modal').hidden = true; if (mChart) { try { mChart.remove(); } catch (e) {} mChart = null; } }
$('mx').addEventListener('click', closeModal);
$('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

/* ================================================================ BASES */
var bT = null;
function renderBases() {
  var X0 = +onv('b-dist'), fl = ons('b-flags');
  var all = I.bases.filter(function (b) { return b.seg === SEG && b.pull >= 12 && b.pull <= 70 && b.dist >= -X0; });
  all.forEach(function (b) { b.tightOK = b.tight <= 12; b.rsOK = b.rs > 0; b.score = (b.tightOK ? 1 : 0) + (b.rsOK ? 1 : 0) + (b.dist >= -5 ? 1 : 0); });
  var rows = all.filter(function (b) { return (fl.indexOf('tight') < 0 || b.tightOK) && (fl.indexOf('rs') < 0 || b.rsOK); });
  var vis = rows.filter(function (r) { return PK.capOK(r.s); });
  var brk = vis.filter(function (b) { return b.dist > 0; }).length;
  $('b-verdict').innerHTML = '<b>' + vis.length + '</b> ' + segName() + ' IPOs are within ' + X0 + '% of their post-listing high after a 12%+ pullback' + (fl.length ? ' and pass the ' + fl.map(function (f) { return f === 'rs' ? 'rising-RS' : 'tight-range'; }).join(' + ') + ' check' : '') + (brk ? '; ' + brk + ' already closed above the old high.' : '.') + capNote(rows.length - vis.length);
  bT = mkTable($('b-table'), bT, rows, [
    { key: 's', label: 'Stock', align: 'l', fmt: function (v, r) { return nameCell(r); } },
    { key: 'ld', label: 'Listed', fmt: function (v, r) { return Ds(v) + '<span class="sub">' + r.sess + ' sessions</span>'; } },
    { key: 'cp', label: 'Close ₹', num: true, fmt: function (v, r) { return fN(v, 2) + '<span class="sub ' + cls(r.ret) + '">' + pct(r.ret) + ' vs issue</span>'; } },
    { key: 'pv', label: 'Pivot high', num: true, fmt: function (v, r) { return fN(v, 2) + '<span class="sub">' + Ds(r.pvd) + '</span>'; } },
    { key: 'pull', label: 'Pullback', num: true, fmt: function (v) { return '−' + v.toFixed(1) + '%'; } },
    { key: 'dist', label: 'From high', num: true, fmt: function (v) { return '<span class="' + (v >= 0 ? 'up' : '') + '">' + pct(v) + '</span>'; } },
    { key: 'tight', label: '15d range', num: true, fmt: function (v, r) { return '<span class="' + (r.tightOK ? 'up' : 'mut') + '">' + v.toFixed(1) + '%</span>'; } },
    { key: 'rs', label: 'RS 20d', num: true, fmt: function (v) { return '<span class="' + cls(v) + '">' + pct(v) + '</span>'; } },
    { key: 'spark', label: '60 sessions', sortable: false, csv: false, fmt: function (v) { return PK.spark(v || [], { w: 90, h: 24 }); } }
  ], { sortKey: 'dist', csvName: 'ipo_bases', rowClick: function (r) { var L = I.listings.find(function (x) { return x.s === r.s; }); if (L) openStock(L); },
    presets: [{ label: 'Breaking out', filter: function (r) { return r.dist >= 0; } }, { label: 'Listed < 1 year', filter: function (r) { return r.days <= 365; } }, { label: 'Above issue', filter: function (r) { return r.ret > 0; } }] });
  renderUnlocks();
}
function renderUnlocks() {
  var w = onv('u-win');
  var u = I.unlocks.filter(function (x) { var d = daysTo(x.d); return x.seg === SEG && PK.capOK(x.s) && (w === 'past' ? d < 0 && d >= -21 : d >= 0 && d <= +w); });
  if (w === 'past') u = u.slice().reverse();
  var big = u.filter(function (x) { return num(x.val); }).sort(function (a, b) { return b.val - a.val; })[0];
  $('u-verdict').innerHTML = u.length ? u.length + ' anchor lock-in ' + (w === 'past' ? 'expiries in the last 3 weeks' : 'expiries in the next ' + w + ' days') + (big ? '; the largest is ' + esc(big.s) + ' (' + big.lab + ', ~' + CR(big.val) + ' at today\'s price).' : '.') : 'No ' + segName() + ' anchor unlocks in this window.';
  var wk = {};
  u.forEach(function (x) { var d = new Date(x.d + 'T00:00:00'); var m = new Date(d - ((d.getDay() + 6) % 7) * 864e5); var k = m.toISOString().slice(0, 10); (wk[k] = wk[k] || []).push(x); });
  var keys = Object.keys(wk).sort(); if (w === 'past') keys.reverse();
  $('u-cal').innerHTML = keys.length ? keys.map(function (k) { return '<div class="calw"><div class="wk">Week of ' + D(k) + '</div>' + wk[k].map(function (x) {
    return '<div class="it" data-pk-tip title="Allotment ≈ ' + esc(Ds(x.allot)) + '"><span><b>' + esc(x.s) + '</b> ' + PK.badges(x.s, { max: 1 }) + ' <span class="mut">' + esc(x.lab) + ' · ' + Ds(x.d) + '</span></span><span>' + (num(x.sh) ? fN(x.sh / 1e5, 1) + ' L sh · ' + CR(x.val) : 'size n/a') + ' <span class="' + cls(x.ret) + '">' + pct(x.ret) + ' vs issue</span></span></div>'; }).join('') + '</div>'; }).join('')
    : '<div class="unavail">Nothing in this window.</div>';
}

/* ================================================================ DRHP */
var sT = null;
function renderDrhp() {
  var d = I.drhp, el = $('d-cards');
  if (!d) { $('d-verdict').innerHTML = 'Offer documents decoded: coming soon.'; unavailable(el, 'Coming soon: structured cards from the offer documents (issue size, fresh vs OFS, use of proceeds, promoter holding, P/E vs listed peers). The SEBI filing list below is live.'); }
  else renderDrhpCards(d, el);
  var kind = onv('s-kind');
  var rows = (I.sebi || []).filter(function (r) { return !kind || r.kind === kind; });
  $('s-verdict').textContent = (I.sebi || []).length ? (I.sebi || []).filter(function (r) { return r.kind === 'DRHP' && daysTo(r.d) >= -30; }).length + ' new DRHPs filed with SEBI in the last 30 days.' : 'SEBI list unavailable on the last run.';
  if (!(I.sebi || []).length) { unavailable($('s-table'), 'Source unavailable on the last run; will fill after the next successful nightly fetch.'); return; }
  sT = mkTable($('s-table'), sT, rows, [
    { key: 'd', label: 'Filed', fmt: function (v) { return D(v); } },
    { key: 'co', label: 'Company', align: 'l', fmt: function (v, r) { return '<a class="up" href="' + esc(r.u) + '" target="_blank" rel="noopener">' + esc(v) + ' ↗</a>'; } },
    { key: 'kind', label: 'Document' }
  ], { sortKey: 'd', csvName: 'sebi_drhp', countLabel: 'filings' });
  if (sT && sT.update) sT.update(rows);
}
function fv(f) { return f && f.value != null ? f.value : null; }
function na(f) { return '<span class="dimc" title="' + esc((f && f.reason) || 'not found') + '">not available</span>'; }
function pg(f) { return f && f.page ? ' <span class="dimc" style="font-size:10.5px" title="' + esc((f.quote || '').slice(0, 300)) + '">p.' + f.page + (f.derived ? ' · calc' : '') + '</span>' : ''; }
function renderDrhpCards(d, el) {
  var items = (d.items || []).slice();
  if (SEG === 'SME') { $('d-verdict').innerHTML = 'Offer-document decoding covers mainboard issues (SME offer documents are filed with the exchange, not SEBI).'; el.innerHTML = '<div class="unavail">Switch to Mainboard to see decoded offer documents.</div>'; return; }
  var covd = items.reduce(function (a, c) { return a + (c.coverage || 0); }, 0), tot = items.reduce(function (a, c) { return a + (c.fields_total || 0); }, 0);
  $('d-verdict').innerHTML = items.length ? '<b>' + items.length + '</b> mainboard offer documents decoded; ' + Math.round(100 * covd / (tot || 1)) + '% of fields found. Anything the parser could not locate reliably is marked "not available" (hover for why).' : 'No offer documents decoded yet; the decoder fills this after the next successful nightly fetch of RHPs.';
  el.innerHTML = items.length ? items.map(function (c, i) { return drhpCard(c, i); }).join('') : '<div class="unavail">Nothing decoded yet.</div>';
}
function drhpCard(c, i) {
  var F = c.fields || {};
  var size = F.issue_size, fr = F.fresh_issue, of = F.offer_for_sale, pb = F.price_band, pre = F.promoter_holding_pre, post = F.promoter_holding_post;
  var pe = F.pe_at_cap_price, peer = F.peer_pe, eps = F.eps_diluted, obj = F.objects_of_issue, wc = F.waca_selling_shareholders;
  var peAvg = peer && (peer.peer_pe_avg != null ? peer.peer_pe_avg : null), peMed = peer && peer.peer_pe_median;
  var sz = fv(size), f0 = fv(fr), o0 = fv(of);
  var verdict = num(fv(pe)) && num(peMed) ? 'Priced at <b>' + fv(pe).toFixed(1) + '×</b> earnings at the upper band vs a listed-peer median of ' + peMed.toFixed(1) + '× (' + (fv(pe) > peMed ? 'a premium' : 'a discount') + ').'
    : num(o0) && num(sz) && sz > 0 ? Math.round(o0 / sz * 100) + '% of the issue is an offer for sale (money to selling shareholders, not the company).'
    : 'Key numbers from the ' + esc(c.doc_type || 'offer document') + '.';
  var band = fv(pb), bandTxt = band && typeof band === 'object' ? RS(band.floor) + '–' + fN(band.cap) : band;
  var fmtPct = function (f) { var v = fv(f); return v == null ? na(f) : (typeof v === 'number' ? v.toFixed(2) + '%' : esc(v)) + pg(f); };
  var fmtCr = function (f) { var v = fv(f); return v == null ? na(f) : (num(v) ? CR(v) : esc(v)) + pg(f); };
  var objs = Array.isArray(fv(obj)) ? fv(obj) : [];
  var peers = peer && Array.isArray(fv(peer)) ? fv(peer) : [];
  return '<div class="box hov" style="animation-delay:' + i * 45 + 'ms"><div class="k">' + esc(c.symbol) + ' · ' + esc(c.doc_type || 'RHP') + ' · ' + Ds(c.issue_open) + '–' + Ds(c.issue_close) + '</div><h3>' + esc(c.name || c.symbol) + '</h3>' +
    '<p class="verdict" style="margin-top:6px">' + verdict + '</p>' +
    '<div class="facts"><div><span>Issue size</span><b>' + fmtCr(size) + '</b></div><div><span>Fresh issue</span><b>' + fmtCr(fr) + '</b></div><div><span>Offer for sale</span><b>' + fmtCr(of) + '</b></div><div><span>Price band</span><b>' + (bandTxt ? esc(bandTxt) : na(pb)) + '</b></div>' +
    '<div><span>Promoter pre-issue</span><b>' + fmtPct(pre) + '</b></div><div><span>Promoter post-issue</span><b>' + fmtPct(post) + '</b></div>' +
    '<div><span>P/E at upper band</span><b>' + (num(fv(pe)) ? fv(pe).toFixed(1) + '×' + pg(pe) : na(pe)) + '</b></div><div><span>Peer P/E median · avg</span><b>' + (num(peMed) ? peMed.toFixed(1) + '× · ' + (num(peAvg) ? peAvg.toFixed(1) + '×' : '–') + pg(peer) : na(peer)) + '</b></div></div>' +
    '<div class="k">Use of proceeds' + (obj && obj.page ? ' · p.' + obj.page : '') + '</div>' + (objs.length ? '<div class="bars">' + objs.map(function (o) {
      return '<div class="hb" style="grid-template-columns:1fr 92px"><span class="mut">' + esc(o.object) + '</span><b>' + (num(o.amount_cr) ? CR(o.amount_cr) : '<span class="dimc">' + esc(o.raw_amount || '–') + '</span>') + '</b></div>'; }).join('') + '</div>' : '<div style="font-size:12.5px">' + na(obj) + '</div>') +
    (peers.length ? '<div class="k" style="margin-top:10px">Listed peers named in "Basis for Offer Price"</div><div class="ddl">' + peers.slice(0, 8).map(function (p) { return '<span>' + esc(p.name) + (num(p.pe) ? ' <b>' + p.pe + '×</b>' : '') + '</span>'; }).join('') + '</div>' : '') +
    (num(fv(eps)) ? '<div class="src">Diluted EPS (latest fiscal in the peer table): ₹' + fv(eps) + pg(eps) + '</div>' : '') +
    (wc && fv(wc) != null ? '<div class="src">Selling shareholders\' average cost: ' + esc(Array.isArray(fv(wc)) ? fv(wc).map(function (x) { return typeof x === 'object' ? (x.name ? x.name + ' ' : '') + '₹' + (x.waca != null ? x.waca : x.value) : '₹' + x; }).join(' · ') : fv(wc)) + pg(wc) + '</div>' : '') +
    '<div class="links">' + (c.doc_url ? '<a href="' + esc(c.doc_url) + '" target="_blank" rel="noopener">' + esc(c.doc_type || 'Offer document') + ' ↗</a>' : '') + '<span class="dimc" style="font-size:12px;align-self:center">' + (c.coverage || 0) + ' of ' + (c.fields_total || 0) + ' fields found · ' + (c.pages || '–') + ' pages</span></div></div>';
}

/* ================================================================ wiring */
var cur = 'live';
function renderAll() { kpis(); render(cur); }
function render(n) { cur = n; if (n === 'live') renderLive(); else if (n === 'score') renderScore(); else if (n === 'bases') renderBases(); else if (n === 'drhp') renderDrhp(); }
$('seg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || b.dataset.v === SEG) return; PK.haptic('select'); SEG = b.dataset.v;
  try { localStorage.setItem('ipo_seg', SEG); } catch (x) {}
  [].forEach.call($('seg').children, function (x) { x.classList.toggle('on', x === b); }); renderAll(); });
chips('sc-win', renderScore); chips('b-dist', renderBases); chips('b-flags', renderBases); chips('u-win', renderUnlocks); chips('s-kind', renderDrhp);
document.addEventListener('pk:cap', function () { render(cur); });
if (window.PK && PK.capFilter && window.PK_UNIVERSE) PK.capFilter($('capf'), {});
PK.press(document);
kpis();
var TB = PK.tabs($('tabs'), { storeKey: 'ipo_tab', onChange: function (n) { render(n); } });
render((TB && TB.get && TB.get()) || cur);
if (!HASKIT) $('asof').innerHTML += ' · <span class="am">site kit unavailable, basic view</span>';
})();
