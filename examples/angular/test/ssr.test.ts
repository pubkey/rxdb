import * as assert from 'assert';
import got from 'got';
import { waitUntil } from 'async-test-util';

const baseUrl = 'http://localhost:4200/';

describe('ssr.test.ts', function () {
    this.timeout(1000 * 120);

    async function getHtml(url: string): Promise<string> {
        const content = await got<string>({
            url
        });

        return content.body;
    }

    it('wait for first request until the server has bootet', async () => {
        await waitUntil(
            async () => {
                try {
                    await getHtml(baseUrl);
                    return true;
                } catch (err) {
                    console.log('-- waiting for server to start');
                    return false;
                }
            },
            undefined,
            1000
        );
    });

    it('should get some html', async () => {
        console.log('run first request');
        const html = await getHtml(baseUrl);
        console.log('run first request DONE');
        assert.ok(html);
    });
    it('should contain data from the rxdb instance', async function () {
        /**
         * If the timeout of 5 seconds is not enough,
         * there is likely something wrong with RxDB.
         * For example an open setTimeout prevents ssr from knowing the page is loaded
         */
        this.timeout(1000 * 5);
        const html = await getHtml(baseUrl);
        assert.ok(html.includes('Gandalf'));
    });
});
