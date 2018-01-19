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

export default config;
