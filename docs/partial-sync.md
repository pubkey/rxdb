# Partial Sync with RxDB

> Learn how to implement partial sync patterns with RxDB by dynamically managing multiple replication states for different data scopes, keeping local storage lean and reducing network overhead.

# Partial Sync with RxDB

Suppose you're building a Minecraft-like voxel game where the world can expand in every direction. Storing the entire map locally for offline use is impossible because the dataset could be massive. Yet you still want a local-first design so players can edit the game world offline and sync back to the server later.

## Idea: One Collection, Multiple Replications

You might define a single RxDB collection called `db.voxels`, where each document represents a block or "voxel" (with fields like id, chunkId, coordinates, and type). With RxDB you can, instead of setting up _one_ replication that tries to fetch _all_ voxels, you create **separate replication states** for each _chunk_ of the world the player is currently near.

When the player enters a particular chunk (say `chunk-123`), you **start a replication** dedicated to that chunk. On the server side, you have endpoints to **pull** only that chunk's voxels (e.g., GET `/api/voxels/pull?chunkId=123`) and **push** local changes back (e.g., POST `/api/voxels/push?chunkId=123`). RxDB handles them similarly to any other offline-first setup, but each replication is filtered to only that chunk's data.

When the player leaves `chunk-123` and no longer needs it, you **stop** that replication. If the player moves to `chunk-124`, you start a new replication for chunk 124. This ensures the game only downloads and syncs data relevant to the player's immediate location. Meanwhile, all edits made offline remain safely stored in the local database until a network connection is available.

```ts
const activeReplications = {}; // chunkId -> replicationState

function startChunkReplication(chunkId) {
  if (activeReplications[chunkId]) return;
  const replicationId = 'voxels-chunk-' + chunkId;

  const replicationState = replicateRxCollection({
    collection: db.voxels,
    replicationIdentifier: replicationId,
    pull: {
      async handler(checkpoint, limit) {
        const res = await fetch(
          `/api/voxels/pull?chunkId=${chunkId}&cp=${checkpoint}&limit=${limit}`
        );
        /* ... */
      }
    },
    push: {
      async handler(changedDocs) {
        const res = await fetch(`/api/voxels/push?chunkId=${chunkId}`);
        /* ... */
      }
    }
  });
  activeReplications[chunkId] = replicationState;
}

function stopChunkReplication(chunkId) {
  const rep = await activeReplications[chunkId];
  if (rep) {
    rep.cancel();
    delete activeReplications[chunkId];
  }
}

// Called whenever the player's location changes; 
// dynamically start/stop replication for nearby chunks.
function onPlayerMove(neighboringChunkIds) {
  neighboringChunkIds.forEach(startChunkReplication);
  Object.keys(activeReplications).forEach(cid => {
    if (!neighboringChunkIds.includes(cid)) {
      stopChunkReplication(cid);
    }
  });
}
```

## Diffy-Sync when Revisiting a Chunk

An added benefit of this multi-replication-state design is checkpointing. Each replication state has a unique "replication identifier," so the next time the player returns to `chunk-123`, the local database knows what it already has and only fetches the differences without the need to re-download the entire chunk.

## Partial Sync in a Local-First Business Application

Though a voxel world is an intuitive example, the same technique applies in enterprise scenarios where data sets are large but each user only needs a specific subset. You could spin up a new replication for each "permission group" or "region," so users only sync the records they're allowed to see. Or in a CRM, the replication might be filtered by the specific accounts or projects a user is currently handling. As soon as they switch to a different project, you stop the old replication and start one for the new scope.

This **chunk-based** or **scope-based** replication pattern keeps your local storage lean, reduces network overhead, and still gives users the offline, instant-feedback experience that local-first apps are known for. By dynamically creating (and canceling) replication states, you retain tight control over bandwidth usage and make the infinite (or very large) feasible. In a production app you would also "flag" the entities (with a `pull.modifier`) by which replication state they came from, so that you can clean up the parts that you no longer need.
