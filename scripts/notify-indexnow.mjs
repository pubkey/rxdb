/**
 * Notifies Bing IndexNow about changed documentation pages.
 * Gathers all docs pages from docs-src/ and submits their URLs
 * to the IndexNow API so that Bing re-indexes them.
 *
 * @link https://www.bing.com/indexnow/getstarted
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INDEXNOW_KEY = 'bc55ad38ac6d4cdfa33c3f7f8667999b';
const SITE_HOST = 'rxdb.info';
const SITE_URL = 'https://' + SITE_HOST;
const KEY_LOCATION = SITE_URL + '/' + INDEXNOW_KEY + '.txt';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const DOCS_DIR = path.join(__dirname, '..', 'docs-src', 'docs');
const PAGES_DIR = path.join(__dirname, '..', 'docs-src', 'src', 'pages');

const MAX_RETRIES = 5;

/**
 * Recursively walks a directory and calls the callback for each file.
 */
function walk(dir, callback) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath, callback);
        } else {
            callback(filePath);
        }
    }
}

/**
 * Extracts the slug from markdown frontmatter.
 * Falls back to the filename without extension.
 */
function getSlugFromMarkdown(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
    if (!frontMatch) {
        return path.basename(filePath, '.md');
    }
    const frontmatter = frontMatch[1];
    const slugMatch = frontmatter.match(/slug:\s*(.*)/);
    if (slugMatch) {
        let slug = slugMatch[1].trim();
        slug = slug.replace(/\.html$/, '');
        return slug;
    }
    return path.basename(filePath, '.md');
}

/**
 * Gathers all documentation page URLs from docs-src.
 */
function gatherPageUrls() {
    const urls = [];

    // Add the homepage
    urls.push(SITE_URL + '/');

    // Gather markdown docs
    if (fs.existsSync(DOCS_DIR)) {
        walk(DOCS_DIR, (filePath) => {
            if (filePath.endsWith('.md')) {
                const slug = getSlugFromMarkdown(filePath);
                urls.push(SITE_URL + '/' + slug + '.html');
            }
        });
    }

    // Gather .tsx pages (non-component files in pages directory)
    if (fs.existsSync(PAGES_DIR)) {
        walk(PAGES_DIR, (filePath) => {
            if (filePath.endsWith('.tsx')) {
                const relativePath = path.relative(PAGES_DIR, filePath);
                const slug = relativePath
                    .replace(/\.tsx$/, '')
                    .replace(/\/index$/, '');
                if (slug === 'index') {
                    // Already added as homepage
                    return;
                }
                urls.push(SITE_URL + '/' + slug + '.html');
            }
        });
    }

    return urls;
}

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Submits URLs to the IndexNow API with retry logic.
 * Retries up to MAX_RETRIES times with exponential backoff.
 */
async function submitToIndexNow(urls) {
    const body = JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls
    });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log('IndexNow submission attempt ' + attempt + '/' + MAX_RETRIES + '...');
            const response = await fetch(INDEXNOW_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body
            });

            if (response.ok || response.status === 200 || response.status === 202) {
                console.log('IndexNow submission successful (HTTP ' + response.status + ')');
                return;
            }

            console.error('IndexNow returned HTTP ' + response.status + ': ' + response.statusText);
            const responseText = await response.text().catch(() => '');
            if (responseText) {
                console.error('Response body: ' + responseText);
            }
        } catch (err) {
            console.error('IndexNow request failed: ' + err.message);
        }

        if (attempt < MAX_RETRIES) {
            const waitSeconds = Math.pow(2, attempt);
            console.log('Retrying in ' + waitSeconds + ' seconds...');
            await sleep(waitSeconds * 1000);
        }
    }

    throw new Error('IndexNow submission failed after ' + MAX_RETRIES + ' attempts');
}

async function main() {
    console.log('Gathering documentation page URLs...');
    const urls = gatherPageUrls();
    console.log('Found ' + urls.length + ' pages to submit:\n');
    for (const url of urls) {
        console.log('  ' + url);
    }
    console.log('');

    await submitToIndexNow(urls);
    console.log('Done. Bing IndexNow has been notified about ' + urls.length + ' pages.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
