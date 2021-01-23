/**
 * creates a new express-server to use as sync-target
 * @link https://github.com/pouchdb/express-pouchdb
 */

import randomToken from 'random-token';

const express = require('express');
const app = express();
const PouchDB = require('pouchdb');
const InMemPouchDB = PouchDB.defaults({
    prefix: '/test_tmp/server-temp-pouch/',
    db: require('memdown'),
    configPath: 'test_tmp/'
});
const expressPouch = require('express-pouchdb')(InMemPouchDB);

let lastPort = 12121;

export async function spawn(): Promise<{
    url: string,
    close: () => Promise<void>
}> {
    lastPort++;
    const path = '/db';
    app.use(path, expressPouch);
    const ret = 'http://localhost:' + lastPort + path;

    return new Promise(res => {
        const server = app.listen(lastPort, function () {
            res({
                url: ret + '/' + randomToken(5) + '/',
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
