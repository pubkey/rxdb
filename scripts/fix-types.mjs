import { promises as fs } from 'node:fs';

async function main () {
    const file = './dist/types/index.d.ts';
    try {
        let content = await fs.readFile(file, { encoding: 'utf-8' });
        // Convert only bare '.ts' specifier endings, keep existing '.d.ts' intact.
        content = content.replace(/(?<!\.d)\.ts(?=['"])/g, '.d.ts');

        // Guard against malformed declaration specifiers.
        if (/\.d\.d\.ts(?=['"])/.test(content)) {
            throw new Error('malformed declaration specifier found (.d.d.ts)');
        }

        content = `// @ts-nocheck
        ${content}`;
        await fs.writeFile(file, content);
    } catch (err) {
        console.error(`Fix types error：${err.message}`);
        process.exit(1);
    }
}
main();
