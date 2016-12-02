import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babelrc from 'babelrc-rollup';
import sizes from 'rollup-plugin-sizes';


const doUglify = JSON.parse(process.env.UGLIFY);

let destPath = 'dist/rxdb';
if (doUglify) destPath += '.min'
destPath += '.rollup.js';

export default {
    moduleName: 'rxdb',
    format: 'iife',
    entry: 'src/index.js',
    dest: destPath,
    intro: 'if(!vm) vm = {};if(!EventEmitter) EventEmitter = function(){};',
    plugins: [
        commonjs({
            include: ['node_modules/**'],
            exclude: [],
            extensions: ['.js'],
            ignoreGlobal: false, // Default: false // TODO maybe use global
            sourceMap: !doUglify,
            browser: true, // Default: false
            namedExports: {
                'node_modules/events/events.js': ['EventEmitter'],
                'node_modules/js-sha3/src/sha3.js': ['sha3_512']
                    //                'node_modules/crypto-js': ['encrypt', 'decrypt'] // TODO this shows error
            }
        }),
        babel({
            babelrc: false,
            presets: ['es2015-rollup', 'stage-0'],
            runtimeHelpers: true,
            plugins: [
                "external-helpers",
"transform-runtime"
            ]
        }),
        nodeResolve({
            module: true,
            jsnext: true,
            main: true,
            skip: [],
            browser: true,
            extensions: ['.js', '.json'],
            preferBuiltins: false // Default: true // TODO maybe set to true
        }),
        doUglify && uglify(),
        sizes()
    ]
}
