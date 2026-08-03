/**
 * Runs a command once and then again on every file change
 * inside of the given folders.
 * Used by `npm run dev` and `npm run dev:example`.
 *
 * Usage:
 * node ./scripts/watch-and-run.mjs "npm run test:node:memory" src test
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const DEBOUNCE_TIME = 200;

const [, , command, ...folders] = process.argv;

if (!command || folders.length === 0) {
    console.error('watch-and-run.mjs: usage: node ./scripts/watch-and-run.mjs "<command>" <folder> [...folders]');
    process.exit(1);
}

let isRunning = false;
let hasChangedWhileRunning = false;
let debounceTimeout;

async function runCommand() {
    if (isRunning) {
        hasChangedWhileRunning = true;
        return;
    }
    isRunning = true;
    console.log('# watch-and-run: ' + command);
    const child = spawn(command, {
        shell: true,
        stdio: 'inherit'
    });
    await new Promise(res => child.on('exit', res));
    isRunning = false;

    if (hasChangedWhileRunning) {
        hasChangedWhileRunning = false;
        await runCommand();
    }
}

function handleChange() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => runCommand(), DEBOUNCE_TIME);
}

folders.forEach(folder => {
    const fullPath = path.resolve(process.cwd(), folder);
    fs.watch(fullPath, { recursive: true }, handleChange);
    console.log('# watch-and-run: watching ' + fullPath);
});

runCommand();
