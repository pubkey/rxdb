const {
    detect
} = require('detect-browser');
import parallel from 'mocha.parallel';

let useParallel = describe;
try {
    if (process.env.NODE_ENV === 'fast')
        useParallel = parallel;
} catch (err) {

}

const config = {
    platform: detect(),
    parallel: useParallel
};

if (config.platform.name === 'node') {
    process.setMaxListeners(100);
    require('events').EventEmitter.defaultMaxListeners = 100;
}

export default config;
