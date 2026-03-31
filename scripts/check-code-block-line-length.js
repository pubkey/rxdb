const fs = require('fs');
const path = require('path');

const MAX_LINE_LENGTH = 86;

const targetDirs = [
    path.join(__dirname, '../docs-src/docs'),
    path.join(__dirname, '../docs-src/src')
];

let hasError = false;

function walkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (
            fullPath.endsWith('.md') ||
            fullPath.endsWith('.mdx')
        ) {
            checkFile(fullPath);
        }
    }
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
            // Single-line code block: ```code```
            const rest = trimmed.slice(3);
            if (rest.endsWith('```') && rest.length > 3) {
                continue;
            }
            inCodeBlock = !inCodeBlock;
            continue;
        }

        if (inCodeBlock && line.length > MAX_LINE_LENGTH) {
            const relativePath = path.relative(
                path.join(__dirname, '..'),
                filePath
            );
            console.error(
                'Error: Code block line too long ' +
                `(${line.length} > ${MAX_LINE_LENGTH}) ` +
                `in ${relativePath}:${i + 1}`
            );
            console.error(`> ${line}`);
            console.error('-'.repeat(100));
            hasError = true;
        }
    }
}

console.log(
    'Checking documentation code blocks ' +
    `for lines longer than ${MAX_LINE_LENGTH} characters...`
);

for (const dir of targetDirs) {
    walkDir(dir);
}

if (hasError) {
    console.error(
        '\nDocumentation contains code block lines ' +
        `exceeding ${MAX_LINE_LENGTH} characters.`
    );
    console.error(
        'Please shorten these lines to fit within the limit.'
    );
    process.exit(1);
} else {
    console.log(
        'Success: All code block lines are within ' +
        `${MAX_LINE_LENGTH} characters.`
    );
    process.exit(0);
}
