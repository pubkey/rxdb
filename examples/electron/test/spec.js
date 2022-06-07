const { _electron: electron } = require('playwright-core');
const assert = require('assert');
const path = require('path');
const AsyncTestUtil = require('async-test-util');

describe('Application launch', function() {
    this.timeout(20000);
    let app;
    before(async function() {
        this.app = await electron.launch({ args: [path.join(__dirname, '../main.js')] })
        app = this.app;
    });

    after(function() {
        return this.app.close();
    });

    it('shows an initial window', async () => {

        // wait for all two windows to complete
        await AsyncTestUtil.waitUntil(async () => {
            const windows = app.windows();

            if (windows.length !== 2) return false;

            const isWindow1Finished = await windows[0].evaluate('!!window.addHero');
            const isWindow2Finished = await windows[1].evaluate('!!window.addHero');
         
            return isWindow1Finished && isWindow2Finished;
        });
    });

    it('insert one hero', async () => {
        console.log('test: insert one hero');
        const window = await app.firstWindow();
        window.on('console', console.log);
        await window.fill('#input-name', 'Bob Kelso');
        await window.fill('#input-color', 'blue');
        await window.click('#input-submit');

        await AsyncTestUtil.waitUntil(async () => {
            const count = await window.locator('.name[name="Bob Kelso"]').count();
            return count > 0;
        });
        await AsyncTestUtil.wait(100);
    });

    it('check if replicated to both windows', async () => {
        await AsyncTestUtil.wait(100);

        const windows = app.windows();

        await AsyncTestUtil.waitUntil(async () => {
            const window = windows[0];
            const count = await window.locator('.name[name="Bob Kelso"]').count();
            return count > 0;
        });

        await AsyncTestUtil.waitUntil(async () => {
            const window = windows[1];
            const count = await window.locator('.name[name="Bob Kelso"]').count();
            return count > 0;
        });

        await AsyncTestUtil.wait(100);
    });
});
