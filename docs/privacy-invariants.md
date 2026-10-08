# eOffice privacy invariants

**Status:** invariants (2026-10-08). Modeled on eBrowser's
`privacy-invariants.md` (2026-10-04). These are properties the office
suite guarantees, not aspirations: each invariant names the mechanism
that enforces it.

## 1. Referrer-policy matrix

| Context | Policy | Mechanism |
|---|---|---|
| Document embeds (images, linked media) | `no-referrer` | Set at fetch time; the document renderer never sends `Referer` on subresource loads |
| Help / template gallery | `strict-origin-when-cross-origin` | Same-origin help is unaffected; cross-origin template fetches leak at most the origin |
| Export-to-web | `no-referrer` | Exported HTML carries the policy in a `<meta>` tag |

## 2. Fail-closed construction

- **Network fetch in documents is deny-by-default.** A document that
  references a remote resource does not fetch it until the user allows
  that document's network access. The renderer substitutes a
  placeholder; there is no silent background fetch.
- **Macros/scripts run in a sandbox with no network.** The scripting
  host exposes no socket, fetch, or XHR surface. A macro that needs
  network access does not exist in this suite.
- **Cloud save is explicit.** There is no ambient sync: saving to a
  cloud provider requires the user to choose it per document, and the
  choice is visible in the title bar.

## 3. Per-mode defaults

| Mode | Telemetry | Network | Document metadata on save |
|---|---|---|---|
| Local (default) | Off | Deny-by-default | Author/device fields stripped unless the user opts in |
| Work profile | Off | Allowlisted hosts only | Organization policy decides; user-visible |
| Kiosk / shared device | Off, not toggleable | Deny | Metadata stripped, always |

## 4. Document-metadata egress

On save and export, the suite strips: author name, device hostname,
file paths, revision history beyond the last saved state, and embedded
thumbnails that contain location data -- unless the user explicitly
opts into keeping them (per-document setting, not a global toggle).
"Save" never transmits; only "Share"/"Publish" actions do, and they
name the destination before sending.

## 5. Clipboard handling

- Copy from a document places the selection on the clipboard; it does
  not notify any server.
- Paste into a document from an external source is scanned for
  remote-resource references (images, stylesheets); they load under the
  deny-by-default rule above.
- Clipboard history, if enabled by the OS, is the OS's business; the
  suite keeps no clipboard log of its own.

## 6. Engine guarantees

- The document parsers (the highest-risk code -- they read untrusted
  files) run with no ambient authority: no network, no process spawn,
  no filesystem access outside the opened document and its sandbox.
- A parser crash loses the document view, not the document: the file
  on disk is never modified by a failed parse.
- Telemetry, where enabled by explicit opt-in, contains no document
  content, no filenames, and no user identifiers -- counters only.

## What "fail-closed" means here

Every invariant above is written so that the *failure* of its
mechanism denies the action rather than permitting it: if the network
policy cannot be applied, the fetch does not happen; if the sandbox
cannot be constructed, the macro does not run; if the metadata stripper
errors, the save aborts. A privacy control that fails open is not a
control.
