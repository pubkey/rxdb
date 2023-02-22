const path = require('path');
const fs = require('fs');

const rootPath = path.join(
    __dirname,
    '../'
);

async function run() {

    // update version in package.json
    const packageJson = require(
        path.join(rootPath, 'package.json')
    );
    const newVersion = packageJson.version;
    if (
        !newVersion ||
        typeof newVersion !== 'string'
    ) {
        throw new Error('got no version');
    }

    const templateContent = await fs.promises.readFile(
        path.join(rootPath, 'src/plugins/utils/utils-rxdb-version.template.ts'),
        'utf-8'
    );
    const placeholderFlag = '|PLACEHOLDER|';
    if (!templateContent.includes(placeholderFlag)) {
        throw new Error('placeholder not found');
    }
    const versionFileContent = templateContent.replace(placeholderFlag, newVersion);
    const goalFilePath = path.join(rootPath, 'src/plugins/utils/utils-rxdb-version.ts');
    await fs.promises.writeFile(
        goalFilePath,
        versionFileContent,
        {
            encoding: 'utf8',
            // overwrite if exists
            flag: 'w'
        }
    );
}

run();
