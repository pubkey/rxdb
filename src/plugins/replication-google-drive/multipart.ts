/**
 * Parses a multipart/mixed response body from Google Drive Batch API.
 * Returns an array of objects containing { status, headers, body }.
 */
export function parseBatchResponse(
    body: string
): { status: number, headers: Record<string, string>, body: unknown }[] {
    let boundary = detectBoundary(body);
    if (boundary.startsWith('"') && boundary.endsWith('"')) {
        boundary = boundary.substring(1, boundary.length - 1);
    }

    const parts = body.split(`--${boundary}`);
    const results: { status: number, headers: Record<string, string>, body: unknown }[] = [];

    for (const part of parts) {
        const trimmedPart = part.trim();
        if (!trimmedPart || trimmedPart === '--') continue;

        const outerBodyStart = findDoubleNewline(trimmedPart);
        if (outerBodyStart === -1) continue;

        const outerBody = trimmedPart.substring(outerBodyStart).trim();

        const lines = outerBody.split(/\r?\n/);
        const statusLine = lines[0];
        const statusCode = parseInt(statusLine.split(' ')[1], 10);

        // Parse inner headers
        const innerHeaders: Record<string, string> = {};
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') {
                break;
            }
            const [key, ...val] = line.split(':');
            if (key) innerHeaders[key.toLowerCase().trim()] = val.join(':').trim();
        }

        const innerBodyStart = findDoubleNewline(outerBody);
        let parsedBody: unknown = null;

        if (innerBodyStart !== -1) {
            const contentBody = outerBody.substring(innerBodyStart).trim();
            if (contentBody) {
                try {
                    parsedBody = JSON.parse(contentBody);
                } catch {
                    parsedBody = contentBody;
                }
            }
        }

        results.push({
            status: statusCode,
            headers: innerHeaders,
            body: parsedBody
        });
    }

    return results;
}

export function findDoubleNewline(str: string): number {
    const crlf = str.indexOf('\r\n\r\n');
    if (crlf !== -1) return crlf + 4;
    const lf = str.indexOf('\n\n');
    if (lf !== -1) return lf + 2;
    return -1;
}

function detectBoundary(content: string): string {
    const newlineIndex = content.indexOf('\n');
    const firstLine = newlineIndex === -1
        ? content
        : content.slice(0, newlineIndex);

    if (firstLine.startsWith('--')) {
        return firstLine.slice(2).trim();
    }

    throw new Error(
        'Could not detect boundary from response body: ' +
        content.slice(0, 100)
    );
}
