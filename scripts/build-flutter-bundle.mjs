/**
 * Bundles RxDB together with the Flutter bridge into a single JavaScript file
 * that is shipped as an asset of the rxdb Dart package.
 * Usage: node ./scripts/build-flutter-bundle.mjs
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(__dirname, '..');
const outFile = path.join(basePath, 'src/plugins/flutter/dart/assets/rxdb-flutter.js');

const result = await esbuild.build({
    stdin: {
        contents: [
            'import { startRxDBFlutterBridge } from "./src/plugins/flutter/index.ts";',
            'startRxDBFlutterBridge();'
        ].join('\n'),
        resolveDir: basePath,
        sourcefile: 'rxdb-flutter-entry.ts',
        loader: 'ts'
    },
    bundle: true,
    format: 'iife',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    outfile: outFile,
    metafile: true,
    define: {
        'process.env.NODE_ENV': '"production"'
    },
    logLevel: 'warning'
});

const size = fs.statSync(outFile).size;
console.log('# Flutter bundle written to ' + path.relative(basePath, outFile) + ' (' + Math.round(size / 1024) + ' KB)');
if (process.argv.includes('--analyze')) {
    console.log(await esbuild.analyzeMetafile(result.metafile));
}
