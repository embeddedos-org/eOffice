# Offline-first guarantees

The office suite is local-first: every app must be fully usable with
no network. These are the guarantees, per app, as explicit contracts —
not marketing.

## Storage

- **Local-first storage per app.** Documents, spreadsheets,
  presentations, and mail are stored on-device in the app's local
  store. The network is never in the read path for opening, editing,
  or searching local content.
- **No silent cloud dependency.** If a feature requires the network
  (collaboration cursors, shared templates, license checks), the app
  says so at the point of use — offline is the default assumption,
  not an error state.

## Sync and conflict resolution

- **Sync is explicit.** Local edits never wait on the network; sync
  runs as a separate, user-visible step (or on a user-configurable
  schedule), never as a blocking precondition for editing.
- **Conflicts resolve locally first.** When a synced copy diverges,
  the local version is never silently overwritten: the app presents
  the conflict and keeps both versions until the user chooses.
- **Degraded, not dead.** Offline, every app offers its full editing
  surface; only the explicitly networked features (real-time
  collaboration, cloud template gallery) are marked unavailable.

## The privacy tie-in

Offline is a privacy property: **no network means no egress.**
Cross-ref `docs/privacy-invariants.md` (clipboard handling, telemetry
defaults, document-metadata egress, per-app-mode guarantees) — the
offline guarantees here are the reason those invariants are
enforceable: a suite that works fully offline has no excuse for
background network traffic.

## What this rules out

- Telemetry or analytics that "require" connectivity to function.
- Save flows that block on a cloud round-trip.
- Conflict resolution that picks a winner without the user.
