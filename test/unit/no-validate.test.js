import config from './config';

describe('no-validate.test.js', () => {
    it('should allow everything', async () => {
        if (!config.platform.isNode())
            return;

        const spawn = require('child-process-promise').spawn;
        const stdout = [];
        const stderr = [];
        const promise = spawn('mocha', ['../test_tmp/unit/no-validate.node.js']);
        const childProcess = promise.childProcess;
        childProcess.stdout.on('data', data => {
            // comment in to debug
            // console.log(':: ' + data.toString());
            stdout.push(data.toString());
        });
        childProcess.stderr.on('data', data => stderr.push(data.toString()));
        try {
            await promise;
        } catch (err) {
            console.log('errrrr');
            console.dir(stdout);
            throw new Error(`could not run no-validate.node.js.
                        # Error: ${err}
                        # Output: ${stdout}
                        # ErrOut: ${stderr}
                        `);
        }
    });
});
