/**
 * this checks if the plugin-method and functionality works as expected
 */

import assert from 'assert';
import clone from 'clone';
import AsyncTestUtil from 'async-test-util';

const exec = require('child-process-promise').exec;
const spawn = require('child-process-promise').spawn;

describe('Plugin.test.js', () => {
    describe('Core.node.js', () => {
        it('should run without errors', async() => {
            const stdout = [];
            const stderr = [];
            const promise = spawn('mocha', ['../test_tmp/unit/Core.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', data => stdout.push(data.toString()));
            childProcess.stderr.on('data', data => stderr.push(data.toString()));
            try {
                await promise;
            } catch (err) {
                console.log('errrrr');
                console.dir(stdout);
                throw new Error(`could not run Core.node.js.
                    # Error: ${err}
                    # Output: ${stdout}
                    # ErrOut: ${stderr}
                    `);
            }
        });
    });
});
