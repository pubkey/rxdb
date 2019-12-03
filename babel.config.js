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
    '@babel/check-constants', ['@babel/transform-spread', {
        'loose': true
    }],
    '@babel/transform-parameters', ['@babel/transform-destructuring', {
        'loose': true
    }],
    '@babel/transform-block-scoping',
    '@babel/plugin-transform-member-expression-literals',
    '@babel/transform-property-literals',
    '@babel/transform-async-to-generator',
    '@babel/transform-regenerator', ['@babel/transform-runtime', {
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
