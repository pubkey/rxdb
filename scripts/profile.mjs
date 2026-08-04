/**
 * this script processes the profile and cleans up afterwards
 * @link https://nodejs.org/en/docs/guides/simple-profiling/
 */
import path from 'path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import del from 'delete';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const run = async () => {
    const isolateFolder = path.join(__dirname, '../');
    const files = fs.readdirSync(isolateFolder);
    const isolateFile = files.find(name => name.startsWith('isolate-'));
    if (!isolateFile) throw new Error('no isolate-* file found');
    const isolatePath = isolateFolder + '/' + isolateFile;
    const cmd = 'node --prof-process ' + isolatePath + ' > processed.txt';
    if (spawnSync(cmd, { shell: true, stdio: 'inherit' }).status !== 0) {
        console.error('processing ' + isolatePath + ' failed');
        process.exit(1);
    }

    await del.promise([isolatePath]);

    console.log('DONE - open processed.txt');
};

run();
