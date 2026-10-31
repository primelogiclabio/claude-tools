# Fill-in fields: starting point

Read this when a doc gets fill-in fields (see "Guides and fill-in fields" in [SKILL.md](SKILL.md) for when and why). It's a tested starting point: copy the pieces, adapt the colors to the page's own variables, keep the behavior.

## Markup

The remember/reset control goes once, in the header:

```html
<div class="values-bar">
  <label><input type="checkbox" id="values-remember" checked> Remember my values on this device</label>
  <button type="button" id="values-reset">Reset values</button>
</div>
```

A text field goes inline, in the step where its value is first needed. `data-field` is the value's name; it's also what an empty token shows (`<valkey-version>`) and what the Markdown file uses as the placeholder. The hint is shown only when the entry doesn't match `pattern`.

```html
<div class="field">
  <label for="f-valkey-version">Valkey version</label>
  <input id="f-valkey-version" data-field="valkey-version" placeholder="8.1.1" pattern="\d+\.\d+\.\d+"
         autocomplete="off" spellcheck="false" aria-describedby="f-valkey-version-hint">
  <p class="field-hint" id="f-valkey-version-hint" hidden>Use the full version, like 8.1.1.</p>
</div>
```

A choice field sits before the first step it affects. Mark the likeliest option `selected`; Reset returns to it.

```html
<div class="field">
  <label for="f-os">Your system</label>
  <select id="f-os" data-field="os" autocomplete="off">
    <option value="windows" selected>Windows (PowerShell)</option>
    <option value="unix">Linux or macOS (bash)</option>
  </select>
</div>
```

Every later use of a value is a token, in prose or inside code:

```html
<pre><code>docker run -d --name valkey -p <span class="fv" data-field="valkey-port"></span>:6379 valkey/valkey:<span class="fv" data-field="valkey-version"></span></code></pre>
```

A block that only applies to some choices gets `data-when="field=value"` (several values: `data-when="os=unix,wsl"`). Put it on a block element: a `<pre>`, `<p>`, `<div>` or `<li>`.

```html
<pre data-when="os=windows"><code>...PowerShell version...</code></pre>
<pre data-when="os=unix"><code>...bash version...</code></pre>
```

An output block assembles values into paste-ready text:

```html
<figure class="output">
  <figcaption>Send to the team</figcaption>
  <pre><code>Host: <span class="fv" data-field="host"></span>
Valkey <span class="fv" data-field="valkey-version"></span> on port <span class="fv" data-field="valkey-port"></span></code></pre>
</figure>
```

Every `<pre>` inside `<main>` gets a Copy button from the script; don't add buttons by hand.

## CSS

Uses `--warn` and `--warn-soft` for missing or malformed values and `--accent-soft` for the field background; define them in both themes if the page doesn't have them.

```css
[hidden]{display:none !important}
.values-bar{display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; margin:14px 0 0; font-size:.85rem; color:var(--muted)}
.values-bar label{display:inline-flex; align-items:center; gap:6px; cursor:pointer}
.values-bar button{font:inherit; padding:3px 12px; border-radius:999px; border:1px solid var(--line-strong); background:var(--surface); color:var(--fg); cursor:pointer}
.field{display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; max-width:72ch; margin:12px 0 16px; padding:10px 14px; border-radius:10px; background:var(--accent-soft); transition:box-shadow .2s}
.field label{font-weight:650; min-width:16ch} /* lines the inputs up when labels differ in length */
.field input, .field select{font:inherit; font-family:var(--f-mono); font-size:.9rem; flex:1 1 16ch; min-width:0; max-width:36ch; padding:5px 10px; border:1px solid var(--line-strong); border-radius:6px; background:var(--surface); color:var(--fg)}
.field input[aria-invalid="true"]{border-color:var(--warn)}
.field-hint{flex-basis:100%; margin:0; font-size:.85rem; color:var(--warn)}
.field.attention{box-shadow:0 0 0 3px var(--accent)}
.fv{font-family:var(--f-mono); color:var(--accent); background:var(--accent-soft); border-radius:3px; padding:0 2px; cursor:pointer}
.fv.empty, .fv.invalid{color:var(--warn); background:var(--warn-soft)}
.fv.invalid{text-decoration:underline wavy}
.code{position:relative}
.code pre{padding-right:96px}
.copy-btn{position:absolute; top:8px; right:8px; max-width:calc(100% - 16px); font:inherit; font-size:.78rem; padding:3px 10px; border-radius:999px; border:1px solid var(--line-strong); background:var(--surface); color:var(--fg); cursor:pointer}
@media (max-width:640px){ .code pre{padding-right:16px; padding-top:44px} } /* phones: the button sits above the first line instead of covering it */
.output{margin:16px 0 20px}
.output figcaption{margin:0 0 6px; font-weight:650; color:var(--fg)}
```

## JS

Set `STORE` to a key unique to the doc (its file name works), so two guides opened from the same folder don't share values.

```js
(function () {
  var STORE = 'valkey-postgres-guide';
  var fields = {}, touched = {};
  document.querySelectorAll('input[data-field], select[data-field]').forEach(function (el) { fields[el.getAttribute('data-field')] = el; });
  var remember = document.getElementById('values-remember');
  var reset = document.getElementById('values-reset');

  function load(key) { try { return localStorage.getItem(STORE + '-' + key); } catch (e) { return null; } }
  function store(key, val) {
    try { if (val === null) localStorage.removeItem(STORE + '-' + key); else localStorage.setItem(STORE + '-' + key, val); } catch (e) {}
  }
  function value(name) { return fields[name] ? fields[name].value.trim() : ''; }
  function valid(name) { return !fields[name] || !fields[name].validity.patternMismatch; }
  function label(name) {
    var l = fields[name] && document.querySelector('label[for="' + fields[name].id + '"]');
    return l ? l.textContent.trim() : name;
  }

  // wrap every code block with a Copy button; a data-when on the <pre> moves to the wrapper so the button hides with it
  document.querySelectorAll('main pre').forEach(function (pre) {
    var wrap = document.createElement('div');
    wrap.className = 'code';
    if (pre.hasAttribute('data-when')) { wrap.setAttribute('data-when', pre.getAttribute('data-when')); pre.removeAttribute('data-when'); }
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    wrap.appendChild(btn);
    btn.addEventListener('click', function () {
      var bad = Array.prototype.map.call(pre.querySelectorAll('.fv'), function (t) { return t.getAttribute('data-field'); })
        .filter(function (n) { return !value(n) || !valid(n); })[0];
      if (bad) { touched[bad] = true; render(); flash(btn, 'Fill in ' + label(bad) + ' first'); goTo(bad); return; }
      copyText(pre.textContent.replace(/\n$/, '')).then(function () { flash(btn, 'Copied'); }, function () { flash(btn, 'Copy failed: select the text'); });
    });
  });

  function render() {
    document.querySelectorAll('.fv').forEach(function (t) {
      var name = t.getAttribute('data-field'), v = value(name);
      t.textContent = v || '<' + name + '>';
      t.classList.toggle('empty', !v);
      t.classList.toggle('invalid', !!v && !valid(name));
    });
    document.querySelectorAll('[data-when]').forEach(function (el) {
      var rule = el.getAttribute('data-when').split('=');
      el.hidden = rule[1].split(',').indexOf(value(rule[0])) === -1;
    });
    Object.keys(fields).forEach(function (name) {
      var bad = touched[name] && !!value(name) && !valid(name);
      var hint = document.getElementById(fields[name].id + '-hint');
      fields[name].setAttribute('aria-invalid', String(bad));
      if (hint) hint.hidden = !bad;
    });
  }
  function save() {
    if (!remember.checked) return;
    var vals = {};
    Object.keys(fields).forEach(function (name) { vals[name] = fields[name].value; });
    store('values', JSON.stringify(vals));
  }
  function goTo(name) {
    var el = fields[name];
    if (!el) return;
    var box = el.closest('.field') || el;
    el.scrollIntoView({ block: 'center' });
    el.focus({ preventScroll: true });
    box.classList.add('attention');
    setTimeout(function () { box.classList.remove('attention'); }, 1600);
  }
  function flash(btn, text) {
    btn.textContent = text;
    clearTimeout(btn.flashTimer);
    btn.flashTimer = setTimeout(function () { btn.textContent = 'Copy'; }, 2200);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, fail) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      if (done) ok(); else fail();
    });
  }

  Object.keys(fields).forEach(function (name) {
    fields[name].addEventListener('input', function () { render(); save(); });
    fields[name].addEventListener('change', function () { touched[name] = true; render(); save(); });
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.fv');
    if (t) goTo(t.getAttribute('data-field'));
  });
  remember.addEventListener('change', function () {
    store('remember', remember.checked ? 'on' : 'off');
    if (remember.checked) save(); else store('values', null);
  });
  reset.addEventListener('click', function () {
    Object.keys(fields).forEach(function (name) {
      var el = fields[name];
      if (el.tagName === 'SELECT') {
        var def = Array.prototype.filter.call(el.options, function (o) { return o.defaultSelected; })[0] || el.options[0];
        el.value = def.value;
      } else {
        el.value = '';
      }
    });
    touched = {};
    store('values', null);
    render();
  });

  remember.checked = load('remember') !== 'off';
  if (remember.checked) {
    var saved = {};
    try { saved = JSON.parse(load('values') || '{}'); } catch (e) {}
    Object.keys(saved).forEach(function (name) {
      var el = fields[name];
      if (!el || (el.tagName === 'SELECT' && !Array.prototype.some.call(el.options, function (o) { return o.value === saved[name]; }))) return;
      el.value = saved[name];
      if (saved[name]) touched[name] = true;
    });
  }
  render();
})();
```

## Notes

- **One input per value.** Two inputs with the same `data-field` would fight; later uses are always tokens.
- **Don't put a field inside a `data-when` block** unless the value is only used in that variant; otherwise clicking a token can't reach a hidden field.
- **`pattern` matches the whole entry** (the browser anchors it) and modern browsers compile it with the `v` flag, so escape `-` inside a character class (`[A-Z0-9\-]`). Check each pattern against its own placeholder example.
- **`autocomplete="off"`** on every field stops the browser restoring values on reload by itself, which would defeat the remember switch.
- **The script needs `main` to wrap the doc body** (as the page layout already does) so the copy buttons stay off the nav and header.
