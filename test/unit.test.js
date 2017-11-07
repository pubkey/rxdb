const nodeAndBrowser = [
    '../test_tmp/unit/init.test.js',
    '../test_tmp/unit/util.test.js',
    '../test_tmp/unit/pouch-db-integration.test.js',
    '../test_tmp/unit/adapter-check.test.js',
    '../test_tmp/unit/rx-broadcast-channel.test.js',
    '../test_tmp/unit/instance-of-check.test.js',
    '../test_tmp/unit/in-memory.test.js', // TODO move this down under mod-encryption
    '../test_tmp/unit/rx-schema.test.js',
    '../test_tmp/unit/key-compression.test.js',
    '../test_tmp/unit/socket.test.js',
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
    '../test_tmp/unit/attachments.test.js',
    '../test_tmp/unit/bug-report.test.js'
];

const nodeOnly = [
    '../test_tmp/unit/plugin.test.js'
];

const typings = [
    '../test_tmp/unit/typings.test.js'
];
module.exports = {
    browser: nodeAndBrowser,
    all: nodeAndBrowser.concat(nodeOnly).concat(typings),
    typings
};
