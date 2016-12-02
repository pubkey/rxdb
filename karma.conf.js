module.exports = function(config) {
    config.set({

        basePath: '',

        frameworks: ['mocha', 'browserify'],


        files: [
            'test_tmp/browser/Adapters.test.js',
            'test_tmp/browser/Insert.test.js',
            'test_tmp/browser/Observe.test.js',
            'test_tmp/browser/CrossInstance.test.js'
        ],

        port: 9876,


        colors: true,

        autoWatch: false,

        browsers: ['Chrome'],

        // Karma plugins loaded
        plugins: [
            'karma-mocha',
            'karma-browserify',
            'karma-chrome-launcher'
        ],

        // Source files that you wanna generate coverage for.
        // Do not include tests or libraries (these files will be instrumented by Istanbul)
        preprocessors: {
            'test_tmp/browser/*.test.js': ['browserify']
        },




        singleRun: true
    });
};
