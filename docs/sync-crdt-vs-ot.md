# Sync: CRDT vs OT — decision note

Real-time collaboration is the one explicitly-networked feature the
offline-first guarantees (`docs/offline-first-guarantees.md`) leave
open. When it arrives, the sync algorithm is a load-bearing choice.
This note records the comparison and the recommendation.

## The constraints (already decided)

The offline-first guarantees fix the boundaries any sync design must
respect:

- Local edits never wait on the network; sync is explicit and separate.
- A diverged copy is never silently overwritten — the app keeps both
  versions until the user chooses.
- No network in the read path, ever.

## The two candidates

**Operational Transformation (OT).** Edits are operations transformed
against concurrent operations. Proven at Google Docs scale. But OT
needs a **central ordering authority**: transformation is only correct
against a single agreed operation sequence. That authority is a server,
and a server in the ordering path means editing correctness depends on
connectivity — exactly what local-first forbids. OT also makes the
server a privileged observer of every keystroke.

**CRDTs (Conflict-free Replicated Data Types).** Edits are operations
that commute: any two replicas that have seen the same operations
converge to the same state, with no central authority. Sync is
peer-to-peer state exchange — a device can go offline for a month,
come back, and merge. The merge is mathematically guaranteed; the only
question is what the *user* sees.

## Recommendation: CRDTs

CRDTs fit the constraints OT violates:

1. **No central authority.** Convergence needs no server in the
   ordering path — offline-first stays intact.
2. **The conflict guarantee becomes natural.** "Keep both versions
   until the user chooses" is what a CRDT already does: both versions
   exist as convergent state, and the UI presents the merge. The
   guarantee stops being a special case and becomes the data model.
3. **No privileged observer.** Sync payloads can be end-to-end
   encrypted between the collaborators' devices; there is no
   transformation server that must see plaintext.

## Scoping: document types are not equal

- **Rich text first.** Text CRDTs (the collaboration-cursors use case)
  are the solved problem — this is where the first implementation
  lands.
- **Spreadsheets are the hard case.** Formulas and cell references make
  the operation set larger; scope it to value/formatting edits first,
  structural edits (insert/delete rows) later, with the manual-conflict
  UI as the backstop for anything the operation set cannot express.
- **Presentations and mail** follow the text pattern; mail is
  append-mostly and barely needs collaboration at all.

## What this rules out

- OT with a central transformation server as the ordering authority —
  a connectivity dependency and a privileged observer in one.
- Last-writer-wins as the default merge — silent overwrites are
  already forbidden by the offline-first guarantees, and no sync
  algorithm gets to reintroduce them.
- "Sync" that reorders local edits to match the server — the local
  edit history is the source of truth; the merge adapts to it, not
  the reverse.
