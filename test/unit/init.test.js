console.log('######## init.test.js ########');
require('source-map-support').install();
import '@babel/polyfill';
import config from './config';
import BroadcastChannel from 'broadcast-channel';

// set faker seed
import faker from 'faker';
faker.seed(123);


config.platform.isNode = function() {
    return config.platform.name === 'node';
};

console.log('###### PLATFORM: ######');
if (typeof window !== 'undefined')
    console.log('USER-AGENT: ' + window.navigator.userAgent);
console.log('PLATFORM-NAME: ' + config.platform.name);
console.log('PLATFORM-VERSION: ' + config.platform.version);

if (config.platform.name !== 'node') {
    console.dir = (d) => {
        console.log(JSON.stringify(d));
    };
} else {
    /**
     * exit with non-zero on unhandledRejection
     */
    process.on('unhandledRejection', function(err) {
        console.log('init.test.js: unhandledRejection');
        console.error(err);
        process.exit(1);
    });

    // log version
    console.log('node -v :: ');
    console.dir(process.versions.node);
}


/**
 * MONKEYPATCH console.error on firefox
 * this is needed because core-js has its own non-catched-promise-behavior
 * and spams the console with useless error-logs.
 */
if (config.platform.name === 'firefox') {
    const consoleErrorBefore = console.error.bind(console);
    console.error = function(msg) {
        if (msg !== 'Unhandled promise rejection')
            consoleErrorBefore(msg);
    };
}


describe('init.test.js', () => {
    it('clear BroadcastChannel tmp folder', async () => {
        await BroadcastChannel.clearNodeFolder();
    });
});
