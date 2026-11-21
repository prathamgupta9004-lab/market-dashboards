# Dashboard UI kit (`PK`)

Shared components for every dashboard on the site. Published at `<site>/assets/`, so a page at
`<site>/<slug>/index.html` includes:

```html
<link rel="stylesheet" href="../assets/kit.css">
<script src="../assets/universe.js"></script> <!-- optional: global market-cap filter, ~165 KB (55 KB gzipped) -->
<script src="../assets/badges.js"></script>   <!-- optional: risk badges, ~50 KB -->
<script src="../assets/kit.js"></script>
```

Plain ES2019, no build step, no dependencies. Lightweight Charts loads on demand from `PK.LWC_URL`.
`kit.css` only reads the DESIGN.md tokens (`var(--acc,#2FE3B5)` and so on). It never sets `:root`, so a
page's own tokens win. Local test page: `assets/kit-demo.html`.

## Lightweight Charts version

`PK.LWC_URL` = `https://cdn.jsdelivr.net/npm/lightweight-charts@5.2.1/dist/lightweight-charts.standalone.production.js`

I chose 5.2.1 (released 2026-08-12) on 2026-11-21, using the npm registry `time` field. 5.3.0 came out on
2026-11-10, less than the two weeks old that the pinning rule asks for. Bump the version in `kit.js`
(`PK.LWC_VERSION` / `PK.LWC_URL`) once a newer 5.x release is two weeks old. Uses the v5 API
(`chart.addSeries(LineSeries, …, paneIndex)`).

## API

### Haptics and press
| Call | Notes |
|---|---|
| `PK.haptic(kind)` | `'tap'` 8 ms, `'select'` 12 ms, `'success'` [10,40,10], `'warn'` [20,60,20], `'error'` [30,50,30,50,30]. Does nothing when vibrate is unsupported, haptics are off, reduced motion is on, or before the first user gesture. |
| `PK.hapticsOn` | boolean, localStorage `pk_haptics` (default on) |
| `PK.setHaptics(bool)` | saves the setting and gives a success buzz when turned on |
| `PK.press(rootEl)` | Delegated `pointerdown` on `.pk-press`, `button` and `[role=tab]`: adds `.pk-pressing` for 120 ms and calls `haptic('tap')`. Calling it twice on the same root is safe. Returns `{destroy}`. Call `PK.press(document)` once per page. |

### Formatting
`PK.fmt.inr(v, dp?)` → `₹12,34,568` · `PK.fmt.cr(v, dp?)` → `₹4,52,318 Cr` · `PK.fmt.pct(v, dp=1)` → `+3.5%` / `-2.0%`
(no sign when it rounds to zero) · `PK.fmt.num(v, dp?)` → `12,34,567.89` · extra: `PK.fmt.compact(v)` → `3.4 Cr` / `1.2 L`.
null, `''` and NaN all give `–`. Indian grouping comes from `Intl` `en-IN`.

`PK.countUp(el, value, {dur=900, fmt, from=0})` uses an ease-out cubic and sets the value straight away under reduced motion.

### Charts (Lightweight Charts)
| Call | Notes |
|---|---|
| `PK.loadLWC()` | Promise<LightweightCharts>. Injects the script once. |
| `PK.chart(el, {height, timeVisible, priceFormatter, rightOffset})` | Promise<chart>. `autoSize`, transparent background, house colours, attribution logo, pinch zoom, kinetic touch scroll, long-press crosshair tracking (exits on next tap), `en-IN` price format, `dd Mon yyyy` dates. Sets `el` to 320 px tall when it has no height. |
| `PK.lineSeries(chart, data, {color, width, title, area, pane, dashed, priceScaleId, priceFormat, lastValue})` | `area:true` gives an area with a gradient fill (colour .26 → 0). Returns the series. |
| `PK.histSeries(chart, data, {pane, colorUp, colorDown, title, priceScaleId})` | Colours each bar by sign unless `d.color` is set. With `pane` 0/undefined it overlays the bottom 28% on its own scale. `pane:1` puts it in a separate pane below. |
| `PK.legend(el, chart, seriesList, fmt?)` | Top-left legend that follows the crosshair and shows the latest values when idle. `seriesList` items are `{series, label, color}` or bare series from the helpers above. `fmt(value, item)`. Returns `{refresh, destroy}`. |
| `PK.rangeChips(el, chart, ranges?, {active, onChange}?)` | Default ranges are `['1M','3M','6M','1Y','3Y','Max']`. Also accepts `1W 2W YTD 2Y 5Y 10Y` or `{label, days}`. Uses `haptic('select')`. Works out the data span from series created with the helpers. Returns `{set(label)}`. |

### SVG bars and sparkline
`PK.svgBars(el, items, opts)`: `items = [{label, value, color?, tip?}]`. Bars are horizontal by default and use
`{vertical:true, height}` for columns. They diverge around zero (mint gradient up, `#FF5C6C` down), grow in
with a stagger, and show a tooltip on hover or tap. Re-renders on resize, so a bar chart drawn inside a hidden
tab fixes itself when shown. Options: `fmt(v,item)`, `valueLabel`, `values:false`, `barH`, `gap`, `labelW`,
`barW`, `min`, `max`, `stagger`, `colorUp`, `colorDown`, `onClick(item)`. Returns `{update(items), destroy}`.

`PK.spark(values, {w=80, h=24, color, fill=true, width})` returns an SVG string. The default colour is mint
when the series ends higher and red when it ends lower.

### Table
```js
const t = PK.table(el, {
  columns: [{key, label, fmt?(v,row)->html, num?, align?:'l'|'r'|'c', width?, cls?: string|(v,row)=>string,
             sortable?, sortVal?(row), csv?:false, csvVal?(row), title?}],
  rows, sortKey, sortDir: 'asc'|'desc', search: true, pageSize: 100, csvName: 'pead',
  tvExport: true, symbolKey: 's', presets: [{label, filter: row => bool}], rowClick: row => {},
  countLabel: 'stocks', placeholder, empty, preset: index
});
t.update(rows); t.destroy();   // extras: t.search(q), t.setPreset(i|null), t.sort(key, dir), t.rows()
```
The header is sticky. Clicking a header sorts (numbers start descending, text ascending, blanks always last)
with `haptic('select')`. Search matches all terms, debounced. Clicking an active preset chip turns it off.
The table shows `N stocks of M` and renders `pageSize` rows with a "Show more" button, which is fast at 2,500+ rows.
**CSV** downloads the filtered and sorted rows with raw values and a UTF-8 BOM.
**TradingView** downloads `<csvName>_tradingview_<n>.txt` files of at most 30 comma-separated `NSE:SYMBOL` entries
(the free watchlist limit), changing `&` and `-` to `_` (`M&M` → `NSE:M_M`), and copies the full list to the clipboard.
Cell classes `up`, `dn` and `dim` colour a cell. Inside a cell, `<span class="sub">` gives a second line.
Helpers: `PK.tvSymbol(s)`, `PK.tvLists(symbols, 30)`, `PK.download(name, text, type)`, `PK.copy(text)`.

### Tabs
```html
<div class="pk-tabs" id="tabs"><button data-tab="overview">Overview</button><button data-tab="table">Table</button></div>
<section data-panel="overview">…</section><section data-panel="table" hidden>…</section>
```
`PK.tabs(el, {onChange(name, prev), storeKey, initial, root, hash:true})` → `{set, get, destroy}`.
It picks the starting tab in this order: `#tab=name` in the URL, then localStorage[storeKey], then `initial`,
then the button with `.on`, then the first button. It only toggles panels whose name belongs to this tab bar.
Changing tabs gives a select haptic, animates the panel entrance, and writes `#tab=name` to the URL with
`replaceState` (only when the URL hash is empty or already holds `tab=`). Arrow keys move between tabs.

### Badges
`PK.badges(symbol, {max}?)` → `<span class="pk-badges">…</span>` or `''`. `PK.badgeLegend({flags, asof}?)` → legend HTML.
`PK.badgeList(symbol)` → `[{flag, text, title}]`. Each title carries the detail, such as the stage, band
change, deal side or results date.

### Tooltip
`PK.tip.show(html, clientX, clientY)` / `PK.tip.hide()` use one fixed tooltip that stays inside the viewport.
It hides on scroll and on any tap outside a `[data-pk-tip]` element.

### CSS classes
`.pk-btn` (`.on` / `.pri`), `.pk-chip(.on)`, `.pk-chips`, `.pk-tabs`, `.pk-tablewrap`, `.pk-table`, `.pk-search`, `.pk-badge.<flag>`,
`.pk-badges`, `.pk-badge-legend`, `.pk-legend`, `.pk-range`, `.pk-tip`, `.pk-pressing`, `.pk-press`, `.pk-skel` (`.pk-skel.line`),
`.pk-panel-in`, `.pk-spark`, `.pk-bars`, `.pk-up`, `.pk-dn`. Reduced motion turns off every kit animation.

### Global market-cap filter (needs universe.js before kit.js)
There is one filter for the whole site. It is stored in localStorage `pk_cap` and shared by every dashboard on
the origin, including across open tabs, through the `storage` event.

| Call | Notes |
|---|---|
| `PK.cap` | `{min, max, cat, sme, exch}`: `min`/`max` in ₹ Cr or null (max is exclusive), `cat` null/`'L'`/`'M'`/`'S'`, `sme` true/false, `exch` `'all'`/`'nse'`/`'bse'` |
| `PK.capOK(key)` | Accepts an NSE symbol, `NSE:SYM`, `BSE:<code>` or a bare 5–6 digit BSE code (resolved through the alias map). Always true when the filter is the default. A stock missing from the universe passes only when no limit is set, and each miss adds to `PK.capStats.unknown`. |
| `PK.capFilter(el, {onChange, compact})` | Appends a "Market cap: All ▾" pill (the summary changes as filters are set). It opens a popover on desktop or a bottom sheet at ≤640 px with presets, custom min/max (₹ Cr), an Include SME switch, an All/NSE/BSE control, Reset, and a live "N companies match" count. Returns `{open, close, refresh, destroy}`. |
| `PK.capSet(partial \| null)` | Merges and saves the filter, sets `PK.cap`, and dispatches `document` event `'pk:cap'` with `{detail: PK.cap}`. `null` resets it. |
| `PK.capSummary()` | `All`, `Largecaps`, `Microcaps`, `₹2k–10k Cr`, `₹500 Cr+`, `< ₹1k Cr`, plus `· no SME` / `· BSE only` |
| `PK.capMcap(key)` / `PK.capInfo(key)` | mcap in ₹ Cr, or `{key, mcap, cat, sme, est, nse, bse}`. Both return null when the stock is unknown. |
| `PK.capIsDefault()`, `PK.capCount()`, `PK.CAP_PRESETS` | helpers |
| `PK.table(el, {capKey:'s', …})` | Hides rows that fail `PK.capOK(row[capKey])`, re-renders on `'pk:cap'`, and shows "Market cap filter: … · N hidden · reset" above the table while a filter is active. |

`exch:'nse'` keeps NSE-listed stocks; `'bse'` keeps BSE-only stocks plus NSE stocks that are also on BSE.
Large, Mid and Small use the rank across both exchanges (1–100, 101–250, 251+). Micro is under ₹1,000 Cr.

**Recipe for dashboards with their own (non-PK) tables:**
```js
PK.capFilter(document.querySelector('header .cap-slot'));           // 1. control in the header
function visible(rows) { return rows.filter(r => PK.capOK(r.symbol)); } // 2. filter (NSE sym or BSE code)
function render() { drawMyTable(visible(ALL_ROWS)); }                // 3. use it wherever rows are drawn
document.addEventListener('pk:cap', render);                         // 4. re-render on change
render();                                                            // 5. first paint already honours the saved filter
// 6. optional: show PK.capSummary() near your row count when !PK.capIsDefault()
```

## universe.js (nightly)

`python tools/universe.py` (add `-v` for edge-case counts, `--offline` to use only local files and the cache) writes
`window.PK_UNIVERSE = {"asof", "nse": <mcap file date>, "bse": <bhavcopy date>, "bands": [rank100_cr, rank250_cr], "s": {KEY: [mcap_cr, flags]}, "b": {bse_code: NSE_SYMBOL}}`.
KEY is the NSE symbol, or `BSE:<code>` for BSE-only companies. `flags` starts with the category letter L/M/S,
followed by `s` (SME: NSE series SM/ST, BSE group M/MT/MS), `b` (BSE-only, Screener shares × latest BSE close)
or `o` (BSE-only, BSE's own published market cap because the company is missing from the Screener export).

| Source | Use |
|---|---|
| `SectorDashboard/data/mcap/<latest>.csv` | NSE mcap (EQ/BE/BZ/SM/ST). Rights entitlements (`-RE`) are skipped. |
| `api.bseindia.com …/ListofScripData` (Active) | BSE codes, ISIN, group (SME) and BSE mcap. Cached in `tools/_universe_cache/`. |
| nsearchives `EQUITY_L.csv` + `SME_EQUITY_L.csv` | NSE symbol ↔ ISIN for the alias map and for spotting BSE-only companies |
| BSE bhavcopy (`bseindia.com/download`, latest day) | BSE close for every scrip. Falls back to the cache, then to the `SectorDashboard/data/bse` subset. |
| `Stage2Dashboard/data/screener_all.csv` | shares = Market Capitalization / Current Price, used for BSE-only companies |

Partly-paid BSE lines (ISIN `IN9…`) are skipped. When a BSE-only stock didn't trade on the bhavcopy day, its
static Screener mcap is used.

## badges.js (nightly)

`python tools/badges.py` (add `-v` for per-source logs, `--offline` to use only local files and the cache) writes
`tools/site_assets/badges.js`:

```js
window.PK_BADGES = {"asof":"2026-11-21","sessions":[…5 dates],"legend":{flag:{label,desc}},
                    "s":{"SYMBOL":["asm-lt","t2t"]}, "d":{"SYMBOL":{"asm-lt":"Stage I"}}}
```

| Flag | Source |
|---|---|
| `asm-st`, `asm-lt` | `nseindia.com/api/reportASM` (with stage) |
| `gsm` | `api/reportGSM` (stage parsed from `survCode`) |
| `esm` | `api/reportESM` (with stage) |
| `ban` | `nsearchives…/archives/fo/sec_ban/fo_secban_DDMMYYYY.csv`, the newest file up to 4 days ahead (the next trade date's list comes out the evening before). Falls back to `FnODashboard/data/ban/`. |
| `band-up`, `band-dn` | `nsearchives…/content/equities/eq_band_changes_DDMMYYYY.csv` for the last 5 sessions. The newest change wins. |
| `t2t` | latest `SectorDashboard/data/nse/*.csv`, series BE / BZ (no fetch) |
| `deal` | `api/historicalOR/bulk-block-short-deals` bulk + block, last 3 sessions. Falls back to `InsiderDeals/data/raw/{bulk,block}`. |
| `insider` | `api/corporates-pit-gg` + `api/corporate-sast-reg29` filed in the last 7 days. Falls back to `InsiderDeals/data/raw/{pit_gg,sast29}`. |
| `results` | `api/corporate-board-meetings` + `api/event-calendar`, any meeting mentioning results in the next 7 days |

It uses one polite session: the NSE homepage first for cookies, a browser user agent, and at least 1.5 s
between calls. A 401/403 is retried once and then skipped, never worked around. Each source runs inside its
own try/except. If a source fails, the job reuses that source's last good result from `tools/_badges_cache/`
and names it in the summary line. The job never raises, writes the file atomically, and prints one line,
for example:

`badges 2026-11-21: 738 symbols flagged | asm-st=46 asm-lt=131 gsm=76 esm=226 ban=1 band-up=24 band-dn=21 t2t=221 deal=65 insider=164 results=9 | all sources ok | 27s`
