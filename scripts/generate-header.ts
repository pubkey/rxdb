import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export async function generateHeader(
    title: string,
    outputFile: string,
    content: string,
    docPath: string
) {
    // limit title to 6 words
    const titleWords = title.split(' ');
    if (titleWords.length > 6) {
        title = titleWords.slice(0, 6).join(' ') + '..';
    }

    const width = 1200;
    const height = 630;

    const logoPath = path.join(__dirname, '../docs-src/static/files/logo/rxdb_javascript_database.svg');
    const logoBuffer = fs.readFileSync(logoPath);

    const fontPath = path.join(__dirname, '../docs-src/static/fonts/AtkinsonHyperlegibleMono-VariableFont_wght.ttf');
    const fontBuffer = fs.readFileSync(fontPath);
    const fontBase64 = fontBuffer.toString('base64');

    // Find relevant images from markdown content
    const relevantImages = findRelevantImages(content, docPath);
    console.log(`Found images for "${title}":`, relevantImages);

    let rightImageBuffer: Buffer | null = null;

    // Pick the first one
    if (relevantImages.length > 0) {
        try {
            rightImageBuffer = fs.readFileSync(relevantImages[0]);
        } catch (err) { }
    }


    // Create SVG for background and text
    // linear-gradient(rgba(15, 23, 42, 0.8), rgb(5, 6, 10))
    // rgba(15, 23, 42, 0.8) -> #0f172acc (approx)
    // rgb(5, 6, 10) -> #05060a

    const svgImage = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:rgba(15, 23, 42, 0.8);stop-opacity:1" />
                <stop offset="100%" style="stop-color:rgb(5, 6, 10);stop-opacity:1" />
            </linearGradient>
            <style>
                @font-face {
                    font-family: 'Atkinson Hyperlegible Mono';
                    src: url(data:font/ttf;charset=utf-8;base64,${fontBase64}) format('truetype');
                    font-weight: 100 800;
                }
                .title {
                    fill: white;
                    font-family: 'Atkinson Hyperlegible Mono', monospace;
                    font-size: 55px;
                    font-weight: 800;
                    line-height: 1.1;
                    text-anchor: middle;
                }
            </style>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad1)" />
        
        <text x="50%" y="${height - 120}" width="1000" class="title">
            ${escapeXml(title).split(' ').map((_word, _i, _arr) => {
        // Wrap every 3 words roughly, or just fit?
        // For centered text, simple tspans with dy works but we need to calculate lines
        // Simplification: Let's assume max 6 words fits in 2 lines max
        // If length > 3, split in two lines?
        const words = escapeXml(title).split(' ');
        if (words.length > 3) {
            const mid = Math.ceil(words.length / 2);
            const line1 = words.slice(0, mid).join(' ');
            const line2 = words.slice(mid).join(' ');
            return `<tspan x="50%" dy="-1.2em">${line1}</tspan><tspan x="50%" dy="1.2em">${line2}</tspan>`;
        } else {
            return `<tspan x="50%">${words.join(' ')}</tspan>`;
        }
    }).join('')}
        </text>
    </svg>
    `;

    // Process with Sharp
    const pipeline = sharp(Buffer.from(svgImage));

    const composites: sharp.OverlayOptions[] = [];

    // Layout:
    // [ RxDB Logo ] [ Context Image ]
    //           Title
    // Center the top group (Logo + Image)

    const logoResized = await sharp(logoBuffer)
        .resize({ width: 600, height: 350, fit: 'inside' })
        .toBuffer();

    const logoMeta = await sharp(logoResized).metadata();
    const logoW = logoMeta.width || 600;
    const logoH = logoMeta.height || 100;

    let rightImgResized: Buffer | null = null;
    let rightImgW = 0;
    let rightImgH = 0;

    if (rightImageBuffer) {
        try {
            // Resize relevant image to be similar height to logo or max constraint
            rightImgResized = await sharp(rightImageBuffer)
                .resize({ height: logoH, width: 400, fit: 'inside' })
                .toBuffer();
            const rMeta = await sharp(rightImgResized).metadata();
            rightImgW = rMeta.width || 0;
            rightImgH = rMeta.height || 0;
        } catch (e) {
            // ignore if fail
        }
    }

    const gap = 40;
    const totalTopWidth = logoW + (rightImgResized ? gap + rightImgW : 0);
    const startLeft = (width - totalTopWidth) / 2;

    // Logo Position
    composites.push({
        input: logoResized,
        top: 80, // Top margin
        left: Math.round(startLeft)
    });

    // Right Image Position
    if (rightImgResized) {
        composites.push({
            input: rightImgResized,
            top: Math.round(80 + (logoH - rightImgH) / 2), // Vertically center relative to logo if different heights
            left: Math.round(startLeft + logoW + gap)
        });
    }

    await pipeline
        .composite(composites)
        .jpeg({ mozjpeg: true })
        .toFile(outputFile);
}

function findRelevantImages(content: string, docPath: string): string[] {
    const images: string[] = [];
    const docDir = path.dirname(docPath);
    const staticDir = path.join(__dirname, '../docs-src/static');

    // Helper check
    const checkAndAdd = (url: string) => {
        if (!url || url.includes('/logo/')) return;

        // Strip query and hash
        const cleanUrl = url.split('?')[0].split('#')[0];

        // Array of possible paths to check
        const candidates: string[] = [];

        if (path.isAbsolute(cleanUrl)) {
            // If absolute path like /files/foo.png, it might be in static folder
            candidates.push(path.join(staticDir, cleanUrl));
        } else {
            // Relative path
            candidates.push(path.resolve(docDir, cleanUrl));

            // Check if it refers to 'files/' which is in static dir
            // Many markdown files use ../files/ which technically might be wrong relative to file but correct for build
            if (cleanUrl.includes('/files/')) {
                const part = cleanUrl.substring(cleanUrl.indexOf('/files/'));
                candidates.push(path.join(staticDir, part));
            } else if (cleanUrl.startsWith('files/')) {
                candidates.push(path.join(staticDir, cleanUrl));
            }
        }

        // console.log(`Checking image candidates for ${url}:`, candidates);

        for (const p of candidates) {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                if (p.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
                    if (!images.includes(p)) {
                        images.push(p);
                    }
                    return; // Found match, stop checking candidates
                }
            }
        }
    };

    // Markdown
    const mdRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = mdRegex.exec(content)) !== null) {
        checkAndAdd(match[1]);
    }

    // HTML with better regex to catch src attribute anywhere in the tag
    const htmlRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((match = htmlRegex.exec(content)) !== null) {
        checkAndAdd(match[1]);
    }

    return images;
}

function escapeXml(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
        return c;
    });
}
