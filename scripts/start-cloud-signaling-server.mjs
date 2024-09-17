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
const certbotChallengePath = path.join(__dirname, 'acme-challenge', '.well-known', 'acme-challenge');

async function run() {
    console.log('# Start Cloud Signaling Server');


    /**
     * Start http server at port 80 to automatically solve
     * the certbot challenges
     */
    console.log('# Start http server');
    const httpServer = createHttpServer((request, response) => {
        console.log('# port 80 request to ' + request.url);
        response.writeHead(200, { 'Content-Type': 'text/plain' });

        if (!fs.existsSync(certbotChallengePath)) {
            console.log('challenge dir not exists at ' + certbotChallengePath);
            response.end('could not read certfile at ' + certbotChallengePath, 'utf-8');
            return;
        }

        const files = fs.readdirSync(certbotChallengePath).filter(f => f !== '.gittouch');
        console.log('acme files:');
        console.dir(files);

        const filename = files[0];
        let content = 'no certbot challenge';
        if (filename) {
            const filepath = path.join(certbotChallengePath, filename);
            try {
                content = fs.readFileSync(filepath);
                console.log('acme file content:');
                console.log(content);
            } catch (err) {
                console.log('# ERROR: could not read file content at ' + filepath);
                console.dir(err);

                response.end('could not read certfile at ' + filepath, 'utf-8');
                return;
            }
        }
        response.end(content, 'utf-8');
    });
    httpServer.listen(80, () => {
        console.log('# Start http server is up');
    });


    const serverOptions = readCertsSync();
    const server = createServer(serverOptions);

    console.log('# Start wss server');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
     *
     * We have to watch the parent dir, not the file itself
     * otherwise it will not detect the changes.
     * @link https://github.com/nodejs/node/issues/5039#issuecomment-178561688
     */
    fs.watch(path.join(sslKeyPath, '../'), { persistent: false, recursive: false }, async () => {
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
