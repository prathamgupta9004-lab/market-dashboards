# "★ Add to watchlist" helper for other dashboards

Every dashboard on the site shares one origin, so any page can write into the same browser-only store that
`../watchlist/` reads (`localStorage["pk_watchlist_v1"]`). Nothing is uploaded. Paste the snippet once per page
(after `kit.js`), then call `PKWL.button(symbol)` wherever a stock name is rendered, or `PKWL.add(symbol)` directly.

## Store format (v1)

```json
{"v":1,"active":"<list id>","lists":[{"id":"l…","name":"My watchlist","items":[{"s":"RELIANCE","t":"2026-11-21","d":"2026-11-19","p":1375.6}]}]}
```
`s` = NSE symbol or `BSE:<code>` (same keys as `PK_UNIVERSE.s`), `t` = date added, `d` = data date, `p` = price when added
(optional: the watchlist shows "since added" only when it is set). New items go to the active list, newest first.

## Snippet

```html
<style>
.pkwl{background:transparent;border:1px solid var(--line2,#21443A);color:var(--dim,rgba(238,245,242,.42));border-radius:999px;
 min-width:32px;min-height:32px;padding:0 8px;font:600 12px Inter,system-ui,sans-serif;cursor:pointer;transition:all .18s;vertical-align:middle}
.pkwl:hover{color:var(--acc,#2FE3B5);border-color:var(--acc,#2FE3B5)}
.pkwl.on{color:#03140E;background:linear-gradient(135deg,#2FE3B5,#10B981);border-color:transparent;box-shadow:0 4px 16px rgba(47,227,181,.22)}
.pkwl.pop{animation:pkwlpop .4s cubic-bezier(.2,.8,.2,1)}
@keyframes pkwlpop{40%{transform:scale(1.25)}100%{transform:none}}
@media (prefers-reduced-motion:reduce){.pkwl.pop{animation:none}}
</style>
<script>
window.PKWL = (function () {
  var KEY = 'pk_watchlist_v1';
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || !Array.isArray(s.lists) || !s.lists.length) s = { v: 1, active: null, lists: [{ id: 'l' + Date.now().toString(36), name: 'My watchlist', items: [] }] };
    if (!s.lists.some(function (l) { return l.id === s.active; })) s.active = s.lists[0].id;
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
  function list(s) { return s.lists.filter(function (l) { return l.id === s.active; })[0] || s.lists[0]; }
  function has(sym) { return list(load()).items.some(function (x) { return x.s === sym; }); }
  function add(sym, o) {           // o: {price, asof}; returns true when added, false when already there
    var s = load(), l = list(s);
    if (l.items.some(function (x) { return x.s === sym; })) return false;
    l.items.unshift({ s: sym, t: new Date().toISOString().slice(0, 10), d: (o && o.asof) || null, p: (o && o.price) || null });
    save(s);
    if (window.PK && PK.haptic) PK.haptic('success');
    return true;
  }
  function remove(sym) {
    var s = load(), l = list(s), n = l.items.length;
    l.items = l.items.filter(function (x) { return x.s !== sym; });
    save(s); return l.items.length < n;
  }
  function button(sym, o) {        // returns HTML; clicks are handled by one delegated listener below
    var on = has(sym);
    return '<button type="button" class="pkwl' + (on ? ' on' : '') + '" data-pkwl="' + String(sym).replace(/"/g, '&quot;') + '"' +
      (o && o.price ? ' data-px="' + o.price + '"' : '') + ' title="' + (on ? 'In your watchlist (tap to remove)' : 'Add to watchlist') + '"' +
      ' aria-pressed="' + on + '">' + (on ? '★' : '☆') + '</button>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pkwl]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var sym = b.getAttribute('data-pkwl'), on = b.classList.contains('on');
    if (on) remove(sym); else add(sym, { price: +b.getAttribute('data-px') || null });
    b.classList.toggle('on', !on); b.textContent = on ? '☆' : '★'; b.setAttribute('aria-pressed', String(!on));
    b.title = on ? 'Add to watchlist' : 'In your watchlist (tap to remove)';
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  });
  return { add: add, remove: remove, has: has, button: button, load: load };
})();
</script>
```

## Use

```js
cell.innerHTML = '<b>' + sym + '</b> ' + PKWL.button(sym, { price: row.close });   // ☆ / ★ toggle
PKWL.add('POLYCAB');           // programmatic add (to the active list)
PKWL.has('TCS');               // true / false
```

The watchlist page listens for the `storage` event, so a stock starred in another open tab appears there at once.
Keep the symbol exactly as the universe key (`M&M`, not `M_M`; BSE-only stocks as `BSE:500012`).
