/**
 * Gitbook will change each file on rebuild by adding a new timestamp.
 * This causes many git diffs that are ugly and changed on each single release.
 *
 * Instead we remove the timestamp because we do not need it anyway.
 * @link https://github.com/GitbookIO/gitbook-cli/issues/48
 */

const path = require('path');
const walkSync = require('walk-sync');
const fs = require('fs');


function run() {
    const docsFolder = path.join(__dirname, '../docs');
    const files = walkSync(docsFolder);
    console.dir(files);

    files.forEach((file) => {
        if (!file.endsWith('.html')) {
            return;
        }

        const filePath = path.join(
            __dirname,
            '..',
            'docs',
            file
        );
        console.log(filePath);

        let content = fs.readFileSync(
            filePath,
            'utf-8'
        );

        content = content.replace(
            /"mtime":"[^"]*"/,
            '"mtime":""'
        );

        content = content.replace(
            /"time":"[^"]*"/,
            '"time":""'
        );

        fs.writeFileSync(
            filePath,
            content,
            'utf-8'
        );
    });

}
run();
