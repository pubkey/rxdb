const Application = require('spectron').Application;
const assert = require('assert');
const electronPath = require('electron'); // Require Electron from the binaries included in node_modules.
const path = require('path');

describe('Application launch', function() {
    this.timeout(10000);

    beforeEach(function() {
        this.app = new Application({
            // Your electron path can be any binary
            // i.e for OSX an example path could be '/Applications/MyApp.app/Contents/MacOS/MyApp'
            // But for the sake of the example we fetch it from our node_modules.
            path: electronPath,

            // Assuming you have the following directory structure

            //  |__ my project
            //     |__ ...
            //     |__ main.js
            //     |__ package.json
            //     |__ index.html
            //     |__ ...
            //     |__ test
            //        |__ spec.js  <- You are here! ~ Well you should be.

            // The following line tells spectron to look and use the main.js file
            // and the package.json located 1 level above.
            args: [path.join(__dirname, '..')]
        });
        return this.app.start();
    });

    afterEach(function() {
        if (this.app && this.app.isRunning())
            return this.app.stop();
    });

    it('shows an initial window', async function() {
        const count = await this.app.client.getWindowCount();
        assert.equal(count, 2);
        // Please note that getWindowCount() will return 2 if `dev tools` are opened.
        // assert.equal(count, 2)
    });
});
