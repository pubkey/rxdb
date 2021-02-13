import * as assert from 'assert';
import got from 'got';
import {
    waitUntil
} from 'async-test-util';

const baseUrl = 'http://localhost:4000/';

describe('ssr.test.ts', function () {
    this.timeout(1000 * 120);

    async function getHtml(url: string): Promise<string> {
        const content = await got<string>({
            url
        });

        return content.body;
    }

    it('should get some html', async () => {
        const html = await getHtml(baseUrl);
        assert.ok(html);
    });
    it('should contain data from the rxdb instance', async () => {

        await waitUntil(
            async () => {
                const html = await getHtml(baseUrl);
                // console.log(html);
                const ok = html.includes('Gandalf');
                if (!ok) {
                    console.log('Gandalf not in html');
                }
                return ok;
            },
            1000 * 120
        )
    });
});
