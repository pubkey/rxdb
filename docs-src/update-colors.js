const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.md')) {
            callback(path.join(dir, f));
        }
    });
}

const newMetrics = `metrics={[
    { key: 'timeToFirstInsert', name: 'Time to first insert', color: '#ED168F' }, // Base Top
    { key: 'insertDocsBulk', name: 'Insert docs (bulk)', color: '#752a8a' }, // Base Bottom
    { key: 'findByIdBulk', name: 'Find by ID (bulk)', color: '#FFB3DF' }, // Very Light Top
    { key: 'insertDocsSerial', name: 'Insert docs (serial)', color: '#3A1046' }, // Very Dark Bottom
    { key: 'findByIdSerial', name: 'Find by ID (serial)', color: '#b2218b' }, // Base Middle
    { key: 'findDocsQuery', name: 'Find docs by query', color: '#FF6BCD' }, // Lighter Top
    { key: 'findDocsQueryParallel', name: 'Find docs (parallel)', color: '#D9178E' }, // Darker Top
    { key: 'countDocs', name: 'Count docs', color: '#561D68' } // Darker Bottom
  ]}`;

const metricsRegex = /metrics=\{\[\s*\{\s*key[\s\S]*?\}\s*\]\}/g;

walkDir(path.join(__dirname, 'docs'), (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    if (metricsRegex.test(content)) {
        content = content.replace(metricsRegex, newMetrics);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated metrics in', filePath);
    }
});
