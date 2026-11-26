/* Shareholding Changes + Superstar Investors tabs for Smart Money.
   Data: shp/data.js (window.SHP) and shp/inv.js (window.SHPI), built by SmartMoney/shp_build.py
   from NSE shareholding pattern filings (SEBI LODR Reg 31, XBRL). Loaded lazily on first open. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var HAS = !!window.PK;
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var ql = function (q) { return MON[+q.slice(5, 7) - 1] + " " + q.slice(2, 4); };
  var ok = function (s) { if (!HAS || !PK.capOK) return true; try { return PK.capOK(String(s)); } catch (e) { return true; } };
  var capOn = function () { try { return HAS && PK.capIsDefault && !PK.capIsDefault(); } catch (e) { return false; } };
  var capSum = function () { try { return PK.capSummary(); } catch (e) { return ""; } };
  var capNote = function () { return capOn() ? '<div class="capnote">Filtered to <b>' + esc(capSum()) + '</b> · <button type="button" class="linkbtn" data-capreset>reset</button></div>' : ""; };
  var badges = function (s) { try { return HAS && PK.badges ? PK.badges(String(s)) || "" : ""; } catch (e) { return ""; } };
  var num = function (v, d) { return v == null || !isFinite(v) ? "–" : v.toLocaleString("en-IN", { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); };
  var pp = function (v, d) { return v == null || !isFinite(v) ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d == null ? 2 : d); };
  var pc = function (v, d) { return v == null || !isFinite(v) ? "–" : v.toFixed(d == null ? 2 : d) + "%"; };
  var crf = function (v) { if (v == null || !isFinite(v)) return "–"; if (HAS && PK.fmt) return PK.fmt.cr(v, Math.abs(v) < 100 ? 1 : 0); return "₹" + num(v) + " Cr"; };
  var cls = function (v) { return v > 0 ? "up" : v < 0 ? "dn" : ""; };
  var CAT = ["#2FE3B5", "#5AA9F0", "#A78BFA", "#E0A64A", "#8A9690", "#3E6B5E"];

  function load(src, ver) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src + "?v=" + encodeURIComponent(ver || Date.now());
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  var verP = null;
  function ver() { if (!verP) verP = load("shp/ver.js", Date.now()).catch(function () { }); return verP; }
  var dataP = null, invP = null;
  function needData() { if (!dataP) dataP = ver().then(function () { return load("shp/data.js", window.SHP_VER); }); return dataP; }
  function needInv() { if (!invP) invP = needData().then(function () { return load("shp/inv.js", window.SHP_VER); }); return invP; }

  // ------------------------------------------------------------------ shared helpers
  function countUp(el, v, f) {
    if (HAS && PK.countUp && !REDUCED) { try { PK.countUp(el, v, { fmt: f }); return; } catch (e) { } }
    el.textContent = f(v);
  }
  function kpis(el, items) {
    el.innerHTML = items.map(function (k, i) {
      return '<div class="pk" style="animation-delay:' + i * 45 + 'ms"><div class="l">' + esc(k[0]) + '</div><div class="v ' + (k[4] || "") + '" data-k="' + i + '">–</div><div class="s" title="' + esc(k[3]) + '">' + esc(k[3]) + '</div></div>';
    }).join("");
    items.forEach(function (k, i) { countUp(el.querySelector('[data-k="' + i + '"]'), k[1], k[2]); });
  }
  function howto(txt) { return '<details class="howto"><summary>How to read this</summary><div class="note">' + txt + '</div></details>'; }
  function foot(txt) { return '<div class="srcnote">' + txt + '</div>'; }
  function bars(el, items, fmt, onClick, opts) {
    opts = opts || {};
    if (!items.length) { el.innerHTML = '<div class="empty">Nothing in this filter</div>'; return; }
    if (HAS && PK.svgBars) {
      el.innerHTML = "";
      return PK.svgBars(el, items, { fmt: fmt, onClick: onClick, labelW: opts.labelW || (innerWidth < 500 ? 92 : 130), barH: 16, gap: 7, vertical: !!opts.vertical, height: opts.height, values: opts.values });
    }
    var mx = Math.max.apply(null, items.map(function (x) { return Math.abs(x.value); }).concat([1e-9]));
    el.innerHTML = items.map(function (x, i) {
      return '<div class="hbar" data-shi="' + i + '"><div class="nm">' + esc(x.label) + '</div><div class="tr"><div class="fl ' + (x.value < 0 ? "neg" : "") + '" style="width:' + Math.abs(x.value) / mx * 100 + '%"></div></div><div class="v ' + cls(x.value) + '">' + fmt(x.value, x) + '</div></div>';
    }).join("");
    el.onclick = function (e) { var r = e.target.closest("[data-shi]"); if (r && onClick) onClick(items[+r.dataset.shi]); };
  }
  function openModal(html) { $("#mbox").innerHTML = html; $("#modal").classList.add("open"); }
  function lineChart(el, series, fmt) {
    // series: [{label, color, data:[{time,value}]}]
    if (!(HAS && PK.chart)) { el.innerHTML = '<div class="empty">Chart unavailable</div>'; return; }
    el.innerHTML = "";
    PK.chart(el, { height: 230, priceFormatter: fmt }).then(function (ch) {
      var list = series.filter(function (s) { return s.data.length; }).map(function (s) {
        return { series: PK.lineSeries(ch, s.data, { color: s.color, title: "", area: series.length === 1, lastValue: false }), label: s.label, color: s.color };
      });
      try { PK.legend(el, ch, list, function (v) { return fmt(v); }); } catch (e) { }
      ch.timeScale().fitContent();
    }).catch(function () { el.innerHTML = '<div class="empty">Chart library failed to load</div>'; });
  }

  // ------------------------------------------------------------------ Shareholding Changes
  var CH = { qi: null, metric: "fii", sec: "", built: false, table: null };
  var METRICS = {
    pro: { l: "Promoter", f: "pro", kind: "pp", up: "Promoters raised stake", dn: "Promoters cut stake", what: "promoter & promoter group holding" },
    fii: { l: "FII / FPI", f: "fii", kind: "pp", up: "FIIs bought", dn: "FIIs sold", what: "foreign institutional holding (FPIs and other foreign institutions)" },
    mf: { l: "Mutual funds", f: "mf", kind: "pp", up: "MFs bought", dn: "MFs sold", what: "mutual fund holding" },
    dii: { l: "DII", f: "dii", kind: "pp", up: "DIIs bought", dn: "DIIs sold", what: "domestic institutions (MFs, insurers, banks, pension funds, AIFs)" },
    pledge: { l: "Pledge", f: "pledge", kind: "pp", up: "Pledge rising", dn: "Pledge falling", what: "promoter shares pledged, as % of the promoter holding", badUp: 1 },
    retail: { l: "Retail holders", f: "n_retail", kind: "pct", up: "Retail holder surge (froth watch)", dn: "Retail holders leaving", what: "number of resident individuals holding up to ₹2 lakh", badUp: 1, min: 2000 },
    fpi2: { l: "FPI count ↑2Q", f: "n_fpi", kind: "streak", up: "More FPIs, 2 quarters running", dn: "Fewer FPIs, 2 quarters running", what: "number of foreign portfolio investors on the register" },
    mf2: { l: "MF count ↑2Q", f: "n_mf", kind: "streak", up: "More MF holders, 2 quarters running", dn: "Fewer MF holders, 2 quarters running", what: "number of mutual fund holders as filed (usually one line per fund house or scheme)" }
  };
  function S() { return window.SHP; }
  function val(f, i, q) { var a = S().f[f]; return a && a[i] ? a[i][q] : null; }
  function delta(m, i, q) {
    var M = METRICS[m], a = val(M.f, i, q), b = q > 0 ? val(M.f, i, q - 1) : null;
    if (M.kind === "streak") {
      var c = q > 1 ? val(M.f, i, q - 2) : null;
      if (a == null || b == null || c == null) return null;
      if (a > b && b > c) return { v: a - c, a: a, b: b, c: c };
      if (a < b && b < c) return { v: a - c, a: a, b: b, c: c };
      return null;
    }
    if (a == null || b == null) return null;
    if (M.kind === "pct") { if (b < (M.min || 1)) return null; return { v: (a / b - 1) * 100, a: a, b: b }; }
    return { v: a - b, a: a, b: b };
  }
  function stockOK(i) { var s = S().stocks[i]; return ok(s[0]) && (!CH.sec || s[2] === CH.sec); }
  function fmtD(m) { var k = METRICS[m].kind; return function (v) { return k === "pp" ? pp(v) + "pp" : k === "pct" ? pp(v, 1) + "%" : pp(v, 0); }; }

  function renderChanges() {
    var D = S(), Q = D.quarters, el = $("#t-shpchg");
    if (CH.qi == null) CH.qi = defaultQ();
    var q = CH.qi;
    if (!CH.built) {
      CH.built = true;
      var secs = {}; D.stocks.forEach(function (s) { secs[s[2]] = 1; });
      el.innerHTML =
        '<div class="hero"><div><div class="eb">Quarterly shareholding patterns · NSE filings</div><h1>Who is moving in and out of <em>India Inc.</em></h1><div class="asof" id="shAsof"></div></div><div class="live"><i></i><span>Checked daily</span></div></div>' +
        '<div class="pulse" id="shK"></div>' +
        '<div class="filters" id="shF"><div class="bar"><div class="grp"><span class="lbl">Quarter</span><select id="shQ"></select></div>' +
        '<div class="grp"><span class="lbl">Sector</span><select id="shSec"><option value="">All sectors</option>' + Object.keys(secs).sort().map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("") + '</select></div></div></div>' +
        '<div class="box" id="shSeason"></div>' +
        '<div class="box" style="margin-top:14px"><h4><span id="shLT">Biggest changes</span><small id="shLS"></small></h4><div class="chips" id="shM" role="tablist" style="margin:6px 0 10px"></div>' +
        '<div id="shCov" class="note" style="margin-bottom:6px"></div><div class="split" style="margin-top:0"><div><div class="lbl" id="shUpL" style="margin-bottom:6px"></div><div id="shUp"></div></div><div><div class="lbl" id="shDnL" style="margin-bottom:6px"></div><div id="shDn"></div></div></div>' +
        howto("Each bar is one company: the change between the selected quarter and the one before. <b>pp</b> = percentage points of the company's total shares (FII 10% → 11% is +1pp). <b>Retail holders</b> is the % change in the number of resident individuals holding up to ₹2 lakh; a sudden jump often comes with a speculative run-up, so treat it as a froth flag rather than a buy signal. <b>Count ↑2Q</b> lists companies where the number of FPIs (or MF holders) rose, or fell, in each of the last two quarters. Tap a bar for the company's 8-quarter history.") +
        foot("Source: NSE shareholding pattern filings (SEBI LODR Reg 31), parsed from each filing's XBRL. Promoter % also uses NSE's filing list where a filing isn't parsed yet.") + '</div>' +
        '<div class="box" style="margin-top:14px"><h4><span id="shSecT">Sector view</span><small id="shSecS"></small></h4><div id="shSecB"></div>' +
        howto("For each sector: the change in the metric, weighted by today's market cap of companies that filed in both quarters, so large companies count more. The market-cap filter applies.") +
        foot("Source: NSE shareholding pattern filings; sectors from Smart Money's stock map; market cap NSE, latest close.") + '</div>' +
        '<div class="box" style="margin-top:14px"><h4><span id="shTT">Every company</span><small>tap a row for 8-quarter history and named holders</small></h4><div id="shT"></div>' +
        foot("Source: NSE shareholding pattern filings (XBRL). Δ = change vs previous quarter. – = not filed or not parsed yet.") + '</div>';
      $("#shQ").innerHTML = Q.map(function (x, i) { return '<option value="' + i + '">' + ql(x) + (i ? " vs " + ql(Q[i - 1]) : "") + "</option>"; }).slice(1).reverse().join("");
      $("#shQ").onchange = function (e) { CH.qi = +e.target.value; renderChanges(); };
      $("#shSec").onchange = function (e) { CH.sec = e.target.value; renderChanges(); };
      $("#shM").innerHTML = Object.keys(METRICS).map(function (k) { return '<button type="button" class="pk-chip" role="tab" data-m="' + k + '">' + esc(METRICS[k].l) + "</button>"; }).join("");
      $("#shM").onclick = function (e) { var b = e.target.closest("[data-m]"); if (!b) return; CH.metric = b.dataset.m; try { PK.haptic && PK.haptic("select"); } catch (x) { } renderChanges(); };
    }
    $("#shQ").value = q;
    Array.prototype.forEach.call($("#shM").children, function (b) { b.classList.toggle("on", b.dataset.m === CH.metric); });
    var N = D.stocks.length, idx = [];
    for (var i = 0; i < N; i++) if (stockOK(i)) idx.push(i);
    var full = idx.filter(function (i) { return D.stocks[i][5][q] === 1; }).length, anyq = idx.filter(function (i) { return D.stocks[i][5][q]; }).length;
    $("#shAsof").innerHTML = "Latest quarter <b>" + ql(Q[Q.length - 1]) + "</b> · " + num(D.stocks.length) + " NSE companies · 8 quarters from " + ql(Q[0]) + " · built " + esc(D.built);

    // KPIs
    var cnt = function (m, sgn) { return idx.filter(function (i) { var d = delta(m, i, q); return d && (sgn > 0 ? d.v > 0.005 : d.v < -0.005); }).length; };
    var froth = idx.filter(function (i) { var d = delta("retail", i, q); return d && d.v >= 25; }).length;
    var season = D.seasons[D.seasons.length - 1];
    kpis($("#shK"), [
      ["Filings for " + ql(Q[q]), anyq, num, "companies in filter · full detail for " + num(full)],
      ["Promoters raised / cut", cnt("pro", 1), function (v) { return num(v) + " / " + num(cnt("pro", -1)); }, "companies, " + ql(Q[q]) + " vs " + ql(Q[q - 1])],
      ["FIIs raised / cut", cnt("fii", 1), function (v) { return num(v) + " / " + num(cnt("fii", -1)); }, "companies with a change", ""],
      ["MFs raised / cut", cnt("mf", 1), function (v) { return num(v) + " / " + num(cnt("mf", -1)); }, "companies with a change", ""],
      ["Retail holder surges", froth, num, "holders ≤ ₹2 L up 25%+ in a quarter", froth ? "am" : ""]
    ]);

    // season
    renderSeason(season, D.seasons.length > 1 ? D.seasons[D.seasons.length - 2] : null);

    // leaderboards
    var m = CH.metric, M = METRICS[m], f = fmtD(m);
    var rows = idx.map(function (i) { var d = delta(m, i, q); return d ? { i: i, d: d } : null; }).filter(Boolean);
    var withF = idx.filter(function (i) { return val(M.f, i, q) != null && (M.kind !== "streak" ? val(M.f, i, q - 1) != null : val(M.f, i, q - 2) != null); }).length;
    var ups = rows.filter(function (r) { return r.d.v > 0; }).sort(function (a, b) { return b.d.v - a.d.v; });
    var dns = rows.filter(function (r) { return r.d.v < 0; }).sort(function (a, b) { return a.d.v - b.d.v; });
    var verdict;
    if (M.kind === "streak") verdict = num(ups.length) + " companies added " + (m === "fpi2" ? "FPIs" : "MF holders") + " two quarters running; " + num(dns.length) + " lost them two quarters running";
    else if (M.kind === "pct") verdict = num(ups.filter(function (r) { return r.d.v >= 10; }).length) + " companies saw retail holders jump 10%+ in " + ql(Q[q]) + ", " + num(dns.filter(function (r) { return r.d.v <= -10; }).length) + " saw them fall 10%+";
    else verdict = M.l + ": " + (ups.length >= dns.length ? "raised in " + num(ups.length) + " companies, cut in " + num(dns.length) : "cut in " + num(dns.length) + " companies, raised in only " + num(ups.length)) + " (" + ql(Q[q]) + ")";
    $("#shLT").textContent = verdict;
    $("#shLS").textContent = M.what;
    $("#shUpL").textContent = M.up; $("#shDnL").textContent = M.dn;
    $("#shCov").innerHTML = capNote() + (withF < idx.length * 0.6 ? '<span class="am">Full-detail coverage: ' + num(withF) + " of " + num(idx.length) + " companies have this metric for both quarters so far (older filings are still being backfilled).</span>" : num(withF) + " companies compared");
    var item = function (r) {
      var s = D.stocks[r.i], d = r.d;
      var tip = "<b>" + esc(s[1]) + "</b> (" + esc(s[0]) + ")<br>" + esc(s[2]) + " · " + crf(s[3]) + "<br>" +
        (M.kind === "streak" ? esc(ql(Q[q - 2])) + " " + num(d.c) + " → " + esc(ql(Q[q - 1])) + " " + num(d.b) + " → " + esc(ql(Q[q])) + " " + num(d.a) :
          M.kind === "pct" ? num(d.b) + " → " + num(d.a) + " holders" : pc(d.b) + " → " + pc(d.a)) + "<br><span class='m'>tap for history</span>";
      return { label: s[0], value: d.v, i: r.i, tip: tip, color: M.badUp && d.v > 0 ? "#E0A64A" : null };
    };
    var open = function (it) { openStock(it.i); };
    bars($("#shUp"), ups.slice(0, 15).map(item), f, open);
    bars($("#shDn"), dns.slice(0, 15).map(item), f, open);

    renderSectors(idx, q);
    renderTable(idx, q);
  }
  function defaultQ() {
    var D = S(), n = D.quarters.length, L = n - 1;
    var cntQ = function (q) { return D.stocks.filter(function (s) { return s[5][q]; }).length; };
    return cntQ(L) >= cntQ(L - 1) * 0.5 ? L : L - 1;
  }
  function renderSeason(cur, prev) {
    var el = $("#shSeason");
    if (!cur) { el.innerHTML = '<div class="empty">Source unavailable</div>'; return; }
    var exp = prev ? prev.filed : null, pct = exp ? cur.filed / exp * 100 : null;
    var cum = 0, items = cur.days.map(function (d) { cum += d[1]; var dt = new Date(d[0] + "T00:00:00Z"); return { label: dt.getUTCDate() + " " + MON[dt.getUTCMonth()], value: cum, tip: "<b>" + d[0] + "</b><br>" + num(d[1]) + " filings that day<br>" + num(cum) + " so far" }; });
    if (items.length > 45) items = items.slice(-45);
    var t = num(cur.filed) + " companies have filed their " + ql(cur.q) + " shareholding" + (pct != null ? " — " + Math.min(100, pct).toFixed(0) + "% of last quarter's " + num(exp) : "");
    el.innerHTML = '<h4><span>' + esc(t) + '</span><small>season progress · cumulative filings by date</small></h4><div id="shSeasonB"></div>' +
      '<div class="note">Full XBRL detail parsed for ' + num(cur.parsed) + " of these so far. SEBI deadline: 21 days after quarter-end; most filings land in the last week.</div>" +
      howto("Each bar is the running total of companies that filed their shareholding pattern for the quarter, by filing date. The comparison is the number of companies that filed for the previous quarter.") +
      foot("Source: NSE corporate filings, shareholding pattern list · as of " + esc(S().built));
    bars($("#shSeasonB"), items, function (v) { return num(v); }, null, { vertical: true, height: 160, values: false });
  }
  function renderSectors(idx, q) {
    var m = CH.metric, M = METRICS[m];
    var el = $("#shSecB");
    if (M.kind === "streak") {
      var c = {};
      idx.forEach(function (i) { var d = delta(m, i, q); if (!d) return; var s = S().stocks[i][2]; c[s] = (c[s] || 0) + (d.v > 0 ? 1 : -1); });
      var it = Object.keys(c).map(function (s) { return { label: s, value: c[s], tip: "<b>" + esc(s) + "</b><br>net " + pp(c[s], 0) + " companies with a 2-quarter rise vs fall" }; }).sort(function (a, b) { return b.value - a.value; });
      $("#shSecT").textContent = it.length ? "Most companies adding " + (m === "fpi2" ? "FPIs" : "MF holders") + ": " + it[0].label : "Sector view";
      $("#shSecS").textContent = "companies rising 2Q minus falling 2Q";
      bars(el, it, function (v) { return pp(v, 0); }, null, { labelW: innerWidth < 500 ? 110 : 170 });
      return;
    }
    var agg = {};
    idx.forEach(function (i) {
      if (CH.sec && S().stocks[i][2] !== CH.sec) return;
      var d = delta(m, i, q); if (!d) return; var s = S().stocks[i], w = s[3] || 0; if (!w) return;
      if (M.kind === "pct") { var a = agg[s[2]] || (agg[s[2]] = { a: 0, b: 0, n: 0 }); a.a += d.a; a.b += d.b; a.n++; return; }
      var g = agg[s[2]] || (agg[s[2]] = { w: 0, x: 0, n: 0 }); g.w += w; g.x += w * d.v; g.n++;
    });
    var it = Object.keys(agg).map(function (s) {
      var g = agg[s], v = M.kind === "pct" ? (g.a / g.b - 1) * 100 : g.x / g.w;
      return { label: s, value: v, tip: "<b>" + esc(s) + "</b><br>" + fmtD(m)(v) + " · " + g.n + " companies" };
    }).filter(function (x) { return isFinite(x.value); }).sort(function (a, b) { return b.value - a.value; });
    var top = it[0], bot = it[it.length - 1];
    $("#shSecT").textContent = top ? M.l + ": biggest rise in " + top.label + " (" + fmtD(m)(top.value) + ")" + (bot && bot.value < 0 ? ", biggest fall in " + bot.label + " (" + fmtD(m)(bot.value) + ")" : "") : "Sector view";
    $("#shSecS").textContent = M.kind === "pct" ? "% change in retail holders, all companies in sector" : "market-cap-weighted change, pp";
    bars(el, it, fmtD(m), function (x) { CH.sec = x.label; $("#shSec").value = x.label; renderChanges(); }, { labelW: innerWidth < 500 ? 110 : 170 });
  }
  function renderTable(idx, q) {
    var D = S(), rows = idx.map(function (i) {
      var s = D.stocks[i], g = function (f, k) { return val(f, i, k); }, dd = function (f) { var a = g(f, q), b = q ? g(f, q - 1) : null; return a != null && b != null ? +(a - b).toFixed(2) : null; };
      var nr = g("n_retail", q), nr0 = q ? g("n_retail", q - 1) : null;
      return { i: i, s: s[0], n: s[1], sec: s[2], mc: s[3], pro: g("pro", q), dpro: dd("pro"), pl: g("pledge", q), dpl: dd("pledge"), fii: g("fii", q), dfii: dd("fii"),
        dii: g("dii", q), ddii: dd("dii"), mf: g("mf", q), dmf: dd("mf"), ret: g("retail", q), nr: nr, dnr: nr != null && nr0 ? +((nr / nr0 - 1) * 100).toFixed(1) : null, nf: g("n_fpi", q), dnf: dd("n_fpi"), sh: g("n_sh", q) };
    });
    var c = function (k) { return function (v) { return v == null ? "–" : '<span class="' + cls(v) + '">' + pp(v) + "</span>"; }; };
    var cols = [
      { key: "n", label: "Company", align: "l", fmt: function (v, r) { return "<b>" + esc(v) + '</b> <span class="sy">' + esc(r.s) + "</span>" + badges(r.s) + '<span class="sub">' + esc(r.sec) + "</span>"; } },
      { key: "mc", label: "Mcap ₹Cr", num: true, fmt: function (v) { return num(v); } },
      { key: "pro", label: "Promoter %", num: true, fmt: function (v) { return pc(v); } }, { key: "dpro", label: "Δ", num: true, fmt: c() },
      { key: "pl", label: "Pledge %", num: true, fmt: function (v) { return v ? '<span class="am">' + pc(v, 1) + "</span>" : v === 0 ? "0" : "–"; } }, { key: "dpl", label: "Δ", num: true, fmt: function (v) { return v == null ? "–" : '<span class="' + (v > 0 ? "dn" : v < 0 ? "up" : "") + '">' + pp(v) + "</span>"; } },
      { key: "fii", label: "FII %", num: true, fmt: function (v) { return pc(v); } }, { key: "dfii", label: "Δ", num: true, fmt: c() },
      { key: "dii", label: "DII %", num: true, fmt: function (v) { return pc(v); } }, { key: "ddii", label: "Δ", num: true, fmt: c() },
      { key: "mf", label: "MF %", num: true, fmt: function (v) { return pc(v); } }, { key: "dmf", label: "Δ", num: true, fmt: c() },
      { key: "ret", label: "Retail %", num: true, fmt: function (v) { return pc(v); } },
      { key: "nr", label: "Retail holders", num: true, fmt: function (v) { return num(v); } }, { key: "dnr", label: "Δ %", num: true, fmt: function (v) { return v == null ? "–" : '<span class="' + (v >= 25 ? "am" : cls(v)) + '">' + pp(v, 1) + "</span>"; } },
      { key: "nf", label: "# FPIs", num: true, fmt: function (v) { return num(v); } }, { key: "dnf", label: "Δ", num: true, fmt: function (v) { return v == null ? "–" : '<span class="' + cls(v) + '">' + pp(v, 0) + "</span>"; } },
      { key: "sh", label: "Shareholders", num: true, fmt: function (v) { return num(v); } }
    ];
    $("#shTT").textContent = num(rows.length) + " companies · " + ql(D.quarters[q]) + " vs " + ql(D.quarters[q - 1]);
    if (HAS && PK.table) {
      if (CH.table) { CH.table.update(rows); return; }
      $("#shT").innerHTML = "";
      CH.table = PK.table($("#shT"), {
        columns: cols, rows: rows, sortKey: "mc", sortDir: "desc", search: true, pageSize: 100, csvName: "shareholding_changes", tvExport: true, symbolKey: "s",
        countLabel: "companies", placeholder: "Search company or symbol…",
        presets: [{ label: "Promoter buying", filter: function (r) { return r.dpro > 0.1; } }, { label: "Promoter selling", filter: function (r) { return r.dpro < -0.1; } },
          { label: "FII buying", filter: function (r) { return r.dfii > 0.5; } }, { label: "MF buying", filter: function (r) { return r.dmf > 0.5; } },
          { label: "Pledge rising", filter: function (r) { return r.dpl > 0.5; } }, { label: "Retail froth", filter: function (r) { return r.dnr >= 25; } }],
        rowClick: function (r) { openStock(r.i); }
      });
    } else {
      $("#shT").innerHTML = '<div class="tablewrap"><table><tbody>' + rows.slice(0, 200).map(function (r) { return "<tr><td>" + esc(r.n) + "</td><td>" + pc(r.pro) + "</td><td>" + pc(r.fii) + "</td><td>" + pc(r.mf) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    }
  }

  // ------------------------------------------------------------------ stock drawer
  function openStock(i) {
    var D = S(), s = D.stocks[i], Q = D.quarters;
    var row = function (f, lab, fm) { return "<tr><td class='l'>" + lab + "</td>" + Q.map(function (_, k) { return "<td>" + fm(val(f, i, k)) + "</td>"; }).join("") + "</tr>"; };
    openModal('<div class="mhead"><div><h2>' + esc(s[1]) + '</h2><div class="note">' + esc(s[0]) + " · " + esc(s[2]) + (s[4] ? " · " + esc(s[4]) : "") + " · Mkt cap " + crf(s[3]) + '</div></div><button class="x" onclick="closeM()">✕</button></div>' +
      '<div class="box" style="margin-top:12px"><h4><span id="shStV"></span><small>% of shares, quarter-end</small></h4><div id="shStC" style="height:230px"></div>' + foot("Source: NSE shareholding pattern filings (XBRL)") + "</div>" +
      '<div class="tablewrap" style="max-height:none"><table><thead><tr><th class="l">Holder</th>' + Q.map(function (q) { return "<th>" + ql(q) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      row("pro", "Promoter %", pc) + row("pledge", "Pledged (% of promoter)", function (v) { return v == null ? "–" : v.toFixed(1); }) + row("fii", "FII %", pc) + row("dii", "DII %", pc) + row("mf", "MF %", pc) + row("ins", "Insurance %", pc) +
      row("retail", "Retail ≤ ₹2 L %", pc) + row("pub", "Public %", pc) + row("n_sh", "Shareholders", num) + row("n_retail", "Retail holders", num) + row("n_fpi", "# FPIs", num) + row("n_mf", "# MF holders", num) +
      '</tbody></table></div><div id="shNamed" class="note" style="margin-top:10px">Loading named holders…</div>');
    var ser = [["pro", "Promoter", CAT[0]], ["fii", "FII", CAT[1]], ["dii", "DII", CAT[2]], ["mf", "MF", CAT[3]], ["retail", "Retail", CAT[4]]].map(function (x) {
      return { label: x[1], color: x[2], data: Q.map(function (q, k) { var v = val(x[0], i, k); return v == null ? null : { time: q, value: v }; }).filter(Boolean) };
    });
    var a = val("pro", i, Q.length - 1), b = val("pro", i, 0), f1 = val("fii", i, Q.length - 1), f0 = val("fii", i, 0);
    $("#shStV").textContent = (a != null && b != null ? "Promoter " + pp(a - b) + "pp" : "Promoter n/a") + (f1 != null && f0 != null ? " · FII " + pp(f1 - f0) + "pp" : "") + " since " + ql(Q[0]);
    lineChart($("#shStC"), ser, function (v) { return v.toFixed(1) + "%"; });
    needInv().then(function () {
      var I = window.SHPI, L = [];
      I.inv.forEach(function (e, ii) { e.h.forEach(function (h) { if (h[0] === i) L.push([ii, h[1]]); }); });
      L.sort(function (x, y) { return (y[1][Q.length - 1] || 0) - (x[1][Q.length - 1] || 0); });
      $("#shNamed").innerHTML = L.length ? '<div class="lbl" style="margin-bottom:4px">Tracked investors holding 1%+ (tap a name)</div>' + L.map(function (x) {
        var e = I.inv[x[0]]; return '<div class="li" data-inv="' + x[0] + '"><span>' + (e.st ? "★ " : "") + esc(e.n) + ' <span class="note">' + esc(e.c) + "</span></span><span>" + x[1].map(function (v) { return v == null ? "·" : v.toFixed(2); }).slice(-4).join(" → ") + "</span></div>";
      }).join("") : "No tracked investor holds 1% or more.";
    }).catch(function () { $("#shNamed").textContent = "Investor list unavailable."; });
  }

  // ------------------------------------------------------------------ Superstar Investors
  var SS = { view: "ind", q: "", sort: "v", built: false };
  function invOK(e) {
    if (SS.view === "ind" && e.c !== "Individual") return false;
    if (SS.view === "inst" && e.c === "Individual") return false;
    if (SS.q && (e.n + " " + e.al.join(" ")).toLowerCase().indexOf(SS.q) < 0) return false;
    return true;
  }
  function holdNow(e) {
    var D = S(), L = D.quarters.length - 1, v = 0, n = 0;
    e.h.forEach(function (h) { var s = D.stocks[h[0]]; if (!ok(s[0])) return; var x = lastPct(h); if (x != null) { v += x / 100 * (s[3] || 0); n++; } });
    return { v: v, n: n };
  }
  function lastPct(h) {
    // latest quarter the company filed (full detail); null if the holder fell below 1% / exited there
    var D = S(), f = D.stocks[h[0]][5];
    for (var k = f.length - 1; k >= 0; k--) if (f[k] === 1) return h[1][k];
    return null;
  }
  function renderStars() {
    var D = S(), I = window.SHPI, Q = D.quarters, el = $("#t-superstar");
    if (!SS.built) {
      SS.built = true;
      el.innerHTML =
        '<div class="hero"><div><div class="eb">Named holders of 1%+ · quarterly filings</div><h1>What India\'s big investors <em>own right now.</em></h1><div class="asof" id="ssAsof"></div></div><div class="live"><i></i><span>Checked daily</span></div></div>' +
        '<div class="pulse" id="ssK"></div>' +
        '<div class="filters"><div class="bar"><div class="grp" id="ssV"><button type="button" data-v="ind">Individuals</button><button type="button" data-v="inst">Institutions</button><button type="button" data-v="moves">Latest moves</button></div>' +
        '<div class="grp"><input type="search" id="ssQ" placeholder="Search investor…"></div><div class="grp" id="ssSortG"><span class="lbl">Sort</span><select id="ssSort"><option value="v">Value now</option><option value="n">Holdings</option><option value="g">Net-worth change</option></select></div></div></div>' +
        '<div id="ssBody"></div>';
      $("#ssV").onclick = function (e) { var b = e.target.closest("[data-v]"); if (!b) return; SS.view = b.dataset.v; try { PK.haptic && PK.haptic("select"); } catch (x) { } renderStars(); };
      var tq; $("#ssQ").oninput = function (e) { clearTimeout(tq); tq = setTimeout(function () { SS.q = e.target.value.trim().toLowerCase(); renderStars(); }, 150); };
      $("#ssSort").onchange = function (e) { SS.sort = e.target.value; renderStars(); };
    }
    Array.prototype.forEach.call($("#ssV").children, function (b) { b.classList.toggle("on", b.dataset.v === SS.view); });
    $("#ssSortG").style.display = SS.view === "moves" ? "none" : "";
    $("#ssAsof").innerHTML = "Holdings as filed for quarters up to <b>" + ql(Q[Q.length - 1]) + "</b> · value at latest NSE close · built " + esc(I.built);
    var stars = I.inv.filter(function (e) { return e.st; });
    var lastQ = Q.length - 1, mv = I.moves.filter(function (m) { return m[5] === lastQ && ok(D.stocks[m[1]][0]); });
    var nNew = mv.filter(function (m) { return m[2] === "New"; }).length, nEx = mv.filter(function (m) { return m[2] === "Exited"; }).length;
    kpis($("#ssK"), [
      ["Investors tracked", I.inv.length, num, num(I.inv.filter(function (e) { return e.c === "Individual"; }).length) + " individuals · " + num(stars.length) + " well-known ★"],
      ["Moves in " + ql(Q[lastQ]), mv.length, num, "new, raised, cut or exited 1%+ stakes"],
      ["New 1%+ stakes", nNew, num, "first time on a register at 1%+", "up"],
      ["Exits / below 1%", nEx, num, "dropped off the 1%+ list", nEx ? "dn" : ""],
      ["Companies covered", D.stocks.filter(function (s) { return s[5][lastQ] === 1; }).length, num, "full filings parsed for " + ql(Q[lastQ])]
    ]);
    if (SS.view === "moves") return renderMoves(mv.length ? I.moves : []);
    var list = I.inv.filter(invOK).map(function (e, k) { var h = holdNow(e); return { e: e, v: h.v, n: h.n, g: e.nw[e.nw.length - 1] - e.nw[e.nw.length - 2] }; })
      .filter(function (x) { return x.n > 0 || !capOn(); });
    list.sort(function (a, b) { return SS.sort === "n" ? b.n - a.n || b.v - a.v : SS.sort === "g" ? b.g - a.g : (b.e.st - a.e.st) || b.v - a.v; });
    if (SS.sort !== "v") list.sort(function (a, b) { return SS.sort === "n" ? b.n - a.n || b.v - a.v : b.g - a.g; });
    var top = list[0];
    var title = !list.length ? "No investors match" : SS.view === "ind" ? (top.e.n + " leads with " + crf(top.v) + " across " + top.n + " stocks") : (top.e.n + ": " + crf(top.v) + " in " + top.n + " companies at 1%+");
    var shown = list.slice(0, 120);
    $("#ssBody").innerHTML = '<div class="box"><h4><span>' + esc(title) + '</span><small>' + num(list.length) + " investors · tap for portfolio</small></h4>" + capNote() +
      '<div class="ssgrid">' + shown.map(function (x, k) {
        var e = x.e, ii = I.inv.indexOf(e);
        return '<button type="button" class="sscard" data-inv="' + ii + '" style="animation-delay:' + Math.min(k, 20) * 30 + 'ms"><div class="t">' + (e.st ? '<span class="star">★</span> ' : "") + esc(e.n) + '</div><div class="note">' + esc(e.c) + " · " + x.n + " holding" + (x.n === 1 ? "" : "s") + '</div><div class="row"><b>' + crf(x.v) + "</b>" + (HAS && PK.spark ? PK.spark(e.nw, { w: 84, h: 24 }) : "") + "</div></button>";
      }).join("") + "</div>" + (list.length > shown.length ? '<div class="note">Showing the top 120 · search to find others</div>' : "") +
      howto("Every public shareholder who owned 1% or more of a company appears by name in its quarterly shareholding pattern. Names are grouped exactly as filed (mutual-fund schemes are grouped under their fund house). ★ marks well-known investors, whose different spellings are merged. Value = latest % × today's market cap; the sparkline is the value of their 1%+ holdings at each quarter-end. Holdings under 1% are not disclosed, so a stake that falls below 1% shows as an exit.") +
      foot("Source: NSE shareholding pattern filings (SEBI LODR Reg 31); market cap NSE. Not every quarter is parsed yet for every company.") + "</div>";
  }
  function moveRow(m) {
    var D = S(), I = window.SHPI, e = I.inv[m[0]], s = D.stocks[m[1]], c = { New: "up", Raised: "up", Cut: "am", Exited: "dn" }[m[2]];
    return '<div class="li" data-inv="' + m[0] + '"><span>' + (e.st ? "★ " : "") + "<b>" + esc(e.n) + '</b> <span class="chip ' + c + '">' + (m[2] === "Exited" ? "Exited / below 1%" : m[2]) + "</span> " + esc(s[0]) + ' <span class="note">' + esc(s[2]) + "</span></span><span>" + (m[3] == null ? "–" : m[3].toFixed(2) + "%") + " → " + (m[4] == null ? "<1%" : m[4].toFixed(2) + "%") + ' <span class="note">' + esc((m[6] || "").slice(0, 6)) + "</span></span></div>";
  }
  function renderMoves(all) {
    var D = S(), I = window.SHPI;
    var rows = all.filter(function (m) { var e = I.inv[m[0]]; return ok(D.stocks[m[1]][0]) && (!SS.q || (e.n + " " + D.stocks[m[1]][0]).toLowerCase().indexOf(SS.q) >= 0); });
    var starsOnly = rows.filter(function (m) { return I.inv[m[0]].st || I.inv[m[0]].c === "Individual"; });
    var nn = starsOnly.filter(function (m) { return m[2] === "New"; }).length;
    $("#ssBody").innerHTML = '<div class="split" style="margin-top:0"><div class="box"><h4><span>' + esc(num(starsOnly.length) + " moves by individual investors, " + num(nn) + " of them new stakes") + '</span><small>newest filings first</small></h4>' + capNote() + '<div class="list" style="max-height:640px">' + (starsOnly.slice(0, 300).map(moveRow).join("") || '<div class="empty">No moves yet</div>') + "</div></div>" +
      '<div class="box"><h4><span>' + esc(num(rows.length - starsOnly.length) + " institutional moves") + '</span><small>funds, insurers, FPIs, companies</small></h4><div class="list" style="max-height:640px">' + (rows.filter(function (m) { return !(I.inv[m[0]].st || I.inv[m[0]].c === "Individual"); }).slice(0, 300).map(moveRow).join("") || '<div class="empty">No moves yet</div>') + "</div></div></div>" +
      howto("A move compares a company's latest parsed quarter with the quarter before. <b>New</b> = not on the 1%+ list before; <b>Raised / Cut</b> = stake changed by 0.05pp or more; <b>Exited / below 1%</b> = no longer listed (sold out or under the 1% disclosure line). Dates are filing dates.") +
      foot("Source: NSE shareholding pattern filings (XBRL), latest filings first.");
  }
  function openInvestor(ii) {
    var D = S(), I = window.SHPI, Q = D.quarters, e = I.inv[ii];
    var rows = e.h.map(function (h) {
      var s = D.stocks[h[0]], f = s[5], last = -1; for (var k = f.length - 1; k >= 0; k--) if (f[k] === 1) { last = k; break; }
      var prev = -1; for (k = last - 1; k >= 0; k--) if (f[k] === 1) { prev = k; break; }
      var a = last >= 0 ? h[1][last] : null, b = prev >= 0 ? h[1][prev] : null, flag;
      if (last < 0) flag = ["n/a", "sl"];
      else if (a != null && b == null) flag = prev < 0 ? ["Held", "sl"] : ["New", "up"];
      else if (a == null && b != null) flag = ["Exited / <1%", "dn"];
      else if (a == null) flag = ["Past", "sl"];
      else if (a - b >= 0.05) flag = ["Raised", "up"]; else if (b - a >= 0.05) flag = ["Cut", "am"]; else flag = ["Held", "sl"];
      return { s: s, h: h[1], a: a, flag: flag, v: a != null ? a / 100 * (s[3] || 0) : 0, okc: ok(s[0]) };
    }).filter(function (r) { return r.okc; }).sort(function (x, y) { return y.v - x.v; });
    var now = rows.filter(function (r) { return r.a != null; }), tot = now.reduce(function (t, r) { return t + r.v; }, 0);
    var sec = {}; now.forEach(function (r) { sec[r.s[2]] = (sec[r.s[2]] || 0) + r.v; });
    var secItems = Object.keys(sec).map(function (k) { return { label: k, value: tot ? sec[k] / tot * 100 : 0, tip: "<b>" + esc(k) + "</b><br>" + crf(sec[k]) + " · " + (tot ? (sec[k] / tot * 100).toFixed(1) : 0) + "%" }; }).sort(function (a, b) { return b.value - a.value; });
    var nw = e.nw, g = nw.length > 1 && nw[nw.length - 2] ? (nw[nw.length - 1] / nw[nw.length - 2] - 1) * 100 : null;
    var deals = e.dl || [];
    openModal('<div class="mhead"><div><h2>' + (e.st ? "★ " : "") + esc(e.n) + '</h2><div class="note">' + esc(e.c) + (e.al.length > 1 || e.al[0] !== e.n ? " · filed as: " + esc(e.al.join(" · ")) : "") + '</div></div><button class="x" onclick="closeM()">✕</button></div>' +
      '<div class="mstats"><div><div class="l">Value now (1%+ stakes)</div><div class="v">' + crf(tot) + '</div></div><div><div class="l">Holdings now</div><div class="v">' + now.length + '</div></div><div><div class="l">Value last quarter-end</div><div class="v">' + crf(nw[nw.length - 1]) + '</div></div><div><div class="l">Change vs prior quarter-end</div><div class="v ' + cls(g) + '">' + (g == null ? "–" : pp(g, 1) + "%") + '</div></div><div><div class="l">Deals & insider trades</div><div class="v">' + deals.length + "</div></div></div>" +
      (capOn() ? capNote() : "") +
      '<div class="split" style="margin-top:0"><div class="box"><h4><span>' + esc(nwVerdict(nw, Q)) + '</span><small>₹ Cr, 1%+ holdings at quarter-end prices</small></h4><div id="ssNw" style="height:230px"></div>' + foot("Source: NSE shareholding filings × NSE market cap at each quarter-end") + '</div>' +
      '<div class="box"><h4><span>' + esc(secItems.length ? "Biggest bet: " + secItems[0].label + " (" + secItems[0].value.toFixed(0) + "%)" : "Sector mix") + '</span><small>% of value now</small></h4><div id="ssSec"></div>' + foot("Sectors: Smart Money stock map") + "</div></div>" +
      '<div class="tablewrap" style="max-height:52vh"><table><thead><tr><th class="l">Company</th><th class="l">Move</th><th>Value ₹Cr</th>' + Q.map(function (q) { return "<th>" + ql(q) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return "<tr><td class='l'><b>" + esc(r.s[1]) + '</b> <span class="sy">' + esc(r.s[0]) + "</span>" + badges(r.s[0]) + '</td><td class="l"><span class="chip ' + r.flag[1] + '">' + r.flag[0] + "</span></td><td>" + (r.a != null ? num(r.v, r.v < 100 ? 1 : 0) : "–") + "</td>" + r.h.map(function (v, k) { return "<td>" + (v != null ? v.toFixed(2) : r.s[5][k] === 1 ? '<span class="note">&lt;1</span>' : '<span class="note">·</span>') + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div><div class=\"note\" style=\"margin-top:6px\">% of company's shares as filed. &lt;1 = company filed but this holder was not on its 1%+ list; · = filing not parsed yet or not filed.</div>" +
      '<div class="box" style="margin-top:14px"><h4><span>' + esc(deals.length ? deals.length + " bulk/block deals and insider trades under this name" : "No bulk/block deals or insider trades matched this name") + '</span><small><a href="../insider/" style="color:var(--acc)">Insider & Deals tracker →</a></small></h4>' +
      (deals.length ? '<div class="list">' + deals.map(function (d) { return '<div class="li" style="cursor:default"><span>' + esc(d[0]) + " · <b>" + esc(d[1]) + '</b> <span class="note">' + esc(d[4]) + '</span></span><span class="' + (/buy|acq/i.test(d[2]) ? "up" : "dn") + '">' + esc(d[2]) + " " + (d[3] != null ? crf(d[3]) : "") + "</span></div>"; }).join("") + "</div>" : "") +
      foot("Matched by exact name (well-known investors: name variants) against NSE/BSE bulk & block deals and SEBI PIT / SAST insider filings in the Insider & Deals tracker.") + "</div>");
    lineChart($("#ssNw"), [{ label: "Value", color: CAT[0], data: Q.map(function (q, k) { return { time: q, value: nw[k] }; }) }], function (v) { return "₹" + num(v) + " Cr"; });
    bars($("#ssSec"), secItems.slice(0, 12), function (v) { return v.toFixed(1) + "%"; }, null, { labelW: innerWidth < 500 ? 110 : 160 });
  }
  function nwVerdict(nw, Q) {
    var i0 = nw.findIndex(function (v) { return v > 0; }); if (i0 < 0) return "Net-worth trend";
    var a = nw[i0], b = nw[nw.length - 1];
    return "1%+ holdings " + (b >= a ? "grew" : "shrank") + " from " + crf(a) + " to " + crf(b) + " since " + ql(Q[i0]);
  }

  // ------------------------------------------------------------------ entry
  function skel(el) { if (!el.querySelector(".hero")) el.innerHTML = '<div class="skel" style="height:90px;margin-bottom:14px"></div><div class="skel"></div>'; }
  function fail(el) { el.innerHTML = '<div class="box"><div class="empty">Shareholding data unavailable (source unavailable or not built yet).</div></div>'; }
  window.SHPUI = {
    render: function (tab) {
      var el = $(tab === "shpchg" ? "#t-shpchg" : "#t-superstar");
      if (tab === "shpchg") {
        if (!window.SHP) skel(el);
        needData().then(function () { if (!window.SHP) return fail(el); renderChanges(); }).catch(function () { fail(el); });
      } else {
        if (!window.SHPI) skel(el);
        needInv().then(function () { if (!window.SHPI) return fail(el); renderStars(); }).catch(function () { fail(el); });
      }
    }
  };
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-inv]");
    if (t && window.SHPI) { e.preventDefault(); openInvestor(+t.dataset.inv); }
  });
  // styles specific to these tabs
  var css = document.createElement("style");
  css.textContent = ".howto{margin-top:10px}.howto summary{cursor:pointer;color:var(--acc);font-size:12px;min-height:32px;display:flex;align-items:center}.howto .note{line-height:1.6;padding:4px 0 2px}" +
    ".srcnote{font-size:11px;color:var(--dim);margin-top:8px}.ssgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:8px}" +
    ".sscard{display:block;text-align:left;white-space:normal;border-radius:14px;padding:10px 12px;background:linear-gradient(170deg,var(--card2),var(--card));border:1px solid var(--line);color:var(--text);min-height:84px;min-width:0;animation:rise .45s ease both}" +
    ".sscard:hover{border-color:rgba(47,227,181,.55);box-shadow:0 12px 30px -16px rgba(47,227,181,.35);transform:translateY(-3px)}.sscard .t{font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".sscard .row{display:flex;justify-content:space-between;align-items:center;margin-top:6px}.sscard .star,.star{color:var(--amber)}" +
    "#t-shpchg .hero,#t-superstar .hero{display:flex}#t-shpchg .filters,#t-superstar .filters{position:static}#shT .pk-tablewrap{max-height:70vh}" +
    "@media (max-width:760px){.ssgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.sscard .t{font-size:12.5px}#ssQ{width:100%}}@media (max-width:420px){.ssgrid{grid-template-columns:minmax(0,1fr)}}";
  document.head.appendChild(css);
})();
