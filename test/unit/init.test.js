console.log('######## init.test.js ########');

import 'babel-polyfill';

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
