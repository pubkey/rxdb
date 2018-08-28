let presets = [
    [
        '@babel/env',
        {
            loose: true,
            modules: false
        }
    ]
];
if (process.env['NODE_ENV'] === 'es5') {
    presets = [
        ['@babel/env', {
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
}

const plugins = [
    ['@babel/transform-template-literals', {
        'loose': true
    }],
    '@babel/transform-literals',
    '@babel/transform-function-name',
    '@babel/transform-arrow-functions',
    '@babel/transform-block-scoped-functions', ['@babel/transform-classes', {
        'loose': true
    }],
    '@babel/transform-object-super',
    '@babel/transform-shorthand-properties', ['@babel/transform-computed-properties', {
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
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-member-expression-literals',
    '@babel/transform-property-literals',
    '@babel/transform-async-to-generator',
    '@babel/transform-regenerator', ['@babel/transform-runtime', {
        'regenerator': true
    }]
];

module.exports = {
    presets,
    plugins
};
