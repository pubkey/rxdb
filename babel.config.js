const plugins = [
    '@babel/plugin-transform-explicit-resource-management',
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
    '@babel/transform-sticky-regex',
    '@babel/transform-unicode-regex',
    '@babel/transform-block-scoping',
    ['@babel/transform-runtime', {
        'regenerator': true
    }],
    '@babel/proposal-class-properties'
];

let presets = [
    [
        '@babel/typescript',
        {
            rewriteImportExtensions: true,
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
                rewriteImportExtensions: true,
                loose: true,
                targets: {
                    edge: '107',
                    firefox: '107',
                    chrome: '108',
                    safari: '16.2'
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
