const assert = require('assert');
const {
    createRxDatabase,
    addPouchPlugin,
    getRxStoragePouch
} = require('../../../');
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
                name: 'foobar587' + new Date().getTime(),
                storage: getRxStoragePouch('idb'),
                password: 'myLongAndStupidPassword',
                multiInstance: true
            });

            await db.waitForLeadership();
            if (db.broadcastChannel.method.type !== 'native') {
                throw new Error('wrong BroadcastChannel-method chosen: ' + db.broadcastChannel.method.type);
            }

            await db.addCollections({
                heroes: {
                    schema: {
                        primaryKey: 'id',
                        version: 0,
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string'
                            }
                        },
                        attachments: {
                            encrypted: true
                        }
                    }
                }
            });
            const doc = await db.heroes.insert({
                id: 'foo'
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

            await db.destroy();
        }());
    };
    return runTests;
}());
