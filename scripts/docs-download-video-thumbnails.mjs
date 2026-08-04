/**
 * The docs pages show YouTube preview images via the VideoBox component.
 * Loading these images directly from i3.ytimg.com does not work for
 * visitors in China because the YouTube CDN is blocked there.
 *
 * This script runs before the docs build. It scans the docs sources for
 * all used videoIds and downloads the preview images into the static
 * files folder so that the deployed page serves them from the same
 * host as the rest of the docs.
 */
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsSrcDir = join(__dirname, '../docs-src');
const scanDirs = [
    join(docsSrcDir, 'docs'),
    join(docsSrcDir, 'src')
];
const outputDir = join(docsSrcDir, 'static/files/video-thumbnails');
const scanFileExtensions = ['.md', '.mdx', '.js', '.jsx', '.ts', '.tsx'];

/**
 * Matches videoId="xxx", videoId: 'xxx' and videoId={'xxx'}
 * but not videoId={item.videoId}.
 */
const videoIdRegex = /videoId\s*[:=]\s*\{?\s*['"]([a-zA-Z0-9_-]{5,})['"]/g;

function listFilesRecursive(dir) {
    const result = [];
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        if (statSync(fullPath).isDirectory()) {
            if (entry === 'node_modules') {
                continue;
            }
            result.push(...listFilesRecursive(fullPath));
        } else if (scanFileExtensions.includes(extname(entry))) {
            result.push(fullPath);
        }
    }
    return result;
}

function findVideoIds() {
    const videoIds = new Set();
    for (const dir of scanDirs) {
        for (const file of listFilesRecursive(dir)) {
            const content = readFileSync(file, 'utf-8');
            for (const match of content.matchAll(videoIdRegex)) {
                videoIds.add(match[1]);
            }
        }
    }
    return Array.from(videoIds).sort();
}

async function downloadThumbnail(videoId) {
    const targetFile = join(outputDir, videoId + '.jpg');
    if (existsSync(targetFile)) {
        return 'cached';
    }
    const url = 'https://i3.ytimg.com/vi/' + videoId + '/mqdefault.jpg';
    const maxAttempts = 3;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ' for ' + url);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            writeFileSync(targetFile, buffer);
            return 'downloaded';
        } catch (err) {
            lastError = err;
            console.warn('Attempt ' + attempt + '/' + maxAttempts + ' failed for ' + videoId + ': ' + err.message);
            await new Promise(res => setTimeout(res, attempt * 1000));
        }
    }
    throw lastError;
}

async function run() {
    const videoIds = findVideoIds();
    console.log('Found ' + videoIds.length + ' videoIds in docs sources.');
    mkdirSync(outputDir, { recursive: true });

    let downloaded = 0;
    let cached = 0;
    for (const videoId of videoIds) {
        const result = await downloadThumbnail(videoId);
        if (result === 'downloaded') {
            downloaded++;
        } else {
            cached++;
        }
    }
    console.log('Video thumbnails ready: ' + downloaded + ' downloaded, ' + cached + ' already cached in ' + outputDir);
}

run().catch(err => {
    console.error('Downloading YouTube preview images failed:');
    console.error(err);
    process.exit(1);
});
