console.log('######## init.test.js ########');
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();
import '@babel/polyfill';
import config from './config.ts';
import assert from 'assert';
import {
    clearNodeFolder
} from 'broadcast-channel';

// add dev-mode plugin
import { addRxPlugin, overwritable } from '../../plugins/core/index.mjs';
import { RxDBDevModePlugin } from '../../plugins/dev-mode/index.mjs';
import { isDeno, isNode } from '../../plugins/test-utils/index.mjs';
addRxPlugin(RxDBDevModePlugin);

console.log('###### PLATFORM: ######');
if (typeof window !== 'undefined') {
    console.log('USER-AGENT: ' + window.navigator.userAgent);
}
console.log('STORAGE: ' + config.storage.name);

if (!isNode) {
    console.dir = (d: any) => {
        console.log(JSON.stringify(d));
    };
} else {
    /**
     * exit with non-zero on unhandledRejection
     */
    process.on('unhandledRejection', async function (error, p) {
        console.log('init.test.js: unhandledRejection');

        // use log and error because some CI terminals do not show errors.
        try {
            console.dir(await p);
        } catch (err) {
            console.log('------- COULD NOT AWAIT p');
            logUnknownError(err);
            logUnknownError(error);
            process.exit(5);
        }
        console.dir((error as any).stack);
        console.error(error);
        console.dir(error);
        console.log('------- END OF unhandledRejection debug logs');
        process.exit(5);
    });

    // log version
    console.log('node -v :: ');
    console.dir(process.versions.node);
}

function logUnknownError(err: any) {
    if (err instanceof Error) {
        console.error(err.stack || err.message);
    } else {
        console.error('Non-Error rejection:', err);
        console.error(err.stack || err.message);
        try {
            console.error(JSON.stringify(err, null, 2));
        } catch {
            console.error(String(err));
        }
    }
}


describe('init.test.ts', () => {
    it('ensure dev-mode is activated', () => {
        assert.ok(overwritable.isDevMode());
    });
    it('init storage', async () => {
        if (config.storage.init) {
            await config.storage.init();
        }
    });
    it('clear BroadcastChannel tmp folder', async () => {
        await clearNodeFolder();
    });
    it('start test servers', async () => {
        if (isNode) {
            console.log('START TEST SERVERS');
            const { startTestServers } = await import('' + '../helper/test-servers.js' + '');
            startTestServers();
        } else if (isDeno) {
            console.log('START TEST SERVERS');
            const { startTestServers } = await import('' + '../helper/test-servers.ts' + '');
            startTestServers();
        }
    });
});
