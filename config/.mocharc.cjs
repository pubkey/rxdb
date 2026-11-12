const path = require('node:path');

const mochaSettings = {
    bail: true,
    timeout: 10000,
    exit: true,
    reporter: 'spec',
    require: [
        path.join(__dirname, 'mocha-source-maps.cjs')
    ]
};

if (process.env.NODE_PROF) {
    console.log('profiler activated:');
    mochaSettings.prof = true;
    mochaSettings.bail = false;
}

module.exports = mochaSettings;
