const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.md') || f.endsWith('.mdx')) {
            callback(path.join(dir, f));
        }
    });
}

walkDir(path.join(__dirname, 'docs'), (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Replace <PerformanceChart ... /> for Browser
    const browserChartRegex = /<PerformanceChart\s+metrics=\{[\s\S]*?\}\s*data=\{\[\s*\{\s*name:\s*'IndexedDB'[\s\S]*?\}\s*\]\}\s*\/>/g;
    if (browserChartRegex.test(content)) {
        content = content.replace(browserChartRegex, '<PerformanceBrowser />');
        changed = true;
    }

    // Replace <PerformanceChart ... /> for Node
    const nodeChartRegex = /<PerformanceChart\s+metrics=\{[\s\S]*?\}\s*data=\{\[\s*\{\s*name:\s*'SQLite'[\s\S]*?\}\s*\]\}\s*\/>/g;
    if (nodeChartRegex.test(content)) {
        content = content.replace(nodeChartRegex, '<PerformanceNode />');
        changed = true;
    }

    if (changed) {
        // Determine which imports are needed
        const needsBrowser = content.includes('<PerformanceBrowser />');
        const needsNode = content.includes('<PerformanceNode />');

        // Remove old import
        content = content.replace(/import PerformanceChart from ['"]@site\/src\/components\/performance-chart['"];\n?/g, '');

        // Prepare new imports
        let newImports = '';
        if (needsBrowser) {
            newImports += 'import PerformanceBrowser from \'@site/src/components/performance-browser\';\n';
        }
        if (needsNode) {
            newImports += 'import PerformanceNode from \'@site/src/components/performance-node\';\n';
        }

        // Insert new imports after frontmatter
        const lines = content.split('\n');
        if (lines[0].trim() === '---') {
            const endOfFrontmatter = lines.indexOf('---', 1);
            if (endOfFrontmatter !== -1) {
                lines.splice(endOfFrontmatter + 1, 0, '', newImports.trim());
                content = lines.join('\n');
            }
        } else {
            lines.unshift(newImports.trim(), '');
            content = lines.join('\n');
        }

        // Clean up empty lines created by removing the old import
        content = content.replace(/\n{3,}/g, '\n\n');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Replaced with wrapper components in', filePath);
    }
});
