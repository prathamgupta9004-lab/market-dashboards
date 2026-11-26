/* Pratham's dashboard UI kit (kit.js) -> window.PK. Plain ES2019, no build, no deps.
   Lightweight Charts is loaded on demand from PK.LWC_URL. See KIT.md for the full API. */
(function () {
  'use strict';
  var PK = window.PK || {};
  window.PK = PK;
  PK.version = '1.0.0';

  // ------------------------------------------------------------ utils
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  PK.store = store;
  function mq(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }
  function reduced() { return mq('(prefers-reduced-motion: reduce)'); }
  PK.reducedMotion = reduced;
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return s == null ? '' : String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  PK.esc = esc;
  function $(el) { return typeof el === 'string' ? document.querySelector(el) : el; }
  function isNum(v) { return typeof v === 'number' && isFinite(v); }

  // ------------------------------------------------------------ haptics
  var PATTERNS = { tap: 8, select: 12, success: [10, 40, 10], warn: [20, 60, 20], error: [30, 50, 30, 50, 30] };
  PK.hapticsOn = store.get('pk_haptics') !== '0';
  PK.setHaptics = function (on) {
    PK.hapticsOn = !!on;
    store.set('pk_haptics', on ? '1' : '0');
    if (on) PK.haptic('success');
    return PK.hapticsOn;
  };
  PK.haptic = function (kind) {
    if (!PK.hapticsOn || reduced()) return false;
    var nav = window.navigator;
    if (!nav || typeof nav.vibrate !== 'function') return false;
    // Chrome logs an error for vibrate() before the first user gesture; skip quietly instead
    if (nav.userActivation && !nav.userActivation.hasBeenActive) return false;
    try { return nav.vibrate(PATTERNS[kind] || PATTERNS.tap); } catch (e) { return false; }
  };

  // ------------------------------------------------------------ press feedback
  var PRESS_SEL = '.pk-press,button,[role=tab]';
  PK.press = function (rootEl) {
    var root = $(rootEl) || document;
    if (root.__pkPress) return root.__pkPress;
    function down(e) {
      if (e.button && e.button !== 0) return;
      var t = e.target && e.target.closest ? e.target.closest(PRESS_SEL) : null;
      if (!t || (root !== document && !root.contains(t)) || t.disabled) return;
      if (!reduced()) {
        t.classList.add('pk-pressing');
        clearTimeout(t.__pkPt);
        t.__pkPt = setTimeout(function () { t.classList.remove('pk-pressing'); }, 120);
      }
      PK.haptic('tap');
    }
    root.addEventListener('pointerdown', down, { passive: true });
    root.__pkPress = { destroy: function () { root.removeEventListener('pointerdown', down); root.__pkPress = null; } };
    return root.__pkPress;
  };

  // ------------------------------------------------------------ number formats (Indian grouping)
  var nfCache = {};
  function nf(dp) {
    var k = 'd' + dp;
    if (!nfCache[k]) nfCache[k] = new Intl.NumberFormat('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    return nfCache[k];
  }
  var DASH = '–';
  function N(v) { return v == null || v === '' || typeof v === 'boolean' ? NaN : Number(v); }
  PK.fmt = {
    num: function (v, dp) {
      v = N(v); if (!isFinite(v)) return DASH;
      return nf(dp == null ? (Math.abs(v) >= 1000 ? 0 : 2) : dp).format(v);
    },
    inr: function (v, dp) {
      v = N(v); if (!isFinite(v)) return DASH;
      return (v < 0 ? '-₹' : '₹') + nf(dp == null ? (Math.abs(v) >= 1000 ? 0 : 2) : dp).format(Math.abs(v));
    },
    cr: function (v, dp) {
      v = N(v); if (!isFinite(v)) return DASH;
      return (v < 0 ? '-₹' : '₹') + nf(dp == null ? (Math.abs(v) >= 100 ? 0 : 1) : dp).format(Math.abs(v)) + ' Cr';
    },
    pct: function (v, dp) {
      v = N(v); if (!isFinite(v)) return DASH;
      var s = nf(dp == null ? 1 : dp).format(Math.abs(v));
      return (/[1-9]/.test(s) ? (v > 0 ? '+' : '-') : '') + s + '%';
    },
    compact: function (v) { // 1.2 L / 3.4 Cr style for big counts
      v = N(v); if (!isFinite(v)) return DASH;
      var a = Math.abs(v), sg = v < 0 ? '-' : '';
      if (a >= 1e7) return sg + nf(a >= 1e9 ? 0 : 1).format(a / 1e7) + ' Cr';
      if (a >= 1e5) return sg + nf(1).format(a / 1e5) + ' L';
      return sg + nf(0).format(a);
    }
  };

  // ------------------------------------------------------------ count-up
  PK.countUp = function (el, value, o) {
    el = $(el); o = o || {};
    if (!el) return;
    var fmt = o.fmt || function (v) { return PK.fmt.num(v); };
    var to = Number(value), from = Number(o.from || 0), dur = o.dur == null ? 900 : o.dur;
    if (!isFinite(to) || reduced() || dur <= 0) { el.textContent = isFinite(to) ? fmt(to) : fmt(value); return; }
    var t0 = null;
    cancelAnimationFrame(el.__pkCu);
    function step(ts) {
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(p < 1 ? from + (to - from) * e : to);
      if (p < 1) el.__pkCu = requestAnimationFrame(step);
    }
    el.__pkCu = requestAnimationFrame(step);
  };

  // ------------------------------------------------------------ tooltip
  PK.tip = (function () {
    var node = null;
    function ensure() {
      if (!node) {
        node = document.createElement('div');
        node.className = 'pk-tip';
        node.setAttribute('role', 'tooltip');
        document.body.appendChild(node);
      }
      return node;
    }
    return {
      show: function (html, x, y) {
        var n = ensure();
        n.innerHTML = html;
        n.classList.add('on');
        var w = n.offsetWidth, h = n.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
        var l = x + 14, t = y + 14;
        if (l + w > vw - 8) l = Math.max(8, x - w - 14);
        if (t + h > vh - 8) t = Math.max(8, y - h - 14);
        n.style.transform = 'translate(' + Math.round(l) + 'px,' + Math.round(t) + 'px)';
      },
      hide: function () { if (node) node.classList.remove('on'); }
    };
  })();
  // a tap anywhere that is not on a tooltip target closes it (touch devices)
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest || !e.target.closest('[data-pk-tip]')) PK.tip.hide();
  }, { passive: true });
  window.addEventListener('scroll', function () { PK.tip.hide(); }, { passive: true, capture: true });

  // ------------------------------------------------------------ Lightweight Charts
  PK.LWC_VERSION = '5.2.1';
  PK.LWC_URL = 'https://cdn.jsdelivr.net/npm/lightweight-charts@5.2.1/dist/lightweight-charts.standalone.production.js';
  var lwcPromise = null;
  PK.loadLWC = function () {
    if (window.LightweightCharts) return Promise.resolve(window.LightweightCharts);
    if (lwcPromise) return lwcPromise;
    lwcPromise = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = PK.LWC_URL; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { window.LightweightCharts ? res(window.LightweightCharts) : rej(new Error('LWC missing')); };
      s.onerror = function () { lwcPromise = null; rej(new Error('Could not load ' + PK.LWC_URL)); };
      document.head.appendChild(s);
    });
    return lwcPromise;
  };

  var C = {
    text: 'rgba(238,245,242,.62)', grid: 'rgba(47,227,181,.06)', line: '#16302A', acc: '#2FE3B5', dn: '#FF5C6C',
    cross: 'rgba(47,227,181,.55)', label: '#1E4D3D'
  };
  function cssVar(name, fb) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; } catch (e) { return fb; }
  }
  function defaultPrice(v) {
    var a = Math.abs(v);
    return PK.fmt.num(v, a >= 100000 ? 0 : a >= 100 ? 2 : a >= 1 ? 2 : 4);
  }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function timeToDate(t) {
    if (t == null) return null;
    if (typeof t === 'number') return new Date(t * 1000);
    if (typeof t === 'string') return new Date(t + (t.length <= 10 ? 'T00:00:00Z' : ''));
    if (t.year) return new Date(Date.UTC(t.year, t.month - 1, t.day));
    return null;
  }
  function fmtTime(t, withTime) {
    var d = timeToDate(t); if (!d || isNaN(d)) return '';
    var s = ('0' + d.getUTCDate()).slice(-2) + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    if (withTime && typeof t === 'number') s += ' ' + ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2);
    return s;
  }
  PK.fmtTime = fmtTime;

  PK.chart = function (el, opts) {
    el = $(el); opts = opts || {};
    return PK.loadLWC().then(function (L) {
      if (opts.height) el.style.height = opts.height + 'px';
      else if (!el.clientHeight) el.style.height = '320px';
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      var line = cssVar('--line', C.line);
      var chart = L.createChart(el, {
        autoSize: true,
        layout: {
          background: { type: 'solid', color: 'transparent' }, textColor: C.text, fontSize: 11,
          fontFamily: cssVar('--font', 'Inter, "Segoe UI", system-ui, sans-serif'), attributionLogo: true,
          panes: { separatorColor: line, separatorHoverColor: 'rgba(47,227,181,.15)' }
        },
        grid: { vertLines: { color: C.grid }, horzLines: { color: C.grid } },
        crosshair: {
          mode: L.CrosshairMode ? L.CrosshairMode.Normal : 0,
          vertLine: { color: C.cross, labelBackgroundColor: C.label, style: 2 },
          horzLine: { color: C.cross, labelBackgroundColor: C.label, style: 2 }
        },
        rightPriceScale: { borderColor: line, scaleMargins: { top: 0.12, bottom: 0.08 } },
        leftPriceScale: { borderColor: line },
        timeScale: {
          borderColor: line, timeVisible: !!opts.timeVisible, secondsVisible: false,
          rightOffset: opts.rightOffset == null ? 4 : opts.rightOffset, fixLeftEdge: false, lockVisibleTimeRangeOnResize: true
        },
        handleScale: { pinch: true, mouseWheel: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        kineticScroll: { touch: true, mouse: false },
        trackingMode: { exitMode: L.TrackingModeExitMode ? L.TrackingModeExitMode.OnNextTap : 1 },
        localization: {
          locale: 'en-IN',
          priceFormatter: opts.priceFormatter || defaultPrice,
          timeFormatter: function (t) { return fmtTime(t, !!opts.timeVisible); }
        }
      });
      chart.__pkSeries = [];
      chart.__pkEl = el;
      return chart;
    });
  };

  function hexA(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  PK.lineSeries = function (chart, data, o) {
    o = o || {};
    var L = window.LightweightCharts, color = o.color || C.acc;
    var base = {
      lineWidth: o.width || 2, title: o.title || '', priceLineVisible: false, lastValueVisible: o.lastValue !== false,
      crosshairMarkerRadius: 4, crosshairMarkerBorderColor: color, crosshairMarkerBackgroundColor: '#03140E',
      lineStyle: o.dashed ? 2 : 0
    };
    if (o.priceScaleId) base.priceScaleId = o.priceScaleId;
    if (o.priceFormat) base.priceFormat = o.priceFormat;
    var s;
    if (o.area) {
      base.lineColor = color; base.topColor = hexA(color, 0.26); base.bottomColor = hexA(color, 0);
      s = chart.addSeries(L.AreaSeries, base, o.pane || 0);
    } else {
      base.color = color;
      s = chart.addSeries(L.LineSeries, base, o.pane || 0);
    }
    s.setData(data || []);
    s.__pkColor = color; s.__pkTitle = o.title || '';
    chart.__pkSeries && chart.__pkSeries.push(s);
    return s;
  };
  PK.histSeries = function (chart, data, o) {
    o = o || {};
    var L = window.LightweightCharts, up = o.colorUp || hexA(C.acc, 0.75), dn = o.colorDown || hexA(C.dn, 0.75);
    var pane = o.pane || 0;
    var opt = { priceLineVisible: false, lastValueVisible: o.lastValue !== false, title: o.title || '', base: 0 };
    if (o.priceFormat) opt.priceFormat = o.priceFormat;
    if (!pane && !o.priceScaleId) opt.priceScaleId = 'pkhist';
    else if (o.priceScaleId) opt.priceScaleId = o.priceScaleId;
    var s = chart.addSeries(L.HistogramSeries, opt, pane);
    if (opt.priceScaleId === 'pkhist') s.priceScale().applyOptions({ scaleMargins: { top: 0.72, bottom: 0 } });
    s.setData((data || []).map(function (d) {
      return d.color ? d : { time: d.time, value: d.value, color: d.value >= 0 ? up : dn };
    }));
    s.__pkColor = up; s.__pkTitle = o.title || '';
    chart.__pkSeries && chart.__pkSeries.push(s);
    return s;
  };

  PK.legend = function (el, chart, seriesList, fmt) {
    el = $(el) || chart.__pkEl;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    var box = document.createElement('div');
    box.className = 'pk-legend';
    el.appendChild(box);
    var items = (seriesList || []).map(function (x) {
      return x && x.series ? x : { series: x, label: x.__pkTitle, color: x.__pkColor };
    });
    fmt = fmt || function (v) { return defaultPrice(v); };
    function val(d) { return d == null ? null : d.value != null ? d.value : d.close; }
    function draw(time, map) {
      var h = '<span class="dt">' + esc(fmtTime(time, typeof time === 'number')) + '</span>';
      items.forEach(function (it) {
        var d = map ? map.get(it.series) : null;
        if (!map) { var arr = it.series.data(); d = arr.length ? arr[arr.length - 1] : null; }
        var v = val(d);
        h += '<span class="it"><i style="background:' + esc(it.color || C.acc) + '"></i>' + esc(it.label || '') +
          ' <b>' + (v == null ? DASH : esc(fmt(v, it))) + '</b></span>';
      });
      box.innerHTML = h;
    }
    function idle() {
      var last = null;
      items.forEach(function (it) { var a = it.series.data(); if (a.length) last = a[a.length - 1].time; });
      draw(last, null);
    }
    function move(p) {
      if (!p || p.time == null || !p.seriesData || !p.seriesData.size) idle(); else draw(p.time, p.seriesData);
    }
    chart.subscribeCrosshairMove(move);
    idle();
    return { refresh: idle, destroy: function () { chart.unsubscribeCrosshairMove(move); box.remove(); } };
  };

  var RANGE_DAYS = { '1W': 7, '2W': 14, '1M': 31, '3M': 92, '6M': 183, 'YTD': -1, '1Y': 366, '2Y': 731, '3Y': 1096, '5Y': 1827, '10Y': 3653, 'MAX': 0 };
  PK.rangeChips = function (el, chart, ranges, o) {
    el = $(el); o = o || {};
    ranges = (ranges || ['1M', '3M', '6M', '1Y', '3Y', 'Max']).map(function (r) {
      return typeof r === 'string' ? { label: r, days: RANGE_DAYS[r.toUpperCase()] } : r;
    });
    el.classList.add('pk-range');
    el.innerHTML = ranges.map(function (r, i) {
      return '<button type="button" class="pk-chip" data-i="' + i + '">' + esc(r.label) + '</button>';
    }).join('');
    function extent() {
      var lo = null, hi = null, sample = null;
      (chart.__pkSeries || []).forEach(function (s) {
        var a = s.data(); if (!a.length) return;
        var f = timeToDate(a[0].time), l = timeToDate(a[a.length - 1].time);
        if (lo == null || f < lo) lo = f;
        if (hi == null || l > hi) { hi = l; sample = a[a.length - 1].time; }
      });
      return { lo: lo, hi: hi, sample: sample };
    }
    function toT(d, sample) {
      if (typeof sample === 'number') return Math.floor(d.getTime() / 1000);
      if (sample && sample.year) return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
      return d.toISOString().slice(0, 10);
    }
    function set(label, silent) {
      var i = -1;
      ranges.forEach(function (r, k) { if (String(r.label).toUpperCase() === String(label).toUpperCase()) i = k; });
      if (i < 0) return;
      var r = ranges[i], ex = extent();
      Array.prototype.forEach.call(el.children, function (b, k) { b.classList.toggle('on', k === i); });
      if (!silent) PK.haptic('select');
      if (!ex.hi || !r.days) { chart.timeScale().fitContent(); return; }
      var from = r.days === -1 ? new Date(Date.UTC(ex.hi.getUTCFullYear(), 0, 1)) : new Date(ex.hi.getTime() - r.days * 864e5);
      if (from <= ex.lo) { chart.timeScale().fitContent(); return; }
      try { chart.timeScale().setVisibleRange({ from: toT(from, ex.sample), to: toT(ex.hi, ex.sample) }); }
      catch (e) { chart.timeScale().fitContent(); }
      if (o.onChange) o.onChange(r.label);
    }
    function click(e) { var b = e.target.closest('button[data-i]'); if (b) set(ranges[+b.dataset.i].label); }
    el.addEventListener('click', click);
    if (o.active) setTimeout(function () { set(o.active, true); }, 0);
    return { set: set, destroy: function () { el.removeEventListener('click', click); el.innerHTML = ''; } };
  };

  // ------------------------------------------------------------ sparkline (string)
  PK.spark = function (values, o) {
    o = o || {};
    var w = o.w || 80, h = o.h || 24, pad = 2;
    var v = (values || []).filter(isNum);
    if (v.length < 2) return '<svg class="pk-spark" width="' + w + '" height="' + h + '"></svg>';
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), rg = hi - lo || 1;
    var color = o.color || (v[v.length - 1] >= v[0] ? C.acc : C.dn);
    var pts = v.map(function (y, i) {
      return [(pad + i * (w - 2 * pad) / (v.length - 1)).toFixed(1), (h - pad - (y - lo) / rg * (h - 2 * pad)).toFixed(1)];
    });
    var d = 'M' + pts.map(function (p) { return p.join(','); }).join('L');
    var id = 'pks' + Math.random().toString(36).slice(2, 8), last = pts[pts.length - 1];
    var fill = o.fill === false ? '' :
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".28"/>' +
      '<stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + d + 'L' + last[0] + ',' + h + 'L' + pts[0][0] + ',' + h + 'Z" fill="url(#' + id + ')"/>';
    return '<svg class="pk-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + fill +
      '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + (o.width || 1.5) + '" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2" fill="' + color + '"/></svg>';
  };

  // ------------------------------------------------------------ svg bars
  var svgBarId = 0;
  PK.svgBars = function (el, items, o) {
    el = $(el); o = o || {};
    var id = 'pkb' + (++svgBarId), ro = null, data = items || [];
    var fmt = o.fmt || function (v) { return PK.fmt.num(v, 1); };
    el.classList.add('pk-bars');
    function tipHtml(it) {
      return it.tip || ('<b>' + esc(it.label) + '</b><br><span class="m">' + esc(o.valueLabel || 'Value') + '</span> ' + esc(fmt(it.value, it)));
    }
    function text(x, y, s, anchor, cls, extra) {
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + anchor + '"' + (cls ? ' class="' + cls + '"' : '') +
        (extra || '') + '>' + esc(s) + '</text>';
    }
    function trunc(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
    function render() {
      var W = Math.max(120, el.clientWidth || 300), vals = data.map(function (d) { return +d.value || 0; });
      var max = o.max != null ? o.max : Math.max(0, Math.max.apply(null, vals.concat([0])));
      var min = o.min != null ? o.min : Math.min(0, Math.min.apply(null, vals.concat([0])));
      if (max === min) max = min + 1;
      var stagger = reduced() ? 0 : (o.stagger == null ? Math.min(45, 600 / Math.max(1, data.length)) : o.stagger);
      var defs = '<defs><linearGradient id="' + id + 'u" x1="0" y1="0" x2="' + (o.vertical ? '0' : '1') + '" y2="' + (o.vertical ? '1' : '0') + '">' +
        (o.vertical ? '<stop offset="0" stop-color="#2FE3B5"/><stop offset="1" stop-color="#10B981"/>' : '<stop offset="0" stop-color="#10B981"/><stop offset="1" stop-color="#2FE3B5"/>') +
        '</linearGradient><linearGradient id="' + id + 'd" x1="' + (o.vertical ? '0' : '1') + '" y1="0" x2="0" y2="' + (o.vertical ? '1' : '0') + '">' +
        (o.vertical ? '<stop offset="0" stop-color="#C93A4B"/><stop offset="1" stop-color="#FF5C6C"/>' : '<stop offset="0" stop-color="#C93A4B"/><stop offset="1" stop-color="#FF5C6C"/>') +
        '</linearGradient></defs>';
      var out = '', H;
      function fillFor(it, pos) { return it.color || (pos ? (o.colorUp || 'url(#' + id + 'u)') : (o.colorDown || 'url(#' + id + 'd)')); }
      if (!o.vertical) {
        var bh = o.barH || 18, gap = o.gap == null ? 8 : o.gap, labW = o.labelW != null ? Math.min(o.labelW, Math.round(W * 0.42)) : Math.min(170, Math.round(W * 0.34));
        var valW = 56, x0 = labW + 8, span = Math.max(40, W - x0 - valW - (min < 0 ? valW : 0));
        var xL = x0 + (min < 0 ? valW : 0), scale = span / (max - min), zx = xL + (0 - min) * scale;
        H = data.length * (bh + gap) + gap;
        data.forEach(function (it, i) {
          var v = +it.value || 0, y = gap / 2 + i * (bh + gap), pos = v >= 0;
          var w = Math.max(v === 0 ? 0 : 1.5, Math.abs(v) * scale), x = pos ? zx : zx - w;
          out += text(labW, y + bh / 2 + 4, trunc(it.label, Math.max(6, Math.floor(labW / 6.6))), 'end', 'lab');
          out += '<rect class="bar ' + (pos ? 'pos' : 'neg') + '" data-i="' + i + '" data-pk-tip x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) +
            '" height="' + bh + '" rx="' + Math.min(6, bh / 2) + '" fill="' + fillFor(it, pos) + '" style="animation-delay:' + Math.round(i * stagger) + 'ms"/>';
          if (o.values !== false) out += text(pos ? x + w + 6 : x - 6, y + bh / 2 + 4, fmt(v, it), pos ? 'start' : 'end', 'val', ' style="animation-delay:' + Math.round(i * stagger + 300) + 'ms"');
        });
        if (min < 0) out += '<line class="zero" x1="' + zx.toFixed(1) + '" x2="' + zx.toFixed(1) + '" y1="0" y2="' + H + '"/>';
        out = '<g class="h">' + out + '</g>';
      } else {
        H = o.height || 220;
        var top = 18, bottom = 22 + (min < 0 ? 18 : 0), n = Math.max(1, data.length), slot = W / n;
        var bw = Math.max(3, Math.min(o.barW || 42, slot * 0.68)), sc = (H - top - bottom) / (max - min), zy = top + max * sc;
        var every = Math.max(1, Math.ceil(n * 46 / W));
        data.forEach(function (it, i) {
          var v = +it.value || 0, pos = v >= 0, hgt = Math.max(v === 0 ? 0 : 1.5, Math.abs(v) * sc);
          var cx = slot * i + slot / 2, x = cx - bw / 2, y = pos ? zy - hgt : zy;
          out += '<rect class="bar ' + (pos ? 'pos' : 'neg') + '" data-i="' + i + '" data-pk-tip x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) +
            '" height="' + hgt.toFixed(1) + '" rx="' + Math.min(5, bw / 3) + '" fill="' + fillFor(it, pos) + '" style="animation-delay:' + Math.round(i * stagger) + 'ms"/>';
          if (o.values !== false && slot >= 30) out += text(cx, pos ? y - 5 : y + hgt + 13, fmt(v, it), 'middle', 'val', ' style="animation-delay:' + Math.round(i * stagger + 300) + 'ms"');
          if (i % every === 0) out += text(cx, H - 6, trunc(it.label, Math.max(3, Math.floor(slot * every / 6.5))), 'middle', 'lab');
        });
        out += '<line class="zero" x1="0" x2="' + W + '" y1="' + zy.toFixed(1) + '" y2="' + zy.toFixed(1) + '"/>';
        out = '<g class="v">' + out + '</g>';
      }
      el.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img"' +
        (o.title ? ' aria-label="' + esc(o.title) + '"' : '') + '>' + defs + out + '</svg>';
      el.__pkW = W;
    }
    function itemAt(e) { var r = e.target.closest && e.target.closest('rect.bar'); return r ? data[+r.getAttribute('data-i')] : null; }
    function over(e) { var it = itemAt(e); if (it) PK.tip.show(tipHtml(it), e.clientX, e.clientY); else PK.tip.hide(); }
    function leave() { PK.tip.hide(); }
    function click(e) {
      var it = itemAt(e); if (!it) return;
      if (e.pointerType !== 'mouse') PK.tip.show(tipHtml(it), e.clientX, e.clientY);
      PK.haptic('tap');
      if (o.onClick) o.onClick(it, e);
    }
    el.addEventListener('pointermove', over);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointerup', click);
    render();
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () { if (Math.abs((el.clientWidth || 0) - (el.__pkW || 0)) > 4) render(); });
      ro.observe(el);
    }
    return {
      update: function (next) { data = next || []; render(); },
      destroy: function () {
        if (ro) ro.disconnect();
        el.removeEventListener('pointermove', over); el.removeEventListener('pointerleave', leave); el.removeEventListener('pointerup', click);
        el.innerHTML = '';
      }
    };
  };

  // ------------------------------------------------------------ downloads / clipboard
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  PK.download = download;
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }
  PK.copy = copyText;
  PK.tvSymbol = function (sym) { return 'NSE:' + String(sym).trim().toUpperCase().replace(/[&-]/g, '_'); };
  PK.tvLists = function (symbols, size) {
    size = size || 30;
    var seen = {}, list = [];
    (symbols || []).forEach(function (s) { if (!s) return; var t = PK.tvSymbol(s); if (!seen[t]) { seen[t] = 1; list.push(t); } });
    var chunks = [];
    for (var i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
    return { all: list, chunks: chunks };
  };

  // ------------------------------------------------------------ table
  var ICON_DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>';
  var ICON_TV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>';
  PK.table = function (el, cfg) {
    el = $(el); cfg = cfg || {};
    var cols = cfg.columns || [], symKey = cfg.symbolKey || 's', pageSize = cfg.pageSize || 100;
    var noun = cfg.countLabel || 'stocks';
    var st = {
      rows: cfg.rows || [], view: [], q: '', preset: -1, shown: pageSize,
      key: cfg.sortKey || null, dir: cfg.sortDir === 'asc' ? 1 : cfg.sortDir === 'desc' ? -1 : null
    };
    if (st.key && st.dir == null) { var kc = colBy(st.key); st.dir = kc && kc.num ? -1 : 1; }
    var hay = new WeakMap();
    function colBy(k) { for (var i = 0; i < cols.length; i++) if (cols[i].key === k) return cols[i]; return null; }
    function alignOf(c) { return c.align ? c.align.charAt(0) : c.num ? 'r' : 'l'; }
    var presets = cfg.presets || [];
    var tv = cfg.tvExport !== false;
    var capKey = cfg.capKey || null;
    el.classList.add('pk-tbl');
    el.innerHTML =
      (capKey ? '<div class="pk-capnote" hidden></div>' : '') +
      '<div class="pk-tbar">' +
      (cfg.search !== false ? '<input type="search" class="pk-search" placeholder="' + esc(cfg.placeholder || 'Search…') + '" aria-label="Search table">' : '') +
      (presets.length ? '<div class="pk-chips pk-presets">' + presets.map(function (p, i) {
        return '<button type="button" class="pk-chip" data-p="' + i + '">' + esc(p.label) + '</button>';
      }).join('') + '</div>' : '') +
      '<span class="pk-sp"></span><span class="pk-note" hidden></span><span class="pk-count"></span>' +
      (cfg.csvName !== false ? '<button type="button" class="pk-btn pk-csv" title="Download the filtered rows as CSV">' + ICON_DL + 'CSV</button>' : '') +
      (tv ? '<button type="button" class="pk-btn pk-tv" title="Download NSE: watchlists (30 per file, TradingView free limit) and copy the full list">' + ICON_TV + 'TradingView</button>' : '') +
      '</div><div class="pk-tablewrap"><table class="pk-table"><thead><tr>' +
      cols.map(function (c) {
        return '<th data-k="' + esc(c.key) + '" class="' + alignOf(c) + '" tabindex="0" scope="col"' +
          (c.width ? ' style="width:' + (typeof c.width === 'number' ? c.width + 'px' : esc(c.width)) + '"' : '') +
          (c.title ? ' title="' + esc(c.title) + '"' : '') + '>' + (c.label == null ? esc(c.key) : c.label) + '<span class="ar"></span></th>';
      }).join('') +
      '</tr></thead><tbody></tbody></table></div><div class="pk-more" hidden><button type="button" class="pk-btn"></button></div>';
    var qEl = el.querySelector('.pk-search'), tbody = el.querySelector('tbody'), thead = el.querySelector('thead');
    var countEl = el.querySelector('.pk-count'), moreWrap = el.querySelector('.pk-more'), moreBtn = moreWrap.firstChild;
    var noteEl = el.querySelector('.pk-note'), wrap = el.querySelector('.pk-tablewrap');
    var capNote = el.querySelector('.pk-capnote'), capHidden = 0, capUnknown = 0;

    function hayOf(r) {
      var h = hay.get(r);
      if (h == null) {
        h = cols.map(function (c) { var v = r[c.key]; return v == null ? '' : String(v); }).join(' ').toLowerCase();
        if (r[symKey] != null) h += ' ' + String(r[symKey]).toLowerCase();
        hay.set(r, h);
      }
      return h;
    }
    function cmp(a, b) {
      var k = st.key, c = colBy(k), x = a[k], y = b[k];
      var nx = x == null || x === '' || (typeof x === 'number' && isNaN(x)), ny = y == null || y === '' || (typeof y === 'number' && isNaN(y));
      if (nx && ny) return 0; if (nx) return 1; if (ny) return -1; // blanks always last
      if (c && c.sortVal) { x = c.sortVal(a); y = c.sortVal(b); }
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * st.dir;
      return String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' }) * st.dir;
    }
    function compute() {
      var q = st.q.trim().toLowerCase(), terms = q ? q.split(/\s+/) : [], pf = st.preset >= 0 ? presets[st.preset].filter : null;
      var capOn = capKey && !PK.capIsDefault();
      capHidden = 0; capUnknown = 0;
      st.view = st.rows.filter(function (r) {
        if (pf && !pf(r)) return false;
        if (capOn && !PK.capOK(r[capKey])) {
          capHidden++;
          if (!PK.capInfo(r[capKey])) capUnknown++;
          return false;
        }
        if (!terms.length) return true;
        var h = hayOf(r);
        for (var i = 0; i < terms.length; i++) if (h.indexOf(terms[i]) < 0) return false;
        return true;
      });
      if (st.key) st.view.sort(cmp);
    }
    function cell(c, r) {
      var v = r[c.key], cls = alignOf(c);
      var extra = typeof c.cls === 'function' ? c.cls(v, r) : c.cls;
      if (extra) cls += ' ' + extra;
      var html = c.fmt ? c.fmt(v, r) : (v == null || v === '' ? '<span class="dim">' + DASH + '</span>' : esc(v));
      return '<td class="' + cls + '">' + (html == null ? '' : html) + '</td>';
    }
    function paint() {
      var n = Math.min(st.shown, st.view.length), h = '';
      for (var i = 0; i < n; i++) {
        var r = st.view[i];
        h += '<tr data-i="' + i + '"' + (cfg.rowClick ? ' class="click"' : '') + '>';
        for (var j = 0; j < cols.length; j++) h += cell(cols[j], r);
        h += '</tr>';
      }
      if (!st.view.length) h = '<tr><td colspan="' + cols.length + '" class="pk-empty">' + esc(cfg.empty || 'No rows match.') + '</td></tr>';
      tbody.innerHTML = h;
      countEl.innerHTML = '<b>' + PK.fmt.num(st.view.length, 0) + '</b> ' + esc(noun) +
        (st.view.length !== st.rows.length ? ' <span class="dim">of ' + PK.fmt.num(st.rows.length, 0) + '</span>' : '');
      var left = st.view.length - n;
      moreWrap.hidden = left <= 0;
      if (left > 0) moreBtn.textContent = 'Show ' + Math.min(left, pageSize) + ' more · ' + PK.fmt.num(left, 0) + ' left';
      Array.prototype.forEach.call(thead.querySelectorAll('th'), function (th) {
        var on = th.getAttribute('data-k') === st.key;
        th.classList.toggle('sorted', on);
        th.setAttribute('aria-sort', on ? (st.dir > 0 ? 'ascending' : 'descending') : 'none');
        th.lastChild.textContent = on ? (st.dir > 0 ? '▲' : '▼') : '';
      });
      if (capNote) {
        var on = !PK.capIsDefault();
        capNote.hidden = !on;
        if (on) capNote.innerHTML = 'Market cap filter: <b>' + esc(PK.capSummary()) + '</b> · ' + PK.fmt.num(capHidden, 0) + ' hidden' +
          (capUnknown ? ' (' + PK.fmt.num(capUnknown, 0) + ' not in the universe)' : '') + ' · <button type="button" class="pk-linkbtn pk-capreset">reset</button>';
      }
      if (presets.length) Array.prototype.forEach.call(el.querySelectorAll('.pk-presets .pk-chip'), function (b) {
        b.classList.toggle('on', +b.getAttribute('data-p') === st.preset);
      });
    }
    function refresh(keepShown) { compute(); if (!keepShown) st.shown = pageSize; paint(); }
    function sortBy(k) {
      var c = colBy(k); if (!c || c.sortable === false) return;
      if (st.key === k) st.dir = -st.dir; else { st.key = k; st.dir = c.num ? -1 : 1; }
      PK.haptic('select');
      refresh();
      wrap.scrollTop = 0;
    }
    function flash(msg) {
      noteEl.textContent = msg; noteEl.hidden = false;
      clearTimeout(noteEl.__t); noteEl.__t = setTimeout(function () { noteEl.hidden = true; }, 3500);
    }
    function baseName() { return String(cfg.csvName || 'table').replace(/\.csv$/i, ''); }
    function csv() {
      var q = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var cc = cols.filter(function (c) { return c.csv !== false; });
      var lines = [cc.map(function (c) { return q(c.csvLabel || String(c.label == null ? c.key : c.label).replace(/<[^>]+>/g, '')); }).join(',')];
      st.view.forEach(function (r) { lines.push(cc.map(function (c) { return q(c.csvVal ? c.csvVal(r) : r[c.key]); }).join(',')); });
      download(baseName() + '.csv', '﻿' + lines.join('\n'), 'text/csv;charset=utf-8');
      PK.haptic('success');
      flash('CSV · ' + st.view.length + ' rows');
    }
    function tvExport() {
      var L = PK.tvLists(st.view.map(function (r) { return r[symKey]; }), 30);
      if (!L.all.length) { PK.haptic('warn'); flash('No symbols'); return; }
      L.chunks.forEach(function (ch, i) {
        setTimeout(function () {
          download(baseName() + '_tradingview' + (L.chunks.length > 1 ? '_' + (i + 1) : '') + '.txt', ch.join(','));
        }, i * 300);
      });
      copyText(L.all.join(',')).then(function (ok) {
        flash((ok ? 'Copied ' : '') + L.all.length + ' symbols · ' + L.chunks.length + ' file' + (L.chunks.length > 1 ? 's' : '') + ' of ≤30');
      });
      PK.haptic('success');
    }
    var onInput = function () { clearTimeout(onInput.t); onInput.t = setTimeout(function () { st.q = qEl.value; refresh(); }, 120); };
    function onClick(e) {
      var t = e.target;
      var th = t.closest('th[data-k]'); if (th) { sortBy(th.getAttribute('data-k')); return; }
      var p = t.closest('.pk-presets .pk-chip');
      if (p) { var i = +p.getAttribute('data-p'); st.preset = st.preset === i ? -1 : i; PK.haptic('select'); refresh(); return; }
      if (t.closest('.pk-capreset')) { PK.capSet(null); return; }
      if (t.closest('.pk-csv')) { csv(); return; }
      if (t.closest('.pk-tv')) { tvExport(); return; }
      if (t.closest('.pk-more')) { st.shown += pageSize; paint(); return; }
      var tr = t.closest('tbody tr[data-i]');
      if (tr && cfg.rowClick && !t.closest('a,button,input')) { PK.haptic('tap'); cfg.rowClick(st.view[+tr.getAttribute('data-i')], e); }
    }
    function onKey(e) {
      var th = e.target.closest && e.target.closest('th[data-k]');
      if (th && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sortBy(th.getAttribute('data-k')); }
    }
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
    if (qEl) qEl.addEventListener('input', onInput);
    if (cfg.preset != null) st.preset = cfg.preset;
    function onCap() { refresh(); }
    if (capKey) document.addEventListener('pk:cap', onCap);
    refresh();
    return {
      update: function (rows) { st.rows = rows || []; hay = new WeakMap(); refresh(); },
      setPreset: function (i) { st.preset = i == null ? -1 : i; refresh(); },
      search: function (q) { st.q = q || ''; if (qEl) qEl.value = st.q; refresh(); },
      sort: function (k, dir) { st.key = k; st.dir = dir === 'asc' ? 1 : -1; refresh(); },
      rows: function () { return st.view.slice(); },
      destroy: function () {
        el.removeEventListener('click', onClick); el.removeEventListener('keydown', onKey);
        if (qEl) qEl.removeEventListener('input', onInput);
        if (capKey) document.removeEventListener('pk:cap', onCap);
        el.innerHTML = ''; el.classList.remove('pk-tbl');
      }
    };
  };

  // ------------------------------------------------------------ tabs
  PK.tabs = function (el, o) {
    el = $(el); o = o || {};
    el.classList.add('pk-tabs');
    el.setAttribute('role', 'tablist');
    var btns = Array.prototype.slice.call(el.querySelectorAll('[data-tab]'));
    var scope = o.root ? $(o.root) : document;
    btns.forEach(function (b) { b.setAttribute('role', 'tab'); if (b.tagName === 'BUTTON') b.type = 'button'; });
    var names = btns.map(function (b) { return b.getAttribute('data-tab'); });
    var cur = null;
    function fromHash() { var m = /(?:^#|&)tab=([^&]+)/.exec(location.hash || ''); return m ? decodeURIComponent(m[1]) : null; }
    function set(name, user) {
      if (names.indexOf(name) < 0 || name === cur) return;
      var prev = cur; cur = name;
      btns.forEach(function (b) {
        var on = b.getAttribute('data-tab') === name;
        b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      });
      Array.prototype.forEach.call(scope.querySelectorAll('[data-panel]'), function (p) {
        var pn = p.getAttribute('data-panel');
        if (names.indexOf(pn) < 0) return; // panel belongs to another tab bar
        var on = pn === name;
        p.hidden = !on;
        if (on && prev != null) { p.classList.remove('pk-panel-in'); void p.offsetWidth; p.classList.add('pk-panel-in'); }
      });
      if (o.storeKey) store.set(o.storeKey, name);
      if (user) {
        PK.haptic('select');
        if (o.hash !== false) {
          var h = location.hash || '';
          var nh = /(?:^#|&)tab=/.test(h) ? h.replace(/((?:^#|&)tab=)[^&]*/, '$1' + encodeURIComponent(name)) : (h && h !== '#' ? null : '#tab=' + encodeURIComponent(name));
          if (nh) try { history.replaceState(null, '', nh); } catch (e) { /* file:// */ }
        }
      }
      if (o.onChange) o.onChange(name, prev);
    }
    function click(e) { var b = e.target.closest('[data-tab]'); if (b && el.contains(b)) set(b.getAttribute('data-tab'), true); }
    function key(e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var i = names.indexOf(cur) + (e.key === 'ArrowRight' ? 1 : -1);
      i = (i + names.length) % names.length;
      set(names[i], true); btns[i].focus();
    }
    function hashch() { var h = fromHash(); if (h) set(h, false); }
    el.addEventListener('click', click);
    el.addEventListener('keydown', key);
    window.addEventListener('hashchange', hashch);
    var onBtn = btns.filter(function (b) { return b.classList.contains('on'); })[0];
    var start = [fromHash(), o.storeKey ? store.get(o.storeKey) : null, o.initial, onBtn && onBtn.getAttribute('data-tab'), names[0]]
      .filter(function (n) { return n && names.indexOf(n) >= 0; })[0];
    btns.forEach(function (b) { b.classList.remove('on'); });
    set(start, false);
    return {
      set: function (n) { set(n, false); }, get: function () { return cur; },
      destroy: function () { el.removeEventListener('click', click); el.removeEventListener('keydown', key); window.removeEventListener('hashchange', hashch); }
    };
  };


  // ------------------------------------------------------------ global market-cap filter (PK_UNIVERSE)
  var CAP_KEY = 'pk_cap';
  function capClean(c) {
    c = c || {};
    var n = function (v) { v = v == null || v === '' ? NaN : Number(v); return isFinite(v) && v > 0 ? Math.round(v) : null; };
    var out = {
      min: n(c.min), max: n(c.max), cat: c.cat === 'L' || c.cat === 'M' || c.cat === 'S' ? c.cat : null,
      sme: c.sme !== false, exch: c.exch === 'nse' || c.exch === 'bse' ? c.exch : 'all'
    };
    if (out.min != null && out.max != null && out.min > out.max) { var t = out.min; out.min = out.max; out.max = t; }
    return out;
  }
  function capLoad() { try { return capClean(JSON.parse(store.get(CAP_KEY) || 'null')); } catch (e) { return capClean(null); } }
  PK.cap = capLoad();
  PK.capIsDefault = function (c) {
    c = c || PK.cap;
    return c.min == null && c.max == null && !c.cat && c.sme !== false && (c.exch || 'all') === 'all';
  };
  var uniRev = null;
  function uni() { return window.PK_UNIVERSE && window.PK_UNIVERSE.s ? window.PK_UNIVERSE : null; }
  function onBse(key) { // NSE symbol that is also listed on BSE?
    var U = uni(); if (!U) return false;
    if (!uniRev) { uniRev = {}; var b = U.b || {}; for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) uniRev[b[k]] = 1; }
    return !!uniRev[key];
  }
  PK.capInfo = function (key) {
    var U = uni(); if (!U || key == null || key === '') return null;
    var k = String(key).trim().toUpperCase().replace(/^NSE:/, ''), e = U.s[k], code = null, m;
    if (!e) {
      if ((m = /^BSE:\s*(\d+)$/.exec(k))) code = m[1]; else if (/^\d{5,6}$/.test(k)) code = k;
      if (code) {
        var alias = U.b && U.b[code];
        if (alias && U.s[alias]) { k = alias; e = U.s[alias]; } else { k = 'BSE:' + code; e = U.s[k]; }
      }
    }
    if (!e) return null;
    var fl = e[1] || 'S', bseOnly = k.indexOf('BSE:') === 0;
    return { key: k, mcap: e[0], cat: fl.charAt(0), sme: fl.indexOf('s') > 0, est: fl.indexOf('b') > 0,
      nse: !bseOnly, bse: bseOnly || onBse(k) };
  };
  PK.capMcap = function (key) { var i = PK.capInfo(key); return i ? i.mcap : null; };
  PK.capStats = { unknown: 0 };
  function capPass(i, c) {
    if (c.cat && i.cat !== c.cat) return false;
    if (c.min != null && i.mcap < c.min) return false;
    if (c.max != null && i.mcap >= c.max) return false;
    if (c.sme === false && i.sme) return false;
    if (c.exch === 'nse' && !i.nse) return false;
    if (c.exch === 'bse' && !i.bse) return false;
    return true;
  }
  PK.capOK = function (key, c) {
    c = c || PK.cap;
    if (PK.capIsDefault(c)) return true;
    var i = PK.capInfo(key);
    if (!i) { PK.capStats.unknown++; return false; }
    return capPass(i, c);
  };
  PK.capCount = function (c) {
    c = c || PK.cap;
    var U = uni(); if (!U) return 0;
    var n = 0, s = U.s;
    for (var k in s) {
      if (!Object.prototype.hasOwnProperty.call(s, k)) continue;
      var e = s[k], fl = e[1] || 'S', bo = k.indexOf('BSE:') === 0;
      if (capPass({ key: k, mcap: e[0], cat: fl.charAt(0), sme: fl.indexOf('s') > 0, nse: !bo, bse: bo || onBse(k) }, c)) n++;
    }
    return n;
  };
  function crShort(v) {
    if (v >= 100000) return '₹' + String(+(v / 100000).toFixed(1)) + 'L';
    if (v >= 1000) return '₹' + String(+(v / 1000).toFixed(1)) + 'k';
    return '₹' + v;
  }
  var CAT_NAME = { L: 'Largecaps', M: 'Midcaps', S: 'Smallcaps' };
  PK.capSummary = function (c) {
    c = c || PK.cap;
    if (PK.capIsDefault(c)) return 'All';
    var parts = [];
    if (c.cat) parts.push(CAT_NAME[c.cat]);
    if (c.min == null && c.max === 1000 && !c.cat) parts.push('Microcaps');
    else if (c.min != null && c.max != null) parts.push(crShort(c.min) + '–' + crShort(c.max).slice(1) + ' Cr');
    else if (c.min != null) parts.push(crShort(c.min) + ' Cr+');
    else if (c.max != null) parts.push('< ' + crShort(c.max) + ' Cr');
    if (c.sme === false) parts.push('no SME');
    if (c.exch !== 'all') parts.push(c.exch.toUpperCase() + ' only');
    return parts.join(' · ');
  };
  PK.capSet = function (next) {
    var c = next == null ? capClean(null) : capClean(Object.assign({}, PK.cap, next));
    PK.cap = c;
    store.set(CAP_KEY, JSON.stringify(c));
    PK.haptic('select');
    try { document.dispatchEvent(new CustomEvent('pk:cap', { detail: c })); } catch (e) { /* old browser */ }
    return c;
  };
  window.addEventListener('storage', function (e) { // another tab of the site changed the filter
    if (e.key !== CAP_KEY) return;
    PK.cap = capLoad();
    try { document.dispatchEvent(new CustomEvent('pk:cap', { detail: PK.cap })); } catch (x) { /* ignore */ }
  });
  PK.CAP_PRESETS = [
    { label: 'All', v: { min: null, max: null, cat: null } },
    { label: 'Large', sub: 'top 100', v: { min: null, max: null, cat: 'L' } },
    { label: 'Mid', sub: '101–250', v: { min: null, max: null, cat: 'M' } },
    { label: 'Small', sub: '251+', v: { min: null, max: null, cat: 'S' } },
    { label: 'Micro', sub: '< ₹1,000 Cr', v: { min: null, max: 1000, cat: null } },
    { label: '₹500 Cr+', v: { min: 500, max: null, cat: null } },
    { label: '₹1,000 Cr+', v: { min: 1000, max: null, cat: null } },
    { label: '₹5,000 Cr+', v: { min: 5000, max: null, cat: null } },
    { label: '₹20,000 Cr+', v: { min: 20000, max: null, cat: null } }
  ];
  var ICON_CAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
  PK.capFilter = function (el, o) {
    el = $(el); o = o || {};
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pk-btn pk-capbtn';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    el.appendChild(btn);
    var pop = null, back = null, inMin, inMax, countEl;
    function label() {
      btn.classList.toggle('act', !PK.capIsDefault());
      btn.innerHTML = ICON_CAP + '<span>' + (o.compact ? '' : 'Market cap: ') + '<b>' + esc(PK.capSummary()) + '</b></span><span class="car">▾</span>';
      btn.title = 'Market-cap filter, shared by every dashboard' + (window.PK_UNIVERSE ? ' · data as of ' + window.PK_UNIVERSE.asof : '');
    }
    function sync() {
      if (!pop) return;
      var c = PK.cap;
      Array.prototype.forEach.call(pop.querySelectorAll('[data-cp]'), function (b) {
        var v = PK.CAP_PRESETS[+b.getAttribute('data-cp')].v;
        b.classList.toggle('on', v.min === c.min && v.max === c.max && v.cat === c.cat);
      });
      Array.prototype.forEach.call(pop.querySelectorAll('[data-ex]'), function (b) { b.classList.toggle('on', b.getAttribute('data-ex') === c.exch); });
      pop.querySelector('.pk-sme').checked = c.sme !== false;
      if (document.activeElement !== inMin) inMin.value = c.min == null ? '' : c.min;
      if (document.activeElement !== inMax) inMax.value = c.max == null ? '' : c.max;
      countEl.innerHTML = uni() ? '<b>' + PK.fmt.num(PK.capCount(), 0) + '</b> companies match' : 'Universe data not loaded';
    }
    function build() {
      back = document.createElement('div');
      back.className = 'pk-capback';
      pop = document.createElement('div');
      pop.className = 'pk-cappop';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', 'Market-cap filter');
      pop.innerHTML =
        '<div class="pk-caphd"><b>Market cap</b><span class="pk-capsub">applies to every dashboard</span><button type="button" class="pk-capx" aria-label="Close">×</button></div>' +
        '<div class="pk-chips pk-cappre">' + PK.CAP_PRESETS.map(function (p, i) {
          return '<button type="button" class="pk-chip" data-cp="' + i + '">' + esc(p.label) + (p.sub ? ' <small>' + esc(p.sub) + '</small>' : '') + '</button>';
        }).join('') + '</div>' +
        '<div class="pk-caprow"><label>Min<span class="pk-capin"><input type="number" inputmode="numeric" min="0" step="100" class="pk-capmin" placeholder="0"><i>₹ Cr</i></span></label>' +
        '<span class="pk-capdash">–</span><label>Max<span class="pk-capin"><input type="number" inputmode="numeric" min="0" step="100" class="pk-capmax" placeholder="any"><i>₹ Cr</i></span></label></div>' +
        '<div class="pk-caprow pk-capopts"><label class="pk-switch"><input type="checkbox" class="pk-sme"><span></span>Include SME</label>' +
        '<div class="pk-seg" role="group" aria-label="Exchange"><button type="button" data-ex="all">All</button><button type="button" data-ex="nse">NSE</button><button type="button" data-ex="bse">BSE</button></div></div>' +
        '<div class="pk-capft"><span class="pk-capcount"></span><span class="pk-sp"></span><button type="button" class="pk-btn pk-capreset2">Reset</button><button type="button" class="pk-btn pri pk-capdone">Done</button></div>';
      document.body.appendChild(back);
      document.body.appendChild(pop);
      inMin = pop.querySelector('.pk-capmin'); inMax = pop.querySelector('.pk-capmax'); countEl = pop.querySelector('.pk-capcount');
      var t = null;
      function typed() {
        clearTimeout(t);
        t = setTimeout(function () { PK.capSet({ min: inMin.value, max: inMax.value, cat: null }); }, 350);
      }
      inMin.addEventListener('input', typed); inMax.addEventListener('input', typed);
      pop.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        if (b.hasAttribute('data-cp')) PK.capSet(PK.CAP_PRESETS[+b.getAttribute('data-cp')].v);
        else if (b.hasAttribute('data-ex')) PK.capSet({ exch: b.getAttribute('data-ex') });
        else if (b.classList.contains('pk-capreset2')) PK.capSet(null);
        else if (b.classList.contains('pk-capdone') || b.classList.contains('pk-capx')) close();
      });
      pop.querySelector('.pk-sme').addEventListener('change', function (e) { PK.capSet({ sme: e.target.checked }); });
      back.addEventListener('click', close);
    }
    function place() {
      if (!pop) return;
      if (window.innerWidth <= 640) { pop.style.left = ''; pop.style.top = ''; pop.classList.add('sheet'); return; }
      pop.classList.remove('sheet');
      var r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
      var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8), top = r.bottom + 8;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
      pop.style.left = left + 'px'; pop.style.top = top + 'px';
    }
    function open() {
      if (!pop) build();
      place();
      pop.classList.add('on'); back.classList.add('on');
      btn.setAttribute('aria-expanded', 'true');
      sync(); place();
      document.addEventListener('keydown', onEsc);
      window.addEventListener('resize', place);
    }
    function close() {
      if (!pop) return;
      pop.classList.remove('on'); back.classList.remove('on');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', place);
    }
    function onEsc(e) { if (e.key === 'Escape') close(); }
    function onCap(e) { label(); sync(); if (o.onChange) o.onChange(PK.cap, e); }
    btn.addEventListener('click', function () { if (pop && pop.classList.contains('on')) close(); else open(); });
    document.addEventListener('pk:cap', onCap);
    label();
    return {
      open: open, close: close, refresh: function () { label(); sync(); },
      destroy: function () {
        close(); document.removeEventListener('pk:cap', onCap);
        btn.remove(); if (pop) { pop.remove(); back.remove(); }
      }
    };
  };

  // ------------------------------------------------------------ risk / event badges
  var SHORT = { 'Stage I': 'I', 'Stage II': 'II', 'Stage III': 'III', 'Stage IV': 'IV', 'Stage V': 'V', 'Stage VI': 'VI', 'Stage 0': '0' };
  function stageOf(txt) {
    var m = /Stage\s+([0IVX]+)/.exec(txt || '');
    return m ? (SHORT['Stage ' + m[1]] || m[1]) : '';
  }
  PK.badgeList = function (symbol) {
    var B = window.PK_BADGES;
    if (!B || !B.s || symbol == null) return [];
    var sym = String(symbol).trim().toUpperCase().replace(/^NSE:/, '');
    var flags = B.s[sym]; if (!flags) return [];
    var det = (B.d && B.d[sym]) || {}, L = B.legend || {};
    return flags.map(function (f) {
      var lg = L[f] || { label: f, desc: '' }, d = det[f] || '', txt = lg.label;
      if (/^(asm-st|asm-lt|gsm|esm)$/.test(f)) { var sg = stageOf(d); if (sg) txt += ' ' + sg; }
      else if (f === 'results' && d) txt = 'Results ' + d;
      return { flag: f, text: txt, title: lg.label + (d ? ': ' + d : '') + (lg.desc ? ' · ' + lg.desc : '') };
    });
  };
  PK.badges = function (symbol, o) {
    o = o || {};
    var list = PK.badgeList(symbol);
    if (!list.length) return '';
    var max = o.max || 99, extra = list.length - max;
    return '<span class="pk-badges">' + list.slice(0, max).map(function (b) {
      return '<span class="pk-badge ' + b.flag + '" title="' + esc(b.title) + '">' + esc(b.text) + '</span>';
    }).join('') + (extra > 0 ? '<span class="pk-badge t2t" title="' + esc(list.slice(max).map(function (b) { return b.title; }).join('\n')) + '">+' + extra + '</span>' : '') + '</span>';
  };
  PK.badgeLegend = function (o) {
    o = o || {};
    var B = window.PK_BADGES, L = (B && B.legend) || {};
    var keys = o.flags || Object.keys(L);
    if (!keys.length) return '';
    return '<div class="pk-badge-legend">' + keys.map(function (k) {
      var lg = L[k] || { label: k, desc: '' };
      return '<span><span class="pk-badge ' + esc(k) + '" title="' + esc(lg.desc) + '">' + esc(lg.label) + '</span>' + esc(lg.desc) + '</span>';
    }).join('') + (B && B.asof && o.asof !== false ? '<span class="asof">Flags as of ' + esc(B.asof) + ' · NSE surveillance lists, F&amp;O ban, price bands, deals, insider filings, board meetings</span>' : '') + '</div>';
  };
})();
