import {
    startSignalingServerSimplePeer
} from '../plugins/replication-webrtc/index.mjs';
import { createServer } from 'node:https';
import fs from 'fs';
import {
    wait
} from 'async-test-util';


/**
 * This script starts the public signaling server for RxDB at wss://signaling.rxdb.info
 * which can be used for prototypes and try-outs. You should never
 * use that in production, instead you should host your own signaling server.
 *
 * Letsencrypt certbot setup:
 * > certbot certonly --standalone --agree-tos --preferred-challenges http -d signaling.rxdb.info
 *
 *
 */

const sslKeyPath = '/etc/letsencrypt/live/signaling.rxdb.info/privkey.pem';
const sslCertPath = '/etc/letsencrypt/live/signaling.rxdb.info/fullchain.pem';

async function run() {

    console.log('# Start Cloud Signaling Server');

    const serverOptions = readCertsSync();

    const server = createServer(serverOptions);


    const signalingServer = await startSignalingServerSimplePeer(server);

    server.listen(443, () => {
        console.log('# Started Server on 443');
    });


    /**
     * Refresh httpd's certs when certs change on disk. The timeout stuff
     * "ensures" that all 3 relevant files are updated, and accounts for
     * sometimes trigger-happy fs.watch.
     * @link https://stackoverflow.com/a/74076392/3443137
     */
    fs.watch(sslKeyPath, async () => {
        console.log('# ssl certificate has changed -> update https secure context');

        // wait a bit in case it first changed the key and afterwards changed the cert
        await wait(2000);
        server.setSecureContext(readCertsSync());
        console.log('# ssl certificate has changed -> secure context changed');
    });

}

/**
 * Auto reload when ceritficate has changed
 */
function readCertsSync() {
    return {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath)
    };
}

run();
