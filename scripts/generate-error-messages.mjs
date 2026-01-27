
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const errorMessagesFile = path.join(__dirname, '../src/plugins/dev-mode/error-messages.ts');
const outputFile = path.join(__dirname, '../ERROR-MESSAGES.md');

const content = fs.readFileSync(errorMessagesFile, 'utf8');

// Extract the object body
const objectRegex = /export const ERROR_MESSAGES = {([\s\S]*?)};/;
const match = content.match(objectRegex);

if (!match) {
    console.error('Could not find ERROR_MESSAGES object');
    process.exit(1);
}

const body = match[1];

// We need to parse this body to get the objects.
// Since it's TS/JS code, we can't just JSON.parse it.
// We can use a simple regex parser again or evaluate it if we handle imports.
// Evaluation is risky/complex with imports.
// Let's use regex to extract key and properties.

// Regex to match: KEY: { ... }
// We assume standard formatting from our previous script.
const entryRegex = /^\s+([A-Z0-9_]+):\s*({[\s\S]*?}),/gm;

let matchEntry;
const errors = [];

while ((matchEntry = entryRegex.exec(body)) !== null) {
    const key = matchEntry[1];
    const objStr = matchEntry[2];

    // Parse objStr fields
    const code = extractField(objStr, 'code');
    const message = extractField(objStr, 'message');
    const cause = extractField(objStr, 'cause');
    const fix = extractField(objStr, 'fix');
    const docs = extractField(objStr, 'docs');

    errors.push({
        code, message, cause, fix, docs
    });
}

function extractField(str, field) {
    const regex = new RegExp(`${field}:\\s*(['\`])([\\s\\S]*?)\\1`);
    const m = str.match(regex);
    if (m) return m[2];

    // Try to match variable or concatenation if simple string check fails (e.g. for message)
    // But our message might be complex.
    // However, for the markdown generation, we might want the exact string if possible.
    // If it's code, we might just show "Dynamic message".

    // Fallback for message which might be `...` or '...' + var
    if (field === 'message') {
        const msgRegex = /message:\s*([\s\S]*?),\n\s+cause:/;
        const msgM = str.match(msgRegex);
        if (msgM) return msgM[1].trim();
    }

    return '';
}

let md = '# RxDB Error Messages\n\n';
md += 'This file is generated automatically. Do not edit it manually.\n\n';

for (const err of errors) {
    md += `## ${err.code}\n\n`;
    md += `**Message**: \`${err.message}\`\n\n`;
    if (err.cause) md += `**Cause**: ${err.cause}\n\n`;
    if (err.fix) md += `**Fix**: ${err.fix}\n\n`;
    if (err.docs) md += `**Docs**: ${err.docs}\n\n`;
    md += '---\n\n';
}

fs.writeFileSync(outputFile, md);
console.log(`Generated ${outputFile}`);
