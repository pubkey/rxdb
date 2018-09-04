const assert = require('assert');
const RxDB = require('../../../');
RxDB.plugin(require('pouchdb-adapter-idb'));


/**
 * this tests run inside of the browser-windows so we can ensure
 * rxdb works correctly
 */
module.exports = (function() {
    const runTests = async function() {
        // issue #587 Icorrect working attachments in electron-render
        await (async function() {
            const db = await RxDB.create({
                name: 'foobar587' + new Date().getTime(),
                adapter: 'idb',
                password: 'myLongAndStupidPassword',
                multiInstance: true
            });

            await db.waitForLeadership();
            if(db.socket.bc.method.type !== 'native'){
                throw new Error('wrong BroadcastChannel-method chosen: ' + db.socket.bc.method.type);
            }

            const col = await db.collection({
                name: 'heroes',
                schema: {
                    version: 0,
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            primary: true
                        }
                    },
                    attachments: {
                        encrypted: true
                    }
                }
            });
            const doc = await col.insert({
                id: 'foo'
            });
            assert.ok(doc);

            const attachment = await doc.putAttachment({
                id: 'cat.jpg',
                data: 'foo bar asldfkjalkdsfj',
                type: 'text/plain'
            });
            assert.ok(attachment);

            await db.destroy();
        })();
    };
    return runTests;
})();
