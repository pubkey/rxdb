/**
 * this script processes the profile and cleans up afterwards
 * @link https://nodejs.org/en/docs/guides/simple-profiling/
 */
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import walkSync from 'walk-sync';
import shell from 'shelljs';
import del from 'delete';

const run = async () => {
    const isolateFolder = path.join(__dirname, '../');
    const files = walkSync(isolateFolder);
    console.dir(files);
    const isolateFile = files.find(name => name.startsWith('isolate-'));
    if (!isolateFile) throw new Error('no isolate-* file found');
    const isolatePath = isolateFolder + '/' + isolateFile;
    const cmd = 'node --prof-process ' + isolatePath + ' > processed.txt';
    if (shell.exec(cmd).code !== 0) {
        console.error('processing ' + isolatePath + ' failed');
        process.exit(1);
    }

    await del.promise([isolatePath]);

    console.log('DONE - open processed.txt');
};

run();
