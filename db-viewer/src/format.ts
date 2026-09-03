export function formatNumber(value: number): string {
    return Math.round(value).toLocaleString('en-US');
}

export function formatRate(value: number): string {
    if (value >= 100) {
        return formatNumber(value);
    }
    return (Math.round(value * 10) / 10).toString();
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return bytes + ' B';
    }
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value = value / 1024;
        unitIndex++;
    }
    return (Math.round(value * 10) / 10) + ' ' + units[unitIndex];
}

export function formatClock(timestamp: number): string {
    const date = new Date(timestamp);
    const pad = (input: number, length = 2) => String(input).padStart(length, '0');
    return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
        '.' + pad(Math.floor(date.getMilliseconds() / 100), 1);
}

export function formatAge(timestamp: number, now = Date.now()): string {
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 60) {
        return seconds + 's ago';
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return minutes + 'm ago';
    }
    const hours = Math.round(minutes / 60);
    if (hours < 48) {
        return hours + 'h ago';
    }
    return Math.round(hours / 24) + 'd ago';
}

export function shortRevision(revision: string | undefined): string {
    if (!revision) {
        return '';
    }
    const [height, hash] = revision.split('-');
    if (!hash) {
        return revision;
    }
    return height + '-' + hash.slice(0, 6);
}

/**
 * Renders a compact single line preview of any value,
 * used for the grid cells and the collapsed drawer fields.
 */
export function previewValue(value: any): string {
    if (value === undefined) {
        return '';
    }
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (Array.isArray(value)) {
        return 'array [' + value.length + ']';
    }
    if (typeof value === 'object') {
        return 'object {' + Object.keys(value).length + '}';
    }
    return String(value);
}

export function valueType(value: any): 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'missing' {
    if (value === undefined) {
        return 'missing';
    }
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') {
        return type;
    }
    return 'object';
}

export function getByPath(source: any, path: string): any {
    return path.split('.').reduce(
        (accumulator, part) => (accumulator === undefined || accumulator === null)
            ? undefined
            : accumulator[part],
        source
    );
}

export function setByPath(target: any, path: string, value: any): void {
    const parts = path.split('.');
    const lastPart = parts.pop() as string;
    let cursor = target;
    parts.forEach(part => {
        if (typeof cursor[part] !== 'object' || cursor[part] === null) {
            cursor[part] = {};
        }
        cursor = cursor[part];
    });
    cursor[lastPart] = value;
}

/**
 * Parses what the user typed into a cell back into a JSON value.
 * Anything that is not valid JSON is kept as a plain string,
 * which is what a user editing a text field expects.
 */
export function parseCellInput(input: string, previous: any): any {
    const trimmed = input.trim();
    if (typeof previous === 'string' && !/^[[{"]|^-?\d|^true$|^false$|^null$/.test(trimmed)) {
        return input;
    }
    try {
        return JSON.parse(trimmed);
    } catch (error) {
        return input;
    }
}

export type DiffLine = {
    kind: 'context' | 'added' | 'removed';
    text: string;
};

/**
 * Line based unified diff of two pretty printed documents.
 * A longest-common-subsequence walk keeps unchanged lines aligned.
 */
export function diffJson(before: any, after: any): DiffLine[] {
    const beforeLines = before === undefined ? [] : JSON.stringify(before, null, 2).split('\n');
    const afterLines = after === undefined ? [] : JSON.stringify(after, null, 2).split('\n');
    const rows = beforeLines.length;
    const columns = afterLines.length;
    const table: number[][] = [];
    for (let fill = 0; fill <= rows; fill++) {
        table.push(new Array(columns + 1).fill(0));
    }
    for (let beforeIndex = rows - 1; beforeIndex >= 0; beforeIndex--) {
        for (let afterIndex = columns - 1; afterIndex >= 0; afterIndex--) {
            table[beforeIndex][afterIndex] = beforeLines[beforeIndex] === afterLines[afterIndex]
                ? table[beforeIndex + 1][afterIndex + 1] + 1
                : Math.max(table[beforeIndex + 1][afterIndex], table[beforeIndex][afterIndex + 1]);
        }
    }
    const result: DiffLine[] = [];
    let row = 0;
    let column = 0;
    while (row < rows && column < columns) {
        if (beforeLines[row] === afterLines[column]) {
            result.push({ kind: 'context', text: beforeLines[row] });
            row++;
            column++;
        } else if (table[row + 1][column] >= table[row][column + 1]) {
            result.push({ kind: 'removed', text: beforeLines[row] });
            row++;
        } else {
            result.push({ kind: 'added', text: afterLines[column] });
            column++;
        }
    }
    while (row < rows) {
        result.push({ kind: 'removed', text: beforeLines[row] });
        row++;
    }
    while (column < columns) {
        result.push({ kind: 'added', text: afterLines[column] });
        column++;
    }
    return result;
}

export type JsonParseFailure = {
    message: string;
    position: number;
};

/**
 * Parses a Mango selector and reports the caret position on failure
 * so that the query bar can point at the offending character.
 */
export function parseSelector(input: string): { ok: true; value: any; } | { ok: false; error: JsonParseFailure; } {
    const trimmed = input.trim();
    if (trimmed === '') {
        return { ok: true, value: {} };
    }
    try {
        const value = JSON.parse(trimmed);
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return {
                ok: false,
                error: { message: 'The selector must be a JSON object', position: 0 }
            };
        }
        return { ok: true, value };
    } catch (error) {
        return { ok: false, error: describeJsonError(trimmed, (error as Error).message) };
    }
}

/**
 * JSON.parse() error messages differ between JavaScript engines and often
 * carry no position at all, so the caret position is found by scanning the
 * input for the first token that cannot appear there.
 */
function describeJsonError(input: string, engineMessage: string): JsonParseFailure {
    const bareWord = findBareWord(input);
    if (bareWord) {
        return {
            message: 'Unexpected token \'' + input[bareWord.position] + '\' at position ' +
                bareWord.position + ' — the selector must be valid JSON',
            position: bareWord.position
        };
    }
    const positionMatch = /position (\d+)/.exec(engineMessage);
    if (positionMatch) {
        return { message: engineMessage, position: Number(positionMatch[1]) };
    }
    return { message: engineMessage, position: Math.max(0, input.length - 1) };
}

/**
 * Finds an unquoted word outside of strings that is not a JSON literal,
 * which is what an unquoted value or a misspelled boolean looks like.
 */
function findBareWord(input: string): { position: number; word: string; } | null {
    const pattern = /"(?:\\.|[^"\\])*"|([A-Za-z_$][\w$]*)/g;
    let match = pattern.exec(input);
    while (match !== null) {
        const word = match[1];
        if (word !== undefined && word !== 'true' && word !== 'false' && word !== 'null') {
            return { position: match.index, word };
        }
        match = pattern.exec(input);
    }
    return null;
}
