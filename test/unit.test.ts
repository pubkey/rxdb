import './unit/init.test';
import './unit/util.test';


/**
 * Helpers that
 * do not fully test RxDB but
 * just single methods
 */
import './unit/custom-index.test';
import './unit/query-planner.test';


/**
 * Move these tests around so that
 * when you focus on one part of RxDB,
 * your relevant tests run first.
 * Do not commit this file if you modified the order.
 */
import './unit/rx-storage-implementations.test';
import './unit/rx-storage-query-correctness.test';

import './unit/rx-storage-lokijs.test';
import './unit/rx-storage-dexie.test';

import './unit/instance-of-check.test';
import './unit/rx-schema.test';
import './unit/bug-report.test';
import './unit/rx-database.test';
import './unit/rx-collection.test';
import './unit/rx-document.test';
import './unit/validate.test';
import './unit/attachments.test';
import './unit/encryption.test';
import './unit/rx-query.test';
import './unit/cross-instance.test';
import './unit/local-documents.test';
import './unit/change-event-buffer.test';
import './unit/reactive-query.test';
import './unit/key-compression.test';
import './unit/event-reduce.test';
import './unit/cache-replacement-policy.test';
import './unit/query-builder.test';
import './unit/idle-queue.test';
import './unit/conflict-handling.test';
import './unit/reactive-collection.test';
import './unit/data-migration.test';
import './unit/reactive-document.test';
import './unit/cleanup.test';
import './unit/hooks.test';
import './unit/orm.test';
import './unit/replication-protocol.test';
import './unit/replication.test';
import './unit/replication-graphql.test';
import './unit/replication-couchdb.test';
import './unit/replication-websocket.test';
import './unit/replication-p2p.test';
import './unit/crdt.test';
import './unit/population.test';
import './unit/leader-election.test';
import './unit/backup.test';
import './unit/import-export.test';
import './unit/plugin.test';
import './unit/last.test';
