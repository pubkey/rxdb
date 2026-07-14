/**
 * Transforms that lower modern JS syntax (classes, block-scoping, template-literals, ...)
 * are only needed for the es5/CJS build. The esm build targets modern browsers
 * that support this syntax natively, so lowering it there only adds @babel/runtime
 * helper imports (inheritsLoose, createClass, ...) and bytes for no benefit.
 *
 * These legacy transforms must keep their original ordering relative to
 * '@babel/plugin-transform-typescript' (which handles TypeScript parameter
 * properties), so they are inserted right after it, not at the front.
 */
const isEs5 = process.env['NODE_ENV'] === 'es5';

// legacy syntax-lowering that runs before @babel/transform-runtime (es5 build only).
const legacySyntaxPluginsBeforeRuntime = [
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
    '@babel/transform-block-scoping'
];

// legacy syntax-lowering that runs after @babel/transform-runtime (es5 build only).
const legacySyntaxPluginsAfterRuntime = [
    '@babel/plugin-transform-class-properties'
];

const plugins = [
    '@babel/plugin-transform-explicit-resource-management',
    '@babel/plugin-transform-typescript',
    ...(isEs5 ? legacySyntaxPluginsBeforeRuntime : []),
    ['@babel/transform-runtime', {
        'regenerator': false
    }],
    ...(isEs5 ? legacySyntaxPluginsAfterRuntime : []),
    '@babel/plugin-transform-react-jsx'
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

if (isEs5) {
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
