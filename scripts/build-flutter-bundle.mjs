/**
 * Bundles RxDB together with the Flutter bridge into a single JavaScript file
 * that is shipped as an asset of the rxdb Dart package.
 * Also builds a bundle with a custom storage that the Dart tests use
 * to check that the storage can be switched out.
 * Usage: node ./scripts/build-flutter-bundle.mjs [--analyze]
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const basePath = path.join(__dirname, '..');
const dartPath = path.join(basePath, 'src/plugins/flutter/dart');

const BUNDLES = [
    {
        outFile: path.join(dartPath, 'assets/rxdb-flutter.js'),
        entry: [
            'import { startRxDBFlutterBridge } from "./src/plugins/flutter/index.ts";',
            'startRxDBFlutterBridge();'
        ]
    },
    {
        outFile: path.join(dartPath, 'test/assets/rxdb-custom-storage.js'),
        entry: [
            'import { startRxDBFlutterBridge, getSQLiteBasicsFlutter } from "./src/plugins/flutter/index.ts";',
            'import { getRxStorageSQLiteTrial } from "./src/plugins/storage-sqlite/index.ts";',
            'startRxDBFlutterBridge({',
            '    storage: getRxStorageSQLiteTrial({',
            '        sqliteBasics: getSQLiteBasicsFlutter(),',
            '        databaseNamePrefix: "custom-storage"',
            '    })',
            '});'
        ]
    }
];

for (const bundle of BUNDLES) {
    const result = await esbuild.build({
        stdin: {
            contents: bundle.entry.join('\n'),
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
        outfile: bundle.outFile,
        metafile: true,
        define: {
            'process.env.NODE_ENV': '"production"'
        },
        logLevel: 'warning'
    });
    const size = fs.statSync(bundle.outFile).size;
    console.log('# Flutter bundle written to ' + path.relative(basePath, bundle.outFile) + ' (' + Math.round(size / 1024) + ' KB)');
    if (process.argv.includes('--analyze')) {
        console.log(await esbuild.analyzeMetafile(result.metafile));
    }
}
