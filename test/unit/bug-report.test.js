/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct possition in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browsers' so it runs in the browser
 */
import assert from 'assert';

import * as humansCollection from './../helper/humans-collection';

describe('bug-report.test.js', () => {
    it('should import dump of db with attachments', async () => {
        const sourceCol = await humansCollection.createAttachments(1);
        const doc = await sourceCol.findOne().exec();
        await doc.putAttachment({
            id: 'cat.txt',
            data: 'meow',
            type: 'text/plain'
        });
        const json = await sourceCol.dump();

        const destCol = await humansCollection.createAttachments(0);

        const noDocs = await destCol.find().exec();
        assert.equal(noDocs.length, 0);

        // this line triggers an error
        await destCol.importDump(json);

        const docs = await destCol.find().exec();
        assert.equal(docs.length, 1);

        const importedDoc = destCol.findOne().exec();
        const attachment = importedDoc.getAttachment('cat.txt');
        assert.ok(attachment);
        assert.equal(attachment.id, 'cat.txt');
        assert.equal(attachment.type, 'text/plain');

        const data = await attachment.getStringData();
        assert.equal(data, 'meow');

        sourceCol.database.destroy();
        destCol.database.destroy();
    });
});
