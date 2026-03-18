const fs = require('fs');
const path = require('path');

const bData = `
<PerformanceChart
  metrics={[
    { key: 'timeToFirstInsert', name: 'Time to first insert', color: '#e74c3c' },
    { key: 'insertDocsBulk', name: 'Insert docs (bulk)', color: '#3498db' },
    { key: 'findByIdBulk', name: 'Find by ID (bulk)', color: '#2ecc71' },
    { key: 'insertDocsSerial', name: 'Insert docs (serial)', color: '#f1c40f' },
    { key: 'findByIdSerial', name: 'Find by ID (serial)', color: '#9b59b6' },
    { key: 'findDocsQuery', name: 'Find docs by query', color: '#e67e22' },
    { key: 'findDocsQueryParallel', name: 'Find docs (parallel)', color: '#1abc9c' },
    { key: 'countDocs', name: 'Count docs', color: '#34495e' }
  ]}
  data={[
    {
        name: 'IndexedDB',
        timeToFirstInsert: 150, insertDocsBulk: 80, findByIdBulk: 40,
        insertDocsSerial: 200, findByIdSerial: 100, findDocsQuery: 150,
        findDocsQueryParallel: 140, countDocs: 20
    },
    {
        name: 'OPFS',
        timeToFirstInsert: 200, insertDocsBulk: 60, findByIdBulk: 30,
        insertDocsSerial: 250, findByIdSerial: 120, findDocsQuery: 100,
        findDocsQueryParallel: 90, countDocs: 15
    },
    {
        name: 'Memory-mapped',
        timeToFirstInsert: 50, insertDocsBulk: 30, findByIdBulk: 20,
        insertDocsSerial: 40, findByIdSerial: 25, findDocsQuery: 40,
        findDocsQueryParallel: 35, countDocs: 5
    }
  ]}
/>
`;

const nData = `
<PerformanceChart
  metrics={[
    { key: 'timeToFirstInsert', name: 'Time to first insert', color: '#e74c3c' },
    { key: 'insertDocsBulk', name: 'Insert docs (bulk)', color: '#3498db' },
    { key: 'findByIdBulk', name: 'Find by ID (bulk)', color: '#2ecc71' },
    { key: 'insertDocsSerial', name: 'Insert docs (serial)', color: '#f1c40f' },
    { key: 'findByIdSerial', name: 'Find by ID (serial)', color: '#9b59b6' },
    { key: 'findDocsQuery', name: 'Find docs by query', color: '#e67e22' },
    { key: 'findDocsQueryParallel', name: 'Find docs (parallel)', color: '#1abc9c' },
    { key: 'countDocs', name: 'Count docs', color: '#34495e' }
  ]}
  data={[
    {
        name: 'SQLite',
        timeToFirstInsert: 100, insertDocsBulk: 50, findByIdBulk: 20,
        insertDocsSerial: 150, findByIdSerial: 80, findDocsQuery: 100,
        findDocsQueryParallel: 90, countDocs: 10
    },
    {
        name: 'MongoDB',
        timeToFirstInsert: 200, insertDocsBulk: 150, findByIdBulk: 100,
        insertDocsSerial: 300, findByIdSerial: 200, findDocsQuery: 250,
        findDocsQueryParallel: 200, countDocs: 50
    }
  ]}
/>
`;

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.md')) {
            callback(path.join(dir, f));
        }
    });
}

walkDir(path.join(__dirname, 'docs'), (filePath) => {
    // skip the file we've already done
    if (filePath.endsWith('rx-storage-performance.md')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Regex to match paragraph wrapping the image or just the image
    // e.g. <p align="center"> <img src="..." /> </p>
    const browserRegex = /(?:<p[^>]*>\s*(?:<a[^>]*>\s*)?)?<img[^>]*src="[^"]*rx-storage-performance-browser\.png"[^>]*>(?:\s*<\/a>)?(?:\s*<\/p>)?/g;
    if (browserRegex.test(content)) {
        content = content.replace(browserRegex, bData.trim());
        changed = true;
    }

    const nodeRegex = /(?:<p[^>]*>\s*(?:<a[^>]*>\s*)?)?<img[^>]*src="[^"]*rx-storage-performance-node\.png"[^>]*>(?:\s*<\/a>)?(?:\s*<\/p>)?/g;
    if (nodeRegex.test(content)) {
        content = content.replace(nodeRegex, nData.trim());
        changed = true;
    }

    if (changed) {
        // Add import statement after the frontmatter if it's not already there
        if (!content.includes('import PerformanceChart from')) {
            // Find the end of frontmatter
            const lines = content.split('\n');
            if (lines[0].trim() === '---') {
                const endOfFrontmatter = lines.indexOf('---', 1);
                if (endOfFrontmatter !== -1) {
                    lines.splice(endOfFrontmatter + 1, 0, '', 'import PerformanceChart from \'@site/src/components/performance-chart\';');
                    content = lines.join('\n');
                }
            } else {
                lines.unshift('import PerformanceChart from \'@site/src/components/performance-chart\';', '');
                content = lines.join('\n');
            }
        }
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
    }
});
