const plugins = [
    '@babel/plugin-transform-typescript',
    'transform-class-properties',
    ['@babel/transform-template-literals', {
        'loose': true
    }],
    '@babel/transform-literals',
    '@babel/transform-block-scoped-functions',
    ['@babel/plugin-transform-classes', {
        'loose': true
    }],
    '@babel/transform-object-super',
    '@babel/transform-sticky-regex',
    '@babel/transform-unicode-regex',
    '@babel/transform-block-scoping',
    '@babel/plugin-transform-member-expression-literals',
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
