import './unit/init.test.js';
import './unit/util.test.js';
import './unit/pouch-db-integration.test.js';
import './unit/adapter-check.test.js';


/**
 * Helpers that
 * do not fully test RxDB but
 * just single methods
 */
import './unit/custom-index.test.js';
import './unit/query-planner.test';

/**
 * Move these tests around so that
 * when you focus on one part of RxDB,
 * your relevant tests run first.
 * Do not commit this file if you modified the order.
 */
import './unit/rx-storage-implementations.test.js';
import './unit/rx-storage-pouchdb.test.js';
import './unit/rx-storage-lokijs.test.js';
import './unit/rx-storage-dexie.test.js';
import './unit/rx-storage-replication.test';

import './unit/instance-of-check.test.js';
import './unit/rx-schema.test.js';
import './unit/bug-report.test.js';
import './unit/rx-database.test.js';
import './unit/rx-collection.test.js';
import './unit/rx-document.test.js';
import './unit/rx-query.test.js';
import './unit/primary.test.js';
import './unit/local-documents.test.js';
import './unit/encryption.test.js';
import './unit/temporary-document.test.js';
import './unit/change-event-buffer.test.js';
import './unit/cache-replacement-policy.test';
import './unit/query-builder.test.js';
import './unit/key-compression.test.js';
import './unit/idle-queue.test.js';
import './unit/conflict-handling.test';
import './unit/event-reduce.test.js';
import './unit/reactive-collection.test.js';
import './unit/attachments.test.js';
import './unit/reactive-query.test.js';
import './unit/data-migration.test.js';
import './unit/reactive-document.test.js';
import './unit/cleanup.test.js';
import './unit/hooks.test.js';
import './unit/orm.test.js';
import './unit/population.test.js';
import './unit/leader-election.test.js';
import './unit/backup.test.js';
import './unit/replication.test.js';
import './unit/replication-couchdb.test.js';
import './unit/replication-graphql.test.js';
import './unit/import-export.test.js';
import './unit/cross-instance.test.js';
import './unit/server.test.js';
import './unit/plugin.test.js';
import './unit/dexie-helper.test.js';
import './unit/performance.test';
import './unit/last.test.js';


