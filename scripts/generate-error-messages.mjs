
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const errorMessagesFile = path.join(__dirname, '../src/plugins/dev-mode/error-messages.ts');
const outputFile = path.join(__dirname, '../ERROR-MESSAGES.md');

const content = fs.readFileSync(errorMessagesFile, 'utf8');

// Mock dependencies
const NON_PREMIUM_COLLECTION_LIMIT = 16;

// Strip imports and exports to make it evaluatable
let evalContent = content.replace(/import .*?;\n/g, '');
evalContent = evalContent.replace(/export const ERROR_MESSAGES/g, 'const ERROR_MESSAGES');

// Evaluate the code to get the ERROR_MESSAGES object
// We wrap it in a function to avoid polluting the global scope and to access the variable
const getErrorMessages = new Function('NON_PREMIUM_COLLECTION_LIMIT', evalContent + '\nreturn ERROR_MESSAGES;');
const ERROR_MESSAGES = getErrorMessages(NON_PREMIUM_COLLECTION_LIMIT);


let md = '# RxDB Error Messages\n\n';
md += 'This file is generated automatically. Do not edit it manually.\n\n';

for (const key of Object.keys(ERROR_MESSAGES)) {
    const err = ERROR_MESSAGES[key];
    md += `## ${err.code}\n\n`;
    md += `**Message**: \`${err.message}\`\n\n`;
    if (err.cause) md += `**Cause**: ${err.cause}\n\n`;
    if (err.fix) md += `**Fix**: ${err.fix}\n\n`;
    if (err.docs) md += `**Docs**: ${err.docs}\n\n`;
    md += '---\n\n';
}

fs.writeFileSync(outputFile, md);
console.log(`Generated ${outputFile}`);
