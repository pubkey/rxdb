/**
 * creates a new express-server to use as sync-target
 * @link https://github.com/pouchdb/express-pouchdb
 */

import { randomString } from 'async-test-util';
import { nextPort } from './port-manager';

const express = require('express');
const app = express();
const PouchDB = require('pouchdb');
const InMemPouchDB = PouchDB.defaults({
    prefix: '/test_tmp/server-temp-pouch/',
    db: require('memdown'),
    configPath: 'test_tmp/'
});
const expressPouch = require('express-pouchdb')(InMemPouchDB);

/**
 * Spawns a CouchDB server
 */
export async function spawn(
    databaseName = randomString(5),
    port?: number
): Promise<{
    dbName: string;
    url: string;
    close: () => Promise<void>;
}> {
    port = port ? port : await nextPort();
    const path = '/db';
    app.use(path, expressPouch);
    const dbRootUrl = 'http://0.0.0.0:' + port + path;

    return new Promise(res => {
        const server = app.listen(port, async function () {
            const url = dbRootUrl + '/' + databaseName + '/';

            // create the CouchDB database
            await fetch(
                url,
                {
                    method: 'PUT'
                }
            );

            res({
                dbName: databaseName,
                url,
                /**
                 * TODO add check in last.unit.test to ensure
                 * that all servers have been closed.
                 */
                close(now = false) {
                    if (now) {
                        server.close();
                        return Promise.resolve();
                    } else {
                        return new Promise(res2 => {
                            setTimeout(() => {
                                server.close();
                                res2();
                            }, 1000);
                        });
                    }
                }
            });
        });
    });
}
