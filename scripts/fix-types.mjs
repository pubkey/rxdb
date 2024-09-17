import { promises as fs } from 'node:fs';

async function main () {
    const file = './dist/types/index.d.ts';
    try {
        let content = await fs.readFile(file, { encoding: 'utf-8' });
        content = content.replaceAll('.ts', '.d.ts');
        content = `// @ts-nocheck
        ${content}`;
        await fs.writeFile(file, content);
    } catch (err) {
        console.error(`Fix types error：${err.message}`);
        process.exit(1);
    }
}
main();
