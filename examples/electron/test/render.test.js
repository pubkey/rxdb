const assert = require('assert');
const {
    addRxPlugin
} = require('../../../');
addRxPlugin(require('pouchdb-adapter-idb'));

const {
    getDatabase
} = require('../database');

/**
 * this tests run inside of the browser-windows so we can ensure
 * rxdb works correctly
 */
module.exports = (function () {
    const runTests = async function () {
        // issue #587 Icorrect working attachments in electron-render
        await (async function () {
            const dbName = 'foobar587' + new Date().getTime();
            const adapter = 'idb';
            const db = await getDatabase(dbName, adapter);

            window.db = db;

            await db.waitForLeadership();
            if (db.broadcastChannel.method.type !== 'native') {
                throw new Error('wrong BroadcastChannel-method chosen: ' + db.broadcastChannel.method.type);
            }

            const doc = await db.heroes.insert({
                id: 'foo',
                name: 'kazy',
                color: 'brown'
            });
            assert.ok(doc);

            const attachmentData = 'foo bar asldfkjalkdsfj';
            const attachment = await doc.putAttachment({
                id: 'cat.jpg',
                data: attachmentData,
                type: 'text/plain'
            });
            assert.ok(attachment);

            // issue #1371 Attachments not working in electron renderer with idb
            const readData = await attachment.getStringData();
            assert.equal(readData, attachmentData);

            // issue #3022 Blob attachments not working with idb
            const blobDoc = await db.heroes.insert({
                id: 'blob-test',
                name: 'shanyrak',
                color: 'yellow'
            });
            const blobPayload = {
                id: 'blob.txt',
                doc: blobDoc,
                str: 'beshbarmak',
                type: 'text/plain'
            };
            await db.addBlobAttachment(blobPayload);
            const blobData = await blobDoc.getAttachment(blobPayload.id);
            const blobString = await blobData.getStringData();
            assert.equal(blobPayload.str, blobString);

            await db.destroy();
        }());
    };
    return runTests;
}());
