const compareVersion = require('compare-version');
const platform = require('platform');

const minVersion = '7.0.0';
const isVersion = platform.version;

if (compareVersion(isVersion, minVersion) === -1) {
    console.error('###########################################################');
    console.error('### Node-Version >=' + minVersion + ' is required  (you have ' + isVersion + ') ###');
    console.error('###########################################################');
    process.exit(1);
}
