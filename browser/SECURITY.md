# Browser apps — trust-boundary conventions

The `browser/*.html` apps are single-file client apps. They import files
(CSV, JSON) and render AI output — both cross a trust boundary. These
conventions are mandatory for every browser app; they exist because
[eOffice#45](https://github.com/embeddedos-org/eOffice/pull/45) fixed a
real stored-XSS via imported note tags.

## 1. Imported data is untrusted — normalize at the boundary

Coerce imported JSON/CSV to the exact shapes the renderers expect,
**before** it touches app state. `browser/enotes.html` is the reference:

```js
// Trust boundary: imported JSON is untrusted. Coerce to the shapes
// the renderers expect, and normalize tags the same way addTag does.
const tags = Array.isArray(n.tags) ? n.tags.filter(t => typeof t === 'string') : [];
n.tags = [...new Set(tags.map(normalizeTag).filter(Boolean))];
if (typeof n.title !== 'string') n.title = '';
if (typeof n.content !== 'string') n.content = '';
```

Rules:

- Reject non-string values for string fields (don't just skip them — a
  crafted object in a tag list must not survive).
- Normalize identifiers (tags, sheet names, file names) to an allowlist
  charset, e.g. `tagName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')`.
- The same normalization must apply to user-typed and imported values —
  one `normalizeTag`-style function, used in both paths.

## 2. Render text as text

- Use `textContent` (or `createTextNode`) for any string that came from
  a file, an import, or user input. `browser/esheets.html` renders every
  cell via `el.textContent = ...` — imported CSV can never become markup.
- `innerHTML` is allowed only for static templates or for strings you
  escaped yourself at that call site. Never `innerHTML = importedValue`.

## 3. Escape AI-generated output

AI replies are untrusted input too. `browser/esheets.html` escapes the
eBot reply before injecting it:

```js
rp.innerHTML = '<div class="erc"><b ...>' + lb[a] + '</b>'
  + t.replace(/</g, '&lt;') + '</div>';
```

## 4. Test the boundary

Every import path gets a unit test under `tests/unit/browser/` that feeds
malicious payloads (`<img src=x onerror=alert(1)>`, `<script>`, objects
where strings are expected) and asserts they render inert. See
`tests/unit/browser/enotes-tags.test.ts` (from #45) for the pattern.

## Checklist for new browser apps

- [ ] All file-import handlers coerce + normalize before touching state
- [ ] No `innerHTML` with unescaped dynamic data (`grep -n innerHTML`)
- [ ] AI output escaped at the injection site
- [ ] Malicious-payload unit test in `tests/unit/browser/`
