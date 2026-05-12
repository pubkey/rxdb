import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Recursively collect all .d.ts files under a directory,
 * excluding the hand-written types/ subdirectory which already
 * uses correct .d.ts extension specifiers.
 */
async function collectDtsFiles(dir, exclude = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!exclude.includes(fullPath)) {
                files.push(...await collectDtsFiles(fullPath, exclude));
            }
        } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

async function fixDtsFile(file, addTsNoCheck = false) {
    let content = await fs.readFile(file, { encoding: 'utf-8' });

    // Convert only bare '.ts' specifier endings, keep existing '.d.ts' intact.
    content = content.replace(/(?<!\.d)\.ts(?=['"])/g, '.d.ts');

    // Guard against malformed declaration specifiers.
    if (/\.d\.d\.ts(?=['"])/.test(content)) {
        throw new Error(`malformed declaration specifier found (.d.d.ts) in ${file}`);
    }

    if (addTsNoCheck) {
        content = `// @ts-nocheck\n        ${content}`;
    }

    await fs.writeFile(file, content);
}

async function main() {
    const distTypesDir = './dist/types';

    // The hand-written types/ subdirectory already uses correct specifiers.
    const excludeDirs = [path.resolve(distTypesDir, 'types')];

    try {
        const files = await collectDtsFiles(distTypesDir, excludeDirs);

        await Promise.all(files.map(file => {
            const addTsNoCheck = path.resolve(file) === path.resolve(`${distTypesDir}/index.d.ts`);
            return fixDtsFile(file, addTsNoCheck);
        }));
    } catch (err) {
        console.error(`Fix types error: ${err.message}`);
        process.exit(1);
    }
}
main();
