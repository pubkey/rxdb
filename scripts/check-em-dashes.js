const fs = require('fs');
const path = require('path');

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
        } else if (fullPath.endsWith('.md') || fullPath.endsWith('.mdx') || fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            checkFile(fullPath);
        }
    }
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('—') || line.includes('–')) {
            console.error(`Error: Em/En dash found in ${filePath}:${i + 1}`);
            console.error(`> ${line.trim()}`);
            console.error('-'.repeat(100));
            hasError = true;
        }
    }
}

console.log('Checking documentation for em-dashes and en-dashes...');

for (const dir of targetDirs) {
    walkDir(dir);
}

if (hasError) {
    console.error('\nDocumentation contains prohibited em-dash (—) or en-dash (–) characters.');
    console.error('Please rephrase to comply with project guidelines.');
    process.exit(1);
} else {
    console.log('Success: No em-dashes or en-dashes found.');
    process.exit(0);
}
