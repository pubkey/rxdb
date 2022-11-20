const plugins = [
    '@babel/plugin-transform-typescript',
    'transform-class-properties',
    ['@babel/transform-template-literals', {
        'loose': true
    }],
    '@babel/transform-literals',
    '@babel/transform-function-name',
    '@babel/transform-arrow-functions',
    '@babel/transform-block-scoped-functions',
    ['@babel/plugin-transform-classes', {
        'loose': true
    }],
    '@babel/transform-object-super',
    '@babel/transform-shorthand-properties',
    ['@babel/transform-computed-properties', {
        'loose': true
    }],
    ['@babel/transform-for-of', {
        'loose': true
    }],
    '@babel/transform-sticky-regex',
    '@babel/transform-unicode-regex',
    ['@babel/transform-spread', {
        'loose': true
    }],
    '@babel/transform-parameters', ['@babel/transform-destructuring', {
        'loose': true
    }],
    '@babel/transform-block-scoping',
    '@babel/plugin-transform-member-expression-literals',
    '@babel/transform-property-literals',

    /**
     * Transpile async/await to promises instead of generators.
     * This has shown to be 10% smaller build size and also be a bit faster.
     *
     */
    ['babel-plugin-transform-async-to-promises', {
        /**
         * TODO use externalHelpers instead of inlineHelpers,
         * but we have to wait for this bug to be fixed:
         * @link https://github.com/rpetrich/babel-plugin-transform-async-to-promises/issues/62
         * @link https://github.com/rpetrich/babel-plugin-transform-async-to-promises/issues/78
         */
        externalHelpers: false,
        inlineHelpers: true
    }],

    ['@babel/transform-runtime', {
        'regenerator': true
    }],
    '@babel/proposal-class-properties',
    '@babel/proposal-object-rest-spread'
];

let presets = [
    [
        '@babel/typescript',
        {
            loose: true,
            modules: false
        }
    ]
];

// console.log('babel: NODE_ENV: ' + process.env['NODE_ENV']);

if (process.env['NODE_ENV'] === 'es5') {
    presets = [
        [
            '@babel/typescript',
            {
                loose: true,
                targets: {
                    edge: '17',
                    firefox: '60',
                    chrome: '67',
                    safari: '11.1',
                    ie: '11'
                },
                useBuiltIns: false
            }]
    ];
    plugins.unshift('@babel/plugin-transform-modules-commonjs');
}

module.exports = {
    presets,
    plugins
};
