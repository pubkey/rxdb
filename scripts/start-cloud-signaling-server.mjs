import {
    startSignalingServerSimplePeer
} from '../plugins/replication-webrtc/index.mjs';
import { createServer } from 'node:https';
import { createServer as createHttpServer } from 'node:http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { wait } from 'async-test-util';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));


/**
 * This script starts the public signaling server for RxDB at wss://signaling.rxdb.info
 * which can be used for prototypes and try-outs. You should never
 * use that in production, instead you should host your own signaling server.
 *
 * Letsencrypt certbot setup:
 * > certbot certonly --agree-tos --preferred-challenges http -d signaling.rxdb.info --webroot -w /rxdb/scripts/acme-challenge
 *
 *
 */

const sslKeyPath = '/etc/letsencrypt/live/signaling.rxdb.info/privkey.pem';
const sslCertPath = '/etc/letsencrypt/live/signaling.rxdb.info/fullchain.pem';
const certbotChallengePath = path.join(__dirname, 'acme-challenge');

async function run() {
    console.log('# Start Cloud Signaling Server');


    /**
     * Start http server at port 80 to automatically solve
     * the certbot challenges
     */
    console.log('# Start http server');
    const httpServer = createHttpServer((_request, response) => {
        response.writeHead(200, { 'Content-Type': 'text/plain' });

        const files = fs.readdirSync(certbotChallengePath);
        const filename = files.find(f => f !== '.gittouch');
        let content = 'no certbot challenge';
        if (filename) {
            content = fs.readFileSync(path.join(certbotChallengePath, filename));
        }
        response.end(content, 'utf-8');
    });
    httpServer.listen(80, () => {
        console.log('# Start http server is up');
    });


    const serverOptions = readCertsSync();
    const server = createServer(serverOptions);

    console.log('# Start wss server');
    const signalingServer = await startSignalingServerSimplePeer({
        server
    });
    console.log('# WSS server is up');

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
