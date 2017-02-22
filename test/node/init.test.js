console.log('######## init.test.js ########');

const platform = require('platform');
platform.isNode = function() {
    return platform.name == 'Node.js';
}

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
        throw err;
    });
}
