/**
 * Bundles realistic RxDB apps from config/bundle-size/
 * with esbuild for the browser and checks that their size
 * does not exceed the limits in config/bundle-size/limits.json.
 *
 * Requires 'npm run build' before.
 *
 * Usage:
 * node ./scripts/check-bundle-size.mjs           checks the limits
 * node ./scripts/check-bundle-size.mjs --update  writes the measured sizes as new limits
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, '../config/bundle-size');
const limitsFile = path.join(fixturesDir, 'limits.json');

const SCENARIOS = [
    'memory-minimal',
    'todo-dexie',
    'todo-dexie-plugins'
];

/**
 * When updating, the limits are set this much above the measured size
 * so that small changes do not fail the check.
 */
const HEADROOM = 1.02;

async function measure(scenario) {
    const result = await esbuild.build({
        entryPoints: [path.join(fixturesDir, scenario + '.mjs')],
        bundle: true,
        minify: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2022',
        write: false,
        outfile: scenario + '.js',
        define: {
            'process.env.NODE_ENV': '"production"'
        },
        logLevel: 'error'
    });
    const code = result.outputFiles[0].contents;
    return {
        minified: code.length,
        gzip: zlib.gzipSync(code, { level: 9 }).length
    };
}

function kb(bytes) {
    return (bytes / 1024).toFixed(1) + ' KB';
}

const update = process.argv.includes('--update');
const limits = fs.existsSync(limitsFile) ? JSON.parse(fs.readFileSync(limitsFile, 'utf-8')) : {};
const newLimits = {};
const failures = [];
const missing = [];

console.log('Bundle size (esbuild, minified, browser):');
for (const scenario of SCENARIOS) {
    const size = await measure(scenario);
    const limit = limits[scenario];
    newLimits[scenario] = {
        minified: Math.ceil(size.minified * HEADROOM),
        gzip: Math.ceil(size.gzip * HEADROOM)
    };
    let line = '- ' + scenario + ': ' + kb(size.minified) + ' minified, ' + kb(size.gzip) + ' gzip';
    if (limit) {
        line += ' (limit ' + kb(limit.minified) + ', ' + kb(limit.gzip) + ' gzip)';
        if (size.minified > limit.minified || size.gzip > limit.gzip) {
            failures.push(scenario);
        }
    } else if (!update) {
        missing.push(scenario);
        line += ' (no limit set)';
    }
    console.log(line);
}

if (update) {
    fs.writeFileSync(limitsFile, JSON.stringify(newLimits, null, 4) + '\n');
    console.log('Updated ' + path.relative(process.cwd(), limitsFile));
} else if (failures.length > 0 || missing.length > 0) {
    if (failures.length > 0) {
        console.error('\nERROR: The bundle size of ' + failures.join(', ') + ' exceeds the limit.');
    }
    if (missing.length > 0) {
        console.error('\nERROR: No limit is set for ' + missing.join(', ') + '.');
    }
    console.error(
        'If the change is intended, run "npm run bundle-size:update" and commit config/bundle-size/limits.json.'
    );
    process.exit(1);
} else {
    console.log('All bundle sizes are within their limits.');
}
