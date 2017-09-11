console.log('######## init.test.js ########');

import 'babel-polyfill';

// set faker seed
import faker from 'faker';
faker.seed(123);

const platform = require('detect-browser');

platform.isNode = function() {
    return platform.name == 'node';
};

console.log('###### PLATFORM: ######');
if (typeof window !== 'undefined')
    console.log('USER-AGENT: ' + window.navigator.userAgent);
console.log('PLATFORM-NAME: ' + platform.name);
console.log('PLATFORM-VERSION: ' + platform.version);

if (platform.name != 'Node.js') {
    console.dir = (d) => {
        console.log(JSON.stringify(d));
    };
} else {
    process.on('unhandledRejection', function(err) {
        console.log('init.test.js: unhandledRejection');
        console.error(err);
        process.exit(1);
    });
}


/**
 * MONKEYPATCH console.error on firefox
 * this is needed because core-js has its own non-catched-promise-behavior
 * and spams the console with useless error-logs.
 */
if (platform.name === 'firefox') {
    const consoleErrorBefore = console.error.bind(console);
    console.error = function(msg) {
        if (msg !== 'Unhandled promise rejection')
            consoleErrorBefore(msg);
    };
}
