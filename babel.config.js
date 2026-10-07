/**
 * The esm build targets modern browsers that support native `class` syntax.
 * Down-transpiling classes there only pulls in @babel/runtime helper imports
 * (inheritsLoose, createClass, readOnlyError, wrapNativeSuper) and extra bytes
 * for no benefit, so the class transforms only run for the es5/CJS build.
 *
 * Only the class-related transforms are made conditional. The other syntax
 * transforms (block-scoping, template-literals, ...) do not emit @babel/runtime
 * helpers, so keeping them in both builds preserves the existing runtime
 * behavior (e.g. `const`/`let` hoisting) while still dropping the helpers.
 */
const isEs5 = process.env['NODE_ENV'] === 'es5';

// only include the given class-lowering plugins for the es5/CJS build.
const classOnly = (pluginList) => (isEs5 ? pluginList : []);

const plugins = [
    '@babel/plugin-transform-explicit-resource-management',
    ['@babel/plugin-transform-typescript', {
        onlyRemoveTypeImports: false
    }],
    /**
     * Must run before @babel/plugin-transform-classes,
     * otherwise babel throws 'Missing class properties transform'.
     */
    ...classOnly(['@babel/plugin-transform-class-properties']),
    ['@babel/transform-template-literals', {
        'loose': true
    }],
    '@babel/transform-literals',
    '@babel/transform-block-scoped-functions',
    ...classOnly([
        ['@babel/plugin-transform-classes', {
            'loose': true
        }]
    ]),
    '@babel/transform-sticky-regex',
    '@babel/transform-unicode-regex',
    '@babel/transform-block-scoping',
    '@babel/transform-runtime',
    ['@babel/plugin-transform-react-jsx', {
        runtime: 'classic'
    }]
];

let presets = [
    [
        '@babel/typescript',
        {
            rewriteImportExtensions: true,
            onlyRemoveTypeImports: false
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
                onlyRemoveTypeImports: false
            }]
    ];
    plugins.unshift('@babel/plugin-transform-modules-commonjs');
}

module.exports = {
    presets,
    plugins,
    /**
     * The Dart package of the flutter plugin contains a generated
     * JavaScript bundle and Flutter build output that must not be transpiled.
     */
    ignore: ['./src/plugins/flutter/dart/**']
};
