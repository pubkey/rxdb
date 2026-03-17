/**
 * Docusaurus uses 'git log' to determine the last update time for each docs page.
 * In shallow clones (common in CI), all files report the same commit date
 * because git only has one commit available. This causes every page to show
 * the same "Last updated" date.
 *
 * This script ensures the full git history is available before building docs,
 * so that 'git log' returns the actual per-file last modification date.
 */
import { execSync } from 'child_process';

function run() {
    let isShallow;
    try {
        isShallow = execSync('git rev-parse --is-shallow-repository', { encoding: 'utf-8' }).trim();
    } catch (err) {
        console.log('Could not determine if repository is shallow: ' + err.message);
        console.log('Skipping git history fetch.');
        return;
    }

    if (isShallow === 'true') {
        console.log('Shallow repository detected. Fetching full git history for accurate docs timestamps...');
        try {
            execSync('git fetch --unshallow', { stdio: 'inherit' });
            console.log('Full git history fetched successfully.');
        } catch (err) {
            console.warn('Warning: Could not fetch full git history: ' + err.message);
            console.warn('Docs "Last updated" dates may be inaccurate.');
        }
    } else {
        console.log('Full git history already available.');
    }
}

run();
