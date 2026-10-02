/**
 * Builds the database viewer page as a single self-contained
 * html file: docs-src/static/dbviewer/index.html
 * The docs build publishes it on https://rxdb.info/dbviewer/index.html
 * where the dbviewer plugin loads it into an iframe.
 */
import { build } from 'esbuild';
import {
    mkdirSync,
    writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(rootDir, 'docs-src/dbviewer/main.tsx');
const outFile = join(rootDir, 'docs-src/static/dbviewer/index.html');

const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    jsx: 'transform',
    // do not resolve docs-src/tsconfig.json, it extends the docusaurus config
    tsconfigRaw: '{}',
    define: {
        'process.env.NODE_ENV': '"production"'
    },
    legalComments: 'none'
});

const bundle = result.outputFiles[0].text
    // a literal </script inside the bundle would end the inline script tag early
    .replace(/<\/script/gi, '<\\/script');

const html = '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<meta name="robots" content="noindex">\n' +
    '<title>RxDB Database Viewer</title>\n' +
    '<style>html,body{margin:0;padding:0;height:100%;background:#0D0F18}#rxdbv-page-root{height:100%}</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="rxdbv-page-root"></div>\n' +
    '<script>\n' + bundle + '</script>\n' +
    '</body>\n' +
    '</html>\n';

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, html);
console.log('# dbviewer page written to ' + outFile + ' (' + Math.round(html.length / 1024) + ' kB)');
