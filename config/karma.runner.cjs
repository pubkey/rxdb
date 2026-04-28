'use strict';

/**
 * Sequential Karma browser test runner.
 *
 * Problem: karma's built-in `concurrency` option does not reliably prevent
 * parallel browser execution in CI, and even when it does, karma still runs
 * every browser before reporting a failure.
 *
 * This script fixes both issues by running karma once per detected browser:
 *  - Only one browser process is alive at any point.
 *  - If a browser run fails, the script exits immediately with a non-zero
 *    code and subsequent browsers are never started.
 *
 * Usage (via npm scripts):
 *   node ./config/karma.runner.cjs
 *
 * The script reads the same environment variables as the karma config:
 *   CI=true              — enable multi-browser detection
 *   DEFAULT_STORAGE=...  — forwarded to the karma config / browser tests
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Browser detection
// ---------------------------------------------------------------------------

/**
 * Browsers that should never be used — kept in sync with the
 * `doNotUseTheseBrowsers` list in karma.conf.cjs.
 */
const EXCLUDED_BROWSERS = new Set([
    'PhantomJS',
    'SafariTechPreview',
    'FirefoxAurora',
    'FirefoxNightly',
    'ChromeCanary',
    'Chromium',
]);

/**
 * Returns the list of browsers installed on the current machine.
 * Replicates the detection logic of karma-detect-browsers so that the
 * same set of browsers is chosen as the karma framework plugin would pick.
 */
function detectBrowsers() {
    const which = require('which');
    const browserDefs = require('karma-detect-browsers/browsers');

    let browserNames = Object.keys(browserDefs);

    // On Linux only one Firefox variant is installed; skip the others
    // (mirrors the karma-detect-browsers internal behaviour).
    if (process.platform === 'linux') {
        browserNames = browserNames.filter(
            (n) => n !== 'firefoxAurora' && n !== 'firefoxNightly'
        );
    }

    const found = [];
    for (const key of browserNames) {
        const def = browserDefs[key];

        if (EXCLUDED_BROWSERS.has(def.name)) {
            continue;
        }

        // Honour env-var override (e.g. CHROME_BIN, FIREFOX_BIN)
        if (process.env[def.ENV_CMD]) {
            try {
                which.sync(process.env[def.ENV_CMD]);
                found.push(def.name);
                continue;
            } catch (_) { /* not found via env var */ }
        }

        // Fall back to checking default paths for this platform
        const paths = def.DEFAULT_CMD[process.platform] || [];
        for (const p of paths) {
            try {
                if (fs.existsSync(p) || which.sync(p)) {
                    if (!found.includes(def.name)) {
                        found.push(def.name);
                    }
                    break;
                }
            } catch (_) { /* not found at this path */ }
        }
    }

    return found;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const isCI = Boolean(process.env.CI);

/**
 * In CI all detected browsers are tested one after another.
 * Locally only Chrome is used to keep iteration fast (matching the
 * non-CI branch in karma.conf.cjs postDetection).
 */
const browsers = isCI ? detectBrowsers() : ['Chrome'];

if (browsers.length === 0) {
    console.error('# karma.runner: ERROR — no browsers detected. Aborting.');
    process.exit(1);
}

console.log('# karma.runner: Sequential browser test runner');
console.log('# karma.runner: CI mode   :', isCI);
console.log('# karma.runner: Browsers  :', browsers.join(', '));

const karmaConf = path.resolve(__dirname, 'karma.conf.cjs');
const karmaBin = path.resolve(__dirname, '..', 'node_modules', '.bin', 'karma');

for (const browser of browsers) {
    console.log('\n# ──────────────────────────────────────────────────────');
    console.log(`# karma.runner: Starting browser → ${browser}`);
    console.log('# ──────────────────────────────────────────────────────\n');

    const result = spawnSync(
        karmaBin,
        ['start', karmaConf, '--single-run', '--browsers', browser],
        { stdio: 'inherit', env: process.env }
    );

    const exitCode = result.status ?? 1;

    if (exitCode !== 0) {
        console.error(
            `\n# karma.runner: ✗ FAILED in ${browser} (exit code ${exitCode}). Aborting.`
        );
        process.exit(exitCode);
    }

    console.log(`\n# karma.runner: ✓ PASSED  in ${browser}`);
}

console.log('\n# karma.runner: All browser tests passed!');
