import * as fs from 'fs';
import * as path from 'path';
import { generateHeader } from './generate-header';

const DOCS_DIR = path.join(__dirname, '../docs-src/docs');
const OUTPUT_DIR = path.join(__dirname, '../docs-src/static/headers');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function walk(dir: string, callback: (filePath: string) => void) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            walk(filePath, callback);
        } else {
            callback(filePath);
        }
    });
}

(async () => {
    console.log('Generating header images...');

    const files: string[] = [];
    walk(DOCS_DIR, (filePath) => {
        if (filePath.endsWith('.md')) {
            files.push(filePath);
        }
    });

    const filter = process.argv[2];

    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Simple frontmatter parsing
        // We assume frontmatter starts at the beginning
        const frontMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
        if (!frontMatch) continue;

        const frontmatter = frontMatch[1];

        const titleMatch = frontmatter.match(/title:\s*(.*)/);
        const slugMatch = frontmatter.match(/slug:\s*(.*)/);

        if (titleMatch) {
            let title = titleMatch[1].trim();
            // remove quotes if any
            if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith('\'') && title.endsWith('\''))) {
                title = title.slice(1, -1);
            }

            let slug = '';
            if (slugMatch) {
                slug = slugMatch[1].trim();
                // remove extension if present in slug usually .html from rxdb docs
                slug = slug.replace(/\.html$/, '');
            } else {
                // fallback to filename
                slug = path.basename(filePath, '.md');
            }

            // FILTER logic
            if (filter && !slug.includes(filter)) {
                continue;
            }

            const outputFilename = `${slug}.jpg`;
            const outputPath = path.join(OUTPUT_DIR, outputFilename);

            // ALWAYS Generate (overwrite)
            console.log(`Generating header: ${title} -> ${outputFilename}`);

            try {
                await generateHeader(title, outputPath, content, filePath);
            } catch (err) {
                console.error(`Failed to generate header for ${title}:`, err);
            }


            // Check if image is in frontmatter
            if (!frontmatter.includes('image:')) {
                // console.log(`Adding image to frontmatter: ${title}`);
                const imageField = `image: /headers/${outputFilename}`;
                const newFrontmatter = frontmatter.trimEnd() + '\n' + imageField + '\n';
                const newContent = content.replace(frontMatch[0], `---\n${newFrontmatter}---`);
                fs.writeFileSync(filePath, newContent, 'utf-8');
            }

            // Verify and error if missing
            const checkContent = fs.readFileSync(filePath, 'utf-8');
            if (!checkContent.match(/^image:\s+/m) && !checkContent.includes('image:')) { // check more broadly
                console.error(`ERROR: Article "${title}" (${outputFilename}) missing 'image' field in frontmatter!`);
            }
        }
    }
    console.log('Done.');
})();
