import './unit/init.test.ts';
import './unit/util.test.ts';

/**
 * Helpers that
 * do not fully test RxDB but
 * just single methods
*/
import './unit/custom-index.test.ts';
import './unit/query-planner.test.ts';


import './unit/internal-indexes.test.ts';


/**
 * Move these tests around so that
 * when you focus on one part of RxDB,
 * your relevant tests run first.
 * Do not commit this file if you modified the order.
 */
import './unit/rx-storage-implementations.test.ts';
import './unit/rx-storage-query-correctness.test.ts';
import './unit/rx-storage-helper.test.ts';

import './unit/rx-storage-dexie.test.ts';
import './unit/rx-storage-remote.test.ts';
import './unit/instance-of-check.test.ts';
import './unit/rx-schema.test.ts';
import './unit/bug-report.test.ts';
import './unit/rx-database.test.ts';
import './unit/rx-document.test.ts';
import './unit/rx-collection.test.ts';
import './unit/validate.test.ts';
import './unit/rx-query.test.ts';
import './unit/cross-instance.test.ts';
import './unit/local-documents.test.ts';
import './unit/change-event-buffer.test.ts';
import './unit/reactive-query.test.ts';
import './unit/key-compression.test.ts';
import './unit/event-reduce.test.ts';
import './unit/cache-replacement-policy.test.ts';
import './unit/query-builder.test.ts';
import './unit/idle-queue.test.ts';
import './unit/conflict-handling.test.ts';
import './unit/reactivity.test.ts';
import './unit/reactive-collection.test.ts';
import './unit/reactive-document.test.ts';
import './unit/cleanup.test.ts';
import './unit/hooks.test.ts';
import './unit/rx-pipeline.test.ts';
import './unit/orm.test.ts';
import './unit/replication-protocol.test.ts';
import './unit/replication.test.ts';
import './unit/replication-multiinstance.test.ts';
import './unit/replication-graphql.test.ts';
import './unit/replication-websocket.test.ts';
import './unit/replication-webrtc.test.ts';
import './unit/replication-checkpoints.test.ts';
import './unit/encryption.test.ts';
import './unit/rx-state.test.ts';
import './unit/migration-schema.test.ts';
import './unit/attachments.test.ts';
import './unit/attachments-compression.test.ts';
import './unit/migration-storage.test.ts';
import './unit/crdt.test.ts';
import './unit/population.test.ts';
import './unit/leader-election.test.ts';
import './unit/backup.test.ts';
import './unit/import-export.test.ts';
import './unit/database-lifecycle.ts';
import './unit/plugin.test.ts';
import './unit/last.test.ts';
