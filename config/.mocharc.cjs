const mochaSettings = {
    bail: true,
    timeout: 10000,
    exit: true,
    reporter: 'spec',
    /**
     * Makes Node.js use the source maps of the transpiled files,
     * so that stack traces point to the original typescript files.
     */
    'enable-source-maps': true
};

if (process.env.NODE_PROF) {
    console.log('profiler activated:');
    mochaSettings.prof = true;
    mochaSettings.bail = false;
}

module.exports = mochaSettings;
