/**
 * this script processes the profile and cleans up afterwards
 * @link https://nodejs.org/en/docs/guides/simple-profiling/
 */
const path = require('path');
const walkSync = require('walk-sync');
const shell = require('shelljs');
const del = require('delete');

const run = async () => {
    const configPath = path.join(__dirname, '../config');
    const files = walkSync(configPath);
    const isolateFile = files.find(name => name.startsWith('isolate-'));
    if (!isolateFile) throw new Error('no isolate-* file found');
    const isolatePath = configPath + '/' + isolateFile;
    const cmd = 'node --prof-process ' + isolatePath + ' > processed.txt';
    if (shell.exec(cmd).code !== 0) {
        console.error('processing ' + isolatePath + ' failed');
        process.exit(1);
    }

    await del.promise([isolatePath]);

    console.log('DONE - open processed.txt');
};

run();
