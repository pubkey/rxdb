const assert = require('assert');
const {
    createRxDatabase,
    addRxPlugin,
    blobBufferUtil,
} = require('rxdb');
const { RxDBLeaderElectionPlugin } = require('rxdb/plugins/leader-election');
const { RxDBAttachmentsPlugin } = require('rxdb/plugins/attachments');
const { getRxStoragePouch, addPouchPlugin } = require('rxdb/plugins/pouchdb');

addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBAttachmentsPlugin);
addPouchPlugin(require('pouchdb-adapter-idb'));


/**
 * this tests run inside of the browser-windows so we can ensure
 * rxdb works correctly
 */
module.exports = (function () {
    const runTests = async function () {
        // issue #587 Icorrect working attachments in electron-render
        await (async function () {
            const db = await createRxDatabase({
                // generate simple random ID to avoid conflicts when running tests at the same time
                name: 'foobar587' + Math.round(Math.random() * 0xffffff).toString(16),
                storage: getRxStoragePouch('idb'),
                password: 'myLongAndStupidPassword',
                multiInstance: true
            });
            await db.waitForLeadership();

            await db.addCollections({
                heroes: {
                    schema: {
                        primaryKey: 'id',
                        version: 0,
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                maxLength: 100
                            }
                        },
                        attachments: {}
                    }
                }
            });
            const doc = await db.heroes.insert({
                id: 'foo'
            });
            assert.ok(doc);

            const dataString = 'foo bar asldfkjalkdsfj';
            const attachmentData = blobBufferUtil.createBlobBuffer(dataString, 'text/plain');
            const attachment = await doc.putAttachment({
                id: 'cat.jpg',
                data: attachmentData,
                type: 'text/plain'
            });
            assert.ok(attachment);


            // issue #1371 Attachments not working in electron renderer with idb
            const readData = await attachment.getStringData();
            assert.strictEqual(readData, dataString);

            await db.destroy();
        }());
    };
    return runTests;
}());
