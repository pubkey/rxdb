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

export async function spawn(): Promise<{
    url: string,
    close: () => Promise<void>
}> {
    const port = await nextPort();
    const path = '/db';
    app.use(path, expressPouch);
    const ret = 'http://0.0.0.0:' + port + path;

    return new Promise(res => {
        const server = app.listen(port, function () {
            res({
                url: ret + '/' + randomString(5) + '/',
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
