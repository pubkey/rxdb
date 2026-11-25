import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootPath = path.join(
    __dirname,
    '../'
);

async function run() {

    // update version in package.json
    const packageJson = JSON.parse(
        await fs.promises.readFile(
            path.join(rootPath, 'package.json')
        )
    );
    // CLA-DB: Keep RXDB_VERSION aligned with the upstream RxDB storage-format version
    // (packageJson.claDb.upstreamVersion) so on-disk compatibility checks (DM5)
    // remain compatible with RxDB 16/17 databases while @clatech/db tracks its own SemVer.
    const newVersion = (packageJson.claDb && packageJson.claDb.upstreamVersion)
        ? packageJson.claDb.upstreamVersion
        : packageJson.version;
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
