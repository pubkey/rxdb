'use strict';

const mochaSettings = {
    bail: true,
    timeout: 10000,
    exit: true,
    reporter: 'spec'
};
if (process.env.TRAVIS) {
    // this is so high because travis has different machines
    // that are randomly slow
    mochaSettings.timeout = 120 * 1000;
    mochaSettings.reporter = 'min';
};
if (process.env.NODE_PROF) {
    console.log('profiler actived:');
    mochaSettings.prof = true;
    mochaSettings.bail = false;
}

module.exports = mochaSettings;