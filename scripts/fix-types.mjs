import { promises as fs, constants as fsConstants } from 'node:fs';
import path from 'node:path';

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

        // Verify all import specifiers resolve to actual files.
        const specifierPattern = /from\s+['"](\.[^'"]+)['"]/g;
        const dir = path.dirname(file);
        let match;
        while ((match = specifierPattern.exec(content)) !== null) {
            const specifier = match[1];
            const resolved = path.resolve(dir, specifier);
            try {
                await fs.access(resolved, fsConstants.F_OK);
            } catch {
                throw new Error(
                    `import specifier '${specifier}' does not resolve to an existing file (looked for ${resolved})`
                );
            }
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
