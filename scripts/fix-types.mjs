import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Recursively collect all .d.ts files under a directory.
 */
async function collectDtsFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectDtsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

async function fixDtsFile(file, addTsNoCheck = false) {
    let content = await fs.readFile(file, { encoding: 'utf-8' });

    // Replace .ts/.d.ts specifiers with .js so TypeScript resolves the companion .d.ts file.
    content = content.replace(/(?:\.d)?\.ts(?=['"])/g, '.js');

    if (addTsNoCheck) {
        content = `// @ts-nocheck\n${content}`;
    }

    await fs.writeFile(file, content);
}

async function main() {
    const distTypesDir = './dist/types';

    try {
        const files = await collectDtsFiles(distTypesDir);

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
