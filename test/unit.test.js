const nodeAndBrowser = [
    '../test_tmp/unit/init.test.js',
    '../test_tmp/unit/util.test.js',
    '../test_tmp/unit/pouch-db-integration.test.js',
    '../test_tmp/unit/adapter-check.test.js',
    '../test_tmp/unit/instance-of-check.test.js',
    '../test_tmp/unit/rx-schema.test.js',
    '../test_tmp/unit/key-compression.test.js',
    '../test_tmp/unit/bug-report.test.js',
    '../test_tmp/unit/rx-database.test.js',
    '../test_tmp/unit/rx-collection.test.js',
    '../test_tmp/unit/rx-document.test.js',
    '../test_tmp/unit/temporary-document.test.js',
    '../test_tmp/unit/change-event-buffer.test.js',
    '../test_tmp/unit/rx-query.test.js',
    '../test_tmp/unit/idle-queue.test.js',
    '../test_tmp/unit/query-change-detector.test.js',
    '../test_tmp/unit/reactive-database.test.js',
    '../test_tmp/unit/reactive-collection.test.js',
    '../test_tmp/unit/reactive-query.test.js',
    '../test_tmp/unit/reactive-document.test.js',
    '../test_tmp/unit/primary.test.js',
    '../test_tmp/unit/hooks.test.js',
    '../test_tmp/unit/orm.test.js',
    '../test_tmp/unit/population.test.js',
    '../test_tmp/unit/data-migration.test.js',
    '../test_tmp/unit/leader-election.test.js',
    '../test_tmp/unit/replication.test.js',
    '../test_tmp/unit/encryption.test.js',
    '../test_tmp/unit/import-export.test.js',
    '../test_tmp/unit/cross-instance.test.js',
    '../test_tmp/unit/mod-encryption.test.js',
    '../test_tmp/unit/local-documents.test.js',
    '../test_tmp/unit/in-memory.test.js',
    '../test_tmp/unit/server.test.js',
    '../test_tmp/unit/attachments.test.js',
    '../test_tmp/unit/version-migration.test.js'
];

const last = [
    '../test_tmp/unit/last.test.js'
];

const nodeOnly = [
    '../test_tmp/unit/plugin.test.js'
];

const typings = [
    '../test_tmp/unit/typings.test.js'
];

const performance = [
    '../test_tmp/unit/performance.test.js'
];

const couchdb = [
    '../test_tmp/unit/couch-db-integration.test.js'
];

module.exports = {
    browser: nodeAndBrowser.concat(last),
    all: nodeAndBrowser.concat(nodeOnly).concat(last),
    typings,
    performance,
    couchdb
};
