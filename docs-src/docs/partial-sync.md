---
title: Partial Sync with RxDB
slug: partial-sync.html
description: Learn how to implement partial sync with RxDB by running multiple scoped replication states, so each client only downloads the slice of data it needs while keeping full offline-first behavior.
image: /headers/partial-sync.jpg
---

# Partial Sync with RxDB

Partial sync is a replication pattern where a client only synchronizes a **subset** of the server's data instead of the full dataset. The subset is defined by a **scope**, for example a geographic region, a project, a tenant, a permission group, or a chunk of a game world. RxDB does not have a single "partial sync" switch; the pattern is built on top of the standard [RxDB Sync Engine](./replication.md) by running **multiple replication states** in parallel, each one filtered to a different scope, and starting or stopping them as the user's context changes.

This page explains what partial sync is, when to use it, and how to implement it correctly with RxDB.

## When to use Partial Sync

A full sync, where every client downloads the entire collection, works well when the dataset is small or when every client truly needs every document. Partial sync becomes useful when one or more of the following is true:

- The full dataset is too large to fit on a client device.
- Each user only ever interacts with a small slice of the data (their accounts, their region, their project).
- You want to reduce bandwidth, initial load time, or storage usage on the client.
- The data is segmented by permissions and the server must not send rows the user is not allowed to see.
- The visible slice changes over time (the user moves between projects, regions, or game chunks).

Concrete examples:

- A voxel game where only the chunks near the player are loaded.
- A CRM where the user only syncs the accounts of their currently open project.
- A multi-tenant SaaS app where each workspace is its own scope.
- A field-service app that syncs work orders only for the technician's current route.

## Core Idea: One Collection, Many Replication States

Partial sync in RxDB is built on three properties of the [Sync Engine](./replication.md):

1. `replicateRxCollection()` returns an independent `RxReplicationState` that can be started and cancelled at any time.
2. Each replication is identified by a unique `replicationIdentifier`. RxDB stores a separate checkpoint per identifier, so two replications never share progress and never overwrite each other's metadata.
3. The `pull.handler` is just a function. It can call any URL with any query parameters, so filtering the data by scope is done on the server using parameters that the client passes in.

The pattern is: keep **one** [RxCollection](./rx-collection.md) on the client (for example `db.voxels`) and attach **multiple** replication states to it. Each replication uses a different `replicationIdentifier` (for example `voxels-chunk-123`) and a pull/push handler that talks to a scoped server endpoint (for example `/api/voxels?chunkId=123`). When the user enters a new scope, you start a new replication. When they leave, you cancel the old one.

```
                        RxCollection: db.voxels
                                 |
        +------------------------+------------------------+
        |                        |                        |
  replicationState        replicationState        replicationState
  id: chunk-123           id: chunk-124           id: chunk-125
  pull: ?chunkId=123      pull: ?chunkId=124      pull: ?chunkId=125
```

All replication states share the same local storage, so queries against the collection return documents from every active scope at once. The user does not see a difference between data that came from one chunk or another, they just see the documents.

## Implementation

The minimal implementation has three parts:

- A registry of active replication states, keyed by scope id.
- A `startScopeReplication(scopeId)` function that creates a new replication if one does not exist.
- A `stopScopeReplication(scopeId)` function that cancels the replication when the scope is no longer needed.

```ts
import { replicateRxCollection } from 'rxdb/plugins/replication';

const activeReplications: Record<string, RxReplicationState<any, any>> = {};

function startChunkReplication(chunkId: string) {
  if (activeReplications[chunkId]) return activeReplications[chunkId];

  const replicationState = replicateRxCollection({
    collection: db.voxels,
    // Unique per scope so RxDB tracks its own checkpoint for this slice.
    replicationIdentifier: 'voxels-chunk-' + chunkId,
    live: true,
    pull: {
      async handler(checkpoint, batchSize) {
        const minUpdatedAt = checkpoint ? checkpoint.updatedAt : 0;
        const res = await fetch(
          `/api/voxels/pull?chunkId=${chunkId}` +
          `&minUpdatedAt=${minUpdatedAt}&limit=${batchSize}`
        );
        const documents = await res.json();
        return {
          documents,
          checkpoint: documents.length === 0
            ? checkpoint
            : {
                id: documents[documents.length - 1].id,
                updatedAt: documents[documents.length - 1].updatedAt
              }
        };
      },
      // Tag every pulled document with the scope it came from.
      // This is what makes per-scope cleanup possible later.
      modifier: doc => ({ ...doc, chunkId })
    },
    push: {
      async handler(changeRows) {
        const res = await fetch(`/api/voxels/push?chunkId=${chunkId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changeRows)
        });
        // Must return an array of conflicts, or [] if there are none.
        return res.json();
      },
      // Only push documents that belong to this scope.
      // Returning null skips the document for this replication.
      modifier: doc => doc.chunkId === chunkId ? doc : null
    }
  });

  activeReplications[chunkId] = replicationState;
  return replicationState;
}

async function stopChunkReplication(chunkId: string) {
  const rep = activeReplications[chunkId];
  if (!rep) return;
  await rep.cancel();
  delete activeReplications[chunkId];
}

// Reconcile active scopes whenever the player moves.
function onPlayerMove(neighboringChunkIds: string[]) {
  neighboringChunkIds.forEach(startChunkReplication);
  Object.keys(activeReplications).forEach(cid => {
    if (!neighboringChunkIds.includes(cid)) {
      stopChunkReplication(cid);
    }
  });
}
```

### Server side

The server must understand the scope parameter and only return documents that belong to it. A typical pull endpoint:

- Reads `chunkId`, `minUpdatedAt` and `limit` from the request.
- Returns up to `limit` documents from the scope, ordered by `updatedAt`, that have changed after `minUpdatedAt`.
- Returns documents that are deleted with the deleted flag still set, so deletions replicate too.

A typical push endpoint:

- Accepts an array of `{ assumedMasterState, newDocumentState }` rows.
- For each row, compares `assumedMasterState` to the current server state.
- If they match, applies `newDocumentState`. If they do not, returns the current server state as a conflict.

This is the same contract as for a normal full RxDB replication, just with an extra scope filter applied to the query.

For real time updates, add a `pull.stream$` that emits whenever the server has new writes in the scope. See [Replication](./replication.md) for the full handler contract.

## Resumable Sync per Scope

Because each replication has its own `replicationIdentifier`, RxDB stores a separate checkpoint for every scope in its internal replication metadata. When the user leaves `chunk-123` and comes back later, the new replication state for `chunk-123` reuses the existing checkpoint and only fetches documents that changed since the last sync. The client never re-downloads the whole chunk after the first time.

This is the same "git-like" diff sync that the standard [Sync Engine](./replication.md) uses, applied independently per scope.

## Tagging Documents with the Scope they came from

The `pull.modifier` runs on every pulled document before it is written to local storage. Use it to add a field like `chunkId`, `projectId` or `tenantId` that records which scope a document belongs to. The corresponding `push.modifier` can then return `null` for documents that do not belong to the current scope, so each replication only pushes the rows it is responsible for.

Tagging is what makes the next two things possible:

- **Per-scope queries:** the client can list "everything from this chunk" with a normal RxDB query, even though all scopes share one collection.
- **Per-scope cleanup:** when a scope is no longer needed, you can identify and remove exactly the documents that belong to it.

If the document already has a natural scope field on the server (for example `chunkId` is already part of the schema), the `pull.modifier` is not strictly needed, the field comes down with the document. The modifier is only required when the scope is implicit on the server side.

## Cleaning up Data from Scopes the User Left

Cancelling a replication state stops the sync, but it does **not** remove the documents that were already written into the local collection. For long running apps, those documents accumulate. There are two patterns to deal with this:

1. **Remove the documents from the local collection on scope exit.** After `stopChunkReplication(chunkId)`, run a local query that finds all documents tagged with that `chunkId` and remove them. Use `RxCollection.find({ selector: { chunkId } }).remove()` for a bulk delete. Be aware that this also pushes deletes back to the server through any replication that still considers those documents in scope, so make sure the push modifiers filter correctly.

2. **Let the [cleanup plugin](./cleanup.md) reclaim space over time.** Deleted documents are kept around for a configurable `minimumDeletedTime` so deletions can still replicate, then the plugin physically removes them. Set `awaitReplicationsInSync: true` to make sure cleanup only runs when all active replication states are caught up.

For purely local "evict from cache" semantics (drop the data without telling the server), use `RxCollection.bulkRemove()` and combine it with a push modifier that returns `null` for those rows, so the local delete is not propagated as a server delete.

## Real Time Updates with a Pull Stream

`live: true` replication also needs a `pull.stream$` observable that emits new server-side writes as they happen. With partial sync, each replication state should subscribe to a stream that is **already filtered** to its scope, otherwise every client receives events for every scope and ignores most of them. Typical implementations:

- A WebSocket connection per scope, or one shared connection with a server-side subscription per scope.
- Server-Sent Events with a `chunkId` query parameter.
- A pub/sub channel named after the scope id.

When the stream emits a `RESYNC` event, RxDB falls back to the pull handler with the last checkpoint, which gives you a way to recover from missed events.

## Tradeoffs

Partial sync is more flexible than full sync but adds complexity. Things to keep in mind:

- **The server must support scoped queries.** Pull and push endpoints need to enforce the scope, both for correctness and for permissions.
- **Conflict resolution still runs on the client.** If the same document is in two active scopes at once, both replications can try to push it. Use push modifiers to make exactly one replication responsible for each document.
- **Checkpoint storage grows with the number of historical scopes.** Each unique `replicationIdentifier` keeps its own metadata. If a user opens thousands of distinct scopes, call `replicationState.remove()` instead of `cancel()` to clear the metadata for scopes you do not plan to return to.
- **Real time streams need to be scoped too.** A single global `pull.stream$` defeats the bandwidth savings of partial sync.
- **Cleanup is explicit.** RxDB will not automatically forget data from a scope you left, you have to remove it or rely on the cleanup plugin.

## Partial Sync Beyond Games

The voxel example is just a convenient way to picture the pattern. The same shape applies to many real applications:

- **Multi-tenant SaaS:** one replication per workspace or tenant id. Switch when the user switches workspace.
- **Permission-based sync:** one replication per role or permission group, so users only download what they are allowed to see.
- **Project / account scoped CRM:** one replication per active account. Stop it when the account is closed.
- **Region or branch scoped enterprise apps:** one replication per region. Useful when the same database powers many geographically distinct sites.
- **Time windowed sync:** one replication for "last 30 days" and a separate one started on demand for older data.

In all of these, the building blocks are the same: a stable `replicationIdentifier` per scope, a scoped pull/push handler, a tag on every pulled document, and a clear rule for when a scope is started and stopped. With those four pieces, RxDB gives you the offline-first, conflict-aware, resumable replication of the standard [Sync Engine](./replication.md), applied to exactly the slice of data the user actually needs.
