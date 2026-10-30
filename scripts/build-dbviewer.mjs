/**
 * Builds the database viewer page as a single self-contained
 * html file: docs-src/static/dbviewer/index.html
 * The docs build publishes it on https://rxdb.info/dbviewer/index.html
 * where the dbviewer plugin loads it into an iframe.
 */
import { build } from 'esbuild';
import {
    mkdirSync,
    readFileSync,
    writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(rootDir, 'docs-src/dbviewer/main.tsx');
const outFile = join(rootDir, 'docs-src/static/dbviewer/index.html');

/**
 * The viewer uses the same font as the docs pages. The font is
 * embedded as a data uri inside the docs css, so the @font-face
 * block is extracted from there and inlined into the page,
 * which keeps the page self-contained for offline hosting.
 */
const docsCss = readFileSync(join(rootDir, 'docs-src/src/css/custom.css'), 'utf8');
const fontFaceMatch = docsCss.match(/@font-face\s*\{[^}]*Atkinson Hyperlegible Mono[^}]*\}/);
if (!fontFaceMatch) {
    throw new Error('build-dbviewer: @font-face for "Atkinson Hyperlegible Mono" not found in docs-src/src/css/custom.css');
}
const fontFaceCss = fontFaceMatch[0];

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
    '<style>' + fontFaceCss + '</style>\n' +
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
